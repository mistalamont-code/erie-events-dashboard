# ⚓ Downtown Erie Events Dashboard

**Unified events calendar for Downtown Erie, PA** — aggregating events from 8 local sources into one searchable, filterable dashboard.

Built by [Erie Downtown Development Corporation (EDDC)](https://www.erieddc.org)

## How It Works

1. **Scrapers** (`/scrapers/`) crawl 8 Erie event websites daily
2. **GitHub Actions** runs the scrapers at 6 AM ET and commits `events.json`
3. **Dashboard** (`/public/index.html`) loads `events.json` and renders a filterable calendar

## Sources

| Source | Website | Events |
|---|---|---|
| Erie Events | erieevents.com | Concerts, shows, sports |
| Flagship City District | flagshipcitydistrict.com | Food Hall, downtown programming |
| VisitErie | visiterie.com | Regional festivals |
| Erie Downtown Partnership | eriedowntown.com | EDP programming |
| Erie Art Museum | erieartmuseum.org | Exhibitions, Gallery Night |
| Children's Museum | eriechildrensmuseum.org | Family events |
| CelebrateErie | celebrateerie.com | CelebrateErie festival |
| City of Erie | erie.pa.us | City-sponsored events |

## Quick Start

```bash
# Install dependencies
npm install

# Run scrapers (outputs to data/events.json)
npm run scrape

# Serve the dashboard locally
npm run serve
# → Open http://localhost:3000
```

## Deploy

The `/public/` folder is a static site. Deploy to:
- **GitHub Pages** — push and enable Pages on the `public/` folder
- **Vercel** — `vercel --prod` with root set to `public/`
- **Netlify** — drag-and-drop the `public/` folder

## Roadmap

- [x] **Phase 1** — Manual crawl, static dashboard
- [x] **Phase 2** — Daily auto-crawl via GitHub Actions
- [ ] **Phase 3** — Public event submission form with moderation queue
