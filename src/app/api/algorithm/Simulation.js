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

export default async function runSimulation(initialState) {
  let state = deepCopy(initialState);
  let params = await buildParams(state);
  let cash = state.investments.find(investment => investment.assetType == 'Cash');
  let iteration = 1;

  // console.log(params);
  // console.log(state);
  // console.log(params.taxBrackets['married-joint']);

  // this while loop performs the simulation iteratively each year while at least one user is still alive
  while (params.userAlive || params.spouseAlive) {
    // Step 1: Preprocessing and Preliminaries

    params.curYear += 1;
    console.log(`[----------------------------------------------------]`)
    console.log(`Iteration ${iteration}`)

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

    if (!(params.userAlive || params.spouseAlive)) {
      console.log("Simulation complete. The user and/or spouse has reached their life expectancy");
      continue;
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

    // apply inflation to: federal tax brackets, capital gains tax brackets, state tax brackets, standard deductions, annual limits on retirement accounts contributions
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

    // Step 2: run the income events, adding income to the cash investment
    console.log("1. Running income events...");
    let activeIncomeEvents = state.eventSeries.filter(event =>
      event.type === "income" &&
      params.curYear >= event.startYear &&
      params.curYear <= event.endYear
    );

    activeIncomeEvents.forEach(event => {
      // Apply annual change first (without inflation adjustment)
      if (event.changeType === 'fixed') {
        event.amount += event.annualChange;
      }
      else if (event.changeType === 'percentage') {
        event.amount = event.amount * (1 + event.annualChange / 100);
      }
      else if (event.changeType === 'normal') {
        // Sample from normal distribution for this year's change
        const sampledChangeAmount = sampleNormal(event.annualChangeMean, event.annualChangeStd);
        event.amount += sampledChangeAmount;
      }
      else if (event.changeType === 'uniform') {
        // Sample from uniform distribution for this year's change percentage
        const sampledChangePercentage = sampleUniform(event.annualChangeMin, event.annualChangeMax);
        event.amount = event.amount * (1 + sampledChangePercentage / 100);
      }

      // Then apply inflation adjustment if needed
      if (event.inflationAdjusted) {
        event.amount = event.amount * (1 + params.inflationRate / 100);
      }

      if (params.hasSpouse && params.spouseAlive === false) {
        // if the user has a spouse who is deceased, consider only the user's percentage
        event.amount *= event.userPercentage / 100;
      }
      else if (params.hasSpouse && params.userAlive === false) {
        // if the user is deceased and has a spouse who isn't, consider only the spouse's percentage
        event.amount *= 1 - (event.userPercentage / 100);
      }

      // Add the amount to cash and update income tracking
      cash.value += event.amount;
      params.curYearIncome += event.amount;
      if (event.isSocialSecurity) {
        params.curYearSS += event.amount;
      }
    });

    // Step 3: RMDs
    console.log("2. Running RMDs...");
    if (params.userAge >= 73) {
      // pay RMD for previous year if it exists (user is age 74 or greater)
      if (params.userAge >= 74 && params.prevRMD && params.prevRMD > 0) {
        let remainingToTransfer = params.prevRMD;

        // this loop assumes that in the investments object, they are ordered according to the expense withdrawal strategy
        for (let i = 0; i < state.investments.length && remainingToTransfer > 0; i++) {
          let inv = state.investments[i];

          // Skip if not a positive-value pre-tax retirement account
          if (inv.taxStatus !== "pretax-retirement" || inv.value <= 0) {
            continue;
          }

          // determine the transfer amount: either the full investment value or the remaining amount needed.
          let transferAmount = Math.min(inv.value, remainingToTransfer);

          // reduce the source pre-tax investment by the transfer amount.
          inv.value -= transferAmount;

          // look for an existing investment with the same type that has taxStatus "non-retirement".
          let targetInvestment = state.investments.find(investment =>
            investment.assetType === inv.assetType &&
            investment.taxStatus === "non-retirement"
          );

          // if it exists, add the transferred amount; otherwise, create a new investment record.
          if (targetInvestment) {
            targetInvestment.value += transferAmount;
            targetInvestment.purchasePrice = (targetInvestment.purchasePrice || 0) + transferAmount;
          } else {
            let newInvestment = {
              assetType: inv.assetType, // Fixed: Use assetType instead of investmentType
              value: transferAmount,
              taxStatus: "non-retirement",
              purchasePrice: transferAmount
            };
            state.investments.push(newInvestment);
          }

          // deduct the transferred amount from the remaining amount.
          remainingToTransfer -= transferAmount;
        }

        // Check if RMD was fully covered
        if (remainingToTransfer > 0) {
          console.warn(`Year ${params.curYear}: Could not fully transfer previous year's RMD. Shortfall: ${remainingToTransfer}`);
        }
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

    // Step 4: Update the values of investments, reflecting expected annual return, reinvestment of generated income, and subtraction of expenses.
    console.log("3. Running investment updates...");
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

    // Step 5: Run the Roth conversion (RC) optimizer, if it is enabled
    if (state.rothOptimizationStartYear && state.rothOptimizationEndYear) {
      console.log("4. Running roth conversion optimizer...");

      // Calculate the user's federal taxable income for the year.
      // This subtracts 85% of Social Security from the total income.
      const curYearFedTaxableIncome = params.curYearIncome - 0.85 * params.curYearSS;

      // Determine the correct tax bracket based on filing status.
      let filingStatus;
      let taxBracket;
      // If the user is alive but there is no spouse or the spouse is deceased,
      // use the single filer brackets.
      if (params.userAlive && !(params.hasSpouse && params.spouseAlive)) {
        filingStatus = 'single';
        taxBracket = params.taxBrackets.single.find(bracket =>
          curYearFedTaxableIncome >= bracket.min && curYearFedTaxableIncome <= bracket.max
        );
      }
      // If the user is alive with a living spouse OR the user is deceased but the spouse is alive,
      // assume married joint filing.
      else if ((params.userAlive && params.hasSpouse && params.spouseAlive) || (!params.userAlive && params.spouseAlive)) {
        filingStatus = 'married-joint';
        taxBracket = params.taxBrackets['married-joint'].find(bracket =>
          curYearFedTaxableIncome >= bracket.min && curYearFedTaxableIncome <= bracket.max
        );
      }

      if (!taxBracket) {
        console.log(`Could not determine tax bracket for Roth Conversion in year ${params.curYear}. Skipping.`);
        return;
      }

      // Get the standard deduction for the current filing status
      const currentStandardDeduction = params.standardDeductions[filingStatus];

      // Calculate income after standard deduction
      const incomeAfterDeduction = curYearFedTaxableIncome - currentStandardDeduction;

      // Compute the available room for a Roth conversion using the correct formula:
      // rc = u - (curYearFedTaxableIncome - standardDeduction)
      let rothConversionAmount = taxBracket.max - incomeAfterDeduction;

      // Ensure we don't have a negative conversion amount
      rothConversionAmount = Math.max(0, rothConversionAmount);

      if (rothConversionAmount <= 0) {
        // No room in the bracket for a Roth conversion this year.
        return;
      }

      // Use the conversion room as the amount available to convert.
      let remainingConversion = rothConversionAmount;

      // Assuming that 'state.investments' is ordered by your Roth conversion strategy,
      // iterate over investments to perform the conversion.
      for (let i = 0; i < state.investments.length; i++) {
        if (remainingConversion <= 0) break; // Conversion complete.

        let inv = state.investments[i];

        // Only convert from pre-tax retirement investments.
        if (inv.taxStatus === 'pretax-retirement' && inv.value > 0) {
          let transferAmount = Math.min(inv.value, remainingConversion);

          // Deduct the transfer amount from the source investment.
          inv.value -= transferAmount;
          if (params.userAge < 59) {
            params.curYearEarlyWithdrawals += transferAmount;
          }

          // Find or create the corresponding after-tax retirement investment.
          let target = state.investments.find(t =>
            t.assetType === inv.assetType && t.taxStatus === 'aftertax-retirement'
          );

          if (!target) {
            // Create a new after-tax retirement investment.
            let newInv = {
              assetType: inv.assetType, // Use the proper asset type from the investment.
              value: transferAmount,
              taxStatus: 'aftertax-retirement',
            };
            // TODO: Handle database updates for the new investment.
            state.investments.push(newInv);
          } else {
            // Increase the value of the existing after-tax retirement investment.
            target.value += transferAmount;
          }

          // Reduce the remaining conversion amount.
          remainingConversion -= transferAmount;

          // Since converting pre-tax funds to a Roth account is a taxable event,
          // add the converted amount to the current year's income.
          params.curYearIncome += transferAmount;
        }
      }
    }

    // Step 6: Pay non-discretionary expenses and the previous year's taxes,
    // i.e., subtract them from the cash investment. Perform additional withdrawals if needed to pay them.
    console.log("5. Running non-discretionary expense and tax processing...");

    let prevYearFedTax = 0;
    let prevYearStateTax = 0;
    let prevYearCapitalGainsTax = 0;
    let earlyWithdrawalTax = 0;

    // Determine filing status based on whether a spouse is present and alive.
    const filingStatus = (params.hasSpouse && params.spouseAlive) ? 'married-joint' : 'single';

    // Calculate last year's federal taxable income.
    // (Subtract 85% of last year's Social Security from last year's income)
    const prevYearFedTaxableIncome = (params.prevYearIncome ?? 0) - 0.85 * (params.prevYearSS ?? 0);

    // --- Federal Income Tax Calculation ---
    // Use the appropriate federal tax brackets (using keys "single" or "married-joint")
    let lastYearFedBracket = params.taxBrackets[filingStatus].find(
      bracket => prevYearFedTaxableIncome >= bracket.min && prevYearFedTaxableIncome <= bracket.max
    );
    if (lastYearFedBracket) {
      prevYearFedTax = prevYearFedTaxableIncome * (lastYearFedBracket.rate / 100);
    }

    // Assume that state-specific brackets are stored under params.stateTaxBrackets using the state abbreviation
    // and further keyed by filing status.
    let lastYearStateBracket = params.stateTaxBrackets[state.residenceState][filingStatus].find(
      bracket => prevYearFedTaxableIncome >= bracket.min && prevYearFedTaxableIncome <= bracket.max
    );
    if (lastYearStateBracket) {
      prevYearStateTax = prevYearFedTaxableIncome * (lastYearStateBracket.rate / 100);
    }

    // Use the capital gains tax brackets keyed by filing status.
    let lastYearCapitalBracket = params.capitalGainsTax[filingStatus].find(
      bracket => prevYearFedTaxableIncome >= bracket.min && prevYearFedTaxableIncome <= bracket.max
    );
    if (lastYearCapitalBracket) {
      // Ensure that if realized gains (params.prevYearGains) are negative, tax them as zero.
      prevYearCapitalGainsTax = Math.max(0, params.prevYearGains ?? 0) * (lastYearCapitalBracket.rate / 100);
    }

    // Early withdrawal penalty is 10% of withdrawals from retirement accounts taken before age 59.5
    earlyWithdrawalTax = (params.prevYearEarlyWithdrawals ?? 0) * 0.1;

    // Sum up all tax liabilities from last year.
    let totalTaxes = prevYearFedTax + prevYearStateTax + prevYearCapitalGainsTax + earlyWithdrawalTax;

    // Sum up all non-discretionary expenses for the current year.
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

    // Calculate the total payment amount: non-discretionary expenses plus last year's taxes.
    let totalPaymentAmount = nonDiscretionarySum + totalTaxes;

    // Determine the shortfall that must be withdrawn from investments if available cash is insufficient.
    let withdrawalAmount = Math.max(0, totalPaymentAmount - cash.value);

    // If additional funds are needed, liquidate investments according to the specified ordering.
    if (withdrawalAmount > 0) {
      let totalWithdrawn = 0;

      // Iterate over investments (using the ordering in state.investments)
      for (let i = 0; i < state.investments.length && totalWithdrawn < withdrawalAmount; i++) {
        let inv = state.investments[i];

        // Skip cash investments or investments with zero value.
        if (inv.assetType === "cash" || inv.value <= 0) continue;

        // Determine the amount to be sold from this investment.
        let remainingToSell = withdrawalAmount - totalWithdrawn;
        let amountSold = Math.min(inv.value, remainingToSell);

        // Calculate the fraction of the investment being liquidated.
        let fractionSold = amountSold / inv.value;

        // Compute the realized capital gain:
        // If selling the entire investment, the gain is (current value - purchasePrice);
        // otherwise, for a partial sale, it is the fraction times (current value - purchasePrice).
        let saleCapitalGain = 0;
        if (amountSold === inv.value) {
          saleCapitalGain = inv.value - inv.purchasePrice;
        } else {
          saleCapitalGain = fractionSold * (inv.value - inv.purchasePrice);
        }

        // For non-pre-tax retirement accounts, record the realized capital gain.
        if (inv.taxStatus !== "pretax-retirement") {
          params.curYearGains += saleCapitalGain;
        } else {
          // For pre-tax retirement accounts, treat the sale amount as ordinary income.
          params.curYearIncome += amountSold;
        }

        // For retirement accounts (pre-tax or after-tax) and if the user is under 59,
        // record early withdrawals (to account for any penalty).
        if ((inv.taxStatus === "pretax-retirement" || inv.taxStatus === "aftertax-retirement") && params.userAge < 59) {
          params.curYearEarlyWithdrawals += amountSold;
        }

        // Update the investment by subtracting the amount sold.
        inv.value -= amountSold;

        // Adjust the cost basis (purchasePrice) proportionally.
        inv.purchasePrice -= fractionSold * inv.purchasePrice;

        totalWithdrawn += amountSold;
      }

      if (totalWithdrawn < withdrawalAmount) {
        console.warn("Withdrawal shortfall: unable to fully cover the required non-discretionary expenses and taxes from investments.");
      }
    }

    // Finally, subtract the total payment amount from the cash bucket.
    // (Assumes that cash is used first, with any shortfall met by the withdrawals above.)
    if (cash.value >= totalPaymentAmount) {
      cash.value -= totalPaymentAmount;
    } else {
      cash.value = 0;
    }

    // Step 7: Pay discretionary expenses in the order given by the spending strategy,
    // except stop if continuing would reduce the user's total assets below the financial goal.
    // The last discretionary expense to be paid can be partially paid if incurring the entire expense would violate the financial goal.
    // Perform additional withdrawals if needed to pay them.
    console.log("6. Running discretionary expense processing...");

    const financialGoal = state.financialGoal;

    // Get the discretionary expense events for the current year.
    let discretionaryEvents = state.eventSeries.filter(event =>
      event.type === "expense" &&
      event.isDiscretionary === true &&
      params.curYear >= event.startYear &&
      params.curYear <= event.endYear
    );

    // Process each discretionary expense event in the order they appear.
    for (let event of discretionaryEvents) {
      let expenseAmount = event.amount;

      // Update current total assets.
      let totalAssets = computeTotalAssets(state);

      // Check if paying this entire expense would reduce assets below the financial goal.
      if (totalAssets - expenseAmount < financialGoal) {
        // Only pay enough so that assets remain at (or above) the financial goal.
        expenseAmount = Math.max(0, totalAssets - financialGoal);
        // If no funds can be allocated without violating the goal, exit the loop.
        if (expenseAmount === 0) {
          break;
        }
      }

      // Determine if current cash is sufficient to pay the expense.
      if (cash.value < expenseAmount) {
        // Calculate additional funds required.
        let additionalWithdrawal = expenseAmount - cash.value;
        let totalWithdrawn = 0;

        // Withdraw funds from investments in the order defined in state.investments.
        for (let i = 0; i < state.investments.length && totalWithdrawn < additionalWithdrawal; i++) {
          let inv = state.investments[i];

          // Skip the cash bucket or any investment with no value.
          if (inv.assetType === "cash" || inv.value <= 0) continue;

          // Determine the withdrawal amount from this investment.
          let remainingToWithdraw = additionalWithdrawal - totalWithdrawn;
          let withdrawalAmount = Math.min(inv.value, remainingToWithdraw);

          // Calculate the fraction of the investment being sold.
          let fractionSold = withdrawalAmount / inv.value;
          // Calculate the realized capital gain on the sale.
          let realizedGain = fractionSold * (inv.value - inv.purchasePrice);

          // If the investment is not held in a pre-tax retirement account, record the realized gain.
          // Otherwise, treat the withdrawn amount as ordinary income.
          if (inv.taxStatus !== "pretax-retirement") {
            params.curYearGains += realizedGain;
          } else {
            params.curYearIncome += withdrawalAmount;
          }

          // For retirement accounts and if the user is under 59, record early withdrawals.
          if ((inv.taxStatus === "pretax-retirement" || inv.taxStatus === "aftertax-retirement") && params.userAge < 59) {
            params.curYearEarlyWithdrawals += withdrawalAmount;
          }

          // Adjust the investment's value and cost basis proportionally.
          inv.value -= withdrawalAmount;
          inv.purchasePrice -= fractionSold * inv.purchasePrice;

          totalWithdrawn += withdrawalAmount;
        }

        // Increase cash by the total amount withdrawn from investments.
        cash.value += totalWithdrawn;
      }

      // Deduct the expense amount from cash.
      cash.value -= expenseAmount;

      // Update total assets after paying the expense.
      totalAssets = computeTotalAssets(state);

      // If the total assets have reached or dropped below the financial goal, stop processing further expenses.
      if (totalAssets <= financialGoal) {
        break;
      }
    }


    // Step 8: Run the invest event scheduled for the current year, if any, by using excess cash to buy investments included in the asset allocation in the invest event,
    // apportioning the excess cash according to that asset allocation.
    // Find active invest events for current year
    console.log("7. Running invest events...");
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

      // Step a: Calculate planned purchases based on filtered allocation
      const plannedPurchases = currentAllocation.map(alloc => ({
        assetType: alloc.assetType,
        taxStatus: alloc.taxStatus,
        percentage: alloc.percentage,
        amountToBuy: (excessCash * alloc.percentage) / totalAllocation
      }));

      // Step b: Calculate planned after-tax total (B)
      const B = plannedPurchases
        .filter(p => p.taxStatus === 'aftertax-retirement')
        .reduce((sum, p) => sum + p.amountToBuy, 0);

      // Step c: Check limit and adjust planned purchases if needed
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

      // Step d: Execute purchases and track total amount invested
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

    // Step 9: Run rebalance events scheduled for the current year, by selling and buying the investments included in the specified asset allocation to achieve the specified ratios between their values.
    // Find active rebalance events for current year
    console.log("8. Running rebalance events");
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

    params.prevYearIncome = params.curYearIncome;
    params.prevYearSS = params.curYearSS;
    params.prevYearGains = params.curYearGains;
    params.prevYearEarlyWithdrawals = params.curYearEarlyWithdrawals;

    iteration += 1;
  }
  console.log("simulation done");
  if (computeTotalAssets(state) >= state.financialGoal) {
    console.log("Financial goal was met");
  }
  else {
    console.log("Financial goal was not met");
  }
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
    const response = await fetch('http://localhost:3000/api/tax-brackets');
    const federalTaxData = await response.json();
    const data = federalTaxData.data;

    let taxBrackets = {};
    let capitalGainsTax = {};
    let standardDeductions = {};

    const filingStatuses = ['single', 'married-joint', 'married-separate', 'head-of-household'];

    // Replace "no_limit" with Infinity in federal brackets
    function replaceNoLimitWithInfinity(brackets) {
      for (const bracket of brackets) {
        if (bracket.max === "no_limit") {
          bracket.max = Infinity;
        }
      }
    }

    // Add debug logging
    console.log('Tax data received:', data);
    console.log('Filing statuses:', filingStatuses);

    filingStatuses.forEach(status => {
      if (!data[status]) {
        console.error(`Missing data for filing status: ${status}`);
        return;
      }

      const incomeBrackets = data[status].income_tax.brackets;
      const capitalBrackets = data[status].capital_gains.brackets;

      replaceNoLimitWithInfinity(incomeBrackets);
      replaceNoLimitWithInfinity(capitalBrackets);

      taxBrackets[status] = incomeBrackets;
      capitalGainsTax[status] = capitalBrackets;
      standardDeductions[status] = data[status].standard_deduction;
    });

    // Load state tax data from YAML
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const yamlFilePath = path.join(__dirname, 'state-tax.yaml');
    const fileContents = fs.readFileSync(yamlFilePath, 'utf8');
    const stateTaxData = YAML.parse(fileContents);

    const stateTaxBrackets = {
      NY: stateTaxData.NY,
      NJ: stateTaxData.NJ,
      CT: stateTaxData.CT,
    };

    // Replace null with Infinity in state brackets
    function replaceNullMaxWithInfinity(data) {
      for (const state of Object.keys(data)) {
        const filingStatuses = data[state];
        for (const status of Object.keys(filingStatuses)) {
          const brackets = filingStatuses[status];
          for (const bracket of brackets) {
            if (bracket.max === null) {
              bracket.max = Infinity;
            }
          }
        }
      }
    }

    replaceNullMaxWithInfinity(stateTaxBrackets);

    return { taxBrackets, capitalGainsTax, standardDeductions, stateTaxBrackets };
  } catch (error) {
    console.error('Error loading tax data:', error);
    return { taxBrackets: {}, capitalGainsTax: {}, standardDeductions: {}, stateTaxBrackets: {} };
  }
}

