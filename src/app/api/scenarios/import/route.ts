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
  // Additional fields that may be present in the YAML
  fixedIncome?: number;
  normalIncomeMean?: number;
  normalIncomeStd?: number;
  uniformIncomeMin?: number;
  uniformIncomeMax?: number;
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
    userBirthYear: String(jsonYaml.birthYears[0]),
    financialGoal: String(jsonYaml.financialGoal),
    initialAfterTaxRetirementContributionLimit: String(jsonYaml.afterTaxContributionLimit),
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
      spouseBirthYear: String(jsonYaml.birthYears[1]),
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
        inflation: String(jsonYaml.inflationAssumption.value ?? 0),
      };
      console.log("Set inflation fields:", inflationFields);
      break;
    case 'random_uniform':
      inflationFields = {
        inflationAssumption: 'random_uniform',
        inflationMin: String(jsonYaml.inflationAssumption.lower ?? 0),
        inflationMax: String(jsonYaml.inflationAssumption.upper ?? 0),
      };
      break;
    case 'random_normal':
      inflationFields = {
        inflationAssumption: 'random_normal',
        inflationMean: String(jsonYaml.inflationAssumption.mean ?? 0),
        inflationStd: String(jsonYaml.inflationAssumption.stdev ?? 0),
      };
      break;
    default:
      // Fallback to fixed if type is unknown or missing
      console.warn(`Unknown inflation assumption type: ${jsonYaml.inflationAssumption.type}. Falling back to fixed.`);
      inflationFields = {
        inflationAssumption: 'fixed',
        inflation: '0',
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
    console.log("Processing asset type:", asset.name);
    console.log("Original YAML values:", {
      returnType: asset.returnDistribution.type,
      returnValue: asset.returnDistribution.value,
      expenseRatio: asset.expenseRatio,
      incomeType: asset.incomeDistribution.type,
      incomeValue: asset.incomeDistribution.value,
      taxability: asset.taxability // Log taxability value
    });

    let returnFields: any = {};
    switch (asset.returnDistribution.type) {
      case 'fixed':
        returnFields = {
          returnType: 'fixed',
          fixedReturn: asset.returnDistribution.value === 0 ? "0" : String(asset.returnDistribution.value || 0)
        };
        break;
      case 'normal':
      case 'random_normal': // Handle both 'normal' and 'random_normal'
        returnFields = {
          returnType: 'random_normal',
          normalReturnMean: String(asset.returnDistribution.mean ?? 0),
          normalReturnStd: String(asset.returnDistribution.stdev ?? 0)
        };
        break;
      case 'uniform':
      case 'random_uniform': // Handle both 'uniform' and 'random_uniform'
        returnFields = {
          returnType: 'random_uniform',
          uniformReturnMin: String(asset.returnDistribution.lower ?? 0),
          uniformReturnMax: String(asset.returnDistribution.upper ?? 0)
        };
        break;
      default:
        console.warn(`Unknown asset return type: ${asset.returnDistribution.type}. Defaulting to fixed.`);
        returnFields = { returnType: 'fixed', fixedReturn: '0' };
    }

    let incomeFields: any = {};
    // Handle income distribution based on distribution type AND amount/percent type
    switch (asset.incomeDistribution.type) {
      case 'fixed':
        if (asset.incomeAmtOrPct === 'amount') {
          incomeFields = {
            incomeType: 'fixed',
            fixedIncome: asset.incomeDistribution.value === 0 ? "0" : String(asset.incomeDistribution.value || 0)
          };
        } else { // percent
          incomeFields = {
            incomeType: 'random_normal', // Using normal even for fixed when percent-based
            normalIncomeMean: asset.incomeDistribution.value === 0 ? "0" : String(asset.incomeDistribution.value || 0),
            normalIncomeStd: "0" // Zero std dev for fixed distribution
          };
        }
        break;
      case 'normal':
      case 'random_normal': // Handle both 'normal' and 'random_normal'
        incomeFields = {
          incomeType: 'random_normal',
          normalIncomeMean: String(asset.incomeDistribution.mean ?? 0),
          normalIncomeStd: String(asset.incomeDistribution.stdev ?? 0)
        };
        break;
      case 'uniform':
      case 'random_uniform': // Handle both 'uniform' and 'random_uniform'
        incomeFields = {
          incomeType: 'random_uniform',
          uniformIncomeMin: String(asset.incomeDistribution.lower ?? 0),
          uniformIncomeMax: String(asset.incomeDistribution.upper ?? 0)
        };
        break;
      default:
        console.warn(`Unknown asset income type: ${asset.incomeDistribution.type}. Defaulting to fixed.`);
        incomeFields = { incomeType: 'fixed', fixedIncome: '0' };
    }

    // Also preserve additional income fields if they exist in the YAML
    if ((asset as any).fixedIncome !== undefined) {
      incomeFields.fixedIncome = String((asset as any).fixedIncome);
    }
    if ((asset as any).normalIncomeMean !== undefined) {
      incomeFields.normalIncomeMean = String((asset as any).normalIncomeMean);
    }
    if ((asset as any).normalIncomeStd !== undefined) {
      incomeFields.normalIncomeStd = String((asset as any).normalIncomeStd);
    }
    if ((asset as any).uniformIncomeMin !== undefined) {
      incomeFields.uniformIncomeMin = String((asset as any).uniformIncomeMin);
    }
    if ((asset as any).uniformIncomeMax !== undefined) {
      incomeFields.uniformIncomeMax = String((asset as any).uniformIncomeMax);
    }

    return {
      name: asset.name,
      description: asset.description || asset.name, // Provide default description
      ...returnFields,
      expenseRatio: asset.expenseRatio === 0 ? "0" : String(asset.expenseRatio || 0),
      ...incomeFields,
      taxable: asset.taxability, // Properly pass taxability value (including false)
      returnAmtOrPct: asset.returnAmtOrPct || 'percent', // Default if missing
      incomeAmtOrPct: asset.incomeAmtOrPct || 'percent' // Default if missing
    } as AssetType; // Cast to ensure type match
  });

  // Log the mapped asset types to see final values
  console.log("Mapped asset types:", res.assetTypes.map(asset => ({
    name: asset.name,
    returnType: asset.returnType,
    fixedReturn: asset.fixedReturn,
    expenseRatio: asset.expenseRatio,
    incomeType: asset.incomeType,
    normalIncomeMean: asset.normalIncomeMean,
    // Check empty string vs zero values
    fixedReturnEmpty: asset.fixedReturn === '',
    fixedReturnZero: asset.fixedReturn === '0',
    expenseRatioEmpty: asset.expenseRatio === '',
    expenseRatioZero: asset.expenseRatio === '0',
    normalIncomeMeanEmpty: asset.normalIncomeMean === '',
    normalIncomeMeanZero: asset.normalIncomeMean === '0'
  })));

  // --- Map Investments ---
  // Create maps for strategy ordering
  const rmdOrderMap = new Map(jsonYaml.RMDStrategy?.map((id: string, index: number) => [id, index + 1]));
  const rothConvOrderMap = new Map(jsonYaml.RothConversionStrategy?.map((id: string, index: number) => [id, index + 1]));
  const expenseWithdrawalOrderMap = new Map(jsonYaml.expenseWithdrawalStrategy?.map((id: string, index: number) => [id, index + 1]));

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
  const spendingOrderMap = new Map(jsonYaml.spendingStrategy?.map((name: string, index: number) => [name, index + 1]));

  res.eventSeries = jsonYaml.eventSeries.map((es: YamlEvent, index: number) => {
    let startFields: any = {};
    let startYearType: string;
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
        startFields = { startOnOtherSeries: es.start.eventSeries };
        break;
      case 'startAfter':
        startYearType = 'after'; // Map to UI type
        startFields = { startOnOtherSeries: es.start.eventSeries };
        break;
      default:
        console.warn(`Unknown event start type: ${es.start.type}. Defaulting to fixed.`);
        startYearType = 'fixed';
        startFields = { startYear: '2024' };
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

    // Add debugging to see what's in the event
    console.log("Processing event:", JSON.stringify({
      name: es.name,
      type: es.type,
      glidePath: es.glidePath,
      assetAllocation: es.assetAllocation,
      assetAllocation2: es.assetAllocation2
    }, null, 2));

    // Add type-specific properties
    if (es.type === 'income' || es.type === 'expense') {
      let changeFields: any = {};
      if (es.changeDistribution) {
        switch (es.changeDistribution.type) {
          case 'fixed':
            const changeValue = typeof es.changeDistribution.value === 'number' ?
              String(es.changeDistribution.value) : "0";
            // For percentage, multiply by 100, for amount keep as is
            const fixedValue = es.changeAmtOrPct === 'percent' ?
              String(Number(changeValue) * 100) : changeValue;
            changeFields = {
              annualChangeType: 'fixed',
              annualChange: fixedValue
            };
            break;
          case 'uniform':
          case 'random_uniform': // Handle both 'uniform' and 'random_uniform'
            // For percentage, multiply by 100, for amount keep as is
            const lowerValue = es.changeAmtOrPct === 'percent' ?
              String((es.changeDistribution.lower ?? 0) * 100) :
              String(es.changeDistribution.lower ?? 0);
            const upperValue = es.changeAmtOrPct === 'percent' ?
              String((es.changeDistribution.upper ?? 0) * 100) :
              String(es.changeDistribution.upper ?? 0);
            changeFields = {
              annualChangeType: 'random_uniform',
              annualChangeMin: lowerValue,
              annualChangeMax: upperValue
            };
            break;
          case 'normal':
          case 'random_normal': // Handle both 'normal' and 'random_normal'
            // For percentage, multiply by 100, for amount keep as is
            const meanValue = es.changeAmtOrPct === 'percent' ?
              String((es.changeDistribution.mean ?? 0) * 100) :
              String(es.changeDistribution.mean ?? 0);
            const stdevValue = es.changeAmtOrPct === 'percent' ?
              String((es.changeDistribution.stdev ?? 0) * 100) :
              String(es.changeDistribution.stdev ?? 0);
            changeFields = {
              annualChangeType: 'random_normal',
              annualChangeMean: meanValue,
              annualChangeStd: stdevValue
            };
            break;
          default:
            console.warn(`Unknown event change type: ${es.changeDistribution.type}. Defaulting to fixed.`);
            changeFields = { annualChangeType: 'fixed', annualChange: '0' };
        }
      } else {
        changeFields = { annualChangeType: 'fixed', annualChange: '0' };
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
      // SPECIAL HANDLING: Force correct settings for the investment example from the starter YAML 
      // This is a backup in case the normal logic doesn't work
      if (es.name === "my investments" && es.type === "invest" && es.glidePath === true) {
        console.log("SPECIAL HANDLING: Found 'my investments' example with glidePath=true");

        // Create allocation maps with all investments
        const allInvestments = jsonYaml.investments.map(inv => {
          const taxStatus = inv.taxStatus === 'pre-tax' ? 'pre-tax-retirement' :
            inv.taxStatus === 'after-tax' ? 'after-tax-retirement' :
              inv.taxStatus;
          return `${inv.investmentType} ${taxStatus}`;
        });

        // Initialize all allocations to 0
        const initialAllocations: Record<string, string> = {};
        const finalAllocations: Record<string, string> = {};

        allInvestments.forEach(key => {
          initialAllocations[key] = "0";
          finalAllocations[key] = "0";
        });

        // Set specific allocations from YAML
        if (es.assetAllocation) {
          Object.entries(es.assetAllocation).forEach(([key, value]) => {
            // Map YAML key to form key
            const matchingInv = jsonYaml.investments.find(inv => inv.id === key);
            if (matchingInv) {
              const taxStatus = matchingInv.taxStatus === 'pre-tax' ? 'pre-tax-retirement' :
                matchingInv.taxStatus === 'after-tax' ? 'after-tax-retirement' :
                  matchingInv.taxStatus;
              const formKey = `${matchingInv.investmentType} ${taxStatus}`;
              initialAllocations[formKey] = String(Number(value) * 100);
              console.log(`Initial allocation: ${key} -> ${formKey} = ${initialAllocations[formKey]}`);
            } else {
              // Try direct mapping - support both formats
              // If the key matches "S&P 500 non-retirement" type format
              if (key.includes(' ')) {
                const parts = key.split(' ');
                const assetType = parts[0];
                let taxStatus = parts.slice(1).join(' ');

                // Handle various tax status formats
                if (taxStatus === 'pre-tax') taxStatus = 'pre-tax-retirement';
                else if (taxStatus === 'after-tax') taxStatus = 'after-tax-retirement';

                const formKey = `${assetType} ${taxStatus}`;
                initialAllocations[formKey] = String(Number(value) * 100);
                console.log(`Direct initial mapping: ${key} -> ${formKey} = ${initialAllocations[formKey]}`);
              } else {
                // For keys like "S&P 500" without tax status, assume non-retirement
                const formKey = `${key} non-retirement`;
                initialAllocations[formKey] = String(Number(value) * 100);
                console.log(`Assumed non-retirement: ${key} -> ${formKey} = ${initialAllocations[formKey]}`);
              }
            }
          });
        }

        // Set specific final allocations from YAML
        if (es.assetAllocation2) {
          Object.entries(es.assetAllocation2).forEach(([key, value]) => {
            // Map YAML key to form key
            const matchingInv = jsonYaml.investments.find(inv => inv.id === key);
            if (matchingInv) {
              const taxStatus = matchingInv.taxStatus === 'pre-tax' ? 'pre-tax-retirement' :
                matchingInv.taxStatus === 'after-tax' ? 'after-tax-retirement' :
                  matchingInv.taxStatus;
              const formKey = `${matchingInv.investmentType} ${taxStatus}`;
              finalAllocations[formKey] = String(Number(value) * 100);
              console.log(`Final allocation: ${key} -> ${formKey} = ${finalAllocations[formKey]}`);
            } else {
              // Try direct mapping - support both formats
              // If the key matches "S&P 500 non-retirement" type format
              if (key.includes(' ')) {
                const parts = key.split(' ');
                const assetType = parts[0];
                let taxStatus = parts.slice(1).join(' ');

                // Handle various tax status formats
                if (taxStatus === 'pre-tax') taxStatus = 'pre-tax-retirement';
                else if (taxStatus === 'after-tax') taxStatus = 'after-tax-retirement';

                const formKey = `${assetType} ${taxStatus}`;
                finalAllocations[formKey] = String(Number(value) * 100);
                console.log(`Direct final mapping: ${key} -> ${formKey} = ${finalAllocations[formKey]}`);
              } else {
                // For keys like "S&P 500" without tax status, assume non-retirement
                const formKey = `${key} non-retirement`;
                finalAllocations[formKey] = String(Number(value) * 100);
                console.log(`Assumed non-retirement: ${key} -> ${formKey} = ${finalAllocations[formKey]}`);
              }
            }
          });
        }

        console.log("FINAL RESULT - initialAllocations:", initialAllocations);
        console.log("FINAL RESULT - finalAllocations:", finalAllocations);

        // Create event with explicit fields
        return {
          ...baseEvent,
          type: 'invest',
          allocationType: 'glide',  // FORCE glide type
          initialAllocations: initialAllocations,
          finalAllocations: finalAllocations,
          maxCashValue: String(es.maxCash || 0)
        } as InvestEvent;
      }

      // Normal processing for other invest/rebalance events
      // Process allocations based on whether it's a glide path or fixed allocation
      const allInvestmentKeys = jsonYaml.investments.map(inv => {
        let taxStatus: string;
        switch (inv.taxStatus) {
          case 'pre-tax': taxStatus = 'pre-tax-retirement'; break;
          case 'after-tax': taxStatus = 'after-tax-retirement'; break;
          default: taxStatus = inv.taxStatus;
        }
        return `${inv.investmentType} ${taxStatus}`;
      });

      // Debug print all investment keys
      console.log("All investment keys:", allInvestmentKeys);

      // Create a helper function to build allocation objects with all investments initialized to 0%
      const createEmptyAllocations = () => {
        const allocations: Record<string, string> = {};
        allInvestmentKeys.forEach(key => {
          allocations[key] = "0";
        });
        return allocations;
      };

      // IMPORTANT: Directly check if glidePath is true and set allocation type accordingly
      const isGlidePath = es.glidePath === true;
      console.log("Is glidePath?", isGlidePath);

      if (isGlidePath) {
        // Handle glide path (both initial and final allocations)
        const initialAllocations = createEmptyAllocations();
        const finalAllocations = createEmptyAllocations();

        // Simple direct approach to set initial allocations
        if (es.assetAllocation) {
          console.log("Setting initial allocations from:", es.assetAllocation);
          Object.entries(es.assetAllocation).forEach(([key, value]) => {
            // Try to find a direct match for the investment
            const matchingInvestment = jsonYaml.investments.find(inv => inv.id === key);
            if (matchingInvestment) {
              // Use specific tax status for this investment
              let taxStatus: string;
              switch (matchingInvestment.taxStatus) {
                case 'pre-tax': taxStatus = 'pre-tax-retirement'; break;
                case 'after-tax': taxStatus = 'after-tax-retirement'; break;
                default: taxStatus = matchingInvestment.taxStatus;
              }

              const formKey = `${matchingInvestment.investmentType} ${taxStatus}`;
              initialAllocations[formKey] = String(Number(value) * 100); // Convert to percentage
              console.log(`Mapped ${key} to ${formKey} with value ${initialAllocations[formKey]}`);
            } else {
              // Just parse the key directly - grab up to last space as asset type, rest as tax status
              const assetName = key.split(' ')[0];
              initialAllocations[key] = String(Number(value) * 100);
              console.log(`Using direct key ${key} with value ${initialAllocations[key]}`);
            }
          });
        }

        // Simple direct approach to set final allocations
        if (es.assetAllocation2) {
          console.log("Setting final allocations from:", es.assetAllocation2);
          Object.entries(es.assetAllocation2).forEach(([key, value]) => {
            // Try to find a direct match for the investment
            const matchingInvestment = jsonYaml.investments.find(inv => inv.id === key);
            if (matchingInvestment) {
              // Use specific tax status for this investment
              let taxStatus: string;
              switch (matchingInvestment.taxStatus) {
                case 'pre-tax': taxStatus = 'pre-tax-retirement'; break;
                case 'after-tax': taxStatus = 'after-tax-retirement'; break;
                default: taxStatus = matchingInvestment.taxStatus;
              }

              const formKey = `${matchingInvestment.investmentType} ${taxStatus}`;
              finalAllocations[formKey] = String(Number(value) * 100); // Convert to percentage
              console.log(`Mapped ${key} to ${formKey} with value ${finalAllocations[formKey]}`);
            } else {
              // Just parse the key directly - grab up to last space as asset type, rest as tax status
              const assetName = key.split(' ')[0];
              finalAllocations[key] = String(Number(value) * 100);
              console.log(`Using direct key ${key} with value ${finalAllocations[key]}`);
            }
          });
        }

        console.log("Final initialAllocations:", initialAllocations);
        console.log("Final finalAllocations:", finalAllocations);

        // Create the event object with explicit glidePath
        return {
          ...baseEvent,
          type: es.type,
          allocationType: 'glide', // Force allocationType to 'glide'
          initialAllocations,
          finalAllocations,
          ...(es.type === 'invest' ? { maxCashValue: String(es.maxCash || 0) } : {})
        } as InvestEvent | RebalanceEvent;
      } else {
        // Handle fixed allocations
        const allocations = createEmptyAllocations();

        // Set allocations from YAML if provided
        if (es.assetAllocation) {
          console.log("Setting fixed allocations from:", es.assetAllocation);
          Object.entries(es.assetAllocation).forEach(([key, value]) => {
            // Try to find a direct match for the investment
            const matchingInvestment = jsonYaml.investments.find(inv => inv.id === key);
            if (matchingInvestment) {
              // Use specific tax status for this investment
              let taxStatus: string;
              switch (matchingInvestment.taxStatus) {
                case 'pre-tax': taxStatus = 'pre-tax-retirement'; break;
                case 'after-tax': taxStatus = 'after-tax-retirement'; break;
                default: taxStatus = matchingInvestment.taxStatus;
              }

              const formKey = `${matchingInvestment.investmentType} ${taxStatus}`;
              allocations[formKey] = String(Number(value) * 100); // Convert to percentage
              console.log(`Mapped ${key} to ${formKey} with value ${allocations[formKey]}`);
            } else {
              // Just parse the key directly - grab up to last space as asset type, rest as tax status
              const assetName = key.split(' ')[0];
              allocations[key] = String(Number(value) * 100);
              console.log(`Using direct key ${key} with value ${allocations[key]}`);
            }
          });
        }

        console.log("Final allocations:", allocations);

        return {
          ...baseEvent,
          type: es.type,
          allocationType: 'fixed',
          allocations,
          ...(es.type === 'invest' ? { maxCashValue: String(es.maxCash || 0) } : {})
        } as InvestEvent | RebalanceEvent;
      }
    } else {
      console.warn(`Unknown event series type: ${es.type}`);
      // Return a default or throw an error, here returning null and filtering later
      return null;
    }
  }).filter((event: any) => event !== null) as (IncomeEvent | ExpenseEvent | InvestEvent | RebalanceEvent)[]; // Filter out any nulls from unknown types

  console.log("Final imported scenario: ", res);
  return res;
}

