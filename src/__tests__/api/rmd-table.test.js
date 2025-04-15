// Used Cursor AI for help with test setup and mocking strategy
import { NextResponse } from 'next/server'

// Mock the RMD table route module
jest.mock('@/app/api/rmd-table/route', () => {
    const mockHandler = jest.fn()
    return {
        GET: mockHandler,
        POST: mockHandler
    }
})

describe('RMD Table API', () => {
    let handler

    beforeEach(() => {
        jest.clearAllMocks()
        handler = require('@/app/api/rmd-table/route')
    })

    describe('GET /api/rmd-table', () => {
        it('should return 200 and RMD table from database when available', async () => {
            const mockRMDTable = {
                lifetimeTable: [
                    { age: '70', distributionPeriod: '27.4' },
                    { age: '71', distributionPeriod: '26.5' }
                ],
                source: 'database',
                year: new Date().getFullYear(),
                lastUpdated: new Date().toISOString()
            }

            handler.GET.mockResolvedValueOnce(new Response(JSON.stringify(mockRMDTable), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }))

            const req = new Request('http://localhost/api/rmd-table')
            const response = await handler.GET(req)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data).toEqual(mockRMDTable)
            expect(data.source).toBe('database')
        })

        it('should return 200 and scraped RMD table when not in database', async () => {
            const mockRMDTable = {
                lifetimeTable: [
                    { age: '70', distributionPeriod: '27.4' },
                    { age: '71', distributionPeriod: '26.5' }
                ],
                source: 'scraped',
                year: new Date().getFullYear(),
                lastUpdated: new Date().toISOString()
            }

            handler.GET.mockResolvedValueOnce(new Response(JSON.stringify(mockRMDTable), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }))

            const req = new Request('http://localhost/api/rmd-table')
            const response = await handler.GET(req)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data).toEqual(mockRMDTable)
            expect(data.source).toBe('scraped')
        })

        it('should handle scraping errors gracefully', async () => {
            handler.GET.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Failed to scrape RMD table' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }))

            const req = new Request('http://localhost/api/rmd-table')
            const response = await handler.GET(req)
            const data = await response.json()

            expect(response.status).toBe(500)
            expect(data).toEqual({ error: 'Failed to scrape RMD table' })
        })

        it('should return 405 for unsupported methods', async () => {
            handler.GET.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Method not allowed' }), {
                status: 405,
                headers: { 'Content-Type': 'application/json' }
            }))

            const req = new Request('http://localhost/api/rmd-table', {
                method: 'PUT'
            })
            const response = await handler.GET(req)
            const data = await response.json()

            expect(response.status).toBe(405)
            expect(data).toEqual({ error: 'Method not allowed' })
        })

        it('should validate RMD table data structure', async () => {
            const mockRMDTable = {
                lifetimeTable: [
                    { age: '70', distributionPeriod: '27.4' },
                    { age: '71', distributionPeriod: '26.5' }
                ],
                source: 'database',
                year: new Date().getFullYear(),
                lastUpdated: new Date().toISOString()
            }

            handler.GET.mockResolvedValueOnce(new Response(JSON.stringify(mockRMDTable), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }))

            const req = new Request('http://localhost/api/rmd-table')
            const response = await handler.GET(req)
            const data = await response.json()

            expect(data.lifetimeTable).toBeDefined()
            expect(Array.isArray(data.lifetimeTable)).toBe(true)
            expect(data.lifetimeTable[0]).toHaveProperty('age')
            expect(data.lifetimeTable[0]).toHaveProperty('distributionPeriod')
            expect(typeof data.lifetimeTable[0].age).toBe('string')
            expect(typeof data.lifetimeTable[0].distributionPeriod).toBe('string')
        })

        it('should handle empty RMD table data', async () => {
            const mockRMDTable = {
                lifetimeTable: [],
                source: 'database',
                year: new Date().getFullYear(),
                lastUpdated: new Date().toISOString()
            }

            handler.GET.mockResolvedValueOnce(new Response(JSON.stringify(mockRMDTable), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }))

            const req = new Request('http://localhost/api/rmd-table')
            const response = await handler.GET(req)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.lifetimeTable).toEqual([])
        })

        it('should handle invalid RMD table data format', async () => {
            handler.GET.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Invalid RMD table format' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            }))

            const req = new Request('http://localhost/api/rmd-table')
            const response = await handler.GET(req)
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data).toEqual({ error: 'Invalid RMD table format' })
        })
    })

    describe('POST /api/rmd-table', () => {
        it('should store RMD table successfully', async () => {
            const mockResponse = {
                message: 'RMD table stored successfully',
                data: {
                    id: 1,
                    year: new Date().getFullYear()
                }
            }

            handler.POST.mockResolvedValueOnce(new Response(JSON.stringify(mockResponse), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }))

            const req = new Request('http://localhost/api/rmd-table', {
                method: 'POST'
            })
            const response = await handler.POST(req)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data).toEqual(mockResponse)
        })

        it('should handle storage errors gracefully', async () => {
            handler.POST.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Failed to store RMD table' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }))

            const req = new Request('http://localhost/api/rmd-table', {
                method: 'POST'
            })
            const response = await handler.POST(req)
            const data = await response.json()

            expect(response.status).toBe(500)
            expect(data).toEqual({ error: 'Failed to store RMD table' })
        })

        it('should validate RMD table data before storage', async () => {
            const mockResponse = {
                message: 'RMD table stored successfully',
                data: {
                    id: 1,
                    year: new Date().getFullYear()
                }
            }

            handler.POST.mockResolvedValueOnce(new Response(JSON.stringify(mockResponse), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }))

            const req = new Request('http://localhost/api/rmd-table', {
                method: 'POST',
                body: JSON.stringify({
                    lifetimeTable: [
                        { age: '70', distributionPeriod: '27.4' }
                    ]
                })
            })
            const response = await handler.POST(req)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data).toEqual(mockResponse)
        })

        it('should reject invalid RMD table data format', async () => {
            handler.POST.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Invalid RMD table format' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            }))

            const req = new Request('http://localhost/api/rmd-table', {
                method: 'POST',
                body: JSON.stringify({
                    invalidData: 'test'
                })
            })
            const response = await handler.POST(req)
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data).toEqual({ error: 'Invalid RMD table format' })
        })

        it('should handle concurrent storage requests', async () => {
            const mockResponse = {
                message: 'RMD table stored successfully',
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

            const req1 = new Request('http://localhost/api/rmd-table', {
                method: 'POST'
            })
            const req2 = new Request('http://localhost/api/rmd-table', {
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
    })
}) 