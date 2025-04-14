import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { DistributionType, EventType, StartYearType, State, TaxStatus, Investment, AssetType, ReturnType, Taxability } from '@prisma/client';

// Utility function to convert Yes/No string values to booleans.
const yesNoToBoolean = (arg: string) => {
  if (arg === 'Yes') {
    return true;
  } else if (arg === 'No') {
    return false;
  } else {
    throw new Error('Invalid yes/no value');
  }
};

// Helper function to map string startYearType to StartYearType enum
function mapStartYearType(startYearTypeString: string): StartYearType {
  switch (startYearTypeString.toLowerCase()) {
    case 'fixed':
      return StartYearType.fixed;
    case 'uniform':
      return StartYearType.random_uniform;
    case 'normal':
      return StartYearType.random_normal;
    case 'same_as':
      return StartYearType.same_as;
    case 'after':
      return StartYearType.after;
    default:
      console.warn(`Unknown startYearType: ${startYearTypeString}, defaulting to 'fixed'`);
      return StartYearType.fixed;
  }
}

// Helper function to map string distribution type to DistributionType enum
function mapDistributionType(distributionTypeString: string): DistributionType {
  switch (distributionTypeString.toLowerCase()) {
    case 'fixed':
      return DistributionType.fixed;
    case 'percentage':
      return DistributionType.percentage;
    case 'uniform':
      return DistributionType.random_uniform;
    case 'normal':
      return DistributionType.random_normal;
    default:
      console.warn(`Unknown distributionType: ${distributionTypeString}, defaulting to 'fixed'`);
      return DistributionType.fixed;
  }
}

