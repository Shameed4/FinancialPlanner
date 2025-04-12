// Process expense event series
export function processExpenseEventSeries(state, series, currentYear) {
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