import { deepCopy, sampleNormal, sampleUniform } from './GlobalFunctions.js';

// initialize the starting parameters that store information that either the state does not have, or is derived from the state
// these parameters may be updated as the simulation progresses through the years
function buildParams(state) {
  const curYear = state.startYear; // 2025

  // user's age and life expectancy information
  const userAge = curYear - state.userBirthYear;
  const userLifeExpectancy = sampleNormal(state.userLifeExpectancyMean, state.userLifeExpectancyStd);
  const userAlive = userAge < userLifeExpectancy;

  // spouse's (if applicable) age and life expectancy information
  const hasSpouse = !!state.spouseBirthYear;
  const spouseAge = hasSpouse ? 2025 - state.spouseBirthYear : null
  const spouseLifeExpectancy = hasSpouse ? sampleNormal(state.spouseLifeExpectancyMean, state.spouseLifeExpectancyStd) : null;
  const spouseAlive = hasSpouse ? spouseAge < spouseLifeExpectancy : null

  // set inflation rate: sample normal, sample uniform, or fixed
  let inflationRate;
  if (state.inflationAssumption === 'fixed') {
    inflationRate = state.inflation;
  } else if (state.inflationAssumption === 'normal') {
    inflationRate = sampleNormal(state.inflationMean, state.inflationStd);
  } else if (state.inflationAssumption === 'uniform') {
    inflationRate = sampleUniform(state.inflationMin, state.inflationMax);
  }

  // TODO: get the scraped tax brackets, according to the project specs, for testing/demonstration purposes we only need NY, NJ, and CT
  let taxBrackets = {};

  let afterTaxRetirementContributionLimit = state.initialAfterTaxRetirementContributionLimit;

  let curYearIncome = 0;
  let curYearSS = 0;
  let prevYearIncome = null;
  let prevYearSS = null;
  let curYearGains = 0;
  let prevYearGains = null;
  let curYearEarlyWithdrawals = 0;
  let prevYearEarlyWithdrawals = null;

  let rmdTable = {} // get the rmd table from the database, which has been scraped

  let prevRMD = null; // store the previous year rmd value

  return {
    curYear,
    userAge,
    userLifeExpectancy,
    userAlive,
    hasSpouse,
    spouseAge,
    spouseLifeExpectancy,
    spouseAlive,
    inflationRate,
    taxBrackets,
    afterTaxRetirementContributionLimit,
    curYearIncome,
    curYearSS,
    prevYearIncome,
    prevYearSS,
    curYearGains,
    prevYearGains,
    curYearEarlyWithdrawals,
    prevYearEarlyWithdrawals,
    rmdTable,
    prevRMD
  };
}

function computeTotalAssets() {
  // Note: cash is already one of the investments.
  return state.investments.reduce((acc, inv) => acc + inv.value, 0);
}

