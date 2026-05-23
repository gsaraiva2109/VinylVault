import { encrypt, decrypt } from '../../services/encryption'

const VALID_KEY = 'a'.repeat(64) // 32 bytes as hex

beforeEach(() => {
  process.env.ENCRYPTION_KEY = VALID_KEY
})

afterEach(() => {
  delete process.env.ENCRYPTION_KEY
})

describe('encrypt', () => {
  it('returns ciphertext, iv, and authTag as base64 strings', () => {
    const result = encrypt('hello world')
    expect(result).toHaveProperty('ciphertext')
    expect(result).toHaveProperty('iv')
    expect(result).toHaveProperty('authTag')
    expect(typeof result.ciphertext).toBe('string')
    expect(typeof result.iv).toBe('string')
    expect(typeof result.authTag).toBe('string')
  })

  it('produces different ciphertext for same plaintext (random IV)', () => {
    const a = encrypt('same text')
    const b = encrypt('same text')
    expect(a.ciphertext).not.toBe(b.ciphertext)
  })

  it('throws when ENCRYPTION_KEY is missing', () => {
    delete process.env.ENCRYPTION_KEY
    expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY')
  })

  it('throws when ENCRYPTION_KEY is wrong length', () => {
    process.env.ENCRYPTION_KEY = 'short'
    expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY')
  })
})

describe('decrypt', () => {
  it('round-trips encrypted data correctly', () => {
    const plaintext = 'sk-abc123def456ghi789'
    const encrypted = encrypt(plaintext)
    const decrypted = decrypt(encrypted)
    expect(decrypted).toBe(plaintext)
  })

  it('round-trips with empty string', () => {
    const encrypted = encrypt('')
    const decrypted = decrypt(encrypted)
    expect(decrypted).toBe('')
  })

  it('round-trips with unicode text', () => {
    const original = 'APIキー🔑テスト'
    const encrypted = encrypt(original)
    const decrypted = decrypt(encrypted)
    expect(decrypted).toBe(original)
  })

  it('throws when decrypting with wrong key', () => {
    const encrypted = encrypt('sensitive data')
    process.env.ENCRYPTION_KEY = 'b'.repeat(64) // different key
    expect(() => decrypt(encrypted)).toThrow()
  })

  it('throws when IV is tampered with', () => {
    const encrypted = encrypt('data')
    encrypted.iv = Buffer.from('tampered-iv-12').toString('base64')
    expect(() => decrypt(encrypted)).toThrow()
  })

  it('throws when authTag is tampered with', () => {
    const encrypted = encrypt('data')
    encrypted.authTag = Buffer.from('tampered-tag!!!!').toString('base64')
    expect(() => decrypt(encrypted)).toThrow()
  })

  it('throws when ENCRYPTION_KEY is missing', () => {
    const encrypted = encrypt('test')
    delete process.env.ENCRYPTION_KEY
    expect(() => decrypt(encrypted)).toThrow('ENCRYPTION_KEY')
  })
})
