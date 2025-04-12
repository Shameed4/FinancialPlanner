export function processInvestEventSeries(state, series, currentYear) {
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

  // Add the missing processInvestEvents function
export function processInvestEvents(state, currentYear) {
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

// Invest excess cash according to target allocation
export function investExcessCash(state, params) {
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