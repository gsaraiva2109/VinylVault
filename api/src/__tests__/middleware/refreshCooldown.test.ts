import type { Request, Response, NextFunction } from 'express'
import { priceRefreshCooldown, _resetRefreshCooldownForTests } from '../middleware/refreshCooldown'

function mockRes() {
  const res: Partial<Response> = {}
  res.status = jest.fn().mockReturnValue(res) as unknown as Response['status']
  res.json = jest.fn().mockReturnValue(res) as unknown as Response['json']
  res.setHeader = jest.fn().mockReturnValue(res) as unknown as Response['setHeader']
  return res as Response
}

describe('priceRefreshCooldown', () => {
  beforeEach(() => {
    _resetRefreshCooldownForTests()
    delete process.env.PRICE_REFRESH_COOLDOWN_MS
  })

  it('passes through on first call and records timestamp', () => {
    const req = {} as Request
    const res = mockRes()
    const next = jest.fn() as NextFunction

    priceRefreshCooldown(req, res, next)
    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
  })

  it('returns 429 with Retry-After when called within cooldown window', () => {
    process.env.PRICE_REFRESH_COOLDOWN_MS = '300000' // 5 min
    const req = {} as Request

    const firstRes = mockRes()
    priceRefreshCooldown(req, firstRes, jest.fn() as NextFunction)

    const secondRes = mockRes()
    const secondNext = jest.fn() as NextFunction
    priceRefreshCooldown(req, secondRes, secondNext)

    expect(secondRes.status).toHaveBeenCalledWith(429)
    expect(secondRes.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String))
    expect(secondRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'REFRESH_COOLDOWN', retryAfterSeconds: expect.any(Number) })
    )
    expect(secondNext).not.toHaveBeenCalled()
  })

  it('passes through again after cooldown elapses', () => {
    process.env.PRICE_REFRESH_COOLDOWN_MS = '50' // 50 ms
    const req = {} as Request

    priceRefreshCooldown(req, mockRes(), jest.fn() as NextFunction)

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const res = mockRes()
        const next = jest.fn() as NextFunction
        priceRefreshCooldown(req, res, next)
        expect(next).toHaveBeenCalledTimes(1)
        expect(res.status).not.toHaveBeenCalled()
        resolve()
      }, 80)
    })
  })
})
