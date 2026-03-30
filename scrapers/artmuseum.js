/**
 * Scraper: erieartmuseum.org
 * Events calendar and exhibitions
 */

import { fetchPage, parseDate, makeId, inferCategory, sleep, now } from './utils.js';

const EVENTS_URL = 'https://www.erieartmuseum.org/events-calendar';
const EXHIBITIONS_URL = 'https://www.erieartmuseum.org/upcoming';
const SOURCE = 'ArtMuseum';

export async function scrapeArtMuseum() {
  console.log('🟣 Scraping ErieArtMuseum.org...');
  const events = [];

  // --- Events calendar ---
  const $ = await fetchPage(EVENTS_URL);
  if ($) {
    // Squarespace events listing
    $('article, .eventlist-event, [data-item-id]').each((i, el) => {
      const $el = $(el);
      const name = $el.find('h1, h2, .eventlist-title').first().text().trim();
      if (!name || name.length < 3) return;

      let date = null;
      const $time = $el.find('time');
      if ($time.length) {
        const dt = $time.attr('datetime');
        if (dt) date = dt.split('T')[0];
      }
      if (!date) {
        const text = $el.text();
        const m = text.match(/(\w+)\s+(\d{1,2}),?\s+(\d{4})/);
        if (m) date = parseDate(m[0]);
      }

      const timeMatch = $el.text().match(/(\d{1,2}:\d{2}\s*[AP]M)/i);
      const time = timeMatch ? timeMatch[1] : 'TBD';

      const href = $el.find('a').attr('href') || '';
      const url = href.startsWith('http') ? href :
                  href ? `https://www.erieartmuseum.org${href}` : '';

      if (name && date) {
        events.push({
          id: makeId(SOURCE, date, name),
          name,
          date,
          time,
          venue: 'Erie Art Museum',
          category: inferCategory(name, 'Erie Art Museum'),
          source: SOURCE,
          url,
          description: '',
          lastScraped: now(),
        });
      }
    });
  }

  await sleep(1500);

  // --- Exhibitions page ---
  const $ex = await fetchPage(EXHIBITIONS_URL);
  if ($ex) {
    $ex('h2, h3').each((i, el) => {
      const name = $ex(el).text().trim();
      if (!name || name.length < 5) return;

      // Look for date ranges near the heading
      const nextText = $ex(el).next().text();
      const dateMatch = nextText.match(/(\w+\s+\d{1,2})\w*\s*[–—-]\s*(\w+\s+\d{1,2})\w*,?\s*(\d{4})/);
      if (dateMatch) {
        const startDate = parseDate(`${dateMatch[1]}, ${dateMatch[3]}`);
        if (startDate) {
          events.push({
            id: makeId(SOURCE, startDate, name),
            name,
            date: startDate,
            time: 'Gallery Hours',
            venue: 'Erie Art Museum',
            category: 'Arts',
            source: SOURCE,
            url: 'https://www.erieartmuseum.org/upcoming',
            description: '',
            lastScraped: now(),
          });
        }
      }
    });
  }

  console.log(`  ✓ ArtMuseum: ${events.length} events`);
  return events;
}
