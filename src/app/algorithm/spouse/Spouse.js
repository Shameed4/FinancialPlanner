export function initializeMarriedStatus(state, params) {
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

  // Helper function to determine if spouse death should be processed this year
export function shouldProcessSpouseDeath(state, params, year) {
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

// Function to handle when a spouse dies - changes tax filing status
export function handleSpouseDeath(state) {
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
export function updateTaxBracketsForFilingStatus(state) {
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
export function consolidateInvestments(state) {
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