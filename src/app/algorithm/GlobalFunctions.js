function generateRandomReturn(expectedReturn, volatility) {
  // Box-Muller transform for normal distribution
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return expectedReturn + z * volatility;
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

// Helper function to calculate maximum expense without violating financial goal
function getMaxAllowableExpense(state) {
    if (!state.financialGoal || state.financialGoal <= 0) {
      return Infinity; // No limit if no goal
    }
  
    const totalInvestments = calculateTotalInvestments(state);
    return Math.max(0, totalInvestments - state.financialGoal);
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