// Helper function to create event series and their details
async function createEventSeries(scenarioId: number, eventSeries: any[], investments: any[]) {
  const createdEvents = [];

  // Create a map of asset names to investment IDs
  const assetToInvestmentMap = new Map(
    investments.map(inv => [inv.assetType.name, inv.id])
  );

  for (const event of eventSeries) {
    // Create base event series
    const eventSeriesData = {
      name: event.name,
      description: event.description || null,
      scenarioId,
      startYearType: typeof event.startYearType === 'string' ? mapStartYearType(event.startYearType) : event.startYearType,
      startYear: event.startYear,
      startMin: event.startYearMin,
      startMax: event.startYearMax,
      startMean: event.startYearMean,
      startStd: event.startYearStd,
      durationType: typeof event.durationType === 'string' ? mapDistributionType(event.durationType) : event.durationType,
      duration: event.durationFixed,
      durationMin: event.durationMin,
      durationMax: event.durationMax,
      durationMean: event.durationMean,
      durationStd: event.durationStd,
      type: event.type
    };

    const createdEvent = await prisma.eventSeries.create({
      data: eventSeriesData
    });

    // Create type-specific details
    switch (event.type) {
      case EventType.income:
        await prisma.incomeEventDetails.create({
          data: {
            eventSeriesId: createdEvent.id,
            initialAmount: parseFloat(event.amount || event.initialAmount || '0'),
            annualChangeType: typeof (event.annualChangeType || event.changeType) === 'string'
              ? mapDistributionType(event.annualChangeType || event.changeType)
              : (event.annualChangeType || event.changeType),
            annualChangeAmount: (event.annualChangeType || event.changeType) === DistributionType.fixed ? parseFloat(event.annualChange || '0') : null,
            annualChangePercentage: (event.annualChangeType || event.changeType) === 'percentage' ? parseFloat(event.annualChange || '0') : null,
            annualChangeMin: event.annualChangeMin ? parseFloat(event.annualChangeMin) : null,
            annualChangeMax: event.annualChangeMax ? parseFloat(event.annualChangeMax) : null,
            annualChangeMean: event.annualChangeMean ? parseFloat(event.annualChangeMean) : null,
            annualChangeStd: event.annualChangeStd ? parseFloat(event.annualChangeStd) : null,
            inflationAdjustment: event.inflationAdjusted,
            userPercentage: event.userPercentage ? parseFloat(event.userPercentage) : null,
            isSocialSecurity: event.isSocialSecurity || false
          }
        });
        break;

      case EventType.expense:
        await prisma.expenseEventDetails.create({
          data: {
            eventSeriesId: createdEvent.id,
            initialAmount: parseFloat(event.amount || event.initialAmount || '0'),
            annualChangeType: typeof (event.annualChangeType || event.changeType) === 'string'
              ? mapDistributionType(event.annualChangeType || event.changeType)
              : (event.annualChangeType || event.changeType),
            annualChangeAmount: (event.annualChangeType || event.changeType) === DistributionType.fixed ? parseFloat(event.annualChange || '0') : null,
            annualChangePercentage: (event.annualChangeType || event.changeType) === 'percentage' ? parseFloat(event.annualChange || '0') : null,
            annualChangeMin: event.annualChangeMin ? parseFloat(event.annualChangeMin) : null,
            annualChangeMax: event.annualChangeMax ? parseFloat(event.annualChangeMax) : null,
            annualChangeMean: event.annualChangeMean ? parseFloat(event.annualChangeMean) : null,
            annualChangeStd: event.annualChangeStd ? parseFloat(event.annualChangeStd) : null,
            inflationAdjustment: event.inflationAdjusted,
            userPercentage: event.userPercentage ? parseFloat(event.userPercentage) : null,
            isDiscretionary: event.isDiscretionary || false,
            order: event.order
          }
        });
        break;

      case EventType.invest:
        const investDetails = await prisma.investEventDetails.create({
          data: {
            eventSeriesId: createdEvent.id,
            maxCash: event.maxCashValue ? event.maxCashValue : null,
            order: event.order,
            initialAllocation: 0 // Default value; detailed allocations follow below.
          }
        });

        if (event.allocationType === 'glide') {
          // For glide path events, expect separate initialAllocations and finalAllocations objects.
          if (event.initialAllocations && event.finalAllocations) {
            for (const assetName in event.initialAllocations) {
              if (event.initialAllocations.hasOwnProperty(assetName)) {
                const initialPercentage = event.initialAllocations[assetName];
                const finalPercentage = event.finalAllocations[assetName];
                const numericInitial = typeof initialPercentage === 'number'
                  ? initialPercentage
                  : parseFloat(initialPercentage);
                const numericFinal = typeof finalPercentage === 'number'
                  ? finalPercentage
                  : parseFloat(finalPercentage);
                const investmentId = assetToInvestmentMap.get(assetName);
                if (investmentId) {
                  await prisma.assetAllocation.create({
                    data: {
                      investEventDetailsId: investDetails.id,
                      initialAllocation: numericInitial / 100,
                      finalAllocation: numericFinal / 100,
                      investmentId
                    }
                  });
                }
              }
            }
          }
        } else {
          // Fixed allocation: use the same value for both initial and final allocations.
          if (event.allocations) {
            for (const [assetName, percentage] of Object.entries(event.allocations)) {
              const numericPercentage = typeof percentage === 'number'
                ? percentage
                : parseFloat(percentage as string);
              const investmentId = assetToInvestmentMap.get(assetName);
              if (investmentId) {
                await prisma.assetAllocation.create({
                  data: {
                    investEventDetailsId: investDetails.id,
                    initialAllocation: numericPercentage / 100,
                    finalAllocation: numericPercentage / 100,
                    investmentId
                  }
                });
              }
            }
          }
        }
        break;

      case EventType.rebalance:
        const rebalanceDetails = await prisma.rebalanceEventDetails.create({
          data: {
            eventSeriesId: createdEvent.id
          }
        });

        if (event.allocationType === 'glide') {
          // For glide path events, use separate initialAllocations and finalAllocations.
          if (event.initialAllocations && event.finalAllocations) {
            for (const assetName in event.initialAllocations) {
              if (event.initialAllocations.hasOwnProperty(assetName)) {
                const initialPercentage = event.initialAllocations[assetName];
                const finalPercentage = event.finalAllocations[assetName];
                const numericInitial = typeof initialPercentage === 'number'
                  ? initialPercentage
                  : parseFloat(initialPercentage);
                const numericFinal = typeof finalPercentage === 'number'
                  ? finalPercentage
                  : parseFloat(finalPercentage);
                const investmentId = assetToInvestmentMap.get(assetName);
                if (investmentId) {
                  await prisma.assetAllocation.create({
                    data: {
                      rebalanceEventDetailsId: rebalanceDetails.id,
                      initialAllocation: numericInitial / 100,
                      finalAllocation: numericFinal / 100,
                      investmentId
                    }
                  });
                }
              }
            }
          }
        } else {
          // Fixed allocation: use the same percentage for both initial and final allocations.
          if (event.allocations) {
            for (const [assetName, percentage] of Object.entries(event.allocations)) {
              const numericPercentage = typeof percentage === 'number'
                ? percentage
                : parseFloat(percentage as string);
              const investmentId = assetToInvestmentMap.get(assetName);
              if (investmentId) {
                await prisma.assetAllocation.create({
                  data: {
                    rebalanceEventDetailsId: rebalanceDetails.id,
                    initialAllocation: numericPercentage / 100,
                    investmentId
                  }
                });
              }
            }
          }
        }
        break;
    }

    createdEvents.push(createdEvent);
  }

  return createdEvents;
}

