import { DistributionType as PrismaDistributionType } from '@prisma/client';

// Re-export the DistributionType enum
export const DistributionType = PrismaDistributionType;

// Helper function to map string distribution type to DistributionType enum
export function mapDistributionType(distributionTypeString: string): PrismaDistributionType {
    switch (distributionTypeString.toLowerCase()) {
        case 'fixed':
            return PrismaDistributionType.fixed;
        case 'uniform':
            return PrismaDistributionType.random_uniform;
        case 'normal':
            return PrismaDistributionType.random_normal;
        default:
            console.warn(`Unknown distributionType: ${distributionTypeString}, defaulting to 'fixed'`);
            return PrismaDistributionType.fixed;
    }
}

// Helper function to convert yes/no string to boolean
export function yesNoToBoolean(arg: string): boolean {
    if (arg === 'Yes') {
        return true;
    } else if (arg === 'No') {
        return false;
    } else {
        throw new Error('Invalid yes/no value');
    }
}

// Helper function to format currency values
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

// Helper function to format percentage values
export function formatPercentage(value: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'percent',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    }).format(value / 100);
} 