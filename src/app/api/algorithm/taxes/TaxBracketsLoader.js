import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export async function loadTaxBracketsFromYaml(source, isFilePath = true) {
    try {
        let fileContent;

        if (isFilePath) {
            if (!fs.existsSync(source)) {
                throw new Error(`Tax brackets file not found at: ${source}`);
            }
            fileContent = await fs.promises.readFile(source, 'utf8');
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

        // Validate state tax structure
        for (const stateCode of Object.keys(taxBrackets)) {
            if (stateCode.length !== 2 || stateCode !== stateCode.toUpperCase()) {
                throw new Error(`Invalid state code format: ${stateCode}`);
            }

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
                    'married_jointly_or_surviving_spouse',  // maps to "married filing jointly"
                    'single_or_married_separately'          // maps to "single"
                ];

                for (const status of requiredStatuses) {
                    if (!yearData[status] || !Array.isArray(yearData[status])) {
                        throw new Error(`Missing or invalid ${status} data for ${stateCode} ${year}`);
                    }

                    for (const bracket of yearData[status]) {
                        // Validate required fields for simplified format
                        if (!('over' in bracket)) {
                            throw new Error(`Missing lower bound (over) in bracket for ${stateCode} ${year} ${status}`);
                        }
                        if (!('but_not_over' in bracket)) {
                            throw new Error(`Missing upper bound (but_not_over) in bracket for ${stateCode} ${year} ${status}`);
                        }
                        if (!('rate' in bracket)) {
                            throw new Error(`Missing rate in bracket for ${stateCode} ${year} ${status}`);
                        }

                        // Validate numeric fields
                        const value = bracket.rate;
                        if (typeof value !== 'number' || isNaN(value)) {
                            throw new Error(`Rate must be a number in bracket for ${stateCode} ${year} ${status}`);
                        }

                        // Validate bounds
                        if (bracket.over !== null && (typeof bracket.over !== 'number' || isNaN(bracket.over))) {
                            throw new Error(`Lower bound (over) must be null or a number in bracket for ${stateCode} ${year} ${status}`);
                        }
                        if (bracket.but_not_over !== null && (typeof bracket.but_not_over !== 'number' || isNaN(bracket.but_not_over))) {
                            throw new Error(`Upper bound (but_not_over) must be null or a number in bracket for ${stateCode} ${year} ${status}`);
                        }

                        // Convert null values to appropriate bounds
                        if (bracket.over === null) {
                            bracket.over = 0;
                        }
                        if (bracket.but_not_over === null) {
                            bracket.but_not_over = Infinity;
                        }
                    }

                    // Sort brackets by lower bound
                    yearData[status].sort((a, b) => a.over - b.over);
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

export async function loadUserStateTaxBrackets(userId) {
    const filePath = getUserStateTaxBracketsFilePath(userId);
    return await loadTaxBracketsFromYaml(filePath, true);
}

export async function loadUploadedStateTaxBrackets(yamlContent) {
    return await loadTaxBracketsFromYaml(yamlContent, false);
}

export async function loadDefaultTaxBrackets() {
    const filePath = getTaxBracketsFilePath();
    return await loadTaxBracketsFromYaml(filePath, true);
} 