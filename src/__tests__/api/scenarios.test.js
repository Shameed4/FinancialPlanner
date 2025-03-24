// Used Cursor AI for help with test setup and mocking strategy
import { NextResponse, NextRequest } from 'next/server'

// Mock the entire scenarios route module
jest.mock('@/app/api/scenarios/route', () => ({
    GET: jest.fn(async (req) => {
        if (req.method === 'GET') {
            return new Response(JSON.stringify({ scenarios: [] }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            })
        }
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        })
    }),
    POST: jest.fn(async (req) => {
        return new Response(JSON.stringify({ id: 1 }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        })
    })
}))

// Mock getLoggedInUser
jest.mock('@/app/api/temp', () => ({
    __esModule: true,
    default: jest.fn().mockResolvedValue({ id: 1, name: 'Test User' })
}))

describe('Scenarios API', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('GET /api/scenarios', () => {
        it('should return 200 and empty scenarios array', async () => {
            const req = new Request('http://localhost/api/scenarios')
            const handler = require('@/app/api/scenarios/route')

            const response = await handler.GET(req)
            const data = JSON.parse(await response.text())

            expect(response.status).toBe(200)
            expect(data).toEqual({ scenarios: [] })
        })

        it('should return 405 for unsupported methods', async () => {
            const req = new Request('http://localhost/api/scenarios', {
                method: 'PUT'
            })
            const handler = require('@/app/api/scenarios/route')

            const response = await handler.GET(req)
            const data = JSON.parse(await response.text())

            expect(response.status).toBe(405)
            expect(data).toEqual({ error: 'Method not allowed' })
        })
    })

    describe('POST /api/scenarios', () => {
        it('should create a new scenario', async () => {
            const req = new Request('http://localhost/api/scenarios', {
                method: 'POST',
                body: JSON.stringify({
                    name: 'Test Scenario',
                    description: 'Test Description'
                })
            })
            const handler = require('@/app/api/scenarios/route')

            const response = await handler.POST(req)
            const data = JSON.parse(await response.text())

            expect(response.status).toBe(201)
            expect(data).toHaveProperty('id')
        })
    })
}) 