// Helper function to map string tax status to TaxStatus enum
function mapTaxStatus(taxStatusString: string): TaxStatus {
  switch (taxStatusString) {
    case 'non-retirement':
      return TaxStatus.NON_RETIREMENT;
    case 'pre-tax-retirement':
      return TaxStatus.PRE_TAX_RETIREMENT;
    case 'after-tax-retirement':
      return TaxStatus.AFTER_TAX_RETIREMENT;
    default:
      console.warn(`Unknown tax status: ${taxStatusString}, defaulting to NON_RETIREMENT`);
      return TaxStatus.NON_RETIREMENT;
  }
}

// Updated helper function to map string taxability to Taxability enum (case-insensitive)
function mapTaxability(taxabilityString: string): Taxability {
  switch (taxabilityString.toLowerCase()) {
    case 'tax-exempt':
      return Taxability.TAX_EXEMPT;
    case 'taxable':
      return Taxability.TAXABLE;
    default:
      console.warn(`Unknown taxability: ${taxabilityString}, defaulting to TAXABLE`);
      return Taxability.TAXABLE;
  }
}

// Helper function to map string return type to ReturnType enum
function mapReturnType(returnTypeString: string): ReturnType {
  switch (returnTypeString.toLowerCase()) {
    case 'fixed':
      return ReturnType.FIXED;
    case 'normal':
      return ReturnType.NORMAL;
    default:
      console.warn(`Unknown return type: ${returnTypeString}, defaulting to NORMAL`);
      return ReturnType.NORMAL;
  }
}

// Helper function to create asset types
async function createAssetTypes(assetTypes: any[]) {
  const createdAssetTypes = [];

  for (const assetType of assetTypes) {
    // Map the taxability from string to enum if needed
    const taxability = typeof assetType.taxability === 'string'
      ? mapTaxability(assetType.taxability)
      : (assetType.taxability || Taxability.TAXABLE);

    // Map the return type from string to enum if needed
    const returnType = typeof assetType.returnType === 'string'
      ? mapReturnType(assetType.returnType)
      : (assetType.returnType || ReturnType.NORMAL);

    // Map the expected annual income type from string to enum if needed
    const expectedAnnualIncomeType = typeof assetType.expectedAnnualIncomeType === 'string'
      ? mapReturnType(assetType.expectedAnnualIncomeType)
      : (assetType.expectedAnnualIncomeType || ReturnType.FIXED);

    let createdAssetType;
    try {
      createdAssetType = await prisma.assetType.create({
        data: {
          name: assetType.name,
          description: assetType.description,
          returnType: returnType,
          fixedReturn: returnType === ReturnType.FIXED ? parseFloat(assetType.fixedReturn) : null,
          normalReturnMean: returnType === ReturnType.NORMAL ? parseFloat(assetType.normalReturnMean) : null,
          normalReturnStd: returnType === ReturnType.NORMAL ? parseFloat(assetType.normalReturnStd) : null,
          expectedAnnualIncomeType: expectedAnnualIncomeType,
          fixedIncome: assetType.fixedIncome,
          normalIncomeMean: assetType.normalIncomeMean,
          normalIncomeStd: assetType.normalIncomeStd,
          gbmIncomeDrift: assetType.gbmIncomeDrift,
          gbmIncomeVolatility: assetType.gbmIncomeVolatility,
          expenseRatio: assetType.expenseRatio || 0,
          taxability: taxability,
          returnAmtOrPct: assetType.returnAmtOrPct,
          incomeAmtOrPct: assetType.incomeAmtOrPct
        }
      });
    } catch (error) {
      console.error(`Error creating asset type ${assetType.name}:`, error);
      throw error;
    }

    createdAssetTypes.push(createdAssetType);
  }

  return createdAssetTypes;
}

// Helper function to create investments and link them to scenario
async function createInvestments(scenarioId: number, investments: any[], assetTypeMap: Map<string, number>) {
  // console.log(investments);
  const createdInvestments = [];

  for (const investment of investments) {
    // Get the asset type ID from the map
    const assetTypeId = investment.assetTypeId || assetTypeMap.get(investment.assetType);

    if (!assetTypeId) {
      console.error(`No asset type found for investment: ${JSON.stringify(investment)}`);
      continue;
    }

    // Map the tax status from string to enum if needed
    const taxStatus = typeof investment.taxStatus === 'string'
      ? mapTaxStatus(investment.taxStatus)
      : investment.taxStatus;

    // Create investment
    const createdInvestment = await prisma.investment.create({
      data: {
        assetTypeId: assetTypeId,
        value: investment.value,
        taxStatus: taxStatus,
        rothConversionStrategy: investment.rothConversionStrategy
      },
      include: {
        assetType: true
      }
    });

    // Link investment to scenario
    await prisma.investmentScenario.create({
      data: {
        investmentId: createdInvestment.id,
        scenarioId
      }
    });

    createdInvestments.push(createdInvestment);
  }

  return createdInvestments;
}

