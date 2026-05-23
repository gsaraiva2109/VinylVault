import type { Response } from 'express'

type SSEClient = { res: Response }

const clients = new Set<SSEClient>()

export function addClient(client: SSEClient): void {
  clients.add(client)
}

export function removeClient(client: SSEClient): void {
  clients.delete(client)
}

export function broadcast(event: string, data: unknown): void {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  for (const client of clients) {
    try {
      const ok = client.res.write(msg)
      if (!ok && typeof client.res.once === 'function') {
        client.res.once('drain', () => { /* backpressure cleared */ })
      }
    } catch {
      clients.delete(client)
    }
  }
}
