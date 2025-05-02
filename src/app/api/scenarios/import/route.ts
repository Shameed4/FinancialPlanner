import { StringScenarioFormData, AssetType, Investment, ExpenseEvent, IncomeEvent, InvestEvent, RebalanceEvent, FixedInflation, UniformInflation, NormalInflation } from '@/app/scenario/types';
import { yamlToJson } from '@/utils/scenarioConverter';
import { NextRequest, NextResponse } from 'next/server';

// Define required interfaces for YAML structure
interface YamlDistribution {
  type: string;
  value?: number;
  mean?: number;
  stdev?: number;
  lower?: number;
  upper?: number;
}

interface YamlInvestmentType {
  name: string;
  description: string;
  returnAmtOrPct: 'amount' | 'percent';
  returnDistribution: YamlDistribution;
  expenseRatio: number;
  incomeAmtOrPct: 'amount' | 'percent';
  incomeDistribution: YamlDistribution;
  taxability: boolean;
}

interface YamlInvestment {
  investmentType: string;
  value: number;
  taxStatus: string;
  id: string;
}

interface YamlEvent {
  name: string;
  description?: string;
  start: {
    type: string;
    value?: number;
    mean?: number;
    stdev?: number;
    lower?: number;
    upper?: number;
    eventSeries?: string;
  };
  duration: YamlDistribution;
  type: 'income' | 'expense' | 'invest' | 'rebalance';
  initialAmount?: number;
  changeAmtOrPct?: 'amount' | 'percent';
  changeDistribution?: YamlDistribution;
  inflationAdjusted?: boolean;
  userFraction?: number;
  socialSecurity?: boolean;
  discretionary?: boolean;
  assetAllocation?: Record<string, number>;
  assetAllocation2?: Record<string, number>;
  glidePath?: boolean;
  maxCash?: number;
}

interface YamlScenario {
  name: string;
  maritalStatus: 'individual' | 'couple';
  birthYears: number[];
  lifeExpectancy: YamlDistribution[];
  investmentTypes: YamlInvestmentType[];
  investments: YamlInvestment[];
  eventSeries: YamlEvent[];
  inflationAssumption: YamlDistribution;
  afterTaxContributionLimit: number;
  spendingStrategy?: string[];
  expenseWithdrawalStrategy?: string[];
  RMDStrategy?: string[];
  RothConversionOpt?: boolean;
  RothConversionStart?: number;
  RothConversionEnd?: number;
  RothConversionStrategy?: string[];
  financialGoal: number;
  residenceState: string;
}

