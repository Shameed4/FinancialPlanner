import { deepCopy, sampleNormal, sampleUniform } from './GlobalFunctions.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import YAML from 'yaml';

// Helper function for logging events
function logEvent(stream, year, type, details) {
  const detailString = Object.entries(details)
    .map(([key, value]) => `${key}: ${typeof value === 'number' ? value.toFixed(2) : value}`)
    .join(', ');
  stream.write(`Year ${year} | Type: ${type} | ${detailString}\n`);
}

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

  let prevYearStandardDeductions = standardDeductions;

  let afterTaxRetirementContributionLimit = state.initialAfterTaxRetirementContributionLimit;

  let curYearIncome = 0;
  let curYearSS = 0;
  let prevYearIncome = 0;
  let prevYearSS = 0;
  let totalIncome = 0;
  let curYearExpenses = 0;
  let totalExpenses = 0;
  let curYearDiscExpenses = 0;
  let totalDiscExpenses = 0;
  let curYearGains = 0;
  let prevYearGains = 0;
  let totalEarlyWithdrawals = 0;
  let curYearEarlyWithdrawals = 0;
  let prevYearEarlyWithdrawals = 0;

  // Initialize purchasePrice for all investments if not already set
  state.investments.forEach(inv => {
    if (inv.purchasePrice === undefined) {
      // For initial investments, purchase price equals current value
      inv.purchasePrice = inv.value;
    }
  });

  let rmdTable = await loadRMD();

  let prevRMD = null; // store the previous year rmd value
  let rmdAmountFromPreviousYear = 0; // store the RMD calculated last year for this year's transfer
  let prevYearEndPreTaxSum = 0; // store the previous year-end pre-tax sum

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
    prevYearStandardDeductions,
    stateTaxBrackets,
    afterTaxRetirementContributionLimit,
    curYearIncome,
    curYearSS,
    totalIncome,
    curYearExpenses,
    totalExpenses,
    curYearDiscExpenses,
    totalDiscExpenses,
    prevYearIncome,
    prevYearSS,
    curYearGains,
    prevYearGains,
    totalEarlyWithdrawals,
    curYearEarlyWithdrawals,
    prevYearEarlyWithdrawals,
    rmdTable,
    prevRMD,
    rmdAmountFromPreviousYear,
    prevYearEndPreTaxSum
  };
}

function computeTotalAssets(state) {
  // Note: cash is already one of the investments.
  return state.investments.reduce((acc, inv) => acc + inv.value, 0);
}

function computeTotalAssetsByType(state) {
  let assetTotals = {};

  state.investments.forEach(investment => {
    if (!assetTotals[investment.assetType]) {
      assetTotals[investment.assetType] = investment.value;
    }
    else {
      assetTotals[investment.assetType] += investment.value;
    }
  });

  return assetTotals;
}

// Helper function to calculate marginal tax
function calculateMarginalTax(taxableIncome, brackets) {
  if (!brackets || brackets.length === 0 || taxableIncome <= 0) {
    return 0;
  }

  let totalTax = 0;

  // Iterate through each tax bracket
  for (const bracket of brackets) {
    // If income is below this bracket's minimum, we're done
    if (taxableIncome <= bracket.min) {
      break;
    }

    // Calculate income falling within this bracket
    const incomeInBracket = Math.min(taxableIncome, bracket.max) - bracket.min;

    // Calculate tax for this portion of income
    const taxForBracket = incomeInBracket * (bracket.rate / 100);

    // Add to total tax
    totalTax += taxForBracket;
  }

  return totalTax;
}

