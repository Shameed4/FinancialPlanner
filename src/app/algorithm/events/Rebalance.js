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