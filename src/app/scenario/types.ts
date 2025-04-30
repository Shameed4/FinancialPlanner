// Shared inflation union
type FixedInflation = {
  inflationAssumption: 'fixed';
  inflation: string;
};

type UniformInflation = {
  inflationAssumption: 'random_uniform';
  inflationMin: string;
  inflationMax: string;
};

type NormalInflation = {
  inflationAssumption: 'random_normal';
  inflationMean: string;
  inflationStd: string;
};

type Inflation = FixedInflation | UniformInflation | NormalInflation;

// Shared base
interface SharedScenarioFields {
  name: string;
  userBirthYear: string;
  userLifeExpectancyMean: string;
  userLifeExpectancyStd: string;
  residenceState: string;
  financialGoal: string;
  initialAfterTaxRetirementContributionLimit?: string;
  assetTypes: AssetType[];
  investments: Investment[];
  eventSeries: Event[];
  enableTaxOptimization: boolean;
  rothOptimizationStartYear?: string;
  rothOptimizationEndYear?: string;
}

// Single-user version
export type IndividualScenarioFormData = SharedScenarioFields & {
  forIndividual: true;
} & Inflation;

// Joint-user version
export type JointScenarioFormData = SharedScenarioFields & {
  forIndividual: false;
  spouseBirthYear: string;
  spouseLifeExpectancyMean: string;
  spouseLifeExpectancyStd: string;
} & Inflation;

// Final discriminated union
export type StringScenarioFormData =
  | IndividualScenarioFormData
  | JointScenarioFormData;

export type AssetType = {
  name: string;
  description?: string;
  fixedReturn?: string;
  normalReturnMean?: string;
  normalReturnStd?: string;
  expenseRatio: string;
  normalIncomeMean?: string;
  normalIncomeStd?: string;
  taxable: boolean;
  returnAmtOrPct: AmountOrPercent;
  incomeAmtOrPct: AmountOrPercent;
} & (
  | { returnType: 'fixed'; fixedReturn: 'string'; }
  | { returnType: 'random_normal'; normalReturnMean: string; normalReturnStd: string; }
)

export type Investment = {
  assetType: string;
  value: string;
  rothConversionStrategy?: string;
  rmdStrategy?: string;
} & (
  | { taxStatus: 'non-retirement' | 'after-tax-retirement'}
  | { taxStatus: 'pre-tax-retirement', rothConversionStrategy: string, rmdStrategy: string; }
)

export type Event = {
  name: string;
  relativeStartYear?: string;

  amount?: string;
  userPercentage?: string;

  allocationType?: 'fixed' | 'glide';
  allocations?: Record<string, string>;
  initialAllocations?: Record<string, string>;
  finalAllocations?: Record<string, string>;
  maxCashValue?: string;

  changeAmtOrPct?: 'amount' | 'percent';
} & (
  | { startYearType: 'fixed'; startYear: string }
  | { startYearType: 'random_uniform'; startYearMin: string; startYearMax: string }
  | { startYearType: 'random_normal'; startYearMean: string; startYearStd: string }
  | { startYearType: 'same_as'; startOnOtherSeries: string }
  | { startYearType: 'after'; startOnOtherSeries: string }
) & (
  | { durationType: 'fixed'; durationFixed: string }
  | { durationType: 'random_uniform'; durationMin: string; durationMax: string }
  | { durationType: 'random_normal'; durationMean: string; durationStd: string }
) & (
  | { annualChangeType: 'fixed'; annualChange: string }
  | { annualChangeType: 'random_uniform'; annualChangeMin: string; annualChangeMax: string }
  | { annualChangeType: 'random_normal'; annualChangeMean: string; annualChangeStd: string }
) & (
  | IncomeEvent
  | ExpenseEvent
  | InvestEvent
  | RebalanceEvent
);

// Shared across income/expense
type AnnualChange =
  | { annualChangeType: 'fixed'; annualChange: string }
  | { annualChangeType: 'random_uniform'; annualChangeMin: string; annualChangeMax: string }
  | { annualChangeType: 'random_normal'; annualChangeMean: string; annualChangeStd: string }
  | { annualChangeType?: undefined };

type AmountOrPercent = 'amount' | 'percent';

interface BaseIncomeExpense {
  amount: string;
  changeAmtOrPct: AmountOrPercent;
  inflationAdjusted: boolean;
  userPercentage?: string;
}

export type IncomeEvent = {
  type: 'income';
  isSocialSecurity: boolean;
} & BaseIncomeExpense & AnnualChange;

export type ExpenseEvent = {
  type: 'expense';
} & BaseIncomeExpense & AnnualChange & (
  | { isDiscretionary: true; expenseWithdrawalStrategy: number }
  | { isDiscretionary: false }
);

// Asset Allocation Types
type FixedAllocation = {
  allocationType: 'fixed';
  allocations: Record<string, string>;
};

type GlideAllocation = {
  allocationType: 'glide';
  initialAllocations: Record<string, string>;
  finalAllocations: Record<string, string>;
};

export type InvestEvent = {
  type: 'invest';
  maxCashValue?: string;
} & (FixedAllocation | GlideAllocation );

export type RebalanceEvent = {
  type: 'rebalance';
} & (FixedAllocation | GlideAllocation );
