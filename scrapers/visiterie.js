/**
 * Scraper: visiterie.com
 * Crawls the events page and festivals listing
 */

import { fetchPage, parseDate, makeId, inferCategory, sleep, now } from './utils.js';

const EVENTS_URL = 'https://www.visiterie.com/events/';
const FESTIVALS_URL = 'https://www.visiterie.com/things-to-do/festivals-and-events/';
const SOURCE = 'VisitErie';

export async function scrapeVisitErie() {
  console.log('🔴 Scraping VisitErie.com...');
  const events = [];

  // --- Scrape featured events page ---
  const $ = await fetchPage(EVENTS_URL);
  if ($) {
    // Featured events have links with dates in the URL pattern /events/event/MM/DD/YYYY/
    $('a[href*="/events/event/"]').each((i, el) => {
      const $el = $(el);
      const href = $el.attr('href') || '';
      const name = $el.find('h3, h2, .event-title').text().trim() || $el.text().trim();
      
      if (!name || name.length < 3) return;
      
      // Extract date from URL
      const dateMatch = href.match(/\/event\/(\d{2})\/(\d{2})\/(\d{4})\//);
      if (!dateMatch) return;
      
      const date = `${dateMatch[3]}-${dateMatch[1]}-${dateMatch[2]}`;
      
      // Get venue from nearby text
      const parentText = $el.parent().text();
      let venue = '';
      const venuePatterns = [
        'Erie Art Museum', 'UPMC Park', 'Perry Square', 'Downtown Edinboro',
        'Church of the Nativity', 'Erie Insurance Arena', 'Warner Theatre',
        'Liberty Park', 'Frontier Park', 'Presque Isle', 'Downtown Erie'
      ];
      for (const v of venuePatterns) {
        if (parentText.includes(v)) { venue = v; break; }
      }
      if (!venue) venue = 'Erie, PA';
      
      const eventUrl = href.startsWith('http') ? href : `https://www.visiterie.com${href}`;
      
      events.push({
        id: makeId(SOURCE, date, name),
        name: name.replace(/\s+/g, ' ').slice(0, 100),
        date,
        time: 'TBD',
        venue,
        category: inferCategory(name, venue),
        source: SOURCE,
        url: eventUrl,
        description: '',
        lastScraped: now(),
      });
    });
  }

  await sleep(1500);

  // --- Scrape festivals overview for recurring annual events ---
  // This page describes annual events without specific dates,
  // so we only use it to supplement if we don't already have entries
  const $f = await fetchPage(FESTIVALS_URL);
  if ($f) {
    // The festivals page is mostly descriptive text, not structured events
    // We can parse section headers for event names
    console.log('  Checked festivals overview page for supplementary data');
  }

  console.log(`  ✓ VisitErie: ${events.length} events`);
  return events;
}
