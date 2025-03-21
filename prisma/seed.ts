import { PrismaClient, State, StartYearType, DistributionType, EventType, ReturnType, TaxStatus, Taxability } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed operation...');

  // Create test users
  const user1 = await prisma.user.create({
    data: {
      id: "sean.erfan@stonybrook.edu",
      googleId: "abc123" // Simulating Google OAuth ID
    }
  });

  const user2 = await prisma.user.create({
    data: {
      id: "riteshsunil.chavan@stonybrook.edu",
      googleId: "def456" // Simulating Google OAuth ID
    }
  });

  console.log(user1);

  // Create state tax brackets
  await prisma.stateBracket.create({
    data: {
      state: State.CA,
      bracket: 1,
      rate: 0.01,
      userId: user1.id,
    }
  });
  await prisma.stateBracket.create({
    data: {
      state: State.CA,
      bracket: 2,
      rate: 0.02,
      userId: user1.id,
    }
  });
  await prisma.stateBracket.create({
    data: {
      state: State.NY,
      bracket: 1,
      rate: 0.04,
      userId: user2.id,
    }
  });

  // Create asset types
  const stockAssetType = await prisma.assetType.create({
    data: {
      name: 'US Total Stock Market',
      description: 'Broad US Stock Market Index Fund',
      returnType: ReturnType.NORMAL,
      normalReturnMean: 0.07,
      normalReturnStd: 0.15,
      expectedAnnualIncomeType: ReturnType.FIXED,
      fixedIncome: 0.02,
      expenseRatio: 0.0003,
      taxability: Taxability.TAXABLE,
    }
  });

  const bondAssetType = await prisma.assetType.create({
    data: {
      name: 'US Total Bond Market',
      description: 'Broad US Bond Market Index Fund',
      returnType: ReturnType.NORMAL,
      normalReturnMean: 0.03,
      normalReturnStd: 0.05,
      expectedAnnualIncomeType: ReturnType.FIXED,
      fixedIncome: 0.025,
      expenseRatio: 0.0005,
      taxability: Taxability.TAXABLE,
    }
  });

  const muniAssetType = await prisma.assetType.create({
    data: {
      name: 'Municipal Bonds',
      description: 'Tax-Exempt Municipal Bonds',
      returnType: ReturnType.NORMAL,
      normalReturnMean: 0.02,
      normalReturnStd: 0.03,
      expectedAnnualIncomeType: ReturnType.FIXED,
      fixedIncome: 0.02,
      expenseRatio: 0.001,
      taxability: Taxability.TAX_EXEMPT,
    }
  });

  const internationalAssetType = await prisma.assetType.create({
    data: {
      name: 'International Stocks',
      description: 'International Stock Market Index',
      returnType: ReturnType.NORMAL,
      normalReturnMean: 0.06,
      normalReturnStd: 0.18,
      expectedAnnualIncomeType: ReturnType.NORMAL,
      normalIncomeMean: 0.025,
      normalIncomeStd: 0.01,
      expenseRatio: 0.0008,
      taxability: Taxability.TAXABLE,
    }
  });

  // Create investments
  const taxableInvestment = await prisma.investment.create({
    data: {
      assetTypeId: stockAssetType.id,
      value: 100000,
      taxStatus: TaxStatus.NON_RETIREMENT,
    }
  });

  const preTaxInvestment = await prisma.investment.create({
    data: {
      assetTypeId: bondAssetType.id,
      value: 200000,
      taxStatus: TaxStatus.PRE_TAX_RETIREMENT,
      rothConversionStrategy: 1,
    }
  });

  const rothInvestment = await prisma.investment.create({
    data: {
      assetTypeId: stockAssetType.id,
      value: 150000,
      taxStatus: TaxStatus.AFTER_TAX_RETIREMENT,
    }
  });

  const muniInvestment = await prisma.investment.create({
    data: {
      assetTypeId: muniAssetType.id,
      value: 75000,
      taxStatus: TaxStatus.NON_RETIREMENT,
    }
  });

  const internationalInvestment = await prisma.investment.create({
    data: {
      assetTypeId: internationalAssetType.id,
      value: 125000,
      taxStatus: TaxStatus.NON_RETIREMENT,
    }
  });

  // Create scenarios
  const singlePersonScenario = await prisma.scenario.create({
    data: {
      name: 'Early Retirement - Single',
      financialGoal: 2000000, // Target retirement amount
      forIndividual: true,
      userBirthYear: 1980,
      userLifeExpectancyMean: 85,
      userLifeExpectancyStd: 5.0,
      inflationAssumption: DistributionType.random_normal,
      inflationMean: 0.025,
      inflationStd: 0.005,
      ownerId: user1.id,
      initialAfterTaxRetirementContributionLimit: 6500, // 2023 IRA limit
      rothOptimizationStartYear: 2023,
      rothOptimizationEndYear: 2030,
      residenceState: State.CA,
      investmentScenario: {
        create: [
          { investmentId: taxableInvestment.id },
          { investmentId: preTaxInvestment.id },
          { investmentId: rothInvestment.id },
        ]
      }
    }
  });
  console.log(singlePersonScenario);

  const marriedCoupleScenario = await prisma.scenario.create({
    data: {
      name: 'Traditional Retirement - Married',
      financialGoal: 3000000,
      forIndividual: false,
      userBirthYear: 1975,
      userLifeExpectancyMean: 83,
      userLifeExpectancyStd: 4.0,
      spouseBirthYear: 1977,
      spouseLifeExpectancyMean: 86,
      spouseLifeExpectancyStd: 4.5,
      inflationAssumption: DistributionType.fixed,
      inflation: 2,
      ownerId: user2.id,
      readonlyPrivilege: {
        connect: [{ id: user1.id }]
      },
      initialAfterTaxRetirementContributionLimit: 6500,
      residenceState: State.NY,
      investmentScenario: {
        create: [
          { investmentId: taxableInvestment.id },
          { investmentId: preTaxInvestment.id },
          { investmentId: rothInvestment.id },
          { investmentId: muniInvestment.id },
          { investmentId: internationalInvestment.id },
        ]
      }
    }
  });

  // Create event series and details for the single person scenario
  const salaryEventSeries = await prisma.eventSeries.create({
    data: {
      name: 'Salary Income',
      description: 'Annual salary with raises',
      scenarioId: singlePersonScenario.id,
      startYearType: StartYearType.fixed,
      startYear: 2023,
      durationType: DistributionType.fixed,
      duration: 15, // Work for 15 more years
      type: EventType.income,
      incomeEventDetails: {
        create: {
          initialAmount: 120000,
          annualChangeType: DistributionType.fixed,
          annualChangePercentage: 0.03, // 3% annual raise
          inflationAdjustment: true,
          userPercentage: 100,
          isSocialSecurity: false,
        }
      }
    }
  });

  const socialSecuritySeries = await prisma.eventSeries.create({
    data: {
      name: 'Social Security',
      description: 'Social Security Benefits',
      scenarioId: singlePersonScenario.id,
      startYearType: StartYearType.fixed,
      startYear: 2045, // Age 65
      durationType: DistributionType.fixed,
      duration: 30, // Expected to receive until age 95
      type: EventType.income,
      incomeEventDetails: {
        create: {
          initialAmount: 36000, // Annual Social Security benefit
          annualChangeType: DistributionType.fixed,
          annualChangePercentage: 0.02, // COLA adjustment
          inflationAdjustment: true,
          userPercentage: 100,
          isSocialSecurity: true,
        }
      }
    }
  });

  const mortgageExpense = await prisma.eventSeries.create({
    data: {
      name: 'Mortgage',
      description: 'Home mortgage payment',
      scenarioId: singlePersonScenario.id,
      startYearType: StartYearType.fixed,
      startYear: 2023,
      durationType: DistributionType.fixed,
      duration: 20, // 20 year mortgage
      type: EventType.expense,
      expenseEventDetails: {
        create: {
          initialAmount: 24000, // $2000/month
          annualChangeType: DistributionType.fixed,
          annualChangeAmount: 0, // Fixed payment
          inflationAdjustment: false,
          userPercentage: 100,
          isDiscretionary: false,
        }
      }
    }
  });

  const livingExpenses = await prisma.eventSeries.create({
    data: {
      name: 'Living Expenses',
      description: 'General living expenses',
      scenarioId: singlePersonScenario.id,
      startYearType: StartYearType.fixed,
      startYear: 2023,
      durationType: DistributionType.fixed,
      duration: 50, // Rest of life
      type: EventType.expense,
      expenseEventDetails: {
        create: {
          initialAmount: 48000, // $4000/month
          annualChangeType: DistributionType.random_normal,
          annualChangeMean: 0.025, // Average 2.5% increase
          annualChangeStd: 0.005, // Some variance
          inflationAdjustment: true,
          userPercentage: 100,
          isDiscretionary: true,
          order: 1, // Priority for discretionary expenses
        }
      }
    }
  });

  const travelExpenses = await prisma.eventSeries.create({
    data: {
      name: 'Travel Expenses',
      description: 'Annual vacations',
      scenarioId: singlePersonScenario.id,
      startYearType: StartYearType.same_as,
      startOnOtherSeriesId: salaryEventSeries.id, // Starts with salary
      durationType: DistributionType.fixed,
      duration: 30, // Travel for 30 years after retirement
      type: EventType.expense,
      expenseEventDetails: {
        create: {
          initialAmount: 10000,
          annualChangeType: DistributionType.random_uniform,
          annualChangeMin: 0.01,
          annualChangeMax: 0.05,
          inflationAdjustment: true,
          userPercentage: 100,
          isDiscretionary: true,
          order: 2, // Lower priority than living expenses
        }
      }
    }
  });

  const investEvent = await prisma.eventSeries.create({
    data: {
      name: 'Main Investment Strategy',
      description: 'Core investment approach',
      scenarioId: singlePersonScenario.id,
      startYearType: StartYearType.fixed,
      startYear: 2023,
      durationType: DistributionType.fixed,
      duration: 40, // Investment horizon
      type: EventType.invest,
      investEventDetails: {
        create: {
          maxCash: 50000, // Emergency fund
          order: 1, // Priority for expense withdrawal
          initialAllocation: 0.7, // 70% stocks initially
          finalAllocation: 0.5, // Glide path to 50% stocks
          AssetAllocation: {
            create: {
              initialAllocation: 1.00, // Initial allocation for the investment
              investment: {
                connect: { id: taxableInvestment.id } // Connect to the existing investment
              }
            }
          }
        }
      }
    }
  });

  // Create the invest details explicitly to get its ID
  const investDetails = await prisma.investEventDetails.findUniqueOrThrow({
    where: { eventSeriesId: investEvent.id }
  });

  // Asset allocations for investment strategy
  const stockAllocation = await prisma.assetAllocation.create({
    data: {
      investmentId: taxableInvestment.id,
      investEventDetailsId: investDetails.id,
      initialAllocation: 0.6, // 60% of portfolio in taxable stocks
      finalAllocation: 0.4, // Reducing to 40% over time
    }
  });

  const bondAllocation = await prisma.assetAllocation.create({
    data: {
      investmentId: preTaxInvestment.id,
      investEventDetailsId: investDetails.id,
      initialAllocation: 0.3, // 30% in bonds
      finalAllocation: 0.45, // Increasing to 45% over time
    }
  });

  const internationalAllocation = await prisma.assetAllocation.create({
    data: {
      investmentId: internationalInvestment.id,
      investEventDetailsId: investDetails.id,
      initialAllocation: 0.1, // 10% international
      finalAllocation: 0.15, // Increasing to 15% over time
    }
  });

  // Rebalance strategy
  const rebalanceEvent = await prisma.eventSeries.create({
    data: {
      name: 'Annual Rebalancing',
      description: 'Rebalance portfolio annually',
      scenarioId: singlePersonScenario.id,
      startYearType: StartYearType.fixed,
      startYear: 2023,
      durationType: DistributionType.fixed,
      duration: 40, // Rebalance for 40 years
      type: EventType.rebalance,
      rebalanceEventDetails: {
        create: {}
      }
    }
  });

  // Create the rebalance details explicitly to get its ID
  const rebalanceDetails = await prisma.rebalanceEventDetails.findUniqueOrThrow({
    where: { eventSeriesId: rebalanceEvent.id }
  });

  // Asset allocations for rebalancing
  const rebalanceStockAllocation = await prisma.assetAllocation.create({
    data: {
      investmentId: taxableInvestment.id,
      rebalanceEventDetailsId: rebalanceDetails.id,
      initialAllocation: 0.6, // Target 60% stocks
    }
  });

  const rebalanceBondAllocation = await prisma.assetAllocation.create({
    data: {
      investmentId: preTaxInvestment.id,
      rebalanceEventDetailsId: rebalanceDetails.id,
      initialAllocation: 0.3, // Target 30% bonds
    }
  });

  const rebalanceInternationalAllocation = await prisma.assetAllocation.create({
    data: {
      investmentId: internationalInvestment.id,
      rebalanceEventDetailsId: rebalanceDetails.id,
      initialAllocation: 0.1, // Target 10% international
    }
  });

  // Create some event series for the married couple scenario
  const userSalary = await prisma.eventSeries.create({
    data: {
      name: 'Primary Earner Salary',
      description: 'Primary earner salary with raises',
      scenarioId: marriedCoupleScenario.id,
      startYearType: StartYearType.fixed,
      startYear: 2023,
      durationType: DistributionType.fixed,
      duration: 12, // Work for 12 more years
      type: EventType.income,
      incomeEventDetails: {
        create: {
          initialAmount: 150000,
          annualChangeType: DistributionType.fixed,
          annualChangePercentage: 0.035, // 3.5% annual raise
          inflationAdjustment: true,
          userPercentage: 100,
          spousePercentage: 0,
          isSocialSecurity: false,
        }
      }
    }
  });

  const spouseSalary = await prisma.eventSeries.create({
    data: {
      name: 'Spouse Salary',
      description: 'Spouse salary with raises',
      scenarioId: marriedCoupleScenario.id,
      startYearType: StartYearType.fixed,
      startYear: 2023,
      durationType: DistributionType.fixed,
      duration: 14, // Work for 14 more years
      type: EventType.income,
      incomeEventDetails: {
        create: {
          initialAmount: 90000,
          annualChangeType: DistributionType.fixed,
          annualChangePercentage: 0.03, // 3% annual raise
          inflationAdjustment: true,
          userPercentage: 0,
          spousePercentage: 100,
          isSocialSecurity: false,
        }
      }
    }
  });

  // Add RMDs for testing
  const rmds = await Promise.all([
    prisma.rMD.create({
      data: {
        year: 2023,
        age: 73,
        distributionPeriod: 26.5,
      }
    }),
    prisma.rMD.create({
      data: {
        year: 2023,
        age: 74,
        distributionPeriod: 25.5,
      }
    }),
    prisma.rMD.create({
      data: {
        year: 2023,
        age: 75,
        distributionPeriod: 24.6,
      }
    }),
    prisma.rMD.create({
      data: {
        year: 2024,
        age: 73,
        distributionPeriod: 26.5,
      }
    }),
    prisma.rMD.create({
      data: {
        year: 2024,
        age: 74,
        distributionPeriod: 25.5,
      }
    }),
  ]);

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });