import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { jsonToYaml, yamlToJson, validateScenario } from '@/utils/scenarioConverter';

// Helper function to fetch a scenario with all related data
async function fetchScenarioWithRelations(id: number, userEmail: string) {
  // First get the user by email
  const user = await prisma.user.findFirst({
    where: { googleId: userEmail }
  });

  if (!user) {
    return null;
  }

  const scenario = await prisma.scenario.findUnique({
    where: { id },
    include: {
      investmentScenario: {
        include: {
          investment: {
            include: {
              assetType: true,
            },
          },
        },
      },
      eventSeries: {
        include: {
          incomeEventDetails: true,
          expenseEventDetails: true,
          investEventDetails: {
            include: {
              AssetAllocation: true,
            },
          },
          rebalanceEventDetails: {
            include: {
              AssetAllocation: true,
            },
          },
        },
      },
      ownerPrivilege: true,
      readonlyPrivilege: true,
      readwritePrivilege: true,
    },
  });

  if (!scenario) {
    return null;
  }

  // Check if user has access to this scenario
  const isOwner = scenario.ownerId === user.id;
  const canRead = scenario.readonlyPrivilege.some(u => u.id === user.id);
  const canWrite = scenario.readwritePrivilege.some(u => u.id === user.id);

  if (!isOwner && !canRead && !canWrite) {
    return null;
  }

  // Add permissions info to the scenario
  const scenarioWithPermissions = {
    ...scenario,
    permissions: {
      isOwner,
      canRead: canRead || isOwner, // Owners can also read
      canWrite: canWrite || isOwner, // Owners can also write
    }
  };

  return scenarioWithPermissions;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const userEmail = searchParams.get('userEmail');

    if (!id || !userEmail) {
      return NextResponse.json({
        status: 400,
        error: 'Missing required parameters',
      });
    }

    const scenario = await fetchScenarioWithRelations(parseInt(id), userEmail);

    if (!scenario) {
      return NextResponse.json({
        status: 404,
        error: 'Scenario not found or you do not have access',
      });
    }

    // Convert scenario to YAML
    const yamlContent = jsonToYaml(scenario);

    // Return YAML content
    return new NextResponse(yamlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/yaml',
        'Content-Disposition': `attachment; filename="${scenario.name}-scenario.yaml"`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting scenario as YAML:', error);
    return NextResponse.json({
      status: 500,
      error: 'Failed to export scenario: ' + (error.message || 'Unknown error'),
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    // The request body should be YAML content
    const yamlContent = await request.text();

    // Parse YAML to JSON
    const scenarioData = yamlToJson(yamlContent);

    // Validate the scenario data
    validateScenario(scenarioData);

    // Extract user email from query parameters
    const searchParams = request.nextUrl.searchParams;
    const userEmail = searchParams.get('userEmail');

    if (!userEmail) {
      return NextResponse.json({
        status: 400,
        error: 'Missing user email',
      });
    }

    // Add user email to scenario data
    const scenarioWithOwner = {
      ...scenarioData,
      userEmail,
    };

    // Call the standard scenarios API to create the scenario
    const response = await fetch(`${request.url.split('/yaml')[0]}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(scenarioWithOwner),
    });

    const result = await response.json();

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error importing scenario from YAML:', error);
    return NextResponse.json({
      status: 500,
      error: `Failed to import scenario: ${error.message || 'Unknown error'}`,
    });
  }
} 