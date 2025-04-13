// Add a stub function for Roth conversion processing
export function processRothConversion(state, params) {
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