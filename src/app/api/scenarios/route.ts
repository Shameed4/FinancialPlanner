import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { DistributionType, EventType, StartYearType, State, TaxStatus, Investment, AssetType, ReturnType, Taxability, EventSeries, IncomeEventDetails, ExpenseEventDetails, InvestEventDetails, RebalanceEventDetails } from '@prisma/client';
import { Event as StringEventSeries } from '../../scenario/types'

// Helper function to map string distribution type to DistributionType enum
function mapDistributionType(distributionTypeString: string): DistributionType {
  switch (distributionTypeString.toLowerCase()) {
    case 'fixed':
      return DistributionType.fixed;
    case 'percentage':
      return DistributionType.percentage;
    case 'random_uniform':
      return DistributionType.random_uniform;
    case 'random_normal':
      return DistributionType.random_normal;
    default:
      console.warn(`Unknown distribution type: ${distributionTypeString}, defaulting to fixed`);
      return DistributionType.fixed;
  }
}

// Helper function to create event series and their details
async function createEventSeries(scenarioId: number, eventSeries: any[], investments: any[]) {
  let createdEvents = [];

  // Create a map of asset names to investment IDs
  const assetToInvestmentMap = new Map();

  // Map both the investment type name and the full key (with tax status) to the investment ID
  investments.forEach(inv => {
    // Map the basic asset type name
    assetToInvestmentMap.set(inv.assetType.name, inv.id);

    // Map the full key with tax status that's used in allocations
    const taxStatus = inv.taxStatus.toLowerCase().replace(/_/g, '-');
    const fullKey = `${inv.assetType.name} ${taxStatus}`;
    assetToInvestmentMap.set(fullKey, inv.id);

    console.log(`Mapping investment: "${fullKey}" -> ID: ${inv.id}`);
  });

  const nameToEventSeries = new Map<string, number>();
  const pendingStartOnOtherSeriesUpdates: { id: number; startOnOtherSeriesName: string }[] = [];

  for (const event of eventSeries) {
    // Create base event series
    const eventSeriesData: Omit<EventSeries, 'id' | 'startOnOtherSeriesId'> = {
      name: event.name,
      description: event.description || null,
      scenarioId,
      startYearType: event.startYearType,
      startYear: event.startYear,
      startMin: event.startYearMin,
      startMax: event.startYearMax,
      startMean: event.startYearMean,
      startStd: event.startYearStd,
      durationType: event.durationType,
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

    nameToEventSeries.set(event.name, createdEvent.id);

    if (event.startOnOtherSeries) {
      pendingStartOnOtherSeriesUpdates.push({
        id: createdEvent.id,
        startOnOtherSeriesName: event.startOnOtherSeries
      });
    }

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
            annualChangeAmount: (event.annualChangeType || event.changeType) === DistributionType.fixed
              ? parseFloat(event.annualChange || '0')
              : null,
            annualChangePercentage: (event.annualChangeType || event.changeType) === 'percentage'
              ? parseFloat(event.annualChange || '0')
              : null,
            annualChangeMin: event.annualChangeMin ? parseFloat(event.annualChangeMin) : null,
            annualChangeMax: event.annualChangeMax ? parseFloat(event.annualChangeMax) : null,
            annualChangeMean: event.annualChangeMean ? parseFloat(event.annualChangeMean) : null,
            annualChangeStd: event.annualChangeStd ? parseFloat(event.annualChangeStd) : null,
            inflationAdjustment: event.inflationAdjusted,
            userPercentage: event.userPercentage ? parseFloat(event.userPercentage) : null,
            isSocialSecurity: event.isSocialSecurity || false,
            changeAmtOrPct: event.changeAmtOrPct
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
            annualChangeAmount: (event.annualChangeType || event.changeType) === DistributionType.fixed
              ? parseFloat(event.annualChange || '0')
              : null,
            annualChangePercentage: (event.annualChangeType || event.changeType) === 'percentage'
              ? parseFloat(event.annualChange || '0')
              : null,
            annualChangeMin: event.annualChangeMin ? parseFloat(event.annualChangeMin) : null,
            annualChangeMax: event.annualChangeMax ? parseFloat(event.annualChangeMax) : null,
            annualChangeMean: event.annualChangeMean ? parseFloat(event.annualChangeMean) : null,
            annualChangeStd: event.annualChangeStd ? parseFloat(event.annualChangeStd) : null,
            inflationAdjustment: event.inflationAdjusted,
            userPercentage: event.userPercentage ? parseFloat(event.userPercentage) : null,
            isDiscretionary: event.isDiscretionary || false,
            spendingStrategy: event.isDiscretionary ? parseInt(event.spendingStrategy) : null,
            changeAmtOrPct: event.changeAmtOrPct
          }
        });
        break;

      case EventType.invest:
        const investDetails = await prisma.investEventDetails.create({
          data: {
            eventSeriesId: createdEvent.id,
            maxCash: event.maxCashValue || null,
            initialAllocation: 0 // default
          }
        });

        console.log(`DEBUG - Creating invest event "${event.name}" in DB:`);
        console.log(`  allocationType: ${event.allocationType}`);

        if (event.allocationType === 'glide' && event.initialAllocations && event.finalAllocations) {
          console.log(`  Processing glide path allocations`);
          console.log(`  initialAllocations: ${JSON.stringify(event.initialAllocations)}`);
          console.log(`  finalAllocations: ${JSON.stringify(event.finalAllocations)}`);

          for (const assetName in event.initialAllocations) {
            if (event.initialAllocations.hasOwnProperty(assetName)) {
              const initialPercentage = parseFloat(event.initialAllocations[assetName]);
              const finalPercentage = parseFloat(event.finalAllocations[assetName]);
              const investmentId = assetToInvestmentMap.get(assetName);

              console.log(`    Asset: ${assetName}, Initial: ${initialPercentage}, Final: ${finalPercentage}, InvestmentId: ${investmentId}`);

              if (investmentId) {
                await prisma.assetAllocation.create({
                  data: {
                    investEventDetailsId: investDetails.id,
                    initialAllocation: initialPercentage / 100,
                    finalAllocation: finalPercentage / 100,
                    investmentId
                  }
                });
                console.log(`    Created allocation in DB`);
              } else {
                console.log(`    WARNING: No investment ID found for ${assetName}`);
              }
            }
          }
        } else if (event.allocations) {
          console.log(`  Processing fixed allocations`);
          console.log(`  allocations: ${JSON.stringify(event.allocations)}`);

          for (const [assetName, percentage] of Object.entries(event.allocations)) {
            const numericPercentage = parseFloat(percentage as string);
            const investmentId = assetToInvestmentMap.get(assetName);

            console.log(`    Asset: ${assetName}, Percentage: ${numericPercentage}, InvestmentId: ${investmentId}`);

            if (investmentId) {
              await prisma.assetAllocation.create({
                data: {
                  investEventDetailsId: investDetails.id,
                  initialAllocation: numericPercentage / 100,
                  finalAllocation: numericPercentage / 100,
                  investmentId
                }
              });
              console.log(`    Created allocation in DB`);
            } else {
              console.log(`    WARNING: No investment ID found for ${assetName}`);
            }
          }
        } else {
          console.log(`  WARNING: No allocations found for invest event "${event.name}"`);
        }
        break;

      case EventType.rebalance:
        const rebalanceDetails = await prisma.rebalanceEventDetails.create({
          data: {
            eventSeriesId: createdEvent.id
          }
        });

        if (event.allocationType === 'glide' && event.initialAllocations && event.finalAllocations) {
          for (const assetName in event.initialAllocations) {
            if (event.initialAllocations.hasOwnProperty(assetName)) {
              const initialPercentage = parseFloat(event.initialAllocations[assetName]);
              const finalPercentage = parseFloat(event.finalAllocations[assetName]);
              const investmentId = assetToInvestmentMap.get(assetName);
              if (investmentId) {
                await prisma.assetAllocation.create({
                  data: {
                    rebalanceEventDetailsId: rebalanceDetails.id,
                    initialAllocation: initialPercentage / 100,
                    finalAllocation: finalPercentage / 100,
                    investmentId
                  }
                });
              }
            }
          }
        } else if (event.allocations) {
          for (const [assetName, percentage] of Object.entries(event.allocations)) {
            const numericPercentage = parseFloat(percentage as string);
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

    createdEvents.push({
      ...createdEvent,
      startOnOtherSeriesName: event.startOnOtherSeries || null
    });
  }

  // after all event series created, update startOnOtherSeriesId
  for (const updateInfo of pendingStartOnOtherSeriesUpdates) {
    const referencedId = nameToEventSeries.get(updateInfo.startOnOtherSeriesName);
    if (referencedId) {
      await prisma.eventSeries.update({
        where: { id: updateInfo.id },
        data: { startOnOtherSeriesId: referencedId }
      });
    }
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
    // Map the taxability properly - handle both string and boolean values
    let taxability;
    if (typeof assetType.taxability === 'string') {
      taxability = mapTaxability(assetType.taxability);
    } else if (typeof assetType.taxable !== 'undefined') {
      // If the frontend passes taxable (boolean) instead of taxability (enum)
      taxability = assetType.taxable ? Taxability.TAXABLE : Taxability.TAX_EXEMPT;
    } else {
      // Default if neither is provided
      taxability = (assetType.taxability === false) ? Taxability.TAX_EXEMPT : Taxability.TAXABLE;
    }

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
      // Log the key fields
      console.log(`Creating asset type ${assetType.name}:`);
      console.log(`  taxable: ${assetType.taxable}, taxability: ${taxability}`);
      console.log(`  normalIncomeMean: ${assetType.normalIncomeMean}`);

      createdAssetType = await prisma.assetType.create({
        data: {
          name: assetType.name,
          description: assetType.description,
          returnType: returnType,
          fixedReturn: returnType === ReturnType.FIXED ?
            (assetType.fixedReturn !== null && assetType.fixedReturn !== undefined ?
              parseFloat(String(assetType.fixedReturn)) : null) : null,
          normalReturnMean: returnType === ReturnType.NORMAL ?
            (assetType.normalReturnMean !== null && assetType.normalReturnMean !== undefined ?
              parseFloat(String(assetType.normalReturnMean)) : null) : null,
          normalReturnStd: returnType === ReturnType.NORMAL ?
            (assetType.normalReturnStd !== null && assetType.normalReturnStd !== undefined ?
              parseFloat(String(assetType.normalReturnStd)) : null) : null,
          expectedAnnualIncomeType: expectedAnnualIncomeType,
          fixedIncome: assetType.fixedIncome !== null && assetType.fixedIncome !== undefined ?
            parseFloat(String(assetType.fixedIncome)) : null,
          normalIncomeMean: assetType.normalIncomeMean !== null && assetType.normalIncomeMean !== undefined ?
            parseFloat(String(assetType.normalIncomeMean)) : null,
          normalIncomeStd: assetType.normalIncomeStd !== null && assetType.normalIncomeStd !== undefined ?
            parseFloat(String(assetType.normalIncomeStd)) : null,
          expenseRatio: assetType.expenseRatio !== null && assetType.expenseRatio !== undefined ?
            parseFloat(String(assetType.expenseRatio)) : 0,
          taxability: taxability,
          incomeAmtOrPct: assetType.incomeAmtOrPct || 'amount',
          returnAmtOrPct: assetType.returnAmtOrPct || 'amount',
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
        // Add default values for required fields
        expenseWithdrawalStrategy: parseInt(investment.expenseWithdrawalStrategy) || 0,
        // Only add these fields for pre-tax-retirement investments
        ...(investment.taxStatus === 'pre-tax-retirement' && investment.rmdStrategy ? { rmdStrategy: parseInt(investment.rmdStrategy) } : {}),
        ...(investment.taxStatus === 'pre-tax-retirement' && investment.rothConversionStrategy ? { rothConversionStrategy: parseInt(investment.rothConversionStrategy) } : {}),
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
  //console.log("Investments", investments);
  //console.log("Created investments", createdInvestments);

  return createdInvestments;
}

// Transformation function to shape the scenario for the frontend with defensive checks.
const transformScenarioForFrontend = (scenario: any) => {
  // Transform event series
  const transformedEventSeries = scenario.eventSeries.map((es: EventSeries & {
    incomeEventDetails?: IncomeEventDetails,
    expenseEventDetails?: ExpenseEventDetails,
    investEventDetails?: InvestEventDetails & { AssetAllocation: any },
    rebalanceEventDetails?: RebalanceEventDetails & { AssetAllocation: any },
    startOnOtherSeries?: any
  }) => {
    //console.log("Event series:", es);
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
      // Check if startOnOtherSeries exists before accessing its name
      startOnOtherSeries: es.startOnOtherSeries?.name || '',
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

          // Try to fetch the investment directly from the database using investmentId
          const matchingInvestment = scenario.investmentScenario?.find((is: any) =>
            is.investment.id === alloc.investmentId
          )?.investment;

          if (matchingInvestment && matchingInvestment.assetType) {
            // If we found a matching investment, use its asset type name
            const assetName = matchingInvestment.assetType.name;
            const taxStatus = matchingInvestment.taxStatus.toLowerCase().replace(/_/g, '-');
            const fullKey = `${assetName} ${taxStatus}`;

            console.log(`Recovered allocation for ${fullKey} with values: initial=${alloc.initialAllocation * 100}, final=${alloc.finalAllocation * 100}`);

            const initPercent = alloc.initialAllocation * 100;
            const finalPercent = alloc.finalAllocation * 100;
            fixedAllocations[fullKey] = initPercent;
            initialAllocations[fullKey] = initPercent;
            finalAllocations[fullKey] = finalPercent;

            if (Math.abs(initPercent - finalPercent) > 0.1) {
              isGlide = true;
            }
          }
          return;
        }

        const assetName = alloc.investment.assetType.name;
        const taxStatus = alloc.investment.taxStatus.toLowerCase().replace(/_/g, '-');
        const fullKey = `${assetName} ${taxStatus}`;

        const initPercent = alloc.initialAllocation * 100;
        const finalPercent = alloc.finalAllocation * 100;
        fixedAllocations[fullKey] = initPercent;
        initialAllocations[fullKey] = initPercent;
        finalAllocations[fullKey] = finalPercent;

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

          // Try to fetch the investment directly from the database using investmentId
          const matchingInvestment = scenario.investmentScenario?.find((is: any) =>
            is.investment.id === alloc.investmentId
          )?.investment;

          if (matchingInvestment && matchingInvestment.assetType) {
            // If we found a matching investment, use its asset type name
            const assetName = matchingInvestment.assetType.name;
            const taxStatus = matchingInvestment.taxStatus.toLowerCase().replace(/_/g, '-');
            const fullKey = `${assetName} ${taxStatus}`;

            console.log(`Recovered rebalance allocation for ${fullKey} with value: ${alloc.initialAllocation * 100}`);

            const initPercent = alloc.initialAllocation * 100;
            const finalPercent = alloc.finalAllocation !== undefined && alloc.finalAllocation !== null
              ? alloc.finalAllocation * 100
              : initPercent;

            fixedAllocations[fullKey] = initPercent;
            initialAllocations[fullKey] = initPercent;
            finalAllocations[fullKey] = finalPercent;

            if (Math.abs(initPercent - finalPercent) > 0.1) {
              isGlide = true;
            }
          }
          return;
        }

        const assetName = alloc.investment.assetType.name;
        const taxStatus = alloc.investment.taxStatus.toLowerCase().replace(/_/g, '-');
        const fullKey = `${assetName} ${taxStatus}`;

        const initPercent = alloc.initialAllocation * 100;
        const finalPercent = alloc.finalAllocation !== undefined && alloc.finalAllocation !== null
          ? alloc.finalAllocation * 100
          : initPercent;

        fixedAllocations[fullKey] = initPercent;
        initialAllocations[fullKey] = initPercent;
        finalAllocations[fullKey] = finalPercent;

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
        changeAmtOrPct: es.incomeEventDetails.changeAmtOrPct,
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
        changeAmtOrPct: es.expenseEventDetails.changeAmtOrPct,
        inflationAdjusted: es.expenseEventDetails.inflationAdjustment,
        userPercentage: es.expenseEventDetails.userPercentage,
        isDiscretionary: es.expenseEventDetails.isDiscretionary,
        spendingStrategy: es.expenseEventDetails.spendingStrategy
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
          taxable: assetType.taxability.toLowerCase() === 'taxable',
          returnAmtOrPct: assetType.returnAmtOrPct,
          incomeAmtOrPct: assetType.incomeAmtOrPct
        });
      }
    });
  }

  // Convert map values to array
  const transformedAssetTypes = Array.from(assetTypeMap.values());

  //console.log("InvestmentScenario: ", scenario.investmentScenario);
  const transformedInvestments = scenario.investmentScenario?.map((is: any) => ({
    assetType: is.investment.assetType.name,
    value: is.investment.value,
    taxStatus: is.investment.taxStatus.toLowerCase().replace(/_/g, '-'),
    rmdStrategy: is.investment.rmdStrategy,
    rothConversionStrategy: is.investment.rothConversionStrategy,
    expenseWithdrawalStrategy: is.investment.expenseWithdrawalStrategy
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
            },
            startOnOtherSeries: true
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
    // console.log("GET results", transformedResults.map(res => res.assetTypes));
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
            },
            startOnOtherSeries: true,
          }
        },
        ownerPrivilege: { select: { id: true } },
        readonlyPrivilege: { select: { id: true } },
        readwritePrivilege: { select: { id: true } }
      }
    });

    // console.log("GET Request results", results);
    return NextResponse.json({ status: 200, result: results });
  }

  return NextResponse.json({ status: 400, error: 'Invalid request - must have an ownerId or integer id.' });
}

