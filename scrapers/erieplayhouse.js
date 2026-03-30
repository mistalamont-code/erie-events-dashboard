/**
 * Scraper: erieplayhouse.net (Erie Playhouse)
 * Crawls the playhouse season calendar for shows and performances
 */

import { fetchPage, parseDate, parseTime, makeId, inferCategory, sleep, now } from './utils.js';

const BASE = 'https://www.erieplayhouse.net';
const SOURCE = 'EriePlayhouse';

export async function scrapeEriePlayhouse() {
  console.log('🎭 Scraping Erie Playhouse...');
  const events = [];

  // Try the main shows/season page and events page
  const urls = [
    `${BASE}/shows`,
    `${BASE}/season`,
    `${BASE}/events`,
    `${BASE}/on-stage`,
    BASE,
  ];

  for (const url of urls) {
    const $ = await fetchPage(url);
    if (!$) continue;

    $('article, .show-item, .event-item, .views-row, [class*="show"], [class*="event"], .card, .production').each((i, el) => {
      const $el = $(el);
      const fullText = $el.text();

      // Get show/event title
      let name = '';
      const $title = $el.find('h1, h2, h3, h4, .show-title, .event-title, .card-title, .production-title').first();
      if ($title.length) {
        name = $title.text().trim();
      }
      if (!name || name.length < 3) return;

      // Skip navigation/non-event text
      if (/^(home|about|contact|donate|volunteer|classes|menu|search|tickets|box office)/i.test(name)) return;
      if (/^(get involved|support|education|rentals)/i.test(name)) return;

      // Get date
      let date = null;
      const $time = $el.find('time');
      if ($time.length) {
        const dt = $time.attr('datetime');
        if (dt) date = dt.split('T')[0];
      }
      if (!date) {
        const $dateEl = $el.find('.date, .show-date, .event-date, .performance-date, [class*="date"]').first();
        if ($dateEl.length) {
          date = parseDate($dateEl.text().trim());
        }
      }
      if (!date) {
        // Try date patterns from text
        const datePatterns = [
          /(\w+)\s+(\d{1,2}),?\s+(\d{4})/,
          /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
          /(\w+)\s+(\d{1,2})\s*[-–]\s*(\w+)\s+(\d{1,2}),?\s+(\d{4})/,
        ];
        for (const pat of datePatterns) {
          const m = fullText.match(pat);
          if (m) {
            date = parseDate(m[0]);
            if (date) break;
          }
        }
      }

      // Get time
      const time = parseTime(fullText);

      // Venue is always Erie Playhouse unless specified otherwise
      let venue = 'Erie Playhouse';

      // Get URL
      const href = $el.find('a').first().attr('href') || '';
      const eventUrl = href && href.startsWith('http') ? href :
                       href ? `${BASE}${href.startsWith('/') ? '' : '/'}${href}` : '';

      if (name && date) {
        events.push({
          id: makeId(SOURCE, date, name),
          name,
          date,
          time,
          venue,
          category: inferCategory(name, venue),
          source: SOURCE,
          url: eventUrl,
          description: '',
          lastScraped: now(),
        });
      }
    });

    if (events.length > 0) break; // Found events, no need to try other URLs
    await sleep(1500);
  }

  console.log(`  ✓ EriePlayhouse: ${events.length} events`);
  return events;
}
