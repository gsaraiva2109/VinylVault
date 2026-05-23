ALTER TABLE "vinyls" ADD COLUMN "genre_tags" text[];--> statement-breakpoint
ALTER TABLE "vinyls" ADD COLUMN "mood" text;--> statement-breakpoint
ALTER TABLE "vinyls" ADD COLUMN "era" text;--> statement-breakpoint
ALTER TABLE "vinyls" ADD COLUMN "tags_updated_at" bigint;--> statement-breakpoint
ALTER TABLE "vinyls" ADD COLUMN "tags_confidence" real;--> statement-breakpoint
ALTER TABLE "vinyls" ADD COLUMN "tags_source" text;