// POST endpoint – creates a new scenario along with its asset types, investments, and event series.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ownerId = body.userEmail;

    console.log("Post body: ", body);

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
            },
            startOnOtherSeries: true
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
        fixedIncome: at.fixedIncome,
        normalIncomeMean: at.normalIncomeMean,
        normalIncomeStd: at.normalIncomeStd,
        taxable: at.taxability.toLowerCase() === 'taxable',
        returnAmtOrPct: at.returnAmtOrPct,
        incomeAmtOrPct: at.incomeAmtOrPct,
        expectedAnnualIncomeType: at.expectedAnnualIncomeType?.toLowerCase()
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
    const originalBody = await request.json();
    let body = { ...originalBody }; // Create a mutable copy of the body
    const scenarioId = body.id;
    const ownerId = body.userEmail;

    console.log("PUT request received with body:", JSON.stringify({
      id: body.id,
      name: body.name,
      inflationAssumption: body.inflationAssumption,
      partialUpdate: body.partialUpdate,
      generalInfo: body.generalInfo,
      assetTypeUpdates: body.assetTypeUpdates,
    }, null, 2));

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

    // Check if this is a partial update (for specific fields only)
    if (body.partialUpdate) {
      console.log("Processing partial update");

      // Handle general information updates
      if (body.generalInfo) {
        console.log("Updating general information:", body.generalInfo);

        // Create an update object with only the provided fields
        const updateData: any = {};
        Object.entries(body.generalInfo).forEach(([key, value]) => {
          if (value !== undefined) {
            // Special handling for inflation fields
            if (key === 'inflationAssumption') {
              // Check if inflationAssumption is an object with type and value
              if (typeof value === 'object' && value !== null && (value as any).type) {
                console.log(`Processing inflationAssumption object: ${JSON.stringify(value)}`);

                // Map the type string to the correct enum
                updateData[key] = mapDistributionType((value as any).type);

                // Set the appropriate inflation value based on the type
                if ((value as any).type === 'fixed') {
                  updateData.inflation = parseFloat(String((value as any).value || 0));
                  console.log(`Setting fixed inflation value: ${updateData.inflation}`);
                } else if ((value as any).type === 'normal' || (value as any).type === 'random_normal') {
                  updateData.inflationMean = parseFloat(String((value as any).mean || 0));
                  updateData.inflationStd = parseFloat(String((value as any).stdev || 0));
                  console.log(`Setting normal inflation: mean=${updateData.inflationMean}, stdev=${updateData.inflationStd}`);
                } else if ((value as any).type === 'uniform' || (value as any).type === 'random_uniform') {
                  updateData.inflationMin = parseFloat(String((value as any).lower || 0));
                  updateData.inflationMax = parseFloat(String((value as any).upper || 0));
                  console.log(`Setting uniform inflation: min=${updateData.inflationMin}, max=${updateData.inflationMax}`);
                }
              } else if (typeof value === 'string') {
                // If it's a string, map it directly
                updateData[key] = mapDistributionType(value);
                console.log(`Processing inflationAssumption string: ${value} -> ${updateData[key]}`);
              } else {
                // If it's another type, just use it directly
                updateData[key] = value;
                console.log(`Processing inflationAssumption other: ${value}`);
              }
            } else if (key.startsWith('inflation')) {
              // Make sure to handle zero values properly
              updateData[key] = parseFloat(String(value || 0));
              console.log(`Setting inflation field ${key}: ${value} -> ${updateData[key]}`);
            } else {
              updateData[key] = value;
            }
          }
        });

        if (Object.keys(updateData).length > 0) {
          console.log("Updating scenario with data:", updateData);
          await prisma.scenario.update({
            where: { id: scenarioId },
            data: updateData
          });
        }
      }

      // Handle asset type updates
      if (body.assetTypeUpdates) {
        console.log("Processing asset type updates:", body.assetTypeUpdates);

        // Process each asset type update
        for (const update of body.assetTypeUpdates) {
          // Find the existing asset type by name
          const existingAssetType = await prisma.assetType.findFirst({
            where: { name: update.name }
          });

          if (existingAssetType) {
            console.log(`Updating asset type ${update.name}:`, update);

            // Handle taxability (boolean to enum conversion)
            let updatedTaxability;
            if (typeof update.taxable !== 'undefined') {
              updatedTaxability = update.taxable ? Taxability.TAXABLE : Taxability.TAX_EXEMPT;
              console.log(`  Setting taxability to ${updatedTaxability} from taxable=${update.taxable}`);
            }

            // Update the asset type
            await prisma.assetType.update({
              where: { id: existingAssetType.id },
              data: {
                description: update.description ?? existingAssetType.description,
                taxability: updatedTaxability ?? existingAssetType.taxability,
                expenseRatio: update.expenseRatio !== undefined ?
                  parseFloat(String(update.expenseRatio)) : existingAssetType.expenseRatio,
                normalIncomeMean: update.normalIncomeMean !== undefined ?
                  parseFloat(String(update.normalIncomeMean)) : existingAssetType.normalIncomeMean,
                normalIncomeStd: update.normalIncomeStd !== undefined ?
                  parseFloat(String(update.normalIncomeStd)) : existingAssetType.normalIncomeStd,
                fixedIncome: update.fixedIncome !== undefined ?
                  parseFloat(String(update.fixedIncome)) : existingAssetType.fixedIncome,
              }
            });
          } else {
            console.warn(`Asset type ${update.name} not found for update`);
          }
        }
      }

      // Get the updated scenario with all related data
      const updatedScenario = await prisma.scenario.findUnique({
        where: { id: scenarioId },
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
              },
              startOnOtherSeries: true
            }
          }
        }
      });

      // Transform the scenario for the frontend
      const transformedScenario = transformScenarioForFrontend(updatedScenario);

      // Return the updated scenario
      return NextResponse.json({
        status: 200,
        result: {
          ...transformedScenario,
          permissions: {
            isOwner: existingScenario.ownerId === ownerId,
            canWrite: true,
            canRead: true,
            owner: { email: existingScenario.ownerId }
          }
        }
      });
    }

    // Check if the frontend is sending a complete scenario or just updating specific fields
    if (!body.partialUpdate && typeof body.inflationAssumption === 'object' && body.inflationAssumption !== null) {
      // Handle case where inflationAssumption is sent as an object with type and value
      console.log("Processing inflationAssumption as object:", body.inflationAssumption);

      const inflationType = body.inflationAssumption.type;

      // Map the type string to the correct enum
      const processedInflationAssumption = mapDistributionType(inflationType);

      // Set up base scenario update with proper inflation type
      const scenarioUpdateData: any = {
        ...body,
        inflationAssumption: processedInflationAssumption
      };

      // Set the appropriate inflation value based on the type
      if (inflationType === 'fixed') {
        scenarioUpdateData.inflation = parseFloat(String(body.inflationAssumption.value || 0));
        // Clear other inflation fields
        scenarioUpdateData.inflationMin = null;
        scenarioUpdateData.inflationMax = null;
        scenarioUpdateData.inflationMean = null;
        scenarioUpdateData.inflationStd = null;
      } else if (inflationType === 'normal' || inflationType === 'random_normal') {
        scenarioUpdateData.inflationMean = parseFloat(String(body.inflationAssumption.mean || 0));
        scenarioUpdateData.inflationStd = parseFloat(String(body.inflationAssumption.stdev || 0));
        // Clear other inflation fields
        scenarioUpdateData.inflation = null;
        scenarioUpdateData.inflationMin = null;
        scenarioUpdateData.inflationMax = null;
      } else if (inflationType === 'uniform' || inflationType === 'random_uniform') {
        scenarioUpdateData.inflationMin = parseFloat(String(body.inflationAssumption.lower || 0));
        scenarioUpdateData.inflationMax = parseFloat(String(body.inflationAssumption.upper || 0));
        // Clear other inflation fields
        scenarioUpdateData.inflation = null;
        scenarioUpdateData.inflationMean = null;
        scenarioUpdateData.inflationStd = null;
      }

      // Update the scenario with the processed inflation data
      console.log("Updating scenario with processed inflation data:", {
        inflationAssumption: scenarioUpdateData.inflationAssumption,
        inflation: scenarioUpdateData.inflation,
        inflationMin: scenarioUpdateData.inflationMin,
        inflationMax: scenarioUpdateData.inflationMax,
        inflationMean: scenarioUpdateData.inflationMean,
        inflationStd: scenarioUpdateData.inflationStd
      });

      // Replace the body with the updated data for further processing
      body = scenarioUpdateData;
    }

    // If not a partial update, proceed with the full update
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
      })
      // Note: We deliberately don't delete asset types here to preserve them for other scenarios
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
        // Ensure inflation values are properly handled, including zeros
        inflation: processedInflation !== null ? parseFloat(String(processedInflation || 0)) : null,
        inflationMin: processedInflationMin !== null ? parseFloat(String(processedInflationMin || 0)) : null,
        inflationMax: processedInflationMax !== null ? parseFloat(String(processedInflationMax || 0)) : null,
        inflationMean: processedInflationMean !== null ? parseFloat(String(processedInflationMean || 0)) : null,
        inflationStd: processedInflationStd !== null ? parseFloat(String(processedInflationStd || 0)) : null,
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
            },
            startOnOtherSeries: true
          }
        }
      }
    });

    const transformedScenario = transformScenarioForFrontend(completeScenario);
    // console.log("Tranformed scenario", transformedScenario);

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
        fixedIncome: at.fixedIncome,
        normalIncomeMean: at.normalIncomeMean,
        normalIncomeStd: at.normalIncomeStd,
        taxable: at.taxability.toLowerCase() === 'taxable',
        returnAmtOrPct: at.returnAmtOrPct,
        incomeAmtOrPct: at.incomeAmtOrPct,
        expectedAnnualIncomeType: at.expectedAnnualIncomeType?.toLowerCase()
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
