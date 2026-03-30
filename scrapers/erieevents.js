/**
 * Scraper: erieevents.com
 * Crawls the paginated CalendarSearchForm listings
 */

import { fetchPage, parseDate, parseTime, makeId, inferCategory, sleep, now, fetchEventDetail } from './utils.js';

const BASE = 'https://www.erieevents.com/events/CalendarSearchForm';
const SOURCE = 'ErieEvents';
const MAX_PAGES = 6;

export async function scrapeErieEvents() {
  console.log('🔵 Scraping ErieEvents.com...');
  const events = [];

  for (let page = 0; page < MAX_PAGES; page++) {
    const url = page === 0 ? BASE : `${BASE}?start=${page * 20}`;
    const $ = await fetchPage(url);
    if (!$) break;

    // Each event is in the listing as an event block
    // The structure: h2 (event name), venue text, date/time text
    const blocks = $('a[href*="/events/event/"]').toArray();
    
    // Alternative approach: parse the structured listing
    $('h2').each((i, el) => {
      const $block = $(el);
      const name = $block.text().trim();
      if (!name || name.length < 3) return;
      
      // Skip cancelled events
      if (name.includes('CANCELLED')) return;
      
      // Look for the parent container to get venue and date
      const $container = $block.parent();
      const fullText = $container.text();
      
      // Try to find venue (appears before event name in the page flow)
      const venuePatterns = [
        'Warner Theatre', 'Bayfront Convention Center', 'UPMC Park',
        'Erie Insurance Arena', 'Liberty Park', 'Rebich Investments Amphitheater'
      ];
      let venue = '';
      for (const v of venuePatterns) {
        if (fullText.includes(v)) { venue = v; break; }
      }
      
      // Find the link for this event to extract date from URL
      const $link = $container.find('a[href*="/events/event/"]');
      const href = $link.attr('href') || '';
      const dateMatch = href.match(/\/(\d{2})\/(\d{2})\/(\d{4})\//);
      
      let date = null;
      if (dateMatch) {
        date = `${dateMatch[3]}-${dateMatch[1]}-${dateMatch[2]}`;
      }
      
      // Find time from text like "06:05 PM"
      const timeMatch = fullText.match(/(\d{1,2}:\d{2}\s*[AP]M)/i);
      const time = timeMatch ? timeMatch[1] : 'TBD';
      
      if (name && date && venue) {
        events.push({
          id: makeId(SOURCE, date, name),
          name,
          date,
          time,
          venue,
          category: inferCategory(name, venue),
          source: SOURCE,
          url: href ? `https://www.erieevents.com${href}` : '',
          description: '',
          lastScraped: now(),
        });
      }
    });

    console.log(`  Page ${page + 1}: found ${events.length} events so far`);
    await sleep(1500);
  }

  // Fetch detail pages for images/descriptions (up to 20 to avoid slowness)
  const toFetch = events.filter(e => e.url).slice(0, 20);
  for (const e of toFetch) {
    const detail = await fetchEventDetail(e.url);
    if (detail.image) e.image = detail.image;
    if (detail.description) e.description = detail.description;
    await sleep(1000);
  }

  console.log(`  ✓ ErieEvents: ${events.length} events`);
  return events;
}
