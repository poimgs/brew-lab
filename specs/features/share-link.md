# Share Link

## Overview

The Share Link feature lets users share their active coffee collection with friends via a simple token-based URL. Friends can browse active coffees and see curated data (metadata + scores + sensory chart) to help decide which coffee they'd like. No account required for viewing.

**Public Route:** `/share/:token` (standalone page, no app navigation)

**Dependencies:** authentication, coffees, brew-tracking

---

## Entity: ShareLink (columns on `users` table)

Share link data is stored directly on the `users` table as two additional columns. Each user can have at most one active share link at a time.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| share_token | VARCHAR(64) | No | 16 random bytes, hex-encoded (32 hex chars) |
| share_token_created_at | TIMESTAMPTZ | No | When the token was created |

### Database Schema

```sql
ALTER TABLE users
    ADD COLUMN share_token VARCHAR(64),
    ADD COLUMN share_token_created_at TIMESTAMP WITH TIME ZONE;

CREATE UNIQUE INDEX idx_users_share_token
    ON users(share_token)
    WHERE share_token IS NOT NULL;
```

### Token Generation

- 16 cryptographically random bytes, hex-encoded to 32 characters
- Partial unique index ensures no collisions among active tokens
- Creating or regenerating a token replaces the previous one (old URLs stop working immediately)
- Revoking sets both columns to NULL

---

## API Endpoints

### Public Endpoint

#### Get Shared Coffee Collection
```
GET /api/v1/share/{token}
```

**Auth:** None (public endpoint)

**Rate Limit:** 30 requests per minute per IP

**Behavior:**
- Looks up the user by `share_token`
- Returns their active (non-archived) coffees with curated reference brew data
- Returns `404` if the token is invalid or revoked

**Response:**
```json
{
  "items": [
    {
      "roaster": "Cata Coffee",
      "name": "Kiamaina",
      "country": "Kenya",
      "region": null,
      "process": "Washed",
      "roast_level": "Light",
      "tasting_notes": "Apricot Nectar, Lemon Sorbet, Raw Honey",
      "roast_date": "2025-11-19",
      "reference_brew": {
        "overall_score": 8,
        "aroma_intensity": 7,
        "body_intensity": 7,
        "sweetness_intensity": 8,
        "brightness_intensity": 7,
        "complexity_intensity": 6,
        "aftertaste_intensity": 7
      }
    }
  ]
}
```

**Per-coffee data included:**
- Metadata: roaster, name, country, region, process, roast_level, tasting_notes, roast_date
- Reference brew summary: overall_score + 6 sensory scores (aroma, body, sweetness, brightness, complexity, aftertaste)

**Per-coffee data excluded:**
- Personal notes
- Brew parameters (grind, ratio, temperature, pours, etc.)
- Improvement notes
- TDS, extraction yield
- Internal IDs (user_id, coffee_id, brew_id)
- Archived coffees

**Reference brew selection:** For each coffee, the reference brew is the starred `reference_brew_id` if set, otherwise the latest brew (by `brew_date DESC`). If no brews exist, `reference_brew` is `null`.

**Key query pattern:** Use `LEFT JOIN LATERAL` to efficiently get each coffee's reference brew (starred or latest) in a single query.

### Protected Endpoints

#### Get Share Link
```
GET /api/v1/share-link
```

**Auth:** Required (JWT)

**Response (link exists):**
```json
{
  "token": "a1b2c3d4e5f6...",
  "url": "https://brewlab.example.com/share/a1b2c3d4e5f6...",
  "created_at": "2026-02-20T10:00:00Z"
}
```

**Response (no link):**
```json
{
  "token": null,
  "url": null,
  "created_at": null
}
```

**Note:** The `url` field is constructed by the backend using the configured `BaseURL`.

#### Create or Regenerate Share Link
```
POST /api/v1/share-link
```

**Auth:** Required (JWT)

**Behavior:**
- Generates a new token (16 random bytes, hex-encoded)
- Replaces any existing token (old URLs immediately stop working)
- Sets `share_token_created_at` to now

**Response:** `201 Created`
```json
{
  "token": "a1b2c3d4e5f6...",
  "url": "https://brewlab.example.com/share/a1b2c3d4e5f6...",
  "created_at": "2026-02-20T10:00:00Z"
}
```

#### Revoke Share Link
```
DELETE /api/v1/share-link
```

**Auth:** Required (JWT)

**Behavior:**
- Sets `share_token` and `share_token_created_at` to NULL
- Old URL immediately stops working

**Response:** `204 No Content`

---

## User Interface

### Share Link Management (Preferences Page)

A new section on the Preferences page (`/preferences`) for managing the share link, placed below the existing Brew Defaults section.

