// Calculate taxes based on income and capital gains
import { calculateTaxableSocialSecurity } from '../events/Income.js';
export function calculateTaxes(state, taxBrackets) {
    // Use inflation adjusted brackets if available
    const brackets = state.inflationAdjustedTaxBrackets || taxBrackets;
  
    // Calculate income subject to tax
    let taxableIncome = state.curYearIncome;
  
    // Add taxable portion of Social Security
    if (state.socialSecurity.isStarted) {
      const annualSS = state.socialSecurity.monthlyBenefit * 12;
      const taxableSS = annualSS * state.ssTaxablePercentage;
      taxableIncome += taxableSS;
    }
  
    // Apply standard deduction (inflation adjusted)
    // const federalStandardDeduction =
    //   13850 * Math.pow(1 + state.inflationRate, state.age - 65);
    // taxableIncome = Math.max(0, taxableIncome - federalStandardDeduction);
  
    // Apply standard deduction based on filing status (2024 values)
    let federalStandardDeduction;
    switch (state.filingStatus) {
      case "married-joint":
      case "qualifying-widow":
        federalStandardDeduction = 29200;
        // Add senior addition if applicable (2024: $1,550 per spouse over 65)
        if (state.age >= 65) federalStandardDeduction += 1550;
        if (
          state.isMarried &&
          !state.spouseDeceased &&
          (state.spouseAge || state.age) >= 65
        )
          federalStandardDeduction += 1550;
        break;
      case "head-of-household":
        federalStandardDeduction = 21900;
        // Add senior addition if applicable (2024: $1,950 for HoH over 65)
        if (state.age >= 65) federalStandardDeduction += 1950;
        break;
      case "married-separate":
      case "single":
      default:
        federalStandardDeduction = 14600;
        // Add senior addition if applicable (2024: $1,950 for single over 65)
        if (state.age >= 65) federalStandardDeduction += 1950;
    }
  
    // Apply inflation adjustment from base year (2024)
    const baseYear = 2024;
    const yearsOfInflation = Math.max(0, new Date().getFullYear() - baseYear);
    if (yearsOfInflation > 0) {
      federalStandardDeduction *= Math.pow(
        1 + state.inflationRate,
        yearsOfInflation
      );
    }
  
    taxableIncome = Math.max(0, taxableIncome - federalStandardDeduction);
    // Calculate federal income tax on ordinary income
    let federalIncomeTax = calculateProgressiveTax(taxableIncome, brackets);
  
    // Calculate capital gains tax
    let capitalGainsTax = calculateCapitalGainsTax(
      state.curYearGains,
      state.federalCapitalGainsBrackets
    );
  
    // Calculate state income tax
    let stateIncomeTaxableIncome = Math.max(
      0,
      state.curYearIncome - state.stateStandardDeduction
    );
    let stateIncomeTax = calculateProgressiveTax(
      stateIncomeTaxableIncome,
      state.stateTaxBrackets
    );
  
    // Calculate state capital gains tax
    let stateCapitalGainsTax = calculateProgressiveTax(
      state.curYearGains,
      state.stateCapitalGainsBrackets
    );
  
    // Calculate early withdrawal penalty if applicable
    let earlyWithdrawalPenalty = state.curYearEarlyWithdrawals * 0.1;
  
    // Calculate taxable portion of social security benefits
    if (state.curYearSS > 0) {
      // Calculate other income (all income except social security)
      const otherIncome = state.curYearIncome - state.curYearSS;
  
      // Determine taxable portion of social security
      const taxableSS = calculateTaxableSocialSecurity(
        state.curYearSS,
        otherIncome
      );
  
      // Adjust current year income to include taxable social security
      state.curYearIncome = otherIncome + taxableSS;
      state.ssTaxablePercentage = taxableSS / state.curYearSS;
    }
  
    // Continue with tax calculation using adjusted income
    // Total tax due
    const totalTaxDue =
      federalIncomeTax +
      capitalGainsTax +
      stateIncomeTax +
      stateCapitalGainsTax +
      earlyWithdrawalPenalty;
  
    // Update state for next year
    state.curYearTaxDue = totalTaxDue;
    state.previousYearTaxDue = state.curYearTaxDue;
    state.previousYearIncome = state.curYearIncome;
    state.previousYearSS = state.curYearSS;
    state.previousYearGains = state.curYearGains;
    state.previousYearEarlyWithdrawals = state.curYearEarlyWithdrawals;
  
    // Reset current year trackers for next year
    state.curYearIncome = 0;
    state.curYearSS = 0;
    state.curYearGains = 0;
    state.curYearEarlyWithdrawals = 0;
    state.curYearPreTaxContribution = 0;
    state.curYearAfterTaxContribution = 0;
  
    return totalTaxDue;
  }

  // Calculate tax using progressive brackets
