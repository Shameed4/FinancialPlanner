class FinancialState {
    constructor(age, taxable, ira, roth, income, expenses, taxRate, yearsToRetire) {
        this.age = age;
        this.taxable = {
            balance: taxable,
            costBasis: taxable,
            investments: [{ balance: taxable, purchaseYear: 0, type: "stock" }]
        };
        this.ira = {
            balance: ira,
            investments: [{ balance: ira, type: "pre-tax" }]
        };
        this.roth = {
            balance: roth,
            investments: []
        };
        this.income = income;
        this.expenses = typeof expenses === "number"
            ? { nonDiscretionary: expenses * 0.7, discretionary: expenses * 0.3 }
            : expenses;
        this.taxRate = taxRate;
        this.yearsUntilRetirement = yearsToRetire;
        this.capitalGains = 0;
        this.financialGoal = undefined;
    }
}

// IRS Uniform Lifetime Table (excerpt)
const RMD_TABLE = {
    72: 27.4, 75: 24.6, 80: 20.2, 85: 16.3, 90: 12.7, 95: 9.6, 100: 6.4
};

function getRMDFactor(age) {
    const eligibleAges = Object.keys(RMD_TABLE)
        .map(Number)
        .filter(a => a <= age);
    const closestAge = Math.max(...eligibleAges);
    return RMD_TABLE[closestAge];
}

// Helper Fucntions

function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function updateBalances(state) {
    state.taxable.balance = state.taxable.investments.reduce((sum, inv) => sum + inv.balance, 0);
    state.ira.balance = state.ira.investments.reduce((sum, inv) => sum + inv.balance, 0);
    state.roth.balance = state.roth.investments.reduce((sum, inv) => sum + inv.balance, 0);
}

function runIncomeEvents(state, params) {
    let taxableIncome = 0;
    state.taxable.investments.forEach(investment => {
        const totalReturn = investment.balance * params.marketReturn;
        const dividends = investment.balance * params.dividendYield;
        const growth = totalReturn - dividends;
        investment.balance += growth;
        taxableIncome += dividends;
    });

    [state.ira, state.roth].forEach(account => {
        account.investments.forEach(investment => {
            investment.balance *= (1 + params.marketReturn);
        });
    });

    state.income += taxableIncome;
    updateBalances(state);
}

function processInvestments(state, params) {
    let excessCash = state.taxable.balance - params.IRS_investment_limit;
    if (excessCash > 0) {
        state.taxable.investments.push({
            balance: excessCash,
            purchaseYear: state.age,
            type: "stock"
        });
        state.taxable.costBasis += excessCash;
        state.taxable.balance -= excessCash;
        updateBalances(state);
    }
}

function rebalancePortfolio(state, params) {
    const total = state.taxable.balance + state.ira.balance + state.roth.balance;
    if (total <= 0) return;
    const targetTaxable = total * params.targetAllocation.taxable;
    const targetIRA = total * params.targetAllocation.ira;
    const targetRoth = total * params.targetAllocation.roth;

    state.taxable.balance = targetTaxable;
    state.ira.balance = targetIRA;
    state.roth.balance = targetRoth;

    state.taxable.investments = [{ balance: targetTaxable, purchaseYear: state.age, type: "stock" }];
    state.ira.investments = [{ balance: targetIRA, type: "pre-tax" }];
    state.roth.investments = [{ balance: targetRoth, type: "roth" }];
}

// RMD

function calculateRMD(state, params) {
    const preTaxInvestments = state.ira.investments.filter(inv => inv.type === "pre-tax");
    let totalPreTax = preTaxInvestments.reduce((sum, inv) => sum + inv.balance, 0);
    if (totalPreTax <= 0) return 0;

    const factor = getRMDFactor(state.age);
    const rmd = totalPreTax / factor;

    preTaxInvestments.forEach(investment => {
        const proportion = investment.balance / totalPreTax;
        const withdrawal = rmd * proportion;
        investment.balance -= withdrawal;
    });

    state.income += rmd;
    updateBalances(state);
    return rmd;
}

