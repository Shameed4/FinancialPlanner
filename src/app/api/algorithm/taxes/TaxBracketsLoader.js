import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';


export function loadTaxBracketsFromYaml(source, isFilePath = true) {
    try {
        let fileContent;

        if (isFilePath) {
            if (!fs.existsSync(source)) {
                throw new Error(`Tax brackets file not found at: ${source}`);
            }
            fileContent = fs.readFileSync(source, 'utf8');
        } else {
            if (typeof source === 'string' || Buffer.isBuffer(source)) {
                fileContent = source.toString();
            } else {
                throw new Error('Invalid source: must be a file path or YAML content');
            }
        }

        let taxBrackets;
        try {
            taxBrackets = yaml.load(fileContent);
        } catch (yamlError) {
            throw new Error(`Invalid YAML content: ${yamlError.message}`);
        }

        if (!taxBrackets || typeof taxBrackets !== 'object') {
            throw new Error('Invalid YAML structure: root must be an object');
        }

        const isStateTaxFile = Object.keys(taxBrackets).some(key =>
            key.length === 2 && key === key.toUpperCase()
        );

        if (isStateTaxFile) {
            for (const stateCode of Object.keys(taxBrackets)) {
                const stateData = taxBrackets[stateCode];
                if (!stateData || typeof stateData !== 'object') {
                    throw new Error(`Invalid state data structure for ${stateCode}`);
                }

                const years = Object.keys(stateData);
                if (years.length === 0) {
                    throw new Error(`No year data found for state ${stateCode}`);
                }

                for (const year of years) {
                    const yearData = stateData[year];
                    const requiredStatuses = [
                        'married_jointly_or_surviving_spouse',
                        'single_or_married_separately',
                        'head_of_household'
                    ];

                    for (const status of requiredStatuses) {
                        if (!yearData[status] || !Array.isArray(yearData[status])) {
                            throw new Error(`Missing or invalid ${status} data for ${stateCode} ${year}`);
                        }

                        for (const bracket of yearData[status]) {
                            const requiredFields = [
                                'over',
                                'but_not_over',
                                'base_tax',
                                'plus',
                                'rate',
                                'of_excess_over'
                            ];

                            for (const field of requiredFields) {
                                if (!(field in bracket)) {
                                    throw new Error(`Missing required field ${field} in bracket for ${stateCode} ${year} ${status}`);
                                }
                            }
                        }
                    }
                }
            }
        } else {
            const requiredStatuses = ['single', 'married-joint', 'married-separate', 'head-of-household'];
            for (const status of requiredStatuses) {
                if (!taxBrackets[status]) {
                    throw new Error(`Missing required filing status: ${status}`);
                }

                const statusData = taxBrackets[status];
                if (!statusData.income_tax || !statusData.capital_gains || statusData.standard_deduction === undefined) {
                    throw new Error(`Invalid structure for filing status: ${status}`);
                }

                if (!Array.isArray(statusData.income_tax.brackets) || !Array.isArray(statusData.capital_gains.brackets)) {
                    throw new Error(`Invalid brackets structure for filing status: ${status}`);
                }
            }
        }

        return taxBrackets;
    } catch (error) {
        console.error('Error loading tax brackets:', error.message);
        throw error;
    }
}


export function getYamlFilePath(filename) {
    return path.join(process.cwd(), filename);
}

export function getTaxBracketsFilePath() {
    return getYamlFilePath('tax_brackets.yaml');
}

export function getUserStateTaxBracketsFilePath(userId) {
    return path.join(process.cwd(), 'user_data', userId, 'state_tax_brackets.yaml');
}


export function loadUserStateTaxBrackets(userId) {
    const filePath = getUserStateTaxBracketsFilePath(userId);
    return loadTaxBracketsFromYaml(filePath, true);
}


export function loadUploadedStateTaxBrackets(yamlContent) {
    return loadTaxBracketsFromYaml(yamlContent, false);
}


export function loadDefaultTaxBrackets() {
    const filePath = getTaxBracketsFilePath();
    return loadTaxBracketsFromYaml(filePath, true);
} 