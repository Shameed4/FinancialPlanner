// retirementPlanningScenario.ts

type YamlFixedDistribution = {
    type: "fixed";
    value: number;
  };
  
  type YamlNormalDistribution = {
    type: "normal";
    mean: number;
    stdev: number;
  };
  
  type YamlUniformDistribution = {
    type: "uniform";
    lower: number;
    upper: number;
  };
  
  type YamlDistribution = YamlFixedDistribution | YamlNormalDistribution | YamlUniformDistribution;
  
  type YamlLifeExpectancyFixed = {
    type: "fixed";
    value: number;
  };
  
  type YamlLifeExpectancyNormal = {
    type: "normal";
    mean: number;
    stdev: number;
  };
  
  type YamlLifeExpectancy = YamlLifeExpectancyFixed | YamlLifeExpectancyNormal;
  
  type YamlInvestmentType = {
    name: string;
    description: string;
    returnAmtOrPct: "amount" | "percent";
    returnDistribution: YamlFixedDistribution | YamlNormalDistribution;
    expenseRatio: number;
    incomeAmtOrPct: "amount" | "percent";
    incomeDistribution: YamlFixedDistribution | YamlNormalDistribution;
    taxability: boolean;
  };
  
  type YamlInvestment = {
    investmentType: string;
    value: number;
    taxStatus: "non-retirement" | "pre-tax" | "after-tax";
    id: string;
  };
  
  type YamlStartDate =
    | { type: "fixed"; value: number }
    | { type: "startWith"; eventSeries: string }
    | { type: "startAfter"; eventSeries: string}
    | { type: "uniform"; lower: number; upper: number }
    | { type: "normal"; mean: number, stdev: number }
  
  type YamlEventSeriesBase = {
    name: string;
    start: YamlStartDate;
    duration: YamlDistribution;
    type: string;
  };
  
  type YamlIncomeEventSeries = YamlEventSeriesBase & {
    type: "income";
    initialAmount: number;
    changeAmtOrPct: "amount" | "percent";
    changeDistribution: YamlDistribution;
    inflationAdjusted: boolean;
    userFraction: number;
    socialSecurity: boolean;
  };
  
  type YamlExpenseEventSeries = YamlEventSeriesBase & {
    type: "expense";
    initialAmount: number;
    changeAmtOrPct: "amount" | "percent";
    changeDistribution: YamlDistribution;
    inflationAdjusted: boolean;
    userFraction: number;
    discretionary: boolean;
  };
  
  type YamlInvestEventSeries = YamlEventSeriesBase & {
    type: "invest";
    assetAllocation: Record<string, number>;
    maxCash: number;
  } & (
    | { glidePath: true; assetAllocation2: Record<string, number>; }
    | { glidePath: false; }
  );
  
  type YamlRebalanceEventSeries = YamlEventSeriesBase & {
    type: "rebalance";
    assetAllocation: Record<string, number>;
  } & (
    | { glidePath: true; assetAllocation2: Record<string, number>; }
    | { glidePath: false; }
  );;
  
  type YamlEventSeries =
    | YamlIncomeEventSeries
    | YamlExpenseEventSeries
    | YamlInvestEventSeries
    | YamlRebalanceEventSeries;
  
  type YamlScenario = {
    name: string;
    maritalStatus: "individual" | "couple";
    birthYears: number[];
    lifeExpectancy: YamlLifeExpectancy[];
    investmentTypes: YamlInvestmentType[];
    investments: YamlInvestment[];
    eventSeries: YamlEventSeries[];
    inflationAssumption: YamlDistribution;
    afterTaxContributionLimit: number;
    spendingStrategy: string[];
    expenseWithdrawalStrategy: string[];
    RMDStrategy: string[];
    RothConversionOpt: boolean;
    RothConversionStart: number;
    RothConversionEnd: number;
    RothConversionStrategy: string[];
    financialGoal: number;
    residenceState: string;
  };
  