function handleWithdrawals(state, params) {
    let remaining = state.expenses.nonDiscretionary;

    state.taxable.investments.sort((a, b) => a.purchaseYear - b.purchaseYear);
    for (let investment of state.taxable.investments) {
        if (remaining <= 0) break;
        const sellAmount = Math.min(investment.balance, remaining);
        const costBasisPortion = (investment.costBasis * sellAmount) / investment.balance;
        const gain = sellAmount - costBasisPortion;
        const cgTax = gain * params.capitalGainsTaxRate;
        state.capitalGains += gain;
        state.taxable.balance -= cgTax;
        investment.balance -= sellAmount;
        investment.costBasis -= costBasisPortion;
        remaining -= sellAmount;
    }

    if (remaining > 0) {
        const penaltyRate = (state.age < 59.5) ? 0.1 : 0;
        for (let investment of state.ira.investments) {
            if (remaining <= 0) break;
            if (investment.type !== "pre-tax") continue;
            const withdrawAmount = Math.min(investment.balance, remaining);
            investment.balance -= withdrawAmount;
            const penalty = withdrawAmount * penaltyRate;
            state.taxable.balance -= penalty;
            state.income += withdrawAmount;
            remaining -= withdrawAmount;
        }
    }

    if (remaining > 0) {
        const withdrawAmount = Math.min(state.roth.balance, remaining);
        state.roth.balance -= withdrawAmount;
        remaining -= withdrawAmount;
    }

    if (remaining > 0 && state.age < 59.5) {
        state.taxable.balance -= remaining * 1.10; // principal + 10% penalty
        remaining = 0;
    }

    updateBalances(state);

    // Phase 2: Discretionary expenses (only if financial goal permits spending).
    // For example, if total net worth exceeds a certain goal threshold.
    const netWorth = state.taxable.balance + state.ira.balance + state.roth.balance;
    if (state.financialGoal === undefined || netWorth > state.financialGoal) {
        remaining = state.expenses.discretionary;

        state.taxable.investments.sort((a, b) => a.purchaseYear - b.purchaseYear);
        for (let investment of state.taxable.investments) {
            if (remaining <= 0) break;
            const sellAmount = Math.min(investment.balance, remaining);
            const costBasisPortion = (investment.costBasis * sellAmount) / investment.balance;
            const gain = sellAmount - costBasisPortion;
            const cgTax = gain * params.capitalGainsTaxRate;
            state.capitalGains += gain;
            state.taxable.balance -= cgTax;
            investment.balance -= sellAmount;
            investment.costBasis -= costBasisPortion;
            remaining -= sellAmount;
        }

        if (remaining > 0) {
            const penaltyRate = (state.age < 59.5) ? 0.1 : 0;
            for (let investment of state.ira.investments) {
                if (remaining <= 0) break;
                if (investment.type !== "pre-tax") continue;
                const withdrawAmount = Math.min(investment.balance, remaining);
                investment.balance -= withdrawAmount;
                const penalty = withdrawAmount * penaltyRate;
                state.taxable.balance -= penalty;
                state.income += withdrawAmount;
                remaining -= withdrawAmount;
            }
        }

        if (remaining > 0) {
            const withdrawAmount = Math.min(state.roth.balance, remaining);
            state.roth.balance -= withdrawAmount;
            remaining -= withdrawAmount;
        }
        updateBalances(state);
    }
}

function findOptimalConversion(state, params, taxBrackets) {
    if (state.age >= 72) return 0;
    let bestAmount = 0;
    let bestValue = -Infinity;
    const maxConversion = Math.min(state.ira.balance, params.maxConversion);

    for (let amount = 0; amount <= maxConversion; amount += params.conversionStep) {
        let tempState = deepCopy(state);
        const totalIRA = tempState.ira.investments.reduce((sum, inv) => sum + inv.balance, 0);
        tempState.ira.investments.forEach(inv => {
            if (inv.type === "pre-tax") {
                const proportion = inv.balance / totalIRA;
                inv.balance -= amount * proportion;
            }
        });
        tempState.ira.balance -= amount;
        tempState.roth.balance += amount;
        tempState.income += amount;
        const taxCost = amount * getTaxRate(amount, taxBrackets);
        tempState.taxable.balance -= taxCost;
        updateBalances(tempState);
        let projectedValue = projectFuture(tempState, params);
        if (projectedValue > bestValue) {
            bestValue = projectedValue;
            bestAmount = amount;
        }
    }
    return bestAmount;
}

function projectFuture(state, params) {
    let tempState = deepCopy(state);
    for (let y = 0; y < params.projectionYears; y++) {
        tempState.age += 1;
        runIncomeEvents(tempState, {
            marketReturn: params.riskFreeRate,
            dividendYield: params.dividendYield
        });
        if (tempState.age >= 72) calculateRMD(tempState, params);
        updateBalances(tempState);
        if (tempState.taxable.balance < 0) break;
    }
    return tempState.taxable.balance + tempState.roth.balance +
        tempState.ira.balance * (1 - params.conservativeTaxRate);
}

