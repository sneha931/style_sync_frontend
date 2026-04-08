# StyleSync API — Testing Reference

Base URL: `http://localhost:5000`

Interactive docs (Swagger UI): `http://localhost:5000/api-docs`

---

## Table of Contents

1. [POST /api/scrape](#1-post-apiscrape)
2. [GET /api/tokens](#2-get-apitokens)
3. [PATCH /api/tokens](#3-patch-apitokens)
4. [PATCH /api/tokens/locks](#4-patch-apitokenslocks)
5. [GET /api/tokens/history](#5-get-apitokenshistory)
6. [Error Reference](#error-reference)

---

## 1. POST /api/scrape

Scrapes a website and extracts design tokens (colors, typography, spacing).  
On re-scrape, locked tokens are preserved and a new version entry is created for any changes.

**Request**

```
POST /api/scrape
Content-Type: application/json
```

```json
{
  "url": "https://example.com"
}
```

**cURL**

```bash
curl -X POST http://localhost:5000/api/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

**Response 200**

```json
{
  "url": "https://example.com",
  "tokens": {
    "colors": {
      "primary": "#2F6CDF",
      "secondary": "#E794C8",
      "accent": "#F5A623",
      "background": "#FFFFFF",
      "text": "#1A1A1A",
      "muted": "#888888",
      "border": "#E0E0E0",
      "neutrals": ["#FFFFFF", "#F5F5F5", "#1A1A1A"],
      "palette": [
        { "color": "#2F6CDF", "count": 42, "sources": ["css"] }
      ]
    },
    "typography": {
      "fontFamily": "Inter",
      "scale": {
        "h1": "48px",
        "h2": "36px",
        "h3": "28px",
        "h4": "22px",
        "body": "16px",
        "caption": "12px"
      }
    },
    "spacing": {
      "unit": 8,
      "scale": {
        "xs": "4px",
        "sm": "8px",
        "md": "16px",
        "lg": "24px",
        "xl": "32px",
        "2xl": "48px"
      }
    },
    "analysisScore": {
      "colorConfidence": 0.87,
      "typographyConfidence": 0.91,
      "spacingConfidence": 0.78
    }
  },
  "lockedTokens": {},
  "versionHistory": [
    {
      "version": 1,
      "timestamp": "2026-04-07T14:00:00.000Z",
      "changes": {
        "colors.primary": { "before": null, "after": "#2F6CDF" }
      }
    }
  ]
}
```

**Response 400** — invalid or missing URL

```json
{ "error": "Invalid URL. Please include http:// or https://." }
```

**Response 500** — scrape failed

```json
{ "error": "Unable to extract design tokens for this URL right now." }
```

---

## 2. GET /api/tokens

Returns the current token state for a given URL, including lock statuses and full version history.  
Omit `url` to get tokens for the most recently scraped site.

**Request**

```
GET /api/tokens?url=https://example.com
```

**cURL**

```bash
curl "http://localhost:5000/api/tokens?url=https://example.com"
```

```bash
# Most recently scraped site
curl "http://localhost:5000/api/tokens"
```

**Response 200**

```json
{
  "url": "https://example.com",
  "tokens": { ... },
  "lockedTokens": {
    "colors.primary": true
  },
  "versionHistory": [
    {
      "version": 1,
      "timestamp": "2026-04-07T14:00:00.000Z",
      "changes": { ... }
    }
  ]
}
```

**Response 404**

```json
{ "error": "No design tokens available yet for this URL." }
```

---

## 3. PATCH /api/tokens

Edits one or more token values using dot-notation paths.  
Each call creates a new version entry recording what changed.

**Request**

```
PATCH /api/tokens
Content-Type: application/json
```

```json
{
  "url": "https://example.com",
  "updates": {
    "colors.primary": "#FF0000",
    "typography.fontFamily": "Inter",
    "typography.scale.h1": "52px",
    "spacing.unit": 10
  }
}
```

**cURL**

```bash
curl -X PATCH http://localhost:5000/api/tokens \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "updates": {
      "colors.primary": "#FF0000",
      "typography.fontFamily": "Inter"
    }
  }'
```

**Editable token paths**

| Path | Example value |
|---|---|
| `colors.primary` | `"#FF0000"` |
| `colors.secondary` | `"#244FD2"` |
| `colors.accent` | `"#F5A623"` |
| `colors.background` | `"#FFFFFF"` |
| `colors.text` | `"#1A1A1A"` |
| `colors.muted` | `"#888888"` |
| `colors.border` | `"#E0E0E0"` |
| `typography.fontFamily` | `"Inter"` |
| `typography.scale.h1` | `"52px"` |
| `typography.scale.h2` | `"40px"` |
| `typography.scale.body` | `"16px"` |
| `typography.scale.caption` | `"12px"` |
| `spacing.unit` | `8` |
| `spacing.scale.xs` | `"4px"` |
| `spacing.scale.md` | `"16px"` |
| `spacing.scale.2xl` | `"48px"` |

**Response 200** — same shape as `GET /api/tokens`, with updated values and a new version entry

**Response 400** — validation error or site not yet scraped

```json
{ "error": "No tokens exist for this site. Run scrape first." }
```

---

## 4. PATCH /api/tokens/locks

Locks or unlocks specific tokens. Locked tokens are never overwritten when the site is re-scraped.

**Request**

```
PATCH /api/tokens/locks
Content-Type: application/json
```

```json
{
  "url": "https://example.com",
  "locks": {
    "colors.primary": true,
    "typography.fontFamily": true,
    "spacing.unit": false
  }
}
```

**cURL**

```bash
curl -X PATCH http://localhost:5000/api/tokens/locks \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "locks": {
      "colors.primary": true,
      "typography.fontFamily": true
    }
  }'
```

**Lock rules**

- `true` → token is locked; re-scraping will keep the current value
- `false` → token is unlocked; re-scraping will overwrite with the new scraped value

**Re-scrape merge example**

```
Existing:   colors.primary = "#FF0000"  (locked: true)
            colors.secondary = "#E794C8" (locked: false)

New scrape: colors.primary = "#2F6CDF"
            colors.secondary = "#244FD2"

Result:     colors.primary = "#FF0000"   ← preserved
            colors.secondary = "#244FD2" ← overwritten
```

**Response 200** — same shape as `GET /api/tokens`, with updated `lockedTokens` map

**Response 400**

```json
{ "error": "locks must not be empty." }
```

---

## 5. GET /api/tokens/history

Returns the full ordered version history for a site. Each entry shows exactly what changed, the before and after values, and when.

**Request**

```
GET /api/tokens/history?url=https://example.com
```

**cURL**

```bash
curl "http://localhost:5000/api/tokens/history?url=https://example.com"
```

**Response 200**

```json
{
  "url": "https://example.com",
  "versionHistory": [
    {
      "version": 1,
      "timestamp": "2026-04-07T12:00:00.000Z",
      "changes": {
        "colors.primary": { "before": null, "after": "#2F6CDF" },
        "typography.fontFamily": { "before": null, "after": "Inter" },
        "spacing.unit": { "before": null, "after": 8 }
      }
    },
    {
      "version": 2,
      "timestamp": "2026-04-07T14:00:00.000Z",
      "changes": {
        "colors.primary": { "before": "#2F6CDF", "after": "#FF0000" }
      }
    },
    {
      "version": 3,
      "timestamp": "2026-04-07T15:30:00.000Z",
      "changes": {
        "colors.secondary": { "before": "#E794C8", "after": "#244FD2" }
      }
    }
  ]
}
```

**Response 400**

```json
{ "error": "Query param \"url\" is required." }
```

---

## Error Reference

| Status | Meaning |
|---|---|
| `400` | Bad request — validation failed, missing fields, or bad URL format |
| `404` | Site has not been scraped yet, or no tokens exist |
| `500` | Scraping failed (network error, site blocked, timeout) |

---

## End-to-End Test Flow

Run these in order to exercise all features:

```bash
BASE="http://localhost:5000"
URL="https://stripe.com"

# 1. Scrape the site
curl -X POST $BASE/api/scrape \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"$URL\"}"

# 2. Read the extracted tokens
curl "$BASE/api/tokens?url=$URL"

# 3. Edit a token value
curl -X PATCH $BASE/api/tokens \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"$URL\", \"updates\": {\"colors.primary\": \"#FF0000\"}}"

# 4. Lock the edited token
curl -X PATCH $BASE/api/tokens/locks \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"$URL\", \"locks\": {\"colors.primary\": true}}"

# 5. Re-scrape — colors.primary should stay #FF0000
curl -X POST $BASE/api/scrape \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"$URL\"}"

# 6. Confirm the locked token was preserved
curl "$BASE/api/tokens?url=$URL" | grep -o '"primary":"[^"]*"'

# 7. Review the full version history
curl "$BASE/api/tokens/history?url=$URL"
```