// Transformation function to shape the scenario for the frontend with defensive checks.
const transformScenarioForFrontend = (scenario: any) => {
  // Transform event series
  const transformedEventSeries = scenario.eventSeries.map((es: any) => {
    const baseEvent = {
      name: es.name,
      description: es.description,
      type: es.type.toLowerCase(),
      startYearType: es.startYearType.toLowerCase(),
      startYear: es.startYear,
      startYearMin: es.startMin,
      startYearMax: es.startMax,
      startYearMean: es.startMean,
      startYearStd: es.startStd,
      durationType: es.durationType.toLowerCase(),
      durationFixed: es.duration,
      durationMin: es.durationMin,
      durationMax: es.durationMax,
      durationMean: es.durationMean,
      durationStd: es.durationStd
    };

    if (es.investEventDetails) {
      let isGlide = false;
      const fixedAllocations: { [assetName: string]: number } = {};
      const initialAllocations: { [assetName: string]: number } = {};
      const finalAllocations: { [assetName: string]: number } = {};

      es.investEventDetails.AssetAllocation.forEach((alloc: any) => {
        // Defensive check: ensure that allocation has investment and assetType data.
        if (!alloc.investment || !alloc.investment.assetType) {
          console.warn("Missing investment or assetType in allocation:", alloc);
          return;
        }
        const assetName = alloc.investment.assetType.name;
        const initPercent = alloc.initialAllocation * 100;
        const finalPercent = alloc.finalAllocation * 100;
        fixedAllocations[assetName] = initPercent;
        initialAllocations[assetName] = initPercent;
        finalAllocations[assetName] = finalPercent;
        if (Math.abs(initPercent - finalPercent) > 0.1) {
          isGlide = true;
        }
      });

      if (isGlide) {
        return {
          ...baseEvent,
          allocationType: 'glide',
          initialAllocations,
          finalAllocations,
          maxCashValue: es.investEventDetails.maxCash
        };
      } else {
        return {
          ...baseEvent,
          allocationType: 'fixed',
          allocations: fixedAllocations,
          maxCashValue: es.investEventDetails.maxCash
        };
      }
    }

    if (es.rebalanceEventDetails) {
      let isGlide = false;
      const fixedAllocations: { [assetName: string]: number } = {};
      const initialAllocations: { [assetName: string]: number } = {};
      const finalAllocations: { [assetName: string]: number } = {};

      es.rebalanceEventDetails.AssetAllocation.forEach((alloc: any) => {
        // Defensive check: ensure that allocation has investment and assetType data.
        if (!alloc.investment || !alloc.investment.assetType) {
          console.warn("Missing investment or assetType in allocation (rebalance):", alloc);
          return;
        }
        const assetName = alloc.investment.assetType.name;
        const initPercent = alloc.initialAllocation * 100;
        const finalPercent = alloc.finalAllocation !== undefined && alloc.finalAllocation !== null
          ? alloc.finalAllocation * 100
          : initPercent;

        fixedAllocations[assetName] = initPercent;
        initialAllocations[assetName] = initPercent;
        finalAllocations[assetName] = finalPercent;

        if (Math.abs(initPercent - finalPercent) > 0.1) {
          isGlide = true;
        }
      });

      if (isGlide) {
        return {
          ...baseEvent,
          allocationType: 'glide',
          initialAllocations,
          finalAllocations
        };
      } else {
        return {
          ...baseEvent,
          allocationType: 'fixed',
          allocations: fixedAllocations
        };
      }
    }

    if (es.incomeEventDetails) {
      return {
        ...baseEvent,
        initialAmount: es.incomeEventDetails.initialAmount,
        amount: es.incomeEventDetails.initialAmount,
        changeType: es.incomeEventDetails.annualChangeType.toLowerCase(),
        annualChange: es.incomeEventDetails.annualChangeAmount || es.incomeEventDetails.annualChangePercentage || 0,
        annualChangeMin: es.incomeEventDetails.annualChangeMin,
        annualChangeMax: es.incomeEventDetails.annualChangeMax,
        annualChangeMean: es.incomeEventDetails.annualChangeMean,
        annualChangeStd: es.incomeEventDetails.annualChangeStd,
        inflationAdjusted: es.incomeEventDetails.inflationAdjustment,
        userPercentage: es.incomeEventDetails.userPercentage,
        isSocialSecurity: es.incomeEventDetails.isSocialSecurity
      };
    }

    if (es.expenseEventDetails) {
      return {
        ...baseEvent,
        initialAmount: es.expenseEventDetails.initialAmount,
        amount: es.expenseEventDetails.initialAmount,
        changeType: es.expenseEventDetails.annualChangeType.toLowerCase(),
        annualChange: es.expenseEventDetails.annualChangeAmount || es.expenseEventDetails.annualChangePercentage || 0,
        annualChangeMin: es.expenseEventDetails.annualChangeMin,
        annualChangeMax: es.expenseEventDetails.annualChangeMax,
        annualChangeMean: es.expenseEventDetails.annualChangeMean,
        annualChangeStd: es.expenseEventDetails.annualChangeStd,
        inflationAdjusted: es.expenseEventDetails.inflationAdjustment,
        userPercentage: es.expenseEventDetails.userPercentage,
        isDiscretionary: es.expenseEventDetails.isDiscretionary
      };
    }

    return baseEvent;
  });

  // Create a map to track unique asset types by name to avoid duplicates
  const assetTypeMap = new Map();

  // Extract asset types from investments (as there's no direct relationship between Scenario and AssetType)
  if (scenario.investmentScenario && Array.isArray(scenario.investmentScenario)) {
    scenario.investmentScenario.forEach((is: any) => {
      const assetType = is.investment.assetType;
      if (assetType && !assetTypeMap.has(assetType.name)) {
        assetTypeMap.set(assetType.name, {
          name: assetType.name,
          description: assetType.description,
          returnType: assetType.returnType.toLowerCase(),
          fixedReturn: assetType.fixedReturn,
          normalReturnMean: assetType.normalReturnMean,
          normalReturnStd: assetType.normalReturnStd,
          expenseRatio: assetType.expenseRatio,
          normalIncomeMean: assetType.normalIncomeMean,
          normalIncomeStd: assetType.normalIncomeStd,
          taxable: assetType.taxability.toLowerCase() === 'taxable'
        });
      }
    });
  }

  // Convert map values to array
  const transformedAssetTypes = Array.from(assetTypeMap.values());

  const transformedInvestments = scenario.investmentScenario?.map((is: any) => ({
    assetType: is.investment.assetType.name,
    value: is.investment.value,
    taxStatus: is.investment.taxStatus.toLowerCase().replace(/_/g, '-'),
    withdrawalOrder: is.investment.withdrawalOrder,
    rothConversionOrder: is.investment.rothConversionOrder
  })) || [];

  return {
    id: scenario.id,
    name: scenario.name,
    forIndividual: scenario.forIndividual,
    userBirthYear: scenario.userBirthYear,
    userLifeExpectancyMean: scenario.userLifeExpectancyMean,
    userLifeExpectancyStd: scenario.userLifeExpectancyStd,
    spouseBirthYear: scenario.spouseBirthYear,
    spouseLifeExpectancyMean: scenario.spouseLifeExpectancyMean,
    spouseLifeExpectancyStd: scenario.spouseLifeExpectancyStd,
    inflationAssumption: scenario.inflationAssumption.toLowerCase(),
    inflation: scenario.inflation,
    inflationMin: scenario.inflationMin,
    inflationMax: scenario.inflationMax,
    inflationMean: scenario.inflationMean,
    inflationStd: scenario.inflationStd,
    initialAfterTaxRetirementContributionLimit: scenario.initialAfterTaxRetirementContributionLimit,
    rothOptimizationStartYear: scenario.rothOptimizationStartYear,
    rothOptimizationEndYear: scenario.rothOptimizationEndYear,
    residenceState: scenario.residenceState,
    financialGoal: scenario.financialGoal,
    assetTypes: transformedAssetTypes,
    investments: transformedInvestments,
    eventSeries: transformedEventSeries
  };
};

