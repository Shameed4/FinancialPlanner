import { loadTaxBracketsFromYaml, getTaxBracketsFilePath, loadDefaultTaxBrackets, getUserStateTaxBracketsFilePath, loadUserStateTaxBrackets, loadUploadedStateTaxBrackets } from './TaxBracketsLoader';
import fs from 'fs';
import path from 'path';

// Mock fs module
jest.mock('fs');
jest.mock('path');

describe('TaxBracketsLoader', () => {
  const mockValidYaml = `
single:
  income_tax:
    brackets:
      - max: 11600
        min: 0
        rate: 10
  capital_gains:
    brackets:
      - max: 47025
        min: 0
        rate: 0
  standard_deduction: 14600
married-joint:
  income_tax:
    brackets:
      - max: 23200
        min: 0
        rate: 10
  capital_gains:
    brackets:
      - max: 94050
        min: 0
        rate: 0
  standard_deduction: 29200
married-separate:
  income_tax:
    brackets:
      - max: 11600
        min: 0
        rate: 10
  capital_gains:
    brackets:
      - max: 47025
        min: 0
        rate: 0
  standard_deduction: 14600
head-of-household:
  income_tax:
    brackets:
      - max: 16550
        min: 0
        rate: 10
  capital_gains:
    brackets:
      - max: 63000
        min: 0
        rate: 0
  standard_deduction: 21900
`;

  const mockInvalidYaml = `
invalid:
  data: true
`;

  const mockStateTaxYaml = `
NY:
  '2025':
    married_jointly_or_surviving_spouse:
      - over: null
        but_not_over: 5000
        base_tax: 90
        plus: '105'
        rate: 120
        of_excess_over: 135
      - over: 5000
        but_not_over: 6000
        base_tax: 75
        plus: '90'
        rate: 105
        of_excess_over: 120
    single_or_married_separately:
      - over: null
        but_not_over: 5000
        base_tax: 90
        plus: '105'
        rate: 120
        of_excess_over: 135
      - over: 5000
        but_not_over: 6000
        base_tax: 75
        plus: '90'
        rate: 105
        of_excess_over: 120
    head_of_household:
      - over: null
        but_not_over: 5000
        base_tax: 90
        plus: '105'
        rate: 120
        of_excess_over: 135
      - over: 5000
        but_not_over: 6000
        base_tax: 75
        plus: '90'
        rate: 105
        of_excess_over: 120
`;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Mock process.cwd to return 'process.cwd'
    process.cwd = jest.fn().mockReturnValue('process.cwd');

    // Mock path.join to return a predictable path
    path.join.mockImplementation((...args) => args.join('/'));
  });

  describe('loadTaxBracketsFromYaml', () => {
    it('should successfully load and parse valid YAML file', () => {
      // Mock fs.existsSync to return true
      fs.existsSync.mockReturnValue(true);

      // Mock fs.readFileSync to return our valid YAML
      fs.readFileSync.mockReturnValue(mockValidYaml);

      const result = loadTaxBracketsFromYaml('test/path/tax_brackets.yaml');

      expect(result).toBeDefined();
      expect(result.single).toBeDefined();
      expect(result['married-joint']).toBeDefined();
      expect(result['married-separate']).toBeDefined();
      expect(result['head-of-household']).toBeDefined();

      // Verify structure of one filing status
      expect(result.single.income_tax.brackets).toBeInstanceOf(Array);
      expect(result.single.capital_gains.brackets).toBeInstanceOf(Array);
      expect(typeof result.single.standard_deduction).toBe('number');
    });

    it('should successfully load and parse state tax YAML file', () => {
      // Mock fs.existsSync to return true
      fs.existsSync.mockReturnValue(true);

      // Mock fs.readFileSync to return our state tax YAML
      fs.readFileSync.mockReturnValue(mockStateTaxYaml);

      const result = loadTaxBracketsFromYaml('test/path/state_tax_data.yaml');

      expect(result).toBeDefined();
      expect(result.NY).toBeDefined();
      expect(result.NY['2025']).toBeDefined();

      // Verify structure of state tax data
      const stateData = result.NY['2025'];
      expect(stateData.married_jointly_or_surviving_spouse).toBeInstanceOf(Array);
      expect(stateData.single_or_married_separately).toBeInstanceOf(Array);
      expect(stateData.head_of_household).toBeInstanceOf(Array);

      // Verify bracket structure
      const bracket = stateData.married_jointly_or_surviving_spouse[0];
      expect(bracket).toHaveProperty('over');
      expect(bracket).toHaveProperty('but_not_over');
      expect(bracket).toHaveProperty('base_tax');
      expect(bracket).toHaveProperty('plus');
      expect(bracket).toHaveProperty('rate');
      expect(bracket).toHaveProperty('of_excess_over');
    });

    it('should throw error when file does not exist', () => {
      fs.existsSync.mockReturnValue(false);

      expect(() => {
        loadTaxBracketsFromYaml('nonexistent/path.yaml');
      }).toThrow('Tax brackets file not found at: nonexistent/path.yaml');
    });

    it('should throw error for invalid YAML structure', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(mockInvalidYaml);

      expect(() => {
        loadTaxBracketsFromYaml('test/path/invalid.yaml');
      }).toThrow('Missing required filing status: single');
    });
  });

  describe('getTaxBracketsFilePath', () => {
    it('should return correct path', () => {
      const result = getTaxBracketsFilePath();
      expect(result).toBe('process.cwd/tax_brackets.yaml');
    });
  });

  describe('getUserStateTaxBracketsFilePath', () => {
    it('should return correct path for user state tax brackets', () => {
      const userId = 'test-user-123';
      const result = getUserStateTaxBracketsFilePath(userId);
      expect(result).toBe('process.cwd/user_data/test-user-123/state_tax_brackets.yaml');
    });
  });

  describe('loadUserStateTaxBrackets', () => {
    it('should load state tax brackets from user file', () => {
      const userId = 'test-user-123';
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(mockStateTaxYaml);

      const result = loadUserStateTaxBrackets(userId);
      expect(result).toBeDefined();
      expect(result.NY).toBeDefined();
      expect(result.NY['2025']).toBeDefined();
    });

    it('should throw error when user file does not exist', () => {
      const userId = 'test-user-123';
      fs.existsSync.mockReturnValue(false);

      expect(() => {
        loadUserStateTaxBrackets(userId);
      }).toThrow('Tax brackets file not found at: process.cwd/user_data/test-user-123/state_tax_brackets.yaml');
    });
  });

  describe('loadUploadedStateTaxBrackets', () => {
    it('should load state tax brackets from uploaded YAML content', () => {
      const result = loadUploadedStateTaxBrackets(mockStateTaxYaml);
      expect(result).toBeDefined();
      expect(result.NY).toBeDefined();
      expect(result.NY['2025']).toBeDefined();
    });

    it('should throw error for invalid YAML content', () => {
      const invalidYaml = 'invalid: yaml: content';
      expect(() => {
        loadUploadedStateTaxBrackets(invalidYaml);
      }).toThrow('Invalid YAML content: bad indentation of a mapping entry');
    });
  });

  describe('loadDefaultTaxBrackets', () => {
    it('should load tax brackets using default path', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(mockValidYaml);

      const result = loadDefaultTaxBrackets();
      expect(result).toBeDefined();
      expect(result.single).toBeDefined();
      expect(result['married-joint']).toBeDefined();
    });

    it('should load tax brackets using default path', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(mockStateTaxYaml);

      const result = loadDefaultTaxBrackets();
      expect(result).toBeDefined();
      expect(result.NY).toBeDefined();
      expect(result.NY['2025']).toBeDefined();
    });
  });
}); 