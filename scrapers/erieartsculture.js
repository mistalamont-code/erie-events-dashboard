/**
 * Scraper: erieartsandculture.org (Erie Arts & Culture)
 * Squarespace site. Calendar collection is mostly empty — events are
 * submitted via form. Scraper checks homepage, blog, and calendar
 * for any posted events or announcements.
 */

import { fetchPage, parseDate, parseTime, makeId, inferCategory, sleep, now, extractImage } from './utils.js';

const BASE = 'https://www.erieartsandculture.org';
const SOURCE = 'ErieArtsCulture';

export async function scrapeErieArtsCulture() {
  console.log('🎨 Scraping Erie Arts & Culture...');
  const events = [];

  // Try the Squarespace JSON API for the calendar collection
  try {
    const res = await fetch(`${BASE}/calendar?format=json`, {
      headers: {
        'User-Agent': 'ErieEventsAggregator/1.0 (EDDC Downtown Erie; contact@erieddc.org)',
        'Accept': 'application/json',
      },
      timeout: 15000,
    });
    if (res.ok) {
      const data = await res.json();
      const items = data.items || data.upcoming || [];
      for (const item of items) {
        const name = item.title || '';
        if (!name || name.length < 3) continue;
        const startDate = item.startDate ? new Date(item.startDate) : null;
        if (!startDate) continue;
        const date = startDate.toISOString().slice(0, 10);
        const time = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        const venue = item.location?.addressTitle || 'Erie Arts & Culture';
        const image = item.assetUrl || '';
        const description = (item.excerpt || item.body || '').replace(/<[^>]*>/g, '').trim().slice(0, 200);
        const url = item.fullUrl ? `${BASE}${item.fullUrl}` : '';

        events.push({
          id: makeId(SOURCE, date, name),
          name,
          date,
          time: time || 'TBD',
          venue,
          category: inferCategory(name, venue),
          source: SOURCE,
          url,
          image,
          description,
          lastScraped: now(),
        });
      }
    }
  } catch (e) {
    console.warn('  Could not fetch calendar JSON:', e.message);
  }

  // Also scrape the HTML pages for any event mentions
  const pagesToCheck = [`${BASE}/calendar`, `${BASE}`, `${BASE}/blog`];

  for (const pageUrl of pagesToCheck) {
    const $ = await fetchPage(pageUrl);
    if (!$) continue;

    // Look for event-like content in articles, blog posts, announcement bars
    $('article, .eventlist-event, [data-item-id], .blog-item, .summary-item').each((i, el) => {
      const $el = $(el);
      const fullText = $el.text();

      let name = $el.find('h1, h2, h3, .eventlist-title, .blog-title, .summary-title a').first().text().trim();
      if (!name || name.length < 4) return;
      // Skip non-event content
      if (/year in review|from the director|annual report|grant|application/i.test(name)) return;

      let date = null;
      const $time = $el.find('time');
      if ($time.length) {
        const dt = $time.attr('datetime');
        if (dt) date = dt.split('T')[0];
      }
      if (!date) {
        const datePatterns = [
          /(\w+)\s+(\d{1,2}),?\s+(\d{4})/,
          /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
        ];
        for (const pat of datePatterns) {
          const m = fullText.match(pat);
          if (m) { date = parseDate(m[0]); if (date) break; }
        }
      }

      const time = parseTime(fullText);

      let venue = 'Erie Arts & Culture';
      const venuePatterns = ['Erie Art Museum', 'EAC Gallery', 'Erie Arts & Culture', 'Bayfront Gallery'];
      for (const v of venuePatterns) {
        if (fullText.includes(v)) { venue = v; break; }
      }

      const href = $el.find('a').first().attr('href') || '';
      const eventUrl = href.startsWith('http') ? href : href ? `${BASE}${href}` : '';

      // Get image
      const $img = $el.find('img').first();
      let image = $img.attr('src') || $img.attr('data-src') || '';
      if (image && !image.startsWith('http')) image = BASE + image;

      // Get description
      const $desc = $el.find('p, .summary-excerpt, .blog-excerpt').first();
      const description = $desc.length ? $desc.text().trim().slice(0, 200) : '';

      if (name && date) {
        const id = makeId(SOURCE, date, name);
        // Skip if already found via JSON
        if (!events.find(e => e.id === id)) {
          events.push({
            id,
            name,
            date,
            time,
            venue,
            category: inferCategory(name, venue),
            source: SOURCE,
            url: eventUrl,
            image,
            description,
            lastScraped: now(),
          });
        }
      }
    });

    await sleep(1500);
  }

  console.log(`  ✓ ErieArtsCulture: ${events.length} events`);
  return events;
}
