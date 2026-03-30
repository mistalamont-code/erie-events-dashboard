/**
 * Scraper: celebrateerie.com
 * CelebrateErie festival — August 14-16, 2026
 */

import { fetchPage, makeId, now } from './utils.js';

const URL = 'https://www.celebrateerie.com/';
const SOURCE = 'CelebrateErie';

export async function scrapeCelebrateErie() {
  console.log('🩷 Scraping CelebrateErie.com...');
  const events = [];
  const $ = await fetchPage(URL);

  // CelebrateErie is a known 3-day event: Aug 14-16, 2026
  // The site confirms this. We hardcode the dates but scrape for any updates.
  const dates = ['2026-08-14', '2026-08-15', '2026-08-16'];
  const labels = ['Day 1', 'Day 2', 'Day 3'];

  // Check if the site has updated info (headliners, schedule)
  let description = '';
  if ($) {
    const pageText = $('body').text();
    // Look for any headliner or schedule announcements
    if (pageText.includes('headliner') || pageText.includes('lineup')) {
      // Extract what we can
      const match = pageText.match(/headlin\w+[:\s]+([^\n.]+)/i);
      if (match) description = match[1].trim();
    }
  }

  dates.forEach((date, i) => {
    events.push({
      id: makeId(SOURCE, date, `celebrateerie-${labels[i].toLowerCase().replace(' ','-')}`),
      name: `CelebrateErie 2026 — ${labels[i]}`,
      date,
      time: 'TBD',
      venue: 'Downtown Erie',
      category: 'Festival',
      source: SOURCE,
      url: 'https://www.celebrateerie.com/',
      description,
      lastScraped: now(),
    });
  });

  console.log(`  ✓ CelebrateErie: ${events.length} events`);
  return events;
}
