// Function to fetch scenarios from the backend
export async function fetchScenarios(userEmail) {
    try {
        const response = await fetch(`/api/scenarios?ownerId=${userEmail}`);
        const data = await response.json();
        console.log('Fetched scenarios:', data);
        return data.result;
    } catch (error) {
        console.error('Error fetching scenarios:', error);
        return [];
    }
}

// Function to send parameter exploration data to the API
export async function sendExplorationData(baselineScenario, modifiedScenario, parameterInfo) {
    console.log("Sending scenarios to API...");

    // Prepare the payload
    const payload = {
        baselineScenario,
        modifiedScenario,
        parameterInfo
    };

    try {
        // Make the API call
        const response = await fetch('/api/explore', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`API call failed with status: ${response.status}`);
        }

        const result = await response.json();
        console.log("API Response:", result);
        return result;
    } catch (error) {
        console.error('Error exploring scenario:', error);
        throw error;
    }
} 