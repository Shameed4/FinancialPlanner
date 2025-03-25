// Implemented with the help of Cursor AI
const { jsonToYaml, yamlToJson } = require('../../utils/scenarioConverter');
const testScenario = require('./fixtures/testScenario');

describe('Scenario Converter', () => {
    describe('JSON to YAML conversion', () => {
        it('should convert JSON to YAML format', () => {
            const yamlOutput = jsonToYaml(testScenario);
            expect(yamlOutput).toBeDefined();
            expect(typeof yamlOutput).toBe('string');
            expect(yamlOutput).toContain('name: sean scenario');
            expect(yamlOutput).toContain('forIndividual: true');
        });
    });

    describe('YAML to JSON conversion', () => {
        it('should convert YAML back to JSON format', () => {
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
    });

    describe('Edge cases', () => {
        it('should handle empty objects', () => {
            const emptyObject = {};
            const yamlOutput = jsonToYaml(emptyObject);
            const jsonOutput = yamlToJson(yamlOutput);
            expect(jsonOutput).toEqual(emptyObject);
        });

        it('should handle null values', () => {
            const objectWithNull = {
                prop: null,
                nested: { value: null }
            };
            const yamlOutput = jsonToYaml(objectWithNull);
            const jsonOutput = yamlToJson(yamlOutput);
            expect(jsonOutput).toEqual(objectWithNull);
        });

        it('should handle arrays correctly', () => {
            const yamlOutput = jsonToYaml(testScenario);
            const jsonOutput = yamlToJson(yamlOutput);
            expect(jsonOutput.assetTypes).toBeInstanceOf(Array);
            expect(jsonOutput.assetTypes).toHaveLength(testScenario.assetTypes.length);
        });
    });
}); 