import { addClient, removeClient, broadcast } from '../../sse/broadcaster'
import type { Response } from 'express'

function makeRes(writeFn?: jest.Mock): Response {
  return {
    write: writeFn ?? jest.fn(),
  } as unknown as Response
}

// The broadcaster module keeps a module-level Set. We need to clear it between
// tests. Since we cannot reach the private set directly, we add and then remove
// every client we add.
describe('broadcaster', () => {
  describe('addClient', () => {
    it('adds a client so it receives broadcast messages', () => {
      const write = jest.fn()
      const client = { res: makeRes(write) }

      addClient(client)
      broadcast('test.event', { id: 1 })
      removeClient(client) // clean up

      expect(write).toHaveBeenCalledTimes(1)
      expect(write.mock.calls[0][0]).toContain('event: test.event')
    })
  })

  describe('removeClient', () => {
    it('removes a client so it no longer receives broadcasts', () => {
      const write = jest.fn()
      const client = { res: makeRes(write) }

      addClient(client)
      removeClient(client)
      broadcast('test.event', { id: 2 })

      expect(write).not.toHaveBeenCalled()
    })
  })

  describe('broadcast', () => {
    it('sends a correctly formatted SSE message to all connected clients', () => {
      const write1 = jest.fn()
      const write2 = jest.fn()
      const client1 = { res: makeRes(write1) }
      const client2 = { res: makeRes(write2) }

      addClient(client1)
      addClient(client2)

      broadcast('vinyl.created', { id: 42, title: 'Dark Side' })

      removeClient(client1)
      removeClient(client2)

      const expectedMsg = 'event: vinyl.created\ndata: {"id":42,"title":"Dark Side"}\n\n'
      expect(write1).toHaveBeenCalledWith(expectedMsg)
      expect(write2).toHaveBeenCalledWith(expectedMsg)
    })

    it('removes a client from the set if write throws an error', () => {
      const throwingWrite = jest.fn().mockImplementation(() => {
        throw new Error('write failed')
      })
      const goodWrite = jest.fn()
      const badClient = { res: makeRes(throwingWrite) }
      const goodClient = { res: makeRes(goodWrite) }

      addClient(badClient)
      addClient(goodClient)

      // First broadcast — bad client throws, gets removed; good client receives
      broadcast('test.event', { x: 1 })

      // Second broadcast — only good client should receive
      broadcast('test.event', { x: 2 })

      removeClient(goodClient) // clean up

      // Good client received both messages; bad client only had write called once
      // (after which it was evicted)
      expect(goodWrite).toHaveBeenCalledTimes(2)
      expect(throwingWrite).toHaveBeenCalledTimes(1)
    })
  })
})
