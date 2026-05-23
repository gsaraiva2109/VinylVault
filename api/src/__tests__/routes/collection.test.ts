import express from 'express'
import request from 'supertest'

jest.mock('../../db', () => ({
  db: {
    select: jest.fn(),
  },
  schema: {
    vinyls: {
      isDeleted: 'is_deleted',
      currentValue: 'current_value',
      genre: 'genre',
      format: 'format',
      createdAt: 'created_at',
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

function mockChain(resolvedValue: unknown) {
  const fromMock = jest.fn().mockReturnValue({
    where: jest.fn().mockReturnValue({
      groupBy: jest.fn().mockResolvedValue(resolvedValue),
    }),
  })
  return { from: fromMock }
}

function mockChainNoGroup(resolvedValue: unknown) {
  const fromMock = jest.fn().mockReturnValue({
    where: jest.fn().mockResolvedValue(resolvedValue),
  })
  return { from: fromMock }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('GET /value', () => {
  it('returns total value, count, byGenre, byFormat correctly calculated', async () => {
    // First query: aggregate total + count (no groupBy)
    const chain1 = mockChainNoGroup([{ total: '35.5', count: '4' }])
    // Second query: genre group by
    const chain2 = mockChain([
      { genre: 'Rock', count: '2' },
      { genre: 'Jazz', count: '1' },
    ])
    // Third query: format group by
    const chain3 = mockChain([
      { format: 'LP', count: '2' },
      { format: '7"', count: '1' },
    ])

    db.select
      .mockReturnValueOnce(chain1)
      .mockReturnValueOnce(chain2)
      .mockReturnValueOnce(chain3)

    const res = await request(makeApp()).get('/value')

    expect(res.status).toBe(200)
    expect(res.body.total).toBeCloseTo(35.5)
    expect(res.body.count).toBe(4)
    expect(res.body.byGenre).toEqual({ Rock: 2, Jazz: 1 })
    expect(res.body.byFormat).toEqual({ LP: 2, '7"': 1 })
  })

  it('handles empty collection returning zero total and empty breakdowns', async () => {
    const chain1 = mockChainNoGroup([{ total: '0', count: '0' }])
    const chain2 = mockChain([])
    const chain3 = mockChain([])

    db.select
      .mockReturnValueOnce(chain1)
      .mockReturnValueOnce(chain2)
      .mockReturnValueOnce(chain3)

    const res = await request(makeApp()).get('/value')

    expect(res.status).toBe(200)
    expect(res.body.total).toBe(0)
    expect(res.body.count).toBe(0)
    expect(res.body.byGenre).toEqual({})
    expect(res.body.byFormat).toEqual({})
  })

  it('returns 500 on db error', async () => {
    db.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockRejectedValue(new Error('connection lost')),
      }),
    } as never)

    const res = await request(makeApp()).get('/value')

    expect(res.status).toBe(500)
    expect(res.body).toHaveProperty('error')
  })
})
