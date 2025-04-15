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
    // (If available, you might want to add a dedicated field for spouse's mean; here we assume it matches the user’s mean if not provided.)
    let lifeExpArray;
    let birthYears;
    if (data.forIndividual) {
        lifeExpArray = [userLifeExp];
        birthYears = [Number(data.userBirthYear)];
    } else {
        // In a more complete design you might include a separate field for the spouse’s life expectancy mean.
        const spouseLifeExp =
            data.spouseLifeExpectancyStd === "0"
                ? { type: "fixed", value: Number(data.userLifeExpectancyMean) }
                : { type: "normal", mean: Number(data.userLifeExpectancyMean), stdev: Number(data.spouseLifeExpectancyStd) };

        lifeExpArray = [userLifeExp, spouseLifeExp];
        birthYears = [Number(data.userBirthYear), Number(data.spouseBirthYear)];
    }

    // --- Asset Types ---
    const investmentTypes = data.assetTypes.map(asset => {
        let returnDistribution: any = {};
        if (asset.returnType === "fixed") {
            returnDistribution = { type: "fixed", value: Number(asset.fixedReturn) };
        } else if (asset.returnType === "normal") {
            returnDistribution = { type: "normal", mean: Number(asset.normalReturnMean), stdev: Number(asset.normalReturnStd) };
        }

        let incomeDistribution: any = {};
        // Here we distinguish fixed versus normal income using the standard deviation:
        if (asset.normalIncomeStd === "0") {
            incomeDistribution = { type: "fixed", value: Number(asset.normalIncomeMean) };
        } else {
            incomeDistribution = { type: "normal", mean: Number(asset.normalIncomeMean), stdev: Number(asset.normalIncomeStd) };
        }

        return {
            name: asset.name,
            description: asset.description,
            returnDistribution,
            expenseRatio: Number(asset.expenseRatio),
            incomeDistribution,
            taxability: asset.taxable,
            returnAmtOrPct: asset.returnAmtOrPct,
            incomeAmtOrPct: asset.incomeAmtOrPct,
        };
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
        return {
            investmentType: inv.assetType,
            value: Number(inv.value),
            taxStatus,
        };
    });

    // --- Event Series ---
    const eventSeries = data.eventSeries.map(ev => {
        // --- Start mapping ---
        let start: any = {};
        if (ev.startYear !== undefined) {
            start = { type: "fixed", value: Number(ev.startYear) };
        } else if (ev.startYearMin !== undefined && ev.startYearMax !== undefined) {
            start = { type: "uniform", lower: Number(ev.startYearMin), upper: Number(ev.startYearMax) };
        } else if (ev.startYearMean !== undefined && ev.startYearStd !== undefined) {
            start = { type: "normal", mean: Number(ev.startYearMean), stdev: Number(ev.startYearStd) };
        } else if (ev.startYearEvent !== undefined) {
            // For events that start with or after another event, we recover the appropriate type.
            if (ev.startYearType === "withEvent") {
                start = { type: "startWith", eventSeries: Number(ev.startYearEvent) };
            } else if (ev.startYearType === "afterEvent") {
                start = { type: "startAfter", eventSeries: Number(ev.startYearEvent) };
            }
        }

        // --- Duration mapping ---
        let duration: any = {};
        if (ev.durationFixed !== undefined) {
            duration = { type: "fixed", value: Number(ev.durationFixed) };
        } else if (ev.durationMin !== undefined && ev.durationMax !== undefined) {
            duration = { type: "uniform", lower: Number(ev.durationMin), upper: Number(ev.durationMax) };
        } else if (ev.durationMean !== undefined && ev.durationStd !== undefined) {
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
            if (ev.annualChange !== undefined) {
                changeDistribution = { type: "fixed", value: Number(ev.annualChange) };
            } else if (ev.annualChangeMin !== undefined && ev.annualChangeMax !== undefined) {
                changeDistribution = { type: "uniform", lower: Number(ev.annualChangeMin), upper: Number(ev.annualChangeMax) };
            } else if (ev.annualChangeMean !== undefined && ev.annualChangeStd !== undefined) {
                changeDistribution = { type: "normal", mean: Number(ev.annualChangeMean), stdev: Number(ev.annualChangeStd) };
            }

            event.initialAmount = Number(ev.amount);
            event.changeAmtOrPct = ev.changeAmtOrPct;
            event.changeDistribution = changeDistribution;
            event.inflationAdjusted = ev.inflationAdjusted;
            event.userFraction = Number(ev.userPercentage) / 100;
            if (ev.type === "income") {
                event.socialSecurity = ev.isSocialSecurity;
            }
            if (ev.type === "expense") {
                event.discretionary = ev.isDiscretionary;
            }
        } else if (ev.type === "invest" || ev.type === "rebalance") {
            // Reconstruct asset allocation.
            event.assetAllocation = {};
            if (ev.allocations) {
                for (const key in ev.allocations) {
                    event.assetAllocation[key] = Number(ev.allocations[key]);
                }
            }
            // For glide path events, include the alternative allocation if provided.
            if (ev.allocationType === "glide") {
                event.glidePath = true;
                if (ev.initialAllocations) {
                    event.assetAllocation = {};
                    for (const key in ev.initialAllocations) {
                        event.assetAllocation[key] = Number(ev.initialAllocations[key]);
                    }
                }
                if (ev.finalAllocations) {
                    event.assetAllocation2 = {};
                    for (const key in ev.finalAllocations) {
                        event.assetAllocation2[key] = Number(ev.finalAllocations[key]);
                    }
                }
            }
            if (ev.type === "invest") {
                event.maxCash = Number(ev.maxCashValue);
            }
        }
        return event;
    });

    // --- Other Top-Level Properties ---
    const yamlObj: any = {
        name: data.name,
        lifeExpectancy: lifeExpArray,
        residenceState: data.residenceState,
        birthYears: birthYears,
        financialGoal: Number(data.financialGoal),
        afterTaxContributionLimit: Number(data.initialAfterTaxRetirementContributionLimit),
        inflationAssumption: { type: data.inflationAssumption },
        investmentTypes,
        investments,
        eventSeries,
        RothConversionOpt: data.enableTaxOptimization,
        // Only include these if defined:
        ...(data.rothOptimizationStartYear ? { RothConversionStart: Number(data.rothOptimizationStartYear) } : {}),
        ...(data.rothOptimizationEndYear ? { RothConversionEnd: Number(data.rothOptimizationEndYear) } : {}),
    };

    // --- Convert JSON to YAML ---
    // Here we assume a `jsonToYaml` helper exists which converts a JSON object to a YAML string.
    return jsonToYaml(yamlObj);
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const scenario = scenarioToYaml(body.scenario);
        return NextResponse.json({
            status: 200,
            message: "Scenario imported and saved successfully",
            data: scenario
        });
    }
    catch (e) {
        return NextResponse.json({
            status: 400,
            message: "Failed to convert scenario"
        });
    }
}