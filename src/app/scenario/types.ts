

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
    name?: string;
    description?: string;
    returnType?: 'fixed' | 'normal';
    fixedReturn?: string;
    normalReturnMean?: string;
    normalReturnStd?: string;
    expenseRatio?: string;
    normalIncomeMean?: string;
  }
  
  export interface Investment {
    assetType?: string;
    value?: string;
    taxStatus?: 'non-retirement' | 'pre-tax-retirement' | 'after-tax-retirement'
    withdrawalOrder?: number;
    rothConversionOrder?: number;
  }
  
  export interface Event {
    name?: string;
    type?: 'income' | 'expense' | 'invest' | 'rebalance';
    startYearType?: 'fixed' | 'relative';
    startYear?: string;
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
    maxCashValue: string;
  }
  