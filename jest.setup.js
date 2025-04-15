// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock fetch globally
global.fetch = jest.fn(() =>
    Promise.resolve({
        json: () => Promise.resolve({}),
    })
)

// Mock Request globally
global.Request = class Request {
    constructor(input, init = {}) {
        this.url = input
        this.method = init.method || 'GET'
        this.headers = new Headers(init.headers)
        this.body = init.body
    }

    json() {
        return Promise.resolve({})
    }

    text() {
        return Promise.resolve('')
    }
}

// Mock Response globally
global.Response = class Response {
    constructor(body, init = {}) {
        this._body = body
        this.status = init.status || 200
        this.statusText = init.statusText || ''
        this.headers = new Headers(init.headers)
    }

    json() {
        return Promise.resolve(this._body)
    }

    text() {
        return Promise.resolve(this._body)
    }
}

global.Headers = class Headers {
    constructor(init = {}) {
        this._headers = { ...init }
    }

    get(name) {
        return this._headers[name.toLowerCase()]
    }

    set(name, value) {
        this._headers[name.toLowerCase()] = value
    }
}

// Mock next/navigation
jest.mock('next/navigation', () => ({
    useRouter() {
        return {
            push: jest.fn(),
            replace: jest.fn(),
            prefetch: jest.fn(),
        }
    },
    usePathname() {
        return ''
    },
}))

// Mock next-auth
jest.mock('next-auth/react', () => {
    const originalModule = jest.requireActual('next-auth/react')
    return {
        __esModule: true,
        ...originalModule,
        useSession: jest.fn(() => ({
            data: {
                user: { name: 'Test User' },
            },
            status: 'authenticated',
        })),
    }
})

// Mock TextEncoder/TextDecoder
global.TextEncoder = class TextEncoder {
    encode() {
        return new Uint8Array();
    }
};

global.TextDecoder = class TextDecoder {
    decode() {
        return '';
    }
};

// Mock fetch
global.fetch = jest.fn().mockResolvedValue({
    text: jest.fn().mockResolvedValue('<html><table summary="Uniform Lifetime Table"></table></html>')
});

// Mock Prisma client
jest.mock('@prisma/client', () => ({
    PrismaClient: jest.fn().mockImplementation(() => ({
        rmdTable: {
            findFirst: jest.fn().mockResolvedValue({
                data: [
                    { age: '72', distributionPeriod: '27.4' },
                    { age: '73', distributionPeriod: '26.5' },
                    { age: '74', distributionPeriod: '25.5' },
                    { age: '120', distributionPeriod: '1.9' }
                ]
            })
        },
        taxBrackets: {
            findFirst: jest.fn().mockResolvedValue({
                data: {
                    single: {
                        income_tax: {
                            brackets: [
                                { min: '0', max: '11600', rate: '10%' },
                                { min: '11600', max: '47150', rate: '12%' },
                                { min: '47150', max: '100525', rate: '22%' },
                                { min: '100525', max: '191950', rate: '24%' },
                                { min: '191950', max: '243725', rate: '32%' },
                                { min: '243725', max: '609350', rate: '35%' },
                                { min: '609350', max: null, rate: '37%' }
                            ]
                        },
                        capital_gains: {
                            brackets: [
                                { min: '0', max: '47150', rate: '0%' },
                                { min: '47150', max: '523600', rate: '15%' },
                                { min: '523600', max: null, rate: '20%' }
                            ]
                        },
                        standard_deduction: '14600'
                    },
                    'married-joint': {
                        income_tax: {
                            brackets: [
                                { min: '0', max: '23200', rate: '10%' },
                                { min: '23200', max: '94300', rate: '12%' },
                                { min: '94300', max: '201050', rate: '22%' },
                                { min: '201050', max: '383900', rate: '24%' },
                                { min: '383900', max: '487450', rate: '32%' },
                                { min: '487450', max: '731200', rate: '35%' },
                                { min: '731200', max: null, rate: '37%' }
                            ]
                        },
                        capital_gains: {
                            brackets: [
                                { min: '0', max: '94300', rate: '0%' },
                                { min: '94300', max: '583750', rate: '15%' },
                                { min: '583750', max: null, rate: '20%' }
                            ]
                        },
                        standard_deduction: '29200'
                    },
                    'married-separate': {
                        income_tax: {
                            brackets: [
                                { min: '0', max: '11600', rate: '10%' },
                                { min: '11600', max: '47150', rate: '12%' },
                                { min: '47150', max: '100525', rate: '22%' },
                                { min: '100525', max: '191950', rate: '24%' },
                                { min: '191950', max: '243725', rate: '32%' },
                                { min: '243725', max: '365600', rate: '35%' },
                                { min: '365600', max: null, rate: '37%' }
                            ]
                        },
                        capital_gains: {
                            brackets: [
                                { min: '0', max: '47150', rate: '0%' },
                                { min: '47150', max: '291850', rate: '15%' },
                                { min: '291850', max: null, rate: '20%' }
                            ]
                        },
                        standard_deduction: '14600'
                    },
                    'head-of-household': {
                        income_tax: {
                            brackets: [
                                { min: '0', max: '16550', rate: '10%' },
                                { min: '16550', max: '63100', rate: '12%' },
                                { min: '63100', max: '100500', rate: '22%' },
                                { min: '100500', max: '191950', rate: '24%' },
                                { min: '191950', max: '243700', rate: '32%' },
                                { min: '243700', max: '609350', rate: '35%' },
                                { min: '609350', max: null, rate: '37%' }
                            ]
                        },
                        capital_gains: {
                            brackets: [
                                { min: '0', max: '63100', rate: '0%' },
                                { min: '63100', max: '523600', rate: '15%' },
                                { min: '523600', max: null, rate: '20%' }
                            ]
                        },
                        standard_deduction: '21900'
                    }
                }
            })
        }
    }))
})); 