// GET endpoint – fetches scenario(s) by ownerId or id and applies the transformation
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const ownerId = searchParams.get('ownerId');
  const id = searchParams.get('id');

  // Cannot have both ownerId and id provided.
  if (ownerId && id) {
    return NextResponse.json({ status: 400, error: 'Provide either an ownerId or an ID, not both.' });
  }

  if (ownerId) {
    const results = await prisma.scenario.findMany({
      where: {
        OR: [
          { ownerId: ownerId },
          { readonlyPrivilege: { some: { id: ownerId } } },
          { readwritePrivilege: { some: { id: ownerId } } }
        ]
      },
      include: {
        investmentScenario: {
          include: {
            investment: {
              include: {
                assetType: true
              }
            }
          }
        },
        eventSeries: {
          include: {
            incomeEventDetails: true,
            expenseEventDetails: true,
            investEventDetails: {
              include: {
                AssetAllocation: {
                  include: {
                    investment: {
                      include: {
                        assetType: true
                      }
                    }
                  }
                }
              }
            },
            rebalanceEventDetails: {
              include: {
                AssetAllocation: {
                  include: {
                    investment: {
                      include: {
                        assetType: true
                      }
                    }
                  }
                }
              }
            }
          }
        },
        ownerPrivilege: { select: { id: true } },
        readonlyPrivilege: { select: { id: true } },
        readwritePrivilege: { select: { id: true } }
      }
    });

    // Enhance the transformed results with permission info.
    const transformedResults = results.map(scenario => {
      const transformed = transformScenarioForFrontend(scenario);
      return {
        ...transformed,
        permissions: {
          isOwner: scenario.ownerId === ownerId,
          canWrite: scenario.ownerId === ownerId || scenario.readwritePrivilege.some(user => user.id === ownerId),
          canRead: scenario.ownerId === ownerId ||
            scenario.readonlyPrivilege.some(user => user.id === ownerId) ||
            scenario.readwritePrivilege.some(user => user.id === ownerId),
          owner: { email: scenario.ownerId }
        }
      };
    });

    return NextResponse.json({ status: 200, result: transformedResults });
  }

  if (id) {
    const parsedId = parseInt(id, 10);
    if (isNaN(parsedId)) {
      return NextResponse.json({ status: 400, error: 'Invalid ID. ID must be an integer.' });
    }
    const results = await prisma.scenario.findMany({
      where: { id: parsedId },
      include: {
        investmentScenario: {
          include: {
            investment: {
              include: {
                assetType: true
              }
            }
          }
        },
        eventSeries: {
          include: {
            incomeEventDetails: true,
            expenseEventDetails: true,
            investEventDetails: {
              include: {
                AssetAllocation: true
              }
            },
            rebalanceEventDetails: {
              include: {
                AssetAllocation: true
              }
            }
          }
        },
        ownerPrivilege: { select: { id: true } },
        readonlyPrivilege: { select: { id: true } },
        readwritePrivilege: { select: { id: true } }
      }
    });
    return NextResponse.json({ status: 200, result: results });
  }

  return NextResponse.json({ status: 400, error: 'Invalid request - must have an ownerId or integer id.' });
}

