/**
 * Scraper: erie.pa.us
 * City of Erie official website
 * Note: The City site doesn't have a robust public events calendar,
 * so we check for any structured event listings and supplement
 * with known annual city-sponsored events.
 */

import { fetchPage, parseDate, makeId, inferCategory, now } from './utils.js';

const URL = 'https://www.erie.pa.us/';
const SOURCE = 'CityOfErie';

export async function scrapeCityOfErie() {
  console.log('🩵 Scraping Erie.pa.us...');
  const events = [];

  const $ = await fetchPage(URL);
  if ($) {
    // Look for any event-like content on the homepage or linked pages
    $('a').each((i, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().trim();
      
      // Look for event-related links
      if (text.length > 10 && /event|festival|celebration|parade|concert/i.test(text)) {
        // Try to extract a date from nearby content
        const parentText = $(el).parent().text();
        const dateMatch = parentText.match(/(\w+\s+\d{1,2},?\s+\d{4})/);
        if (dateMatch) {
          const date = parseDate(dateMatch[1]);
          if (date) {
            events.push({
              id: makeId(SOURCE, date, text),
              name: text.slice(0, 100),
              date,
              time: 'TBD',
              venue: 'Erie, PA',
              category: inferCategory(text),
              source: SOURCE,
              url: href.startsWith('http') ? href : `https://www.erie.pa.us${href}`,
              description: '',
              lastScraped: now(),
            });
          }
        }
      }
    });
  }

  // Known annual city events (dates approximate, updated each crawl if site has specifics)
  const annualEvents = [
    { name: "Lights Over Lake Erie — July 3rd Fireworks", date: "2026-07-03", venue: "Presque Isle Bay", category: "Festival" },
  ];

  for (const ae of annualEvents) {
    if (!events.some(e => e.name === ae.name)) {
      events.push({
        id: makeId(SOURCE, ae.date, ae.name),
        ...ae,
        time: 'TBD',
        source: SOURCE,
        url: 'https://www.erie.pa.us/',
        description: '',
        lastScraped: now(),
      });
    }
  }

  console.log(`  ✓ CityOfErie: ${events.length} events`);
  return events;
}
