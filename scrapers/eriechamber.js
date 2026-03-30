/**
 * Scraper: eriepa.com (Erie Regional Chamber and Growth Partnership)
 * Crawls the chamber events calendar for business and community events
 */

import { fetchPage, parseDate, parseTime, makeId, inferCategory, sleep, now } from './utils.js';

const BASE = 'https://www.eriepa.com/events';
const SOURCE = 'ErieChamber';

export async function scrapeErieChamber() {
  console.log('🟡 Scraping ErieChamber (eriepa.com)...');
  const events = [];
  const $ = await fetchPage(BASE);
  if (!$) return events;

  // Chamber sites typically use GrowthZone/ChamberMaster CMS
  // Events are in list format with date, title, time, location
  $('a[href*="/event/"], .event-item, .calendar-event, article, .list-item, tr[class*="event"], .gz-event').each((i, el) => {
    const $el = $(el);
    const fullText = $el.text();

    // Get event title
    let name = '';
    const $title = $el.find('h2, h3, h4, .event-title, .gz-title, .event-name, strong').first();
    if ($title.length) {
      name = $title.text().trim();
    } else {
      // If it's an anchor, use its text
      name = $el.text().trim().split('\n')[0].trim();
    }
    if (!name || name.length < 4) return;

    // Skip non-event text
    if (/^(home|about|contact|login|register|sponsor|membership)/i.test(name)) return;

    // Get date
    let date = null;
    const $time = $el.find('time');
    if ($time.length) {
      const dt = $time.attr('datetime');
      if (dt) date = dt.split('T')[0];
    }
    if (!date) {
      // Look for date patterns in text
      const datePatterns = [
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
        /(\w+)\s+(\d{1,2}),?\s+(\d{4})/,
        /(\w+day),?\s+(\w+)\s+(\d{1,2}),?\s+(\d{4})/,
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

    // Get venue/location
    let venue = '';
    const $loc = $el.find('.event-location, .gz-location, .location, address');
    if ($loc.length) {
      venue = $loc.first().text().trim();
    }
    if (!venue) {
      // Check for known Erie venues
      const venuePatterns = [
        'Bayfront Convention Center', 'Ambassador Center', 'Erie Club',
        'Bel-Aire Clarion', 'Country Club', 'Sheraton', 'Courtyard by Marriott',
        'Perry Square', 'Downtown Erie', 'Jefferson Educational Society',
      ];
      for (const v of venuePatterns) {
        if (fullText.includes(v)) { venue = v; break; }
      }
    }
    if (!venue) venue = 'Erie, PA';

    // Get URL
    const href = $el.is('a') ? $el.attr('href') : ($el.find('a').first().attr('href') || '');
    const eventUrl = href && href.startsWith('http') ? href :
                     href ? `https://www.eriepa.com${href}` : '';

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

  console.log(`  ✓ ErieChamber: ${events.length} events`);
  return events;
}