const starterYaml = `# file format for scenario import/export.  version: 2025-03-23
# CSE416, Software Engineering, Scott D. Stoller.

# a distribution is represented as a map with one of the following forms:
# {type: fixed, value: <number>}
# {type: normal, mean: <number>, stdev: <number>}
# {type: uniform, lower: <number>, upper: <number>}
# percentages are represented by their decimal value, e.g., 4% is represented as 0.04.

name: "Retirement Planning Scenario"
maritalStatus: couple # couple or individual
birthYears: [1985, 1987] # a list with length 1 or 2, depending on maritalStatus. if len=2, the first entry is for the user; second entry, for the spouse.
lifeExpectancy: [ {type: fixed, value: 80}, {type: normal, mean: 82, stdev: 3} ] # a list with length 1 or 2, depending on maritalStatus.

investmentTypes:
  - name: cash
    description: cash
    returnAmtOrPct: amount # "amount" or "percent"
    returnDistribution: {type: fixed, value: 0}
    expenseRatio: 0
    incomeAmtOrPct: percent
    incomeDistribution: {type: fixed, value: 0}
    taxability: true # Boolean.  true = taxable, false = tax-exempt

  - name: S&P 500
    description: S&P 500 index fund
    returnAmtOrPct: percent  # whether expected annual return is specified as a dollar "amount" or a "percent"
    returnDistribution: {type: normal, mean: 0.06, stdev: 0.02} # distribution of expected annual return
    expenseRatio: 0.001
    incomeAmtOrPct: percent
    incomeDistribution: {type: normal, mean: 0.01, stdev: 0.005}
    taxability: true

  - name: tax-exempt bonds
    description: NY tax-exempt bonds
    returnAmtOrPct: amount # whether expected annual return is specified as a dollar "amount" or a "percent"
    returnDistribution: {type: fixed, value: 0}
    expenseRatio: 0.004
    incomeAmtOrPct: percent
    incomeDistribution: {type: normal, mean: 0.03, stdev: 0.01}
    taxability: false

# investment id is a unique identifier.  without it, we would need to use a pair (investment type, tax status) to identify an investment.
investments:
  - investmentType: cash
    value: 100
    taxStatus: non-retirement # "non-retirement", "pre-tax", or "after-tax"
    id: cash

  - investmentType: S&P 500
    value: 10000
    taxStatus: non-retirement
    id: S&P 500 non-retirement
    
  - investmentType: tax-exempt bonds
    value: 2000
    taxStatus: non-retirement
    id: tax-exempt bonds

  - investmentType: S&P 500
    value: 10000
    taxStatus: pre-tax
    id: S&P 500 pre-tax
    
  - investmentType: S&P 500
    value: 2000
    taxStatus: after-tax
    id: S&P 500 after-tax
 
eventSeries:
  - name: salary
    start: {type: fixed, value: 2025} # a fixed, normal, or uniform distribution (as above) or a map with the form {type: startWith, eventSeries: <name>} or {type: startAfter, eventSeries: <name>}
    duration: {type: fixed, value: 40}
    type: income # "income", "expense", "invest", or "rebalance"
    initialAmount: 75000
    changeAmtOrPct: amount
    changeDistribution: {type: uniform, lower: 500, upper: 2000}
    inflationAdjusted: false # boolean
    userFraction: 1.0 # fraction of the amount associated with the user.  the rest is associated with the spouse.
    socialSecurity: false  # boolean

  - name: food
    start: {type: startWith, eventSeries: salary}  # starts in same year as salary
    duration: {type: fixed, value: 200}  # lasts for the rest of the user's life
    type: expense
    initialAmount: 5000
    changeAmtOrPct: percent
    changeDistribution: {type: normal, mean: 0.02, stdev: 0.01} 
    inflationAdjusted: true
    userFraction: 0.5
    discretionary: false

  - name: vacation
    start: {type: startWith, eventSeries: salary}  # starts in same year as salary
    duration: {type: fixed, value: 40}
    type: expense
    initialAmount: 1200
    changeAmtOrPct: amount
    changeDistribution: {type: fixed, value: 0}
    inflationAdjusted: true
    userFraction: 0.6
    discretionary: true

  - name: streaming services
    start: {type: startWith, eventSeries: salary}  # starts in same year as salary
    duration: {type: fixed, value: 40}
    type: expense
    initialAmount: 500
    changeAmtOrPct: amount
    changeDistribution: {type: fixed, value: 0}
    inflationAdjusted: true
    userFraction: 1.0
    discretionary: true

  - name: my investments
    start: {type: uniform, lower: 2025, upper: 2030}
    duration: {type: fixed, value: 10}
    type: invest
    assetAllocation: {S&P 500 non-retirement: 0.6, S&P 500 after-tax: 0.4}
    glidePath: true # boolean.  false means assetAllocation is the fixed asset allocation, and assetAllocation2 is unused.  true means to glide from assetAllocation to assetAllocation2.
    assetAllocation2: {S&P 500 non-retirement: 0.8, S&P 500 after-tax: 0.2} 
    maxCash: 1000

  - name: rebalance
    start: {type: uniform, lower: 2025, upper: 2030}
    duration: {type: fixed, value: 10}
    type: rebalance
    assetAllocation: {S&P500 non-retirement: 0.7, tax-exempt bonds: 0.3}

inflationAssumption: {type: fixed, value: 0.03}
afterTaxContributionLimit: 7000 # annual limit on contributions to after-tax retirement accounts
spendingStrategy: ["vacation", "streaming services"]  # list of discretionary expenses, identified by name
expenseWithdrawalStrategy: [S&P 500 non-retirement, tax-exempt bonds, S&P 500 after-tax] # list of investments, identified by id
RMDStrategy: [S&P 500 pre-tax] # list of pre-tax investments, identified by id
RothConversionOpt: true   # boolean indicating whether the Roth Conversion optimizer is enabled
RothConversionStart: 2050 # start year
RothConversionEnd: 2060   # end year
RothConversionStrategy: [S&P 500 pre-tax]  # list of pre-tax investments, identified by id
financialGoal: 10000
residenceState: NY  # states are identified by standard 2-letter abbreviations
`

