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