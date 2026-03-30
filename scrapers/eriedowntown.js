/**
 * Scraper: eriedowntown.com
 * Erie Downtown Partnership — homepage event listings
 * Note: /events/events/calendar is blocked by robots.txt,
 * so we scrape the homepage which shows upcoming events
 */

import { fetchPage, parseDate, makeId, inferCategory, now } from './utils.js';

const URL = 'https://www.eriedowntown.com/';
const SOURCE = 'ErieDowntown';

export async function scrapeErieDowntown() {
  console.log('🟡 Scraping ErieDowntown.com...');
  const events = [];
  const $ = await fetchPage(URL);
  if (!$) return events;

  // Homepage shows upcoming events as links with date and title
  $('a[href*="/events/events/calendar/event/"]').each((i, el) => {
    const $el = $(el);
    const href = $el.attr('href') || '';
    const text = $el.text().trim();
    
    // Extract date from URL pattern /event/MM/DD/YYYY/
    const dateMatch = href.match(/\/event\/(\d{2})\/(\d{2})\/(\d{4})\//);
    if (!dateMatch) return;
    
    const date = `${dateMatch[3]}-${dateMatch[1]}-${dateMatch[2]}`;
    
    // Parse name and time from the text block
    // Format is usually like "Apr 11\nSecond Saturday: Rain & Flowers\n10:00 AM - 12:00 PM"
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    
    // Find the event name (skip date fragments)
    let name = '';
    let time = 'TBD';
    for (const line of lines) {
      if (/^\w{3}\s+\d{1,2}$/.test(line)) continue; // Skip "Apr 11" type lines
      if (/\d{1,2}:\d{2}\s*[AP]M/i.test(line)) {
        const m = line.match(/(\d{1,2}:\d{2}\s*[AP]M)/i);
        if (m) time = m[1];
        continue;
      }
      if (!name && line.length > 3) name = line;
    }
    
    if (!name) name = lines.find(l => l.length > 5) || '';
    if (!name) return;
    
    const eventUrl = `https://www.eriedowntown.com${href}`;
    
    events.push({
      id: makeId(SOURCE, date, name),
      name,
      date,
      time,
      venue: 'Downtown Erie',
      category: inferCategory(name),
      source: SOURCE,
      url: eventUrl,
      description: '',
      lastScraped: now(),
    });
  });

  console.log(`  ✓ ErieDowntown: ${events.length} events`);
  return events;
}
