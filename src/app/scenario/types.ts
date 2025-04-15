

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
  inflationAssumption: 'fixed' | 'uniform' | 'normal';
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
  returnType: 'fixed' | 'normal' | 'uniform';
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
  withdrawalOrder?: number;
  rothConversionOrder?: number;
}

export interface Event {
  name: string;
  type: 'income' | 'expense' | 'invest' | 'rebalance';
  startYearType: 'fixed' | 'uniform' | 'normal' | 'withEvent' | 'afterEvent';
  startYear?: string;
  startYearMin?: string,
  startYearMax?: string,
  startYearMean?: string,
  startYearStd?: string,

  relativeStartYear?: string;

  durationType?: 'fixed' | 'uniform' | 'normal';
  durationFixed?: string;
  durationMin?: string;
  durationMax?: string;
  durationMean?: string;
  durationStd?: string;

  amount?: string;
  userPercentage?: string;

  allocationType?: 'fixed' | 'glide';
  allocations?: Record<string, string>;
  initialAllocations?: Record<string, string>;
  finalAllocations?: Record<string, string>;
  maxCashValue?: string;
  
  changeAmtOrPct?: 'amount' | 'percent';
  annualChangeType?: 'normal' | 'fixed' | 'uniform';
  annualChange?: string; // Can be a fixed amount or percentage for fixed
  annualChangeMin?: string; // for random_uniform
  annualChangeMax?: string; // for random_uniform
  annualChangeMean?: string; // for random_normal
  annualChangeStd?: string; // for random_normal
}