export function calculateProgressiveTax(amount, brackets) {
    if (amount <= 0) return 0;
  
    let tax = 0;
    let remaining = amount;
  
    for (const bracket of brackets) {
      if (remaining <= 0) break;
  
      const lower = bracket.lower;
      const upper = bracket.upper;
      const rate = bracket.rate;
  
      // Calculate amount taxed in this bracket
      const taxableInBracket = Math.min(remaining, upper - lower);
  
      // Add tax for this bracket
      tax += taxableInBracket * rate;
  
      // Reduce remaining amount
      remaining -= taxableInBracket;
    }
  
    return tax;
  }
  
// Calculate capital gains tax
export function calculateCapitalGainsTax(gains, capitalGainsBrackets) {
  if (gains <= 0) return 0;

  // Use progressive capital gains brackets
  return calculateProgressiveTax(gains, capitalGainsBrackets);
}

  // Tax-efficient asset location
export function getTaxEfficientLocation(state, assetAllocation) {
    // Calculate total portfolio value
    const totalValue = state.investments.reduce(
      (sum, inv) => sum + inv.balance,
      0
    );
  
    // Define tax-efficiency preferences (higher = more tax-efficient)
    const taxEfficiency = {
      stock: 2, // More tax-efficient (growth, qualified dividends)
      bond: 1, // Less tax-efficient (interest income)
    };
  
    // Calculate target dollars for each asset type
    const targetDollars = {
      stock: totalValue * assetAllocation.stock,
      bond: totalValue * assetAllocation.bond,
    };
  
    // Calculate space in each account type
    const accountSpace = {
      "after-tax": state.investments
        .filter((inv) => inv.taxStatus === "after-tax")
        .reduce((sum, inv) => sum + inv.balance, 0),
      "pre-tax": state.investments
        .filter((inv) => inv.taxStatus === "pre-tax")
        .reduce((sum, inv) => sum + inv.balance, 0),
      "non-retirement": state.investments
        .filter((inv) => inv.taxStatus === "non-retirement")
        .reduce((sum, inv) => sum + inv.balance, 0),
    };
  
    // Target allocation by account and asset type
    const targetAllocation = {
      // Put stocks in Roth first, then taxable, then pre-tax
      "after-tax": {
        stock: Math.min(targetDollars.stock, accountSpace["after-tax"]),
        bond: 0,
      },
      // Put bonds in pre-tax first
      "pre-tax": {
        bond: Math.min(targetDollars.bond, accountSpace["pre-tax"]),
        stock: Math.max(
          0,
          accountSpace["pre-tax"] -
            Math.min(targetDollars.bond, accountSpace["pre-tax"])
        ),
      },
      // Use taxable for overflow
      "non-retirement": {
        stock: Math.max(
          0,
          targetDollars.stock -
            targetAllocation["after-tax"].stock -
            targetAllocation["pre-tax"].stock
        ),
        bond: Math.max(0, targetDollars.bond - targetAllocation["pre-tax"].bond),
      },
    };
  
    return targetAllocation;
  }

  // Tax-efficient asset location
export function getTaxEfficientLocation(state, assetAllocation) {
    // Calculate total portfolio value
    const totalValue = state.investments.reduce(
      (sum, inv) => sum + inv.balance,
      0
    );
  
    // Define tax-efficiency preferences (higher = more tax-efficient)
    const taxEfficiency = {
      stock: 2, // More tax-efficient (growth, qualified dividends)
      bond: 1, // Less tax-efficient (interest income)
    };
  
    // Calculate target dollars for each asset type
    const targetDollars = {
      stock: totalValue * assetAllocation.stock,
      bond: totalValue * assetAllocation.bond,
    };
  
    // Calculate space in each account type
    const accountSpace = {
      "after-tax": state.investments
        .filter((inv) => inv.taxStatus === "after-tax")
        .reduce((sum, inv) => sum + inv.balance, 0),
      "pre-tax": state.investments
        .filter((inv) => inv.taxStatus === "pre-tax")
        .reduce((sum, inv) => sum + inv.balance, 0),
      "non-retirement": state.investments
        .filter((inv) => inv.taxStatus === "non-retirement")
        .reduce((sum, inv) => sum + inv.balance, 0),
    };
  
    // Target allocation by account and asset type
    const targetAllocation = {
      // Put stocks in Roth first, then taxable, then pre-tax
      "after-tax": {
        stock: Math.min(targetDollars.stock, accountSpace["after-tax"]),
        bond: 0,
      },
      // Put bonds in pre-tax first
      "pre-tax": {
        bond: Math.min(targetDollars.bond, accountSpace["pre-tax"]),
        stock: Math.max(
          0,
          accountSpace["pre-tax"] -
            Math.min(targetDollars.bond, accountSpace["pre-tax"])
        ),
      },
      // Use taxable for overflow
      "non-retirement": {
        stock: Math.max(
          0,
          targetDollars.stock -
            targetAllocation["after-tax"].stock -
            targetAllocation["pre-tax"].stock
        ),
        bond: Math.max(0, targetDollars.bond - targetAllocation["pre-tax"].bond),
      },
    };
  
    return targetAllocation;
  }

  