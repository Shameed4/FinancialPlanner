import { StringScenarioFormData } from '@/app/scenario/types';
import { jsonToYaml, yamlToJson, validateScenario } from '@/utils/scenarioConverter';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

// const starterYaml = `# file format for scenario import/export.  version: 2025-03-23
// # CSE416, Software Engineering, Scott D. Stoller.

// # a distribution is represented as a map with one of the following forms:
// # {type: fixed, value: <number>}
// # {type: normal, mean: <number>, stdev: <number>}
// # {type: uniform, lower: <number>, upper: <number>}
// # percentages are represented by their decimal value, e.g., 4% is represented as 0.04.

// name: "Retirement Planning Scenario"
// maritalStatus: couple # couple or individual
// birthYears: [1985, 1987] # a list with length 1 or 2, depending on maritalStatus. if len=2, the first entry is for the user; second entry, for the spouse.
// lifeExpectancy: [ {type: fixed, value: 80}, {type: normal, mean: 82, stdev: 3} ] # a list with length 1 or 2, depending on maritalStatus.

// investmentTypes:
//   - name: cash
//     description: cash
//     returnAmtOrPct: amount # "amount" or "percent"
//     returnDistribution: {type: fixed, value: 0}
//     expenseRatio: 0
//     incomeAmtOrPct: percent
//     incomeDistribution: {type: fixed, value: 0}
//     taxability: true # Boolean.  true = taxable, false = tax-exempt

//   - name: S&P 500
//     description: S&P 500 index fund
//     returnAmtOrPct: percent  # whether expected annual return is specified as a dollar "amount" or a "percent"
//     returnDistribution: {type: normal, mean: 0.06, stdev: 0.02} # distribution of expected annual return
//     expenseRatio: 0.001
//     incomeAmtOrPct: percent
//     incomeDistribution: {type: normal, mean: 0.01, stdev: 0.005}
//     taxability: true

//   - name: tax-exempt bonds
//     description: NY tax-exempt bonds
//     returnAmtOrPct: amount # whether expected annual return is specified as a dollar "amount" or a "percent"
//     returnDistribution: {type: fixed, value: 0}
//     expenseRatio: 0.004
//     incomeAmtOrPct: percent
//     incomeDistribution: {type: normal, mean: 0.03, stdev: 0.01}
//     taxability: false

// # investment id is a unique identifier.  without it, we would need to use a pair (investment type, tax status) to identify an investment.
// investments:
//   - investmentType: cash
//     value: 100
//     taxStatus: non-retirement # "non-retirement", "pre-tax", or "after-tax"
//     id: cash

//   - investmentType: S&P 500
//     value: 10000
//     taxStatus: non-retirement
//     id: S&P 500 non-retirement
    
//   - investmentType: tax-exempt bonds
//     value: 2000
//     taxStatus: non-retirement
//     id: tax-exempt bonds

//   - investmentType: S&P 500
//     value: 10000
//     taxStatus: pre-tax
//     id: S&P 500 pre-tax
    
//   - investmentType: S&P 500
//     value: 2000
//     taxStatus: after-tax
//     id: S&P 500 after-tax
 
// eventSeries:
//   - name: salary
//     start: {type: fixed, value: 2025} # a fixed, normal, or uniform distribution (as above) or a map with the form {type: startWith, eventSeries: <name>} or {type: startAfter, eventSeries: <name>}
//     duration: {type: fixed, value: 40}
//     type: income # "income", "expense", "invest", or "rebalance"
//     initialAmount: 75000
//     changeAmtOrPct: amount
//     changeDistribution: {type: uniform, lower: 500, upper: 2000}
//     inflationAdjusted: false # boolean
//     userFraction: 1.0 # fraction of the amount associated with the user.  the rest is associated with the spouse.
//     socialSecurity: false  # boolean

//   - name: food
//     start: {type: startWith, eventSeries: salary}  # starts in same year as salary
//     duration: {type: fixed, value: 200}  # lasts for the rest of the user's life
//     type: expense
//     initialAmount: 5000
//     changeAmtOrPct: percent
//     changeDistribution: {type: normal, mean: 0.02, stdev: 0.01} 
//     inflationAdjusted: true
//     userFraction: 0.5
//     discretionary: false

//   - name: vacation
//     start: {type: startWith, eventSeries: salary}  # starts in same year as salary
//     duration: {type: fixed, value: 40}
//     type: expense
//     initialAmount: 1200
//     changeAmtOrPct: amount
//     changeDistribution: {type: fixed, value: 0}
//     inflationAdjusted: true
//     userFraction: 0.6
//     discretionary: true

//   - name: streaming services
//     start: {type: startWith, eventSeries: salary}  # starts in same year as salary
//     duration: {type: fixed, value: 40}
//     type: expense
//     initialAmount: 500
//     changeAmtOrPct: amount
//     changeDistribution: {type: fixed, value: 0}
//     inflationAdjusted: true
//     userFraction: 1.0
//     discretionary: true

