'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { jsonToYaml } from '@/utils/scenarioConverter';
import ShareScenarioModal from './ShareScenarioModal';

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

    // Handle download of scenario as YAML
    const handleDownload = async () => {
        try {
            // Prepare the scenario data for download
            // Clone the scenario and remove any circular references
            const downloadScenario = { ...scenario };
            delete downloadScenario.permissions;

            // Convert to YAML
            const yaml = await jsonToYaml(downloadScenario);

            // Create blob and download
            const blob = new Blob([yaml], { type: 'text/yaml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${scenario.name.replace(/\s+/g, '_')}.yaml`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading scenario:', error);
            alert('Failed to download scenario');
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-lg font-semibold text-black">
                            {scenario.name}
                            {permissionBadge}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            {scenario.forIndividual ? 'Individual' : 'Married Couple'} • {scenario.residenceState}
                        </p>
                    </div>
                </div>

                <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Details</h4>
                    <div className="bg-gray-50 p-3 rounded-md text-sm">
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <p className="text-gray-600">Birth Year:</p>
                                <p className="font-medium">{scenario.userBirthYear}</p>
                            </div>
                            <div>
                                <p className="text-gray-600">Financial Goal:</p>
                                <p className="font-medium">${parseFloat(scenario.financialGoal).toLocaleString()}</p>
                            </div>
                            {!scenario.forIndividual && (
                                <div>
                                    <p className="text-gray-600">Spouse Birth Year:</p>
                                    <p className="font-medium">{scenario.spouseBirthYear}</p>
                                </div>
                            )}
                            <div>
                                <p className="text-gray-600">Asset Types:</p>
                                <p className="font-medium">
                                    {getAssetTypes().length > 0
                                        ? getAssetTypes().join(', ')
                                        : 'None'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex space-x-3">
                    {(isOwner || canEdit) && (
                        <button
                            onClick={() => onEdit(scenario)}
                            className="flex-1 px-3 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-800"
                        >
                            Edit
                        </button>
                    )}
                    <button
                        onClick={handleDownload}
                        className="flex-1 px-3 py-2 text-sm font-medium text-black bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                        Download YAML
                    </button>
                    {isOwner && (
                        <button
                            onClick={() => setIsShareModalOpen(true)}
                            className="flex-1 px-3 py-2 text-sm font-medium text-black bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                            Share
                        </button>
                    )}
                </div>
            </div>

            <ShareScenarioModal
                scenario={scenario}
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                userEmail={userEmail}
            />
        </div>
    );
};

export default ScenarioCard; 