function runSimulation(initialState, params, taxBrackets) {
    let state = deepCopy(initialState);
    let history = [];

    for (let year = 0; year < params.years; year++) {
        state.age += 1;

        applyInflation(state, params.inflation);
        runIncomeEvents(state, params);
        processContributions(state, params);
        handleWithdrawals(state, params);

        if (state.age < 72 && state.ira.balance > 0) {
            const optimalAmount = findOptimalConversion(state, params, taxBrackets);
            const totalIRA = state.ira.investments.reduce((sum, inv) => sum + inv.balance, 0);
            state.ira.investments.forEach(inv => {
                if (inv.type === "pre-tax") {
                    const proportion = inv.balance / totalIRA;
                    inv.balance -= optimalAmount * proportion;
                }
            });
            state.ira.balance -= optimalAmount;
            state.roth.balance += optimalAmount;
            state.income += optimalAmount;
            const taxCost = optimalAmount * getTaxRate(optimalAmount, taxBrackets);
            state.taxable.balance -= taxCost;
        }

        calculateTaxes(state, taxBrackets);
        if (state.age >= 72) calculateRMD(state, params);

        processInvestments(state, params);

        rebalancePortfolio(state, params);

        history.push(deepCopy(state));
    }

    return history;
}

function applyInflation(state, inflationRate) {
    state.taxable.balance /= (1 + inflationRate);
    state.ira.balance /= (1 + inflationRate);
    state.roth.balance /= (1 + inflationRate);
}

function processContributions(state, params) {
    if (state.yearsUntilRetirement > 0) {
        const taxableContribution = params.contribution.taxable || 0;
        const iraContribution = params.contribution.ira || 0;
        const rothContribution = params.contribution.roth || 0;

        state.taxable.balance += taxableContribution;
        state.taxable.investments.push({
            balance: taxableContribution,
            purchaseYear: state.age,
            type: "stock"
        });

        state.ira.balance += iraContribution;
        state.ira.investments.push({
            balance: iraContribution,
            type: "pre-tax"
        });

        state.roth.balance += rothContribution;
        state.roth.investments.push({
            balance: rothContribution,
            type: "roth"
        });
    }
    updateBalances(state);
}

function calculateTaxes(state, taxBrackets) {
    const taxDue = state.income * state.taxRate;
    state.taxable.balance -= taxDue;
    state.income = 0;
}

function getTaxRate(amount, taxBrackets) {
    return taxBrackets[0].rate || 0.22;
}

const initialState = new FinancialState(
    65,      // age
    50000,   // taxable account initial balance
    100000,  // IRA initial balance
    20000,   // Roth initial balance
    60000,   // annual income
    40000,   // annual expenses (will be split between non-discretionary & discretionary)
    0.22,    // current tax rate
    20       // years until retirement (for contributions, etc.)
);

// 2. Define simulation parameters.
const params = {
    years: 5,                  // run the simulation for 5 years
    inflation: 0.02,           // 2% annual inflation
    marketReturn: 0.05,        // 5% expected market return
    dividendYield: 0.02,       // 2% dividend yield for taxable investments
    riskFreeRate: 0.03,        // 3% risk-free rate for projections
    projectionYears: 10,       // projection horizon for optimizing Roth conversion
    conservativeTaxRate: 0.15, // conservative tax rate used in projections
    IRS_investment_limit: 20000,  // annual IRS investment limit for taxable accounts
    contribution: {
        taxable: 5000,   // annual taxable account contribution
        ira: 6000,       // annual IRA contribution
        roth: 4000       // annual Roth contribution
    },
    targetAllocation: {  // desired portfolio allocation for rebalancing
        taxable: 0.5,
        ira: 0.3,
        roth: 0.2
    },
    capitalGainsTaxRate: 0.15, // capital gains tax rate (15%)
    maxConversion: 20000,      // maximum amount allowed for a Roth conversion in a year
    conversionStep: 1000       // step size for discrete search in Roth conversion
};

// 3. Define tax brackets (a simple example with one bracket).
const taxBrackets = [
    { rate: 0.22 }  // Using a flat 22% tax rate for simplicity.
];

// 4. Run the simulation.
const simulationHistory = runSimulation(initialState, params, taxBrackets);

// 5. Output the simulation results.
console.log("Simulation History over", params.years, "years:");
simulationHistory.forEach((state, index) => {
    console.log(`Year ${index + 1}:`, state);
});