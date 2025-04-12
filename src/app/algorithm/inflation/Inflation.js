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