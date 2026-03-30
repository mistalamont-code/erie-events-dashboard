/**
 * Scraper: gannon.edu (Gannon University Events)
 * Crawls the university events calendar for public events
 */

import { fetchPage, parseDate, parseTime, makeId, inferCategory, sleep, now } from './utils.js';

const BASE = 'https://www.gannon.edu/events/';
const SOURCE = 'GannonEvents';

export async function scrapeGannonEvents() {
  console.log('🟣 Scraping Gannon University Events...');
  const events = [];
  const $ = await fetchPage(BASE);
  if (!$) return events;

  // Gannon uses a standard CMS events calendar
  // Try multiple common selectors for university event pages
  $('article, .event-item, .views-row, .event-listing, .eventlist-event, [class*="event"], li[class*="event"]').each((i, el) => {
    const $el = $(el);
    const fullText = $el.text();

    // Get event title
    let name = '';
    const $title = $el.find('h2, h3, h4, .event-title, .field-title, .views-field-title a, .event-name').first();
    if ($title.length) {
      name = $title.text().trim();
    }
    if (!name || name.length < 4) return;

    // Skip navigation/header text
    if (/^(home|about|contact|apply|admissions|menu|search)/i.test(name)) return;

    // Get date
    let date = null;
    const $time = $el.find('time');
    if ($time.length) {
      const dt = $time.attr('datetime');
      if (dt) date = dt.split('T')[0];
    }
    if (!date) {
      const $dateEl = $el.find('.date, .event-date, .views-field-field-date, [class*="date"]').first();
      if ($dateEl.length) {
        date = parseDate($dateEl.text().trim());
      }
    }
    if (!date) {
      // Try date patterns from full text
      const datePatterns = [
        /(\w+)\s+(\d{1,2}),?\s+(\d{4})/,
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
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
    const $loc = $el.find('.location, .event-location, .views-field-field-location, address, [class*="location"]').first();
    if ($loc.length) {
      venue = $loc.text().trim();
    }
    if (!venue) {
      // Check for known Gannon/Erie venues
      const venuePatterns = [
        'Schuster Theatre', 'Waldron Campus Center', 'Hammermill Library',
        'Knight Club', 'Yehl Ballroom', 'Beyer Hall', 'Nash Library',
        'Recreation and Wellness Center', 'Carneval Athletic Pavilion',
        'Mary, Seat of Wisdom Chapel', 'Gannon University',
      ];
      for (const v of venuePatterns) {
        if (fullText.includes(v)) { venue = v; break; }
      }
    }
    if (!venue) venue = 'Gannon University';

    // Get URL
    const href = $el.find('a').first().attr('href') || '';
    const eventUrl = href && href.startsWith('http') ? href :
                     href ? `https://www.gannon.edu${href}` : '';

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

  console.log(`  ✓ GannonEvents: ${events.length} events`);
  return events;
}