export default function runSimulation(initialState) {
  let state = deepCopy(initialState);
  let params = buildParams(state);
  let cash = state.investments.find(investment => investment.assetType == 'cash');

  // this while loop performs the simulation iteratively each year while at least one user is still alive
  while (params.userAlive || params.spouseAlive) {
    params.curYear += 1

    // Age the user and update their alive status
    if (params.userAlive) {
      params.userAge += 1;
      params.userAlive = params.userAge < params.userLifeExpectancy;
    }

    // Age the spouse and update their alive status (if applicable)
    if (params.hasSpouse && params.spouseAlive) {
      params.spouseAge += 1;
      params.spouseAlive = params.spouseAge < params.spouseLifeExpectancy;
    }

    // reset parameters that go back to the initial value at the beginning of each year
    params.curYearIncome = 0;
    params.curYearSS = 0;

    // some things need to be resampled each year

    // apply inflation to: tax brackets, annual limits on retirement accounts contributions
    // TODO: params.taxBrackets = ...
    params.afterTaxRetirementContributionLimit = params.afterTaxRetirementContributionLimit * (1 + params.inflationRate / 100);

    // Step 1: run the income events, adding income to the cash investment
    // TODO: There is a pre-defined investment named “cash” that is held in a non-retirement account. Basically a dedicated “bucket” for holding liquid funds that the simulation uses to represent available cash
    // for each of the INCOME events, check the the current year is in the range of that event's [startYear, endYear] before proceeding with the step 2 logic
    let activeIncomeEvents = state.eventSeries.filter(event =>
      event.type === "income" &&
      params.curYear >= event.startYear &&
      params.curYear <= event.endYear
    );

    activeIncomeEvents.forEach(event => {
      // TODO: apply sampling (if specified) to annual change

      if (event.inflationAdjusted) {
        event.annualChange = event.annualChange * (1 + params.inflationRate / 100); // apply inflation to annual change if the flag is checked
      }

      if (event.changeType == 'fixed') { // apply the annual change to the event amount
        event.amount += event.annualChange
      }
      else if (event.changeType == 'percentage') {
        event.amount = event.amount * (1 + event.annualChange / 100);
      }

      if (params.hasSpouse && params.spouseAlive === false) { // if the user has a spouse who is deceased, consider only the user's percentage
        event.amount *= event.userPercentage;
      }

      cash.value += event.amount // add the amount of that income event to the cash investment

      params.curYearIncome += event.amount; // update current year's income
      if (event.isSocialSecurity) {
        params.curYearSS += event.amount; // update current years' SS income if applicable
      }
    });

    // Step 2: RMDs
    // if the user’s age is at least 74 and at the end of the previous year, there is at least one investment with tax status = “pre-tax” and with a positive value
    if (params.userAge >= 73) {
      // pay RMD for previous year if it exists (user is age 74 or greater)
      if (params.useAge >= 74 && params.prevRMD) {
        let remainingToTransfer = params.prevRMD;

        // this loop assumes that in the investments object, they are ordered according to the expense withdrawal strategy
        for (let i = 0; i < state.investments.length && remainingToTransfer > 0; i++) {
          // Only consider investments with taxStatus "pre-tax" and with a positive value.
          if (inv.taxStatus !== "pretax-retirement" || inv.value <= 0) {
            continue;
          }

          // determine the transfer amount: either the full investment value or the remaining amount needed.
          let transferAmount = Math.min(inv.value, remainingToTransfer);

          // reduce the source pre-tax investment by the transfer amount.
          inv.value -= transferAmount;

          // look for an existing investment with the same type that has taxStatus "non-retirement".
          let targetInvestment = state.investments.find(investment => investment.assetType === inv.assetType && investment.taxStatus === "non-retirement");

          // if it exists, add the transferred amount; otherwise, create a new investment record.
          if (targetInvestment) {
            targetInvestment.value += transferAmount;
          }
          else {
            let newInvestment = {
              assetType: inv.investmentType,
              value: transferAmount,
              taxStatus: "non-retirement",
            };
            // TODO: handle DB end of pushing this new investment 
            // state.investments.push(newInvestment);
          }

          // deduct the transferred amount from the remaining amount.
          remainingToTransfer -= transferAmount;
        }
        // at this point, the previous RMD has been fully transferred in-kind.
      }

      // calculate RMD for current year
      let pretaxInvestments = state.investments.filter(investment => investment.taxStatus === 'pretax-retirement');
      let s = 0;
      pretaxInvestments.forEach(investment => {
        s += investment.value;
      });
      let d = params.rmdTable.find(entry => entry.age === params.userAge).distributionPeriod;
      let rmd = s / d;

      params.curYearIncome += rmd;

      params.prevRMD = rmd; // store current year RMD to be used in next year's computation
    }

    // Step 3: Update the values of investments, reflecting expected annual return, reinvestment of generated income, and subtraction of expenses.
    state.investments.forEach(investment => {
      let type = investment.assetType;
      let assetType = state.assetTypes.find(at => at.name === type);

      let annualReturnPercentage = 0;
      if (assetType.returnType === 'fixed') {
        annualReturnPercentage = assetType.fixedReturn;
      }
      else if (assetType.returnType == 'normal') {
        annualReturnPercentage = sampleNormal(assetType.normalReturnMean, assetType.normalReturnStd);
      }

      let generatedIncome = investment.value * (annualReturnPercentage / 100);

      // add the generated income to curYearIncome, if the investment is non-retirement and taxable.
      if (investment.taxStatus === 'non-retirement') {
        params.curYearIncome += generatedIncome;
      }

      // add the generated income to the value of the investment.
      let startingValue = investment.value;  // we'll need this for expense calculation
      investment.value += generatedIncome;

      // calculate the change in value, using the specified distribution/percentage, this models capital appreciation or depreciation.
      let changeInValue = investment.value * (sampleNormal(assetType.normalIncomeMean, assetType.normalIncomeStd) / 100)
      investment.value += changeInValue;
      params.curYearGains += changeInValue;

      // calculate this year’s expenses, using the average of the beginning-of-year and end-of-year values
      // subtract the expenses from the investment value.
      let endingValue = investment.value;
      let averageValue = (startingValue + endingValue) / 2;
      let expenses = averageValue * assetType.expenseRatio;

      investment.value -= expenses;
    })

    // Step 4: Run the Roth conversion (RC) optimizer, if it is enabled
    if (state.rothOptimizationStartYear && state.rothOptimizationEndYear) {
      // user's taxable income for the year
      let curYearFedTaxableIncome = params.curYearIncome - 0.85 * params.curYearSS;

      // search for the tax bracket the user is in
      let taxBracket = params.taxBrackets.federal.find(bracket => {
        curYearFedTaxableIncome >= bracket.lower && curYearFedTaxableIncome <= bracket.upper
      });

      // the difference between the user's taxable income and upper limit the tax bracket = the Roth conversion amount
      let rothConversionAmount = taxBracket.upper - curYearFedTaxableIncome;
      if (rothConversionAmount <= 0) { // no room in the bracket for a Roth conversion this year
        return;
      }

      let remainingConversion = rc;
      // assuming that 'state.investments' is already in the desired order for Roth conversions
      for (let i = 0; i < state.investments.length; i++) {
        if (remainingConversion <= 0) break; // done converting

        let inv = state.investments[i];

        // only convert from pre-tax investments
        if (inv.taxStatus === 'pretax-retirement' && inv.value > 0) {
          let transferAmount = Math.min(inv.value, remainingConversion);

          // reduce the source investment by the transfer amount
          inv.value -= transferAmount;
          if (params.userAge < 59) {
            params.curYearEarlyWithdrawals += transferAmount;
          }

          // find or create the corresponding after-tax retirement investment of the same type
          let target = state.investments.find(t => t.assetType === inv.assetType && t.taxStatus === 'aftertax-retirement');

          if (!target) {
            // create a new after-tax retirement investment
            let newInv = {
              assetType: inv.investmentType,
              value: transferAmount,
              taxStatus: 'aftertax-retirement',
            };
            // TODO: handle DB end of pushing this new investment 
            // state.investments.push(newInv);
          } else {
            // increase the existing after-tax retirement investment
            target.value += transferAmount;
          }

          // decrease the amount still to be converted
          remainingConversion -= transferAmount;
        }
        // add the Roth conversion amount to this year’s income (bc converting pre-tax funds to Roth is a taxable event in the year of conversion)
        params.curYearIncome += rc;
      }
    }

    // Step 5: Pay non-discretionary expenses and the previous year’s taxes, i.e., subtract them from the cash investment. Perform additional withdrawals if needed to pay them.
    let prevYearFedTax = 0;
    let prevYearStateTax = 0;
    let prevYearCapitalGainsTax = 0;
    let earlyWithdrawalTax = 0;

    let prevYearFedTaxableIncome = (params.prevYearIncome ?? 0) - 0.85 * (params.prevYearSS ?? 0);

    // calculate federal tax based on last year data
    let lastYearFedBracket = params.taxBrackets.federal.find(bracket => prevYearFedTaxableIncome >= bracket.lower && prevYearFedTaxableIncome <= bracket.upper);
    if (lastYearFedBracket) {
      prevYearFedTax = prevYearFedTaxableIncome * (lastYearFedBracket.rate / 100);
    }

    // calculate state tax based on last year data
    let lastYearStateBracket = params.taxBrackets.state.find(bracket => prevYearFedTaxableIncome >= bracket.lower && prevYearFedTaxableIncome <= bracket.upper);
    if (lastYearStateBracket) {
      prevYearStateTax = prevYearFedTaxableIncome * (lastYearStateBracket.rate / 100);
    }

    // calculate state tax based on last year data
    let lastYearCapitalBracket = params.taxBrackets.capital.find(bracket => prevYearFedTaxableIncome >= bracket.lower && prevYearFedTaxableIncome <= bracket.upper);
    if (lastYearCapitalBracket) {
      // if net realized gains (prevYearGains) are negative, we tax 0.
      prevYearCapitalGainsTax = Math.max(0, params.prevYearGains) * (lastYearCapitalBracket.rate / 100);
    }

    // calculate early withdrawal tax, which is withdrawals from retirement accounts (pre-tax or after-tax) taken before age 59.5
    earlyWithdrawalTax = (params.prevYearEarlyWithdrawals ?? 0) * 0.1;

    // total up all four tax sources
    let totalTaxes = prevYearFedTax + prevYearStateTax + capitalGainsTax + earlyWithdrawalTax;

    let nonDiscretionarySum = 0;
    let nonDiscretionaryEvents = state.eventSeries.filter(event => {
      event.type == "expense" &&
        event.isDiscretionary === false &&
        params.curYear >= event.startYear &&
        params.curYear <= event.endYear
    })
    nonDiscretionaryEvents.forEach(event => {
      nonDiscretionarySum += event.amount;
    })

    // total payment amount P = non-discretionary expenses + all taxes from last year
    let totalPaymentAmount = nonDiscretionarySum + totalTaxes;

    // determine how much must be withdrawn from investments
    // if there is insufficient cash already, then withdrawal amount W = (totalPaymentAmount - cash.value)
    let withdrawalAmount = Math.max(0, totalPaymentAmount - cash.value);

    // if additional funds are needed, iterate over eligible investments according to the expense withdrawal strategy
    // for each sale, compute the realized capital gain and update running totals
    // the sale may be partial for the last investment
    if (withdrawalAmount > 0) {
      let totalWithdrawn = 0;

      for (let i = 0; i < state.investments.length && totalWithdrawn < withdrawalAmount; i++) {
        let inv = state.investments[i];

        // skip the cash investments (already used) and investments with no value
        if (inv.assetType === "cash" || inv.value <= 0) continue;

        // determine how much to sell from this investment
        let remainingToSell = withdrawalAmount - totalWithdrawn;
        let amountSold = Math.min(inv.value, remainingToSell);

        // calculate the fraction of the investment being sold
        let fractionSold = amountSold / inv.value;

        // compute capital gain on this sale:
        // if selling the entire investment, capital gain = (current value - purchasePrice)
        // otherwise, for a partial sale, capital gain = f * (current value - purchasePrice)

        // TODO: figure out how purchasePrice is calculated/stored/updated
        let saleCapitalGain = 0;
        if (amountSold === inv.value) {
          saleCapitalGain = inv.value - inv.purchasePrice;
        } else {
          saleCapitalGain = fractionSold * (inv.value - inv.purchasePrice);
        }

        // if the investment sold is NOT held in a pre-tax retirement account,
        // record the realized capital gain (note: this gain may be negative)
        if (inv.taxStatus !== "pretax-retirement") {
          params.curYearGains += saleCapitalGain;
        } else {
          // For pre-tax retirement accounts, treat the withdrawal as ordinary income
          params.curYearIncome += amountSold;
        }

        // if the investment is in a retirement account and the user is younger than 59,
        // update the early withdrawal running total.
        if ((inv.taxStatus === "pretax-retirement" || inv.taxStatus === "aftertax-retirement") && params.userAge < 59) {
          params.curYearEarlyWithdrawals += amountSold;
        }

        // update the investment's value by subtracting the amount sold
        inv.value -= amountSold;

        // adjust the investment's purchasePrice proportionally
        // this assumes that the purchasePrice is reduced in proportion to the sale
        inv.purchasePrice -= fractionSold * inv.purchasePrice;

        totalWithdrawn += amountSold;
      }

      if (totalWithdrawn < withdrawalAmount) {
        // could not fully cover the required withdrawal for expenses and taxes
      }
    }

    // subtract the total payment amount from the cash bucket
    // (this assumes that cash was first used and any shortfall was met by withdrawals)
    if (cash.value >= totalPaymentAmount) {
      cash.value -= totalPaymentAmount;
    } else {
      cash.value = 0;
    }

    // Step 6: Pay discretionary expenses in the order given by the spending strategy, except stop if continuing would reduce the user’s total assets below the financial goal. 
    // The last discretionary expense to be paid can be partially paid, if incurring the entire expense would violate the financial goal. 
    // Perform additional withdrawals if needed to pay them.
    const financialGoal = state.financialGoal;

    // get the discretionary expense events for the current year
    let discretionaryEvents = state.eventSeries.filter(event =>
      event.type === "expense" &&
      event.isDiscretionary === true &&
      params.curYear >= event.startYear &&
      params.curYear <= event.endYear
    );

    for (let event of discretionaryEvents) {
      let expenseAmount = event.amount;

      // get updated amount ofcurrent total assets
      let totalAssets = computeTotalAssets();

      // check if paying this entire expense would drop assets below the financial goal
      if (totalAssets - expenseAmount < financialGoal) {
        // only pay enough so that assets remain at the financial goal
        expenseAmount = Math.max(0, totalAssets - financialGoal);
        // if expenseAmount is zero, we cannot pay any more discretionary expenses
        if (expenseAmount === 0) {
          // paying more would violate the financial goal
          break;
        }
      }

      // determine if cash is sufficient to pay the expense
      if (cash.value < expenseAmount) {
        // amount that must be withdrawn from other investments
        let additionalWithdrawal = expenseAmount - cash.value;

        let totalWithdrawn = 0;

        // iterate over investments in the order defined by the strategy
        for (let i = 0; i < state.investments.length && totalWithdrawn < additionalWithdrawal; i++) {
          let inv = state.investments[i];

          // skip the cash bucket or investments with zero value
          if (inv.assetType === "cash" || inv.value <= 0) continue;

          // determine how much to withdraw from this investment
          let remainingToWithdraw = additionalWithdrawal - totalWithdrawn;
          let withdrawalAmount = Math.min(inv.value, remainingToWithdraw);

          // the fraction of the investment sold
          let fractionSold = withdrawalAmount / inv.value;
          // calculate the realized capital gain: if the whole investment is sold, gain = (current market value - purchasePrice)
          // for a partial sale, gain = fractionSold * (current market value - purchasePrice)
          let realizedGain = fractionSold * (inv.value - inv.purchasePrice);

          // if the investment is not held in a pre-tax retirement account, record the realized gain
          if (inv.taxStatus !== "pretax-retirement") {
            params.curYearGains += realizedGain;
          } else {
            // for pre-tax retirement accounts, the withdrawn amount is treated as ordinary income
            params.curYearIncome += withdrawalAmount;
          }
          // for any retirement account withdrawals before age 59, update early withdrawals
          if ((inv.taxStatus === "pretax-retirement" || inv.taxStatus === "aftertax-retirement") && params.userAge < 59) {
            params.curYearEarlyWithdrawals += withdrawalAmount;
          }

          // adjust the investment's value
          inv.value -= withdrawalAmount;

          // adjust the cost basis (purchasePrice) proportionally
          inv.purchasePrice -= fractionSold * inv.purchasePrice;

          // sum up withdrawn funds
          totalWithdrawn += withdrawalAmount;
        }

        if (totalWithdrawn < additionalWithdrawal) {
          // could not fully withdraw funds to pay the discretionary expense; expense may be partially covered
        }

        // after the withdrawal process, increase cash by the withdrawn amount
        cash.value += totalWithdrawn;
      }
      // there is enough cash to pay expenseAmount
      cash.value -= expenseAmount;

      // after paying, update total assets
      totalAssets = computeTotalAssets();

      // check again if total assets are now at the financial goal
      if (totalAssets <= financialGoal) {
        // financial goal violated
        break;
      }
    }


    // Step 7: Run the invest event scheduled for the current year, if any, by using excess cash to buy investments included in the asset allocation in the invest event, 
    // apportioning the excess cash according to that asset allocation.

    // Step 8: Run rebalance events scheduled for the current year, by selling and buying the investments included in the specified asset allocation to achieve the specified ratios between their values.


    params.prevYearIncome = params.curYearIncome;
    params.prevYearSS = params.curYearSS;
    params.prevYearGains = params.curYearGains;
    params.prevYearEarlyWithdrawals = params.curYearEarlyWithdrawals;
  }
}