//   - name: my investments
//     start: {type: uniform, lower: 2025, upper: 2030}
//     duration: {type: fixed, value: 10}
//     type: invest
//     assetAllocation: {S&P 500 non-retirement: 0.6, S&P 500 after-tax: 0.4}
//     glidePath: true # boolean.  false means assetAllocation is the fixed asset allocation, and assetAllocation2 is unused.  true means to glide from assetAllocation to assetAllocation2.
//     assetAllocation2: {S&P 500 non-retirement: 0.8, S&P 500 after-tax: 0.2} 
//     maxCash: 1000

//   - name: rebalance
//     start: {type: uniform, lower: 2025, upper: 2030}
//     duration: {type: fixed, value: 10}
//     type: rebalance
//     assetAllocation: {S&P500 non-retirement: 0.7, tax-exempt bonds: 0.3}

// inflationAssumption: {type: fixed, value: 0.03}
// afterTaxContributionLimit: 7000 # annual limit on contributions to after-tax retirement accounts
// spendingStrategy: ["vacation", "streaming services"]  # list of discretionary expenses, identified by name
// expenseWithdrawalStrategy: [S&P 500 non-retirement, tax-exempt bonds, S&P 500 after-tax] # list of investments, identified by id
// RMDStrategy: [S&P 500 pre-tax] # list of pre-tax investments, identified by id
// RothConversionOpt: true   # boolean indicating whether the Roth Conversion optimizer is enabled
// RothConversionStart: 2050 # start year
// RothConversionEnd: 2060   # end year
// RothConversionStrategy: [S&P 500 pre-tax]  # list of pre-tax investments, identified by id
// financialGoal: 10000
// residenceState: NY  # states are identified by standard 2-letter abbreviations
// `

