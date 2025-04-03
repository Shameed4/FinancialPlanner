'use client';

import { useSession } from 'next-auth/react';
import { useState } from 'react';
import ShareScenarioModal from './ShareScenarioModal.js'

const ScenarioCard = ({ scenario, onEdit }) => {
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const { data: session } = useSession();
    const userEmail = session?.user?.email || "john.doe@email.com";

    // Helper function to format investment data
    const formatInvestments = () => {
        if (!scenario.investmentScenario) return [];
        return scenario.investmentScenario.map(is => is.investment);
    };

    // Helper function to get asset types from investments
    const getAssetTypes = () => {
        // First check if scenario has an assetTypes array directly
        if (scenario.assetTypes && Array.isArray(scenario.assetTypes) && scenario.assetTypes.length > 0) {
            return scenario.assetTypes;
        }

        // Fall back to extracting asset types from investments
        if (!scenario.investmentScenario) return [];
        return Array.from(new Set(scenario.investmentScenario.map(is => is.investment.assetType)));
    };

    // Determine user's permission level for this scenario
    const isOwner = scenario.permissions?.isOwner || false;
    const canEdit = scenario.permissions?.canWrite || false;
    const permissionBadge = isOwner
        ? <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full">Owner</span>
        : canEdit
            ? <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-600 text-xs rounded-full">Editor</span>
            : <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">Viewer</span>;

    // Handle download scenario as YAML
    const handleDownload = async () => {
        try {
            // Call the YAML API endpoint
            const response = await fetch(`/api/scenarios/yaml?id=${scenario.id}&userEmail=${userEmail}`);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to download scenario');
            }

            // Get the YAML content
            const yamlContent = await response.text();

            // Create a blob with the YAML content
            const blob = new Blob([yamlContent], { type: 'text/yaml' });

            // Create a temporary URL for the blob
            const url = URL.createObjectURL(blob);

            // Create a temporary anchor element
            const a = document.createElement('a');
            a.href = url;
            a.download = `${scenario.name}-scenario.yaml`;

            // Trigger the download
            document.body.appendChild(a);
            a.click();

            // Clean up
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading scenario:', error);
            alert('Failed to download scenario: ' + error.message);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow flex flex-col h-full">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center">
                    <h3 className="text-xl font-semibold text-black">{scenario.name}'s Scenario</h3>
                    {permissionBadge}
                </div>
            </div>

            {/* Rest of the card content remains the same */}
            <div className="space-y-4 text-gray-600 flex-grow">
                <div>
                    <p className="font-medium mb-2">Basic Information</p>
                    <p>Type: {scenario.forIndividual ? 'Individual' : 'Married Couple'}</p>
                    <p>Birth Year: {scenario.userBirthYear}</p>
                    <p>Life Expectancy: {scenario.userLifeExpectancyMean} years</p>
                    <p>Life Expectancy Std Dev: {scenario.userLifeExpectancyStd} years</p>
                    <p>Residence State: {scenario.residenceState}</p>
                    <p>Financial Goal: ${scenario.financialGoal?.toLocaleString()}</p>
                    {!scenario.forIndividual && (
                        <>
                            <p>Spouse Birth Year: {scenario.spouseBirthYear}</p>
                            <p>Spouse Life Expectancy: {scenario.spouseLifeExpectancyMean} years</p>
                            <p>Spouse Life Expectancy Std Dev: {scenario.spouseLifeExpectancyStd} years</p>
                        </>
                    )}
                </div>

                <div>
                    <p className="font-medium mb-2">Asset Types</p>
                    {getAssetTypes().map((asset, index) => (
                        <div key={index} className="ml-4 mb-2">
                            <p className="font-medium">{asset.name}</p>
                            <p className="text-sm">Description: {asset.description}</p>
                            {asset.returnType && asset.returnType.toLowerCase() === 'fixed' ? (
                                <p className="text-sm">Fixed Return: {asset.fixedReturn}%</p>
                            ) : (
                                <>
                                    <p className="text-sm">Return: {asset.normalReturnMean}% (std dev: {asset.normalReturnStd}%)</p>
                                </>
                            )}
                            <p className="text-sm">Expense Ratio: {asset.expenseRatio}%</p>
                            {/* Display income details based on available fields */}
                            {asset.fixedIncome ? (
                                <p className="text-sm">Fixed Income: {asset.fixedIncome}%</p>
                            ) : (
                                <>
                                    <p className="text-sm">Income: {asset.normalIncomeMean || asset.normalIncomeMean}%
                                        {(asset.normalIncomeStd || asset.normalIncomeStd) &&
                                            ` (std dev: ${asset.normalIncomeStd || asset.normalIncomeStd}%)`}</p>
                                </>
                            )}
                            <p className="text-sm">Taxable: {asset.taxable !== undefined ? (asset.taxable ? 'Yes' : 'No') :
                                (asset.taxability === 'TAXABLE' ? 'Yes' : 'No')}</p>
                        </div>
                    ))}
                </div>

                <div>
                    <p className="font-medium mb-2">Investments</p>
                    {formatInvestments().map((investment, index) => (
                        <div key={index} className="ml-4 mb-2">
                            <p>{investment.assetType.name}</p>
                            <p className="text-sm">Value: ${investment.value.toLocaleString()}</p>
                            <p className="text-sm">Tax Status: {investment.taxStatus.replace(/_/g, ' ').toLowerCase()}</p>
                            {investment.rothConversionOrder && (
                                <p className="text-sm">Roth Conversion Order: {investment.rothConversionOrder}</p>
                            )}
                        </div>
                    ))}
                </div>

                <div>
                    <p className="font-medium mb-2">Event Series</p>
                    {scenario.eventSeries?.map((event, index) => (
                        <div key={index} className="ml-4 mb-2">
                            <p className="font-medium">{event.name}</p>
                            {event.description && (
                                <p className="text-sm">Description: {event.description}</p>
                            )}
                            <p className="text-sm">Type: {event.type.toLowerCase()}</p>
                            <p className="text-sm">Start Year Type: {event.startYearType.replace(/_/g, ' ').toLowerCase()}</p>
                            {event.startYear && (
                                <p className="text-sm">Start Year: {event.startYear}</p>
                            )}
                            {event.startMin && event.startMax && (
                                <p className="text-sm">Start Year Range: {event.startMin} - {event.startMax}</p>
                            )}
                            {event.startMean && event.startStd && (
                                <p className="text-sm">Start Year: {event.startMean} (std dev: {event.startStd})</p>
                            )}
                            <p className="text-sm">Duration Type: {event.durationType.replace(/_/g, ' ').toLowerCase()}</p>
                            {event.duration && (
                                <p className="text-sm">Duration: {event.duration} years</p>
                            )}
                            {event.durationMin && event.durationMax && (
                                <p className="text-sm">Duration Range: {event.durationMin} - {event.durationMax} years</p>
                            )}
                            {event.durationMean && event.durationStd && (
                                <p className="text-sm">Duration: {event.durationMean} years (std dev: {event.durationStd})</p>
                            )}
                            {(event.type === 'INCOME' || event.type === 'EXPENSE') && event.incomeEventDetails && (
                                <>
                                    <p className="text-sm">Amount: ${event.incomeEventDetails.initialAmount.toLocaleString()}</p>
                                    {event.type === 'INCOME' && (
                                        <p className="text-sm">Social Security: {event.incomeEventDetails.isSocialSecurity ? 'Yes' : 'No'}</p>
                                    )}
                                    {event.type === 'EXPENSE' && (
                                        <p className="text-sm">Discretionary: {event.expenseEventDetails.isDiscretionary ? 'Yes' : 'No'}</p>
                                    )}
                                    <p className="text-sm">Annual Change Type: {event.incomeEventDetails.annualChangeType.replace(/_/g, ' ').toLowerCase()}</p>
                                    <p className="text-sm">Annual Change: {event.incomeEventDetails.annualChangeAmount || event.incomeEventDetails.annualChangePercentage}{event.incomeEventDetails.annualChangePercentage ? '%' : '$'}</p>
                                    <p className="text-sm">Inflation Adjusted: {event.incomeEventDetails.inflationAdjustment ? 'Yes' : 'No'}</p>
                                    {!scenario.forIndividual && (
                                        <p className="text-sm">User Percentage: {event.incomeEventDetails.userPercentage}%</p>
                                    )}
                                </>
                            )}
                        </div>
                    ))}
                </div>

                <div>
                    <p className="font-medium mb-2">Strategies</p>
                    <div className="ml-4">
                        <p className="font-medium">Inflation Assumption</p>
                        <p className="text-sm">Type: {scenario.inflationAssumption.replace(/_/g, ' ').toLowerCase()}</p>
                        {scenario.inflationAssumption === 'FIXED' && (
                            <p className="text-sm">Rate: {scenario.inflation}%</p>
                        )}
                        {scenario.inflationAssumption === 'RANDOM_UNIFORM' && (
                            <p className="text-sm">Range: {scenario.inflationMin}% - {scenario.inflationMax}%</p>
                        )}
                        {scenario.inflationAssumption === 'RANDOM_NORMAL' && (
                            <p className="text-sm">Mean: {scenario.inflationMean}% (std dev: {scenario.inflationStd}%)</p>
                        )}

                        <p className="font-medium mt-2">Tax Optimization</p>
                        <p className="text-sm">Enabled: {scenario.rothOptimizationStartYear ? 'Yes' : 'No'}</p>
                        {scenario.rothOptimizationStartYear && (
                            <p className="text-sm">Period: {scenario.rothOptimizationStartYear} - {scenario.rothOptimizationEndYear}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Move buttons to bottom */}
            <div className="flex justify-end space-x-2 mt-4 pt-3 border-t border-gray-100">
                <button
                    onClick={handleDownload}
                    className="px-4 py-2 text-sm bg-green-100 hover:bg-green-200 text-green-700 rounded-md transition-colors"
                >
                    Export YAML
                </button>
                {isOwner && (
                    <button
                        onClick={() => setIsShareModalOpen(true)}
                        className="px-4 py-2 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors"
                    >
                        Share
                    </button>
                )}
                {canEdit && (
                    <button
                        onClick={() => onEdit(scenario)}
                        className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
                    >
                        Edit
                    </button>
                )}
            </div>

            {/* Share Modal */}
            {isShareModalOpen && (
                <ShareScenarioModal
                    scenario={scenario}
                    isOpen={isShareModalOpen}
                    onClose={() => setIsShareModalOpen(false)}
                    userEmail={userEmail}
                />
            )}
        </div>
    );
};

export default ScenarioCard;