export function yamlToScenario(yaml: string): StringScenarioFormData {
  try {
    const jsonYaml: YamlScenario = yamlToJson(yaml);

    // Basic validation for required fields
    if (!jsonYaml || typeof jsonYaml !== 'object') {
      throw new Error('Invalid YAML format: Root object missing or invalid.');
    }
    if (!jsonYaml.name) throw new Error('Invalid YAML format: Missing scenario name.');
    if (!jsonYaml.maritalStatus || (jsonYaml.maritalStatus !== 'individual' && jsonYaml.maritalStatus !== 'couple')) {
      throw new Error('Invalid YAML format: Missing or invalid maritalStatus (must be "individual" or "couple").');
    }
    if (!jsonYaml.birthYears || !Array.isArray(jsonYaml.birthYears)) throw new Error('Invalid YAML format: Missing or invalid birthYears.');
    if (!jsonYaml.lifeExpectancy || !Array.isArray(jsonYaml.lifeExpectancy)) throw new Error('Invalid YAML format: Missing or invalid lifeExpectancy.');
    if (!jsonYaml.investmentTypes || !Array.isArray(jsonYaml.investmentTypes)) throw new Error('Invalid YAML format: Missing or invalid investmentTypes.');
    if (!jsonYaml.investments || !Array.isArray(jsonYaml.investments)) throw new Error('Invalid YAML format: Missing or invalid investments.');
    if (!jsonYaml.eventSeries || !Array.isArray(jsonYaml.eventSeries)) throw new Error('Invalid YAML format: Missing or invalid eventSeries.');
    if (!jsonYaml.inflationAssumption || typeof jsonYaml.inflationAssumption !== 'object' || !jsonYaml.inflationAssumption.type) {
      throw new Error('Invalid YAML format: Missing or invalid inflationAssumption.');
    }
    if (!jsonYaml.residenceState) throw new Error('Invalid YAML format: Missing residenceState.');
    if (jsonYaml.financialGoal === undefined || jsonYaml.financialGoal === null || typeof jsonYaml.financialGoal !== 'number') {
      throw new Error('Invalid YAML format: Missing or invalid financialGoal.');
    }
    if (jsonYaml.afterTaxContributionLimit === undefined || jsonYaml.afterTaxContributionLimit === null || typeof jsonYaml.afterTaxContributionLimit !== 'number') {
      throw new Error('Invalid YAML format: Missing or invalid afterTaxContributionLimit.');
    }

    const isCouple = jsonYaml.maritalStatus === 'couple';
    const expectedLength = isCouple ? 2 : 1;

    if (jsonYaml.birthYears.length !== expectedLength) {
      throw new Error(`Invalid YAML format: birthYears length (${jsonYaml.birthYears.length}) does not match maritalStatus (${jsonYaml.maritalStatus}). Expected ${expectedLength}.`);
    }
    if (jsonYaml.lifeExpectancy.length !== expectedLength) {
      throw new Error(`Invalid YAML format: lifeExpectancy length (${jsonYaml.lifeExpectancy.length}) does not match maritalStatus (${jsonYaml.maritalStatus}). Expected ${expectedLength}.`);
    }
    if (!jsonYaml.lifeExpectancy[0] || typeof jsonYaml.lifeExpectancy[0] !== 'object') {
      throw new Error('Invalid YAML format: User lifeExpectancy data is missing or invalid.');
    }
    if (isCouple && (!jsonYaml.lifeExpectancy[1] || typeof jsonYaml.lifeExpectancy[1] !== 'object')) {
      throw new Error('Invalid YAML format: Spouse lifeExpectancy data is missing or invalid.');
    }

    // Create the base object structure first
    let baseRes = {
      name: jsonYaml.name,
      userLifeExpectancyMean: String(jsonYaml.lifeExpectancy[0].type == 'fixed' ? jsonYaml.lifeExpectancy[0].value ?? '80' : jsonYaml.lifeExpectancy[0].mean ?? '80'),
      userLifeExpectancyStd: String(jsonYaml.lifeExpectancy[0].type == 'fixed' ? '0' : jsonYaml.lifeExpectancy[0].stdev ?? '3'),
      residenceState: jsonYaml.residenceState,
      userBirthYear: String(jsonYaml.birthYears[0] ?? 0),
      financialGoal: String(jsonYaml.financialGoal ?? 0),
      initialAfterTaxRetirementContributionLimit: String(jsonYaml.afterTaxContributionLimit ?? 0),
      forIndividual: !isCouple,
      assetTypes: [] as AssetType[],
      investments: [] as Investment[],
      eventSeries: [] as (IncomeEvent | ExpenseEvent | InvestEvent | RebalanceEvent)[],
      enableTaxOptimization: jsonYaml.RothConversionOpt || false,
      rothOptimizationStartYear: jsonYaml.RothConversionStart ? String(jsonYaml.RothConversionStart) : undefined,
      rothOptimizationEndYear: jsonYaml.RothConversionEnd ? String(jsonYaml.RothConversionEnd) : undefined,
    };

    // Add spouse fields if applicable
    let coupleRes = {};
    if (isCouple) {
      coupleRes = {
        spouseBirthYear: String(jsonYaml.birthYears[1] ?? 0),
        spouseLifeExpectancyMean: String(jsonYaml.lifeExpectancy[1].type == 'fixed' ? jsonYaml.lifeExpectancy[1].value ?? '80' : jsonYaml.lifeExpectancy[1].mean ?? '80'),
        spouseLifeExpectancyStd: String(jsonYaml.lifeExpectancy[1].type == 'fixed' ? '0' : jsonYaml.lifeExpectancy[1].stdev ?? '3')
      };
    }

    // Add inflation fields based on type to satisfy the discriminated union
    let inflationFields: FixedInflation | UniformInflation | NormalInflation;
    switch (jsonYaml.inflationAssumption.type) {
      case 'fixed':
        inflationFields = {
          inflationAssumption: 'fixed',
          inflation: String(jsonYaml.inflationAssumption.value ?? 0.03),
        };
        break;
      case 'uniform':
      case 'random_uniform':
        inflationFields = {
          inflationAssumption: 'random_uniform',
          inflationMin: String(jsonYaml.inflationAssumption.lower ?? 0.02),
          inflationMax: String(jsonYaml.inflationAssumption.upper ?? 0.04),
        };
        break;
      case 'normal':
      case 'random_normal':
        inflationFields = {
          inflationAssumption: 'random_normal',
          inflationMean: String(jsonYaml.inflationAssumption.mean ?? 0.03),
          inflationStd: String(jsonYaml.inflationAssumption.stdev ?? 0.01),
        };
        break;
      default:
        // Fallback to fixed if type is unknown or missing
        console.warn(`Unknown inflation assumption type: ${jsonYaml.inflationAssumption.type}. Falling back to fixed.`);
        inflationFields = {
          inflationAssumption: 'fixed',
          inflation: '0.03',
        };
    }

    // Combine base, couple (if applicable), and inflation fields
    let res: StringScenarioFormData = {
      ...baseRes,
      ...(isCouple ? coupleRes : {}),
      ...inflationFields,
    } as StringScenarioFormData; // Cast to assure TypeScript

    // --- Map Asset Types ---
    res.assetTypes = jsonYaml.investmentTypes.map((asset: YamlInvestmentType) => {
      let returnFields: any = {};
      switch (asset.returnDistribution?.type || 'fixed') {
        case 'fixed':
          returnFields = { 
            returnType: 'fixed', 
            fixedReturn: asset.returnDistribution?.value === 0 
              ? '0' 
              : (asset.returnDistribution?.value !== undefined && asset.returnDistribution.value !== null)
                ? String(asset.returnDistribution.value) 
                : '0'
          };
          break;
        case 'normal':
        case 'random_normal': 
          returnFields = {
            returnType: 'random_normal',
            normalReturnMean: (asset.returnDistribution?.mean !== undefined && asset.returnDistribution.mean !== null)
              ? String(asset.returnDistribution.mean) 
              : '0',
            normalReturnStd: (asset.returnDistribution?.stdev !== undefined && asset.returnDistribution.stdev !== null)
              ? String(asset.returnDistribution.stdev) 
              : '0'
          };
          break;
        case 'uniform':
        case 'random_uniform': 
          returnFields = {
            returnType: 'random_uniform',
            uniformReturnMin: (asset.returnDistribution?.lower !== undefined && asset.returnDistribution.lower !== null)
              ? String(asset.returnDistribution.lower) 
              : '0',
            uniformReturnMax: (asset.returnDistribution?.upper !== undefined && asset.returnDistribution.upper !== null)
              ? String(asset.returnDistribution.upper) 
              : '0'
          };
          break;
        default:
          console.warn(`Unknown asset return type: ${asset.returnDistribution?.type}. Defaulting to fixed.`);
          returnFields = { returnType: 'fixed', fixedReturn: '0' };
      }

      let incomeFields: any = {};
      switch (asset.incomeDistribution?.type || 'fixed') {
          case 'fixed':
              incomeFields = {
                  normalIncomeMean: asset.incomeDistribution?.value === 0
                    ? '0'
                    : (asset.incomeDistribution?.value !== undefined && asset.incomeDistribution.value !== null)
                      ? String(asset.incomeDistribution.value) 
                      : '0',
                  normalIncomeStd: '0'
              }
              break;
          case 'normal':
          case 'random_normal':
              incomeFields = {
                  normalIncomeMean: (asset.incomeDistribution?.mean !== undefined && asset.incomeDistribution.mean !== null)
                    ? String(asset.incomeDistribution.mean) 
                    : '0',
                  normalIncomeStd: (asset.incomeDistribution?.stdev !== undefined && asset.incomeDistribution.stdev !== null)
                    ? String(asset.incomeDistribution.stdev) 
                    : '0'
              };
              break;
          case 'uniform':
          case 'random_uniform':
              const lower = (asset.incomeDistribution?.lower !== undefined && asset.incomeDistribution.lower !== null) 
                  ? asset.incomeDistribution.lower 
                  : 0;
              const upper = (asset.incomeDistribution?.upper !== undefined && asset.incomeDistribution.upper !== null) 
                  ? asset.incomeDistribution.upper 
                  : 0;
              
              const mean = (lower !== 0 || upper !== 0) ? (lower + upper) / 2 : 0;
              const std = (lower !== 0 || upper !== 0) ? (upper - lower) / 4 : 0;
              
              incomeFields = {
                  normalIncomeMean: String(mean),
                  normalIncomeStd: String(std)
              };
              break;
          default:
              console.warn(`Unknown asset income type: ${asset.incomeDistribution?.type}. Defaulting to fixed.`);
              incomeFields = { normalIncomeMean: '0', normalIncomeStd: '0' };
      }

      return {
        name: asset.name,
        description: asset.description || asset.name,
        ...returnFields,
        expenseRatio: asset.expenseRatio === 0 ? '0' : (asset.expenseRatio ? String(asset.expenseRatio) : '0'),
        ...incomeFields,
        taxable: asset.taxability ?? false,
        returnAmtOrPct: asset.returnAmtOrPct || 'percent',
        incomeAmtOrPct: asset.incomeAmtOrPct || 'percent'
      } as AssetType;
    });

    // --- Map Investments ---
    // Create maps for strategy ordering
    const rmdOrderMap = new Map(jsonYaml.RMDStrategy?.map((id: string, index: number) => [id, index + 1]) || []);
    const rothConvOrderMap = new Map(jsonYaml.RothConversionStrategy?.map((id: string, index: number) => [id, index + 1]) || []);
    const expenseWithdrawalOrderMap = new Map(jsonYaml.expenseWithdrawalStrategy?.map((id: string, index: number) => [id, index + 1]) || []);

    res.investments = jsonYaml.investments.map((inv: YamlInvestment, index: number) => {
      let taxStatus: Investment['taxStatus'];
      switch (inv.taxStatus) {
        case 'non-retirement': taxStatus = 'non-retirement'; break;
        case 'pre-tax': taxStatus = 'pre-tax-retirement'; break;
        case 'after-tax': taxStatus = 'after-tax-retirement'; break;
        default:
          console.warn(`Unknown tax status: ${inv.taxStatus}. Defaulting to non-retirement.`);
          taxStatus = 'non-retirement';
      }

      return {
        assetType: inv.investmentType,
        value: String(inv.value ?? 0),
        taxStatus: taxStatus,
        // Assign strategies based on maps, default to index+1 if not found
        rmdStrategy: taxStatus === 'pre-tax-retirement' ? String(rmdOrderMap.get(inv.id) ?? index + 1) : undefined,
        rothConversionStrategy: taxStatus === 'pre-tax-retirement' ? String(rothConvOrderMap.get(inv.id) ?? index + 1) : undefined,
        expenseWithdrawalStrategy: String(expenseWithdrawalOrderMap.get(inv.id) ?? index + 1)
      } as Investment; // Cast to ensure type match
    });

    // --- Map Event Series ---
    const spendingOrderMap = new Map(jsonYaml.spendingStrategy?.map((name: string, index: number) => [name, index + 1]) || []);

    res.eventSeries = jsonYaml.eventSeries.map((es: YamlEvent, index: number) => {
      let startFields: any = {};
      let startYearType: string;
      
      if (!es.start || typeof es.start !== 'object') {
        throw new Error(`Invalid event start configuration for event: ${es.name}`);
      }
      
      switch (es.start.type) {
        case 'fixed':
          startYearType = 'fixed';
          startFields = { startYear: String(es.start.value ?? 0) };
          break;
        case 'uniform':
        case 'random_uniform': // Handle both 'uniform' and 'random_uniform'
          startYearType = 'random_uniform';
          startFields = { startYearMin: String(es.start.lower ?? 0), startYearMax: String(es.start.upper ?? 0) };
          break;
        case 'normal':
        case 'random_normal': // Handle both 'normal' and 'random_normal'
          startYearType = 'random_normal';
          startFields = { startYearMean: String(es.start.mean ?? 0), startYearStd: String(es.start.stdev ?? 0) };
          break;
        case 'startWith':
          startYearType = 'same_as'; // Map to UI type
          startFields = { startOnOtherSeries: es.start.eventSeries || '' };
          break;
        case 'startAfter':
          startYearType = 'after'; // Map to UI type
          startFields = { startOnOtherSeries: es.start.eventSeries || '' };
          break;
        default:
          console.warn(`Unknown event start type: ${es.start.type}. Defaulting to fixed.`);
          startYearType = 'fixed';
          startFields = { startYear: '2024' };
      }

      if (!es.duration || typeof es.duration !== 'object') {
        throw new Error(`Invalid event duration configuration for event: ${es.name}`);
      }

      let durationFields: any = {};
      switch (es.duration.type) {
        case 'fixed':
          durationFields = { durationType: 'fixed', durationFixed: String(es.duration.value ?? 1) };
          break;
        case 'uniform':
        case 'random_uniform': // Handle both 'uniform' and 'random_uniform'
          durationFields = {
            durationType: 'random_uniform',
            durationMin: String(es.duration.lower ?? 1),
            durationMax: String(es.duration.upper ?? 1)
          };
          break;
        case 'normal':
        case 'random_normal': // Handle both 'normal' and 'random_normal'
          durationFields = {
            durationType: 'random_normal',
            durationMean: String(es.duration.mean ?? 1),
            durationStd: String(es.duration.stdev ?? 0)
          };
          break;
        default:
          console.warn(`Unknown event duration type: ${es.duration.type}. Defaulting to fixed.`);
          durationFields = { durationType: 'fixed', durationFixed: '1' };
      }

      const baseEvent = {
        name: es.name,
        description: es.description || es.name, // Add optional description
        startYearType: startYearType,
        ...startFields,
        ...durationFields,
      };

      // Add type-specific properties
      if (es.type === 'income' || es.type === 'expense') {
        let changeFields: any = {};
        
        if (!es.changeDistribution) {
          // Default for missing change distribution
          changeFields = { annualChangeType: 'fixed', annualChange: '0' };
        } else {
          switch (es.changeDistribution.type) {
            case 'fixed':
              changeFields = { annualChangeType: 'fixed', annualChange: String(es.changeDistribution.value ?? 0) };
              break;
            case 'uniform':
            case 'random_uniform': // Handle both 'uniform' and 'random_uniform'
              changeFields = {
                annualChangeType: 'random_uniform',
                annualChangeMin: String(es.changeDistribution.lower ?? 0),
                annualChangeMax: String(es.changeDistribution.upper ?? 0)
              };
              break;
            case 'normal':
            case 'random_normal': // Handle both 'normal' and 'random_normal'
              changeFields = {
                annualChangeType: 'random_normal',
                annualChangeMean: String(es.changeDistribution.mean ?? 0),
                annualChangeStd: String(es.changeDistribution.stdev ?? 0)
              };
              break;
            default:
              console.warn(`Unknown event change type: ${es.changeDistribution.type}. Defaulting to fixed.`);
              changeFields = { annualChangeType: 'fixed', annualChange: '0' };
          }
        }

        const isExpense = es.type === 'expense';
        const spendingStrategy = isExpense && es.discretionary ? String(spendingOrderMap.get(es.name) ?? index + 1) : undefined;

        return {
          ...baseEvent,
          type: es.type,
          amount: String(es.initialAmount || 0),
          changeAmtOrPct: es.changeAmtOrPct || 'amount',
          ...changeFields,
          inflationAdjusted: es.inflationAdjusted || false,
          userPercentage: es.userFraction ? String(es.userFraction * 100) : '100',
          ...(es.type === 'income' ? { isSocialSecurity: es.socialSecurity || false } : {}),
          ...(isExpense ? { isDiscretionary: es.discretionary || false, spendingStrategy } : {})
        } as IncomeEvent | ExpenseEvent; // Cast to specific types

      } else if (es.type === 'invest' || es.type === 'rebalance') {
        let allocationFields: any = {};
        if (es.glidePath) {
          const initialAllocations: Record<string, string> = {};
          if (es.assetAllocation) {
            // Handle asset allocations for investments - convert from percentages (0.6, 0.4) to integer percentage strings ("60", "40")
            Object.entries(es.assetAllocation).forEach(([key, value]) => {
              // Ensure we get the exact percentage value from the YAML, even if it's 0
              const pct = value === 0 ? 0 : (value || 0);
              // Convert decimal to percentage string (0.6 → "60")
              initialAllocations[key] = String(Math.round(pct * 100));
            });
          }
          const finalAllocations: Record<string, string> = {};
          if (es.assetAllocation2) {
            Object.entries(es.assetAllocation2).forEach(([key, value]) => {
              // Convert percentage to integer string (0.6 → "60")
              finalAllocations[key] = String(Math.round((value ?? 0) * 100));
            });
          }
          allocationFields = { allocationType: 'glide', initialAllocations, finalAllocations };
        } else {
          const allocations: Record<string, string> = {};
          if (es.assetAllocation) {
            Object.entries(es.assetAllocation).forEach(([key, value]) => {
              // Convert percentage to integer string (0.6 → "60")
              allocations[key] = String(Math.round((value ?? 0) * 100));
            });
          }
          allocationFields = { allocationType: 'fixed', allocations };
        }

        return {
          ...baseEvent,
          type: es.type,
          ...allocationFields,
          ...(es.type === 'invest' ? { maxCashValue: es.maxCash !== undefined ? String(es.maxCash) : '0' } : {})
        } as any; // Use a generic type assertion
      } else {
        console.warn(`Unknown event series type: ${es.type}`);
        // Return a default or throw an error, here returning null and filtering later
        return null;
      }
    }).filter((event: any) => event !== null) as any; // Use type assertion to avoid type mismatch

    return res;
  } catch (error) {
    // Re-throw with the original error message for better debugging
    console.error("Error parsing YAML:", error);
    throw error;
  }
}

