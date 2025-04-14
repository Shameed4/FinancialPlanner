import { loadTaxBracketsFromYaml, getTaxBracketsFilePath, loadDefaultTaxBrackets, getUserStateTaxBracketsFilePath, loadUserStateTaxBrackets, loadUploadedStateTaxBrackets } from './TaxBracketsLoader';
import fs from 'fs';
import path from 'path';

// Mock fs and path modules
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  promises: {
    readFile: jest.fn()
  }
}));
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/'))
}));

describe('TaxBracketsLoader', () => {
  const mockValidYaml = `
NY:
  '2025':
    married_jointly_or_surviving_spouse:
      - over: null
        but_not_over: 5000
        base_tax: 90
        plus: '105'
        rate: 0.12
        of_excess_over: 135
      - over: 5000
        but_not_over: 6000
        base_tax: 75
        plus: 90
        rate: 0.15
        of_excess_over: 120
    single_or_married_separately:
      - over: null
        but_not_over: 5000
        base_tax: 90
        plus: '105'
        rate: 0.12
        of_excess_over: 135
      - over: 5000
        but_not_over: 6000
        base_tax: 75
        plus: 90
        rate: 0.15
        of_excess_over: 120
`;

  const mockInvalidYaml = `
invalid:
  data: true
`;

  const mockInvalidStateCodeYaml = `
Nyy:  # Invalid state code
  '2025':
    married_jointly_or_surviving_spouse: []
    single_or_married_separately: []
`;

  const mockInvalidNumericFieldYaml = `
NY:
  '2025':
    married_jointly_or_surviving_spouse:
      - over: null
        but_not_over: 5000
        base_tax: "90"  # Invalid: should be number
        plus: '105'
        rate: 0.12
        of_excess_over: 135
    single_or_married_separately:
      - over: null
        but_not_over: 5000
        base_tax: 90
        plus: '105'
        rate: 0.12
        of_excess_over: 135
`;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Mock process.cwd to return 'process.cwd'
    process.cwd = jest.fn().mockReturnValue('process.cwd');
  });

  describe('loadTaxBracketsFromYaml', () => {
    it('should successfully load and parse valid YAML file', async () => {
      // Mock fs.existsSync to return true
      fs.existsSync.mockReturnValue(true);

      // Mock fs.promises.readFile to return our valid YAML
      fs.promises.readFile.mockResolvedValue(mockValidYaml);

      const result = await loadTaxBracketsFromYaml('test/path/tax_brackets.yaml');

      expect(result).toBeDefined();
      expect(result.NY).toBeDefined();
      expect(result.NY['2025']).toBeDefined();

      // Verify structure of state tax data
      const stateData = result.NY['2025'];
      expect(stateData.married_jointly_or_surviving_spouse).toBeInstanceOf(Array);
      expect(stateData.single_or_married_separately).toBeInstanceOf(Array);

      // Verify bracket structure
      const bracket = stateData.married_jointly_or_surviving_spouse[0];
      expect(bracket).toHaveProperty('over');
      expect(bracket).toHaveProperty('but_not_over');
      expect(bracket).toHaveProperty('base_tax');
      expect(bracket).toHaveProperty('plus');
      expect(bracket).toHaveProperty('rate');
      expect(bracket).toHaveProperty('of_excess_over');
    });

    it('should throw error when file does not exist', async () => {
      fs.existsSync.mockReturnValue(false);

      await expect(loadTaxBracketsFromYaml('nonexistent/path.yaml'))
        .rejects
        .toThrow('Tax brackets file not found at: nonexistent/path.yaml');
    });

    it('should throw error for invalid YAML structure', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.promises.readFile.mockResolvedValue(mockInvalidYaml);

      await expect(loadTaxBracketsFromYaml('test/path/invalid.yaml'))
        .rejects
        .toThrow('Invalid state code format: invalid');
    });

    it('should throw error for invalid state code format', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.promises.readFile.mockResolvedValue(mockInvalidStateCodeYaml);

      await expect(loadTaxBracketsFromYaml('test/path/invalid_state.yaml'))
        .rejects
        .toThrow('Invalid state code format: Nyy');
    });

    it('should throw error for invalid numeric field', async () => {
      const mockYaml = `
NY:
  '2025':
    married_jointly_or_surviving_spouse:
      - over: null
        but_not_over: "not a number"
        rate: 0.12
    single_or_married_separately:
      - over: null
        but_not_over: 5000
        rate: 0.12
`;

      await expect(loadTaxBracketsFromYaml(mockYaml, false))
        .rejects
        .toThrow('Upper bound (but_not_over) must be null or a number in bracket for NY 2025 married_jointly_or_surviving_spouse');
    });

    it('should load and parse valid YAML with simplified format', async () => {
      const mockYaml = `
NY:
  '2025':
    married_jointly_or_surviving_spouse:
      - over: null
        but_not_over: 5000
        rate: 0.12
      - over: 5000
        but_not_over: null
        rate: 0.15
    single_or_married_separately:
      - over: 0
        but_not_over: 5000
        rate: 0.12
      - over: 5000
        but_not_over: null
        rate: 0.15
`;

      const result = await loadTaxBracketsFromYaml(mockYaml, false);
      expect(result).toBeDefined();
      expect(result.NY['2025'].married_jointly_or_surviving_spouse).toHaveLength(2);
      expect(result.NY['2025'].single_or_married_separately).toHaveLength(2);

      // Verify first bracket for married filing jointly
      const firstBracket = result.NY['2025'].married_jointly_or_surviving_spouse[0];
      expect(firstBracket.over).toBe(0); // null should be converted to 0
      expect(firstBracket.but_not_over).toBe(5000);
      expect(firstBracket.rate).toBe(0.12);

      // Verify second bracket for married filing jointly
      const secondBracket = result.NY['2025'].married_jointly_or_surviving_spouse[1];
      expect(secondBracket.over).toBe(5000);
      expect(secondBracket.but_not_over).toBe(Infinity); // null should be converted to Infinity
      expect(secondBracket.rate).toBe(0.15);
    });

    it('should validate required fields in simplified format', async () => {
      const mockYaml = `
NY:
  '2025':
    married_jointly_or_surviving_spouse:
      - over: null
        but_not_over: 5000
        # Missing rate field
`;

      await expect(loadTaxBracketsFromYaml(mockYaml, false))
        .rejects
        .toThrow('Missing rate in bracket for NY 2025 married_jointly_or_surviving_spouse');
    });

    it('should validate numeric fields in simplified format', async () => {
      const mockYaml = `
NY:
  '2025':
    married_jointly_or_surviving_spouse:
      - over: null
        but_not_over: "not a number"
        rate: 0.12
`;

      await expect(loadTaxBracketsFromYaml(mockYaml, false))
        .rejects
        .toThrow('Upper bound (but_not_over) must be null or a number in bracket for NY 2025 married_jointly_or_surviving_spouse');
    });

    it('should sort brackets by lower bound', async () => {
      const mockYaml = `
NY:
  '2025':
    married_jointly_or_surviving_spouse:
      - over: 10000
        but_not_over: 20000
        rate: 0.15
      - over: 0
        but_not_over: 10000
        rate: 0.12
      - over: 20000
        but_not_over: null
        rate: 0.20
    single_or_married_separately:
      - over: 0
        but_not_over: 10000
        rate: 0.12
      - over: 10000
        but_not_over: 20000
        rate: 0.15
      - over: 20000
        but_not_over: null
        rate: 0.20
`;

      const result = await loadTaxBracketsFromYaml(mockYaml, false);
      const brackets = result.NY['2025'].married_jointly_or_surviving_spouse;

      // Verify brackets are sorted by over (lower bound)
      expect(brackets[0].over).toBe(0);
      expect(brackets[1].over).toBe(10000);
      expect(brackets[2].over).toBe(20000);
    });
  });

  describe('getTaxBracketsFilePath', () => {
    it('should return correct path', () => {
      const result = getTaxBracketsFilePath();
      expect(result).toBe('process.cwd/tax_brackets.yaml');
      expect(path.join).toHaveBeenCalledWith('process.cwd', 'tax_brackets.yaml');
    });
  });

  describe('getUserStateTaxBracketsFilePath', () => {
    it('should return correct path for user state tax brackets', () => {
      const userId = 'test-user-123';
      const result = getUserStateTaxBracketsFilePath(userId);
      expect(result).toBe('process.cwd/user_data/test-user-123/state_tax_brackets.yaml');
      expect(path.join).toHaveBeenCalledWith('process.cwd', 'user_data', userId, 'state_tax_brackets.yaml');
    });
  });

  describe('loadUserStateTaxBrackets', () => {
    it('should load state tax brackets from user file', async () => {
      const userId = 'test-user-123';
      fs.existsSync.mockReturnValue(true);
      fs.promises.readFile.mockResolvedValue(mockValidYaml);

      const result = await loadUserStateTaxBrackets(userId);
      expect(result).toBeDefined();
      expect(result.NY).toBeDefined();
      expect(result.NY['2025']).toBeDefined();
    });

    it('should throw error when user file does not exist', async () => {
      const userId = 'test-user-123';
      fs.existsSync.mockReturnValue(false);

      await expect(loadUserStateTaxBrackets(userId))
        .rejects
        .toThrow('Tax brackets file not found at: process.cwd/user_data/test-user-123/state_tax_brackets.yaml');
    });
  });

  describe('loadUploadedStateTaxBrackets', () => {
    it('should load state tax brackets from uploaded YAML content', async () => {
      const result = await loadUploadedStateTaxBrackets(mockValidYaml);
      expect(result).toBeDefined();
      expect(result.NY).toBeDefined();
      expect(result.NY['2025']).toBeDefined();
    });

    it('should throw error for invalid YAML content', async () => {
      const invalidYaml = 'invalid: yaml: content';
      await expect(loadUploadedStateTaxBrackets(invalidYaml))
        .rejects
        .toThrow('Invalid YAML content: bad indentation of a mapping entry');
    });
  });

  describe('loadDefaultTaxBrackets', () => {
    it('should load tax brackets using default path', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.promises.readFile.mockResolvedValue(mockValidYaml);

      const result = await loadDefaultTaxBrackets();
      expect(result).toBeDefined();
      expect(result.NY).toBeDefined();
      expect(result.NY['2025']).toBeDefined();
    });
  });
}); 