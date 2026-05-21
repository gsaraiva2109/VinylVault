# Feature Ideas — Future Implementation

Saved 2026-05-21 from codebase analysis session.

## CSV Import/Export

**Import:** Parse CSV with columns matching vinyls schema (title, artist, year, label, genre, format, condition, notes, discogsId). Validate each row via existing `validateStringFields`/`validateCondition` helpers. Return summary: {created, skipped, errors[]}. Add API route `POST /api/vinyls/import` accepting multipart/form-data. Frontend: drag-and-drop CSV upload with preview table before confirming import.

**Export:** `GET /api/vinyls/export?format=csv` — stream all active vinyls as CSV. Use existing `db.select().from(schema.vinyls).where(eq(schema.vinyls.isDeleted, false))`. Frontend: download button in collection toolbar.

**Why:** Migration path from Discogs exports, spreadsheets, other catalog tools. Low effort, unlocks user acquisition.

---

## Collection Value Trend Chart

**Data already exists:** `currentValue` (double) + `valueUpdatedAt` (unix ms) on vinyls table. The nightly Discogs price refresh cron already updates these.

**Approach:** Add `GET /api/collection/value-history` that queries vinyls with non-null currentValue, groups by month, returns `{month, totalValue, count}`. Frontend: recharts or chart.js line chart on the collection stats page.

**Extras:** Show top gainers/losers since last refresh. Genre breakdown pie chart.

**Why:** Users track collection as investment. Trend visualization = sticky feature.

---

## Wantlist Integration

**Data source:** Discogs API `/users/{username}/wants` or search by wantlist items.

**Approach:**
- Add `wantlist_items` table (discogsId, title, artist, coverImageUrl, addedAt, minCondition, maxPrice)
- `POST /api/wantlist/sync` — fetch user's Discogs wantlist, upsert into local table
- Cross-reference: `GET /api/wantlist/cross-reference` — for each wantlist item, check if it exists in the user's collection or if a similar pressing is available
- Frontend: wantlist tab in sidebar, showing "3 of 12 wantlist items in your collection"

**Why:** Drives engagement. Wantlist → collection pipeline is core Discogs user behavior.

---

## Genre/Mood Auto-Tagging

**Leverages existing AI infra:** Tauri commands already call Ollama/Gemini/OpenAI for cover recognition. Add a prompt variant that returns `{genre: string, mood: string, era: string}` from album art analysis.

**Approach:**
- New Tauri command `auto_tag(image_data: Vec<u8>) -> TagResult` reuses the LLM cascade from `recognize.rs`
- Add `genre_tags` (text[]) and `mood` (text) columns to vinyls table via migration
- Frontend: "Auto-tag" button on vinyl detail page, shows confidence indicator per tag
- Batch mode: select multiple vinyls → auto-tag all without covers (re-crop not needed, use existing coverImageUrl)

**Why:** Manual genre entry is tedious. AI classification is a differentiator vs. Discogs app.

---

## Barcode Scanner (Quick Win — Not Saved for Later)

**Already feasible:** Discogs API supports `?barcode=` search. Tauri camera permission already wired (Linux + macOS). Add Tauri command that opens camera, captures frame, runs barcode detection (zxing Rust crate), queries Discogs.

**Why:** Sub-1-second vinyl lookup. Biggest UX improvement possible.
