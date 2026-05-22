import { bigint, boolean, doublePrecision, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'

export const vinyls = pgTable('vinyls', {
  id:             serial('id').primaryKey(),
  discogsId:      text('discogs_id').unique(),
  title:          text('title').notNull(),
  artist:         text('artist').notNull(),
  year:           integer('year'),
  label:          text('label'),
  genre:          text('genre'),
  format:         text('format'),             // "LP", "12\"", "7\"", "EP"
  condition:      text('condition'),          // M, NM, VG+, VG, G+, G, F, P
  conditionNotes: text('condition_notes'),
  coverImageUrl:  text('cover_image_url'),    // Discogs CDN URL — no binary storage
  discogsUrl:     text('discogs_url'),
  spotifyUrl:     text('spotify_url'),
  notes:          text('notes'),
  currentValue:   doublePrecision('current_value'),  // cached from Discogs marketplace
  valueUpdatedAt: bigint('value_updated_at', { mode: 'number' }), // unix ms
  isDeleted:      boolean('is_deleted').notNull().default(false),
  deletedAt:      bigint('deleted_at', { mode: 'number' }),
  createdAt:      bigint('created_at', { mode: 'number' }).notNull().$defaultFn(() => Date.now()),
  updatedAt:      bigint('updated_at', { mode: 'number' }).notNull().$defaultFn(() => Date.now()),
  addedBy:        text('added_by'),           // Authentik display name
  addedByAvatar:  text('added_by_avatar'),    // Authentik profile picture URL
})

export const userApiKeys = pgTable('user_api_keys', {
  id:           serial('id').primaryKey(),
  userId:       text('user_id').notNull(),
  encryptedKey: text('encrypted_key').notNull(),   // AES-256-GCM ciphertext (base64)
  iv:           text('iv').notNull(),               // random IV (base64)
  authTag:      text('auth_tag').notNull(),         // GCM auth tag (base64)
  provider:     text('provider').notNull(),         // "openai" | "gemini"
  createdAt:    timestamp('created_at').defaultNow(),
  updatedAt:    timestamp('updated_at').defaultNow(),
})

export type Vinyl = typeof vinyls.$inferSelect
export type NewVinyl = typeof vinyls.$inferInsert
export type UserApiKey = typeof userApiKeys.$inferSelect
export type NewUserApiKey = typeof userApiKeys.$inferInsert
