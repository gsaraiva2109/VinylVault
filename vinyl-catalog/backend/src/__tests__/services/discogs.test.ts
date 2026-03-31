import type { IncomingMessage, ClientRequest } from 'http'
import { EventEmitter } from 'events'

// Helper to create a mock IncomingMessage that emits data then end
function makeResponse(body: string): IncomingMessage {
  const res = new EventEmitter() as IncomingMessage
  process.nextTick(() => {
    res.emit('data', body)
    res.emit('end')
  })
  return res
}

// Helper to create a mock ClientRequest (needed for req.on('error', ...))
function makeRequest(): ClientRequest {
  return new EventEmitter() as ClientRequest
}

// Each test calls jest.resetModules() and re-requires the service so that
// process.env changes take effect. We set up the https mock via jest.mock()
// before each individual require.

describe('discogsGet', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv }
    delete process.env.DISCOGS_TOKEN
  })

  afterEach(() => {
    jest.resetModules()
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('makes an HTTPS GET to the correct URL with User-Agent header', async () => {
    const getMock = jest.fn((_url: string, _options: object, callback?: Function) => {
      const res = makeResponse(JSON.stringify({ ok: true }))
      if (callback) callback(res)
      return makeRequest()
    })

    jest.mock('https', () => ({ get: getMock }))
    const { discogsGet } = require('../../services/discogs')

    await discogsGet('/database/search?q=test')

    expect(getMock).toHaveBeenCalledTimes(1)
    const [url, options] = getMock.mock.calls[0] as [string, { headers: Record<string, string> }]
    expect(url).toBe('https://api.discogs.com/database/search?q=test')
    expect(options.headers['User-Agent']).toContain('VinylVaultApp')
  })

  it('includes Authorization header when DISCOGS_TOKEN is set', async () => {
    process.env.DISCOGS_TOKEN = 'mytoken123'

    const getMock = jest.fn((_url: string, _options: object, callback?: Function) => {
      const res = makeResponse(JSON.stringify({ data: true }))
      if (callback) callback(res)
      return makeRequest()
    })

    jest.mock('https', () => ({ get: getMock }))
    const { discogsGet } = require('../../services/discogs')

    await discogsGet('/marketplace/stats/123')

    const [_url, options] = getMock.mock.calls[0] as [string, { headers: Record<string, string> }]
    expect(options.headers['Authorization']).toBe('Discogs token=mytoken123')
  })

  it('does NOT include Authorization header when DISCOGS_TOKEN is not set', async () => {
    // DISCOGS_TOKEN is explicitly deleted in beforeEach
    const getMock = jest.fn((_url: string, _options: object, callback?: Function) => {
      const res = makeResponse(JSON.stringify({}))
      if (callback) callback(res)
      return makeRequest()
    })

    jest.mock('https', () => ({ get: getMock }))
    const { discogsGet } = require('../../services/discogs')

    await discogsGet('/releases/1')

    const [_url, options] = getMock.mock.calls[0] as [string, { headers: Record<string, string> }]
    expect(options.headers['Authorization']).toBeUndefined()
  })

  it('parses and resolves JSON response', async () => {
    const payload = { results: [{ id: 1, title: 'Test' }] }

    const getMock = jest.fn((_url: string, _options: object, callback?: Function) => {
      const res = makeResponse(JSON.stringify(payload))
      if (callback) callback(res)
      return makeRequest()
    })

    jest.mock('https', () => ({ get: getMock }))
    const { discogsGet } = require('../../services/discogs')

    const result = await discogsGet('/releases/1')

    expect(result).toEqual(payload)
  })

  it('rejects when JSON response cannot be parsed', async () => {
    const getMock = jest.fn((_url: string, _options: object, callback?: Function) => {
      const res = makeResponse('not valid json {{{')
      if (callback) callback(res)
      return makeRequest()
    })

    jest.mock('https', () => ({ get: getMock }))
    const { discogsGet } = require('../../services/discogs')

    await expect(discogsGet('/releases/bad')).rejects.toThrow('Discogs JSON parse failed')
  })

  it('rejects on request error', async () => {
    const getMock = jest.fn((_url: string, _options: object, _callback?: Function) => {
      const req = makeRequest()
      process.nextTick(() => req.emit('error', new Error('ECONNREFUSED')))
      return req
    })

    jest.mock('https', () => ({ get: getMock }))
    const { discogsGet } = require('../../services/discogs')

    await expect(discogsGet('/releases/error')).rejects.toThrow('ECONNREFUSED')
  })
})
