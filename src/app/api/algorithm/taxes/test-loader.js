import { loadTaxBracketsFromYaml } from './TaxBracketsLoader';
import path from 'path';

async function testLoader() {
    try {
        // Get the path to your state tax data file
        const filePath = path.join(process.cwd(), 'state_tax_data.yaml');
        console.log('Loading tax data from:', filePath);

        // Load and parse the tax data
        const taxData = loadTaxBracketsFromYaml(filePath);

        // Print basic validation
        console.log('\n✅ Successfully loaded tax data');
        console.log('States found:', Object.keys(taxData).join(', '));

        // For each state, show the years and filing statuses
        for (const [state, stateData] of Object.entries(taxData)) {
            console.log(`\n📊 ${state} State Data:`);
            const years = Object.keys(stateData);
            console.log('Years:', years.join(', '));

            // Show filing statuses for the first year
            const firstYear = years[0];
            console.log(`\nFiling statuses for ${firstYear}:`);
            const filingStatuses = Object.keys(stateData[firstYear]);
            console.log(filingStatuses.join(', '));

            // Show first bracket for each filing status
            console.log('\nFirst bracket for each filing status:');
            for (const status of filingStatuses) {
                const brackets = stateData[firstYear][status];
                if (brackets && brackets.length > 0) {
                    console.log(`\n${status}:`, JSON.stringify(brackets[0], null, 2));
                }
            }
        }

    } catch (error) {
        console.error('\n❌ Error loading tax data:');
        console.error(error.message);
        if (error.stack) {
            console.error('\nStack trace:');
            console.error(error.stack);
        }
    }
}

// Run the test
testLoader(); 