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
  single:
    - min: 0
      max: 8500
      rate: "4%"
    - min: 8501
      max: 11700
      rate: "4.5%"
    - min: 11701
      max: null
      rate: "5.25%"
  married-joint:
    - min: 0
      max: 17150
      rate: "4%"
    - min: 17151
      max: 23600
      rate: "4.5%"
    - min: 23601
      max: null
      rate: "5.25%"
`;

  const mockInvalidYaml = `
invalid:
  data: true
`;

  const mockInvalidStateCodeYaml = `
Nyy:  # Invalid state code
  single: []
`;

  const mockInvalidNumericFieldYaml = `
NY:
  single:
    - min: 0
      max: "not a number"
      rate: "4%"
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
      expect(result.NY.single).toBeInstanceOf(Array);
      expect(result.NY['married-joint']).toBeInstanceOf(Array);

      // Verify bracket structure
      const bracket = result.NY.single[0];
      expect(bracket).toHaveProperty('over');
      expect(bracket).toHaveProperty('but_not_over');
      expect(bracket).toHaveProperty('rate');
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
      fs.existsSync.mockReturnValue(true);
      fs.promises.readFile.mockResolvedValue(mockInvalidNumericFieldYaml);

      await expect(loadTaxBracketsFromYaml('test/path/invalid_numeric.yaml'))
        .rejects
        .toThrow('Upper bound (max) must be null or a number in bracket for NY single');
    });

    it('should load and parse valid YAML with percentage rates', async () => {
      const mockYaml = `
NY:
  single:
    - min: 0
      max: 8500
      rate: "4%"
    - min: 8501
      max: 11700
      rate: "4.5%"
    - min: 11701
      max: null
      rate: "5.25%"
  married-joint:
    - min: 0
      max: 17150
      rate: "4%"
    - min: 17151
      max: 23600
      rate: "4.5%"
    - min: 23601
      max: null
      rate: "5.25%"
`;

      const result = await loadTaxBracketsFromYaml(mockYaml, false);
      expect(result).toBeDefined();
      expect(result.NY.single).toHaveLength(3);
      expect(result.NY['married-joint']).toHaveLength(3);

      // Verify first bracket for single
      const firstBracket = result.NY.single[0];
      expect(firstBracket.over).toBe(0);
      expect(firstBracket.but_not_over).toBe(8500);
      expect(firstBracket.rate).toBeCloseTo(0.04, 5);

      // Verify last bracket for single
      const lastBracket = result.NY.single[2];
      expect(lastBracket.over).toBe(11701);
      expect(lastBracket.but_not_over).toBe(Infinity);
      expect(lastBracket.rate).toBeCloseTo(0.0525, 5);
    });

    it('should validate required fields in new format', async () => {
      const mockYaml = `
NY:
  single:
    - min: 0
      max: 8500
      # Missing rate field
`;

      await expect(loadTaxBracketsFromYaml(mockYaml, false))
        .rejects
        .toThrow('Missing rate in bracket for NY single');
    });

    it('should validate rate format', async () => {
      const mockYaml = `
NY:
  single:
    - min: 0
      max: 8500
      rate: "not a percentage"
`;

      await expect(loadTaxBracketsFromYaml(mockYaml, false))
        .rejects
        .toThrow('Rate must be a percentage string in bracket for NY single');
    });

    it('should validate numeric bounds', async () => {
      const mockYaml = `
NY:
  single:
    - min: "not a number"
      max: 8500
      rate: "4%"
`;

      await expect(loadTaxBracketsFromYaml(mockYaml, false))
        .rejects
        .toThrow('Lower bound (min) must be null or a number in bracket for NY single');
    });

    it('should sort brackets by lower bound', async () => {
      const mockYaml = `
NY:
  single:
    - min: 11701
      max: null
      rate: "5.25%"
    - min: 0
      max: 8500
      rate: "4%"
    - min: 8501
      max: 11700
      rate: "4.5%"
`;

      const result = await loadTaxBracketsFromYaml(mockYaml, false);
      const brackets = result.NY.single;

      // Verify brackets are sorted by min (lower bound)
      expect(brackets[0].over).toBe(0);
      expect(brackets[1].over).toBe(8501);
      expect(brackets[2].over).toBe(11701);
    });

    it('should handle multiple states', async () => {
      const mockYaml = `
NY:
  single:
    - min: 0
      max: 8500
      rate: "4%"
    - min: 8501
      max: null
      rate: "4.5%"
NJ:
  single:
    - min: 0
      max: 20000
      rate: "1.4%"
    - min: 20001
      max: null
      rate: "1.75%"
`;

      const result = await loadTaxBracketsFromYaml(mockYaml, false);
      expect(result.NY).toBeDefined();
      expect(result.NJ).toBeDefined();
      expect(result.NY.single).toHaveLength(2);
      expect(result.NJ.single).toHaveLength(2);

      // Verify NY rates
      expect(result.NY.single[0].rate).toBeCloseTo(0.04, 5);
      expect(result.NY.single[1].rate).toBeCloseTo(0.045, 5);

      // Verify NJ rates
      expect(result.NJ.single[0].rate).toBeCloseTo(0.014, 5);
      expect(result.NJ.single[1].rate).toBeCloseTo(0.0175, 5);
    });

    it('should throw error for invalid source type', async () => {
      await expect(loadTaxBracketsFromYaml({ invalid: 'object' }, false))
        .rejects
        .toThrow('Invalid source: must be a file path or YAML content');
    });

    it('should throw error for empty YAML content', async () => {
      await expect(loadTaxBracketsFromYaml('', false))
        .rejects
        .toThrow('Invalid YAML structure: root must be an object');
    });

    it('should throw error for invalid state data structure', async () => {
      const mockYaml = `
NY: "invalid string instead of object"
`;
      await expect(loadTaxBracketsFromYaml(mockYaml, false))
        .rejects
        .toThrow('Invalid state data structure for NY');
    });

    it('should throw error for empty filing status data', async () => {
      const mockYaml = `
NY: {}
`;
      await expect(loadTaxBracketsFromYaml(mockYaml, false))
        .rejects
        .toThrow('No filing status data found for state NY');
    });

    it('should throw error for invalid brackets data type', async () => {
      const mockYaml = `
NY:
  single: "not an array"
`;
      await expect(loadTaxBracketsFromYaml(mockYaml, false))
        .rejects
        .toThrow('Invalid brackets data for NY single');
    });

    it('should handle null values for min/max bounds', async () => {
      const mockYaml = `
NY:
  single:
    - min: null
      max: null
      rate: "4%"
`;
      const result = await loadTaxBracketsFromYaml(mockYaml, false);
      expect(result.NY.single[0].over).toBe(0);
      expect(result.NY.single[0].but_not_over).toBe(Infinity);
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
      expect(result.NY.single).toBeInstanceOf(Array);
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
      expect(result.NY.single).toBeInstanceOf(Array);
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
      expect(result.NY.single).toBeInstanceOf(Array);
    });
  });
}); 