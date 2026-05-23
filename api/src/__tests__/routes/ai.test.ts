import express from 'express'
import request from 'supertest'

// Mock encryption service
jest.mock('../../services/encryption', () => ({
  encrypt: jest.fn((plaintext: string) => ({
    ciphertext: Buffer.from(plaintext).toString('base64'),
    iv: Buffer.from('test-iv-123456').toString('base64'),
    authTag: Buffer.from('test-tag-1234567').toString('base64'),
  })),
  decrypt: jest.fn((_encrypted: { ciphertext: string; iv: string; authTag: string }) => {
    // Simple reverse of the encrypt mock
    return Buffer.from(_encrypted.ciphertext, 'base64').toString('utf8')
  }),
}))

// Mock db singleton
const mockDb = {
  delete: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  returning: jest.fn(),
}

jest.mock('../../db', () => ({
  db: mockDb,
  schema: {
    userApiKeys: {
      userId: 'user_id',
      provider: 'provider',
      encryptedKey: 'encrypted_key',
      iv: 'iv',
      authTag: 'auth_tag',
    },
  },
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { encrypt, decrypt } = require('../../services/encryption')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { db } = require('../../db')

import router from '../../routes/ai'

function makeApp() {
  const app = express()
  app.use(express.json({ limit: '5mb' }))
  // Simulate auth middleware populating req.user
  app.use((req, _res, next) => {
    ;(req as Record<string, unknown>).user = {
      name: 'Test User',
      sub: 'test-user-id',
      groups: [],
      isDemo: false,
    }
    next()
  })
  app.use('/', router)
  return app
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('POST /ai/save-key', () => {
  it('stores an encrypted API key for the authenticated user', async () => {
    mockDb.returning.mockResolvedValue([{ id: 1 }])

    const res = await request(makeApp()).post('/ai/save-key').send({
      provider: 'openai',
      apiKey: 'sk-test-key-123',
    })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
    expect(encrypt).toHaveBeenCalledWith('sk-test-key-123')
  })

  it('returns 400 when provider is missing', async () => {
    const res = await request(makeApp()).post('/ai/save-key').send({
      apiKey: 'sk-test',
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 when apiKey is missing', async () => {
    const res = await request(makeApp()).post('/ai/save-key').send({
      provider: 'openai',
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid provider', async () => {
    const res = await request(makeApp()).post('/ai/save-key').send({
      provider: 'invalid',
      apiKey: 'test',
    })
    expect(res.status).toBe(400)
  })
})

describe('POST /ai/check-key', () => {
  it('returns configured: true when key exists', async () => {
    mockDb.limit.mockResolvedValue([{ id: 1 }])

    const res = await request(makeApp()).post('/ai/check-key').send({
      provider: 'openai',
    })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ configured: true })
  })

  it('returns configured: false when key does not exist', async () => {
    mockDb.limit.mockResolvedValue([])

    const res = await request(makeApp()).post('/ai/check-key').send({
      provider: 'openai',
    })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ configured: false })
  })

  it('returns 400 when provider is missing', async () => {
    const res = await request(makeApp()).post('/ai/check-key').send({})
    expect(res.status).toBe(400)
  })
})

describe('DELETE /ai/delete-key', () => {
  it('deletes the key for the given provider', async () => {
    const res = await request(makeApp()).delete('/ai/delete-key').send({
      provider: 'openai',
    })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
  })

  it('returns 400 when provider is missing', async () => {
    const res = await request(makeApp()).delete('/ai/delete-key').send({})
    expect(res.status).toBe(400)
  })
})

describe('Rate limiting', () => {
  it('allows up to 30 recognition requests per minute then returns 429', async () => {
    // Mock DB to return an encrypted key
    mockDb.limit.mockResolvedValue([{
      id: 1,
      encryptedKey: Buffer.from('sk-fake-key').toString('base64'),
      iv: Buffer.from('test-iv-123456').toString('base64'),
      authTag: Buffer.from('test-tag-1234567').toString('base64'),
    }])

    // Mock fetch for OpenAI calls — succeed with a valid response
    const originalFetch = global.fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        choices: [{ message: { content: '{"artist":"Test","album":"Album"}' } }],
      }),
    })

    try {
      for (let i = 0; i < 30; i++) {
        const res = await request(makeApp()).post('/ai/recognize').send({
          imageBase64: 'test',
          provider: 'openai',
        })
        expect(res.status).toBe(200)
      }

      const exceeded = await request(makeApp()).post('/ai/recognize').send({
        imageBase64: 'test',
        provider: 'openai',
      })
      expect(exceeded.status).toBe(429)
      expect(exceeded.body.error).toContain('Rate limit exceeded')
    } finally {
      global.fetch = originalFetch
    }
  })
})