// POST endpoint – creates a new scenario along with its asset types, investments, and event series.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ownerId = body.userEmail;

    if (!ownerId) {
      return NextResponse.json({ status: 400, error: 'User email is required' });
    }

    const {
      name,
      financialGoal,
      forIndividual,
      userBirthYear,
      userLifeExpectancyMean,
      userLifeExpectancyStd,
      spouseBirthYear,
      spouseLifeExpectancyMean,
      spouseLifeExpectancyStd,
      inflationAssumption,
      inflation,
      inflationMin,
      inflationMax,
      inflationMean,
      inflationStd,
      initialAfterTaxRetirementContributionLimit,
      rothOptimizationStartYear,
      rothOptimizationEndYear,
      residenceState,
      assetTypes,
      investments,
      eventSeries
    } = body;

    // Process inflation fields based on the distribution type
    const processedInflationAssumption = typeof inflationAssumption === 'string'
      ? mapDistributionType(inflationAssumption)
      : inflationAssumption;

    const processedInflation = processedInflationAssumption === DistributionType.fixed
      ? inflation
      : null;

    const processedInflationMin = processedInflationAssumption === DistributionType.random_uniform
      ? inflationMin
      : null;

    const processedInflationMax = processedInflationAssumption === DistributionType.random_uniform
      ? inflationMax
      : null;

    const processedInflationMean = processedInflationAssumption === DistributionType.random_normal
      ? inflationMean
      : null;

    const processedInflationStd = processedInflationAssumption === DistributionType.random_normal
      ? inflationStd
      : null;

    // Create the base scenario
    const scenario = await prisma.scenario.create({
      data: {
        name,
        financialGoal,
        forIndividual,
        userBirthYear,
        userLifeExpectancyMean,
        userLifeExpectancyStd,
        spouseBirthYear,
        spouseLifeExpectancyMean,
        spouseLifeExpectancyStd,
        inflationAssumption: processedInflationAssumption,
        inflation: processedInflation,
        inflationMin: processedInflationMin,
        inflationMax: processedInflationMax,
        inflationMean: processedInflationMean,
        inflationStd: processedInflationStd,
        ownerId: ownerId,
        initialAfterTaxRetirementContributionLimit,
        rothOptimizationStartYear,
        rothOptimizationEndYear,
        residenceState
      }
    });

    // Create asset types first if provided
    let assetTypeMap = new Map();
    let createdAssetTypes: any[] = [];
    if (assetTypes && assetTypes.length > 0) {
      createdAssetTypes = await createAssetTypes(assetTypes);
      // Create a map of asset type names to IDs for reference
      assetTypeMap = new Map(createdAssetTypes.map(asset => [asset.name, asset.id]));
    }

    // Create investments and link them to scenario using the asset type map
    let createdInvestments: (Investment & { assetType: AssetType })[] = [];
    if (investments && investments.length > 0) {
      createdInvestments = await createInvestments(scenario.id, investments, assetTypeMap);
    }

    // Create event series and their details
    if (eventSeries && eventSeries.length > 0) {
      await createEventSeries(scenario.id, eventSeries, createdInvestments);
    }

    // Fetch the complete scenario with all relations
    const completeScenario = await prisma.scenario.findUnique({
      where: { id: scenario.id },
      include: {
        investmentScenario: {
          include: {
            investment: {
              include: {
                assetType: true
              }
            }
          }
        },
        eventSeries: {
          include: {
            incomeEventDetails: true,
            expenseEventDetails: true,
            investEventDetails: {
              include: {
                AssetAllocation: true
              }
            },
            rebalanceEventDetails: {
              include: {
                AssetAllocation: true
              }
            }
          }
        }
      }
    });

    // Apply the transformation and add permissions
    const transformedScenario = transformScenarioForFrontend(completeScenario);

    // If the transformed scenario doesn't have all the asset types (because they might not be linked to investments yet),
    // add them manually 
    const transformedAssetTypeNames = transformedScenario.assetTypes.map(at => at.name);
    const additionalAssetTypes = createdAssetTypes
      .filter(at => !transformedAssetTypeNames.includes(at.name))
      .map(at => ({
        name: at.name,
        description: at.description,
        returnType: at.returnType.toLowerCase(),
        fixedReturn: at.fixedReturn,
        normalReturnMean: at.normalReturnMean,
        normalReturnStd: at.normalReturnStd,
        expenseRatio: at.expenseRatio,
        normalIncomeMean: at.normalIncomeMean,
        normalIncomeStd: at.normalIncomeStd,
        taxable: at.taxability.toLowerCase() === 'taxable'
      }));

    const responseData = {
      ...transformedScenario,
      assetTypes: [...transformedScenario.assetTypes, ...additionalAssetTypes],
      permissions: {
        isOwner: true, // The creator is always the owner.
        canWrite: true,
        canRead: true,
        owner: { email: ownerId }
      }
    };

    return NextResponse.json({ status: 201, result: responseData });
  } catch (error) {
    console.error('Error creating scenario:', error);
    return NextResponse.json({ status: 500, error: 'Failed to create scenario' });
  }
}

