CREATE INDEX IF NOT EXISTS "idx_vinyls_value_updated_at" ON "vinyls" ("value_updated_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_vinyls_stale_prices" ON "vinyls" ("is_deleted", "discogs_id", "value_updated_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_vinyls_updated_at" ON "vinyls" ("updated_at");
