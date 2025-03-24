import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { DistributionType, EventType, StartYearType, State, TaxStatus, Investment, AssetType, ReturnType, Taxability } from '@prisma/client';
import getLoggedInUser from '../temp';

const yesNoToBoolean = (arg: string) => {
  if (arg == 'Yes') {
    return true;
  } else if (arg == 'No') {
    return false;
  } else {
    throw new Error('Invalid yes/no value');
  }
}

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
        console.log(event);
        await prisma.incomeEventDetails.create({
          data: {
            eventSeriesId: createdEvent.id,
            initialAmount: event.amount,
            annualChangeType: typeof (event.annualChangeType || event.changeType) === 'string' ?
              mapDistributionType(event.annualChangeType || event.changeType) :
              (event.annualChangeType || event.changeType),
            annualChangeAmount: (event.annualChangeType || event.changeType) === DistributionType.fixed ? event.annualChange : null,
            annualChangePercentage: (event.annualChangeType || event.changeType) === 'percentage' ? event.annualChange : null,
            annualChangeMin: event.annualChangeMin,
            annualChangeMax: event.annualChangeMax,
            annualChangeMean: event.annualChangeMean,
            annualChangeStd: event.annualChangeStd,
            inflationAdjustment: event.inflationAdjusted,
            userPercentage: event.userPercentage,
            isSocialSecurity: event.isSocialSecurity
          }
        });
        break;

      case EventType.expense:
        await prisma.expenseEventDetails.create({
          data: {
            eventSeriesId: createdEvent.id,
            initialAmount: event.amount,
            annualChangeType: typeof (event.annualChangeType || event.changeType) === 'string' ?
              mapDistributionType(event.annualChangeType || event.changeType) :
              (event.annualChangeType || event.changeType),
            annualChangeAmount: (event.annualChangeType || event.changeType) === DistributionType.fixed ? event.annualChange : null,
            annualChangePercentage: (event.annualChangeType || event.changeType) === 'percentage' ? event.annualChange : null,
            annualChangeMin: event.annualChangeMin,
            annualChangeMax: event.annualChangeMax,
            annualChangeMean: event.annualChangeMean,
            annualChangeStd: event.annualChangeStd,
            inflationAdjustment: event.inflationAdjusted,
            userPercentage: event.userPercentage,
            isDiscretionary: event.isDiscretionary,
            order: event.order
          }
        });
        break;

      case EventType.invest:
        const investDetails = await prisma.investEventDetails.create({
          data: {
            eventSeriesId: createdEvent.id,
            maxCash: event.maxCashValue,
            order: event.order,
            initialAllocation: 0 // Default value, will be updated by asset allocations
          }
        });

        // Create asset allocations for invest event
        if (event.allocations) {
          for (const [assetName, percentage] of Object.entries(event.allocations)) {
            const numericPercentage = typeof percentage === 'number' ? percentage : parseFloat(percentage as string);
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
        break;

      case EventType.rebalance:
        const rebalanceDetails = await prisma.rebalanceEventDetails.create({
          data: {
            eventSeriesId: createdEvent.id
          }
        });

        // Create asset allocations for rebalance event
        if (event.allocations) {
          for (const [assetName, percentage] of Object.entries(event.allocations)) {
            const numericPercentage = typeof percentage === 'number' ? percentage : parseFloat(percentage as string);
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

// Helper function to map string taxability to Taxability enum
function mapTaxability(taxabilityString: string): Taxability {
  if (taxabilityString === 'tax-exempt') {
    return Taxability.TAX_EXEMPT;
  }
  else {
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

    // Create asset type
    const createdAssetType = await prisma.assetType.create({
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
      }
    });

    createdAssetTypes.push(createdAssetType);
  }

  return createdAssetTypes;
}

// Helper function to create investments and link them to scenario
async function createInvestments(scenarioId: number, investments: any[], assetTypeMap: Map<string, number>) {
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

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const ownerId = searchParams.get('ownerId');
  const id = searchParams.get('id');

  // cannot have both email and scenario id
  if (ownerId && id) {
    return NextResponse.json({ status: 400, error: 'Provide either an ownerId or an ID, not both.' });
  }

  if (ownerId) {
    const results = await prisma.scenario.findMany({
      where: {
        ownerId: ownerId
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
    if (results.length === 0) {
      return NextResponse.json({ status: 404, error: 'No scenarios found for the provided ownerId.' });
    }
    return NextResponse.json({ status: 200, result: results });
  }

  if (id) {
    const parsedId = parseInt(id, 10);
    if (isNaN(parsedId)) {
      return NextResponse.json({ status: 400, error: 'Invalid ID. ID must be an integer.' });
    }
    const results = await prisma.scenario.findMany({
      where: {
        id: parsedId
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
    return NextResponse.json({ status: 200, result: results });
  }

  return NextResponse.json({ status: 400, error: 'Invalid request - must have an ownerId or integer id.' });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ownerId = getLoggedInUser();

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
        ownerPrivilege: { connect: { id: ownerId } },
        initialAfterTaxRetirementContributionLimit,
        rothOptimizationStartYear,
        rothOptimizationEndYear,
        residenceState
      }
    });

    // Create asset types first if provided
    let assetTypeMap = new Map();
    if (assetTypes && assetTypes.length > 0) {
      const createdAssetTypes = await createAssetTypes(assetTypes);
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

    return NextResponse.json({ status: 201, result: completeScenario });
  } catch (error) {
    console.error('Error creating scenario:', error);
    return NextResponse.json({ status: 500, error: 'Failed to create scenario' });
  }
}