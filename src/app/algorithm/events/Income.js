// Process income event series
function processIncomeEventSeries(state, series, currentYear) {
    // Skip if deceased and event is only for living person
    if (state.isDeceased && !series.continueAfterDeath) return;
  
    // Check if this series starts after another event series ends
    if (series.startAfterEventSeriesId) {
      const dependentSeries = state.eventSeries.find(
        (s) => s.id === series.startAfterEventSeriesId
      );
      if (dependentSeries) {
        const dependentSeriesEndYear =
          dependentSeries.startYear + dependentSeries.duration;
        if (currentYear < dependentSeriesEndYear) {
          return; // Skip this event as the dependent series hasn't ended yet
        }
      }
    }
  
    // Calculate years into the series
    const yearsActive = currentYear - series.startYear;
  
    // Calculate base amount with growth if applicable
    let amount = series.baseAmount;
  
    // Apply growth if specified
    if (series.growthRate && yearsActive > 0) {
      // Compound growth
      amount *= Math.pow(1 + series.growthRate, yearsActive);
    }
  
    // Apply inflation adjustment if specified
    if (series.inflationAdjusted) {
      amount *= Math.pow(1 + state.inflationRate, yearsActive);
    }
  
    // Apply stochastic variation if specified
    if (series.stochastic) {
      if (series.stochasticType === "normal" && series.stochasticParam) {
        // Normal distribution variation
        // stochasticParam represents standard deviation as a fraction of the amount
        const stdDev = series.stochasticParam * amount;
        const variation = generateRandomReturn(0, stdDev);
        amount *= 1 + variation;
      } else if (series.stochasticType === "uniform" && series.stochasticParam) {
        // Uniform distribution variation
        // stochasticParam represents the range as a fraction of the amount
        const range = series.stochasticParam * amount;
        const variation = (Math.random() * 2 - 1) * range; // Random between -range and +range
        amount = Math.max(0, amount + variation); // Ensure amount doesn't go negative
      }
    }
  
    // Track maximum cash values if specified
    if (series.trackMaxCash) {
      if (!state.maxCashValues) {
        state.maxCashValues = {};
      }
  
      if (!state.maxCashValues[series.id]) {
        state.maxCashValues[series.id] = 0;
      }
  
      state.maxCashValues[series.id] = Math.max(
        state.maxCashValues[series.id],
        state.cash + amount
      );
    }
  
    // Add to cash
    state.cash += amount;
  
    // Update income for tax purposes if not pre-tax
    if (!series.preTax) {
      state.curYearIncome += amount;
    }
  }

  // Process Social Security benefits
function processSocialSecurity(state) {
  // Skip if deceased
  if (state.isDeceased) return;

  // Check if we should start Social Security benefits
  if (
    !state.socialSecurity.isStarted &&
    state.age >= state.socialSecurity.startAge
  ) {
    state.socialSecurity.isStarted = true;

    // Apply delayed retirement credits if applicable (8% per year after FRA up to age 70)
    const fullRetirementAge = 67; // Default FRA for most current workers
    if (state.age > fullRetirementAge && state.age <= 70) {
      const delayYears = state.age - fullRetirementAge;
      const delayCredit = 0.08 * delayYears; // 8% per year
      state.socialSecurity.monthlyBenefit *= 1 + delayCredit;
    }

    // Apply early retirement reduction if applicable (about 5/9% per month before FRA)
    if (state.age < fullRetirementAge) {
      const earlyMonths = (fullRetirementAge - state.age) * 12;
      let reductionRate = 0;

      // First 36 months: 5/9% per month (6.67% per year)
      if (earlyMonths <= 36) {
        reductionRate = (earlyMonths * (5 / 9)) / 100;
      } else {
        // First 36 months at 5/9% per month
        reductionRate = (36 * (5 / 9)) / 100;
        // Additional months at 5/12% per month (5% per year)
        reductionRate += ((earlyMonths - 36) * (5 / 12)) / 100;
      }

      state.socialSecurity.monthlyBenefit *= 1 - reductionRate;
    }
  }

  // Process survivor benefits if applicable (when one spouse dies)
  if (
    state.isDeceased &&
    !state.spouseDeceased &&
    !state.socialSecurity.isSpouseBenefit
  ) {
    // Calculate survivor benefit (typically the higher of the two benefits)
    const survivorBenefit =
      state.socialSecurity.primaryInsuranceAmount *
      state.socialSecurity.survivorBenefitMultiplier;

    // Only switch to survivor benefit if it's higher than current benefit
    if (survivorBenefit > state.socialSecurity.monthlyBenefit) {
      state.socialSecurity.monthlyBenefit = survivorBenefit;
      state.socialSecurity.isSpouseBenefit = true;
    }

    // When one spouse dies, change filing status to single
    if (!state.isDeceased || !state.spouseDeceased) {
      state.filingStatus = "single";
    }
  }

  // Calculate taxable portion of Social Security using the IRS rules
  if (state.socialSecurity.isStarted) {
    const annualSS = state.socialSecurity.monthlyBenefit * 12;

    // Use the proper IRS calculation
    const taxableSS = calculateTaxableSocialSecurity(
      annualSS,
      state.curYearIncome
    );

    // Calculate the percentage for tracking
    state.ssTaxablePercentage = annualSS > 0 ? taxableSS / annualSS : 0;

    // Add Social Security income to cash
    state.cash += annualSS;
    state.curYearSS = annualSS;
  }
}

function calculateTaxableSocialSecurity(ssIncome, otherIncome) {
  // Implement the correct calculation for social security taxation
  // Per IRS rules: https://www.ssa.gov/benefits/retirement/planner/taxes.html

  // Calculate combined income (adjusted gross income + nontaxable interest + 1/2 of Social Security benefits)
  const combinedIncome = otherIncome + ssIncome * 0.5;

  // For single filing status
  if (combinedIncome <= 25000) {
    return 0; // 0% of benefits are taxable
  } else if (combinedIncome <= 34000) {
    // Up to 50% of benefits may be taxable
    return Math.min(ssIncome * 0.5, (combinedIncome - 25000) * 0.5);
  } else {
    // Up to 85% of benefits may be taxable
    const tier1Taxable = Math.min(ssIncome * 0.5, 4500); // 50% of the income between $25,000 and $34,000
    const tier2Taxable = Math.min(
      ssIncome * 0.85,
      tier1Taxable + (combinedIncome - 34000) * 0.85
    );
    return tier2Taxable;
  }

  // Note: For married filing jointly, the thresholds would be $32,000 and $44,000
  // This function should be expanded to handle married filing jointly status
}