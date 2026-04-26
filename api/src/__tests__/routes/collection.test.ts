import express from 'express'
import request from 'supertest'

jest.mock('../../db', () => ({
  db: {
    select: jest.fn(),
  },
  schema: {
    vinyls: {
      isDeleted: 'is_deleted',
    },
  },
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { db } = require('../../db')

import router from '../../routes/collection'

function makeApp() {
  const app = express()
  app.use(express.json())
  app.use('/', router)
  return app
}

function mockSelectChain(resolvedValue: unknown[]) {
  const whereMock = jest.fn().mockResolvedValue(resolvedValue)
  const fromMock = jest.fn().mockReturnValue({ where: whereMock })
  db.select.mockReturnValue({ from: fromMock })
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('GET /value', () => {
  it('returns total value, count, byGenre, byFormat correctly calculated from vinyl array', async () => {
    const vinyls = [
      { id: 1, currentValue: 10.5, genre: 'Rock', format: 'LP' },
      { id: 2, currentValue: 20.0, genre: 'Rock', format: 'LP' },
      { id: 3, currentValue: 5.0, genre: 'Jazz', format: '7"' },
      { id: 4, currentValue: null, genre: null, format: null },
    ]
    mockSelectChain(vinyls)

    const res = await request(makeApp()).get('/value')

    expect(res.status).toBe(200)
    expect(res.body.total).toBeCloseTo(35.5)
    expect(res.body.count).toBe(4)
    expect(res.body.byGenre).toEqual({ Rock: 2, Jazz: 1 })
    expect(res.body.byFormat).toEqual({ LP: 2, '7"': 1 })
  })

  it('handles empty collection returning zero total and empty breakdowns', async () => {
    mockSelectChain([])

    const res = await request(makeApp()).get('/value')

    expect(res.status).toBe(200)
    expect(res.body.total).toBe(0)
    expect(res.body.count).toBe(0)
    expect(res.body.byGenre).toEqual({})
    expect(res.body.byFormat).toEqual({})
  })

  it('returns 500 on db error', async () => {
    const whereMock = jest.fn().mockRejectedValue(new Error('connection lost'))
    const fromMock = jest.fn().mockReturnValue({ where: whereMock })
    db.select.mockReturnValue({ from: fromMock })

    const res = await request(makeApp()).get('/value')

    expect(res.status).toBe(500)
    expect(res.body).toHaveProperty('error')
  })
})
