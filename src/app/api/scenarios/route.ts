import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const ownerId = searchParams.get('ownerId');
  const id = searchParams.get('id');

  // cannot have both email and scenario id
  if (ownerId && id) {
    return NextResponse.json({ status: 400, error: 'Provide either an ownerId or an ID, not both.' });
  }

  if (ownerId) {
    const results = await prisma.scenario.findFirst({
      where: {
        ownerId: ownerId
      }
    });
    if (results)
      return NextResponse.json({ status: 200, result: results });
    else
      return NextResponse.json({ status: 404, error: 'No scenarios found for the provided ownerId.' });
  }

  if (id) {
    const parsedId = parseInt(id, 10);
    if (isNaN(parsedId)) {
      return NextResponse.json({ status: 400, error: 'Invalid ID. ID must be an integer.' });
    }
    const results = await prisma.scenario.findMany({
      where: {
        id: parsedId
      }
    });
    return NextResponse.json({ status: 200, result: results });
  }

  return NextResponse.json({ status: 400, error: 'Invalid request - must have an ownerId or integer id.' });
}

// add a scenario to database
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Extract required fields from the request body
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
      ownerId,
      initialAfterTaxRetirementContributionLimit,
      rothOptimizationStartYear,
      rothOptimizationEndYear,
      residenceState
    } = body;

    // Create the scenario in the database
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
        inflationAssumption,
        inflation,
        inflationMin,
        inflationMax,
        inflationMean,
        inflationStd,
        ownerId,
        initialAfterTaxRetirementContributionLimit,
        rothOptimizationStartYear,
        rothOptimizationEndYear,
        residenceState
      }
    });

    return NextResponse.json({ status: 201, result: scenario });
  } catch (error) {
    console.error('Error creating scenario:', error);
    return NextResponse.json({ status: 500, error: 'Failed to create scenario' });
  }
}