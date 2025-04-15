const axios = require('axios');
const fs = require('fs');
const yaml = require('yaml');

// Mock the axios get request
const mockTaxData = {
    "single": {
        "income_tax": {
            "brackets": [
                { "rate": 10, "min": 0, "max": 11600 },
                { "rate": 12, "min": 11600, "max": 47150 },
                { "rate": 22, "min": 47150, "max": 100525 }
            ]
        },
        "capital_gains": {
            "brackets": [
                { "rate": 0, "min": 0, "max": 44625 },
                { "rate": 15, "min": 44625, "max": 492300 },
                { "rate": 20, "min": 492300, "max": "no_limit" }
            ]
        },
        "standard_deduction": 14600
    },
    "married-joint": {
        "income_tax": {
            "brackets": [
                { "rate": 10, "min": 0, "max": 23200 },
                { "rate": 12, "min": 23200, "max": 94300 },
                { "rate": 22, "min": 94300, "max": 201050 }
            ]
        },
        "capital_gains": {
            "brackets": [
                { "rate": 0, "min": 0, "max": 89250 },
                { "rate": 15, "min": 89250, "max": 553850 },
                { "rate": 20, "min": 553850, "max": "no_limit" }
            ]
        },
        "standard_deduction": 29200
    }
};

// Mock state tax data
const mockStateTaxData = {
    "NY": [
        { "rate": 4, "min": 0, "max": 8500 },
        { "rate": 4.5, "min": 8500, "max": 11700 },
        { "rate": 5.25, "min": 11700, "max": 13900 }
    ],
    "NJ": [
        { "rate": 1.4, "min": 0, "max": 20000 },
        { "rate": 1.75, "min": 20000, "max": 35000 },
        { "rate": 3.5, "min": 35000, "max": 40000 }
    ],
    "CT": [
        { "rate": 3, "min": 0, "max": 10000 },
        { "rate": 5, "min": 10000, "max": 50000 },
        { "rate": 5.5, "min": 50000, "max": 100000 }
    ]
};

// Write mock state tax data to a file
fs.writeFileSync('state-tax.yaml', yaml.dump(mockStateTaxData));

async function loadTaxData() {
    try {
        // Use mock data instead of making API call
        const federalTaxData = mockTaxData;

        // Dictionaries to store federal tax data by filing status.
        let taxBrackets = {};
        let capitalGainsTax = {};
        let standardDeductions = {};

        // Process each filing status
        const filingStatuses = ['single', 'married-joint'];
        filingStatuses.forEach(status => {
            // Income Tax Brackets
            taxBrackets[status] = federalTaxData[status].income_tax.brackets;
            // Capital Gains Tax Brackets
            capitalGainsTax[status] = federalTaxData[status].capital_gains.brackets;
            // Standard Deductions
            standardDeductions[status] = federalTaxData[status].standard_deduction;
        });

        // Load state tax data from YAML
        const stateTaxBrackets = mockStateTaxData;

        return { taxBrackets, capitalGainsTax, standardDeductions, stateTaxBrackets };
    } catch (error) {
        console.error('Error loading tax data:', error);
        throw error;
    }
}

async function testLoadTaxData() {
    try {
        console.log('🔄 Testing loadTaxData function...');

        const taxData = await loadTaxData();

        console.log('\n📊 Tax Data Results:');
        console.log('-------------------');

        // Test tax brackets
        console.log('\n1. Tax Brackets:');
        Object.entries(taxData.taxBrackets).forEach(([status, brackets]) => {
            console.log(`\n${status}:`);
            brackets.forEach(bracket => {
                console.log(`  - Rate: ${bracket.rate}%, Min: ${bracket.min}, Max: ${bracket.max}`);
            });
        });

        // Test capital gains tax
        console.log('\n2. Capital Gains Tax:');
        Object.entries(taxData.capitalGainsTax).forEach(([status, brackets]) => {
            console.log(`\n${status}:`);
            brackets.forEach(bracket => {
                console.log(`  - Rate: ${bracket.rate}%, Min: ${bracket.min}, Max: ${bracket.max}`);
            });
        });

        // Test standard deductions
        console.log('\n3. Standard Deductions:');
        Object.entries(taxData.standardDeductions).forEach(([status, amount]) => {
            console.log(`  ${status}: $${amount}`);
        });

        // Test state tax brackets
        console.log('\n4. State Tax Brackets:');
        Object.entries(taxData.stateTaxBrackets).forEach(([state, brackets]) => {
            console.log(`\n${state}:`);
            brackets.forEach(bracket => {
                console.log(`  - Rate: ${bracket.rate}%, Min: ${bracket.min}, Max: ${bracket.max}`);
            });
        });

        console.log('\n✅ Test completed successfully!');

    } catch (error) {
        console.error('❌ Error in test:', error);
    } finally {
        // Clean up: remove the temporary YAML file
        try {
            fs.unlinkSync('state-tax.yaml');
        } catch (err) {
            console.error('Error cleaning up:', err);
        }
    }
}

// Run the test
testLoadTaxData(); 