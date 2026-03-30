import express from 'express'
import request from 'supertest'

// --- Mocks must be declared before importing the module under test ---

jest.mock('../../db', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  schema: {
    vinyls: {
      id: 'id',
      isDeleted: 'is_deleted',
    },
  },
}))

jest.mock('../../sse/broadcaster', () => ({
  broadcast: jest.fn(),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { db } = require('../../db')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { broadcast } = require('../../sse/broadcaster')

import router from '../../routes/vinyls'

// ---- helpers ----------------------------------------------------------------

function makeApp() {
  const app = express()
  app.use(express.json())
  // Inject mock authenticated user so route handlers can read req.user
  app.use((_req, _res, next) => {
    (_req as any).user = { name: 'Test User', sub: 'test-id' }
    next()
  })
  app.use('/', router)
  return app
}

function mockSelectChain(resolvedValue: unknown[]) {
  const whereMock = jest.fn().mockResolvedValue(resolvedValue)
  const fromMock = jest.fn().mockReturnValue({ where: whereMock })
  db.select.mockReturnValue({ from: fromMock })
  return { whereMock, fromMock }
}

function mockInsertChain(resolvedValue: unknown[]) {
  const returningMock = jest.fn().mockResolvedValue(resolvedValue)
  const valuesMock = jest.fn().mockReturnValue({ returning: returningMock })
  db.insert.mockReturnValue({ values: valuesMock })
  return { returningMock, valuesMock }
}

function mockUpdateChain(resolvedValue: unknown[]) {
  const returningMock = jest.fn().mockResolvedValue(resolvedValue)
  const whereMock = jest.fn().mockReturnValue({ returning: returningMock })
  const setMock = jest.fn().mockReturnValue({ where: whereMock })
  db.update.mockReturnValue({ set: setMock })
  return { returningMock, whereMock, setMock }
}

function mockDeleteChain() {
  const whereMock = jest.fn().mockResolvedValue([])
  db.delete.mockReturnValue({ where: whereMock })
  return { whereMock }
}

// ---- tests ------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks()
})

describe('GET /', () => {
  it('returns array of active vinyls with status 200', async () => {
    const fakeVinyls = [{ id: 1, title: 'Test', artist: 'Artist', isDeleted: false }]
    mockSelectChain(fakeVinyls)

    const res = await request(makeApp()).get('/')

    expect(res.status).toBe(200)
    expect(res.body).toEqual(fakeVinyls)
  })

  it('returns 500 on db error', async () => {
    const whereMock = jest.fn().mockRejectedValue(new Error('db error'))
    const fromMock = jest.fn().mockReturnValue({ where: whereMock })
    db.select.mockReturnValue({ from: fromMock })

    const res = await request(makeApp()).get('/')
    expect(res.status).toBe(500)
  })
})

describe('GET /trash', () => {
  it('returns trashed vinyls with status 200', async () => {
    const fakeVinyls = [{ id: 2, title: 'Trashed', artist: 'Artist', isDeleted: true }]
    mockSelectChain(fakeVinyls)

    const res = await request(makeApp()).get('/trash')

    expect(res.status).toBe(200)
    expect(res.body).toEqual(fakeVinyls)
  })
})

describe('GET /:id', () => {
  it('returns vinyl when found', async () => {
    const vinyl = { id: 1, title: 'Found', artist: 'Artist', isDeleted: false }
    mockSelectChain([vinyl])

    const res = await request(makeApp()).get('/1')

    expect(res.status).toBe(200)
    expect(res.body).toEqual(vinyl)
  })

  it('returns 404 when vinyl not found', async () => {
    mockSelectChain([])

    const res = await request(makeApp()).get('/999')

    expect(res.status).toBe(404)
    expect(res.body).toHaveProperty('error', 'Not found')
  })

  it('returns 400 when id is not a number', async () => {
    const res = await request(makeApp()).get('/abc')

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error', 'Invalid id')
  })
})

describe('POST /', () => {
  it('creates a vinyl and returns 201 with the created record', async () => {
    const created = { id: 10, title: 'New Vinyl', artist: 'Artist', isDeleted: false }
    mockInsertChain([created])

    const res = await request(makeApp())
      .post('/')
      .send({ title: 'New Vinyl', artist: 'Artist' })

    expect(res.status).toBe(201)
    expect(res.body).toEqual(created)
    expect(broadcast).toHaveBeenCalledWith('vinyl.created', created)
  })

  it('returns 400 when title is missing', async () => {
    const res = await request(makeApp())
      .post('/')
      .send({ artist: 'Artist' })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error', 'title is required')
  })

  it('returns 400 when artist is missing', async () => {
    const res = await request(makeApp())
      .post('/')
      .send({ title: 'Some Title' })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error', 'artist is required')
  })

  it('returns 400 when condition is invalid', async () => {
    const res = await request(makeApp())
      .post('/')
      .send({ title: 'Title', artist: 'Artist', condition: 'INVALID' })

    expect(res.status).toBe(400)
    expect(res.body.error).toContain('condition must be one of')
  })

  it('returns 400 when a string field exceeds max length', async () => {
    const res = await request(makeApp())
      .post('/')
      .send({ title: 'T'.repeat(1001), artist: 'Artist' })

    expect(res.status).toBe(400)
    expect(res.body.error).toContain('title exceeds maximum length')
  })
})

describe('PATCH /:id', () => {
  it('updates vinyl and returns updated record', async () => {
    const updated = { id: 1, title: 'Updated', artist: 'Artist', isDeleted: false }
    mockUpdateChain([updated])

    const res = await request(makeApp())
      .patch('/1')
      .send({ title: 'Updated' })

    expect(res.status).toBe(200)
    expect(res.body).toEqual(updated)
    expect(broadcast).toHaveBeenCalledWith('vinyl.updated', updated)
  })

  it('returns 400 when no updatable fields provided', async () => {
    const res = await request(makeApp())
      .patch('/1')
      .send({ unknownField: 'value' })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error', 'No updatable fields provided')
  })

  it('returns 404 when vinyl not found', async () => {
    mockUpdateChain([])

    const res = await request(makeApp())
      .patch('/999')
      .send({ title: 'Ghost' })

    expect(res.status).toBe(404)
    expect(res.body).toHaveProperty('error', 'Not found')
  })

  it('returns 400 when condition is invalid', async () => {
    const res = await request(makeApp())
      .patch('/1')
      .send({ condition: 'BAD' })

    expect(res.status).toBe(400)
    expect(res.body.error).toContain('condition must be one of')
  })
})

describe('DELETE /:id', () => {
  it('soft-deletes vinyl and returns updated record', async () => {
    const deleted = { id: 1, title: 'Vinyl', isDeleted: true }
    mockUpdateChain([deleted])

    const res = await request(makeApp()).delete('/1')

    expect(res.status).toBe(200)
    expect(res.body).toEqual(deleted)
    expect(broadcast).toHaveBeenCalledWith('vinyl.deleted', deleted)
  })

  it('returns 404 when vinyl not found or already deleted', async () => {
    mockUpdateChain([])

    const res = await request(makeApp()).delete('/999')

    expect(res.status).toBe(404)
    expect(res.body.error).toContain('Not found')
  })
})

describe('POST /:id/recover', () => {
  it('recovers trashed vinyl and returns recovered record', async () => {
    const recovered = { id: 5, title: 'Recovered', isDeleted: false }
    mockUpdateChain([recovered])

    const res = await request(makeApp()).post('/5/recover')

    expect(res.status).toBe(200)
    expect(res.body).toEqual(recovered)
    expect(broadcast).toHaveBeenCalledWith('vinyl.recovered', recovered)
  })

  it('returns 404 when vinyl not found in trash', async () => {
    mockUpdateChain([])

    const res = await request(makeApp()).post('/999/recover')

    expect(res.status).toBe(404)
    expect(res.body).toHaveProperty('error', 'Not found in trash')
  })
})

describe('DELETE /:id/permanent', () => {
  it('permanently deletes vinyl and returns 204', async () => {
    mockDeleteChain()

    const res = await request(makeApp()).delete('/1/permanent')

    expect(res.status).toBe(204)
    expect(broadcast).toHaveBeenCalledWith('vinyl.permanentlyDeleted', { id: 1 })
  })
})
