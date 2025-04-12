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