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

            const filingStatuses = Object.keys(stateData);
            if (filingStatuses.length === 0) {
                throw new Error(`No filing status data found for state ${stateCode}`);
            }

            for (const status of filingStatuses) {
                const brackets = stateData[status];
                if (!Array.isArray(brackets)) {
                    throw new Error(`Invalid brackets data for ${stateCode} ${status}`);
                }

                for (const bracket of brackets) {
                    // Validate required fields
                    if (!('min' in bracket)) {
                        throw new Error(`Missing lower bound (min) in bracket for ${stateCode} ${status}`);
                    }
                    if (!('max' in bracket)) {
                        throw new Error(`Missing upper bound (max) in bracket for ${stateCode} ${status}`);
                    }
                    if (!('rate' in bracket)) {
                        throw new Error(`Missing rate in bracket for ${stateCode} ${status}`);
                    }

                    // Validate and convert rate
                    const rateStr = bracket.rate;
                    if (typeof rateStr !== 'string' || !rateStr.endsWith('%')) {
                        throw new Error(`Rate must be a percentage string in bracket for ${stateCode} ${status}`);
                    }
                    bracket.rate = parseFloat(rateStr.replace('%', '')) / 100;

                    // Validate bounds
                    if (bracket.min !== null && (typeof bracket.min !== 'number' || isNaN(bracket.min))) {
                        throw new Error(`Lower bound (min) must be null or a number in bracket for ${stateCode} ${status}`);
                    }
                    if (bracket.max !== null && (typeof bracket.max !== 'number' || isNaN(bracket.max))) {
                        throw new Error(`Upper bound (max) must be null or a number in bracket for ${stateCode} ${status}`);
                    }

                    // Convert null values to appropriate bounds
                    if (bracket.min === null) {
                        bracket.min = 0;
                    }
                    if (bracket.max === null) {
                        bracket.max = Infinity;
                    }

                    // Rename fields to match expected format
                    bracket.over = bracket.min;
                    bracket.but_not_over = bracket.max;
                    delete bracket.min;
                    delete bracket.max;
                }

                // Sort brackets by lower bound
                brackets.sort((a, b) => a.over - b.over);
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