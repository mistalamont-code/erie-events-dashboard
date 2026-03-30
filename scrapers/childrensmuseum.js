/**
 * Scraper: eriechildrensmuseum.org
 * Events and programs
 */

import { fetchPage, parseDate, makeId, inferCategory, now } from './utils.js';

const URL = 'https://www.eriechildrensmuseum.org/events/';
const SOURCE = 'ChildrensMuseum';

export async function scrapeChildrensMuseum() {
  console.log('🟠 Scraping ErieChildrensMuseum.org...');
  const events = [];
  const $ = await fetchPage(URL);
  if (!$) return events;

  // WordPress events listing
  $('article, .event-item, .tribe-events-calendar-list__event, .type-tribe_events').each((i, el) => {
    const $el = $(el);
    const name = $el.find('h2, h3, .tribe-events-calendar-list__event-title').first().text().trim();
    if (!name || name.length < 3) return;

    let date = null;
    // Look for datetime attributes
    const $time = $el.find('time, [datetime]');
    if ($time.length) {
      const dt = $time.attr('datetime');
      if (dt) date = dt.split('T')[0];
    }
    // Fallback: text date parsing
    if (!date) {
      const text = $el.text();
      const m = text.match(/(\w+\s+\d{1,2},?\s+\d{4})/);
      if (m) date = parseDate(m[1]);
    }

    const timeMatch = $el.text().match(/(\d{1,2}:\d{2}\s*[AP]M)/i);
    const time = timeMatch ? timeMatch[1] : 'TBD';

    const href = $el.find('a').attr('href') || '';
    const url = href.startsWith('http') ? href :
                href ? `https://www.eriechildrensmuseum.org${href}` : '';

    if (name && date) {
      events.push({
        id: makeId(SOURCE, date, name),
        name,
        date,
        time,
        venue: "expERIEnce Children's Museum",
        category: 'Family',
        source: SOURCE,
        url,
        description: '',
        lastScraped: now(),
      });
    }
  });

  console.log(`  ✓ ChildrensMuseum: ${events.length} events`);
  return events;
}