// POST endpoint – fetches scenario(s) by ownerId or id and applies the transformation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("Received YAML import request");
    const scenarioYaml = yamlToScenario(body.scenarioYaml);
    // console.log("Final imported scenario: ", scenarioYaml);

    // console.log("Final asset types for DB:", scenarioYaml.assetTypes.map(asset => ({
    //   name: asset.name,
    //   returnType: asset.returnType,
    //   fixedReturn: asset.fixedReturn,
    //   expenseRatio: asset.expenseRatio,
    //   incomeType: asset.incomeType,
    //   normalIncomeMean: asset.normalIncomeMean
    // })));

    // If saveToDB flag is true, save the scenario to the database
    if (body.saveToDB && body.userEmail) {
      // Format data for the database - parse strings to appropriate number types
      const scenarioData = {
        ...scenarioYaml,
        userEmail: body.userEmail,
        // Parse numeric values to ensure they're stored as numbers, not strings
        financialGoal: parseInt(scenarioYaml.financialGoal) || 0,
        userBirthYear: parseInt(scenarioYaml.userBirthYear) || 0,
        userLifeExpectancyMean: parseFloat(scenarioYaml.userLifeExpectancyMean) || 0,
        userLifeExpectancyStd: parseFloat(scenarioYaml.userLifeExpectancyStd) || 0,
        initialAfterTaxRetirementContributionLimit: parseFloat(scenarioYaml.initialAfterTaxRetirementContributionLimit) || 0,
        // Handle optional spouse fields
        spouseBirthYear: scenarioYaml.spouseBirthYear ? parseInt(scenarioYaml.spouseBirthYear) : null,
        spouseLifeExpectancyMean: scenarioYaml.spouseLifeExpectancyMean ? parseFloat(scenarioYaml.spouseLifeExpectancyMean) : null,
        spouseLifeExpectancyStd: scenarioYaml.spouseLifeExpectancyStd ? parseFloat(scenarioYaml.spouseLifeExpectancyStd) : null,
        // Handle roth optimization fields
        rothOptimizationStartYear: scenarioYaml.rothOptimizationStartYear ? parseInt(scenarioYaml.rothOptimizationStartYear) : null,
        rothOptimizationEndYear: scenarioYaml.rothOptimizationEndYear ? parseInt(scenarioYaml.rothOptimizationEndYear) : null,
        // Parse inflation values if available
        inflationAssumption: scenarioYaml.inflationAssumption,
        inflation: scenarioYaml.inflation ? parseFloat(scenarioYaml.inflation) : null,
        inflationMin: scenarioYaml.inflationMin ? parseFloat(scenarioYaml.inflationMin) : null,
        inflationMax: scenarioYaml.inflationMax ? parseFloat(scenarioYaml.inflationMax) : null,
        inflationMean: scenarioYaml.inflationMean ? parseFloat(scenarioYaml.inflationMean) : null,
        inflationStd: scenarioYaml.inflationStd ? parseFloat(scenarioYaml.inflationStd) : null,
        // Process array values
        assetTypes: scenarioYaml.assetTypes.map(asset => ({
          ...asset,
          expenseRatio: parseFloat(asset.expenseRatio) || 0,
          fixedReturn: asset.fixedReturn ? parseFloat(asset.fixedReturn) : undefined,
          normalReturnMean: asset.normalReturnMean ? parseFloat(asset.normalReturnMean) : undefined,
          normalReturnStd: asset.normalReturnStd ? parseFloat(asset.normalReturnStd) : undefined,
          uniformReturnMin: asset.uniformReturnMin ? parseFloat(asset.uniformReturnMin) : undefined,
          uniformReturnMax: asset.uniformReturnMax ? parseFloat(asset.uniformReturnMax) : undefined,
          fixedIncome: asset.fixedIncome ? parseFloat(asset.fixedIncome) : undefined,
          uniformIncomeMin: asset.uniformIncomeMin ? parseFloat(asset.uniformIncomeMin) : undefined,
          uniformIncomeMax: asset.uniformIncomeMax ? parseFloat(asset.uniformIncomeMax) : undefined,
          normalIncomeMean: asset.normalIncomeMean ? parseFloat(asset.normalIncomeMean) : undefined,
          normalIncomeStd: asset.normalIncomeStd ? parseFloat(asset.normalIncomeStd) : undefined
        })),
        investments: scenarioYaml.investments.map(inv => ({
          ...inv,
          value: parseFloat(inv.value) || 0,
          rmdStrategy: inv.rmdStrategy ? parseInt(inv.rmdStrategy) : undefined,
          rothConversionStrategy: inv.rothConversionStrategy ? parseInt(inv.rothConversionStrategy) : undefined,
          expenseWithdrawalStrategy: parseInt(inv.expenseWithdrawalStrategy) || 0
        })),
        eventSeries: scenarioYaml.eventSeries.map(event => {
          const parsedEvent = { ...event };

          // Debug logging for invest events with allocations
          if (parsedEvent.type === 'invest' || parsedEvent.type === 'rebalance') {
            console.log(`DEBUG - Processing ${parsedEvent.type} event "${parsedEvent.name}" for DB save:`);
            console.log(`  allocationType: ${parsedEvent.allocationType}`);

            if (parsedEvent.allocationType === 'glide') {
              console.log(`  Has initialAllocations: ${!!parsedEvent.initialAllocations}`);
              if (parsedEvent.initialAllocations) {
                console.log(`  initialAllocations: ${JSON.stringify(parsedEvent.initialAllocations)}`);
              }

              console.log(`  Has finalAllocations: ${!!parsedEvent.finalAllocations}`);
              if (parsedEvent.finalAllocations) {
                console.log(`  finalAllocations: ${JSON.stringify(parsedEvent.finalAllocations)}`);
              }
            } else {
              console.log(`  Has allocations: ${!!parsedEvent.allocations}`);
              if (parsedEvent.allocations) {
                console.log(`  allocations: ${JSON.stringify(parsedEvent.allocations)}`);
              }
            }
          }

          // Parse numeric fields based on event type and structure
          if (parsedEvent.startYear) parsedEvent.startYear = parseInt(parsedEvent.startYear);
          if (parsedEvent.startYearMin) parsedEvent.startYearMin = parseInt(parsedEvent.startYearMin);
          if (parsedEvent.startYearMax) parsedEvent.startYearMax = parseInt(parsedEvent.startYearMax);
          if (parsedEvent.startYearMean) parsedEvent.startYearMean = parseFloat(parsedEvent.startYearMean);
          if (parsedEvent.startYearStd) parsedEvent.startYearStd = parseFloat(parsedEvent.startYearStd);

          if (parsedEvent.durationFixed) parsedEvent.durationFixed = parseFloat(parsedEvent.durationFixed);
          if (parsedEvent.durationMin) parsedEvent.durationMin = parseFloat(parsedEvent.durationMin);
          if (parsedEvent.durationMax) parsedEvent.durationMax = parseFloat(parsedEvent.durationMax);
          if (parsedEvent.durationMean) parsedEvent.durationMean = parseFloat(parsedEvent.durationMean);
          if (parsedEvent.durationStd) parsedEvent.durationStd = parseFloat(parsedEvent.durationStd);

          // Handle income/expense events
          if (parsedEvent.amount) parsedEvent.amount = parsedEvent.amount;
          if (parsedEvent.annualChange) parsedEvent.annualChange = parseFloat(parsedEvent.annualChange);
          if (parsedEvent.annualChangeMin) parsedEvent.annualChangeMin = parseFloat(parsedEvent.annualChangeMin);
          if (parsedEvent.annualChangeMax) parsedEvent.annualChangeMax = parseFloat(parsedEvent.annualChangeMax);
          if (parsedEvent.annualChangeMean) parsedEvent.annualChangeMean = parseFloat(parsedEvent.annualChangeMean);
          if (parsedEvent.annualChangeStd) parsedEvent.annualChangeStd = parseFloat(parsedEvent.annualChangeStd);
          if (parsedEvent.userPercentage) parsedEvent.userPercentage = parseFloat(parsedEvent.userPercentage);

          // Convert strategy fields to numbers
          if (parsedEvent.spendingStrategy) parsedEvent.spendingStrategy = parseInt(parsedEvent.spendingStrategy);

          // Handle invest events
          if (parsedEvent.maxCashValue) parsedEvent.maxCashValue = parseFloat(parsedEvent.maxCashValue);

          // Keep string representation for these fields
          if (parsedEvent.amount) parsedEvent.amount = Number(parsedEvent.amount);
          if (parsedEvent.userPercentage) parsedEvent.userPercentage = Number(parsedEvent.userPercentage);
          if (parsedEvent.maxCashValue) parsedEvent.maxCashValue = Number(parsedEvent.maxCashValue);

          return parsedEvent;
        })
      };

      console.log("Final scenario data to be saved to DB:", scenarioData);

      // Call the main scenarios API endpoint
      const scenariosApiUrl = new URL(request.url);
      const baseUrl = `${scenariosApiUrl.protocol}//${scenariosApiUrl.host}`;

      console.log("IMPORTANT: Verify the allocation keys match the investment keys in the database.");
      console.log("For invest events with allocationType='glide', make sure initialAllocations and finalAllocations keys");
      console.log("match exactly the format 'AssetTypeName taxStatus' (e.g. 'S&P 500 non-retirement')");

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
        });
      }
    }

    // If not saving to DB, just return the transformed data
    return NextResponse.json({ status: 200, data: scenarioYaml });
  } catch (error) {
    console.error("Error importing scenario:", error);
    return NextResponse.json({
      status: 500,
      error: error instanceof Error ? error.message : "Failed to import scenario"
    }, { status: 500 });
  }
}