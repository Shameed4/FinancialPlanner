export interface StringScenarioFormData {
  name: string;
  userBirthYear: string;
  userLifeExpectancyMean: string;
  userLifeExpectancyStd: string;
  residenceState: string;
  financialGoal: string;
  forIndividual: boolean;
  spouseBirthYear?: string;
  spouseLifeExpectancyMean?: string;
  spouseLifeExpectancyStd?: string;
  inflationAssumption: 'fixed' | 'random_uniform' | 'random_normal';
  inflation?: string;
  inflationMin?: string;
  inflationMax?: string;
  inflationMean?: string;
  inflationStd?: string;
  initialAfterTaxRetirementContributionLimit?: string;
  assetTypes: AssetType[];
  investments: Investment[];
  eventSeries: Event[];
  enableTaxOptimization: boolean;
  rothOptimizationStartYear?: string;
  rothOptimizationEndYear?: string;
}

export interface AssetType {
  name: string;
  description?: string;
  returnType: 'fixed' | 'random_normal' | 'random_uniform';
  fixedReturn?: string;
  normalReturnMean?: string;
  normalReturnStd?: string;
  expenseRatio: string;
  normalIncomeMean?: string;
  normalIncomeStd?: string;
  taxable: boolean;
  returnAmtOrPct: 'amount' | 'percent';
  incomeAmtOrPct: 'amount' | 'percent';
}

export interface Investment {
  assetType: string;
  value: string;
  taxStatus: 'non-retirement' | 'pre-tax-retirement' | 'after-tax-retirement'
  expenseWithdrawalStrategy?: string;
  rothConversionStrategy?: string;
}

export type Event = {
  name: string;
  type: 'income' | 'expense' | 'invest' | 'rebalance';

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
);

export type IncomeEvent = {
  {  }
}