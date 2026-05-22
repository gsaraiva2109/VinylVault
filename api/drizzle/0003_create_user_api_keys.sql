CREATE TABLE IF NOT EXISTS "user_api_keys" (
  "id" serial PRIMARY KEY,
  "user_id" text NOT NULL,
  "encrypted_key" text NOT NULL,
  "iv" text NOT NULL,
  "auth_tag" text NOT NULL,
  "provider" text NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_api_keys_user_id_provider_idx" ON "user_api_keys" ("user_id", "provider");
