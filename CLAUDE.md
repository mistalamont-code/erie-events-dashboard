# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The **Downtown Erie Unified Events Dashboard** aggregates events from 9 Erie-area websites into a single filterable, searchable, public-facing calendar. It is the only tool in Erie that pulls all major local event sources into one view.

**Owner**: Corey Cook, COO of Erie Downtown Development Corporation (EDDC)
**Organization**: EDDC manages the Flagship City District — the commercial heart of downtown Erie, PA.

This dashboard serves EDDC staff, downtown tenants, partner organizations (VisitErie, Erie Downtown Partnership, Erie Art Museum, City of Erie), and eventually the public. Corey presents this to the EDDC board and civic partners — it must always look professional and be accurate.

## Commands

```bash
npm install                    # Install cheerio + node-fetch
npm run scrape                 # Run all 9 scrapers → data/events.json
npm run scrape:test            # Dry run → logs to console, doesn't write file
npm run serve                  # Serve public/ on localhost:3000
```

## Architecture

**Static site + daily automated scraping pipeline. No build step for the frontend. ES modules throughout (`import`/`export`).**

```
GitHub Actions (daily cron 6 AM ET)
  → 9 Node.js scrapers (one per source site)
  → orchestrator (scrapers/index.js) deduplicates + validates
  → writes data/events.json (committed back to repo)
  → copied to public/events.json
  → static site (public/index.html) serves fresh data
```

**Data flow**: Scrapers fetch HTML → parse with cheerio → normalize to event objects → orchestrator deduplicates → writes JSON → GitHub Actions commits → static site serves fresh data.

**Frontend loading**: `index.html` fetches `events.json` at runtime. If fetch fails (e.g., opening HTML locally), it falls back to the `FALLBACK_EVENTS` array embedded in the HTML. A `normalize()` function handles both full-key and short-key (`n/d/t/v/c/s`) formats transparently.

### Key files

- `scrapers/index.js` — Orchestrator: imports all 9 scrapers, runs with error isolation, deduplicates, validates, sorts chronologically, writes `data/events.json`. Supports `--dry-run` flag.
- `scrapers/utils.js` — Shared utilities: `fetchPage()`, `sleep()`, `makeId()`, `parseDate()`, `parseTime()`, `inferCategory()`, `deduplicateEvents()`, `isValidEvent()`.
- `public/index.html` — Single-file frontend dashboard (HTML/CSS/JS, no framework). Filters by category/month/text search, list + calendar grid views, print-ready.
- `.github/workflows/crawl.yml` — Daily cron at 11:00 UTC (6 AM ET), also manual dispatch. Uses `continue-on-error: true` so partial scraper failures don't block the run.

## Data Schema

### events.json
```json
{
  "meta": { "lastUpdated": "ISO", "totalEvents": 19, "sources": [...] },
  "events": [
    {
      "name": "Event Name",
      "date": "YYYY-MM-DD",
      "time": "H:MM AM/PM",
      "venue": "Venue Name",
      "category": "Music",
      "source": "SourceKey"
    }
  ]
}
```

Scrapers may also produce `id`, `url`, `description`, and `lastScraped` fields — the schema supports them but the current seed data only has the 6 core fields.

**Required fields for validation** (`isValidEvent()`): name (>2 chars), date (YYYY-MM-DD), venue (>1 char), source.

### 8 Event Categories
Music, Sports, Festival, Comedy, Theater, Arts, Community, Family. "Community" is the default fallback from `inferCategory()`.

### Fallback short-key format (in index.html)
`{ "n": name, "d": date, "t": time, "v": venue, "c": category, "s": source }`

## Source Websites (9 scrapers)

| Source Key | Site | Notes |
|---|---|---|
| ErieEvents | erieevents.com | Paginated `/events/CalendarSearchForm?start=N`, 20/page, 6 pages. Date from URL path. |
| FlagshipCity | flagshipcitydistrict.com | Squarespace. Events in `article` or `[data-item-id]`. |
| VisitErie | visiterie.com | Featured events + festivals overview. Festivals page is descriptive text, not structured. |
| ErieDowntown | eriedowntown.com | **robots.txt blocks calendar page** — scraper uses homepage links instead, yields fewer events. |
| ArtMuseum | erieartmuseum.org | Squarespace. Events calendar + exhibitions page. |
| ChildrensMuseum | eriechildrensmuseum.org | WordPress with `.tribe-events-*` elements. Mostly camps and seasonal specials. |
| CelebrateErie | celebrateerie.com | Dates hardcoded (Aug 14-16, 2026). Scraper checks for headliner updates. |
| CityOfErie | erie.pa.us | Sparse. Supplements with known annual events. |
| ErieReader | eriereader.com | **Most comprehensive source.** Up to 15 pages crawled, 2-second delay between requests. Maps Erie Reader categories to our 8. |

## Known Issues & Edge Cases

- **eriedowntown.com**: `robots.txt` blocks `/events/events/calendar` — scraper falls back to homepage links. May need manual supplementation for EDP programming.
- **erieevents.com**: Heavy SeaWolves game listings create near-duplicates with slightly different names. Cancelled events (title contains "CANCELLED") are filtered out.
- **celebrateerie.com**: Dates are hardcoded — if dates change year-to-year, update the `dates` array in `celebrateerie.js`.
- **eriereader.com**: 44+ pages but scraper caps at 15. Many recurring events. Full crawl takes ~30 seconds.
- **parseDate()**: Handles multiple formats but constrains years to 2026-2027 (hardcoded in `utils.js:71`). Will need updating for future years.
- **inferCategory()**: Keyword-based — new event types default to "Community".
- **Events with `time: "TBD"`**: Common for VisitErie festivals where dates are confirmed but times aren't.

## Adding a New Source

1. Create scraper in `scrapers/` (copy an existing one). Export an async function returning an array of event objects.
2. Register in `scrapers/index.js`: add import and add to the scrapers array.
3. Add to frontend in `public/index.html`: add to the `S` (sources) object with display name and colors, add sample events to `FALLBACK_EVENTS`.
4. Test with `npm run scrape:test`.

## Deployment

- Deploy the `public/` folder to GitHub Pages, Vercel, or Netlify (static site, no build step).
- GitHub Actions needs "Read and write permissions" enabled (Settings → Actions → General) to commit updated JSON.
- Partial scraper failures don't block the workflow — partial data is better than no data.

## Current Phase Status

- **Phase 1** (static HTML with hardcoded events): Complete.
- **Phase 2** (daily auto-crawl with 9 scrapers + GitHub Actions): Built, ready to deploy.
- **Phase 3** (public event submission form + moderation queue): Next. Preferred backend is Supabase. Approved community submissions merge into `events.json` with `"source": "Community"`.

## Corey's Preferences

- **Prototype first, hand off via GitHub** — build working code, not wireframes.
- **Pre-populated, immediately actionable** — no placeholder text or "insert your X here."
- **Information before encouragement** — lead with the deliverable, explain after.
- **Single-file frontend** — no React, no build step, no node_modules for the public site.
- **Professional, boardroom-ready design** — white background, clean typography, print-friendly.
- **Stack**: Node.js scrapers, static HTML/CSS/JS frontend, GitHub Actions automation.
- This is EDDC work product, not Keystone Holding LLC (Corey's separate SaaS venture).
