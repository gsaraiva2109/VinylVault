import type { Request, Response, NextFunction } from 'express'

// Must be hoisted before any imports that touch the module
jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(() => 'mock-keyset'),
  jwtVerify: jest.fn(),
}))

import { createRemoteJWKSet, jwtVerify } from 'jose'

const mockCreateRemoteJWKSet = createRemoteJWKSet as jest.MockedFunction<typeof createRemoteJWKSet>
const mockJwtVerify = jwtVerify as jest.MockedFunction<typeof jwtVerify>

// Helper to build minimal mock Express objects
function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    query: {},
    user: undefined,
    ...overrides,
  } as unknown as Request
}

function makeRes(): Response {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response
  return res
}

function makeNext(): NextFunction {
  return jest.fn()
}

// We re-require the module in each describe block so that the top-level
// constants (AUTH_ENABLED, DEV_AUTH_TOKEN, AUTHENTIK_JWKS_URL) are re-evaluated
// from the current process.env state.
function loadMiddleware() {
  jest.resetModules()
  // Re-mock jose after resetModules
  jest.mock('jose', () => ({
    createRemoteJWKSet: mockCreateRemoteJWKSet,
    jwtVerify: mockJwtVerify,
  }))
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../../middleware/auth').authMiddleware as (
    req: Request,
    res: Response,
    next: NextFunction
  ) => Promise<void>
}

describe('authMiddleware', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset env to baseline
    process.env = { ...originalEnv }
    delete process.env.AUTH_ENABLED
    delete process.env.DEV_AUTH_TOKEN
    delete process.env.AUTHENTIK_JWKS_URL
    delete process.env.AUTHENTIK_ISSUER
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('when AUTH_ENABLED=false', () => {
    it('calls next() immediately without checking token', async () => {
      process.env.AUTH_ENABLED = 'false'
      const authMiddleware = loadMiddleware()

      const req = makeReq()
      const res = makeRes()
      const next = makeNext()

      await authMiddleware(req, res, next)

      expect(next).toHaveBeenCalledTimes(1)
      expect(res.status).not.toHaveBeenCalled()
    })
  })

  describe('DEV_AUTH_TOKEN bypass', () => {
    beforeEach(() => {
      process.env.DEV_AUTH_TOKEN = 'supersecret'
      process.env.AUTH_ENABLED = 'true'
    })

    it('sets req.user to dev and calls next when Bearer header matches DEV_AUTH_TOKEN', async () => {
      const authMiddleware = loadMiddleware()

      const req = makeReq({ headers: { authorization: 'Bearer supersecret' } })
      const res = makeRes()
      const next = makeNext()

      await authMiddleware(req, res, next)

      expect(next).toHaveBeenCalledTimes(1)
      expect((req as any).user).toEqual({ name: 'Developer', sub: 'dev' })
    })

    it('sets req.user to dev and calls next when query param token matches DEV_AUTH_TOKEN', async () => {
      const authMiddleware = loadMiddleware()

      const req = makeReq({ query: { token: 'supersecret' } })
      const res = makeRes()
      const next = makeNext()

      await authMiddleware(req, res, next)

      expect(next).toHaveBeenCalledTimes(1)
      expect((req as any).user).toEqual({ name: 'Developer', sub: 'dev' })
    })
  })

  describe('missing token', () => {
    beforeEach(() => {
      process.env.AUTH_ENABLED = 'true'
    })

    it('returns 401 with Missing Bearer token when no authorization header and no query token', async () => {
      const authMiddleware = loadMiddleware()

      const req = makeReq()
      const res = makeRes()
      const next = makeNext()

      await authMiddleware(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing Bearer token' })
      expect(next).not.toHaveBeenCalled()
    })
  })

  describe('no AUTHENTIK_JWKS_URL (misconfigured)', () => {
    beforeEach(() => {
      process.env.AUTH_ENABLED = 'true'
      // no AUTHENTIK_JWKS_URL set
    })

    it('returns 500 when token is a valid JWT but JWKS URL is not configured', async () => {
      const authMiddleware = loadMiddleware()

      const payload = { name: 'Test User', sub: 'user-123', picture: 'https://pic.url' }
      const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
      const fakeJwt = `header.${encoded}.signature`

      const req = makeReq({ headers: { authorization: `Bearer ${fakeJwt}` } })
      const res = makeRes()
      const next = makeNext()

      await authMiddleware(req, res, next)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' })
      expect(next).not.toHaveBeenCalled()
    })

    it('returns 500 when token is invalid and JWKS URL is not configured', async () => {
      const authMiddleware = loadMiddleware()

      const req = makeReq({ headers: { authorization: 'Bearer notavalidjwt' } })
      const res = makeRes()
      const next = makeNext()

      await authMiddleware(req, res, next)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' })
      expect(next).not.toHaveBeenCalled()
    })
  })

  describe('with AUTHENTIK_JWKS_URL set', () => {
    beforeEach(() => {
      process.env.AUTH_ENABLED = 'true'
      process.env.AUTHENTIK_JWKS_URL = 'https://auth.example.com/jwks'
    })

    it('extracts user from payload when token is valid', async () => {
      mockCreateRemoteJWKSet.mockReturnValue('mock-keyset' as any)
      mockJwtVerify.mockResolvedValue({
        payload: {
          name: 'Jane Doe',
          sub: 'jane-sub',
          picture: 'https://avatar.url',
        },
        protectedHeader: {} as any,
      } as any)

      const authMiddleware = loadMiddleware()

      const req = makeReq({ headers: { authorization: 'Bearer valid.jwt.token' } })
      const res = makeRes()
      const next = makeNext()

      await authMiddleware(req, res, next)

      expect(next).toHaveBeenCalledTimes(1)
      expect((req as any).user).toEqual({
        name: 'Jane Doe',
        sub: 'jane-sub',
        picture: 'https://avatar.url',
      })
    })

    it('returns 401 with Invalid or expired token when verification fails', async () => {
      mockCreateRemoteJWKSet.mockReturnValue('mock-keyset' as any)
      mockJwtVerify.mockRejectedValue(new Error('signature verification failed'))

      const authMiddleware = loadMiddleware()

      const req = makeReq({ headers: { authorization: 'Bearer bad.jwt.token' } })
      const res = makeRes()
      const next = makeNext()

      await authMiddleware(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' })
      expect(next).not.toHaveBeenCalled()
    })
  })
})
