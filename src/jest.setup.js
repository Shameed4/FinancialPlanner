import '@testing-library/jest-dom'

// Mock Headers, Request, and Response for Next.js
global.Headers = class Headers {
    constructor(init) {
        this._headers = new Map();
        if (init) {
            Object.entries(init).forEach(([key, value]) => {
                this._headers.set(key.toLowerCase(), value);
            });
        }
    }

    get(name) {
        return this._headers.get(name.toLowerCase()) || null;
    }

    set(name, value) {
        this._headers.set(name.toLowerCase(), value);
    }
};

global.Request = class Request {
    constructor(input, init = {}) {
        this._url = input;
        this.method = init.method || 'GET';
        this.headers = new Headers(init.headers);
        this.body = init.body;
    }

    get url() {
        return this._url;
    }
};

global.Response = class Response {
    constructor(body, init = {}) {
        this._body = body;
        this.status = init.status || 200;
        this.statusText = init.statusText || '';
        this.headers = new Headers(init.headers);
    }

    async json() {
        return JSON.parse(this._body);
    }

    async text() {
        return this._body;
    }
};

// Mock NextRequest
jest.mock('next/server', () => ({
    NextRequest: class NextRequest extends global.Request {
        constructor(input, init = {}) {
            super(input, init);
            this.nextUrl = new URL(input);
        }
    },
    NextResponse: class NextResponse extends global.Response {
        constructor(body, init = {}) {
            super(body, init);
        }
    }
}));

// Add fetch polyfill for Next.js auth
if (!global.fetch) {
    global.fetch = jest.fn((url) => {
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ user: null, expires: null }),
            text: () => Promise.resolve('{}')
        })
    })
} 