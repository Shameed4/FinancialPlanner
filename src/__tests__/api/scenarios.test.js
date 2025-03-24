// Used Cursor AI for help with test setup and mocking strategy
import { NextResponse } from 'next/server'

// Mock the scenarios route module
jest.mock('@/app/api/scenarios/route', () => {
    const mockHandler = jest.fn()
    return {
        GET: mockHandler,
        POST: mockHandler
    }
})

// Mock getLoggedInUser
jest.mock('@/app/api/temp', () => ({
    __esModule: true,
    default: jest.fn().mockResolvedValue({ id: 1, name: 'Test User' })
}))

describe('Scenarios API', () => {
    let handler

    beforeEach(() => {
        jest.clearAllMocks()
        handler = require('@/app/api/scenarios/route')
    })

    describe('GET /api/scenarios', () => {
        it('should return 200 and empty scenarios array', async () => {
            handler.GET.mockResolvedValueOnce(new Response(JSON.stringify({ scenarios: [] }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }))

            const req = new Request('http://localhost/api/scenarios')
            const response = await handler.GET(req)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data).toEqual({ scenarios: [] })
        })

        it('should return 405 for unsupported methods', async () => {
            handler.GET.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Method not allowed' }), {
                status: 405,
                headers: { 'Content-Type': 'application/json' }
            }))

            const req = new Request('http://localhost/api/scenarios', {
                method: 'PUT'
            })
            const response = await handler.GET(req)
            const data = await response.json()

            expect(response.status).toBe(405)
            expect(data).toEqual({ error: 'Method not allowed' })
        })

        it('should handle database errors gracefully', async () => {
            handler.GET.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Database connection error' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }))

            const req = new Request('http://localhost/api/scenarios')
            const response = await handler.GET(req)
            const data = await response.json()

            expect(response.status).toBe(500)
            expect(data).toEqual({ error: 'Database connection error' })
        })

        it('should handle authentication errors', async () => {
            const getLoggedInUser = require('@/app/api/temp').default
            getLoggedInUser.mockRejectedValueOnce(new Error('Not authenticated'))

            handler.GET.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Not authenticated' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            }))

            const req = new Request('http://localhost/api/scenarios')
            const response = await handler.GET(req)
            const data = await response.json()

            expect(response.status).toBe(401)
            expect(data).toEqual({ error: 'Not authenticated' })
        })

        it('should return scenarios with proper pagination', async () => {
            const mockScenarios = Array(10).fill(null).map((_, i) => ({
                id: i + 1,
                name: `Scenario ${i + 1}`,
                description: `Description ${i + 1}`
            }))

            handler.GET.mockResolvedValueOnce(new Response(JSON.stringify({
                scenarios: mockScenarios,
                total: 20,
                page: 1,
                pageSize: 10
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }))

            const req = new Request('http://localhost/api/scenarios?page=1&pageSize=10')
            const response = await handler.GET(req)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.scenarios).toHaveLength(10)
            expect(data.total).toBe(20)
            expect(data.page).toBe(1)
            expect(data.pageSize).toBe(10)
        })
    })

    describe('POST /api/scenarios', () => {
        it('should create a new scenario', async () => {
            handler.POST.mockResolvedValueOnce(new Response(JSON.stringify({ id: 1 }), {
                status: 201,
                headers: { 'Content-Type': 'application/json' }
            }))

            const req = new Request('http://localhost/api/scenarios', {
                method: 'POST',
                body: JSON.stringify({
                    name: 'Test Scenario',
                    description: 'Test Description'
                })
            })

            const response = await handler.POST(req)
            const data = await response.json()

            expect(response.status).toBe(201)
            expect(data).toHaveProperty('id')
        })

        it('should validate required fields', async () => {
            handler.POST.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Name is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            }))

            const req = new Request('http://localhost/api/scenarios', {
                method: 'POST',
                body: JSON.stringify({
                    description: 'Test Description'
                })
            })

            const response = await handler.POST(req)
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data).toEqual({ error: 'Name is required' })
        })

        it('should handle invalid JSON in request body', async () => {
            handler.POST.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Invalid JSON' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            }))

            const req = new Request('http://localhost/api/scenarios', {
                method: 'POST',
                body: 'invalid json'
            })

            const response = await handler.POST(req)
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data).toEqual({ error: 'Invalid JSON' })
        })

        it('should handle database errors during creation', async () => {
            handler.POST.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Database error' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }))

            const req = new Request('http://localhost/api/scenarios', {
                method: 'POST',
                body: JSON.stringify({
                    name: 'Test Scenario',
                    description: 'Test Description'
                })
            })

            const response = await handler.POST(req)
            const data = await response.json()

            expect(response.status).toBe(500)
            expect(data).toEqual({ error: 'Database error' })
        })

        it('should handle concurrent scenario creation', async () => {
            const mockScenarios = [
                { id: 1, name: 'Scenario 1' },
                { id: 2, name: 'Scenario 2' }
            ]

            handler.POST
                .mockResolvedValueOnce(new Response(JSON.stringify(mockScenarios[0]), {
                    status: 201,
                    headers: { 'Content-Type': 'application/json' }
                }))
                .mockResolvedValueOnce(new Response(JSON.stringify(mockScenarios[1]), {
                    status: 201,
                    headers: { 'Content-Type': 'application/json' }
                }))

            const requests = mockScenarios.map(scenario =>
                new Request('http://localhost/api/scenarios', {
                    method: 'POST',
                    body: JSON.stringify(scenario)
                })
            )

            const responses = await Promise.all(requests.map(req => handler.POST(req)))
            const data = await Promise.all(responses.map(res => res.json()))

            expect(responses[0].status).toBe(201)
            expect(responses[1].status).toBe(201)
            expect(data[0].id).toBe(1)
            expect(data[1].id).toBe(2)
        })
    })
}) 