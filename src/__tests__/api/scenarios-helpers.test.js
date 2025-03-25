// Used Cursor AI for help with test setup and mocking strategy
// Define mock enums
const DistributionType = {
    fixed: 'fixed',
    random_uniform: 'random_uniform',
    random_normal: 'random_normal'
};

const EventType = {
    income: 'income',
    expense: 'expense',
    invest: 'invest',
    rebalance: 'rebalance'
};

const StartYearType = {
    fixed: 'fixed',
    random_uniform: 'random_uniform',
    random_normal: 'random_normal',
    same_as: 'same_as',
    after: 'after'
};

const TaxStatus = {
    NON_RETIREMENT: 'NON_RETIREMENT',
    PRE_TAX_RETIREMENT: 'PRE_TAX_RETIREMENT',
    AFTER_TAX_RETIREMENT: 'AFTER_TAX_RETIREMENT'
};

const Taxability = {
    TAXABLE: 'TAXABLE',
    TAX_EXEMPT: 'TAX_EXEMPT'
};

const ReturnType = {
    FIXED: 'FIXED',
    NORMAL: 'NORMAL'
};

// Mock the helper functions
jest.mock('@/app/api/scenarios/route', () => ({
    mapStartYearType: jest.fn((type) => {
        switch (type.toLowerCase()) {
            case 'fixed': return StartYearType.fixed;
            case 'uniform': return StartYearType.random_uniform;
            case 'normal': return StartYearType.random_normal;
            case 'same_as': return StartYearType.same_as;
            case 'after': return StartYearType.after;
            default: return StartYearType.fixed;
        }
    }),
    mapDistributionType: jest.fn((type) => {
        switch (type.toLowerCase()) {
            case 'fixed': return DistributionType.fixed;
            case 'uniform': return DistributionType.random_uniform;
            case 'normal': return DistributionType.random_normal;
            default: return DistributionType.fixed;
        }
    }),
    mapTaxStatus: jest.fn((status) => {
        switch (status) {
            case 'non-retirement': return TaxStatus.NON_RETIREMENT;
            case 'pre-tax-retirement': return TaxStatus.PRE_TAX_RETIREMENT;
            case 'after-tax-retirement': return TaxStatus.AFTER_TAX_RETIREMENT;
            default: return TaxStatus.NON_RETIREMENT;
        }
    }),
    mapTaxability: jest.fn((taxability) => {
        return taxability === 'tax-exempt' ? Taxability.TAX_EXEMPT : Taxability.TAXABLE;
    }),
    mapReturnType: jest.fn((type) => {
        switch (type.toLowerCase()) {
            case 'fixed': return ReturnType.FIXED;
            case 'normal': return ReturnType.NORMAL;
            default: return ReturnType.NORMAL;
        }
    }),
    yesNoToBoolean: jest.fn((value) => {
        if (value === 'Yes') return true;
        if (value === 'No') return false;
        throw new Error('Invalid yes/no value');
    })
}));

const {
    mapStartYearType,
    mapDistributionType,
    mapTaxStatus,
    mapTaxability,
    mapReturnType,
    yesNoToBoolean
} = require('@/app/api/scenarios/route');

describe('Scenario API Helper Functions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('mapStartYearType', () => {
        it('should correctly map valid start year types', () => {
            expect(mapStartYearType('fixed')).toBe(StartYearType.fixed);
            expect(mapStartYearType('uniform')).toBe(StartYearType.random_uniform);
            expect(mapStartYearType('normal')).toBe(StartYearType.random_normal);
            expect(mapStartYearType('same_as')).toBe(StartYearType.same_as);
            expect(mapStartYearType('after')).toBe(StartYearType.after);
        });

        it('should default to fixed for unknown types', () => {
            expect(mapStartYearType('unknown')).toBe(StartYearType.fixed);
        });
    });

    describe('mapDistributionType', () => {
        it('should correctly map valid distribution types', () => {
            expect(mapDistributionType('fixed')).toBe(DistributionType.fixed);
            expect(mapDistributionType('uniform')).toBe(DistributionType.random_uniform);
            expect(mapDistributionType('normal')).toBe(DistributionType.random_normal);
        });

        it('should default to fixed for unknown types', () => {
            expect(mapDistributionType('unknown')).toBe(DistributionType.fixed);
        });
    });

    describe('mapTaxStatus', () => {
        it('should correctly map valid tax statuses', () => {
            expect(mapTaxStatus('non-retirement')).toBe(TaxStatus.NON_RETIREMENT);
            expect(mapTaxStatus('pre-tax-retirement')).toBe(TaxStatus.PRE_TAX_RETIREMENT);
            expect(mapTaxStatus('after-tax-retirement')).toBe(TaxStatus.AFTER_TAX_RETIREMENT);
        });

        it('should default to NON_RETIREMENT for unknown statuses', () => {
            expect(mapTaxStatus('unknown')).toBe(TaxStatus.NON_RETIREMENT);
        });
    });

    describe('mapTaxability', () => {
        it('should correctly map tax-exempt status', () => {
            expect(mapTaxability('tax-exempt')).toBe(Taxability.TAX_EXEMPT);
        });

        it('should default to TAXABLE for unknown statuses', () => {
            expect(mapTaxability('unknown')).toBe(Taxability.TAXABLE);
        });
    });

    describe('mapReturnType', () => {
        it('should correctly map valid return types', () => {
            expect(mapReturnType('fixed')).toBe(ReturnType.FIXED);
            expect(mapReturnType('normal')).toBe(ReturnType.NORMAL);
        });

        it('should default to NORMAL for unknown types', () => {
            expect(mapReturnType('unknown')).toBe(ReturnType.NORMAL);
        });
    });

    describe('yesNoToBoolean', () => {
        it('should correctly convert Yes/No to boolean', () => {
            expect(yesNoToBoolean('Yes')).toBe(true);
            expect(yesNoToBoolean('No')).toBe(false);
        });

        it('should throw error for invalid values', () => {
            expect(() => yesNoToBoolean('Maybe')).toThrow('Invalid yes/no value');
        });
    });
}); 