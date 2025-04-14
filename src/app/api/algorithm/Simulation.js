import { deepCopy, sampleNormal, sampleUniform } from './GlobalFunctions.js';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import yaml from 'yaml';
import { fileURLToPath } from 'url';
import path from 'path';
import YAML from 'yaml';


const prisma = new PrismaClient();

// initialize the starting parameters that store information that either the state does not have, or is derived from the state
// these parameters may be updated as the simulation progresses through the years
async function buildParams(state) {
  console.log("Simulation Preprocessing...")
  const curYear = 2025;

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

  const { taxBrackets, capitalGainsTax, standardDeductions, stateTaxBrackets } = await loadTaxData();

  let afterTaxRetirementContributionLimit = state.initialAfterTaxRetirementContributionLimit;

  let curYearIncome = 0;
  let curYearSS = 0;
  let prevYearIncome = null;
  let prevYearSS = null;
  let curYearGains = 0;
  let prevYearGains = null;
  let curYearEarlyWithdrawals = 0;
  let prevYearEarlyWithdrawals = null;

  // Initialize purchasePrice for all investments if not already set
  state.investments.forEach(inv => {
    if (inv.purchasePrice === undefined) {
      // For initial investments, purchase price equals current value
      inv.purchasePrice = inv.value;
    }
  });

  // TODO: get the scraped RMD table III from the database
  let rmdTable = await loadRMD();

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
    capitalGainsTax,
    standardDeductions,
    stateTaxBrackets,
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

function computeTotalAssets(state) {
  // Note: cash is already one of the investments.
  return state.investments.reduce((acc, inv) => acc + inv.value, 0);
}

// Helper function to calculate marginal tax
function calculateMarginalTax(taxableIncome, brackets) {
  let totalTax = 0;
  let remainingIncome = taxableIncome;

  for (let i = 0; i < brackets.length && remainingIncome > 0; i++) {
    const bracket = brackets[i];
    const bracketSize = Math.min(remainingIncome, bracket.max - bracket.min);
    totalTax += bracketSize * (bracket.rate / 100);
    remainingIncome -= bracketSize;
  }

  return totalTax;
}

export default async function runSimulation(initialState) {
  let state = deepCopy(initialState);
  let params = await buildParams(state);
  let cash = state.investments.find(investment => investment.assetType == 'cash');

  console.log("Simulation started running!");
  console.log(params.stateTaxBrackets[state.residenceState].single);
  // console.log(params);
  // console.log(state);

  // this while loop performs the simulation iteratively each year while at least one user is still alive
  while (params.userAlive || params.spouseAlive) {
    params.curYear += 1;

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

    // Reset parameters that go back to the initial value at the beginning of each year
    params.curYearIncome = 0;
    params.curYearSS = 0;
    params.curYearGains = 0;
    params.curYearEarlyWithdrawals = 0;

    // Re-sample inflation rate if using a probability distribution
    if (state.inflationAssumption === 'normal') {
      params.inflationRate = sampleNormal(state.inflationMean, state.inflationStd);
    } else if (state.inflationAssumption === 'uniform') {
      params.inflationRate = sampleUniform(state.inflationMin, state.inflationMax);
    }

    // Update current year's parameters based on previous year's values and current inflation
    if (params.prevYearTaxBrackets) {
      // Update federal tax brackets
      params.taxBrackets = {};
      for (const filingStatus of ['single', 'married-joint']) {
        params.taxBrackets[filingStatus] = params.prevYearTaxBrackets[filingStatus].map(bracket => ({
          min: bracket.min * (1 + params.inflationRate / 100),
          max: bracket.max * (1 + params.inflationRate / 100),
          rate: bracket.rate
        }));
      }

      // Update state tax brackets
      params.stateTaxBrackets = {};
      for (const stateCode of Object.keys(params.prevYearStateTaxBrackets)) {
        params.stateTaxBrackets[stateCode] = {};
        for (const filingStatus of ['single', 'married-joint']) {
          params.stateTaxBrackets[stateCode][filingStatus] = params.prevYearStateTaxBrackets[stateCode][filingStatus].map(bracket => ({
            min: bracket.min * (1 + params.inflationRate / 100),
            max: bracket.max * (1 + params.inflationRate / 100),
            rate: bracket.rate
          }));
        }
      }

      // Update capital gains tax brackets
      params.capitalGainsTax = {};
      for (const filingStatus of ['single', 'married-joint']) {
        params.capitalGainsTax[filingStatus] = params.prevYearCapitalGainsTax[filingStatus].map(bracket => ({
          min: bracket.min * (1 + params.inflationRate / 100),
          max: bracket.max * (1 + params.inflationRate / 100),
          rate: bracket.rate
        }));
      }

      // Update standard deductions
      params.standardDeductions = {};
      for (const filingStatus of ['single', 'married-joint']) {
        params.standardDeductions[filingStatus] = params.prevYearStandardDeductions[filingStatus] * (1 + params.inflationRate / 100);
      }

      // Update after-tax retirement contribution limit
      params.afterTaxRetirementContributionLimit = params.prevYearAfterTaxRetirementContributionLimit * (1 + params.inflationRate / 100);
    }

    // some things need to be resampled each year

    // apply inflation to: federal tax brackets, capital gains tax brackets, standard deductions, annual limits on retirement accounts contributions
    params.taxBrackets.single.forEach(bracket => {
      bracket.min = bracket.min * (1 + params.inflationRate / 100);
      bracket.max = bracket.max * (1 + params.inflationRate / 100);
    })
    params.taxBrackets["married-joint"].forEach(bracket => {
      bracket.min = bracket.min * (1 + params.inflationRate / 100);
      bracket.max = bracket.max * (1 + params.inflationRate / 100);
    });
    params.stateTaxBrackets[state.residenceState].single.forEach(bracket => {
      bracket.min = bracket.min * (1 + params.inflationRate / 100);
      bracket.max = bracket.max * (1 + params.inflationRate / 100);
    })
    params.stateTaxBrackets[state.residenceState]["married-joint"].forEach(bracket => {
      bracket.min = bracket.min * (1 + params.inflationRate / 100);
      bracket.max = bracket.max * (1 + params.inflationRate / 100);
    });
    params.capitalGainsTax.single.forEach(bracket => {
      bracket.min = bracket.min * (1 + params.inflationRate / 100);
      bracket.max = bracket.max * (1 + params.inflationRate / 100);
    })
    params.capitalGainsTax["married-joint"].forEach(bracket => {
      bracket.min = bracket.min * (1 + params.inflationRate / 100);
      bracket.max = bracket.max * (1 + params.inflationRate / 100);
    });
    for (let sd in params.standardDeductions) {
      params.standardDeductions[sd] *= (1 + params.inflationRate / 100);
    }
    params.afterTaxRetirementContributionLimit = params.afterTaxRetirementContributionLimit * (1 + params.inflationRate / 100);
    console.log(params.stateTaxBrackets[state.residenceState].single);

    // Step 1: run the income events, adding income to the cash investment
    console.log("Running income events...");
    let activeIncomeEvents = state.eventSeries.filter(event =>
      event.type === "income" &&
      params.curYear >= event.startYear &&
      params.curYear <= event.endYear
    );

    activeIncomeEvents.forEach(event => {
      // Apply annual change first (without inflation adjustment)
      if (event.changeType == 'fixed') {
        event.amount += event.annualChange;
      }
      else if (event.changeType == 'percentage') {
        event.amount = event.amount * (1 + event.annualChange / 100);
      }

      // Then apply inflation adjustment if needed
      if (event.inflationAdjusted) {
        event.amount = event.amount * (1 + params.inflationRate / 100);
      }

      if (params.hasSpouse && params.spouseAlive === false) {
        // if the user has a spouse who is deceased, consider only the user's percentage
        event.amount *= event.userPercentage;
      }

      // Add the amount to cash and update income tracking
      cash.value += event.amount;
      params.curYearIncome += event.amount;
      if (event.isSocialSecurity) {
        params.curYearSS += event.amount;
      }
    });

    // Step 2: RMDs
    console.log("Running RMDs...");
    if (params.userAge >= 73) {
      // pay RMD for previous year if it exists (user is age 74 or greater)
      if (params.userAge >= 74 && params.prevRMD) {
        let remainingToTransfer = params.prevRMD;

        // Create investment map for strategy-based ordering
        const investmentMap = new Map(state.investments.map(inv => [inv.identifier, inv]));

        // Process investments in RMD strategy order
        for (const investmentId of state.rmdStrategy) {
          if (remainingToTransfer <= 0) break;

          const inv = investmentMap.get(investmentId);
          if (!inv) continue;

          // Only consider pre-tax retirement accounts with positive value
          if (inv.taxStatus === "pretax-retirement" && inv.value > 0) {
            // determine the transfer amount: either the full investment value or the remaining amount needed
            let transferAmount = Math.min(inv.value, remainingToTransfer);

            // reduce the source pre-tax investment by the transfer amount
            inv.value -= transferAmount;

            // look for an existing investment with the same type that has taxStatus "non-retirement"
            let targetInvestment = state.investments.find(investment =>
              investment.assetType === inv.assetType &&
              investment.taxStatus === "non-retirement"
            );

            if (targetInvestment) {
              targetInvestment.value += transferAmount;
            } else {
              let newInvestment = {
                assetType: inv.assetType,
                value: transferAmount,
                taxStatus: "non-retirement",
                identifier: `${inv.assetType}-non-retirement`
              };
              state.investments.push(newInvestment);
            }

            // deduct the transferred amount from the remaining amount
            remainingToTransfer -= transferAmount;
          }
        }
      }

      // calculate RMD for current year
      let pretaxInvestments = state.investments.filter(investment =>
        investment.taxStatus === 'pretax-retirement'
      );
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
    console.log("Running investment updates...");
    state.investments.forEach(investment => {
      let type = investment.assetType;
      let assetType = state.assetTypes.find(at => at.name === type);

      // Store starting value for expense calculation
      let startingValue = investment.value;

      // Calculate generated income
      let generatedIncome = investment.value * (sampleNormal(assetType.normalIncomeMean, assetType.normalIncomeStd ?? 0) / 100);

      // Add generated income to investment value
      investment.value += generatedIncome;

      // Add the generated income to curYearIncome if the investment is non-retirement AND taxable
      if (investment.taxStatus === 'non-retirement' && assetType.taxability === 'taxable') {
        params.curYearIncome += generatedIncome;
      }

      // Calculate annual return based on starting value (before adding income)
      let annualReturnPercentage = 0;
      if (assetType.returnType === 'fixed') {
        annualReturnPercentage = assetType.fixedReturn;
      }
      else if (assetType.returnType == 'normal') {
        annualReturnPercentage = sampleNormal(assetType.normalReturnMean, assetType.normalReturnStd);
      }
      let changeInValue = startingValue * (annualReturnPercentage / 100);

      // Apply the change in value
      investment.value += changeInValue;

      // Store ending value for expense calculation
      let endingValue = investment.value;

      // Calculate expenses based on average value
      let averageValue = (startingValue + endingValue) / 2;
      let expenses = averageValue * assetType.expenseRatio;

      // Subtract expenses
      investment.value -= expenses;
    });

    // Step 4: Run the Roth conversion (RC) optimizer, if it is enabled
    if (state.rothOptimizationStartYear && state.rothOptimizationEndYear) {
      console.log("Running roth conversion optimizer...");

      // Determine current filing status
      const currentFilingStatus = params.hasSpouse && params.spouseAlive ? 'married-joint' : 'single';

      // Get current year's standard deduction
      const currentStdDed = params.standardDeductions[currentFilingStatus];

      // Calculate taxable income for bracket checking (after standard deduction)
      const taxableIncomeForBracketCheck = Math.max(0, params.curYearIncome - 0.85 * params.curYearSS - currentStdDed);

      // Find the current tax bracket
      const taxBracket = params.taxBrackets[currentFilingStatus].find(bracket =>
        taxableIncomeForBracketCheck >= bracket.min && taxableIncomeForBracketCheck <= bracket.max
      );

      if (!taxBracket) {
        console.warn("Could not find appropriate tax bracket for Roth conversion");
        return;
      }

      // Calculate the conversion amount to fill the bracket
      const rothConversionAmount = taxBracket.max - taxableIncomeForBracketCheck;
      if (rothConversionAmount <= 0) {
        return; // No room in the bracket for a Roth conversion this year
      }

      // Initialize the amount remaining to convert
      let remainingConversion = rothConversionAmount;

      // Create investment map for strategy-based ordering
      const investmentMap = new Map(state.investments.map(inv => [inv.identifier, inv]));

      // Process investments in Roth conversion strategy order
      for (const investmentId of state.rothConversionStrategy) {
        if (remainingConversion <= 0) break;

        const inv = investmentMap.get(investmentId);
        if (!inv) continue;

        // only convert from pre-tax investments
        if (inv.taxStatus === 'pretax-retirement' && inv.value > 0) {
          let transferAmount = Math.min(inv.value, remainingConversion);

          // reduce the source investment by the transfer amount
          inv.value -= transferAmount;

          // find or create the corresponding after-tax retirement investment of the same type
          let target = state.investments.find(t =>
            t.assetType === inv.assetType &&
            t.taxStatus === 'aftertax-retirement'
          );

          if (!target) {
            // create a new after-tax retirement investment
            let newInv = {
              assetType: inv.assetType,
              value: transferAmount,
              taxStatus: 'aftertax-retirement',
              identifier: `${inv.assetType}-aftertax-retirement`
            };
            state.investments.push(newInv);
          } else {
            // increase the existing after-tax retirement investment
            target.value += transferAmount;
          }

          // decrease the amount still to be converted
          remainingConversion -= transferAmount;
        }
      }

      // Add the Roth conversion amount to this year's income
      params.curYearIncome += rothConversionAmount;
    }

    // Step 5: Pay non-discretionary expenses and the previous year's taxes, i.e., subtract them from the cash investment. Perform additional withdrawals if needed to pay them.
    console.log("Running non-discretionary expense and tax processing...");

    // Calculate previous year's taxes using marginal rates
    let prevYearFedTax = 0;
    let prevYearStateTax = 0;
    let prevYearCapitalGainsTax = 0;
    let earlyWithdrawalTax = 0;

    // Get previous year's filing status
    const prevYearFilingStatus = params.prevYearFilingStatus;

    // Calculate federal income tax
    const fedStdDed = params.prevYearStandardDeductions[prevYearFilingStatus];
    const fedTaxableInc = Math.max(0, params.prevYearIncome - 0.85 * params.prevYearSS - fedStdDed);
    const fedBrackets = params.prevYearTaxBrackets[prevYearFilingStatus];
    prevYearFedTax = calculateMarginalTax(fedTaxableInc, fedBrackets);

    // Calculate state income tax
    const stateBrackets = params.prevYearStateTaxBrackets[state.residenceState]?.[prevYearFilingStatus];
    if (!stateBrackets) {
      console.warn(`No state tax brackets found for ${state.residenceState} - state tax will be ignored`);
      prevYearStateTax = 0;
    } else {
      // State tax uses federal taxable income before standard deduction
      const stateTaxableInc = Math.max(0, params.prevYearIncome - 0.85 * params.prevYearSS);
      prevYearStateTax = calculateMarginalTax(stateTaxableInc, stateBrackets);

      // Warn about potential state tax on Social Security
      if (params.prevYearSS > 0 && ['CT', 'NY', 'NJ'].includes(state.residenceState)) {
        console.warn(`Note: State tax on Social Security benefits in ${state.residenceState} is not currently modeled`);
      }
    }

    // Calculate capital gains tax
    const capGainsBrackets = params.prevYearCapitalGainsTax[prevYearFilingStatus];
    const taxableGains = Math.max(0, params.prevYearGains);
    prevYearCapitalGainsTax = calculateMarginalTax(taxableGains, capGainsBrackets);

    // Calculate early withdrawal tax
    earlyWithdrawalTax = (params.prevYearEarlyWithdrawals ?? 0) * 0.1;

    // Total up all taxes
    let totalTaxes = prevYearFedTax + prevYearStateTax + prevYearCapitalGainsTax + earlyWithdrawalTax;

    // Sum non-discretionary expenses
    let nonDiscretionarySum = 0;
    let nonDiscretionaryEvents = state.eventSeries.filter(event =>
      event.type === "expense" &&
      event.isDiscretionary === false &&
      params.curYear >= event.startYear &&
      params.curYear <= event.endYear
    );
    nonDiscretionaryEvents.forEach(event => {
      nonDiscretionarySum += event.amount;
    });

    // Total payment amount P = non-discretionary expenses + all taxes from last year
    let totalPaymentAmount = nonDiscretionarySum + totalTaxes;

    // determine how much must be withdrawn from investments
    // if there is insufficient cash already, then withdrawal amount W = (totalPaymentAmount - cash.value)
    let withdrawalAmount = Math.max(0, totalPaymentAmount - cash.value);

    // if additional funds are needed, iterate over eligible investments according to the expense withdrawal strategy
    // for each sale, compute the realized capital gain and update running totals
    // the sale may be partial for the last investment
    if (withdrawalAmount > 0) {
      let totalWithdrawn = 0;

      // Create investment map for strategy-based ordering
      const investmentMap = new Map(state.investments.map(inv => [inv.identifier, inv]));

      // Process investments in expense withdrawal strategy order
      for (const investmentId of state.expenseWithdrawalStrategy) {
        if (totalWithdrawn >= withdrawalAmount) break;

        const inv = investmentMap.get(investmentId);
        if (!inv) continue;

        // skip the cash investments (already used) and investments with no value
        if (inv.assetType === "cash" || inv.value <= 0) continue;

        // determine how much to sell from this investment
        let remainingToSell = withdrawalAmount - totalWithdrawn;
        let amountSold = Math.min(inv.value, remainingToSell);

        // calculate the fraction of the investment being sold
        let fractionSold = amountSold / inv.value;

        // compute capital gain on this sale
        let saleCapitalGain = fractionSold * (inv.value - inv.purchasePrice);

        if (inv.taxStatus !== "pretax-retirement") {
          params.curYearGains += saleCapitalGain;
        } else {
          params.curYearIncome += amountSold;
        }

        // update the investment's value by subtracting the amount sold
        inv.value -= amountSold;

        // adjust the investment's purchasePrice proportionally
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

    // Step 6: Pay discretionary expenses in the order given by the spending strategy, except stop if continuing would reduce the user's total assets below the financial goal. 
    // The last discretionary expense to be paid can be partially paid, if incurring the entire expense would violate the financial goal. 
    // Perform additional withdrawals if needed to pay them.
    console.log("Running discretionary expense processing...");
    const financialGoal = state.financialGoal;

    // get the discretionary expense events for the current year
    let activeDiscretionaryEvents = state.eventSeries.filter(event =>
      event.type === "expense" &&
      event.isDiscretionary === true &&
      params.curYear >= event.startYear &&
      params.curYear <= event.endYear
    );

    // Create event map for strategy-based ordering
    const eventMap = new Map(activeDiscretionaryEvents.map(event => [event.identifier, event]));

    // Process expenses in spending strategy order
    for (const eventId of state.spendingStrategy) {
      let event = eventMap.get(eventId);
      if (!event) continue;

      let expenseAmount = event.amount;

      // get updated amount of current total assets
      let totalAssets = computeTotalAssets();

      // check if paying this entire expense would drop assets below the financial goal
      if (totalAssets - expenseAmount < financialGoal) {
        // only pay enough so that assets remain at the financial goal
        expenseAmount = Math.max(0, totalAssets - financialGoal);
        // if expenseAmount is zero, we cannot pay any more discretionary expenses
        if (expenseAmount === 0) {
          break;
        }
      }

      // determine if cash is sufficient to pay the expense
      if (cash.value < expenseAmount) {
        // amount that must be withdrawn from other investments
        let additionalWithdrawal = expenseAmount - cash.value;

        let totalWithdrawn = 0;

        // Create investment map for strategy-based ordering
        const investmentMap = new Map(state.investments.map(inv => [inv.identifier, inv]));

        // Process investments in expense withdrawal strategy order
        for (const investmentId of state.expenseWithdrawalStrategy) {
          if (totalWithdrawn >= additionalWithdrawal) break;

          const inv = investmentMap.get(investmentId);
          if (!inv) continue;

          // skip the cash bucket or investments with zero value
          if (inv.assetType === "cash" || inv.value <= 0) continue;

          // determine how much to withdraw from this investment
          let remainingToWithdraw = additionalWithdrawal - totalWithdrawn;
          let withdrawalAmount = Math.min(inv.value, remainingToWithdraw);

          // calculate the fraction of the investment sold
          let fractionSold = withdrawalAmount / inv.value;
          // calculate the realized capital gain
          let realizedGain = fractionSold * (inv.value - inv.purchasePrice);

          if (inv.taxStatus !== "pretax-retirement") {
            params.curYearGains += realizedGain;
          } else {
            params.curYearIncome += withdrawalAmount;
          }

          // update the investment's value
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
      totalAssets = computeTotalAssets(state);

      // check again if total assets are now at the financial goal
      if (totalAssets <= financialGoal) {
        break;
      }
    }

    // Step 7: Run the invest event scheduled for the current year, if any, by using excess cash to buy investments included in the asset allocation in the invest event,
    // apportioning the excess cash according to that asset allocation.

    // Find active invest events for current year
    let activeInvestEvents = state.eventSeries.filter(event =>
      event.type === "invest" &&
      params.curYear >= event.startYear &&
      params.curYear <= event.endYear
    );

    for (let event of activeInvestEvents) {
      // Calculate excess cash available for investment
      let excessCash = Math.max(0, cash.value - event.cashBuffer);

      if (excessCash <= 0) continue;

      // Get the current year's after-tax retirement contribution limit
      const L = params.afterTaxRetirementContributionLimit;

      // Calculate current allocation percentages based on glide path if applicable
      let rawAllocation;
      if (event.assetAllocation.isGlidePath) {
        // Calculate progress through glide path (t)
        const duration = event.endYear - event.startYear;
        const t = duration === 0 ? 1 : Math.min(1, Math.max(0, (params.curYear - event.startYear) / duration));

        // Calculate current percentages by interpolating between initial and final
        rawAllocation = event.assetAllocation.initialPercentages.map((initial, i) => {
          const final = event.assetAllocation.finalPercentages[i];
          return {
            assetType: initial.assetType,
            taxStatus: initial.taxStatus,
            percentage: initial.percentage * (1 - t) + final.percentage * t
          };
        });
      } else {
        rawAllocation = event.assetAllocation.percentages;
      }

      // Filter out pretax-retirement targets as per requirements
      const currentAllocation = rawAllocation.filter(alloc =>
        alloc.taxStatus === 'non-retirement' || alloc.taxStatus === 'aftertax-retirement'
      );

      if (currentAllocation.length === 0) {
        console.log(`No valid investment targets found for invest event in year ${params.curYear}`);
        continue;
      }

      // Calculate total allocation percentage from filtered list
      let totalAllocation = currentAllocation.reduce((sum, alloc) => sum + alloc.percentage, 0);
      if (totalAllocation === 0) {
        console.log(`Total allocation percentage is 0 for invest event in year ${params.curYear}`);
        continue;
      }

      // Step 1: Calculate planned purchases based on filtered allocation
      const plannedPurchases = currentAllocation.map(alloc => ({
        assetType: alloc.assetType,
        taxStatus: alloc.taxStatus,
        percentage: alloc.percentage,
        amountToBuy: (excessCash * alloc.percentage) / totalAllocation
      }));

      // Step 2: Calculate planned after-tax total (B)
      const B = plannedPurchases
        .filter(p => p.taxStatus === 'aftertax-retirement')
        .reduce((sum, p) => sum + p.amountToBuy, 0);

      // Step 3: Check limit and adjust planned purchases if needed
      if (B > L) {
        // Calculate scaling factor for after-tax accounts
        const scaleFactor = L / B;

        // Calculate total amount to be reduced from after-tax accounts
        const reductionAmount = B - L;

        // Calculate sum of percentages allocated to non-retirement investments
        const totalNonRetirementPercentage = currentAllocation
          .filter(alloc => alloc.taxStatus === 'non-retirement')
          .reduce((sum, alloc) => sum + alloc.percentage, 0);

        // Adjust planned purchases
        plannedPurchases.forEach(planned => {
          if (planned.taxStatus === 'aftertax-retirement') {
            // Scale down after-tax retirement purchases
            planned.amountToBuy *= scaleFactor;
          } else if (planned.taxStatus === 'non-retirement' && totalNonRetirementPercentage > 0) {
            // Add portion of reduction to non-retirement accounts
            const increaseAmount = reductionAmount * (planned.percentage / totalNonRetirementPercentage);
            planned.amountToBuy += increaseAmount;
          }
        });
      }

      // Step 4: Execute purchases and track total amount invested
      let totalAmountInvested = 0;
      for (const planned of plannedPurchases) {
        if (planned.amountToBuy <= 0) continue;

        // Find or create the target investment
        let targetInvestment = state.investments.find(inv =>
          inv.assetType === planned.assetType &&
          inv.taxStatus === planned.taxStatus
        );

        if (!targetInvestment) {
          // Create new investment
          targetInvestment = {
            assetType: planned.assetType,
            taxStatus: planned.taxStatus,
            value: 0,
            purchasePrice: 0
          };
          state.investments.push(targetInvestment);
        }

        // Update investment value and purchase price
        targetInvestment.value += planned.amountToBuy;
        targetInvestment.purchasePrice += planned.amountToBuy;
        totalAmountInvested += planned.amountToBuy;
      }

      // Reduce cash by the total amount actually invested
      cash.value -= totalAmountInvested;
    }

    // Step 8: Run rebalance events scheduled for the current year, by selling and buying the investments included in the specified asset allocation to achieve the specified ratios between their values.

    // Find active rebalance events for current year
    let activeRebalanceEvents = state.eventSeries.filter(event =>
      event.type === "rebalance" &&
      params.curYear >= event.startYear &&
      params.curYear <= event.endYear
    );

    for (let event of activeRebalanceEvents) {
      // Calculate current allocation percentages based on glide path if applicable
      let currentAllocation;
      if (event.assetAllocation.isGlidePath) {
        // Calculate progress through glide path (t)
        const duration = event.endYear - event.startYear;
        const t = duration === 0 ? 1 : Math.min(1, Math.max(0, (params.curYear - event.startYear) / duration));

        // Calculate current percentages by interpolating between initial and final
        currentAllocation = event.assetAllocation.initialPercentages.map((initial, i) => {
          const final = event.assetAllocation.finalPercentages[i];
          return {
            assetType: initial.assetType,
            taxStatus: initial.taxStatus,
            percentage: initial.percentage * (1 - t) + final.percentage * t
          };
        });
      } else {
        currentAllocation = event.assetAllocation.percentages;
      }

      // Calculate total value of investments to rebalance
      let totalValue = state.investments
        .filter(inv => currentAllocation.some(alloc =>
          alloc.assetType === inv.assetType &&
          alloc.taxStatus === inv.taxStatus
        ))
        .reduce((sum, inv) => sum + inv.value, 0);

      if (totalValue <= 0) continue;

      // Process each allocation
      for (let alloc of currentAllocation) {
        let targetValue = (totalValue * alloc.percentage) / 100;

        // Find the investment
        let investment = state.investments.find(inv =>
          inv.assetType === alloc.assetType &&
          inv.taxStatus === alloc.taxStatus
        );

        if (!investment) continue;

        let valueDiff = targetValue - investment.value;

        if (valueDiff > 0) {
          // Need to buy more
          if (cash.value >= valueDiff) {
            investment.value += valueDiff;
            investment.purchasePrice += valueDiff; // Add to total cost basis
            cash.value -= valueDiff;
          } else {
            console.warn(`Insufficient cash for rebalancing: needed ${valueDiff}, have ${cash.value}`);
          }
        } else if (valueDiff < 0) {
          // Need to sell some
          let amountToSell = Math.abs(valueDiff);
          let fractionSold = amountToSell / investment.value;

          // Calculate capital gain/loss
          let saleCapitalGain = fractionSold * (investment.value - investment.purchasePrice);

          if (investment.taxStatus !== "pretax-retirement") {
            params.curYearGains += saleCapitalGain;
          } else {
            params.curYearIncome += amountToSell;
          }

          // Update investment value and purchase price
          investment.value -= amountToSell;
          investment.purchasePrice -= fractionSold * investment.purchasePrice;
          cash.value += amountToSell;
        }
      }
    }

    // Store current year's tax brackets and deductions for next year's tax calculations
    params.prevYearTaxBrackets = JSON.parse(JSON.stringify(params.taxBrackets));
    params.prevYearStateTaxBrackets = JSON.parse(JSON.stringify(params.stateTaxBrackets));
    params.prevYearCapitalGainsTax = JSON.parse(JSON.stringify(params.capitalGainsTax));
    params.prevYearStandardDeductions = JSON.parse(JSON.stringify(params.standardDeductions));
    params.prevYearFilingStatus = currentFilingStatus;

    params.prevYearIncome = params.curYearIncome;
    params.prevYearSS = params.curYearSS;
    params.prevYearGains = params.curYearGains;
    params.prevYearEarlyWithdrawals = params.curYearEarlyWithdrawals;

  }
  console.log("simulation done");
  console.log(computeTotalAssets(state) <= state.financialGoal);
}

export async function loadRMD() {
  try {
    const response = await fetch('http://localhost:3000/api/rmd-table');
    const rmdData = await response.json();
    const data = rmdData.lifetimeTable;

    // Convert each object's properties from strings to numbers.
    const transformedData = data.map((item) => {
      // If the age string includes "120", "120 and over", or "120_and_more", return 120
      let age;
      if (item.age.toLowerCase().includes('120')) {
        age = 120;
      } else {
        age = Number(item.age); // or parseInt(item.age, 10) if age values are integers
      }

      // Convert distributionPeriod string to a number (using parseFloat to capture decimals)
      const distributionPeriod = parseFloat(item.distributionPeriod);

      return { age, distributionPeriod };
    });

    return transformedData;
  } catch (error) {
    console.error('Error loading RMD data:', error);
    return {};
  }
}


export async function loadTaxData() {
  try {
    // Fetch the federal tax data from the API route.
    const response = await fetch('http://localhost:3000/api/tax-brackets');
    const federalTaxData = await response.json();
    const data = federalTaxData.data;

    // Dictionaries to store federal tax data by filing status.
    let taxBrackets = {};
    let capitalGainsTax = {};
    let standardDeductions = {};

    // Process each filing status: "single", "married-joint", "married-separate", "head-of-household"
    const filingStatuses = ['single', 'married-joint', 'married-separate', 'head-of-household'];
    filingStatuses.forEach(status => {
      // Income Tax Brackets
      taxBrackets[status] = data[status].income_tax.brackets;
      // Capital Gains Tax Brackets
      capitalGainsTax[status] = data[status].capital_gains.brackets;
      // Standard Deductions
      standardDeductions[status] = data[status].standard_deduction;
    });

    // ----- Load the State Tax Data from the YAML file (state-tax.yaml) -----
    // Read the YAML file from disk.
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const yamlFilePath = path.join(__dirname, 'state-tax.yaml');
    const fileContents = fs.readFileSync(yamlFilePath, 'utf8');

    const stateTaxData = YAML.parse(fileContents);

    // Only keep tax data for NY, NJ, and CT.
    const stateTaxBrackets = {
      NY: stateTaxData.NY,
      NJ: stateTaxData.NJ,
      CT: stateTaxData.CT,
    };

    return { taxBrackets, capitalGainsTax, standardDeductions, stateTaxBrackets };
  } catch (error) {
    console.error('Error loading tax data:', error);
    return { taxBrackets: {}, capitalGainsTax: {}, standardDeductions: {}, stateTaxBrackets: {} };
  }
}
