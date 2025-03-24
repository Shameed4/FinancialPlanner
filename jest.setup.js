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