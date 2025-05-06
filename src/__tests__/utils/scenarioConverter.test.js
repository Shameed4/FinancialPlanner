// Implemented with the help of Cursor AI
const { jsonToYaml, yamlToJson, validateScenario, reorderProperties } = require('../../utils/scenarioConverter');
const testScenario = require('./fixtures/testScenario');

describe('Scenario Converter', () => {
    describe('JSON to YAML conversion', () => {
        it('should convert JSON to valid YAML format', () => {
            const yamlOutput = jsonToYaml(testScenario);
            expect(yamlOutput).toBeDefined();
            expect(typeof yamlOutput).toBe('string');
            expect(yamlOutput).toContain('name: sean scenario');
            expect(yamlOutput).toContain('forIndividual: true');
            expect(yamlOutput).toMatch(/assetTypes:\s*-/); // Check array formatting
        });

        it('should handle nested objects and arrays', () => {
            const yamlOutput = jsonToYaml(testScenario);
            expect(yamlOutput).toContain('assetTypes:');
            expect(yamlOutput).toContain('  - name: abc');
            expect(yamlOutput).toContain('investments:');
            expect(yamlOutput).toContain('eventSeries:');
        });

        it('should preserve number types', () => {
            const yamlOutput = jsonToYaml(testScenario);
            const backToJson = yamlToJson(yamlOutput);
            expect(typeof backToJson.userBirthYear).toBe('number');
            expect(typeof backToJson.userLifeExpectancyMean).toBe('number');
        });

        it('should handle empty or null values', () => {
            const testData = {
                ...testScenario,
                emptyField: '',
                nullField: null,
                undefinedField: undefined
            };
            const yamlOutput = jsonToYaml(testData);
            const backToJson = yamlToJson(yamlOutput);
            expect(backToJson.emptyField).toBe('');
            expect(backToJson.nullField).toBeNull();
            expect(backToJson.undefinedField).toBeUndefined();
        });
    });

    describe('YAML to JSON conversion', () => {
        it('should convert YAML back to valid JSON format', () => {
            const yamlOutput = jsonToYaml(testScenario);
            const jsonOutput = yamlToJson(yamlOutput);
            expect(jsonOutput).toBeDefined();
            expect(typeof jsonOutput).toBe('object');
            expect(jsonOutput.name).toBe(testScenario.name);
            expect(jsonOutput.forIndividual).toBe(testScenario.forIndividual);
        });

        it('should maintain data integrity through round-trip conversion', () => {
            const yamlOutput = jsonToYaml(testScenario);
            const jsonOutput = yamlToJson(yamlOutput);

            // Test all top-level properties
            Object.keys(testScenario).forEach(key => {
                expect(JSON.stringify(jsonOutput[key])).toBe(JSON.stringify(testScenario[key]));
            });

            // Deep equality check
            expect(jsonOutput).toEqual(testScenario);
        });

        it('should preserve array structures', () => {
            const yamlOutput = jsonToYaml(testScenario);
            const jsonOutput = yamlToJson(yamlOutput);
            expect(Array.isArray(jsonOutput.assetTypes)).toBe(true);
            expect(Array.isArray(jsonOutput.investments)).toBe(true);
            expect(Array.isArray(jsonOutput.eventSeries)).toBe(true);
            expect(jsonOutput.assetTypes.length).toBe(testScenario.assetTypes.length);
        });

        it('should handle undefined YAML content', () => {
            const jsonOutput = yamlToJson('');
            expect(jsonOutput).toEqual({});
        });

        it('should handle non-string YAML input', () => {
            expect(() => yamlToJson(123)).toThrow('Failed to parse YAML');
            expect(() => yamlToJson(null)).toThrow('Failed to parse YAML');
            expect(() => yamlToJson(undefined)).toThrow('Failed to parse YAML');
            expect(() => yamlToJson({})).toThrow('Failed to parse YAML');
        });

        it('should handle YAML with only comments', () => {
            const yamlWithComments = `
# This is a comment
# Another comment
`;
            const jsonOutput = yamlToJson(yamlWithComments);
            expect(jsonOutput).toEqual(null);
        });
    });

    describe('Scenario Validation', () => {
        it('should validate a correct scenario', () => {
            expect(() => validateScenario(testScenario)).not.toThrow();
        });

        it('should detect missing required fields', () => {
            const invalidScenario = { ...testScenario };
            delete invalidScenario.name;
            expect(() => validateScenario(invalidScenario))
                .toThrow('Missing or invalid required field: name');
        });

        it('should validate array fields', () => {
            const invalidScenario = {
                ...testScenario,
                assetTypes: 'not an array'
            };
            expect(() => validateScenario(invalidScenario))
                .toThrow('assetTypes must be an array');
        });

        it('should validate inflation assumption', () => {
            const invalidScenario = {
                ...testScenario,
                inflationAssumption: 'invalid'
            };
            expect(() => validateScenario(invalidScenario))
                .toThrow('Invalid inflation assumption: invalid');
        });

        it('should validate US state', () => {
            const invalidScenario = {
                ...testScenario,
                residenceState: 'XX'
            };
            expect(() => validateScenario(invalidScenario))
                .toThrow('Invalid US state: XX');
        });

        it('should validate null/undefined field values', () => {
            const invalidScenario = {
                ...testScenario,
                name: null
            };
            expect(() => validateScenario(invalidScenario))
                .toThrow('Missing or invalid required field: name');

            invalidScenario.name = undefined;
            expect(() => validateScenario(invalidScenario))
                .toThrow('Missing or invalid required field: name');
        });

        it('should validate investments array', () => {
            const invalidScenario = {
                ...testScenario,
                investments: 'not an array'
            };
            expect(() => validateScenario(invalidScenario))
                .toThrow('investments must be an array');
        });

        it('should validate eventSeries array', () => {
            const invalidScenario = {
                ...testScenario,
                eventSeries: 'not an array'
            };
            expect(() => validateScenario(invalidScenario))
                .toThrow('eventSeries must be an array');
        });

        it('should validate all required fields', () => {
            const requiredFields = [
                'name',
                'forIndividual',
                'userBirthYear',
                'userLifeExpectancyMean',
                'userLifeExpectancyStd',
                'assetTypes',
                'investments',
                'eventSeries',
                'inflationAssumption',
                'residenceState',
                'financialGoal',
                'initialAfterTaxRetirementContributionLimit'
            ];

            for (const field of requiredFields) {
                const invalidScenario = { ...testScenario };
                delete invalidScenario[field];
                expect(() => validateScenario(invalidScenario))
                    .toThrow(`Missing or invalid required field: ${field}`);
            }
        });
    });

    describe('Property Reordering', () => {
        it('should reorder properties according to specified order', () => {
            const order = ['name', 'forIndividual', 'userBirthYear'];
            const reordered = reorderProperties(testScenario, order);
            const keys = Object.keys(reordered);
            expect(keys[0]).toBe('name');
            expect(keys[1]).toBe('forIndividual');
            expect(keys[2]).toBe('userBirthYear');
        });

        it('should handle missing properties in order array', () => {
            const order = ['name', 'nonexistentField', 'forIndividual'];
            const reordered = reorderProperties(testScenario, order);
            expect(Object.keys(reordered)).toEqual(['name', 'forIndividual']);
        });

        it('should handle empty order array', () => {
            const reordered = reorderProperties(testScenario, []);
            expect(Object.keys(reordered)).toHaveLength(0);
        });
    });

    describe('Edge Cases and Error Handling', () => {
        it('should handle empty objects', () => {
            const yamlOutput = jsonToYaml({});
            const jsonOutput = yamlToJson(yamlOutput);
            expect(jsonOutput).toEqual({});
        });

        it('should handle deeply nested structures', () => {
            const deepObject = {
                level1: {
                    level2: {
                        level3: {
                            value: 'deep',
                            array: [1, 2, { nested: 'value' }]
                        }
                    }
                }
            };
            const yamlOutput = jsonToYaml(deepObject);
            const jsonOutput = yamlToJson(yamlOutput);
            expect(jsonOutput).toEqual(deepObject);
        });

        it('should handle special characters in strings', () => {
            const specialChars = {
                name: 'Test: with: colons',
                description: `Line 1
                Line 2
                Line 3`,
                symbols: '!@#$%^&*()'
            };
            const yamlOutput = jsonToYaml(specialChars);
            const jsonOutput = yamlToJson(yamlOutput);
            expect(jsonOutput).toEqual(specialChars);
        });

        it('should throw error for invalid YAML', () => {
            const invalidYaml = `
                invalid:
                - not properly formatted
                    yaml: content
            `;
            expect(() => yamlToJson(invalidYaml)).toThrow();
        });
    });
}); 