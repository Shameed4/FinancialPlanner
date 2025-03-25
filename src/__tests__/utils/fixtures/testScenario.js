module.exports = {
    "name": "sean scenario",
    "forIndividual": true,
    "userBirthYear": 1990,
    "userLifeExpectancyMean": 2419,
    "userLifeExpectancyStd": 231,
    "spouseBirthYear": 0,
    "spouseLifeExpectancyMean": 0,
    "spouseLifeExpectancyStd": 0,
    "monthlyContribution": "",
    "assetTypes": [
        {
            "name": "abc",
            "description": "2310",
            "returnType": "fixed",
            "returnMean": 0,
            "returnStd": 0,
            "expenseRatio": 214,
            "incomeMean": 21,
            "incomeStd": 4,
            "taxable": true,
            "fixedReturn": "1231",
            "normalReturnMean": null,
            "normalReturnStd": null
        },
        {
            "name": "def",
            "description": "12312",
            "returnType": "fixed",
            "returnMean": 0,
            "returnStd": 0,
            "expenseRatio": 9219,
            "incomeMean": 210,
            "incomeStd": 1.99,
            "taxable": true,
            "fixedReturn": "23",
            "normalReturnMean": null,
            "normalReturnStd": null
        }
    ],
    "investments": [
        {
            "assetType": "abc",
            "value": 10000,
            "taxStatus": "pre-tax"
        },
        {
            "assetType": "def",
            "value": 2099.99,
            "taxStatus": "after-tax"
        }
    ],
    "eventSeries": [
        {
            "name": "College Education",
            "description": "my education",
            "startYearType": "fixed",
            "durationMean": 100,
            "durationStd": 2,
            "type": "expense",
            "startYear": 123,
            "durationType": "normal",
            "amount": 2000,
            "annualChange": 200,
            "isDiscretionary": true,
            "changeType": "percentage",
            "inflationAdjusted": true
        }
    ],
    "inflationAssumption": "fixed",
    "inflation": 40,
    "inflationMin": 0,
    "inflationMax": 0,
    "inflationMean": 0,
    "inflationStd": 0,
    "rothOptimizationStartYear": 2021,
    "rothOptimizationEndYear": 3030,
    "residenceState": "NY",
    "financialGoal": 10000,
    "initialAfterTaxRetirementContributionLimit": 20,
    "enableTaxOptimization": true
}; 