```
+-----------------------------------------------------------------------+
| Preferences                                                           |
+-----------------------------------------------------------------------+
|                                                                       |
| +- Brew Defaults ------------------------------------------[Save]---+|
| | (existing brew defaults content)                                   ||
| +--------------------------------------------------------------------+|
|                                                                       |
| +- Share Link -------------------------------------------------------+|
| |                                                                    ||
| | Share your coffee collection with friends. They can browse your    ||
| | active coffees and see scores and tasting profiles.                ||
| |                                                                    ||
| | (No link created yet)                                              ||
| |                                                                    ||
| | [Create Share Link]                                                ||
| +--------------------------------------------------------------------+|
|                                                                       |
+-----------------------------------------------------------------------+
```

**With active link:**
```
+-----------------------------------------------------------------------+
| +- Share Link -------------------------------------------------------+|
| |                                                                    ||
| | Share your coffee collection with friends. They can browse your    ||
| | active coffees and see scores and tasting profiles.                ||
| |                                                                    ||
| | +--------------------------------------------------------------+  ||
| | | https://brewlab.example.com/share/a1b2c3d4e5f6...  [Copy]    |  ||
| | +--------------------------------------------------------------+  ||
| |                                                                    ||
| | Created: Feb 20, 2026                                              ||
| |                                                                    ||
| | [Regenerate]  [Revoke]                                             ||
| +--------------------------------------------------------------------+|
+-----------------------------------------------------------------------+
```

**Behavior:**
- **Create Share Link**: Calls `POST /api/v1/share-link`, shows URL with copy button
- **Copy**: Copies the full URL to clipboard, toast "Link copied"
- **Regenerate**: Confirmation dialog ("Regenerate share link? The current link will stop working."), then calls `POST /api/v1/share-link`
- **Revoke**: Confirmation dialog ("Revoke share link? Anyone with the current link will lose access."), then calls `DELETE /api/v1/share-link`

### Public Share Page

**Route:** `/share/:token`

A standalone page with no app navigation (no header, no sidebar, no login). Designed for anonymous viewing.

```
+-----------------------------------------------------------------------+
| [Coffee icon] Coffee Collection                                       |
+-----------------------------------------------------------------------+
|                                                                       |
| +---------------------------+ +---------------------------+           |
| | Kiamaina                  | | Gesha Village Lot 74      |           |
| | Cata Coffee               | | Manhattan Coffee Roasters |           |
| |                           | |                           |           |
| | Kenya - Washed - Light    | | Ethiopia - Natural        |           |
| | Apricot Nectar, Lemon     | | Jasmine, Bergamot,       |           |
| | Sorbet, Raw Honey         | | Peach Tea                 |           |
| |                           | |                           |           |
| | Roasted: Nov 19, 2025     | | Roasted: Dec 5, 2025      |           |
| |                           | |                           |           |
| | Score: 8/10               | | Score: 9/10               |           |
| |                           | |                           |           |
| |     [Sensory Radar]       | |     [Sensory Radar]       |           |
| |                           | |                           |           |
| +---------------------------+ +---------------------------+           |
|                                                                       |
| +---------------------------+ +---------------------------+           |
| | Brazil Daterra            | | (more cards...)           |           |
| | ...                       | |                           |           |
| +---------------------------+ +---------------------------+           |
|                                                                       |
+-----------------------------------------------------------------------+
```

**Layout:**
- Responsive grid matching the Coffee Grid View pattern
  - Mobile (< 640px): 1 column
  - Tablet (640px - 1024px): 2 columns
  - Desktop (> 1024px): 3 columns

**Card content:**
- Coffee name (bold, primary)
- Roaster name (muted)
- Origin line: country, process, roast_level (comma-separated, only non-null values)
- Tasting notes (if present)
- Roast date formatted (if present)
- Reference brew score (e.g., "Score: 8/10") — only if reference brew exists
- Sensory radar chart (reuses `SensoryRadarChart` component) — only if at least one sensory score exists on the reference brew

**Empty states:**
- Invalid/revoked token: "This share link is no longer active."
- No active coffees: "No coffees to show."

**Error handling:**
- 404 from API: Show invalid link message
- Network error: Show generic error with retry

---

## Design Decisions

### Token on Users Table

Share token stored directly on the `users` table (not a separate table) because:
- One-to-one relationship — each user has at most one active share link
- Simpler schema — no join needed to look up the user from a token
- Two columns (`share_token`, `share_token_created_at`) is minimal overhead

### No Expiry

Share links do not automatically expire because:
- Users have full control via revoke/regenerate
- No stale-link cleanup complexity
- Simpler mental model — link works until you revoke it

### Curated Public Data

The public endpoint deliberately excludes personal data (notes, brew params, improvement notes, TDS, IDs) because:
- Friends only need to know what the coffee tastes like, not how to brew it
- Keeps the share page focused on helping friends pick a coffee
- Protects the user's personal brewing workflow

### Standalone Share Page

The share page has no app navigation because:
- Anonymous viewers don't have accounts
- Reduces confusion — no login prompts or app chrome
- Focused experience for the specific use case

### Rate Limiting Public Endpoint

The public share endpoint is rate-limited (30/min per IP) because:
- Prevents abuse/scraping of public data
- Protects the database from excessive queries
- Generous enough for normal browsing (page load + potential refresh)