// POST endpoint – fetches scenario(s) by ownerId or id and applies the transformation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.scenarioYaml) {
      return NextResponse.json({
        status: 400,
        error: "Missing YAML content"
      }, { status: 400 });
    }
    
    let scenarioYaml;
    try {
      scenarioYaml = yamlToScenario(body.scenarioYaml);
    } catch (err) {
      // Return a 400 error for YAML parsing/validation issues
      return NextResponse.json({
        status: 400,
        error: err instanceof Error ? err.message : "Invalid YAML format"
      }, { status: 400 });
    }

    // If saveToDB flag is true, save the scenario to the database
    if (body.saveToDB && body.userEmail) {
      try {
        // Convert string values to appropriate types for database storage
        const convertEventSeriesForDB = (eventSeries: any[]) => {
          return eventSeries.map((event: any) => {
            // Create a new object to hold the converted values
            const convertedEvent: any = {};
            
            // Copy all properties from the original event
            for (const [key, value] of Object.entries(event)) {
              // Skip this for proper handling later
              if (key === 'maxCashValue') continue;
              
              // Just assign the original value for now
              convertedEvent[key] = value;
            }
            
            // Handle numeric conversions for common fields
            if (event.amount) convertedEvent.amount = parseFloat(event.amount);
            if (event.userPercentage) convertedEvent.userPercentage = parseFloat(event.userPercentage);
            
            // Handle duration fields
            if ('durationFixed' in event && event.durationFixed) {
              convertedEvent.durationFixed = parseInt(event.durationFixed);
            }
            if ('durationMin' in event && event.durationMin) {
              convertedEvent.durationMin = parseInt(event.durationMin);
            }
            if ('durationMax' in event && event.durationMax) {
              convertedEvent.durationMax = parseInt(event.durationMax);
            }
            if ('durationMean' in event && event.durationMean) {
              convertedEvent.durationMean = parseFloat(event.durationMean);
            }
            if ('durationStd' in event && event.durationStd) {
              convertedEvent.durationStd = parseFloat(event.durationStd);
            }
            
            // Handle start year fields
            if ('startYear' in event && event.startYear) {
              convertedEvent.startYear = parseInt(event.startYear);
            }
            if ('startYearMin' in event && event.startYearMin) {
              convertedEvent.startYearMin = parseInt(event.startYearMin);
            }
            if ('startYearMax' in event && event.startYearMax) {
              convertedEvent.startYearMax = parseInt(event.startYearMax);
            }
            if ('startYearMean' in event && event.startYearMean) {
              convertedEvent.startYearMean = parseFloat(event.startYearMean);
            }
            if ('startYearStd' in event && event.startYearStd) {
              convertedEvent.startYearStd = parseFloat(event.startYearStd);
            }
            
            // Handle event-specific fields
            if (event.type === 'income' || event.type === 'expense') {
              // Annual change fields
              if ('annualChangeType' in event) {
                if (event.annualChangeType === 'fixed' && 'annualChange' in event && event.annualChange) {
                  convertedEvent.annualChange = parseFloat(event.annualChange);
                } else if (event.annualChangeType === 'random_uniform') {
                  if ('annualChangeMin' in event && event.annualChangeMin) {
                    convertedEvent.annualChangeMin = parseFloat(event.annualChangeMin);
                  }
                  if ('annualChangeMax' in event && event.annualChangeMax) {
                    convertedEvent.annualChangeMax = parseFloat(event.annualChangeMax);
                  }
                } else if (event.annualChangeType === 'random_normal') {
                  if ('annualChangeMean' in event && event.annualChangeMean) {
                    convertedEvent.annualChangeMean = parseFloat(event.annualChangeMean);
                  }
                  if ('annualChangeStd' in event && event.annualChangeStd) {
                    convertedEvent.annualChangeStd = parseFloat(event.annualChangeStd);
                  }
                }
              }
              
              // For expense events with spending strategy
              if (event.type === 'expense' && 'spendingStrategy' in event && event.spendingStrategy) {
                convertedEvent.spendingStrategy = parseInt(event.spendingStrategy);
              }
            } else if (event.type === 'invest') {
              // Handle maxCashValue for invest events
              if ('maxCashValue' in event && event.maxCashValue) {
                convertedEvent.maxCashValue = parseFloat(String(event.maxCashValue));
              }
            }
            
            return convertedEvent;
          });
        };
        
        // Format data for the database - parse strings to appropriate number types
        const scenarioData = {
          ...scenarioYaml,
          userEmail: body.userEmail,
          // Parse numeric values to ensure they're stored as numbers, not strings
          financialGoal: parseInt(scenarioYaml.financialGoal) || 0,
          userBirthYear: parseInt(scenarioYaml.userBirthYear) || 0,
          userLifeExpectancyMean: parseFloat(scenarioYaml.userLifeExpectancyMean) || 0,
          userLifeExpectancyStd: parseFloat(scenarioYaml.userLifeExpectancyStd) || 0,
          initialAfterTaxRetirementContributionLimit: parseFloat(scenarioYaml.initialAfterTaxRetirementContributionLimit || '0') || 0,
          
          // Handle optional spouse fields - only include if present
          ...(scenarioYaml.forIndividual === false && scenarioYaml.spouseBirthYear ? {
            spouseBirthYear: parseInt(scenarioYaml.spouseBirthYear) || 0,
          } : {}),
          ...(scenarioYaml.forIndividual === false && scenarioYaml.spouseLifeExpectancyMean ? {
            spouseLifeExpectancyMean: parseFloat(scenarioYaml.spouseLifeExpectancyMean) || 0,
          } : {}),
          ...(scenarioYaml.forIndividual === false && scenarioYaml.spouseLifeExpectancyStd ? {
            spouseLifeExpectancyStd: parseFloat(scenarioYaml.spouseLifeExpectancyStd) || 0,
          } : {}),
          
          // Handle roth optimization fields
          ...(scenarioYaml.rothOptimizationStartYear ? {
            rothOptimizationStartYear: parseInt(scenarioYaml.rothOptimizationStartYear) || 0,
          } : {}),
          ...(scenarioYaml.rothOptimizationEndYear ? {
            rothOptimizationEndYear: parseInt(scenarioYaml.rothOptimizationEndYear) || 0,
          } : {}),
          
          // Parse inflation values based on inflation assumption type
          ...(scenarioYaml.inflationAssumption === 'fixed' && scenarioYaml.inflation ? {
            inflation: parseFloat(scenarioYaml.inflation) || 0,
          } : {}),
          ...(scenarioYaml.inflationAssumption === 'random_uniform' ? {
            inflationMin: parseFloat(scenarioYaml.inflationMin || '0') || 0,
            inflationMax: parseFloat(scenarioYaml.inflationMax || '0') || 0,
          } : {}),
          ...(scenarioYaml.inflationAssumption === 'random_normal' ? {
            inflationMean: parseFloat(scenarioYaml.inflationMean || '0') || 0,
            inflationStd: parseFloat(scenarioYaml.inflationStd || '0') || 0,
          } : {}),
          
          // Process array values
          assetTypes: scenarioYaml.assetTypes.map(asset => ({
            ...asset,
            expenseRatio: parseFloat(asset.expenseRatio) || 0,
            fixedReturn: asset.fixedReturn ? parseFloat(asset.fixedReturn) : undefined,
            normalReturnMean: asset.normalReturnMean ? parseFloat(asset.normalReturnMean) : undefined,
            normalReturnStd: asset.normalReturnStd ? parseFloat(asset.normalReturnStd) : undefined,
            normalIncomeMean: parseFloat(asset.normalIncomeMean || '0') || 0,
            normalIncomeStd: parseFloat(asset.normalIncomeStd || '0') || 0
          })),
          investments: scenarioYaml.investments.map(inv => ({
            ...inv,
            value: parseFloat(inv.value) || 0,
            rmdStrategy: inv.rmdStrategy ? parseInt(inv.rmdStrategy) : undefined,
            rothConversionStrategy: inv.rothConversionStrategy ? parseInt(inv.rothConversionStrategy) : undefined,
            expenseWithdrawalStrategy: parseInt(inv.expenseWithdrawalStrategy) || 0
          })),
          // Use the helper function to convert event series
          eventSeries: convertEventSeriesForDB(scenarioYaml.eventSeries)
        };

        // Call the main scenarios API endpoint
        const scenariosApiUrl = new URL(request.url);
        const baseUrl = `${scenariosApiUrl.protocol}//${scenariosApiUrl.host}`;
        const response = await fetch(`${baseUrl}/api/scenarios`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(scenarioData),
        });

        if (!response.ok) {
          throw new Error(`Failed to save scenario: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.status === 201) {
          return NextResponse.json({
            status: 201,
            message: "Scenario imported and saved successfully",
            data: result.result
          });
        } else {
          return NextResponse.json({
            status: 400,
            error: result.error || "Failed to save scenario"
          }, { status: 400 });
        }
      } catch (error) {
        // Specific error for database save failures
        console.error("Error saving scenario to database:", error);
        return NextResponse.json({
          status: 500,
          error: error instanceof Error ? `Failed to save scenario: ${error.message}` : "Failed to save scenario"
        }, { status: 500 });
      }
    }

    // If not saving to DB, just return the transformed data
    return NextResponse.json({ status: 200, data: scenarioYaml });
  } catch (error) {
    console.error("Error importing scenario:", error);
    return NextResponse.json({
      status: 400, // Use 400 for client errors like invalid YAML
      error: error instanceof Error ? error.message : "Failed to import scenario"
    }, { status: 400 });
  }
}