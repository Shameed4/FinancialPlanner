// Implemented with the help of Cursor AI
const yaml = require('js-yaml');

function jsonToYaml(json) {
    return yaml.dump(json, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
        sortKeys: false,
        forceQuotes: false,
        quotingType: '"',
        flowLevel: -1,
        noCompatMode: true
    });
}

function yamlToJson(yamlStr) {
    return yaml.load(yamlStr, {
        json: true,
        schema: yaml.DEFAULT_SCHEMA
    });
}

function reorderProperties(obj, order) {
    const reordered = {};
    order.forEach(key => {
        if (obj.hasOwnProperty(key)) {
            reordered[key] = obj[key];
        }
    });
    return reordered;
}

function validateScenario(scenario) {
    const requiredFields = [
        'name',
        'forIndividual',
        'userBirthYear',
        'userLifeExpectancyMean',
        'userLifeExpectancyStd',
        'assetTypes',
        'investments',
        'eventSeries',
        'inflationAssumption',
        'residenceState',
        'financialGoal',
        'initialAfterTaxRetirementContributionLimit'
    ];

    for (const field of requiredFields) {
        if (!(field in scenario)) {
            throw new Error(`Missing required field: ${field}`);
        }
    }

    if (!Array.isArray(scenario.assetTypes)) {
        throw new Error('assetTypes must be an array');
    }

    if (!Array.isArray(scenario.investments)) {
        throw new Error('investments must be an array');
    }

    if (!Array.isArray(scenario.eventSeries)) {
        throw new Error('eventSeries must be an array');
    }

    const validInflationAssumptions = ['fixed', 'random_uniform', 'random_normal'];
    if (!validInflationAssumptions.includes(scenario.inflationAssumption)) {
        throw new Error(`Invalid inflation assumption: ${scenario.inflationAssumption}`);
    }

    const validStates = [
        'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
        'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
        'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
        'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
        'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
    ];
    if (!validStates.includes(scenario.residenceState)) {
        throw new Error(`Invalid US state: ${scenario.residenceState}`);
    }

    return true;
}

module.exports = {
    jsonToYaml,
    yamlToJson,
    validateScenario,
    reorderProperties
}; 