export default async function runSimulation(initialState, userName, generateLog = false) {
  let state = deepCopy(initialState);

  // Ensure 'Cash' asset type exists in assetTypes
  if (!state.assetTypes) {
    state.assetTypes = [];
  }

  const cashAssetType = state.assetTypes.find(assetType => assetType.name === 'Cash');
  if (!cashAssetType) {
    console.log("No Cash asset type found. Creating a default Cash asset type.");
    state.assetTypes.push({
      name: 'Cash',
      returnType: 'fixed',
      fixedReturn: 0,
      normalIncomeMean: 0,
      normalIncomeStd: 0,
      expenseRatio: 0,
      taxability: 'taxable'
    });
  }

  let params = await buildParams(state);

  // Check if Cash investment exists, create one if it doesn't
  let cash = state.investments.find(investment => investment.assetType === 'Cash');
  if (!cash) {
    console.log("No Cash investment found. Creating a Cash investment with 0 value.");
    cash = {
      assetType: 'Cash',
      value: 0,
      taxStatus: 'non-retirement',
      purchasePrice: 0
    };
    state.investments.push(cash);
  }

  let iteration = 1;
  let resObject = {};

  let eventTotals = {};
  eventTotals.income = {};
  eventTotals.expense = {};

  // Preprocess event timings for this simulation run
  console.log("Preprocessing event timings for this simulation run...");
  // Process all non-dependent events
  state.eventSeries.forEach(event => {
    if (event.startYearType !== 'same_as' && event.startYearType !== 'after') {
      let calculatedStartYear;
      let calculatedDuration;
      let actualDuration;

      // --- Determine Start Year ---
      const startMode = event.startYearType ?? 'fixed';
      switch (startMode) {
        case 'random_normal':
          if (!event.startYearMean || !event.startYearStd) {
            console.warn(`Event '${event.name}': Missing required parameters for random_normal start year. Using current year.`);
            calculatedStartYear = params.curYear;
          } else {
            calculatedStartYear = Math.round(sampleNormal(event.startYearMean, event.startYearStd));
          }
          break;

        case 'random_uniform':
          if (!event.startYearMin || !event.startYearMax) {
            console.warn(`Event '${event.name}': Missing required parameters for random_uniform start year. Using current year.`);
            calculatedStartYear = params.curYear;
          } else {
            calculatedStartYear = Math.round(sampleUniform(event.startYearMin, event.startYearMax));
          }
          break;

        case 'fixed':
          calculatedStartYear = event.startYear;
          break;

        default:
          calculatedStartYear = event.startYear ?? params.curYear;
          break;
      }

      // Store the determined start year
      event.startYear = calculatedStartYear;

      // --- Determine Duration ---
      const durationMode = event.durationType ?? 'fixed';

      switch (durationMode) {
        case 'random_normal':
          if (!event.durationMean || !event.durationStd) {
            console.warn(`Event '${event.name}': Missing required parameters for random_normal duration. Using 1 year.`);
            calculatedDuration = 1;
          } else {
            calculatedDuration = Math.round(sampleNormal(event.durationMean, event.durationStd));
          }
          break;

        case 'random_uniform':
          if (!event.durationMin || !event.durationMax) {
            console.warn(`Event '${event.name}': Missing required parameters for random_uniform duration. Using 1 year.`);
            calculatedDuration = 1;
          } else {
            calculatedDuration = Math.round(sampleUniform(event.durationMin, event.durationMax));
          }
          break;

        case 'fixed':
          calculatedDuration = event.durationFixed;
          break;

        default:
          // If duration is not specified but endYear exists, calculate from endYear
          if (!event.duration && event.endYear) {
            calculatedDuration = event.endYear - event.startYear + 1;
          } else {
            calculatedDuration = event.duration ?? 1;
          }
          break;
      }

      // Ensure duration is at least 1 year
      actualDuration = Math.max(1, calculatedDuration);

      // Calculate and store end year
      event.endYear = event.startYear + actualDuration - 1;

      // Log the calculated timing for debugging
      // console.log(`Event '${event.name}': Type S:${startMode}/D:${durationMode} -> Start: ${event.startYear}, End: ${event.endYear} (Duration: ${actualDuration})`);
    }
  });

  // Process dependent events ('same_as' and 'after')
  state.eventSeries.forEach(event => {
    if (event.startYearType === 'same_as' || event.startYearType === 'after') {
      if (!event.startOnOtherSeriesId) {
        console.warn(`Event '${event.name}': Missing startOnOtherSeriesId for ${event.startYearType} timing. Using current year.`);
        event.startYear = params.curYear;
        return;
      }

      // Find the referenced event
      const referencedEvent = state.eventSeries.find(e => e.id === event.startOnOtherSeriesId);
      if (!referencedEvent) {
        console.warn(`Event '${event.name}': Referenced event ${event.startOnOtherSeriesId} not found. Using current year.`);
        event.startYear = params.curYear;
        return;
      }

      // Calculate start year based on the referenced event
      if (event.startYearType === 'same_as') {
        event.startYear = referencedEvent.startYear;
      } else { // 'after'
        event.startYear = referencedEvent.endYear + 1;
      }

      // --- Determine Duration ---
      const durationMode = event.durationType ?? 'fixed';
      let calculatedDuration;
      let actualDuration;

      switch (durationMode) {
        case 'random_normal':
          if (!event.durationMean || !event.durationStd) {
            console.warn(`Event '${event.name}': Missing required parameters for random_normal duration. Using 1 year.`);
            calculatedDuration = 1;
          } else {
            calculatedDuration = Math.round(sampleNormal(event.durationMean, event.durationStd));
          }
          break;

        case 'random_uniform':
          if (!event.durationMin || !event.durationMax) {
            console.warn(`Event '${event.name}': Missing required parameters for random_uniform duration. Using 1 year.`);
            calculatedDuration = 1;
          } else {
            calculatedDuration = Math.round(sampleUniform(event.durationMin, event.durationMax));
          }
          break;

        case 'fixed':
        default:
          // If duration is not specified but endYear exists, calculate from endYear
          if (!event.duration && event.endYear) {
            calculatedDuration = event.endYear - event.startYear + 1;
          } else {
            calculatedDuration = event.duration ?? 1;
          }
          break;
      }

      // Ensure duration is at least 1 year
      actualDuration = Math.max(1, calculatedDuration);

      // Calculate and store end year
      event.endYear = event.startYear + actualDuration - 1;

      // Log the calculated timing for debugging
      // console.log(`Event '${event.name}': Type S:${event.startYearType}/D:${durationMode} -> Start: ${event.startYear}, End: ${event.endYear} (Duration: ${actualDuration})`);
    }
  });

  // (state.eventSeries);

  let logStream;
  let logPath;
  let csvPath;
  const csvData = [];

  // Setup logging
  if (generateLog) {
    const dtString = new Date().toISOString().replace(/[:.]/g, '-');
    const logDir = path.join(process.cwd(), 'logs');
    fs.mkdirSync(logDir, { recursive: true });
    csvPath = path.join(logDir, `${userName}_${dtString}.csv`);
    logPath = path.join(logDir, `${userName}_${dtString}.log`);
    logStream = fs.createWriteStream(logPath, { flags: 'a' });

    // Write initial log entry
    logEvent(logStream, params.curYear, 'Simulation Start', {
      userName: userName,
      InitialAssets: computeTotalAssets(state),
      FinancialGoal: state.financialGoal
    });
  }

  // this while loop performs the simulation iteratively each year while at least one user is still alive
  while (params.userAlive) {
    // Step 1: Preprocessing and Preliminaries
    let assetTotals = computeTotalAssetsByType(state);

    params.curYear += 1;
    //console.log(`[----------------------------------------------------]`)
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

    if (!params.userAlive) {
      if (generateLog) {
        logEvent(logStream, params.curYear, 'Simulation End', {
          Reason: 'User reached life expectancy',
          FinalAssets: computeTotalAssets(state),
          GoalMet: computeTotalAssets(state) >= state.financialGoal
        });
      }
      continue;
    }

    // Reset parameters that go back to the initial value at the beginning of each year
    params.curYearIncome = 0;
    params.curYearSS = 0;
    params.curYearGains = 0;
    params.curYearEarlyWithdrawals = 0;
    params.curYearExpenses = 0;
    params.curYearDiscExpenses = 0;

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
    //console.log("Running income events...");
    let activeIncomeEvents = state.eventSeries.filter(event =>
      event && event.type === "income" &&
      event.startYear && params.curYear >= event.startYear &&
      event.endYear && params.curYear <= event.endYear
    );

    // console.log(activeIncomeEvents);
    activeIncomeEvents.forEach(event => {
      // Initialize event.amount if undefined
      if (typeof event.amount === 'undefined') {
        console.warn(`Income event '${event.name}' has undefined amount. Setting to 0.`);
        event.amount = 0;
      }

      // Apply annual change first (without inflation adjustment)
      if (event.changeType === 'fixed') {
        event.amount += (event.annualChange || 0);
      }
      else if (event.changeType === 'percentage') {
        event.amount = event.amount * (1 + (event.annualChange || 0) / 100);
      }
      else if (event.changeType === 'normal' && event.annualChangeMean !== undefined) {
        // Sample from normal distribution for this year's change
        const sampledChangeAmount = sampleNormal(event.annualChangeMean, event.annualChangeStd || 0);
        event.amount += sampledChangeAmount;
      }
      else if (event.changeType === 'uniform' && event.annualChangeMin !== undefined && event.annualChangeMax !== undefined) {
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

      // Add the amount to cash and update income tracking
      cash.value += event.amount;
      params.curYearIncome += event.amount;

      if (!eventTotals.income[event.name]) {
        eventTotals.income[event.name] = event.amount;
      } else {
        eventTotals.income[event.name] += event.amount;
      }

      if (event.isSocialSecurity) {
        params.curYearSS += event.amount;
      }
      // Log income event
      if (generateLog) {
        logEvent(logStream, params.curYear, 'Income', {
          EventName: event.name,
          Amount: event.amount,
          IsSocialSecurity: event.isSocialSecurity
        });
      }
    });

    // Step 3: Perform the RMD (Calculation for Current Year, Transfer for Previous Year)
    //console.log("Running RMD processing...");

    // --- Part 1: Calculate RMD for Current Year (Based on Prev Year End) ---
    let calculatedRmdCurrentYear = 0;
    if (params.userAge >= 73) {
      const s = params.prevYearEndPreTaxSum ?? 0; // Use sum calculated at end of *last* year
      const rmdEntry = params.rmdTable.find(entry => entry.age === params.userAge);
      const d = rmdEntry?.distributionPeriod;
      console.log(s, rmdEntry, d);

      if (s > 0 && d > 0) {
        calculatedRmdCurrentYear = s / d;
      }

      // RMD amount is added to income in the year it's calculated for (age >= 73)
      params.curYearIncome += calculatedRmdCurrentYear;

      // Store the calculated amount for potential transfer *next* year
      params.prevRMD = calculatedRmdCurrentYear;
      // Log RMD calculation
      if (calculatedRmdCurrentYear > 0) {
        if (generateLog) {
          logEvent(logStream, params.curYear, 'RMD Calculation', {
            Amount: calculatedRmdCurrentYear
          });
        }
      }
    } else {
      // Ensure prevRMD is zeroed out if user is younger than RMD age
      params.prevRMD = 0;
    }

    // --- Part 2: Perform In-Kind Transfer for RMD calculated LAST year ---
    const rmdToTransfer = params.rmdAmountFromPreviousYear ?? 0; // Use value from end of last year

    if (params.userAge >= 74 && rmdToTransfer > 0) {
      console.log(`Year ${params.curYear} Age ${params.userAge}: Attempting RMD transfer for amount ${rmdToTransfer.toFixed(2)} calculated last year.`);
      let remainingToTransfer = rmdToTransfer;

      // Sort investments according to RMD withdrawal strategy
      // TODO: Implement proper sorting based on state.rmdStrategy if available
      // For now, we'll assume the investments are already in the correct order
      const preTaxInvestmentsForRMD = [...state.investments]
        .filter(inv => inv.taxStatus === "pre-tax-retirement" && inv.value > 0)
        .sort((a, b) => (a.rmdStrategy || Infinity) - (b.rmdStrategy || Infinity));

      for (let inv of preTaxInvestmentsForRMD) {
        if (remainingToTransfer <= 0) break;

        const transferAmount = Math.min(inv.value, remainingToTransfer);

        if (transferAmount <= 0) continue; // Skip if calculated transfer is zero

        // Reduce source value
        inv.value -= transferAmount;
        // Pre-tax accounts generally have 0 basis, so no basis reduction needed on source

        // Find or create target non-retirement investment
        let targetInvestment = state.investments.find(t =>
          t.assetType === inv.assetType && t.taxStatus === "non-retirement"
        );

        if (targetInvestment) {
          targetInvestment.value += transferAmount;
          // Add transferred amount to basis of the target taxable investment
          targetInvestment.purchasePrice = (targetInvestment.purchasePrice ?? 0) + transferAmount;
        } else {
          const newInvestment = {
            assetType: inv.assetType,
            value: transferAmount,
            taxStatus: "non-retirement",
            purchasePrice: transferAmount // Basis of new investment is the transferred amount
          };
          state.investments.push(newInvestment);
        }

        remainingToTransfer -= transferAmount;
      }

      // Log RMD transfer
      const actualTransferred = rmdToTransfer - remainingToTransfer;
      if (actualTransferred > 0 || rmdToTransfer > 0) {
        if (generateLog) {
          logEvent(logStream, params.curYear, 'RMD Transfer', {
            RequiredAmount: rmdToTransfer,
            TransferredAmount: actualTransferred,
            Shortfall: remainingToTransfer
          });
        }
      }

      if (remainingToTransfer > 0.01) { // Tolerance for floating point issues
        console.warn(`Year ${params.curYear} Age ${params.userAge}: RMD transfer shortfall. Could not transfer ${remainingToTransfer.toFixed(2)} from pre-tax accounts.`);
      }
    }

    // Step 4: Update the values of investments, reflecting expected annual return, reinvestment of generated income, and subtraction of expenses.
    //console.log("Running investment updates...");
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

      params.curYearExpenses += expenses;

      // Subtract expenses
      investment.value -= expenses;

      // Log investment update
      if (generateLog) {
        logEvent(logStream, params.curYear, 'Investment Update', {
          AssetType: type,
          TaxStatus: investment.taxStatus,
          GeneratedIncome: generatedIncome,
          ReturnChange: changeInValue,
          Expenses: expenses,
          FinalValue: investment.value
        });
      }
    });

    // Step 5: Run the Roth conversion (RC) optimizer, if it is enabled
    if (state.rothOptimizationStartYear && state.rothOptimizationEndYear) {
      //console.log("Running roth conversion optimizer...");

      // Calculate the user's federal taxable income for the year.
      // This subtracts 85% of Social Security from the total income.
      const curYearFedTaxableIncome = params.curYearIncome - 0.85 * params.curYearSS;
      // console.log(params.curYearIncome)

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

      const preTaxInvestmentsForRoth = [...state.investments]
        .filter(inv => inv.taxStatus === "pre-tax-retirement" && inv.value > 0)
        .sort((a, b) => (a.rothConversionStrategy || Infinity) - (b.rothConversionStrategy || Infinity));

      // Store original values for logging
      preTaxInvestmentsForRoth.forEach(inv => {
        inv.originalValue = inv.value;
      });

      // Assuming that 'state.investments' is ordered by your Roth conversion strategy,
      // iterate over investments to perform the conversion.
      for (let inv of preTaxInvestmentsForRoth) {
        if (remainingConversion <= 0) break; // Conversion complete.

        // let inv = state.investments[i];

        // Only convert from pre-tax retirement investments.
        if (inv.taxStatus === 'pre-tax-retirement' && inv.value > 0) {
          let transferAmount = Math.min(inv.value, remainingConversion);

          // Deduct the transfer amount from the source investment.
          inv.value -= transferAmount;
          if (params.userAge < 59) {
            params.curYearEarlyWithdrawals += transferAmount;
          }

          // Find or create the corresponding after-tax retirement investment.
          let target = state.investments.find(t =>
            t.assetType === inv.assetType && t.taxStatus === 'after-tax-retirement'
          );

          if (!target) {
            // Create a new after-tax retirement investment.
            let newInv = {
              assetType: inv.assetType, // Use the proper asset type from the investment.
              value: transferAmount,
              taxStatus: 'after-tax-retirement',
              purchasePrice: transferAmount,
            };
            // TODO: Handle database updates for the new investment.
            state.investments.push(newInv);
          } else {
            // Increase the value of the existing after-tax retirement investment.
            target.value += transferAmount;
            target.purchasePrice = (target.purchasePrice ?? 0) + transferAmount;
          }

          // Reduce the remaining conversion amount.
          remainingConversion -= transferAmount;

          // Since converting pre-tax funds to a Roth account is a taxable event,
          // add the converted amount to the current year's income.
          params.curYearIncome += transferAmount;
        }
      }
      // Log Roth conversion event
      const totalConverted = rothConversionAmount - remainingConversion;
      if (totalConverted > 0) {
        if (generateLog) {
          // Create a detailed log of each investment converted
          const conversionDetails = preTaxInvestmentsForRoth
            .filter(inv => inv.value < inv.originalValue)     // only those with a conversion
            .map(inv => inv.assetType);                       // now just the name

          logEvent(logStream, params.curYear, 'Roth Conversion', {
            TotalConverted: totalConverted,
            TargetBracketMax: taxBracket.max,
            Conversions: conversionDetails    // e.g. ["Vanguard 401k", "Fidelity IRA", …]
          });
        }
      }
    }

    // Step 6: Pay non-discretionary expenses and the previous year's taxes,
    // i.e., subtract them from the cash investment. Perform additional withdrawals if needed to pay them.
    //console.log("Running non-discretionary expense and tax processing...");

    let prevYearFedTax = 0;
    let prevYearStateTax = 0;
    let prevYearCapitalGainsTax = 0;
    let earlyWithdrawalTax = 0;

    // Determine filing status based on whether a spouse is present and alive.
    const filingStatus = (params.hasSpouse && params.spouseAlive) ? 'married-joint' : 'single';

    // Calculate last year's federal taxable income.
    // (Subtract 85% of last year's Social Security from last year's income)
    const prevYearFedTaxableIncome = (params.prevYearIncome ?? 0) - 0.85 * (params.prevYearSS ?? 0);

    // Apply standard deduction to get income after deduction
    const prevStandardDeduction = params.prevYearStandardDeductions[filingStatus];
    const prevYearIncomeAfterDeduction = Math.max(0, prevYearFedTaxableIncome - prevStandardDeduction);

    // --- Federal Income Tax Calculation ---
    // Use previous year's tax brackets
    const previousFedBrackets = params.prevYearTaxBrackets ?? {};
    const fedBracketsForStatus = previousFedBrackets[filingStatus];

    if (fedBracketsForStatus && fedBracketsForStatus.length > 0) {
      prevYearFedTax = calculateMarginalTax(prevYearIncomeAfterDeduction, fedBracketsForStatus);
    } else {
      prevYearFedTax = 0;
      // console.warn(`Year ${params.curYear}: Missing or empty federal tax brackets for status ${filingStatus} for previous year tax calculation.`);
    }

    // --- State Income Tax Calculation ---
    // Use previous year's state tax brackets
    const previousStateBrackets = params.prevYearStateTaxBrackets ?? {};
    const stateBracketsForStatus = previousStateBrackets[state.residenceState]?.[filingStatus];

    if (stateBracketsForStatus && stateBracketsForStatus.length > 0) {
      prevYearStateTax = calculateMarginalTax(prevYearFedTaxableIncome, stateBracketsForStatus);
    } else {
      prevYearStateTax = 0;
      // console.warn(`Year ${params.curYear}: Missing or empty state tax brackets for ${state.residenceState} ${filingStatus} for previous year tax calculation.`);
    }

    // --- Capital Gains Tax Calculation ---
    // Use previous year's capital gains tax brackets
    const previousCapitalGainsBrackets = params.prevYearCapitalGainsTax ?? {};
    const capitalGainsBracketsForStatus = previousCapitalGainsBrackets[filingStatus];

    if (capitalGainsBracketsForStatus && capitalGainsBracketsForStatus.length > 0) {
      prevYearCapitalGainsTax = calculateMarginalTax(Math.max(0, params.prevYearGains ?? 0), capitalGainsBracketsForStatus);
    } else {
      prevYearCapitalGainsTax = 0;
      // console.warn(`Year ${params.curYear}: Missing or empty capital gains tax brackets for status ${filingStatus} for previous year tax calculation.`);
    }

    // Early withdrawal penalty
    earlyWithdrawalTax = (params.prevYearEarlyWithdrawals ?? 0) * 0.1;

    // Sum up all tax liabilities from last year.
    let totalTaxes = prevYearFedTax + prevYearStateTax + prevYearCapitalGainsTax + earlyWithdrawalTax;

    // Log tax payment with detailed breakdown
    if (totalTaxes > 0) {
      if (generateLog) {
        logEvent(logStream, params.curYear, 'Tax Payment (Prev Year)', {
          Total: totalTaxes,
          FedIncome: prevYearFedTax,
          StateIncome: prevYearStateTax,
          CapGains: prevYearCapitalGainsTax,
          EarlyWithdrawal: earlyWithdrawalTax,
          IncomeBeforeDeduction: prevYearFedTaxableIncome,
          StandardDeduction: prevStandardDeduction,
          IncomeAfterDeduction: prevYearIncomeAfterDeduction
        });
      }
    }

    // --- Non-Discretionary Expense Summation ---
    let nonDiscretionarySum = 0;
    let nonDiscretionaryEvents = state.eventSeries.filter(event =>
      event.type === "expense" &&
      event.isDiscretionary === false &&
      params.curYear >= event.startYear &&
      params.curYear <= event.endYear
    );

    nonDiscretionaryEvents.forEach(event => {
      let calculatedExpenseAmount = event.amount; // Start with base amount

      // Apply annual change first (mirroring income logic)
      if (event.changeType === 'fixed') {
        calculatedExpenseAmount += event.annualChange;
      } else if (event.changeType === 'percentage') {
        calculatedExpenseAmount *= (1 + event.annualChange / 100);
      } else if (event.changeType === 'normal') {
        // Sample from normal distribution for this year's change
        const sampledChangeAmount = sampleNormal(event.annualChangeMean, event.annualChangeStd);
        calculatedExpenseAmount += sampledChangeAmount;
      } else if (event.changeType === 'uniform') {
        // Sample from uniform distribution for this year's change percentage
        const sampledChangePercentage = sampleUniform(event.annualChangeMin, event.annualChangeMax);
        calculatedExpenseAmount *= (1 + sampledChangePercentage / 100);
      }

      // Then apply inflation adjustment if needed
      if (event.inflationAdjusted) {
        calculatedExpenseAmount *= (1 + params.inflationRate / 100);
      }

      params.curYearExpenses += calculatedExpenseAmount;
      if (!eventTotals.expense[event.name]) {
        eventTotals.expense[event.name] = calculatedExpenseAmount;
      } else {
        eventTotals.expense[event.name] += calculatedExpenseAmount;
      }

      // Add the calculated amount for this year to the sum
      nonDiscretionarySum += calculatedExpenseAmount;

      // Log non-discretionary expense
      if (generateLog) {
        logEvent(logStream, params.curYear, 'Expense (Non-Disc)', {
          EventName: event.name,
          AmountPaid: calculatedExpenseAmount
        });
      }
    });

    // Calculate the total payment amount: non-discretionary expenses plus last year's taxes.
    let totalPaymentAmount = nonDiscretionarySum + totalTaxes;

    // Determine the shortfall that must be withdrawn from investments if available cash is insufficient.
    let withdrawalAmount = Math.max(0, totalPaymentAmount - cash.value);

    // If additional funds are needed, liquidate investments according to the specified ordering.
    if (withdrawalAmount > 0) {
      let totalWithdrawn = 0;

      const investmentsToSell = [...state.investments]
        .filter(inv => inv.assetType !== 'Cash' && inv.value > 0)
        .sort((a, b) => (a.expenseWithdrawalStrategy || Infinity) - (b.expenseWithdrawalStrategy || Infinity));

      // Iterate over investments (using the ordering in state.investments)
      for (let inv of investmentsToSell) {
        // let inv = state.investments[i];

        // Skip cash investments or investments with zero value.
        // if (inv.assetType === "cash" || inv.value <= 0) continue;

        // Determine the amount to be sold from this investment.
        let remainingToSell = withdrawalAmount - totalWithdrawn;
        let amountSold = Math.min(inv.value, remainingToSell);

        // console.log(amountSold);
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
        if (inv.taxStatus === "non-retirement") {
          params.curYearGains += saleCapitalGain;
        } else if (inv.taxStatus === "pre-tax-retirement") {
          params.curYearIncome += amountSold;
        }

        // For retirement accounts (pre-tax or after-tax) and if the user is under 59,
        // record early withdrawals (to account for any penalty).
        if ((inv.taxStatus === "pre-tax-retirement" || inv.taxStatus === "after-tax-retirement") && params.userAge < 59) {
          params.curYearEarlyWithdrawals += amountSold;
        }

        // Update the investment by subtracting the amount sold.
        inv.value -= amountSold;

        // Adjust the cost basis (purchasePrice) proportionally.
        // inv.purchasePrice -= fractionSold * inv.purchasePrice;
        const purchasePrice = typeof inv.purchasePrice === 'number' ? inv.purchasePrice : 0;
        if (Math.abs(inv.value) < 0.01) { // Check if value is near zero after sale
          inv.purchasePrice = 0; // Set basis to zero if all sold
        } else if (purchasePrice > 0 && fractionSold > 0) {
          inv.purchasePrice = Math.max(0, purchasePrice - (fractionSold * purchasePrice));
        }

        cash.value += amountSold;
        totalWithdrawn += amountSold;

        // Log investment sale
        if (generateLog) {
          logEvent(logStream, params.curYear, 'Investment Sale', {
            AssetType: inv.assetType,
            TaxStatus: inv.taxStatus,
            AmountSold: amountSold,
            CapitalGain: saleCapitalGain
          });
        }
      }

      if (totalWithdrawn < withdrawalAmount) {
        // console.warn("Withdrawal shortfall: unable to fully cover the required non-discretionary expenses and taxes from investments.");
        if (generateLog) {
          logEvent(logStream, params.curYear, 'Withdrawal Shortfall', {
            Required: withdrawalAmount,
            Actual: totalWithdrawn,
            Shortfall: withdrawalAmount - totalWithdrawn
          });
        }
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
    //console.log("Running discretionary expense processing...");

    const financialGoal = state.financialGoal;

    // Get the discretionary expense events for the current year.
    let discretionaryEvents = state.eventSeries.filter(event =>
      event.type === "expense" &&
      event.isDiscretionary === true &&
      params.curYear >= event.startYear &&
      params.curYear <= event.endYear
    );
    discretionaryEvents.sort((a, b) => (a.spendingStrategy || Infinity) - (b.spendingStrategy || Infinity));
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
        params.curYearExpenses += expenseAmount;
        params.curYearDiscExpenses += expenseAmount;

        if (!eventTotals.expense[event.name]) {
          eventTotals.expense[event.name] = expenseAmount;
        } else {
          eventTotals.expense[event.name] += expenseAmount;
        }
      }

      // Determine if current cash is sufficient to pay the expense.
      if (cash.value < expenseAmount) {
        // Calculate additional funds required.
        let additionalWithdrawal = expenseAmount - cash.value;
        let totalWithdrawn = 0;

        const investmentsToSell = [...state.investments] // Create shallow copy
          .filter(inv => inv.assetType !== 'Cash' && inv.value > 0) // Filter out cash/empty
          .sort((a, b) => (a.expenseWithdrawalStrategy || Infinity) - (b.expenseWithdrawalStrategy || Infinity));

        // Withdraw funds from investments in the order defined in state.investments.
        for (let inv of investmentsToSell) {
          // let inv = state.investments[i];

          // Skip the cash bucket or any investment with no value.
          // if (inv.assetType === "cash" || inv.value <= 0) continue;

          // Determine the withdrawal amount from this investment.
          let remainingToWithdraw = additionalWithdrawal - totalWithdrawn;
          let withdrawalAmount = Math.min(inv.value, remainingToWithdraw);

          // Calculate the fraction of the investment being sold.
          let fractionSold = inv.value > 0 ? withdrawalAmount / inv.value : 0;;
          // Calculate the realized capital gain on the sale.
          let realizedGain = fractionSold * (inv.value - inv.purchasePrice);

          // If the investment is not held in a pre-tax retirement account, record the realized gain.
          // Otherwise, treat the withdrawn amount as ordinary income.
          if (inv.taxStatus === "non-retirement") {
            params.curYearGains += realizedGain;
          } else if (inv.taxStatus === "pre-tax-retirement") {
            params.curYearIncome += withdrawalAmount;
          }

          // For retirement accounts and if the user is under 59, record early withdrawals.
          if ((inv.taxStatus === "pre-tax-retirement" || inv.taxStatus === "after-tax-retirement") && params.userAge < 59) {
            params.curYearEarlyWithdrawals += withdrawalAmount;
          }

          // Adjust the investment's value and cost basis proportionally.
          inv.value -= withdrawalAmount;
          inv.purchasePrice -= fractionSold * inv.purchasePrice;

          cash.value += withdrawalAmount;
          totalWithdrawn += withdrawalAmount;

          // Log investment sale for discretionary expense
          if (generateLog) {
            logEvent(logStream, params.curYear, 'Investment Sale (Disc)', {
              AssetType: inv.assetType,
              TaxStatus: inv.taxStatus,
              AmountSold: withdrawalAmount,
              CapitalGain: realizedGain
            });
          }
        }

        // Increase cash by the total amount withdrawn from investments.
        cash.value += totalWithdrawn;
      }

      // Deduct the expense amount from cash.
      cash.value -= expenseAmount;
      params.curYearExpenses += expenseAmount;
      params.curYearDiscExpenses += expenseAmount;

      if (!eventTotals.expense[event.name]) {
        eventTotals.expense[event.name] = expenseAmount;
      } else {
        eventTotals.expense[event.name] += expenseAmount;
      }

      // Log discretionary expense
      if (generateLog) {
        logEvent(logStream, params.curYear, 'Expense (Disc)', {
          EventName: event.name,
          AmountPaid: expenseAmount
        });
      }

      // Update total assets after paying the expense.
      totalAssets = computeTotalAssets(state);

      // If the total assets have reached or dropped below the financial goal, stop processing further expenses.
      if (totalAssets <= financialGoal) {
        break;
      }
    }

    // Step 8: Run the invest event scheduled for the current year, if any, by using excess cash to buy investments included in the asset allocation in the invest event,
    // apportioning the excess cash according to that asset allocation.
    //console.log("Running invest events...");
    let activeInvestEvents = state.eventSeries.filter(event =>
      event.type === "invest" &&
      params.curYear >= event.startYear &&
      params.curYear <= event.endYear &&
      event.investEventDetails // Ensure details exist
    );

    for (let event of activeInvestEvents) {
      // Access allocation details through investEventDetails
      const allocationDetails = event.investEventDetails.assetAllocation;

      if (!allocationDetails) {
        // console.warn(`Event '${event.name}': Missing asset allocation details. Skipping invest event.`);
        continue;
      }

      // Calculate excess cash available for investment
      let excessCash = Math.max(0, cash.value - event.investEventDetails.maxCash);

      if (excessCash <= 0) continue;

      // Get the current year's after-tax retirement contribution limit
      const L = params.afterTaxRetirementContributionLimit;

      // Calculate current allocation percentages based on glide path if applicable
      let rawAllocation;
      if (allocationDetails.isGlidePath) {
        // Calculate progress through glide path (t)
        const duration = event.endYear - event.startYear;
        const t = duration === 0 ? 1 : Math.min(1, Math.max(0, (params.curYear - event.startYear) / duration));

        // Calculate current percentages by interpolating between initial and final
        rawAllocation = allocationDetails.initialPercentages.map((initial, i) => {
          const final = allocationDetails.finalPercentages[i];
          return {
            assetType: initial.assetType,
            taxStatus: initial.taxStatus,
            percentage: initial.percentage * (1 - t) + final.percentage * t
          };
        });
      } else {
        rawAllocation = allocationDetails.percentages;
      }

      // Filter out pre-tax-retirement targets as per requirements
      const currentAllocation = rawAllocation.filter(alloc =>
        alloc.taxStatus === 'non-retirement' || alloc.taxStatus === 'after-tax-retirement'
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
        .filter(p => p.taxStatus === 'after-tax-retirement')
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
          if (planned.taxStatus === 'after-tax-retirement') {
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

        // Log investment purchase
        if (generateLog) {
          logEvent(logStream, params.curYear, 'Investment Purchase', {
            AssetType: planned.assetType,
            TaxStatus: planned.taxStatus,
            Amount: planned.amountToBuy
          });
        }
      }

      // Reduce cash by the total amount actually invested
      cash.value -= totalAmountInvested;

      // Log invest event
      if (totalAmountInvested > 0) {
        if (generateLog) {
          logEvent(logStream, params.curYear, 'Invest Event', {
            TotalInvested: totalAmountInvested,
            ExcessCashAvailable: excessCash
          });
        }
      }
    }

    // Step 9: Run rebalance events scheduled for the current year, by selling and buying the investments included in the specified asset allocation to achieve the specified ratios between their values.
    //console.log("Running rebalance events");
    let activeRebalanceEvents = state.eventSeries.filter(event =>
      event.type === "rebalance" &&
      params.curYear >= event.startYear &&
      params.curYear <= event.endYear &&
      event.rebalanceEventDetails // Ensure details exist
    );

    for (let event of activeRebalanceEvents) {
      // Access allocation details through rebalanceEventDetails
      const allocationDetails = event.rebalanceEventDetails.assetAllocation;

      if (!allocationDetails) {
        console.warn(`Event '${event.name}': Missing asset allocation details. Skipping rebalance event.`);
        continue;
      }

      let currentAllocation;
      if (allocationDetails.isGlidePath) {
        // Calculate progress through glide path (t)
        const duration = event.endYear - event.startYear;
        const t = duration === 0 ? 1 : Math.min(1, Math.max(0, (params.curYear - event.startYear) / duration));

        // Calculate current percentages by interpolating between initial and final
        currentAllocation = allocationDetails.initialPercentages.map((initial, i) => {
          const final = allocationDetails.finalPercentages[i];
          return {
            assetType: initial.assetType,
            taxStatus: initial.taxStatus,
            percentage: initial.percentage * (1 - t) + final.percentage * t
          };
        });
      } else {
        currentAllocation = allocationDetails.percentages;
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

            // Log rebalance buy
            if (generateLog) {
              logEvent(logStream, params.curYear, 'Rebalance Buy', {
                Investment: `${alloc.assetType}_${alloc.taxStatus}`,
                Amount: valueDiff
              });
            }
          } else {
            console.warn(`Insufficient cash for rebalancing: needed ${valueDiff}, have ${cash.value}`);
          }
        } else if (valueDiff < 0) {
          // Need to sell some
          let amountToSell = Math.abs(valueDiff);
          let fractionSold = amountToSell / investment.value;

          // Calculate capital gain/loss
          let saleCapitalGain = fractionSold * (investment.value - investment.purchasePrice);

          if (investment.taxStatus === "non-retirement") {
            params.curYearGains += saleCapitalGain;
          } else if (investment.taxStatus === "pre-tax-retirement") {
            params.curYearIncome += amountToSell;
          }

          if ((investment.taxStatus === "pre-tax-retirement" || investment.taxStatus === "after-tax-retirement") && params.userAge < 59) {
            params.curYearEarlyWithdrawals += amountToSell;
          }

          // Update investment value and purchase price
          investment.value -= amountToSell;
          investment.purchasePrice -= fractionSold * investment.purchasePrice;
          cash.value += amountToSell;

          // Log rebalance sell
          if (generateLog) {
            logEvent(logStream, params.curYear, 'Rebalance Sell', {
              Investment: `${alloc.assetType}_${alloc.taxStatus}`,
              Amount: amountToSell,
              CapitalGain: saleCapitalGain
            });
          }
        }
      }
    }

    // Store current year's tax brackets and deductions for next year's tax calculations
    params.prevYearTaxBrackets = JSON.parse(JSON.stringify(params.taxBrackets));
    params.prevYearStateTaxBrackets = JSON.parse(JSON.stringify(params.stateTaxBrackets));
    params.prevYearCapitalGainsTax = JSON.parse(JSON.stringify(params.capitalGainsTax));
    params.prevYearStandardDeductions = JSON.parse(JSON.stringify(params.standardDeductions));

    params.totalIncome += params.curYearIncome;
    params.totalExpenses += params.curYearExpenses;
    params.totalDiscExpenses += params.curYearDiscExpenses;

    params.totalEarlyWithdrawals += params.curYearEarlyWithdrawals;

    params.prevYearIncome = params.curYearIncome;
    params.prevYearSS = params.curYearSS;
    params.prevYearGains = params.curYearGains;
    params.prevYearEarlyWithdrawals = params.curYearEarlyWithdrawals;

    params.rmdAmountFromPreviousYear = params.prevRMD; // Store the RMD calculated this year for next year's transfer
    params.prevYearEndPreTaxSum = state.investments
      .filter(inv => inv.taxStatus === "pre-tax-retirement")
      .reduce((sum, inv) => sum + inv.value, 0); // Store the current year-end pre-tax sum
    console.log(params.prevYearEndPreTaxSum);

    //console.log(params.totalDiscExpenses);
    // set fields for the return object, which will be used in generating the charts
    resObject[params.curYear] = {}
    resObject[params.curYear].success = computeTotalAssets(state) >= state.financialGoal;
    resObject[params.curYear].totInvestments = computeTotalAssets(state);
    resObject[params.curYear].totIncome = params.totalIncome;
    resObject[params.curYear].totExpenses = params.totalExpenses;
    resObject[params.curYear].earlyWithdrawalTax = params.curYearEarlyWithdrawals * 0.1;
    resObject[params.curYear].totDiscExpensePercent = (params.totalDiscExpenses / params.totalExpenses) * 100;
    state.assetTypes.forEach(assetType => {
      resObject[params.curYear][`${assetType.name} Type Total`] = assetTotals[assetType.name];
    })
    state.eventSeries.forEach(eventItem => {
      if (eventItem.type === 'income') {
        resObject[params.curYear][`${eventItem.name} Event Income`] = eventTotals.income[eventItem.name] ?? 0;
      }
    })
    state.eventSeries.forEach(eventItem => {
      if (eventItem.type === 'expense') {
        resObject[params.curYear][`${eventItem.name} Event Expense`] = eventTotals.expense[eventItem.name] ?? 0;
      }
    })
    resObject[params.curYear].taxes = totalTaxes;

    // Capture end-of-year state for CSV
    const yearlySnapshot = { Year: params.curYear };
    state.investments.forEach(inv => {
      const investmentKey = `${inv.assetType}_${inv.taxStatus}`;
      yearlySnapshot[investmentKey] = inv.value;
    });
    if (generateLog) {
      csvData.push(yearlySnapshot);
    }

    iteration += 1;
  }
  // Close the log stream
  if (generateLog) {
    logStream.end();
  }

  if (generateLog) {
    // Write the CSV file
    if (csvData.length > 0) {
      // Dynamically get all unique investment keys used across all years for the header
      const allKeys = new Set(['Year']);
      csvData.forEach(row => Object.keys(row).forEach(key => allKeys.add(key)));
      const header = Array.from(allKeys);

      // Map data to ensure all rows have all columns, defaulting missing to 0 or ''
      const csvRows = csvData.map(row => {
        return header.map(key => row[key] ?? 0); // Default missing investment value to 0
      });

      // Prepend header row
      csvRows.unshift(header);

      // Write using fs
      const csvContent = csvRows.map(row => row.join(',')).join('\n');
      try {
        fs.writeFileSync(csvPath, csvContent);
        console.log(`CSV log written to ${csvPath}`);
      } catch (err) {
        console.error(`Error writing CSV log to ${csvPath}:`, err);
      }
    }
  }

  console.log("Simulation done");
  if (computeTotalAssets(state) >= state.financialGoal) {
    console.log("Financial goal was met");
  }
  else {
    console.log("Financial goal was not met");
  }

  return resObject;
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
    // console.log('Tax data received:', data);
    // console.log('Filing statuses:', filingStatuses);

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
      CA: stateTaxData.CA
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