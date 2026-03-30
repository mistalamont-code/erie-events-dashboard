/**
 * Scraper: flagshipcitydistrict.com
 * Squarespace-based events calendar
 */

import { fetchPage, parseDate, makeId, inferCategory, now } from './utils.js';

const URL = 'https://www.flagshipcitydistrict.com/events';
const SOURCE = 'FlagshipCity';

export async function scrapeFlagshipCity() {
  console.log('🟢 Scraping FlagshipCityDistrict.com...');
  const events = [];
  const $ = await fetchPage(URL);
  if (!$) return events;

  // Squarespace events have a consistent structure
  // Each event block contains date, title, time, venue
  $('article, .eventlist-event, [data-item-id]').each((i, el) => {
    const $el = $(el);
    const fullText = $el.text();
    
    // Get event title
    const name = $el.find('h1, h2, .eventlist-title').first().text().trim();
    if (!name || name.length < 3) return;
    
    // Get date — look for structured date elements or text patterns
    let date = null;
    const $time = $el.find('time');
    if ($time.length) {
      const dt = $time.attr('datetime');
      if (dt) date = dt.split('T')[0];
    }
    if (!date) {
      // Try parsing from text like "Tuesday, March 31, 2026"
      const datePatterns = [
        /(\w+day),?\s+(\w+)\s+(\d{1,2}),?\s+(\d{4})/,
        /(\w+)\s+(\d{1,2}),?\s+(\d{4})/
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
    const timeMatch = fullText.match(/(\d{1,2}:\d{2}\s*[AP]M)/i);
    const time = timeMatch ? timeMatch[1] : 'TBD';
    
    // Get venue/location
    let venue = '';
    const $loc = $el.find('.eventlist-meta-address-line, .event-location');
    if ($loc.length) {
      venue = $loc.first().text().trim();
    }
    // Fallback: look for known venues in text
    if (!venue) {
      const venuePatterns = [
        'Flagship City Food Hall', 'Perry Square', 'Erie Insurance Arena',
        'Warner Theater', 'Bayfront Convention Center', 'Downtown Erie',
        'U Pick 6 Tap House'
      ];
      for (const v of venuePatterns) {
        if (fullText.includes(v)) { venue = v; break; }
      }
    }
    if (!venue) venue = 'Downtown Erie';
    
    // Get URL
    const href = $el.find('a').attr('href') || '';
    const eventUrl = href.startsWith('http') ? href : 
                     href ? `https://www.flagshipcitydistrict.com${href}` : '';
    
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

  console.log(`  ✓ FlagshipCity: ${events.length} events`);
  return events;
}
