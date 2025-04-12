import { updateBalances } from '../GlobalFunctions.js'

export function getLatestRMDFactors() {
  // This would typically fetch from IRS API or database
  // For now, we'll use the 2024 RMD table as an example
  return {
    72: 27.4,
    73: 26.5,
    74: 25.5,
    75: 24.6,
    76: 23.7,
    77: 22.9,
    78: 22.0,
    79: 21.1,
    80: 20.2,
    81: 19.4,
    82: 18.5,
    83: 17.7,
    84: 16.8,
    85: 16.0,
    86: 15.2,
    87: 14.4,
    88: 13.7,
    89: 12.9,
    90: 12.2,
    91: 11.5,
    92: 10.8,
    93: 10.1,
    94: 9.5,
    95: 8.9,
    96: 8.3,
    97: 7.7,
    98: 7.2,
    99: 6.7,
    100: 6.2,
    101: 5.7,
    102: 5.3,
    103: 4.9,
    104: 4.5,
    105: 4.2,
    106: 3.9,
    107: 3.6,
    108: 3.3,
    109: 3.0,
    110: 2.8,
    111: 2.6,
    112: 2.4,
    113: 2.2,
    114: 2.0,
    115: 1.9,
    116: 1.8,
    117: 1.7,
    118: 1.6,
    119: 1.5,
    120: 1.4,
  };
}

export function getRMDFactor(age, rmdTable) {
  const ages = Object.keys(rmdTable)
    .map(Number)
    .sort((a, b) => a - b);
  const closestAge = ages.find((a) => a >= age) || Math.max(...ages);
  return rmdTable[closestAge];
}

export function calculateRMD(state, params) {
  // First RMD is for age 73, paid in age 74
  if (state.age < 74) return 0;

  // Get the RMD distribution factor based on age
  const rmdFactor = getRMDFactor(state.age, state.rmdTable);

  // Calculate RMD based on previous year-end balances of pre-tax investments only
  // If this is the first year, we don't have previous year balances, so use current
  let preTaxBalance = 0;

  // Sum up all pre-tax investment balances
  state.investments.forEach((inv) => {
    if (inv.taxStatus === "pre-tax") {
      // Use previous year-end balance if available
      if (
        state.previousYearInvestmentBalances &&
        state.previousYearInvestmentBalances[inv.id]
      ) {
        preTaxBalance += state.previousYearInvestmentBalances[inv.id];
      } else {
        preTaxBalance += inv.balance;
      }
    }
  });

  // Calculate the required minimum distribution
  const rmdAmount = preTaxBalance / rmdFactor;

  // Process the RMD according to the specified strategy
  processRMDWithdrawal(state, rmdAmount, params);

  return rmdAmount;
}

function processRMDWithdrawal(state, rmdAmount, params) {
  if (rmdAmount <= 0) return;

  // Default strategy: Withdraw proportionally from all pre-tax investments
  if (!state.rmdStrategy || state.rmdStrategy.length === 0) {
    // Calculate total pre-tax balance
    const totalPreTaxBalance = state.investments
      .filter((inv) => inv.taxStatus === "pre-tax")
      .reduce((sum, inv) => sum + inv.balance, 0);

    if (totalPreTaxBalance <= 0) return;

    // Withdraw proportionally from each pre-tax investment
    state.investments.forEach((inv) => {
      if (inv.taxStatus === "pre-tax") {
        const portion = inv.balance / totalPreTaxBalance;
        const withdrawalAmount = rmdAmount * portion;

        // Reduce the investment balance
        inv.balance -= withdrawalAmount;

        // Add to cash and income
        state.cash += withdrawalAmount;
        state.curYearIncome += withdrawalAmount;
      }
    });
  } else {
    // Follow the specified RMD withdrawal strategy
    // ... implement strategy-based withdrawal ...
  }

  // Update total balances
  updateBalances(state);
}