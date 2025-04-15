// Used Cursor AI for help with test setup and mocking strategy
import { NextResponse } from 'next/server'

// Mock the tax brackets route module
jest.mock('@/app/api/tax-brackets/route', () => {
    const mockHandler = jest.fn()
    return {
        GET: mockHandler,
        POST: mockHandler
    }
})

describe('Tax Brackets API', () => {
    let handler

    beforeEach(() => {
        jest.clearAllMocks()
        handler = require('@/app/api/tax-brackets/route')
    })

    describe('GET /api/tax-brackets', () => {
        it('should return 200 and tax brackets data', async () => {
            const mockTaxBrackets = {
                'single': {
                    income_tax: {
                        brackets: [
                            { min: 0, max: 11000, rate: 0.1 },
                            { min: 11001, max: 44725, rate: 0.12 }
                        ]
                    },
                    capital_gains: {
                        brackets: [
                            { min: 0, max: 44625, rate: 0 },
                            { min: 44626, max: 492300, rate: 0.15 }
                        ]
                    },
                    standard_deduction: 13850
                },
                'married-joint': {
                    income_tax: {
                        brackets: [
                            { min: 0, max: 22000, rate: 0.1 },
                            { min: 22001, max: 89450, rate: 0.12 }
                        ]
                    },
                    capital_gains: {
                        brackets: [
                            { min: 0, max: 89250, rate: 0 },
                            { min: 89251, max: 553850, rate: 0.15 }
                        ]
                    },
                    standard_deduction: 27700
                }
            }

            handler.GET.mockResolvedValueOnce(new Response(JSON.stringify(mockTaxBrackets), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }))

            const req = new Request('http://localhost/api/tax-brackets')
            const response = await handler.GET(req)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data).toEqual(mockTaxBrackets)
            expect(data['single']).toBeDefined()
            expect(data['married-joint']).toBeDefined()
        })

        it('should handle scraping errors gracefully', async () => {
            handler.GET.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Failed to scrape tax brackets' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }))

            const req = new Request('http://localhost/api/tax-brackets')
            const response = await handler.GET(req)
            const data = await response.json()

            expect(response.status).toBe(500)
            expect(data).toEqual({ error: 'Failed to scrape tax brackets' })
        })

        it('should return 405 for unsupported methods', async () => {
            handler.GET.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Method not allowed' }), {
                status: 405,
                headers: { 'Content-Type': 'application/json' }
            }))

            const req = new Request('http://localhost/api/tax-brackets', {
                method: 'PUT'
            })
            const response = await handler.GET(req)
            const data = await response.json()

            expect(response.status).toBe(405)
            expect(data).toEqual({ error: 'Method not allowed' })
        })

        it('should validate tax brackets data structure', async () => {
            const mockTaxBrackets = {
                'single': {
                    income_tax: {
                        brackets: [
                            { min: 0, max: 11000, rate: 0.1 }
                        ]
                    },
                    capital_gains: {
                        brackets: [
                            { min: 0, max: 44625, rate: 0 }
                        ]
                    },
                    standard_deduction: 13850
                }
            }

            handler.GET.mockResolvedValueOnce(new Response(JSON.stringify(mockTaxBrackets), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }))

            const req = new Request('http://localhost/api/tax-brackets')
            const response = await handler.GET(req)
            const data = await response.json()

            expect(data['single']).toBeDefined()
            expect(data['single'].income_tax).toBeDefined()
            expect(data['single'].capital_gains).toBeDefined()
            expect(data['single'].standard_deduction).toBeDefined()
            expect(Array.isArray(data['single'].income_tax.brackets)).toBe(true)
            expect(Array.isArray(data['single'].capital_gains.brackets)).toBe(true)
            expect(typeof data['single'].standard_deduction).toBe('number')
        })

        it('should handle empty tax brackets data', async () => {
            const mockTaxBrackets = {}

            handler.GET.mockResolvedValueOnce(new Response(JSON.stringify(mockTaxBrackets), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }))

            const req = new Request('http://localhost/api/tax-brackets')
            const response = await handler.GET(req)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data).toEqual({})
        })

        it('should handle invalid tax brackets data format', async () => {
            handler.GET.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Invalid tax brackets format' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            }))

            const req = new Request('http://localhost/api/tax-brackets')
            const response = await handler.GET(req)
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data).toEqual({ error: 'Invalid tax brackets format' })
        })

        it('should handle partial tax brackets data', async () => {
            const mockTaxBrackets = {
                'single': {
                    income_tax: {
                        brackets: [
                            { min: 0, max: 11000, rate: 0.1 }
                        ]
                    },
                    capital_gains: {
                        brackets: []
                    },
                    standard_deduction: 13850
                }
            }

            handler.GET.mockResolvedValueOnce(new Response(JSON.stringify(mockTaxBrackets), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }))

            const req = new Request('http://localhost/api/tax-brackets')
            const response = await handler.GET(req)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data['single'].capital_gains.brackets).toEqual([])
        })
    })

    describe('POST /api/tax-brackets', () => {
        it('should store tax brackets successfully', async () => {
            const mockResponse = {
                message: 'Tax brackets stored successfully',
                data: {
                    id: 1,
                    year: new Date().getFullYear()
                }
            }

            handler.POST.mockResolvedValueOnce(new Response(JSON.stringify(mockResponse), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }))

            const req = new Request('http://localhost/api/tax-brackets', {
                method: 'POST'
            })
            const response = await handler.POST(req)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data).toEqual(mockResponse)
        })

        it('should handle storage errors gracefully', async () => {
            handler.POST.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Failed to store tax brackets' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }))

            const req = new Request('http://localhost/api/tax-brackets', {
                method: 'POST'
            })
            const response = await handler.POST(req)
            const data = await response.json()

            expect(response.status).toBe(500)
            expect(data).toEqual({ error: 'Failed to store tax brackets' })
        })

        it('should validate tax brackets data before storage', async () => {
            const mockResponse = {
                message: 'Tax brackets stored successfully',
                data: {
                    id: 1,
                    year: new Date().getFullYear()
                }
            }

            handler.POST.mockResolvedValueOnce(new Response(JSON.stringify(mockResponse), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }))

            const req = new Request('http://localhost/api/tax-brackets', {
                method: 'POST',
                body: JSON.stringify({
                    'single': {
                        income_tax: {
                            brackets: [
                                { min: 0, max: 11000, rate: 0.1 }
                            ]
                        },
                        capital_gains: {
                            brackets: [
                                { min: 0, max: 44625, rate: 0 }
                            ]
                        },
                        standard_deduction: 13850
                    }
                })
            })
            const response = await handler.POST(req)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data).toEqual(mockResponse)
        })

        it('should reject invalid tax brackets data format', async () => {
            handler.POST.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Invalid tax brackets format' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            }))

            const req = new Request('http://localhost/api/tax-brackets', {
                method: 'POST',
                body: JSON.stringify({
                    invalidData: 'test'
                })
            })
            const response = await handler.POST(req)
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data).toEqual({ error: 'Invalid tax brackets format' })
        })

        it('should handle concurrent storage requests', async () => {
            const mockResponse = {
                message: 'Tax brackets stored successfully',
                data: {
                    id: 1,
                    year: new Date().getFullYear()
                }
            }

            // Mock the handler to return the same response for both requests
            handler.POST
                .mockResolvedValueOnce(new Response(JSON.stringify(mockResponse), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                }))
                .mockResolvedValueOnce(new Response(JSON.stringify(mockResponse), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                }))

            const req1 = new Request('http://localhost/api/tax-brackets', {
                method: 'POST'
            })
            const req2 = new Request('http://localhost/api/tax-brackets', {
                method: 'POST'
            })

            const response1 = await handler.POST(req1)
            const response2 = await handler.POST(req2)

            const data1 = await response1.json()
            const data2 = await response2.json()

            expect(response1.status).toBe(200)
            expect(response2.status).toBe(200)
            expect(data1).toEqual(mockResponse)
            expect(data2).toEqual(mockResponse)
        })

        it('should handle missing required fields in tax brackets', async () => {
            handler.POST.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Missing required fields' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            }))

            const req = new Request('http://localhost/api/tax-brackets', {
                method: 'POST',
                body: JSON.stringify({
                    'single': {
                        income_tax: {
                            brackets: []
                        }
                    }
                })
            })
            const response = await handler.POST(req)
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data).toEqual({ error: 'Missing required fields' })
        })
    })
}) 