// PUT endpoint – updates an existing scenario. It verifies ownership/permissions,
// deletes existing related data, and then re-creates asset types, investments, and event series.
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const scenarioId = body.id;
    const ownerId = body.userEmail;

    if (!scenarioId) {
      return NextResponse.json({ status: 400, error: 'Scenario ID is required' });
    }

    if (!ownerId) {
      return NextResponse.json({ status: 400, error: 'User email is required' });
    }

    // Verify ownership or write permission before proceeding
    const existingScenario = await prisma.scenario.findFirst({
      where: {
        id: scenarioId,
        OR: [
          { ownerId: ownerId },
          { readwritePrivilege: { some: { id: ownerId } } }
        ]
      },
      include: {
        readwritePrivilege: true
      }
    });

    if (!existingScenario) {
      return NextResponse.json({ status: 403, error: 'Not authorized to modify this scenario' });
    }

    // Delete existing scenario relationships in a transaction.
    await prisma.$transaction([
      // Delete asset allocations first (they reference invest/rebalance details)
      prisma.assetAllocation.deleteMany({
        where: {
          OR: [
            {
              investEventDetails: {
                eventSeries: {
                  scenarioId: scenarioId
                }
              }
            },
            {
              rebalanceEventDetails: {
                eventSeries: {
                  scenarioId: scenarioId
                }
              }
            }
          ]
        }
      }),
      // Delete event details
      prisma.incomeEventDetails.deleteMany({
        where: {
          eventSeries: {
            scenarioId: scenarioId
          }
        }
      }),
      prisma.expenseEventDetails.deleteMany({
        where: {
          eventSeries: {
            scenarioId: scenarioId
          }
        }
      }),
      prisma.investEventDetails.deleteMany({
        where: {
          eventSeries: {
            scenarioId: scenarioId
          }
        }
      }),
      prisma.rebalanceEventDetails.deleteMany({
        where: {
          eventSeries: {
            scenarioId: scenarioId
          }
        }
      }),
      // Delete event series
      prisma.eventSeries.deleteMany({
        where: {
          scenarioId: scenarioId
        }
      }),
      // Delete investment scenarios and investments
      prisma.investmentScenario.deleteMany({
        where: {
          scenarioId: scenarioId
        }
      }),
      prisma.investment.deleteMany({
        where: {
          investmentScenario: {
            some: {
              scenarioId: scenarioId
            }
          }
        }
      }),
      // Delete asset types (only those linked to investments)
      prisma.assetType.deleteMany({
        where: {
          investments: {
            some: {
              investmentScenario: {
                some: {
                  scenarioId: scenarioId
                }
              }
            }
          }
        }
      })
    ]);

    const {
      name,
      financialGoal,
      forIndividual,
      userBirthYear,
      userLifeExpectancyMean,
      userLifeExpectancyStd,
      spouseBirthYear,
      spouseLifeExpectancyMean,
      spouseLifeExpectancyStd,
      inflationAssumption,
      inflation,
      inflationMin,
      inflationMax,
      inflationMean,
      inflationStd,
      initialAfterTaxRetirementContributionLimit,
      rothOptimizationStartYear,
      rothOptimizationEndYear,
      residenceState,
      assetTypes,
      investments,
      eventSeries
    } = body;

    // Process inflation fields
    const processedInflationAssumption = typeof inflationAssumption === 'string'
      ? mapDistributionType(inflationAssumption)
      : inflationAssumption;

    const processedInflation = processedInflationAssumption === DistributionType.fixed
      ? inflation
      : null;

    const processedInflationMin = processedInflationAssumption === DistributionType.random_uniform
      ? inflationMin
      : null;

    const processedInflationMax = processedInflationAssumption === DistributionType.random_uniform
      ? inflationMax
      : null;

    const processedInflationMean = processedInflationAssumption === DistributionType.random_normal
      ? inflationMean
      : null;

    const processedInflationStd = processedInflationAssumption === DistributionType.random_normal
      ? inflationStd
      : null;

    // Update the base scenario
    const scenario = await prisma.scenario.update({
      where: { id: scenarioId },
      data: {
        name,
        financialGoal,
        forIndividual,
        userBirthYear,
        userLifeExpectancyMean,
        userLifeExpectancyStd,
        spouseBirthYear,
        spouseLifeExpectancyMean,
        spouseLifeExpectancyStd,
        inflationAssumption: processedInflationAssumption,
        inflation: processedInflation,
        inflationMin: processedInflationMin,
        inflationMax: processedInflationMax,
        inflationMean: processedInflationMean,
        inflationStd: processedInflationStd,
        initialAfterTaxRetirementContributionLimit,
        rothOptimizationStartYear,
        rothOptimizationEndYear,
        residenceState
      }
    });

    // Create asset types first if provided
    let assetTypeMap = new Map();
    let createdAssetTypes: any[] = [];
    if (assetTypes && assetTypes.length > 0) {
      createdAssetTypes = await createAssetTypes(assetTypes);
      assetTypeMap = new Map(createdAssetTypes.map(asset => [asset.name, asset.id]));
    }

    // Create investments and link them to scenario
    let createdInvestments: (Investment & { assetType: AssetType })[] = [];
    if (investments && investments.length > 0) {
      createdInvestments = await createInvestments(scenario.id, investments, assetTypeMap);
    }

    // Create event series and their details
    if (eventSeries && eventSeries.length > 0) {
      await createEventSeries(scenario.id, eventSeries, createdInvestments);
    }

    // Fetch the complete updated scenario with all relations
    const completeScenario = await prisma.scenario.findUnique({
      where: { id: scenario.id },
      include: {
        investmentScenario: {
          include: {
            investment: {
              include: {
                assetType: true
              }
            }
          }
        },
        eventSeries: {
          include: {
            incomeEventDetails: true,
            expenseEventDetails: true,
            investEventDetails: {
              include: {
                AssetAllocation: {
                  include: {
                    investment: {
                      include: {
                        assetType: true
                      }
                    }
                  }
                }
              }
            },
            rebalanceEventDetails: {
              include: {
                AssetAllocation: {
                  include: {
                    investment: {
                      include: {
                        assetType: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    const transformedScenario = transformScenarioForFrontend(completeScenario);

    // If the transformed scenario doesn't have all the asset types, add them manually.
    const transformedAssetTypeNames = transformedScenario.assetTypes.map(at => at.name);
    const additionalAssetTypes = createdAssetTypes
      .filter(at => !transformedAssetTypeNames.includes(at.name))
      .map(at => ({
        name: at.name,
        description: at.description,
        returnType: at.returnType.toLowerCase(),
        fixedReturn: at.fixedReturn,
        normalReturnMean: at.normalReturnMean,
        normalReturnStd: at.normalReturnStd,
        expenseRatio: at.expenseRatio,
        normalIncomeMean: at.normalIncomeMean,
        normalIncomeStd: at.normalIncomeStd,
        taxable: at.taxability.toLowerCase() === 'taxable'
      }));

    const responseData = {
      ...transformedScenario,
      assetTypes: [...transformedScenario.assetTypes, ...additionalAssetTypes],
      permissions: {
        isOwner: completeScenario?.ownerId === ownerId,
        canWrite: completeScenario?.ownerId === ownerId ||
          existingScenario.readwritePrivilege.some(user => user.id === ownerId),
        canRead: true,
        owner: {
          email: completeScenario?.ownerId || ownerId
        }
      }
    };

    return NextResponse.json({ status: 200, result: responseData });
  } catch (error) {
    console.error('Error updating scenario:', error);
    return NextResponse.json({ status: 500, error: 'Failed to update scenario' });
  }
}