export function yamlToScenario(yaml: string) {
  const jsonYaml: YamlScenario = yamlToJson(yaml);
  const res: StringScenarioFormData = {
    name: jsonYaml.name,
    userLifeExpectancyMean: String(jsonYaml.lifeExpectancy[0].type == 'fixed' ? jsonYaml.lifeExpectancy[0].value : jsonYaml.lifeExpectancy[0].mean),
    userLifeExpectancyStd: String(jsonYaml.lifeExpectancy[0].type == 'fixed' ? 0 : jsonYaml.lifeExpectancy[0].stdev),
    residenceState: jsonYaml.residenceState,
    userBirthYear: String(jsonYaml.birthYears[0]),
    financialGoal: String(jsonYaml.financialGoal),
    initialAfterTaxRetirementContributionLimit: String(jsonYaml.afterTaxContributionLimit || 0),
    ...(jsonYaml.lifeExpectancy.length == 1 ?
      { forIndividual: true } :
      { forIndividual: false, spouseBirthYear: String(jsonYaml.birthYears[1]), spouseLifeExpectancyStd: String(jsonYaml.lifeExpectancy[1].type == 'fixed' ? 0 : jsonYaml.lifeExpectancy[1].stdev) }
    ),
    inflationAssumption: jsonYaml.inflationAssumption.type,
    assetTypes: [],
    investments: [],
    eventSeries: [],
    enableTaxOptimization: jsonYaml.RothConversionOpt,
    rothOptimizationStartYear: jsonYaml.RothConversionStart ? String(jsonYaml.RothConversionStart) : undefined,
    rothOptimizationEndYear: jsonYaml.RothConversionEnd ? String(jsonYaml.RothConversionEnd) : undefined,
  }
  res.assetTypes = jsonYaml.investmentTypes.map(asset => {
    return {
      name: asset.name,
      description: asset.description,
      returnType: asset.returnDistribution.type,
      ...(asset.returnDistribution.type == "fixed" ? { fixedReturn: String(asset.returnDistribution.value) }
        : asset.returnDistribution.type == "normal" ? { normalReturnMean: String(asset.returnDistribution.mean), normalReturnStd: String(asset.returnDistribution.stdev) }
          : {}
      ),
      expenseRatio: String(asset.expenseRatio),
      normalIncomeMean: String(asset.incomeDistribution.type == "normal" ? asset.incomeDistribution.mean : asset.incomeDistribution.type == "fixed" ? asset.incomeDistribution.value : 0),
      normalIncomeStd: String(asset.incomeDistribution.type == "normal" ? asset.incomeDistribution.stdev : "0"),
      taxable: asset.taxability,
      expectedAnnualIncomeType: "fixed",
      returnAmtOrPct: asset.returnAmtOrPct,
      incomeAmtOrPct: asset.incomeAmtOrPct
    }
  })
  res.investments = jsonYaml.investments.map(inv => {
    return {
      assetType: inv.investmentType,
      value: String(inv.value),
      taxStatus: inv.taxStatus === "pre-tax" ? "pre-tax-retirement" :
        inv.taxStatus === "after-tax" ? "after-tax-retirement" :
          "non-retirement"
    }
  })
  res.eventSeries = jsonYaml.eventSeries.map(es => {
    const baseEvent = {
      name: es.name,
      type: es.type,
      startYearType: es.start.type === "startWith" ? "withEvent" :
        es.start.type === "startAfter" ? "afterEvent" :
          es.start.type,

      ...(es.start.type == "fixed" ? { startYear: String(es.start.value) } :
        es.start.type == "uniform" ? { startYearMin: String(es.start.lower), startYearMax: String(es.start.upper) } :
          es.start.type == "normal" ? { startYearMean: String(es.start.mean), startYearStd: String(es.start.stdev) } :
            es.start.type == "startWith" || es.start.type == "startAfter" ? { startYearEvent: String(es.start.eventSeries) } :
              { error: "ERROR" }
      ),
      durationType: es.duration.type,
      ...(es.duration.type == "fixed" ? { durationFixed: String(es.duration.value) } :
        es.duration.type == "uniform" ? { durationMin: String(es.duration.lower), durationMax: String(es.duration.upper) } :
          es.duration.type == "normal" ? { durationMean: String(es.duration.mean), durationStd: String(es.duration.stdev) } :
            {}
      ),
    };

    // Add type-specific properties
    if (es.type === 'income' || es.type === 'expense') {
      return {
        ...baseEvent,
        amount: String(es.initialAmount || 0),
        changeAmtOrPct: es.changeAmtOrPct || 'amount',
        annualChangeType: es.changeDistribution.type || 'fixed',
        ...(es.changeDistribution.type === 'fixed' ? { annualChange: String(es.changeDistribution.value || 0) } :
          es.changeDistribution.type === 'uniform' ? {
            annualChangeMin: String(es.changeDistribution.lower || 0),
            annualChangeMax: String(es.changeDistribution.upper || 0)
          } :
            es.changeDistribution.type === 'normal' ? {
              annualChangeMean: String(es.changeDistribution.mean || 0),
              annualChangeStd: String(es.changeDistribution.stdev || 0)
            } : {}
        ),
        inflationAdjusted: es.inflationAdjusted || false,
        userPercentage: es.userFraction ? String(es.userFraction * 100) : '100',
        ...(es.type === 'income' ? { isSocialSecurity: es.socialSecurity || false } : {}),
        ...(es.type === 'expense' ? { isDiscretionary: es.discretionary || false } : {})
      };
    } else if (es.type === 'invest' || es.type === 'rebalance') {
      // For invest and rebalance events
      const allocations = {};
      if (es.assetAllocation) {
        Object.entries(es.assetAllocation).forEach(([key, value]) => {
          allocations[key] = String(value);
        });
      }

      return {
        ...baseEvent,
        allocationType: es.glidePath ? 'glide' : 'fixed',
        allocations: allocations,
        ...(es.glidePath && es.assetAllocation2 ? {
          initialAllocations: allocations,
          finalAllocations: Object.fromEntries(
            Object.entries(es.assetAllocation2).map(([key, value]) => [key, String(value)])
          )
        } : {}),
        ...(es.type === 'invest' ? { maxCashValue: String(es.maxCash || 0) } : {})
      };
    }

    return baseEvent;
  });
  return res;
}

// POST endpoint – fetches scenario(s) by ownerId or id and applies the transformation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const scenarioYaml = yamlToScenario(body.scenarioYaml);

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
          normalIncomeMean: parseFloat(asset.normalIncomeMean || '0') || 0,
          normalIncomeStd: parseFloat(asset.normalIncomeStd || '0') || 0
        })),
        investments: scenarioYaml.investments.map(inv => ({
          ...inv,
          value: parseFloat(inv.value) || 0
        })),
        eventSeries: scenarioYaml.eventSeries.map(event => {
          const parsedEvent = { ...event };

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
          if (parsedEvent.amount) parsedEvent.amount = parseFloat(parsedEvent.amount);
          if (parsedEvent.annualChange) parsedEvent.annualChange = parseFloat(parsedEvent.annualChange);
          if (parsedEvent.annualChangeMin) parsedEvent.annualChangeMin = parseFloat(parsedEvent.annualChangeMin);
          if (parsedEvent.annualChangeMax) parsedEvent.annualChangeMax = parseFloat(parsedEvent.annualChangeMax);
          if (parsedEvent.annualChangeMean) parsedEvent.annualChangeMean = parseFloat(parsedEvent.annualChangeMean);
          if (parsedEvent.annualChangeStd) parsedEvent.annualChangeStd = parseFloat(parsedEvent.annualChangeStd);
          if (parsedEvent.userPercentage) parsedEvent.userPercentage = parseFloat(parsedEvent.userPercentage);

          // Handle invest events
          if (parsedEvent.maxCashValue) parsedEvent.maxCashValue = parseFloat(parsedEvent.maxCashValue);

          return parsedEvent;
        })
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