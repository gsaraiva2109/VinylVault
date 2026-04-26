import express from 'express'
import request from 'supertest'

jest.mock('../../services/discogs', () => ({
  discogsGet: jest.fn(),
  refreshStalePrices: jest.fn().mockResolvedValue({ updated: 0, errors: 0 }),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { discogsGet, refreshStalePrices } = require('../../services/discogs')

import router from '../../routes/discogs'
import { _resetRefreshCooldownForTests } from '../../middleware/refreshCooldown'

function makeApp() {
  const app = express()
  app.use(express.json())
  app.use('/', router)
  return app
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('GET /search', () => {
  it('returns 400 when q parameter is missing', async () => {
    const res = await request(makeApp()).get('/search')

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error', 'q parameter required')
  })

  it('returns 400 when q parameter exceeds 500 characters', async () => {
    const res = await request(makeApp()).get(`/search?q=${'a'.repeat(501)}`)

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error', 'q parameter too long')
  })

  it('returns mapped results from Discogs API', async () => {
    const discogsResponse = {
      results: [
        {
          id: 123,
          title: 'Artist Name - Album Title',
          year: '1979',
          label: ['Capitol Records'],
          genre: ['Rock'],
          cover_image: 'https://img.discogs.com/cover.jpg',
        },
        {
          id: 456,
          title: 'Another Artist - Another Album',
          year: '1985',
          label: 'Some Label',
          genre: 'Jazz',
          cover_image: null,
        },
      ],
    }
    discogsGet.mockResolvedValue(discogsResponse)

    const res = await request(makeApp()).get('/search?q=test+query')

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body[0]).toMatchObject({
      id: '123',
      title: 'Artist Name - Album Title',
      artist: 'Artist Name',
      year: 1979,
      label: 'Capitol Records',
      genre: 'Rock',
      coverImage: 'https://img.discogs.com/cover.jpg',
    })
    expect(res.body[1]).toMatchObject({
      id: '456',
      label: 'Some Label',
      genre: 'Jazz',
      coverImage: null,
    })
  })

  it('returns 502 when discogsGet throws', async () => {
    discogsGet.mockRejectedValue(new Error('network error'))

    const res = await request(makeApp()).get('/search?q=error')

    expect(res.status).toBe(502)
    expect(res.body).toHaveProperty('error')
  })
})

describe('GET /release/:id', () => {
  it('returns 400 when id is not a number', async () => {
    const res = await request(makeApp()).get('/release/not-a-number')

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error', 'Invalid release ID')
  })

  it('returns merged release data and stats', async () => {
    const releaseData = {
      id: 789,
      title: 'Dark Side of the Moon',
      artists_sort: 'Pink Floyd',
      year: 1973,
      labels: [{ name: 'Harvest' }],
      genres: ['Progressive Rock'],
      images: [{ uri: 'https://img.discogs.com/release.jpg' }],
      lowest_price: null,
    }
    const statsData = {
      lowest_price: { value: 12.5 },
    }
    discogsGet
      .mockResolvedValueOnce(releaseData)
      .mockResolvedValueOnce(statsData)

    const res = await request(makeApp()).get('/release/789')

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      id: '789',
      title: 'Dark Side of the Moon',
      artist: 'Pink Floyd',
      year: 1973,
      label: 'Harvest',
      genre: 'Progressive Rock',
      coverImage: 'https://img.discogs.com/release.jpg',
      lowestPrice: 12.5,
    })
  })

  it('returns 502 when discogsGet throws', async () => {
    discogsGet.mockRejectedValue(new Error('API unreachable'))

    const res = await request(makeApp()).get('/release/999')

    expect(res.status).toBe(502)
    expect(res.body).toHaveProperty('error')
  })
})

describe('POST /refresh-prices', () => {
  beforeEach(() => {
    _resetRefreshCooldownForTests()
  })

  it('responds immediately with a started message', async () => {
    const res = await request(makeApp()).post('/refresh-prices').send({})

    expect(res.status).toBe(200)
    expect(res.body.message).toContain('Price refresh started')
  })

  it('calls refreshStalePrices in the background', async () => {
    // Give the event loop a tick to run the background call
    await request(makeApp()).post('/refresh-prices').send({ stalePeriodHours: 12 })
    await new Promise((r) => setImmediate(r))

    expect(refreshStalePrices).toHaveBeenCalledWith(12 * 60 * 60 * 1000)
  })

  it('uses default 24h stale period when stalePeriodHours not provided', async () => {
    await request(makeApp()).post('/refresh-prices').send({})
    await new Promise((r) => setImmediate(r))

    expect(refreshStalePrices).toHaveBeenCalledWith(24 * 60 * 60 * 1000)
  })
})
