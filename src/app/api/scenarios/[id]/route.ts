import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { DistributionType, EventType, StartYearType, State, TaxStatus, Investment, AssetType, ReturnType, Taxability } from '@prisma/client';
import { mapDistributionType, yesNoToBoolean } from '@/app/lib/utils';
import { createAssetTypes, createInvestments, createEventSeries, transformScenarioForFrontend } from '../route';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const body = await request.json();
        const { ownerId } = body;
        const { id } = await params;
        const scenarioId = parseInt(id);

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

        // Delete existing scenario relationships
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
            // Delete asset types
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
        let assetTypeMap = new Map<string, number>();
        if (assetTypes && assetTypes.length > 0) {
            const createdAssetTypes = await createAssetTypes(assetTypes);
            // Create a map of asset type names to IDs for reference
            assetTypeMap = new Map(createdAssetTypes.map((asset: AssetType) => [asset.name, asset.id]));
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

        // Add permissions to the response
        const responseData = {
            ...transformedScenario,
            permissions: {
                isOwner: completeScenario?.ownerId === ownerId,
                canWrite: completeScenario?.ownerId === ownerId ||
                    existingScenario.readwritePrivilege.some(user => user.id === ownerId),
                canRead: true, // If they can update, they can definitely read
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

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const scenarioId = parseInt(params.id);

        if (!scenarioId) {
            return NextResponse.json({ status: 400, error: 'Scenario ID is required' });
        }

        // Delete the scenario and all its related data
        await prisma.$transaction([
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
            prisma.eventSeries.deleteMany({
                where: {
                    scenarioId: scenarioId
                }
            }),
            prisma.investment.deleteMany({
                where: {
                    scenarioId: scenarioId
                }
            }),
            prisma.assetType.deleteMany({
                where: {
                    scenarioId: scenarioId
                }
            }),
            prisma.scenario.delete({
                where: {
                    id: scenarioId
                }
            })
        ]);

        return NextResponse.json({ status: 200, message: 'Scenario deleted successfully' });
    } catch (error) {
        console.error('Error deleting scenario:', error);
        return NextResponse.json({ status: 500, error: 'Failed to delete scenario' });
    }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const scenarioId = parseInt(params.id);

        if (!scenarioId) {
            return NextResponse.json({ status: 400, error: 'Scenario ID is required' });
        }

        const scenario = await prisma.scenario.findUnique({
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
                        }
                    }
                }
            }
        });

        if (!scenario) {
            return NextResponse.json({ status: 404, error: 'Scenario not found' });
        }

        return NextResponse.json({ status: 200, result: scenario });
    } catch (error) {
        console.error('Error fetching scenario:', error);
        return NextResponse.json({ status: 500, error: 'Failed to fetch scenario' });
    }
} 