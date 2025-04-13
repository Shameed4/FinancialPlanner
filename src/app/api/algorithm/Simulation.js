// this file should contain a single function which runs the algorithm
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
    rmdTable,
    prevRMD
  };
}

// rewriting the algorithm from scratch
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
    if (params.userAge >= 73) {
      // pay RMD for previous year if it exists (user is age 74 or greater)
      if (params.useAge >= 74 && params.prevRMD) {
        let remainingToTransfer = params.prevRMD;

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
          let targetInvestment = state.investments.find(
            investment =>
              investment.investmentType === inv.investmentType &&
              investment.taxStatus === "non-retirement"
          );

          // if it exists, add the transferred amount; otherwise, create a new investment record.
          if (targetInvestment) {
            targetInvestment.value += transferAmount;
          }
          else {
            let newInvestment = {
              investmentType: inv.investmentType,
              taxStatus: "non-retirement",
              value: transferAmount
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


    // if the user’s age is at least 74 and at the end of the previous year, there is at least one investment with tax status = “pre-tax” and with a positive value.

    // Step 3: Update the values of investments, reflecting expected annual return, reinvestment of generated income, and subtraction of expenses.

    // Step 4: Run the Roth conversion (RC) optimizer, if it is enabled.

    // Step 5: Pay non-discretionary expenses and the previous year’s taxes, i.e., subtract them from the cash investment. Perform additional withdrawals if needed to pay them.

    // Step 6: Pay discretionary expenses in the order given by the spending strategy, except stop if continuing would reduce the user’s total assets below the financial goal. 
    // The last discretionary expense to be paid can be partially paid, if incurring the entire expense would violate the financial goal. 
    // Perform additional withdrawals if needed to pay them.

    // Step 7: Run the invest event scheduled for the current year, if any, by using excess cash to buy investments included in the asset allocation in the invest event, 
    // apportioning the excess cash according to that asset allocation.

    // Step 8: Run rebalance events scheduled for the current year, by selling and buying the investments included in the specified asset allocation to achieve the specified ratios between their values.

  }
}