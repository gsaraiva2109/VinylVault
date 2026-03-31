// Mock the utils module before importing api.ts so isTauri() returns false
jest.mock('../../lib/utils', () => ({
  isTauri: () => false,
  cn: (...args: unknown[]) => args.join(' '),
}))

import { isTokenExpired, UnauthorizedError, fetchApi } from '../../lib/api'

// ---- helpers ----------------------------------------------------------------

function makeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${header}.${body}.fakesignature`
}

function mockFetch(response: {
  status: number
  ok: boolean
  statusText?: string
  body?: unknown
  textBody?: string
}) {
  global.fetch = jest.fn().mockResolvedValue({
    status: response.status,
    ok: response.ok,
    statusText: response.statusText ?? '',
    text: jest.fn().mockResolvedValue(response.textBody ?? JSON.stringify(response.body ?? {})),
    json: jest.fn().mockResolvedValue(response.body ?? {}),
  })
}

afterEach(() => {
  jest.restoreAllMocks()
})

// ---- isTokenExpired --------------------------------------------------------

describe('isTokenExpired', () => {
  it('returns false for a valid (non-expired) token', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
    const token = makeJwt({ exp: futureExp, sub: 'user-1' })
    expect(isTokenExpired(token)).toBe(false)
  })

  it('returns true for an expired token', () => {
    const pastExp = Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
    const token = makeJwt({ exp: pastExp, sub: 'user-1' })
    expect(isTokenExpired(token)).toBe(true)
  })

  it('returns true for an invalid JWT string', () => {
    expect(isTokenExpired('not.a.valid.jwt.at.all')).toBe(true)
  })

  it('returns true for an empty string', () => {
    expect(isTokenExpired('')).toBe(true)
  })
})

// ---- UnauthorizedError -----------------------------------------------------

describe('UnauthorizedError', () => {
  it('has the name UnauthorizedError', () => {
    const err = new UnauthorizedError()
    expect(err.name).toBe('UnauthorizedError')
  })

  it('has the correct message', () => {
    const err = new UnauthorizedError()
    expect(err.message).toBe('Session expired or unauthorized')
  })

  it('is an instance of Error', () => {
    const err = new UnauthorizedError()
    expect(err instanceof Error).toBe(true)
  })
})

// ---- fetchApi --------------------------------------------------------------

describe('fetchApi', () => {
  it('throws UnauthorizedError on 401 response', async () => {
    mockFetch({ status: 401, ok: false, statusText: 'Unauthorized' })

    await expect(fetchApi('/api/vinyls')).rejects.toBeInstanceOf(UnauthorizedError)
  })

  it('throws a generic Error on non-ok, non-401 response', async () => {
    mockFetch({ status: 500, ok: false, statusText: 'Internal Server Error', textBody: 'oops' })

    await expect(fetchApi('/api/vinyls')).rejects.toThrow('API error: 500')
  })

  it('returns null on 204 No Content response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 204,
      ok: true,
      statusText: 'No Content',
      text: jest.fn().mockResolvedValue(''),
      json: jest.fn(),
    })

    const result = await fetchApi('/api/vinyls/1', { method: 'DELETE' })
    expect(result).toBeNull()
  })

  it('returns parsed JSON on successful response', async () => {
    const payload = [{ id: 1, title: 'Rumours', artist: 'Fleetwood Mac' }]
    mockFetch({ status: 200, ok: true, body: payload })

    const result = await fetchApi('/api/vinyls')
    expect(result).toEqual(payload)
  })

  it('includes Authorization header when token is provided', async () => {
    const payload = { id: 1 }
    mockFetch({ status: 200, ok: true, body: payload })

    await fetchApi('/api/vinyls', {}, 'my-bearer-token')

    expect(global.fetch).toHaveBeenCalledTimes(1)
    const callArgs = (global.fetch as jest.Mock).mock.calls[0]
    const headers = callArgs[1].headers as Record<string, string>
    expect(headers['Authorization']).toBe('Bearer my-bearer-token')
  })

  it('does not include Authorization header when no token is provided', async () => {
    mockFetch({ status: 200, ok: true, body: {} })

    await fetchApi('/api/vinyls')

    const callArgs = (global.fetch as jest.Mock).mock.calls[0]
    const headers = callArgs[1].headers as Record<string, string>
    expect(headers['Authorization']).toBeUndefined()
  })
})
