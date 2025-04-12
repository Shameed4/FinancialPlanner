class FinancialState {
    constructor(
      age,
      taxable,
      ira,
      roth,
      income,
      expenses,
      taxRate,
      yearsToRetire
    ) {
      this.age = age;
      this.cash = 0; // Add central cash account
      this.taxable = {
        balance: taxable,
        costBasis: taxable,
        investments: [
          {
            balance: taxable,
            purchaseYear: 0,
            type: "stock",
            costBasis: taxable,
          },
        ],
      };
      this.ira = {
        balance: ira,
        investments: [{ balance: ira, type: "pre-tax" }],
      };
      this.roth = {
        balance: roth,
        investments: [
          {
            id: "roth-stock",
            balance: roth,
            type: "stock",
            taxStatus: "after-tax",
          },
        ],
      };
      // Track current year income separately from previous year
      this.curYearIncome = income;
      this.income = income;
      this.expenses =
        typeof expenses === "number"
          ? { nonDiscretionary: expenses * 0.7, discretionary: expenses * 0.3 }
          : expenses;
      this.taxRate = taxRate;
      this.yearsUntilRetirement = yearsToRetire;
      this.capitalGains = 0;
      this.curYearGains = 0; // Track current year capital gains
      this.financialGoal = 0; // Default is 0, meaning just meet expenses
      this.spendingStrategy = []; // Order for discretionary expenses
      this.expenseWithdrawalStrategy = []; // Order for investment withdrawals
      this.rmdStrategy = []; // Order for RMD withdrawals
      this.investEvents = []; // Investment events for excess cash
      this.rothConversion = 0;
      this.rothConversionStrategy = []; // Order for Roth conversions
      this.rothConversionOptimizerEnabled = true; // Whether to enable Roth conversion optimizer
      this.rothConversionOptimizerStartYear = 0; // When to start Roth conversions
      this.rothConversionOptimizerEndYear = 0; // When to end Roth conversions
      this.inflationAdjustedTaxBrackets = null;
      this.inflationAdjustedContributionLimits = {
        preTax: 22500, // 2023 401(k) limit
        afterTax: 6500, // 2023 IRA limit
      };
      this.previousYearIncome = 0;
      this.previousYearSS = 0;
      this.curYearSS = 0; // Track current year social security
      this.previousYearGains = 0;
      this.previousYearEarlyWithdrawals = 0;
      this.curYearEarlyWithdrawals = 0; // Track current year early withdrawals
      this.curYearPreTaxContribution = 0; // Track current year pre-tax contributions
      this.curYearAfterTaxContribution = 0; // Track current year after-tax contributions
      this.socialSecurity = {
        monthlyBenefit: 0,
        startAge: 67, // Default to full retirement age
        isStarted: false,
        isSpouseBenefit: false, // Track if this is a survivor benefit
        primaryInsuranceAmount: 0, // Base benefit amount
        survivorBenefitMultiplier: 1.0, // Multiplier for survivor benefits
      };
      this.ssTaxablePercentage = 0; // Percentage of SS benefits that are taxable
      this.stateTaxRate = 0.05; // Default state tax rate
      this.stateStandardDeduction = 5000; // Default state standard deduction
      this.investmentExpenses = {
        managementFees: 0.002, // 0.2% annual management fee
        tradingCosts: 0.0001, // 0.01% per trade
        fundExpenseRatios: {
          stock: 0.001, // 0.1% for stock funds
          bond: 0.0005, // 0.05% for bond funds
          other: 0.002, // 0.2% for other investments
        },
      };
      this.previousYearTaxBrackets = null;
      this.previousYearContributionLimits = {
        preTax: 22500,
        afterTax: 6500,
      };
      this.stateTaxBrackets = [
        { lower: 0, upper: Infinity, rate: this.stateTaxRate },
      ];
      this.stateCapitalGainsBrackets = [
        { lower: 0, upper: Infinity, rate: this.stateTaxRate },
      ];
      this.federalCapitalGainsBrackets = [
        { lower: 0, upper: 44625, rate: 0.0 },
        { lower: 44626, upper: 492300, rate: 0.15 },
        { lower: 492301, upper: Infinity, rate: 0.2 },
      ];
      this.previousYearStateTaxBrackets = null;
      this.previousYearStateCapitalGainsBrackets = null;
      this.previousYearFederalCapitalGainsBrackets = null;
      this.inflationRate = 0; // Add inflation rate tracking
      this.rmdTable = getLatestRMDFactors(); // Initialize with latest RMD table
      this.rmdTableYear = new Date().getFullYear(); // Track which year's table we're using
      this.isDeceased = false;
      this.spouseDeceased = false;
      this.capitalLossCarryforward = 0; // Track carried forward losses
      this.previousYearTaxDue = 0; // Track previous year's tax bill
      this.curYearTaxDue = 0; // Track current year's tax bill (to be paid next year)
      this.incomeEvents = []; // Track income events
      this.eventSeries = []; // Array of event series (income, expense, invest, rebalance)
  
      // Reorganize investments as a single array with type and tax status
      this.investments = [
        // Default initialization from constructor parameters
        {
          id: "taxable-stock",
          type: "stock",
          taxStatus: "non-retirement",
          balance: taxable * 0.7,
          costBasis: taxable * 0.7,
        },
        {
          id: "taxable-bond",
          type: "bond",
          taxStatus: "non-retirement",
          balance: taxable * 0.3,
          costBasis: taxable * 0.3,
        },
        {
          id: "ira-stock",
          type: "stock",
          taxStatus: "pre-tax",
          balance: ira * 0.6,
        },
        {
          id: "ira-bond",
          type: "bond",
          taxStatus: "pre-tax",
          balance: ira * 0.4,
        },
        {
          id: "roth-stock",
          type: "stock",
          taxStatus: "after-tax",
          balance: roth,
        },
      ];
    }
  }
  
  function getLatestRMDFactors() {
    // This would typically fetch from IRS API or database
    // For now, we'll use the 2024 RMD table as an example
    return {
      72: 27.4,
      73: 26.5,
      74: 25.5,
      75: 24.6,
      76: 23.7,
      77: 22.9,
      78: 22.0,
      79: 21.1,
      80: 20.2,
      81: 19.4,
      82: 18.5,
      83: 17.7,
      84: 16.8,
      85: 16.0,
      86: 15.2,
      87: 14.4,
      88: 13.7,
      89: 12.9,
      90: 12.2,
      91: 11.5,
      92: 10.8,
      93: 10.1,
      94: 9.5,
      95: 8.9,
      96: 8.3,
      97: 7.7,
      98: 7.2,
      99: 6.7,
      100: 6.2,
      101: 5.7,
      102: 5.3,
      103: 4.9,
      104: 4.5,
      105: 4.2,
      106: 3.9,
      107: 3.6,
      108: 3.3,
      109: 3.0,
      110: 2.8,
      111: 2.6,
      112: 2.4,
      113: 2.2,
      114: 2.0,
      115: 1.9,
      116: 1.8,
      117: 1.7,
      118: 1.6,
      119: 1.5,
      120: 1.4,
    };
  }
  
  function getRMDFactor(age, rmdTable) {
    const ages = Object.keys(rmdTable)
      .map(Number)
      .sort((a, b) => a - b);
    const closestAge = ages.find((a) => a >= age) || Math.max(...ages);
    return rmdTable[closestAge];
  }
  
  // Helper Fucntions
  
  function deepCopy(obj) {
    if (obj === undefined) return undefined;
  
    // Handle potential undefined values inside objects or arrays
    const replacer = (key, value) => {
      return value === undefined ? null : value;
    };
  
    return JSON.parse(JSON.stringify(obj, replacer));
  }
  
  function updateBalances(state) {
    state.taxable.balance = state.taxable.investments.reduce(
      (sum, inv) => sum + inv.balance,
      0
    );
    state.ira.balance = state.ira.investments.reduce(
      (sum, inv) => sum + inv.balance,
      0
    );
    state.roth.balance = state.roth.investments.reduce(
      (sum, inv) => sum + inv.balance,
      0
    );
  }
  
  function runIncomeEvents(state, params) {
    // Skip income events if deceased
    if (state.isDeceased) return;
  
    // Taxable account: dividends taxed as income
    state.taxable.investments.forEach((investment) => {
      const dividends = investment.balance * params.dividendYield;
      const tax = dividends * getTaxRate(dividends, taxBrackets);
      investment.balance -= tax;
  
      // Use Monte Carlo for returns
      const randomReturn = generateRandomReturn(
        params.marketReturn,
        params.marketVolatility
      );
      investment.balance *= 1 + (randomReturn - params.inflation);
    });
  
    // IRA/Roth: tax-free growth
    [state.ira, state.roth].forEach((account) => {
      account.investments.forEach((investment) => {
        const randomReturn = generateRandomReturn(
          params.marketReturn,
          params.marketVolatility
        );
        investment.balance *= 1 + (randomReturn - params.inflation);
      });
    });
  
    updateBalances(state);
  }
  
  function processInvestments(state, params) {
    // Calculate total desired contributions
    const desiredContributions = {
      taxable: params.contribution.taxable || 0,
      preTax: params.contribution.ira || 0,
      afterTax: params.contribution.roth || 0,
    };
  
    // Get current limits
    const limits = {
      preTax: state.inflationAdjustedContributionLimits.preTax,
      afterTax: state.inflationAdjustedContributionLimits.afterTax,
    };
  
    // Calculate total desired pre-tax and after-tax contributions
    const totalPreTax = desiredContributions.preTax;
    const totalAfterTax =
      desiredContributions.afterTax + desiredContributions.taxable;
  
    // Check if we exceed limits
    const preTaxExcess = Math.max(0, totalPreTax - limits.preTax);
    const afterTaxExcess = Math.max(0, totalAfterTax - limits.afterTax);
  
    // Calculate scaling factor if we exceed limits
    let scaleFactor = 1;
    if (preTaxExcess > 0 || afterTaxExcess > 0) {
      const preTaxScale = preTaxExcess > 0 ? limits.preTax / totalPreTax : 1;
      const afterTaxScale =
        afterTaxExcess > 0 ? limits.afterTax / totalAfterTax : 1;
      scaleFactor = Math.min(preTaxScale, afterTaxScale);
    }
  
    // Apply scaled contributions
    const scaledContributions = {
      taxable: desiredContributions.taxable * scaleFactor,
      preTax: desiredContributions.preTax * scaleFactor,
      afterTax: desiredContributions.afterTax * scaleFactor,
    };
  
    // Process taxable contributions
    if (scaledContributions.taxable > 0) {
      state.taxable.investments.push({
        balance: scaledContributions.taxable,
        purchaseYear: state.age,
        type: "stock",
        costBasis: scaledContributions.taxable,
      });
      state.taxable.costBasis += scaledContributions.taxable;
    }
  
    // Process pre-tax contributions
    if (scaledContributions.preTax > 0) {
      state.ira.investments.push({
        balance: scaledContributions.preTax,
        type: "pre-tax",
      });
      state.curYearPreTaxContribution += scaledContributions.preTax;
    }
  
    // Process after-tax contributions
    if (scaledContributions.afterTax > 0) {
      state.roth.investments.push({
        balance: scaledContributions.afterTax,
        type: "roth",
      });
      state.curYearAfterTaxContribution += scaledContributions.afterTax;
    }
  
    updateBalances(state);
  }
  
  function calculateRMD(state, params) {
    // First RMD is for age 73, paid in age 74
    if (state.age < 74) return 0;
  
    // Get the RMD distribution factor based on age
    const rmdFactor = getRMDFactor(state.age, state.rmdTable);
  
    // Calculate RMD based on previous year-end balances of pre-tax investments only
    // If this is the first year, we don't have previous year balances, so use current
    let preTaxBalance = 0;
  
    // Sum up all pre-tax investment balances
    state.investments.forEach((inv) => {
      if (inv.taxStatus === "pre-tax") {
        // Use previous year-end balance if available
        if (
          state.previousYearInvestmentBalances &&
          state.previousYearInvestmentBalances[inv.id]
        ) {
          preTaxBalance += state.previousYearInvestmentBalances[inv.id];
        } else {
          preTaxBalance += inv.balance;
        }
      }
    });
  
    // Calculate the required minimum distribution
    const rmdAmount = preTaxBalance / rmdFactor;
  
    // Process the RMD according to the specified strategy
    processRMDWithdrawal(state, rmdAmount, params);
  
    return rmdAmount;
  }
  
  // Add a helper function to track year-end balances
  function trackYearEndBalances(state) {
    // Initialize if not exists
    if (!state.previousYearInvestmentBalances) {
      state.previousYearInvestmentBalances = {};
    }
  
    // Store current balances to use next year
    state.investments.forEach((inv) => {
      state.previousYearInvestmentBalances[inv.id] = inv.balance;
    });
  }
  
  // Add to the end of each simulation year
  function projectFuture(state, params) {
    let tempState = deepCopy(state);
    for (let y = 0; y < params.projectionYears; y++) {
      tempState.age += 1;
      runIncomeEvents(tempState, params);
      if (tempState.age >= 72) calculateRMD(tempState, params);
      updateBalances(tempState);
      if (tempState.taxable.balance < 0) break;
    }
    // Track year-end balances before completing the year
    trackYearEndBalances(tempState);
  
    return (
      tempState.taxable.balance +
      tempState.roth.balance +
      tempState.ira.balance * (1 - params.conservativeTaxRate)
    );
  }
  
  // Helper function to process RMD withdrawals according to strategy
  function processRMDWithdrawal(state, rmdAmount, params) {
    if (rmdAmount <= 0) return;
  
    // Default strategy: Withdraw proportionally from all pre-tax investments
    if (!state.rmdStrategy || state.rmdStrategy.length === 0) {
      // Calculate total pre-tax balance
      const totalPreTaxBalance = state.investments
        .filter((inv) => inv.taxStatus === "pre-tax")
        .reduce((sum, inv) => sum + inv.balance, 0);
  
      if (totalPreTaxBalance <= 0) return;
  
      // Withdraw proportionally from each pre-tax investment
      state.investments.forEach((inv) => {
        if (inv.taxStatus === "pre-tax") {
          const portion = inv.balance / totalPreTaxBalance;
          const withdrawalAmount = rmdAmount * portion;
  
          // Reduce the investment balance
          inv.balance -= withdrawalAmount;
  
          // Add to cash and income
          state.cash += withdrawalAmount;
          state.curYearIncome += withdrawalAmount;
        }
      });
    } else {
      // Follow the specified RMD withdrawal strategy
      // ... implement strategy-based withdrawal ...
    }
  
    // Update total balances
    updateBalances(state);
  }
  
  // Add error handling class
  class SimulationError extends Error {
    constructor(message, state, year) {
      super(message);
      this.name = "SimulationError";
      this.state = state;
      this.year = year;
    }
  }
  
  // Add balance validation function - moved up before runSimulation
  function validateBalances(state) {
    if (state.taxable.balance < 0) {
      throw new SimulationError(
        `Taxable account balance cannot be negative: $${state.taxable.balance.toFixed(
          2
        )}`,
        state,
        state.age
      );
    }
    if (state.ira.balance < 0) {
      throw new SimulationError(
        `IRA balance cannot be negative: $${state.ira.balance.toFixed(2)}`,
        state,
        state.age
      );
    }
    if (state.roth.balance < 0) {
      throw new SimulationError(
        `Roth balance cannot be negative: $${state.roth.balance.toFixed(2)}`,
        state,
        state.age
      );
    }
    if (state.taxable.costBasis < 0) {
      throw new SimulationError(
        `Cost basis cannot be negative: $${state.taxable.costBasis.toFixed(2)}`,
        state,
        state.age
      );
    }
  }
  
  // Add investment validation function - moved up before runSimulation
  function validateInvestments(state) {
    state.taxable.investments.forEach((inv, index) => {
      if (inv.balance < 0) {
        throw new SimulationError(
          `Taxable investment ${index} has negative balance: $${inv.balance.toFixed(
            2
          )}`,
          state,
          state.age
        );
      }
      if (inv.costBasis < 0) {
        throw new SimulationError(
          `Taxable investment ${index} has negative cost basis: $${inv.costBasis.toFixed(
            2
          )}`,
          state,
          state.age
        );
      }
    });
  
    state.ira.investments.forEach((inv, index) => {
      if (inv.balance < 0) {
        throw new SimulationError(
          `IRA investment ${index} has negative balance: $${inv.balance.toFixed(
            2
          )}`,
          state,
          state.age
        );
      }
    });
  
    state.roth.investments.forEach((inv, index) => {
      if (inv.balance < 0) {
        throw new SimulationError(
          `Roth investment ${index} has negative balance: $${inv.balance.toFixed(
            2
          )}`,
          state,
          state.age
        );
      }
    });
  }
  
  // Helper function to validate the state - consolidated function
  function validateState(state) {
    // Validate all account balances
    validateBalances(state);
  
    // Validate all investments
    validateInvestments(state);
  
    // Validate that cash isn't extremely negative
    if (state.cash < -1000) {
      throw new SimulationError(
        `Cash balance is too negative: $${state.cash.toFixed(2)}`,
        state,
        state.age
      );
    }
  }
  
  // Add this function to ensure all investments have valid IDs
  function ensureInvestmentIds(state) {
    state.investments.forEach((inv, index) => {
      if (!inv.id) {
        // Create ID based on tax status and type if missing
        inv.id = `${inv.taxStatus || "unknown"}-${
          inv.type || "investment"
        }-${index}`;
      }
    });
  }
  
  // Call this at the beginning of each simulation year
  function prepareFiscalYear(state) {
    ensureInvestmentIds(state);
  
    // Ensure previousYearInvestmentBalances exists
    if (!state.previousYearInvestmentBalances) {
      state.previousYearInvestmentBalances = {};
  
      // Initialize with current balances for first year
      state.investments.forEach((inv) => {
        state.previousYearInvestmentBalances[inv.id] = inv.balance;
      });
    }
  }
  
  // Age-based glide path for asset allocation
  function getAgeBasedAssetAllocation(age) {
    // Simple rule: stocks percentage = 110 - age
    // This decreases equity exposure as you age
    const stockPercentage = Math.max(20, Math.min(90, 110 - age));
    const bondPercentage = 100 - stockPercentage;
  
    return {
      stock: stockPercentage / 100,
      bond: bondPercentage / 100,
    };
  }
  
  // Tax-efficient asset location
  function getTaxEfficientLocation(state, assetAllocation) {
    // Calculate total portfolio value
    const totalValue = state.investments.reduce(
      (sum, inv) => sum + inv.balance,
      0
    );
  
    // Define tax-efficiency preferences (higher = more tax-efficient)
    const taxEfficiency = {
      stock: 2, // More tax-efficient (growth, qualified dividends)
      bond: 1, // Less tax-efficient (interest income)
    };
  
    // Calculate target dollars for each asset type
    const targetDollars = {
      stock: totalValue * assetAllocation.stock,
      bond: totalValue * assetAllocation.bond,
    };
  
    // Calculate space in each account type
    const accountSpace = {
      "after-tax": state.investments
        .filter((inv) => inv.taxStatus === "after-tax")
        .reduce((sum, inv) => sum + inv.balance, 0),
      "pre-tax": state.investments
        .filter((inv) => inv.taxStatus === "pre-tax")
        .reduce((sum, inv) => sum + inv.balance, 0),
      "non-retirement": state.investments
        .filter((inv) => inv.taxStatus === "non-retirement")
        .reduce((sum, inv) => sum + inv.balance, 0),
    };
  
    // Target allocation by account and asset type
    const targetAllocation = {
      // Put stocks in Roth first, then taxable, then pre-tax
      "after-tax": {
        stock: Math.min(targetDollars.stock, accountSpace["after-tax"]),
        bond: 0,
      },
      // Put bonds in pre-tax first
      "pre-tax": {
        bond: Math.min(targetDollars.bond, accountSpace["pre-tax"]),
        stock: Math.max(
          0,
          accountSpace["pre-tax"] -
            Math.min(targetDollars.bond, accountSpace["pre-tax"])
        ),
      },
      // Use taxable for overflow
      "non-retirement": {
        stock: Math.max(
          0,
          targetDollars.stock -
            targetAllocation["after-tax"].stock -
            targetAllocation["pre-tax"].stock
        ),
        bond: Math.max(0, targetDollars.bond - targetAllocation["pre-tax"].bond),
      },
    };
  
    return targetAllocation;
  }
  
  function createTaxEfficientRebalanceEvent(state) {
    const assetAllocation = getAgeBasedAssetAllocation(state.age);
    const targetAllocation = getTaxEfficientLocation(state, assetAllocation);
  
    // Create a rebalance event for each account type
    ["after-tax", "pre-tax", "non-retirement"].forEach((accountType) => {
      state.eventSeries.push({
        id: `rebalance-${accountType}-${state.age}`,
        type: "rebalance",
        startYear: new Date().getFullYear(),
        duration: 1,
        frequency: 1,
        accountTaxStatus: accountType,
        assetAllocation: {
          stock:
            (targetAllocation[accountType].stock /
              (targetAllocation[accountType].stock +
                targetAllocation[accountType].bond || 1)) *
            100,
          bond:
            (targetAllocation[accountType].bond /
              (targetAllocation[accountType].stock +
                targetAllocation[accountType].bond || 1)) *
            100,
        },
      });
    });
  }
  
  // Update runSimulation to handle errors
  function runSimulation(initialState, params, taxBrackets) {
    let state = deepCopy(initialState);
    let history = [];
    let error = null;
  
    try {
      initializeMarriedStatus(state, params);
      // Initialize previous year values
      state.previousYearIncome = state.income;
      state.previousYearSS = 0;
      state.previousYearGains = 0;
      state.previousYearEarlyWithdrawals = 0;
  
      for (let year = 0; year < params.years; year++) {
        const currentYear = new Date().getFullYear() + year;
  
        try {
          state.age += 1;
  
          // Step 0: Preliminaries
          // Check for spouse death status changes
          if (state.isMarried && !state.spouseDeceased) {
            // Check for spouse death based on mortality tables or user input
            if (shouldProcessSpouseDeath(state, params, currentYear)) {
              handleSpouseDeath(state);
            }
          }
  
          // Sample inflation rate if using probability distribution
          const currentInflation = generateRandomReturn(
            params.inflation,
            params.inflationVolatility || 0.01
          );
  
          // Update inflation-adjusted values
          updateInflationAdjustedValues(state, currentInflation);
  
          // Apply inflation to expenses - FIX #2
          applyInflation(state, currentInflation);
  
          // Step 1: Run income events
          processEventSeries(state, currentYear);
          processSocialSecurity(state);
  
          state.yearsUntilRetirement > 0;
  
          // Step 2: Process Roth conversions
          if (!state.isDeceased) {
            processRothConversion(state, params);
          }
  
          // Step 3: Process RMDs (after Roth conversion)
          prepareFiscalYear(state);
          if (state.age >= 74 && !state.isDeceased) {
            calculateRMD(state, params);
          }
  
          // Step 4: Update investment values
          updateInvestmentValues(state, params);
  
          // Step 5: Pay non-discretionary expenses and taxes
          handleWithdrawals(state, params);
  
          // Step 6: Pay discretionary expenses
          // (Already handled in handleWithdrawals)
  
          // Step 7: Invest excess cash
          processInvestEvents(state, currentYear);
  
          investExcessCash(state, params);
  
          // Step 8: Rebalance if scheduled
          processRebalanceEvents(state, currentYear);
          // Add after Step 8 in simulation loop
          if (
            params.useTaxEfficientRebalancing &&
            state.age % params.rebalanceFrequency === 0
          ) {
            createTaxEfficientRebalanceEvent(state);
          }
  
          // FIX #1: Update income before it's reset
          state.income = state.curYearIncome;
          // Calculate current year's taxes (to be paid next year)
          calculateTaxes(state, state.inflationAdjustedTaxBrackets);
  
          updateBalances(state);
          validateState(state);
  
          // Step 9: Track year-end balances
          trackYearEndBalances(state);
  
          history.push(deepCopy(state));
        } catch (err) {
          if (err instanceof SimulationError) {
            error = err;
            break;
          }
          throw err;
        }
      }
    } catch (err) {
      console.error("Simulation failed:", err.message);
      throw err;
    }
  
    return { history, error };
  }
  
  const initialState = new FinancialState(
    65, // age
    500000, // taxable account: $500k (cost basis $500k)
    300000, // IRA: $300k (pre-tax)
    100000, // Roth: $100k
    0, // initial annual income (retired)
    36000, // annual expenses ($36k = 4% of $900k total)
    0.22, // initial tax rate (will use progressive brackets)
    0 // years until retirement (already retired)
  );
  
  // Define progressive tax brackets (2023 single-filer)
  const taxBrackets = [
    { lower: 0, upper: 11000, rate: 0.1 },
    { lower: 11001, upper: 44725, rate: 0.12 },
    { lower: 44726, upper: 95375, rate: 0.22 },
    { lower: 95376, upper: Infinity, rate: 0.24 },
  ];
  
  // Add Monte Carlo simulation parameters
  const params = {
    years: 30,
    inflation: 0.03,
    marketReturn: 0.05,
    marketVolatility: 0.15, // Standard deviation of returns (15% is typical for stocks)
    dividendYield: 0.015,
    capitalGainsTaxRate: 0.15,
    IRS_investment_limit: 0,
    targetAllocation: { taxable: 0.5, ira: 0.3, roth: 0.2 },
    maxConversion: 25000,
    conversionStep: 1000,
    projectionYears: 10,
    riskFreeRate: 0.03,
    conservativeTaxRate: 0.22,
    contribution: {
      taxable: 0,
      ira: 0,
      roth: 0,
    },
    monteCarloRuns: 1000, // Number of Monte Carlo simulations to run
    goalTolerance: 0.1, // Allow 10% deviation from financial goal
    rebalanceFrequency: 1, // Rebalance annually
    rmdTable: {
      updateFrequency: "yearly", // How often to update the RMD table
      source: "irs", // Source of RMD table data
      fallbackTable: getLatestRMDFactors(), // Fallback table if API fetch fails
    },
  };
  
  // Add Monte Carlo helper functions
  function generateRandomReturn(expectedReturn, volatility) {
    // Box-Muller transform for normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return expectedReturn + z * volatility;
  }
  
  function runMonteCarloSimulation(initialState, params, taxBrackets) {
    const results = [];
    const errors = [];
  
    for (let run = 0; run < params.monteCarloRuns; run++) {
      try {
        const { history, error } = runSimulation(
          initialState,
          params,
          taxBrackets
        );
        if (error) {
          errors.push(error);
        } else {
          results.push(history);
        }
      } catch (err) {
        errors.push(err);
      }
    }
  
    return { results, errors };
  }
  
  // Update statistics calculation to handle failed runs
  function calculateStatistics(simulationResults) {
    const { results, errors } = simulationResults;
  
    console.log(`\nSimulation completed with ${errors.length} failed runs`);
    if (errors.length > 0) {
      console.log("Error summary:");
      errors.forEach((err, index) => {
        console.log(`Run ${index + 1}: ${err.message} at age ${err.year}`);
      });
    }
  
    if (results.length === 0) {
      return {
        mean: 0,
        median: 0,
        p10: 0,
        p90: 0,
        successRate: 0,
      };
    }
  
    const finalValues = results.map((run) => {
      const finalState = run[run.length - 1];
      return (
        finalState.taxable.balance +
        finalState.ira.balance +
        finalState.roth.balance
      );
    });
  
    const mean = finalValues.reduce((a, b) => a + b, 0) / finalValues.length;
    const sorted = finalValues.sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const p10 = sorted[Math.floor(sorted.length * 0.1)];
    const p90 = sorted[Math.floor(sorted.length * 0.9)];
    const successRate = results.length / (results.length + errors.length);
  
    return {
      mean,
      median,
      p10,
      p90,
      successRate,
    };
  }
  
  // Run Monte Carlo simulation
  const monteCarloResults = runMonteCarloSimulation(
    initialState,
    params,
    taxBrackets
  );
  const stats = calculateStatistics(monteCarloResults);
  
  // Output Monte Carlo results
  console.log("\nMonte Carlo Simulation Results:");
  console.log(`Number of runs: ${params.monteCarloRuns}`);
  console.log(`Mean final value: $${stats.mean.toFixed(2)}`);
  console.log(`Median final value: $${stats.median.toFixed(2)}`);
  console.log(`10th percentile: $${stats.p10.toFixed(2)}`);
  console.log(`90th percentile: $${stats.p90.toFixed(2)}`);
  
  // 4. Run the simulation and extract history
  const simulationResult = runSimulation(initialState, params, taxBrackets);
  const simulationHistory = simulationResult.history || [];
  
  // 5. Output the simulation results.
  console.log("Simulation History over", params.years, "years:");
  if (simulationResult.error) {
    console.log(
      "Simulation ended early due to error:",
      simulationResult.error.message
    );
  }
  
  if (simulationHistory.length > 0) {
    simulationHistory.forEach((state, index) => {
      console.log(`Year ${index + 1} (Age ${state.age}):`);
      console.log(
        `  Total Assets: $${(
          state.taxable.balance +
          state.ira.balance +
          state.roth.balance
        ).toFixed(2)}`
      );
      console.log(`  Taxable: $${state.taxable.balance.toFixed(2)}`);
      console.log(`  IRA: $${state.ira.balance.toFixed(2)}`);
      console.log(`  Roth: $${state.roth.balance.toFixed(2)}`);
      console.log(`  Annual Income: $${state.income.toFixed(2)}`);
      console.log(
        `  Annual Expenses: $${(
          state.expenses.nonDiscretionary + state.expenses.discretionary
        ).toFixed(2)}`
      );
  
      // FIX #3: Add tax reporting
      console.log(`  Taxes Paid: $${(state.previousYearTaxDue || 0).toFixed(2)}`);
  
      console.log("---");
    });
  } else {
    console.log("No simulation history available.");
  }
  
  // Add mortality rate calculation
  function calculateMortalityRate(age) {
    // Simplified mortality rate calculation based on actuarial tables
    // This is a basic approximation - in practice, you'd want to use actual actuarial tables
    const baseRate = 0.01; // 1% base rate
    const ageFactor = Math.pow(1.1, age - 65); // 10% increase per year after 65
    return Math.min(0.95, baseRate * ageFactor); // Cap at 95%
  }
  
  // Add state tax bracket definitions
  const STATE_TAX_BRACKETS = {
    // Example states with different tax structures
    CA: {
      name: "California",
      brackets: [
        { lower: 0, upper: 10099, rate: 0.01 },
        { lower: 10100, upper: 23942, rate: 0.02 },
        { lower: 23943, upper: 37788, rate: 0.04 },
        { lower: 37789, upper: 52455, rate: 0.06 },
        { lower: 52456, upper: 66295, rate: 0.08 },
        { lower: 66296, upper: 338639, rate: 0.093 },
        { lower: 338640, upper: 406364, rate: 0.103 },
        { lower: 406365, upper: 677275, rate: 0.113 },
        { lower: 677276, upper: Infinity, rate: 0.123 },
      ],
      capitalGainsBrackets: [
        { lower: 0, upper: 10099, rate: 0.01 },
        { lower: 10100, upper: 23942, rate: 0.02 },
        { lower: 23943, upper: 37788, rate: 0.04 },
        { lower: 37789, upper: 52455, rate: 0.06 },
        { lower: 52456, upper: 66295, rate: 0.08 },
        { lower: 66296, upper: 338639, rate: 0.093 },
        { lower: 338640, upper: 406364, rate: 0.103 },
        { lower: 406365, upper: 677275, rate: 0.113 },
        { lower: 677276, upper: Infinity, rate: 0.123 },
      ],
      standardDeduction: 5202,
    },
    NY: {
      name: "New York",
      brackets: [
        { lower: 0, upper: 8500, rate: 0.04 },
        { lower: 8501, upper: 11700, rate: 0.045 },
        { lower: 11701, upper: 13900, rate: 0.0525 },
        { lower: 13901, upper: 80650, rate: 0.055 },
        { lower: 80651, upper: 215400, rate: 0.06 },
        { lower: 215401, upper: 1077550, rate: 0.0685 },
        { lower: 1077551, upper: Infinity, rate: 0.0882 },
      ],
      capitalGainsBrackets: [
        { lower: 0, upper: 8500, rate: 0.04 },
        { lower: 8501, upper: 11700, rate: 0.045 },
        { lower: 11701, upper: 13900, rate: 0.0525 },
        { lower: 13901, upper: 80650, rate: 0.055 },
        { lower: 80651, upper: 215400, rate: 0.06 },
        { lower: 215401, upper: 1077550, rate: 0.0685 },
        { lower: 1077551, upper: Infinity, rate: 0.0882 },
      ],
      standardDeduction: 8000,
    },
    TX: {
      name: "Texas",
      brackets: [
        { lower: 0, upper: Infinity, rate: 0.0 }, // No state income tax
      ],
      capitalGainsBrackets: [
        { lower: 0, upper: Infinity, rate: 0.0 }, // No state capital gains tax
      ],
      standardDeduction: 0,
    },
  };
  
  function applyInflation(state, inflationRate) {
    // Apply inflation to expenses
    state.expenses.nonDiscretionary *= 1 + inflationRate;
    state.expenses.discretionary *= 1 + inflationRate;
  
    // Apply inflation to state standard deduction
    state.stateStandardDeduction *= 1 + inflationRate;
  
    // Update contribution limits for inflation
    state.inflationAdjustedContributionLimits.preTax *= 1 + inflationRate;
    state.inflationAdjustedContributionLimits.afterTax *= 1 + inflationRate;
  }
  
  // Invest excess cash according to target allocation
  function investExcessCash(state, params) {
    // Define threshold for excess cash - keep 3 months of expenses as buffer
    const expensesPerMonth =
      (state.expenses.nonDiscretionary + state.expenses.discretionary) / 12;
    const cashBuffer = expensesPerMonth * 3; // 3 months of expenses as buffer
  
    // Calculate excess cash above buffer
    const excessCash = Math.max(0, state.cash - cashBuffer);
  
    if (excessCash <= 0) return; // No excess cash to invest
  
    // Calculate total current allocation
    const total =
      state.taxable.balance + state.ira.balance + state.roth.balance + state.cash;
    if (total <= 0) return;
  
    // Calculate target allocations
    const targetTaxable = total * params.targetAllocation.taxable;
    const targetIRA = total * params.targetAllocation.ira;
    const targetRoth = total * params.targetAllocation.roth;
  
    // Calculate current allocations
    const currentTaxable = Math.max(0, state.taxable.balance);
    const currentIRA = Math.max(0, state.ira.balance);
    const currentRoth = Math.max(0, state.roth.balance);
  
    // Calculate deficits (how much each account needs to reach target)
    const deficits = {
      taxable:
        targetTaxable > currentTaxable ? targetTaxable - currentTaxable : 0,
      ira: targetIRA > currentIRA ? targetIRA - currentIRA : 0,
      roth: targetRoth > currentRoth ? targetRoth - currentRoth : 0,
    };
  
    // Calculate total deficit
    const totalDeficit = deficits.taxable + deficits.ira + deficits.roth;
  
    // If no deficit, invest all in taxable (least restrictive)
    if (totalDeficit <= 0) {
      // Add all excess cash to taxable
      state.taxable.investments.push({
        balance: excessCash,
        purchaseYear: state.age,
        type: "stock", // Default to stock
        costBasis: excessCash,
      });
  
      state.cash -= excessCash;
      return;
    }
  
    // Distribute excess cash proportionally to deficits
    let remainingCash = excessCash;
  
    // First, try to fill IRA deficit - check contribution limits
    if (deficits.ira > 0 && state.yearsUntilRetirement > 0) {
      const iraLimit = state.inflationAdjustedContributionLimits.preTax;
      const availableIraLimit = iraLimit - state.curYearPreTaxContribution;
      const iraAllocation = Math.min(
        (deficits.ira / totalDeficit) * excessCash,
        deficits.ira,
        availableIraLimit
      );
  
      if (iraAllocation > 0) {
        state.ira.investments.push({
          balance: iraAllocation,
          type: "pre-tax",
          purchaseYear: state.age,
        });
  
        // Update contribution tracker for IRA
        state.curYearPreTaxContribution += iraAllocation;
        remainingCash -= iraAllocation;
      }
    }
  
    // Next, try to fill Roth deficit - check contribution limits
    if (
      deficits.roth > 0 &&
      state.yearsUntilRetirement > 0 &&
      remainingCash > 0
    ) {
      const rothLimit = state.inflationAdjustedContributionLimits.afterTax;
      const availableRothLimit = rothLimit - state.curYearAfterTaxContribution;
      const rothAllocation = Math.min(
        (deficits.roth / totalDeficit) * excessCash,
        deficits.roth,
        availableRothLimit,
        remainingCash
      );
  
      if (rothAllocation > 0) {
        state.roth.investments.push({
          balance: rothAllocation,
          type: "roth",
          purchaseYear: state.age,
        });
  
        // Update contribution tracker for Roth
        state.curYearAfterTaxContribution += rothAllocation;
        remainingCash -= rothAllocation;
      }
    }
  
    // Lastly, put any remaining cash into taxable (no contribution limits)
    if (deficits.taxable > 0 && remainingCash > 0) {
      const taxableAllocation = Math.min(remainingCash, deficits.taxable);
  
      if (taxableAllocation > 0) {
        state.taxable.investments.push({
          balance: taxableAllocation,
          purchaseYear: state.age,
          type: "stock",
          costBasis: taxableAllocation,
        });
  
        remainingCash -= taxableAllocation;
      }
    }
  
    // If we still have excess cash but no deficits in target allocation,
    // put remaining cash into taxable (most flexible)
    if (remainingCash > 0) {
      state.taxable.investments.push({
        balance: remainingCash,
        purchaseYear: state.age,
        type: "stock",
        costBasis: remainingCash,
      });
  
      remainingCash = 0;
    }
  
    // Update cash balance
    state.cash -= excessCash - remainingCash;
  
    // Update all account balances
    updateBalances(state);
  }
  
  // Update investment values (returns, reinvestment, expense subtraction)
  function updateInvestmentValues(state, params) {
    // Skip if deceased
    if (state.isDeceased) return;
  
    // Process taxable account returns
    state.taxable.investments.forEach((investment) => {
      // Calculate dividends
      const dividends = investment.balance * params.dividendYield;
  
      // Add dividends to current year income for tax purposes
      state.curYearIncome += dividends;
  
      // Generate random investment return
      const randomReturn = generateRandomReturn(
        params.marketReturn,
        params.marketVolatility
      );
  
      // Apply market return to principal (excluding dividends)
      const capitalAppreciation =
        investment.balance * (randomReturn - params.dividendYield);
      investment.balance += capitalAppreciation;
  
      // Reinvest dividends in the same investment (after taxes will be handled at year-end)
      investment.balance += dividends;
      investment.costBasis += dividends; // Update cost basis for reinvested dividends
    });
  
    // Process IRA returns (tax-free growth)
    state.ira.investments.forEach((investment) => {
      // Calculate dividends (tax-deferred growth)
      const dividends = investment.balance * params.dividendYield;
  
      // Generate random investment return
      const randomReturn = generateRandomReturn(
        params.marketReturn,
        params.marketVolatility
      );
  
      // Apply market return to principal (excluding dividends)
      const capitalAppreciation =
        investment.balance * (randomReturn - params.dividendYield);
      investment.balance += capitalAppreciation;
  
      // In retirement accounts, dividends are automatically reinvested
      investment.balance += dividends;
    });
  
    // Process Roth returns (tax-free growth and withdrawals)
    state.roth.investments.forEach((investment) => {
      // Calculate dividends (tax-free growth)
      const dividends = investment.balance * params.dividendYield;
  
      // Generate random investment return
      const randomReturn = generateRandomReturn(
        params.marketReturn,
        params.marketVolatility
      );
  
      // Apply market return to principal (excluding dividends)
      const capitalAppreciation =
        investment.balance * (randomReturn - params.dividendYield);
      investment.balance += capitalAppreciation;
  
      // In retirement accounts, dividends are automatically reinvested
      investment.balance += dividends;
    });
  
    // Update all account balances
    updateBalances(state);
  }
  
  // Update inflation-adjusted values for tax brackets and contribution limits
  function updateInflationAdjustedValues(state, inflationRate) {
    // Store current year's values as previous year's values
    state.previousYearTaxBrackets = deepCopy(state.inflationAdjustedTaxBrackets);
    state.previousYearContributionLimits = deepCopy(
      state.inflationAdjustedContributionLimits
    );
    state.previousYearStateTaxBrackets = deepCopy(state.stateTaxBrackets);
    state.previousYearStateCapitalGainsBrackets = deepCopy(
      state.stateCapitalGainsBrackets
    );
    state.previousYearFederalCapitalGainsBrackets = deepCopy(
      state.federalCapitalGainsBrackets
    );
  
    // If this is the first year, initialize with base values
    if (!state.inflationAdjustedTaxBrackets) {
      state.inflationAdjustedTaxBrackets = deepCopy(taxBrackets);
    }
  
    // Update inflation-adjusted tax brackets
    if (state.inflationAdjustedTaxBrackets) {
      state.inflationAdjustedTaxBrackets.forEach((bracket) => {
        if (bracket.upper !== Infinity) {
          bracket.upper *= 1 + inflationRate;
        }
        bracket.lower *= 1 + inflationRate;
      });
    }
  
    // Update inflation-adjusted contribution limits
    state.inflationAdjustedContributionLimits.preTax *= 1 + inflationRate;
    state.inflationAdjustedContributionLimits.afterTax *= 1 + inflationRate;
  
    // Update state tax brackets for inflation
    state.stateTaxBrackets.forEach((bracket) => {
      if (bracket.upper !== Infinity) {
        bracket.upper *= 1 + inflationRate;
      }
      bracket.lower *= 1 + inflationRate;
    });
  
    // Update state capital gains brackets for inflation
    state.stateCapitalGainsBrackets.forEach((bracket) => {
      if (bracket.upper !== Infinity) {
        bracket.upper *= 1 + inflationRate;
      }
      bracket.lower *= 1 + inflationRate;
    });
  
    // Update federal capital gains brackets for inflation
    state.federalCapitalGainsBrackets.forEach((bracket) => {
      if (bracket.upper !== Infinity) {
        bracket.upper *= 1 + inflationRate;
      }
      bracket.lower *= 1 + inflationRate;
    });
  
    // Track current inflation rate
    state.inflationRate = inflationRate;
  }
  
  // Process income events (separate from investment returns)
  function processIncomeEvents(state, params) {
    // Skip if deceased
    if (state.isDeceased) return;
  
    // Add Social Security income to cash
    if (state.socialSecurity.isStarted) {
      const annualBenefit = state.socialSecurity.monthlyBenefit * 12;
      state.cash += annualBenefit;
      state.curYearSS = annualBenefit;
    }
  
    // Process income events according to spec (Req 2.3)
    for (const event of state.incomeEvents) {
      // Check if event is active for current age
      if (
        event.startAge <= state.age &&
        (event.endAge === undefined || event.endAge >= state.age) &&
        (!event.userOnly || !state.isDeceased) &&
        (!event.spouseOnly || !state.spouseDeceased)
      ) {
        // Start with base amount
        let baseAmount = event.baseAmount || 0;
  
        // Apply annual changes if applicable
        if (event.annualChange) {
          const yearsActive = state.age - event.startAge;
  
          if (event.annualChangeType === "percent") {
            // Compound growth
            baseAmount *= Math.pow(1 + event.annualChange, yearsActive);
          } else {
            // Fixed amount increase
            baseAmount += event.annualChange * yearsActive;
          }
        }
  
        // Apply inflation adjustment if specified
        if (event.inflationAdjusted) {
          baseAmount *= Math.pow(
            1 + state.inflationRate,
            state.age - event.startAge
          );
        }
  
        // Calculate amounts for user and spouse separately
        let amount = 0;
  
        // Handle user and spouse percentages correctly as separate components
        if (
          event.userPercent !== undefined &&
          event.spousePercent !== undefined
        ) {
          // Both percentages defined - treat as separate amounts
          if (!state.isDeceased && event.userPercent > 0) {
            // Add user's portion if user is alive
            amount += baseAmount * event.userPercent;
          }
  
          if (!state.spouseDeceased && event.spousePercent > 0) {
            // Add spouse's portion if spouse is alive
            amount += baseAmount * event.spousePercent;
          }
        } else if (event.userPercent !== undefined) {
          // Only user percentage defined
          if (!state.isDeceased) {
            amount = baseAmount * event.userPercent;
          } else {
            amount = 0; // User deceased, no income
          }
        } else if (event.spousePercent !== undefined) {
          // Only spouse percentage defined
          if (!state.spouseDeceased) {
            amount = baseAmount * event.spousePercent;
          } else {
            amount = 0; // Spouse deceased, no income
          }
        } else {
          // No percentages specified, use full amount
          amount = baseAmount;
        }
  
        // Apply stochastic variation if specified
        if (event.stochasticType && event.stochasticParam && amount > 0) {
          if (event.stochasticType === "normal") {
            // Normal distribution variation
            const stdDev = event.stochasticParam * amount;
            const variation = generateRandomReturn(0, stdDev);
            amount *= 1 + variation;
          } else if (event.stochasticType === "uniform") {
            // Uniform distribution variation
            const range = event.stochasticParam * amount;
            const variation = (Math.random() * 2 - 1) * range;
            amount *= 1 + variation;
          }
        }
  
        // Add to cash
        state.cash += amount;
  
        // Update income for tax purposes if not pre-tax
        if (!event.preTax && amount > 0) {
          state.curYearIncome += amount;
        }
      }
    }
  }
  
  // Process Social Security benefits
  function processSocialSecurity(state) {
    // Skip if deceased
    if (state.isDeceased) return;
  
    // Check if we should start Social Security benefits
    if (
      !state.socialSecurity.isStarted &&
      state.age >= state.socialSecurity.startAge
    ) {
      state.socialSecurity.isStarted = true;
  
      // Apply delayed retirement credits if applicable (8% per year after FRA up to age 70)
      const fullRetirementAge = 67; // Default FRA for most current workers
      if (state.age > fullRetirementAge && state.age <= 70) {
        const delayYears = state.age - fullRetirementAge;
        const delayCredit = 0.08 * delayYears; // 8% per year
        state.socialSecurity.monthlyBenefit *= 1 + delayCredit;
      }
  
      // Apply early retirement reduction if applicable (about 5/9% per month before FRA)
      if (state.age < fullRetirementAge) {
        const earlyMonths = (fullRetirementAge - state.age) * 12;
        let reductionRate = 0;
  
        // First 36 months: 5/9% per month (6.67% per year)
        if (earlyMonths <= 36) {
          reductionRate = (earlyMonths * (5 / 9)) / 100;
        } else {
          // First 36 months at 5/9% per month
          reductionRate = (36 * (5 / 9)) / 100;
          // Additional months at 5/12% per month (5% per year)
          reductionRate += ((earlyMonths - 36) * (5 / 12)) / 100;
        }
  
        state.socialSecurity.monthlyBenefit *= 1 - reductionRate;
      }
    }
  
    // Process survivor benefits if applicable (when one spouse dies)
    if (
      state.isDeceased &&
      !state.spouseDeceased &&
      !state.socialSecurity.isSpouseBenefit
    ) {
      // Calculate survivor benefit (typically the higher of the two benefits)
      const survivorBenefit =
        state.socialSecurity.primaryInsuranceAmount *
        state.socialSecurity.survivorBenefitMultiplier;
  
      // Only switch to survivor benefit if it's higher than current benefit
      if (survivorBenefit > state.socialSecurity.monthlyBenefit) {
        state.socialSecurity.monthlyBenefit = survivorBenefit;
        state.socialSecurity.isSpouseBenefit = true;
      }
  
      // When one spouse dies, change filing status to single
      if (!state.isDeceased || !state.spouseDeceased) {
        state.filingStatus = "single";
      }
    }
  
    // Calculate taxable portion of Social Security using the IRS rules
    if (state.socialSecurity.isStarted) {
      const annualSS = state.socialSecurity.monthlyBenefit * 12;
  
      // Use the proper IRS calculation
      const taxableSS = calculateTaxableSocialSecurity(
        annualSS,
        state.curYearIncome
      );
  
      // Calculate the percentage for tracking
      state.ssTaxablePercentage = annualSS > 0 ? taxableSS / annualSS : 0;
  
      // Add Social Security income to cash
      state.cash += annualSS;
      state.curYearSS = annualSS;
    }
  }
  
  // Calculate taxes based on income and capital gains
  function calculateTaxes(state, taxBrackets) {
    // Use inflation adjusted brackets if available
    const brackets = state.inflationAdjustedTaxBrackets || taxBrackets;
  
    // Calculate income subject to tax
    let taxableIncome = state.curYearIncome;
  
    // Add taxable portion of Social Security
    if (state.socialSecurity.isStarted) {
      const annualSS = state.socialSecurity.monthlyBenefit * 12;
      const taxableSS = annualSS * state.ssTaxablePercentage;
      taxableIncome += taxableSS;
    }
  
    // Apply standard deduction (inflation adjusted)
    // const federalStandardDeduction =
    //   13850 * Math.pow(1 + state.inflationRate, state.age - 65);
    // taxableIncome = Math.max(0, taxableIncome - federalStandardDeduction);
  
    // Apply standard deduction based on filing status (2024 values)
    let federalStandardDeduction;
    switch (state.filingStatus) {
      case "married-joint":
      case "qualifying-widow":
        federalStandardDeduction = 29200;
        // Add senior addition if applicable (2024: $1,550 per spouse over 65)
        if (state.age >= 65) federalStandardDeduction += 1550;
        if (
          state.isMarried &&
          !state.spouseDeceased &&
          (state.spouseAge || state.age) >= 65
        )
          federalStandardDeduction += 1550;
        break;
      case "head-of-household":
        federalStandardDeduction = 21900;
        // Add senior addition if applicable (2024: $1,950 for HoH over 65)
        if (state.age >= 65) federalStandardDeduction += 1950;
        break;
      case "married-separate":
      case "single":
      default:
        federalStandardDeduction = 14600;
        // Add senior addition if applicable (2024: $1,950 for single over 65)
        if (state.age >= 65) federalStandardDeduction += 1950;
    }
  
    // Apply inflation adjustment from base year (2024)
    const baseYear = 2024;
    const yearsOfInflation = Math.max(0, new Date().getFullYear() - baseYear);
    if (yearsOfInflation > 0) {
      federalStandardDeduction *= Math.pow(
        1 + state.inflationRate,
        yearsOfInflation
      );
    }
  
    taxableIncome = Math.max(0, taxableIncome - federalStandardDeduction);
    // Calculate federal income tax on ordinary income
    let federalIncomeTax = calculateProgressiveTax(taxableIncome, brackets);
  
    // Calculate capital gains tax
    let capitalGainsTax = calculateCapitalGainsTax(
      state.curYearGains,
      state.federalCapitalGainsBrackets
    );
  
    // Calculate state income tax
    let stateIncomeTaxableIncome = Math.max(
      0,
      state.curYearIncome - state.stateStandardDeduction
    );
    let stateIncomeTax = calculateProgressiveTax(
      stateIncomeTaxableIncome,
      state.stateTaxBrackets
    );
  
    // Calculate state capital gains tax
    let stateCapitalGainsTax = calculateProgressiveTax(
      state.curYearGains,
      state.stateCapitalGainsBrackets
    );
  
    // Calculate early withdrawal penalty if applicable
    let earlyWithdrawalPenalty = state.curYearEarlyWithdrawals * 0.1;
  
    // Calculate taxable portion of social security benefits
    if (state.curYearSS > 0) {
      // Calculate other income (all income except social security)
      const otherIncome = state.curYearIncome - state.curYearSS;
  
      // Determine taxable portion of social security
      const taxableSS = calculateTaxableSocialSecurity(
        state.curYearSS,
        otherIncome
      );
  
      // Adjust current year income to include taxable social security
      state.curYearIncome = otherIncome + taxableSS;
      state.ssTaxablePercentage = taxableSS / state.curYearSS;
    }
  
    // Continue with tax calculation using adjusted income
    // Total tax due
    const totalTaxDue =
      federalIncomeTax +
      capitalGainsTax +
      stateIncomeTax +
      stateCapitalGainsTax +
      earlyWithdrawalPenalty;
  
    // Update state for next year
    state.curYearTaxDue = totalTaxDue;
    state.previousYearTaxDue = state.curYearTaxDue;
    state.previousYearIncome = state.curYearIncome;
    state.previousYearSS = state.curYearSS;
    state.previousYearGains = state.curYearGains;
    state.previousYearEarlyWithdrawals = state.curYearEarlyWithdrawals;
  
    // Reset current year trackers for next year
    state.curYearIncome = 0;
    state.curYearSS = 0;
    state.curYearGains = 0;
    state.curYearEarlyWithdrawals = 0;
    state.curYearPreTaxContribution = 0;
    state.curYearAfterTaxContribution = 0;
  
    return totalTaxDue;
  }
  
  // Calculate tax using progressive brackets
  function calculateProgressiveTax(amount, brackets) {
    if (amount <= 0) return 0;
  
    let tax = 0;
    let remaining = amount;
  
    for (const bracket of brackets) {
      if (remaining <= 0) break;
  
      const lower = bracket.lower;
      const upper = bracket.upper;
      const rate = bracket.rate;
  
      // Calculate amount taxed in this bracket
      const taxableInBracket = Math.min(remaining, upper - lower);
  
      // Add tax for this bracket
      tax += taxableInBracket * rate;
  
      // Reduce remaining amount
      remaining -= taxableInBracket;
    }
  
    return tax;
  }
  
  // Calculate capital gains tax
  function calculateCapitalGainsTax(gains, capitalGainsBrackets) {
    if (gains <= 0) return 0;
  
    // Use progressive capital gains brackets
    return calculateProgressiveTax(gains, capitalGainsBrackets);
  }
  
  // New function to process event series
  function processEventSeries(state, currentYear) {
    for (const series of state.eventSeries) {
      // Skip if not active this year
      if (
        currentYear < series.startYear ||
        currentYear > series.startYear + series.duration - 1
      ) {
        continue;
      }
  
      // Process based on event type
      switch (series.type) {
        case "income":
          processIncomeEventSeries(state, series, currentYear);
          break;
        case "expense":
          processExpenseEventSeries(state, series, currentYear);
          break;
        case "invest":
          processInvestEventSeries(state, series, currentYear);
          break;
        case "rebalance":
          processRebalanceEventSeries(state, series, currentYear);
          break;
      }
    }
  }
  
  // Process income event series
  function processIncomeEventSeries(state, series, currentYear) {
    // Skip if deceased and event is only for living person
    if (state.isDeceased && !series.continueAfterDeath) return;
  
    // Check if this series starts after another event series ends
    if (series.startAfterEventSeriesId) {
      const dependentSeries = state.eventSeries.find(
        (s) => s.id === series.startAfterEventSeriesId
      );
      if (dependentSeries) {
        const dependentSeriesEndYear =
          dependentSeries.startYear + dependentSeries.duration;
        if (currentYear < dependentSeriesEndYear) {
          return; // Skip this event as the dependent series hasn't ended yet
        }
      }
    }
  
    // Calculate years into the series
    const yearsActive = currentYear - series.startYear;
  
    // Calculate base amount with growth if applicable
    let amount = series.baseAmount;
  
    // Apply growth if specified
    if (series.growthRate && yearsActive > 0) {
      // Compound growth
      amount *= Math.pow(1 + series.growthRate, yearsActive);
    }
  
    // Apply inflation adjustment if specified
    if (series.inflationAdjusted) {
      amount *= Math.pow(1 + state.inflationRate, yearsActive);
    }
  
    // Apply stochastic variation if specified
    if (series.stochastic) {
      if (series.stochasticType === "normal" && series.stochasticParam) {
        // Normal distribution variation
        // stochasticParam represents standard deviation as a fraction of the amount
        const stdDev = series.stochasticParam * amount;
        const variation = generateRandomReturn(0, stdDev);
        amount *= 1 + variation;
      } else if (series.stochasticType === "uniform" && series.stochasticParam) {
        // Uniform distribution variation
        // stochasticParam represents the range as a fraction of the amount
        const range = series.stochasticParam * amount;
        const variation = (Math.random() * 2 - 1) * range; // Random between -range and +range
        amount = Math.max(0, amount + variation); // Ensure amount doesn't go negative
      }
    }
  
    // Track maximum cash values if specified
    if (series.trackMaxCash) {
      if (!state.maxCashValues) {
        state.maxCashValues = {};
      }
  
      if (!state.maxCashValues[series.id]) {
        state.maxCashValues[series.id] = 0;
      }
  
      state.maxCashValues[series.id] = Math.max(
        state.maxCashValues[series.id],
        state.cash + amount
      );
    }
  
    // Add to cash
    state.cash += amount;
  
    // Update income for tax purposes if not pre-tax
    if (!series.preTax) {
      state.curYearIncome += amount;
    }
  }
  
  // Process expense event series
  function processExpenseEventSeries(state, series, currentYear) {
    // Only process if the series is active
    if (!isEventSeriesActive(series, currentYear, state.age)) {
      return;
    }
  
    // Get the event for this year
    const event = getCurrentEventFromSeries(series, currentYear, state.age);
    if (!event) return;
  
    // Calculate the expense amount for this year
    let expenseAmount = event.amount;
  
    // Determine if this is a discretionary or non-discretionary expense
    const isDiscretionary = event.expenseType === "discretionary";
  
    // For non-discretionary expenses, we must pay them
    if (!isDiscretionary) {
      // Use available cash or sell assets if needed
      if (state.cash >= expenseAmount) {
        state.cash -= expenseAmount;
      } else {
        // Need to raise cash by selling assets
        const cashNeeded = expenseAmount - state.cash;
        sellAssetsForCash(state, cashNeeded, {});
        state.cash -= Math.min(state.cash, expenseAmount);
      }
    } else {
      // For discretionary expenses, check if it would violate the financial goal
      if (wouldViolateFinancialGoal(state, expenseAmount)) {
        // Calculate how much we can spend without violating the goal
        const allowedAmount = getMaxAllowableExpense(state);
  
        if (allowedAmount <= 0) return; // Skip this expense entirely
  
        // Only pay partial amount
        expenseAmount = Math.min(allowedAmount, expenseAmount);
      }
  
      // Now pay from cash or sell assets if needed
      if (state.cash >= expenseAmount) {
        state.cash -= expenseAmount;
      } else {
        // Check if selling assets would violate financial goal
        if (!wouldViolateFinancialGoal(state, expenseAmount)) {
          // Need to raise cash by selling assets
          const cashNeeded = expenseAmount - state.cash;
          sellAssetsForCash(state, cashNeeded, {});
          state.cash -= Math.min(state.cash, expenseAmount);
        } else {
          // Pay what we can without selling assets
          state.cash = 0;
        }
      }
    }
  
    // Update balances
    updateBalances(state);
  }
  
  // Process investment event series
  function processInvestEventSeries(state, series, currentYear) {
    // Only process if the series is active for the current year
    if (!isEventSeriesActive(series, currentYear, state.age)) {
      return;
    }
  
    // Get the event for the current year
    const event = getCurrentEventFromSeries(series, currentYear, state.age);
    if (!event) return;
  
    // Skip if we don't have enough cash
    if (state.cash <= 0) return;
  
    const { investAmount, allocation, investments } = event;
  
    // Calculate effective investment amount based on trigger type
    let effectiveAmount = 0;
  
    if (event.triggerType === "fixed") {
      effectiveAmount = Math.min(investAmount, state.cash);
    } else if (event.triggerType === "percentage") {
      effectiveAmount = Math.min(state.cash * (investAmount / 100), state.cash);
    } else if (event.triggerType === "excess") {
      // Invest any cash over the threshold amount
      const excessCash = Math.max(0, state.cash - event.thresholdAmount);
      effectiveAmount = Math.min(excessCash, state.cash);
    }
  
    if (effectiveAmount <= 0) return;
  
    // Calculate target allocation based on glide path if applicable
    const targetAllocation = calculateGlidePathAllocation(
      event,
      state.age,
      currentYear
    );
  
    // Create a map of target amounts for each investment based on allocation
    const targetAmounts = {};
    let totalAllocated = 0;
  
    // Calculate target amount for each investment
    Object.entries(targetAllocation).forEach(([investId, percentage]) => {
      targetAmounts[investId] = (percentage / 100) * effectiveAmount;
      totalAllocated += targetAmounts[investId];
    });
  
    // Adjust for any rounding errors
    if (totalAllocated !== effectiveAmount) {
      // Find the largest allocation to adjust
      const largestInvestId = Object.entries(targetAmounts).sort(
        (a, b) => b[1] - a[1]
      )[0][0];
  
      targetAmounts[largestInvestId] += effectiveAmount - totalAllocated;
    }
  
    // Process each investment allocation
    Object.entries(targetAmounts).forEach(([investId, amount]) => {
      if (amount <= 0) return;
  
      // Find or create the investment
      let investment = state.investments.find((inv) => inv.id === investId);
  
      if (!investment) {
        // Create new investment based on the definition in the series
        const invDef = investments.find((i) => i.id === investId);
  
        if (!invDef) return; // Skip if definition not found
  
        investment = {
          id: investId,
          type: invDef.type || "stock",
          taxStatus: invDef.taxStatus || "non-retirement",
          balance: 0,
        };
  
        // Add cost basis tracking for taxable investments
        if (investment.taxStatus === "non-retirement") {
          investment.costBasis = 0;
        }
  
        state.investments.push(investment);
      }
  
      // Update investment balance
      investment.balance += amount;
  
      // Update cost basis for taxable investments
      if (investment.taxStatus === "non-retirement") {
        investment.costBasis += amount;
      }
  
      // Reduce cash by the invested amount
      state.cash -= amount;
    });
  
    // Update balance totals
    updateBalances(state);
  }
  
  // Helper function to calculate allocation based on a glide path
  function calculateGlidePathAllocation(event, currentAge, currentYear) {
    // If no glide path defined, just return the static allocation
    if (
      !event.glidePathEnabled ||
      !event.startAllocation ||
      !event.endAllocation
    ) {
      return event.allocation || {};
    }
  
    // Calculate position along the glide path (0 to 1)
    let progress = 0;
  
    if (event.glidePathType === "age") {
      // Age-based glide path
      const totalSpan = event.endAge - event.startAge;
      if (totalSpan <= 0) return event.allocation || {};
  
      progress = Math.min(
        1,
        Math.max(0, (currentAge - event.startAge) / totalSpan)
      );
    } else if (event.glidePathType === "year") {
      // Year-based glide path
      const totalSpan = event.endYear - event.startYear;
      if (totalSpan <= 0) return event.allocation || {};
  
      progress = Math.min(
        1,
        Math.max(0, (currentYear - event.startYear) / totalSpan)
      );
    }
  
    // Interpolate between start and end allocations
    const result = {};
  
    // Get all investment IDs from both start and end allocations
    const allInvestIds = new Set([
      ...Object.keys(event.startAllocation || {}),
      ...Object.keys(event.endAllocation || {}),
    ]);
  
    // Calculate interpolated values for each investment
    allInvestIds.forEach((investId) => {
      const startValue = (event.startAllocation || {})[investId] || 0;
      const endValue = (event.endAllocation || {})[investId] || 0;
  
      // Linear interpolation
      result[investId] = startValue + (endValue - startValue) * progress;
    });
  
    return result;
  }
  
  // Process rebalance event series
  function processRebalanceEventSeries(state, series, currentYear) {
    // Only rebalance investments with the same account tax status
    // as specified in the event series
    const targetTaxStatus = series.accountTaxStatus;
  
    // Get all investments with the specified tax status
    const investments = state.investments.filter(
      (inv) => inv.taxStatus === targetTaxStatus
    );
  
    if (investments.length === 0) return;
  
    // Calculate total value of investments in this tax status
    const totalValue = investments.reduce((sum, inv) => sum + inv.balance, 0);
  
    // Get target allocation
    let allocation = series.assetAllocation;
  
    // If using a glide path, calculate the current allocation
    if (series.isGlidePath) {
      const totalDuration = series.duration;
      const yearsPassed = currentYear - series.startYear;
      const progress = totalDuration > 0 ? yearsPassed / totalDuration : 0;
  
      // Interpolate between initial and final allocations
      allocation = {};
      for (const investmentId in series.initialAllocation) {
        const initial = series.initialAllocation[investmentId] || 0;
        const final = series.finalAllocation[investmentId] || 0;
        allocation[investmentId] = initial + progress * (final - initial);
      }
    }
  
    // Calculate target values and differences
    const targetValues = {};
    for (const investmentId in allocation) {
      const targetPercent = allocation[investmentId];
      targetValues[investmentId] = (totalValue * targetPercent) / 100;
    }
  
    // First, handle sales (to avoid cash flow issues)
    for (const inv of investments) {
      const targetValue = targetValues[inv.id] || 0;
      if (inv.balance > targetValue) {
        // Sell part of this investment
        const saleAmount = inv.balance - targetValue;
  
        // Track capital gains for non-retirement accounts
        if (inv.taxStatus === "non-retirement") {
          const costBasisProportion = saleAmount / inv.balance;
          const costBasisForSold = inv.costBasis * costBasisProportion;
          const gain = saleAmount - costBasisForSold;
  
          state.curYearGains += gain;
          inv.costBasis -= costBasisForSold;
        }
  
        inv.balance -= saleAmount;
        state.cash += saleAmount;
      }
    }
  
    // Then, handle purchases
    for (const inv of investments) {
      const targetValue = targetValues[inv.id] || 0;
      if (inv.balance < targetValue && state.cash > 0) {
        // Buy more of this investment
        const neededAmount = targetValue - inv.balance;
        const buyAmount = Math.min(neededAmount, state.cash);
  
        inv.balance += buyAmount;
        if (inv.taxStatus === "non-retirement") {
          inv.costBasis += buyAmount;
        }
  
        state.cash -= buyAmount;
      }
    }
  
    updateBalances(state);
  }
  
  // Add the missing processInvestEvents function
  function processInvestEvents(state, currentYear) {
    // Skip if deceased
    if (state.isDeceased) return;
  
    // Process manual investment events from investEvents array
    for (const event of state.investEvents) {
      // Check if event applies to current age
      if (state.age === event.age) {
        // Check if we have enough cash
        if (state.cash >= event.amount) {
          // Process based on target account
          switch (event.account) {
            case "taxable":
              state.taxable.investments.push({
                balance: event.amount,
                purchaseYear: state.age,
                type: event.type || "stock",
                costBasis: event.amount,
              });
              break;
            case "ira":
              // Check contribution limits
              if (
                state.yearsUntilRetirement > 0 &&
                state.curYearPreTaxContribution + event.amount <=
                  state.inflationAdjustedContributionLimits.preTax
              ) {
                state.ira.investments.push({
                  balance: event.amount,
                  type: "pre-tax",
                  purchaseYear: state.age,
                });
                state.curYearPreTaxContribution += event.amount;
              } else if (state.yearsUntilRetirement <= 0) {
                // Retirement rollover
                state.ira.investments.push({
                  balance: event.amount,
                  type: "pre-tax",
                  purchaseYear: state.age,
                });
              }
              break;
            case "roth":
              // Check contribution limits
              if (
                state.yearsUntilRetirement > 0 &&
                state.curYearAfterTaxContribution + event.amount <=
                  state.inflationAdjustedContributionLimits.afterTax
              ) {
                state.roth.investments.push({
                  balance: event.amount,
                  type: "after-tax",
                  purchaseYear: state.age,
                });
                state.curYearAfterTaxContribution += event.amount;
              } else if (state.yearsUntilRetirement <= 0) {
                // Retirement rollover
                state.roth.investments.push({
                  balance: event.amount,
                  type: "after-tax",
                  purchaseYear: state.age,
                });
              }
              break;
          }
  
          // Deduct from cash
          state.cash -= event.amount;
        }
      }
    }
  
    // Process excess cash investment
    if (state.cash > 0) {
      // Define threshold for excess cash - keep 3 months of expenses as buffer
      const expensesPerMonth =
        (state.expenses.nonDiscretionary + state.expenses.discretionary) / 12;
      const cashBuffer = expensesPerMonth * 3; // 3 months of expenses as buffer
  
      // Calculate excess cash above buffer
      const excessCash = Math.max(0, state.cash - cashBuffer);
  
      if (excessCash > 0) {
        // Default: Add to taxable as stock
        state.taxable.investments.push({
          balance: excessCash,
          purchaseYear: state.age,
          type: "stock",
          costBasis: excessCash,
        });
  
        // Update cash balance
        state.cash -= excessCash;
      }
    }
  
    updateBalances(state);
  }
  
  // Add the missing processRebalanceEvents function
  function processRebalanceEvents(state, currentYear) {
    // Check for overlapping rebalance events with same account tax status
    const activeRebalanceEvents = state.eventSeries.filter(
      (series) =>
        series.type === "rebalance" &&
        currentYear >= series.startYear &&
        currentYear < series.startYear + series.duration
    );
  
    // Group rebalance events by account tax status
    const eventsByTaxStatus = {};
    for (const event of activeRebalanceEvents) {
      const taxStatus = event.accountTaxStatus || "default";
      if (!eventsByTaxStatus[taxStatus]) {
        eventsByTaxStatus[taxStatus] = [];
      }
      eventsByTaxStatus[taxStatus].push(event);
    }
  
    // Check for and handle overlapping events
    for (const taxStatus in eventsByTaxStatus) {
      const events = eventsByTaxStatus[taxStatus];
  
      if (events.length > 1) {
        // We have overlapping rebalance events for the same tax status
        // Log a warning and only process the event with highest priority
        console.warn(
          `Warning: Found ${events.length} overlapping rebalance events for tax status "${taxStatus}" in year ${currentYear}. Only the highest priority event will be processed.`
        );
  
        // Sort by priority (lower number = higher priority)
        events.sort((a, b) => (a.priority || 999) - (b.priority || 999));
  
        // Only process the highest priority event
        const highestPriorityEvent = events[0];
  
        // Check if this is a rebalance year (respects frequency if set)
        if (
          !highestPriorityEvent.frequency ||
          (currentYear - highestPriorityEvent.startYear) %
            highestPriorityEvent.frequency ===
            0
        ) {
          processRebalanceEventSeries(state, highestPriorityEvent, currentYear);
        }
      } else if (events.length === 1) {
        // Only one event for this tax status, no overlap
        const event = events[0];
  
        // Check if this is a rebalance year (respects frequency if set)
        if (
          !event.frequency ||
          (currentYear - event.startYear) % event.frequency === 0
        ) {
          processRebalanceEventSeries(state, event, currentYear);
        }
      }
    }
  }
  
  // Add a helper function to calculate the taxable portion of Social Security benefits
  function calculateTaxableSocialSecurity(ssIncome, otherIncome) {
    // Implement the correct calculation for social security taxation
    // Per IRS rules: https://www.ssa.gov/benefits/retirement/planner/taxes.html
  
    // Calculate combined income (adjusted gross income + nontaxable interest + 1/2 of Social Security benefits)
    const combinedIncome = otherIncome + ssIncome * 0.5;
  
    // For single filing status
    if (combinedIncome <= 25000) {
      return 0; // 0% of benefits are taxable
    } else if (combinedIncome <= 34000) {
      // Up to 50% of benefits may be taxable
      return Math.min(ssIncome * 0.5, (combinedIncome - 25000) * 0.5);
    } else {
      // Up to 85% of benefits may be taxable
      const tier1Taxable = Math.min(ssIncome * 0.5, 4500); // 50% of the income between $25,000 and $34,000
      const tier2Taxable = Math.min(
        ssIncome * 0.85,
        tier1Taxable + (combinedIncome - 34000) * 0.85
      );
      return tier2Taxable;
    }
  
    // Note: For married filing jointly, the thresholds would be $32,000 and $44,000
    // This function should be expanded to handle married filing jointly status
  }
  
  // Function to handle when a spouse dies - changes tax filing status
  function handleSpouseDeath(state) {
    // Skip if already processed or not applicable
    if (!state.isMarried || state.spouseDeceased) return;
  
    state.spouseDeceased = true;
  
    // Change tax filing status from married to single
    state.filingStatus = "single";
  
    // Update the income events to remove spouse portion
    state.incomeEvents.forEach((event) => {
      if (event.spousePercent > 0) {
        // Transfer spouse's portion to deceased benefits if applicable
        if (event.continueAfterSpouseDeath) {
          event.userPercent += event.spousePercent;
        }
        event.spousePercent = 0;
      }
    });
  
    // Handle Social Security survivor benefits
    if (state.socialSecurity.isStarted && state.spouseSocialSecurity) {
      // Calculate survivor benefit based on higher of the two benefits
      const survivorBenefit = Math.max(
        state.socialSecurity.monthlyBenefit,
        state.spouseSocialSecurity.monthlyBenefit *
          state.socialSecurity.survivorBenefitMultiplier
      );
  
      // Update primary benefit to survivor benefit amount
      state.socialSecurity.monthlyBenefit = survivorBenefit;
      state.socialSecurity.isSpouseBenefit = true;
  
      // Remove spouse's SS
      state.spouseSocialSecurity = null;
    }
  
    // Update tax brackets based on new filing status
    updateTaxBracketsForFilingStatus(state);
  
    // Consolidate investments according to estate plan
    consolidateInvestments(state);
  }
  
  // Helper function to update tax brackets when filing status changes
  function updateTaxBracketsForFilingStatus(state) {
    // Clone the existing brackets
    const oldBrackets = state.inflationAdjustedTaxBrackets;
  
    // For single, use values that are approximately half of married brackets
    // This is a simplification - in a real implementation, you'd use actual IRS tables
    if (state.filingStatus === "single") {
      state.inflationAdjustedTaxBrackets = oldBrackets.map((bracket) => {
        return {
          lower: Math.round(bracket.lower * 0.5),
          upper:
            bracket.upper === Infinity
              ? Infinity
              : Math.round(bracket.upper * 0.5),
          rate: bracket.rate,
        };
      });
  
      // Also update standard deduction (approximate)
      state.standardDeduction = Math.round(state.standardDeduction * 0.5);
  
      // Update capital gains brackets
      if (state.federalCapitalGainsBrackets) {
        state.federalCapitalGainsBrackets = state.federalCapitalGainsBrackets.map(
          (bracket) => {
            return {
              lower: Math.round(bracket.lower * 0.5),
              upper:
                bracket.upper === Infinity
                  ? Infinity
                  : Math.round(bracket.upper * 0.5),
              rate: bracket.rate,
            };
          }
        );
      }
    }
  }
  
  // Helper function to consolidate investments after spouse's death
  function consolidateInvestments(state) {
    // Process investments based on estate plan
    // This is a simplification - in a real implementation, there would be more complex rules
  
    // Mark investments previously owned by spouse
    state.investments.forEach((inv) => {
      if (inv.ownerType === "spouse") {
        // Change ownership to primary user
        inv.ownerType = "user";
  
        // Step up basis for taxable investments (inheritance rule)
        if (inv.taxStatus === "non-retirement") {
          inv.costBasis = inv.balance; // Step up basis to current market value
        }
      }
    });
  }
  
  // Helper function to determine if spouse death should be processed this year
  function shouldProcessSpouseDeath(state, params, year) {
    // Use specified spouse death year if provided
    if (params.spouseDeathYear && year === params.spouseDeathYear) {
      return true;
    }
  
    // Otherwise use mortality tables if enabled
    if (params.useMortalityTables && state.spouseAge) {
      const mortalityRate = calculateMortalityRate(state.spouseAge);
      return Math.random() < mortalityRate;
    }
  
    return false;
  }
  
  // Initialize state with married flag when appropriate
  function initializeMarriedStatus(state, params) {
    state.isMarried = !!params.isMarried;
    state.filingStatus = state.isMarried ? "married-joint" : "single";
    state.spouseDeceased = false;
  
    if (state.isMarried) {
      // Set spouse age if provided
      state.spouseAge = params.spouseAge || state.age;
  
      // Initialize spouse social security if applicable
      if (params.spouseSocialSecurity) {
        state.spouseSocialSecurity = {
          monthlyBenefit: params.spouseSocialSecurity.monthlyBenefit || 0,
          startAge: params.spouseSocialSecurity.startAge || 67,
          isStarted: false,
          primaryInsuranceAmount:
            params.spouseSocialSecurity.primaryInsuranceAmount || 0,
        };
      }
    }
  }
  
  // Helper function to check if an expense would violate the financial goal
  function wouldViolateFinancialGoal(state, expenseAmount) {
    // If no financial goal set, then it can't be violated
    if (!state.financialGoal || state.financialGoal <= 0) {
      return false;
    }
  
    // Calculate total investments across all accounts
    const totalInvestments = calculateTotalInvestments(state);
  
    // Check if paying this expense would drop below the financial goal
    return totalInvestments - expenseAmount < state.financialGoal;
  }
  
  // Helper function to calculate total investments
  function calculateTotalInvestments(state) {
    return (
      state.investments.reduce((total, inv) => total + inv.balance, 0) +
      state.cash
    );
  }
  
  // Helper function to calculate maximum expense without violating financial goal
  function getMaxAllowableExpense(state) {
    if (!state.financialGoal || state.financialGoal <= 0) {
      return Infinity; // No limit if no goal
    }
  
    const totalInvestments = calculateTotalInvestments(state);
    return Math.max(0, totalInvestments - state.financialGoal);
  }
  
  // Update handleWithdrawals to use the standardized financial goal check
  function handleWithdrawals(state, params) {
    // Skip withdrawals if deceased
    if (state.isDeceased) return;
  
    // Pay previous year's taxes first from cash
    if (state.previousYearTaxDue > 0) {
      // First try to pay from cash
      const cashPayment = Math.min(state.cash, state.previousYearTaxDue);
      state.cash -= cashPayment;
      const remainingTax = state.previousYearTaxDue - cashPayment;
  
      // If cash is insufficient, sell taxable investments
      if (remainingTax > 0) {
        sellAssetsForCash(state, remainingTax, params);
      }
  
      state.previousYearTaxDue = 0;
    }
  
    // First pay non-discretionary expenses - these must be paid
    const nonDiscretionaryExpenses = state.expenses.nonDiscretionary;
  
    // Check if we have enough cash for non-discretionary expenses
    if (state.cash < nonDiscretionaryExpenses) {
      // Need to raise cash by selling assets
      const cashNeeded = nonDiscretionaryExpenses - state.cash;
      sellAssetsForCash(state, cashNeeded, params);
    }
  
    // Use cash to pay non-discretionary expenses
    state.cash -= Math.min(state.cash, nonDiscretionaryExpenses);
  
    // Now handle discretionary expenses according to spending strategy
    if (state.expenses.discretionary > 0) {
      // Sort discretionary expenses according to spending strategy if provided
      const discretionaryExpenses = state.spendingStrategy || [
        {
          amount: state.expenses.discretionary,
          name: "Default discretionary",
        },
      ];
  
      // Process each discretionary expense in order
      for (const expense of discretionaryExpenses) {
        // Check if paying this expense would violate the financial goal
        if (wouldViolateFinancialGoal(state, expense.amount)) {
          // Calculate how much we can spend without violating the goal
          const allowedAmount = getMaxAllowableExpense(state);
  
          if (allowedAmount <= 0) continue; // Skip this expense entirely
  
          // Only pay partial amount
          const payAmount = Math.min(allowedAmount, state.cash, expense.amount);
          state.cash -= payAmount;
        } else if (state.cash >= expense.amount) {
          // Pay the full expense
          state.cash -= expense.amount;
        } else {
          // Not enough cash, need to sell assets if allowed
          const cashNeeded = expense.amount - state.cash;
  
          // Check if selling would violate financial goal
          if (!wouldViolateFinancialGoal(state, expense.amount)) {
            sellAssetsForCash(state, cashNeeded, params);
            state.cash -= Math.min(state.cash, expense.amount);
          } else {
            // Pay what we can without selling more assets
            const partialPayment = state.cash;
            state.cash -= partialPayment;
          }
        }
      }
    }
  
    updateBalances(state);
  }
  
  // Add a stub function for Roth conversion processing
  function processRothConversion(state, params) {
    // Skip if deceased
    if (state.isDeceased) return;
  
    // Skip if optimizer is disabled
    if (!state.rothConversionOptimizerEnabled) {
      // Use fixed conversion amount if specified (old behavior)
      if (state.rothConversion > 0) {
        executeRothConversion(state, state.rothConversion, params);
      }
      return;
    }
  
    // Skip if outside designated optimization years
    if (state.rothConversionOptimizerStartYear > 0 && 
        state.age < state.rothConversionOptimizerStartYear) {
      return;
    }
    if (state.rothConversionOptimizerEndYear > 0 && 
        state.age > state.rothConversionOptimizerEndYear) {
      return;
    }
  
    // Get current tax brackets (inflation adjusted)
    const brackets = state.inflationAdjustedTaxBrackets || params.taxBrackets;
    if (!brackets || brackets.length === 0) return;
  
    // Determine current income (excluding potential conversions)
    const currentIncome = state.curYearIncome;
    
    // Find current tax bracket
    let currentBracket = null;
    for (const bracket of brackets) {
      if (currentIncome >= bracket.lower && currentIncome < bracket.upper) {
        currentBracket = bracket;
        break;
      }
    }
    
    if (!currentBracket) return;
    
    // Calculate amount needed to reach the upper limit of the current bracket
    const maxAdditionalIncome = Math.max(0, currentBracket.upper - currentIncome - 1);
    
    // Apply conversion limits
    // 1. User-defined maximum conversion amount
    let conversionAmount = maxAdditionalIncome;
    if (params.maxConversion) {
      conversionAmount = Math.min(conversionAmount, params.maxConversion);
    }
    
    // 2. Step amount rounding (if specified)
    if (params.conversionStep && params.conversionStep > 0) {
      conversionAmount = Math.floor(conversionAmount / params.conversionStep) * params.conversionStep;
    }
    
    // Execute the conversion if amount is positive
    if (conversionAmount > 0) {
      executeRothConversion(state, conversionAmount, params);
    }
  }
  
  // Helper function to execute the actual conversion
  function executeRothConversion(state, conversionAmount, params) {
    // Check available pre-tax assets
    const totalPreTax = state.investments
      .filter(inv => inv.taxStatus === "pre-tax")
      .reduce((sum, inv) => sum + inv.balance, 0);
    
    // If no pre-tax assets, skip conversion
    if (totalPreTax <= 0) return;
    
    // Limit by available pre-tax assets
    conversionAmount = Math.min(conversionAmount, totalPreTax);
    
    // Use withdrawal strategy if specified
    if (state.rothConversionStrategy && state.rothConversionStrategy.length > 0) {
      // Use specified conversion strategy
      withdrawUsingStrategy(state, conversionAmount, state.rothConversionStrategy);
    } else {
      // Default: proportional withdrawal from all pre-tax investments
      const preTaxInvestments = state.investments.filter(inv => inv.taxStatus === "pre-tax");
      
      preTaxInvestments.forEach(inv => {
        const portion = inv.balance / totalPreTax;
        const withdrawalAmount = conversionAmount * portion;
        
        // Reduce pre-tax investment
        inv.balance -= withdrawalAmount;
        
        // Create or add to Roth investment of same type
        const rothInvestmentId = inv.id.replace("pre-tax", "after-tax");
        let rothInvestment = state.investments.find(i => i.id === rothInvestmentId);
        
        if (!rothInvestment) {
          // Create new Roth investment
          rothInvestment = {
            id: rothInvestmentId,
            type: inv.type,
            taxStatus: "after-tax",
            balance: 0
          };
          state.investments.push(rothInvestment);
        }
        
        // Add to Roth investment
        rothInvestment.balance += withdrawalAmount;
      });
    }
    
    // Add to current year's income (Roth conversions are taxable)
    state.curYearIncome += conversionAmount;
  }
  
  // Helper function to withdraw using a specific strategy
  function withdrawUsingStrategy(state, amount, strategy) {
    let remainingAmount = amount;
    
    // Sort the strategy by priority
    const sortedStrategy = [...strategy].sort((a, b) => a.priority - b.priority);
    
    for (const source of sortedStrategy) {
      if (remainingAmount <= 0) break;
      
      // Find the investment matching this strategy entry
      const matchingInvestments = state.investments.filter(inv => 
        inv.taxStatus === "pre-tax" && 
        (source.type === undefined || inv.type === source.type) &&
        (source.id === undefined || inv.id === source.id)
      );
      
      if (matchingInvestments.length === 0) continue;
      
      // Calculate total balance of matching investments
      const totalBalance = matchingInvestments.reduce((sum, inv) => sum + inv.balance, 0);
      
      // Determine amount to withdraw from this source
      const withdrawAmount = Math.min(remainingAmount, totalBalance);
      
      // Withdraw proportionally from matching investments
      matchingInvestments.forEach(inv => {
        const portion = inv.balance / totalBalance;
        const invWithdrawal = withdrawAmount * portion;
        
        // Reduce pre-tax balance
        inv.balance -= invWithdrawal;
        
        // Add to after-tax (Roth) equivalent
        const rothInvestmentId = inv.id.replace("pre-tax", "after-tax");
        let rothInvestment = state.investments.find(i => i.id === rothInvestmentId);
        
        if (!rothInvestment) {
          rothInvestment = {
            id: rothInvestmentId,
            type: inv.type,
            taxStatus: "after-tax",
            balance: 0
          };
          state.investments.push(rothInvestment);
        }
        
        rothInvestment.balance += invWithdrawal;
      });
      
      remainingAmount -= withdrawAmount;
    }
  }
  
  // Function to sell assets to raise cash
  function sellAssetsForCash(state, amountNeeded, params) {
    // Skip if amount needed is zero or negative
    if (amountNeeded <= 0) return;
  
    // Use withdrawal strategy if defined, otherwise use default order
    const strategy = state.expenseWithdrawalStrategy || [
      { type: "cash", priority: 1 },
      { type: "taxable", priority: 2 },
      { type: "pre-tax", priority: 3, penalty: state.age < 59.5 ? 0.1 : 0 },
      { type: "after-tax", priority: 4 },
    ];
  
    // Sort the strategy by priority
    const sortedStrategy = [...strategy].sort((a, b) => a.priority - b.priority);
  
    // Track remaining amount needed
    let remainingNeeded = amountNeeded;
  
    // First, use available cash (should already be accounted for before calling this function)
    if (state.cash > 0) {
      const cashToUse = Math.min(state.cash, remainingNeeded);
      state.cash -= cashToUse;
      remainingNeeded -= cashToUse;
    }
  
    // If we still need more cash, follow the strategy
    if (remainingNeeded > 0) {
      for (const source of sortedStrategy) {
        if (remainingNeeded <= 0) break;
  
        switch (source.type) {
          case "cash":
            // Already handled above
            break;
  
          case "taxable":
            // Sell taxable investments
            const taxableAmount = sellTaxableInvestments(state, remainingNeeded);
            remainingNeeded -= taxableAmount;
            break;
  
          case "pre-tax":
            // Withdraw from pre-tax accounts (IRA, 401k)
            const preTaxAmount = sellPreTaxInvestments(
              state,
              remainingNeeded,
              source.penalty || 0
            );
            remainingNeeded -= preTaxAmount;
            break;
  
          case "after-tax":
            // Withdraw from after-tax accounts (Roth)
            // Note: Normally, there's an ordering rule for Roth withdrawals
            // (contributions first, then conversions, then earnings)
            const afterTaxAmount = sellAfterTaxInvestments(
              state,
              remainingNeeded
            );
            remainingNeeded -= afterTaxAmount;
            break;
        }
      }
    }
  
    // Update balances
    updateBalances(state);
  }
  
  // Helper function to sell taxable investments
  function sellTaxableInvestments(state, amountNeeded) {
    // Get all taxable investments
    const taxableInvestments = state.investments.filter(
      (inv) => inv.taxStatus === "non-retirement" && inv.balance > 0
    );
  
    if (taxableInvestments.length === 0) return 0;
  
    // Sort investments by purchase year (oldest first - FIFO)
    taxableInvestments.sort(
      (a, b) => (a.purchaseYear || 0) - (b.purchaseYear || 0)
    );
  
    let totalSold = 0;
    let remainingNeeded = amountNeeded;
  
    // Sell investments until we have enough cash
    for (const inv of taxableInvestments) {
      if (remainingNeeded <= 0) break;
  
      // Calculate how much to sell from this investment
      const amountToSell = Math.min(inv.balance, remainingNeeded);
  
      // Calculate proportion of investment being sold
      const proportion = amountToSell / inv.balance;
  
      // Calculate cost basis for the sold portion
      const costBasisForSold = inv.costBasis
        ? Math.min(inv.costBasis * proportion, inv.costBasis)
        : 0;
  
      // Calculate capital gain/loss
      const gain = amountToSell - costBasisForSold;
  
      // Apply gain/loss to current year's capital gains
      if (gain > 0) {
        // Apply any carried forward losses first
        if (state.capitalLossCarryforward && state.capitalLossCarryforward > 0) {
          const offsetAmount = Math.min(gain, state.capitalLossCarryforward);
          state.capitalLossCarryforward -= offsetAmount;
          state.curYearGains += gain - offsetAmount;
        } else {
          state.curYearGains += gain;
        }
      } else if (gain < 0) {
        // Negative gain (loss) - add to carryforward
        state.capitalLossCarryforward =
          (state.capitalLossCarryforward || 0) + Math.abs(gain);
      }
  
      // Reduce investment balance
      inv.balance -= amountToSell;
  
      // Reduce cost basis
      if (inv.costBasis) {
        inv.costBasis -= costBasisForSold;
      }
  
      // Add to cash
      state.cash += amountToSell;
  
      // Update tracking variables
      totalSold += amountToSell;
      remainingNeeded -= amountToSell;
    }
  
    return totalSold;
  }
  
  // Helper function to sell pre-tax investments
  function sellPreTaxInvestments(state, amountNeeded, penaltyRate) {
    // Get all pre-tax investments
    const preTaxInvestments = state.investments.filter(
      (inv) => inv.taxStatus === "pre-tax" && inv.balance > 0
    );
  
    if (preTaxInvestments.length === 0) return 0;
  
    // Calculate total pre-tax balance
    const totalPreTax = preTaxInvestments.reduce(
      (sum, inv) => sum + inv.balance,
      0
    );
  
    let totalSold = 0;
    let remainingNeeded = amountNeeded;
  
    // Sell from each pre-tax investment proportionally
    for (const inv of preTaxInvestments) {
      if (remainingNeeded <= 0) break;
  
      // Calculate proportion of this investment to the total
      const proportion = inv.balance / totalPreTax;
  
      // Calculate how much to withdraw from this investment
      const amountToSell = Math.min(inv.balance, remainingNeeded * proportion);
  
      // Reduce investment balance
      inv.balance -= amountToSell;
  
      // Add to cash
      state.cash += amountToSell;
  
      // Add to current year income (pre-tax withdrawals are taxable)
      state.curYearIncome += amountToSell;
  
      // Add penalty if applicable (early withdrawal)
      if (penaltyRate > 0) {
        const penalty = amountToSell * penaltyRate;
        state.curYearEarlyWithdrawals += amountToSell;
      }
  
      // Update tracking variables
      totalSold += amountToSell;
      remainingNeeded -= amountToSell;
    }
  
    return totalSold;
  }
  
  // Helper function to sell after-tax investments
  function sellAfterTaxInvestments(state, amountNeeded) {
    // Get all after-tax investments
    const afterTaxInvestments = state.investments.filter(
      (inv) => inv.taxStatus === "after-tax" && inv.balance > 0
    );
  
    if (afterTaxInvestments.length === 0) return 0;
  
    // Calculate total after-tax balance
    const totalAfterTax = afterTaxInvestments.reduce(
      (sum, inv) => sum + inv.balance,
      0
    );
  
    let totalSold = 0;
    let remainingNeeded = amountNeeded;
  
    // Sell from each after-tax investment proportionally
    for (const inv of afterTaxInvestments) {
      if (remainingNeeded <= 0) break;
  
      // Calculate proportion of this investment to the total
      const proportion = inv.balance / totalAfterTax;
  
      // Calculate how much to withdraw from this investment
      const amountToSell = Math.min(inv.balance, remainingNeeded * proportion);
  
      // Reduce investment balance
      inv.balance -= amountToSell;
  
      // Add to cash
      state.cash += amountToSell;
  
      // No tax implications for Roth withdrawals (assuming qualified)
  
      // Update tracking variables
      totalSold += amountToSell;
      remainingNeeded -= amountToSell;
    }
  
    return totalSold;
  }
  
  // Helper function to check if an event series is active
  function isEventSeriesActive(series, currentYear, currentAge) {
    // First check year-based constraints
    if (series.startYear && currentYear < series.startYear) {
      return false;
    }
  
    if (series.endYear && currentYear > series.endYear) {
      return false;
    }
  
    // Check if we're within the duration of the series
    if (series.startYear && series.duration) {
      const endYear = series.startYear + series.duration - 1;
      if (currentYear > endYear) {
        return false;
      }
    }
  
    // Check age-based constraints
    if (series.startAge && currentAge < series.startAge) {
      return false;
    }
  
    if (series.endAge && currentAge > series.endAge) {
      return false;
    }
  
    // Check dependency on other event series
    if (series.startAfterEventSeriesId) {
      // This would require access to all event series to check if the dependent series has ended
      // For now, we assume this is handled by the calling function
    }
  
    // If we passed all checks, the series is active
    return true;
  }
  
  // Helper function to get the current event from a series
  function getCurrentEventFromSeries(series, currentYear, currentAge) {
    if (!isEventSeriesActive(series, currentYear, currentAge)) {
      return null;
    }
  
    // Base event (copy to avoid modifying the original)
    const baseEvent = { ...series };
  
    // Calculate years into the series
    const yearsActive = currentYear - series.startYear;
  
    // Apply growth to amount if applicable
    if (baseEvent.growthRate && yearsActive > 0) {
      baseEvent.amount =
        baseEvent.baseAmount * Math.pow(1 + baseEvent.growthRate, yearsActive);
    } else if (baseEvent.baseAmount) {
      baseEvent.amount = baseEvent.baseAmount;
    }
  
    // Handle glide path for asset allocation if applicable
    if (
      baseEvent.glidePathEnabled &&
      baseEvent.startAllocation &&
      baseEvent.endAllocation
    ) {
      // This functionality would be handled by specialized functions for each event type
      // For generic events, we'll use the calculateGlidePathAllocation function
      baseEvent.currentAllocation = calculateGlidePathAllocation(
        baseEvent,
        currentAge,
        currentYear
      );
    }
  
    return baseEvent;
  }
  
  // Find the part where simulation results are displayed
  // Look for code that outputs history details like "Total Assets", "Annual Income", etc.
  
  // function displaySimulationResults(history) {
  //   console.log("Simulation History over", history.length, "years:");
  
  //   history.forEach((state, index) => {
  //     const year = index + 1;
  //     console.log(`Year ${year} (Age ${state.age}):`);
  //     console.log(`  Total Assets: $${state.totalAssets.toFixed(2)}`);
  
  //     // Calculate taxable, pre-tax and after-tax totals
  //     const taxable = state.investments
  //       .filter((inv) => inv.taxStatus === "non-retirement")
  //       .reduce((total, inv) => total + inv.balance, 0);
  
  //     const ira = state.investments
  //       .filter((inv) => inv.taxStatus === "pre-tax")
  //       .reduce((total, inv) => total + inv.balance, 0);
  
  //     const roth = state.investments
  //       .filter((inv) => inv.taxStatus === "after-tax")
  //       .reduce((total, inv) => total + inv.balance, 0);
  
  //     console.log(`  Taxable: $${taxable.toFixed(2)}`);
  //     console.log(`  IRA: $${ira.toFixed(2)}`);
  //     console.log(`  Roth: $${roth.toFixed(2)}`);
  //     console.log(`  Annual Income: $${state.income.toFixed(2)}`);
  //     console.log(
  //       `  Annual Expenses: $${(
  //         state.expenses.nonDiscretionary + state.expenses.discretionary
  //       ).toFixed(2)}`
  //     );
  
  //     // FIX #3: Add tax reporting
  //     console.log(`  Taxes Paid: $${(state.previousYearTaxDue || 0).toFixed(2)}`);
  
  //     console.log("---");
  //   });
  // }
  