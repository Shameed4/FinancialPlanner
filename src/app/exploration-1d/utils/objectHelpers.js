// Helper function to print the structure of an object
export function printObjectStructure(obj, prefix = '', maxDepth = 3, currentDepth = 0) {
    if (currentDepth >= maxDepth) return;

    const output = {};

    for (const key in obj) {
        const value = obj[key];
        const path = prefix ? `${prefix}.${key}` : key;

        if (typeof value === 'object' && value !== null) {
            if (Array.isArray(value)) {
                output[key] = `Array(${value.length})`;
                // If array contains objects, print the structure of the first item
                if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
                    output[`${key}[0]`] = printObjectStructure(value[0], `${path}[0]`, maxDepth, currentDepth + 1);
                }
            } else {
                output[key] = printObjectStructure(value, path, maxDepth, currentDepth + 1);
            }
        } else {
            output[key] = typeof value === 'function' ? 'function()' : value;
        }
    }

    return output;
}

// Helper function to get a nested object property by path
export function getNestedProperty(obj, path) {
    if (!path) return undefined;

    const pathArray = path.split('.');
    let current = obj;

    for (let i = 0; i < pathArray.length; i++) {
        const key = pathArray[i];

        // Handle array indices
        if (!isNaN(key)) {
            const index = parseInt(key);
            if (!current[index]) return undefined;
            current = current[index];
        } else {
            if (current[key] === undefined) return undefined;
            current = current[key];
        }
    }

    return current;
}

// Helper function to set a nested object property by path
export function setNestedProperty(obj, path, value) {
    if (!path) return obj;

    const pathArray = path.split('.');
    let current = obj;

    for (let i = 0; i < pathArray.length - 1; i++) {
        const key = pathArray[i];

        // Handle array indices
        if (!isNaN(key)) {
            const index = parseInt(key);
            if (!current[index]) return obj; // Path doesn't exist
            current = current[index];
        } else {
            if (!current[key]) return obj; // Path doesn't exist
            current = current[key];
        }
    }

    const lastKey = pathArray[pathArray.length - 1];

    // Handle array indices for the last key
    if (!isNaN(lastKey)) {
        const index = parseInt(lastKey);
        if (current[index] !== undefined) {
            current[index] = value;
        }
    } else {
        if (current[lastKey] !== undefined) {
            current[lastKey] = value;
        }
    }

    return obj;
}

// Helper function to create a deep copy of an object
export function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
} 