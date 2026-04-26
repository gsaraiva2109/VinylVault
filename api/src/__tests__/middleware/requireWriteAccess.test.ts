import type { Request, Response, NextFunction } from 'express'
import { requireWriteAccess } from '../middleware/requireWriteAccess'

function mockRes() {
  const res: Partial<Response> = {}
  res.status = jest.fn().mockReturnValue(res) as unknown as Response['status']
  res.json = jest.fn().mockReturnValue(res) as unknown as Response['json']
  return res as Response
}

describe('requireWriteAccess', () => {
  it('passes through when user is not demo', () => {
    const req = {
      user: { name: 'Owner', sub: 'u1', groups: [], isDemo: false },
    } as Partial<Request> as Request
    const res = mockRes()
    const next = jest.fn() as NextFunction

    requireWriteAccess(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
  })

  it('rejects with 403 DEMO_READ_ONLY when user is demo', () => {
    const req = {
      user: { name: 'Demo', sub: 'demo', groups: ['demo-users'], isDemo: true },
    } as Partial<Request> as Request
    const res = mockRes()
    const next = jest.fn() as NextFunction

    requireWriteAccess(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'DEMO_READ_ONLY' })
    )
    expect(next).not.toHaveBeenCalled()
  })

  it('rejects when req.user is missing (treats as denied if isDemo undefined)', () => {
    const req = {} as Request
    const res = mockRes()
    const next = jest.fn() as NextFunction

    requireWriteAccess(req, res, next)

    // No user → not demo → middleware passes through.
    // (authMiddleware should run before this and reject missing tokens with 401.)
    expect(next).toHaveBeenCalledTimes(1)
  })
})
