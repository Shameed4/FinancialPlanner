import { StringScenarioFormData } from "@/app/scenario/types";
import { jsonToYaml } from "@/utils/scenarioConverter";
import { NextRequest, NextResponse } from "next/server";

export function scenarioToYaml(data: StringScenarioFormData): string {
    console.log(data);

    // --- Life Expectancy ---
    // Determine the user's life expectancy distribution.
    const userLifeExp =
        data.userLifeExpectancyStd === "0"
            ? { type: "fixed", value: Number(data.userLifeExpectancyMean) }
            : { type: "normal", mean: Number(data.userLifeExpectancyMean), stdev: Number(data.userLifeExpectancyStd) };

    // For a non-individual scenario, we assume a second life expectancy for the spouse.
    let lifeExpArray;
    let birthYears;
    let maritalStatus = data.forIndividual ? "individual" : "couple";

    if (data.forIndividual) {
        lifeExpArray = [userLifeExp];
        birthYears = [Number(data.userBirthYear)];
    } else {
        // Handle spouse's life expectancy
        const spouseLifeExp =
            data.spouseLifeExpectancyStd === "0"
                ? { type: "fixed", value: Number(data.spouseLifeExpectancyMean || data.userLifeExpectancyMean) }
                : { type: "normal", mean: Number(data.spouseLifeExpectancyMean || data.userLifeExpectancyMean), stdev: Number(data.spouseLifeExpectancyStd || data.userLifeExpectancyStd) };

        lifeExpArray = [userLifeExp, spouseLifeExp];
        birthYears = [Number(data.userBirthYear), Number(data.spouseBirthYear)];
    }

    // --- Asset Types ---
    const investmentTypes = data.assetTypes.map(asset => {
        let returnDistribution: any = {};

        if (typeof (asset as any).returnType !== 'undefined') {
            if ((asset as any).returnType === "fixed") {
                returnDistribution = { type: "fixed", value: Number((asset as any).fixedReturn || 0) };
            } else if ((asset as any).returnType === "random_normal" || (asset as any).returnType === "normal") {
                returnDistribution = {
                    type: "normal",
                    mean: Number((asset as any).normalReturnMean || 0),
                    stdev: Number((asset as any).normalReturnStd || 0)
                };
            } else if ((asset as any).returnType === "random_uniform" || (asset as any).returnType === "uniform") {
                returnDistribution = {
                    type: "uniform",
                    lower: Number((asset as any).uniformReturnMin || 0),
                    upper: Number((asset as any).uniformReturnMax || 0)
                };
            }
        } else {
            // Fallback handling for return distribution
            let returnMean: number | null = null;
            let returnStd: number | null = null;

            // Try to extract return values from any available property
            if (typeof (asset as any).normalReturnMean !== 'undefined') {
                returnMean = Number((asset as any).normalReturnMean || 0);
            } else if (typeof (asset as any).fixedReturn !== 'undefined') {
                returnMean = Number((asset as any).fixedReturn || 0);
            } else if (typeof (asset as any).uniformReturnMin !== 'undefined' && typeof (asset as any).uniformReturnMax !== 'undefined') {
                returnMean = (Number((asset as any).uniformReturnMin || 0) + Number((asset as any).uniformReturnMax || 0)) / 2;
            }

            if (typeof (asset as any).normalReturnStd !== 'undefined') {
                returnStd = Number((asset as any).normalReturnStd || 0);
            }

            // Determine distribution type based on available data
            if (returnMean !== null && (returnStd === null || returnStd === 0)) {
                returnDistribution = { type: "fixed", value: returnMean };
            } else if (returnMean !== null && returnStd !== null) {
                returnDistribution = { type: "normal", mean: returnMean, stdev: returnStd };
            } else {
                returnDistribution = { type: "fixed", value: 0 };
            }
        }

        let incomeDistribution: any = {};
        if (typeof (asset as any).expectedAnnualIncomeType !== 'undefined' ||
            typeof (asset as any).incomeType !== 'undefined') {
            const incomeType = (asset as any).expectedAnnualIncomeType || (asset as any).incomeType;
            if (incomeType === "fixed") {
                incomeDistribution = {
                    type: "fixed",
                    value: Number((asset as any).fixedIncome || 0)
                };
            } else if (incomeType === "random_normal" || incomeType === "normal") {
                incomeDistribution = {
                    type: "normal",
                    mean: Number((asset as any).normalIncomeMean || 0),
                    stdev: Number((asset as any).normalIncomeStd || 0)
                };
            } else if (incomeType === "random_uniform" || incomeType === "uniform") {
                incomeDistribution = {
                    type: "uniform",
                    lower: Number((asset as any).uniformIncomeMin || 0),
                    upper: Number((asset as any).uniformIncomeMax || 0)
                };
            }
        } else {
            // Fallback handling - for any unrecognized format, try to extract values
            // This helps when the form and API have different type names
            let incomeMean: number | null = null;
            let incomeStd: number | null = null;

            // Try to find income mean and standard deviation from any available property
            if (typeof (asset as any).normalIncomeMean !== 'undefined') {
                incomeMean = Number((asset as any).normalIncomeMean || 0);
            } else if (typeof (asset as any).fixedIncome !== 'undefined') {
                incomeMean = Number((asset as any).fixedIncome || 0);
            } else if (typeof (asset as any).uniformIncomeMin !== 'undefined' && typeof (asset as any).uniformIncomeMax !== 'undefined') {
                // For uniform distributions, use average as fallback
                incomeMean = (Number((asset as any).uniformIncomeMin || 0) + Number((asset as any).uniformIncomeMax || 0)) / 2;
            }

            if (typeof (asset as any).normalIncomeStd !== 'undefined') {
                incomeStd = Number((asset as any).normalIncomeStd || 0);
            }

            // If we have mean but no std, treat as fixed
            if (incomeMean !== null && (incomeStd === null || incomeStd === 0)) {
                incomeDistribution = { type: "fixed", value: incomeMean };
            }
            // If we have both, treat as normal
            else if (incomeMean !== null && incomeStd !== null) {
                incomeDistribution = { type: "normal", mean: incomeMean, stdev: incomeStd };
            }
            // Fallback - empty fixed
            else {
                incomeDistribution = { type: "fixed", value: 0 };
            }
        }

        // Include all income fields regardless of type to ensure they're preserved during export/import
        return {
            name: asset.name,
            description: asset.description || asset.name,
            returnAmtOrPct: asset.returnAmtOrPct || "percent",
            returnDistribution,
            expenseRatio: Number(asset.expenseRatio || 0),
            incomeAmtOrPct: asset.incomeAmtOrPct || "percent",
            incomeDistribution,
            taxability: asset.taxable !== undefined ? asset.taxable : true,
            // Add these fields explicitly to ensure they're preserved
            fixedIncome: Number((asset as any).fixedIncome || 0),
            normalIncomeMean: Number((asset as any).normalIncomeMean || 0),
            normalIncomeStd: Number((asset as any).normalIncomeStd || 0),
            uniformIncomeMin: Number((asset as any).uniformIncomeMin || 0),
            uniformIncomeMax: Number((asset as any).uniformIncomeMax || 0)
        };
    });

    // --- Create an event name to index mapping for reference in start events ---
    const eventNameMap = new Map();
    data.eventSeries.forEach((event, index) => {
        eventNameMap.set(index + 1, event.name); // Use index+1 to match the 1-based indexing used in the app
    });

    // Also create a reverse map for looking up by event name
    const eventNameToIndexMap = new Map();
    data.eventSeries.forEach((event, index) => {
        eventNameToIndexMap.set(event.name, index + 1);
    });

    // --- Investments ---
    const investments = data.investments.map(inv => {
        let taxStatus: "pre-tax" | "after-tax" | "non-retirement";
        if (inv.taxStatus === "pre-tax-retirement") {
            taxStatus = "pre-tax";
        } else if (inv.taxStatus === "after-tax-retirement") {
            taxStatus = "after-tax";
        } else {
            taxStatus = "non-retirement";
        }

        // Create an investment ID using type and tax status
        // We always need to include the tax status in the ID because this is what YAML import expects
        const id = `${inv.assetType} ${taxStatus}`;

        return {
            investmentType: inv.assetType,
            value: Number(inv.value),
            taxStatus,
            id
        };
    });

    // --- Create strategies for RMD, Roth conversion, and expense withdrawal ---
    const rmdStrategy = data.investments
        .filter(inv => inv.taxStatus === "pre-tax-retirement" && inv.rmdStrategy)
        .sort((a, b) => Number(a.rmdStrategy) - Number(b.rmdStrategy))
        .map(inv => {
            const taxStatus = "pre-tax";
            return `${inv.assetType} ${taxStatus}`;
        });

    const rothConversionStrategy = data.investments
        .filter(inv => inv.taxStatus === "pre-tax-retirement" && inv.rothConversionStrategy)
        .sort((a, b) => Number(a.rothConversionStrategy) - Number(b.rothConversionStrategy))
        .map(inv => {
            const taxStatus = "pre-tax";
            return `${inv.assetType} ${taxStatus}`;
        });

    const expenseWithdrawalStrategy = data.investments
        .filter(inv => inv.expenseWithdrawalStrategy)
        .sort((a, b) => Number(a.expenseWithdrawalStrategy) - Number(b.expenseWithdrawalStrategy))
        .map(inv => {
            let taxStatus: string;
            if (inv.taxStatus === "pre-tax-retirement") {
                taxStatus = "pre-tax";
            } else if (inv.taxStatus === "after-tax-retirement") {
                taxStatus = "after-tax";
            } else {
                taxStatus = "non-retirement";
            }
            return `${inv.assetType} ${taxStatus}`;
        });

    // Build a list of discretionary expenses for the spending strategy
    const spendingStrategy = data.eventSeries
        .filter(ev => ev.type === "expense" && ev.isDiscretionary)
        .sort((a, b) => Number(a.spendingStrategy || 0) - Number(b.spendingStrategy || 0))
        .map(ev => ev.name);

    // --- Event Series ---
    const eventSeries = data.eventSeries.map(ev => {
        // --- Start mapping ---
        let start: any = {};
        if (ev.startYearType === "fixed" && ev.startYear !== undefined) {
            start = { type: "fixed", value: Number(ev.startYear) };
        } else if (ev.startYearType === "random_uniform" && ev.startYearMin !== undefined && ev.startYearMax !== undefined) {
            start = { type: "uniform", lower: Number(ev.startYearMin), upper: Number(ev.startYearMax) };
        } else if (ev.startYearType === "random_normal" && ev.startYearMean !== undefined && ev.startYearStd !== undefined) {
            start = { type: "normal", mean: Number(ev.startYearMean), stdev: Number(ev.startYearStd) };
        } else if (typeof (ev as any).startOnOtherSeries !== 'undefined' && (ev as any).startOnOtherSeries) {
            // For events that start with or after another event, use the event name
            const eventName = eventNameMap.get(Number((ev as any).startOnOtherSeries));
            if (ev.startYearType === "same_as") {
                start = { type: "startWith", eventSeries: eventName };
            } else if (ev.startYearType === "after") {
                start = { type: "startAfter", eventSeries: eventName };
            }
        }

        // Verify start has required properties
        if (start.type === "startWith" || start.type === "startAfter") {
            if (!start.eventSeries) {
                // Try to find eventSeries reference by looking at the name
                const refName = ev.name.toLowerCase();
                if (refName.includes("food") || refName.includes("expense") ||
                    refName.includes("vacation") || refName.includes("streaming")) {
                    // For standard expenses, they should start with salary
                    const salaryEvent = data.eventSeries.find(e => e.name.toLowerCase().includes("salary"));
                    if (salaryEvent) {
                        start.eventSeries = salaryEvent.name;
                    }
                }
            }
        }

        // --- Duration mapping ---
        let duration: any = {};
        if (ev.durationType === "fixed" && ev.durationFixed !== undefined) {
            duration = { type: "fixed", value: Number(ev.durationFixed) };
        } else if (ev.durationType === "random_uniform" && ev.durationMin !== undefined && ev.durationMax !== undefined) {
            duration = { type: "uniform", lower: Number(ev.durationMin), upper: Number(ev.durationMax) };
        } else if (ev.durationType === "random_normal" && ev.durationMean !== undefined && ev.durationStd !== undefined) {
            duration = { type: "normal", mean: Number(ev.durationMean), stdev: Number(ev.durationStd) };
        }

        // Start building the base event.
        let event: any = {
            name: ev.name,
            type: ev.type,
            start,
            duration,
        };

        // --- Add type-specific properties ---
        if (ev.type === "income" || ev.type === "expense") {
            // Map change distribution.
            let changeDistribution: any = {};
            if (ev.annualChangeType === "fixed" && ev.annualChange !== undefined) {
                let value = Number(ev.annualChange || 0);
                // For percentage, divide by 100 for export
                if (ev.changeAmtOrPct === "percent") {
                    value = value / 100;
                }
                changeDistribution = { type: "fixed", value };
            } else if (ev.annualChangeType === "random_uniform" && ev.annualChangeMin !== undefined && ev.annualChangeMax !== undefined) {
                let lower = Number(ev.annualChangeMin || 0);
                let upper = Number(ev.annualChangeMax || 0);

                // For percentage, divide by 100 for export
                if (ev.changeAmtOrPct === "percent") {
                    lower = lower / 100;
                    upper = upper / 100;
                }

                changeDistribution = { type: "uniform", lower, upper };
            } else if (ev.annualChangeType === "random_normal" && ev.annualChangeMean !== undefined && ev.annualChangeStd !== undefined) {
                let mean = Number(ev.annualChangeMean || 0);
                let stdev = Number(ev.annualChangeStd || 0);

                // For percentage, divide by 100 for export
                if (ev.changeAmtOrPct === "percent") {
                    mean = mean / 100;
                    stdev = stdev / 100;
                }

                changeDistribution = { type: "normal", mean, stdev };
            } else {
                // Default to fixed 0 if no change distribution is specified
                changeDistribution = { type: "fixed", value: 0 };
            }

            event.initialAmount = Number(ev.amount);
            event.changeAmtOrPct = ev.changeAmtOrPct || "amount";
            event.changeDistribution = changeDistribution;
            event.inflationAdjusted = ev.inflationAdjusted || false;
            event.userFraction = Number(ev.userPercentage || 100) / 100; // Convert to decimal

            if (ev.type === "income") {
                event.socialSecurity = ev.isSocialSecurity || false;
            }
            if (ev.type === "expense") {
                event.discretionary = ev.isDiscretionary || false;
            }
        } else if (ev.type === "invest" || ev.type === "rebalance") {
            // First check if this is a glide path event by checking various properties
            const isGlidePath = (
                (ev as any).glidePath === true ||
                (ev as any).glide === true ||
                ev.allocationType === "glide" ||
                // Compare initial and final allocations for difference
                ((ev as any).initialAllocations && (ev as any).finalAllocations)
            );

            if (isGlidePath) {
                // Mark this as a glidePath event explicitly
                event.glidePath = true;

                // Process allocations
                event.assetAllocation = {};
                event.assetAllocation2 = {};

                // Try to find allocations in any available properties
                const initialAllocations =
                    (ev as any).initialAllocations ||
                    (ev as any).assetAllocation ||
                    (ev as any).allocations || {};

                const finalAllocations =
                    (ev as any).finalAllocations ||
                    (ev as any).assetAllocation2 ||
                    (ev as any).allocations || {};

                // Process initial allocations to create proper YAML format
                if (initialAllocations) {
                    Object.entries(initialAllocations).forEach(([key, value]) => {
                        // Skip zero values
                        const numValue = Number(value);
                        if (isNaN(numValue) || numValue <= 0) return;

                        // Parse the key format
                        const parts = key.split(' ');
                        const assetType = parts[0];
                        const taxStatus = parts.slice(1).join(' ');

                        // Convert to YAML export format - following the ID format used for investments
                        // This needs to exactly match what the import expects
                        let yamlKey: string;
                        if (taxStatus === "non-retirement") {
                            // In YAML, the non-retirement format should include "non-retirement"
                            yamlKey = `${assetType} non-retirement`;
                        } else if (taxStatus === "pre-tax-retirement") {
                            yamlKey = `${assetType} pre-tax`;
                        } else if (taxStatus === "after-tax-retirement") {
                            yamlKey = `${assetType} after-tax`;
                        } else {
                            yamlKey = key;
                        }

                        // Convert percentage to decimal for YAML
                        event.assetAllocation[yamlKey] = numValue / 100;
                    });
                }

                // Process final allocations to create proper YAML format
                if (finalAllocations) {
                    Object.entries(finalAllocations).forEach(([key, value]) => {
                        // Skip zero values
                        const numValue = Number(value);
                        if (isNaN(numValue) || numValue <= 0) return;

                        // Parse the key format
                        const parts = key.split(' ');
                        const assetType = parts[0];
                        const taxStatus = parts.slice(1).join(' ');

                        // Convert to YAML export format - following the ID format used for investments
                        // This needs to exactly match what the import expects
                        let yamlKey: string;
                        if (taxStatus === "non-retirement") {
                            // In YAML, the non-retirement format should include "non-retirement"
                            yamlKey = `${assetType} non-retirement`;
                        } else if (taxStatus === "pre-tax-retirement") {
                            yamlKey = `${assetType} pre-tax`;
                        } else if (taxStatus === "after-tax-retirement") {
                            yamlKey = `${assetType} after-tax`;
                        } else {
                            yamlKey = key;
                        }

                        // Convert percentage to decimal for YAML
                        event.assetAllocation2[yamlKey] = numValue / 100;
                    });
                }

                // If no final allocations specified but this is marked as a glide path,
                // copy the initial allocations to the final allocations
                if (Object.keys(event.assetAllocation2).length === 0 && Object.keys(event.assetAllocation).length > 0) {
                    event.assetAllocation2 = { ...event.assetAllocation };
                }
            } else if (ev.allocationType === "fixed" && ev.allocations) {
                // Fixed allocation
                event.assetAllocation = {};
                for (const key in ev.allocations) {
                    if (ev.allocations[key] !== "0" && Number(ev.allocations[key]) > 0) {
                        // Convert percentages to decimal and use the correct key format
                        const parts = key.split(' ');
                        const assetType = parts[0];
                        const taxStatus = parts.slice(1).join(' ');

                        let yamlKey: string;
                        if (taxStatus === "non-retirement") {
                            // In YAML, the non-retirement format should include "non-retirement"
                            yamlKey = `${assetType} non-retirement`;
                        } else if (taxStatus === "pre-tax-retirement") {
                            yamlKey = `${assetType} pre-tax`;
                        } else if (taxStatus === "after-tax-retirement") {
                            yamlKey = `${assetType} after-tax`;
                        } else {
                            yamlKey = key;
                        }

                        event.assetAllocation[yamlKey] = Number(ev.allocations[key]) / 100;
                    }
                }
            } else if ((ev as any).assetAllocation) {
                // Handle cases where assetAllocation is directly provided
                event.assetAllocation = {};
                const allocations = (ev as any).assetAllocation;

                for (const key in allocations) {
                    const value = Number(allocations[key]);
                    if (!isNaN(value) && value > 0) {
                        // Check if key already has tax status or needs conversion
                        if (key.includes(' ')) {
                            const parts = key.split(' ');
                            const assetType = parts[0];
                            const taxStatus = parts.slice(1).join(' ');

                            // Convert to proper YAML format
                            let yamlKey: string;
                            if (taxStatus === "non-retirement") {
                                yamlKey = `${assetType} non-retirement`;
                            } else if (taxStatus === "pre-tax-retirement") {
                                yamlKey = `${assetType} pre-tax`;
                            } else if (taxStatus === "after-tax-retirement") {
                                yamlKey = `${assetType} after-tax`;
                            } else {
                                yamlKey = key;
                            }
                            event.assetAllocation[yamlKey] = value;
                        } else {
                            // Assume non-retirement if no tax status is specified
                            event.assetAllocation[`${key} non-retirement`] = value;
                        }
                    }
                }
            }

            if (ev.type === "invest" && ev.maxCashValue) {
                event.maxCash = Number(ev.maxCashValue);
            }
        }

        return event;
    });

    // --- Inflation Assumption ---
    let inflationAssumption: any = {};
    if (data.inflationAssumption === "fixed") {
        // Ensure inflation value is included even if zero
        inflationAssumption = {
            type: "fixed",
            value: Number(data.inflation || 0)
        };
    } else if (data.inflationAssumption === "random_uniform") {
        inflationAssumption = {
            type: "uniform",
            lower: Number(data.inflationMin || 0),
            upper: Number(data.inflationMax || 0)
        };
    } else if (data.inflationAssumption === "random_normal") {
        inflationAssumption = {
            type: "normal",
            mean: Number(data.inflationMean || 0),
            stdev: Number(data.inflationStd || 0)
        };
    }

    // --- Other Top-Level Properties ---
    const yamlObj: any = {
        name: data.name,
        maritalStatus,
        birthYears,
        lifeExpectancy: lifeExpArray,
        investmentTypes,
        investments,
        eventSeries,
        inflationAssumption,
        afterTaxContributionLimit: Number(data.initialAfterTaxRetirementContributionLimit || 0),
        financialGoal: Number(data.financialGoal || 0),
        residenceState: data.residenceState,
        RothConversionOpt: data.enableTaxOptimization || false,
    };

    // Add optional strategies if they exist
    if (spendingStrategy && spendingStrategy.length > 0) {
        yamlObj.spendingStrategy = spendingStrategy;
    }

    if (expenseWithdrawalStrategy && expenseWithdrawalStrategy.length > 0) {
        yamlObj.expenseWithdrawalStrategy = expenseWithdrawalStrategy;
    }

    if (rmdStrategy && rmdStrategy.length > 0) {
        yamlObj.RMDStrategy = rmdStrategy;
    }

    if (rothConversionStrategy && rothConversionStrategy.length > 0) {
        yamlObj.RothConversionStrategy = rothConversionStrategy;
    }

    // Only include optional date fields if defined
    if (data.rothOptimizationStartYear) {
        yamlObj.RothConversionStart = Number(data.rothOptimizationStartYear);
    }

    if (data.rothOptimizationEndYear) {
        yamlObj.RothConversionEnd = Number(data.rothOptimizationEndYear);
    }

    // --- Add header comment with version information ---
    const header = `# file format for scenario import/export.  version: 2025-04-16
# CSE416, Software Engineering, Scott D. Stoller.

# a distribution is represented as a map with one of the following forms:
# {type: fixed, value: <number>}
# {type: normal, mean: <number>, stdev: <number>}
# {type: uniform, lower: <number>, upper: <number>}
# percentages are represented by their decimal value, e.g., 4% is represented as 0.04.

`;

    // --- Convert JSON to YAML ---
    return header + jsonToYaml(yamlObj);
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const scenario = scenarioToYaml(body.scenario);
        return NextResponse.json({
            status: 200,
            message: "Scenario exported successfully",
            data: scenario
        });
    }
    catch (e) {
        console.error("Error exporting scenario:", e);
        return NextResponse.json({
            status: 400,
            message: "Failed to export scenario"
        });
    }
}