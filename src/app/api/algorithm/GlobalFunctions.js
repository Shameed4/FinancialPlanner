export function deepCopy(obj) {
  if (obj === undefined) return undefined;

  // Handle potential undefined values inside objects or arrays
  const replacer = (key, value) => {
    return value === undefined ? null : value;
  };

  return JSON.parse(JSON.stringify(obj, replacer));
}

export function generateRandomReturn(expectedReturn, volatility) {
  // Box-Muller transform for normal distribution
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return expectedReturn + z * volatility;
}

// Function to sell assets to raise cash
export function sellAssetsForCash(state, amountNeeded, params) {
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

// Helper function to check if an expense would violate the financial goal
export function wouldViolateFinancialGoal(state, expenseAmount) {
  // If no financial goal set, then it can't be violated
  if (!state.financialGoal || state.financialGoal <= 0) {
    return false;
  }

  // Calculate total investments across all accounts
  const totalInvestments = calculateTotalInvestments(state);

  // Check if paying this expense would drop below the financial goal
  return totalInvestments - expenseAmount < state.financialGoal;
}

// Helper function to calculate maximum expense without violating financial goal
export function getMaxAllowableExpense(state) {
  if (!state.financialGoal || state.financialGoal <= 0) {
    return Infinity; // No limit if no goal
  }

  const totalInvestments = calculateTotalInvestments(state);
  return Math.max(0, totalInvestments - state.financialGoal);
}

// Helper function to calculate total investments
function calculateTotalInvestments(state) {
  return (
    state.investments.reduce((total, inv) => total + inv.balance, 0) +
    state.cash
  );
}

export function updateBalances(state) {
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

// Call this at the beginning of each simulation year
export function prepareFiscalYear(state) {
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

// Add this function to ensure all investments have valid IDs
export function ensureInvestmentIds(state) {
  state.investments.forEach((inv, index) => {
    if (!inv.id) {
      // Create ID based on tax status and type if missing
      inv.id = `${inv.taxStatus || "unknown"}-${inv.type || "investment"
        }-${index}`;
    }
  });
}


// Update investment values (returns, reinvestment, expense subtraction)
export function updateInvestmentValues(state, params) {
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

// Update handleWithdrawals to use the standardized financial goal check
export function handleWithdrawals(state, params) {
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

// Helper function to validate the state - consolidated function

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
export function validateState(state) {
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

// Add investment validation function - moved up before runSimulation
export function validateInvestments(state) {
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

export function trackYearEndBalances(state) {
  // Initialize if not exists
  if (!state.previousYearInvestmentBalances) {
    state.previousYearInvestmentBalances = {};
  }

  // Store current balances to use next year
  state.investments.forEach((inv) => {
    state.previousYearInvestmentBalances[inv.id] = inv.balance;
  });
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