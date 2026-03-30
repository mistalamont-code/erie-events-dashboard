/**
 * Scraper: eriereader.com
 * Erie Reader's community events calendar — the most comprehensive
 * local events listing in Erie. Paginated (up to 44+ pages).
 * 
 * Structure: Each event is in a block with:
 *   - Date heading (h2): "April 1st, 2026"
 *   - Event title (h3)
 *   - Category label
 *   - Date/time string: "4/1/2026 from 6 PM to 8 PM"
 *   - Venue with address
 *   - Description snippet
 */

import { fetchPage, parseDate, parseTime, makeId, inferCategory, sleep, now, extractImage } from './utils.js';

const BASE = 'https://www.eriereader.com/calendar';
const SOURCE = 'ErieReader';
const MAX_PAGES = 15; // They have 44+ pages but many are far-future repeats

// Erie Reader uses their own category labels — map to ours
const CATEGORY_MAP = {
  'Comedy': 'Comedy',
  'Community & Causes': 'Community',
  'Dance': 'Arts',
  'Education & Instruction': 'Community',
  'Food & Drink': 'Festival',
  'Health & Wellness': 'Community',
  'Hobbies & Interests': 'Community',
  'Kids/Family': 'Family',
  'Literary Arts': 'Arts',
  'Movies': 'Arts',
  'Music': 'Music',
  'Outdoors & Recreation': 'Community',
  'Performing Arts': 'Theater',
  'Shopping': 'Community',
  'Sports': 'Sports',
  'Visual Arts': 'Arts',
};

export async function scrapeErieReader() {
  console.log('📰 Scraping ErieReader.com...');
  const events = [];
  let currentDateHeading = null;

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = page === 1 ? BASE : `${BASE}/page/${page}`;
    const $ = await fetchPage(url);
    if (!$) break;

    // Track date context from h2 headings
    const content = $('h2, h3').toArray();
    
    // Parse the page looking for event blocks
    // Erie Reader structure: date headings in h2, event names in h3
    // Each event block has category, datetime, venue info nearby
    
    $('h3').each((i, el) => {
      const $h3 = $(el);
      const name = $h3.text().trim();
      if (!name || name.length < 4) return;
      
      // Skip non-event h3s (navigation, sidebar, etc.)
      if (/Popular This Week|Erie Reader|View Past|In This Issue|Thank You|Enter Your|Processing/i.test(name)) return;
      
      // Get the parent/container for context
      const $parent = $h3.parent();
      const blockText = $parent.text();
      
      // Extract date from nearby text — format: "M/D/YYYY" or "M/D/YYYY from TIME to TIME"
      const dateMatch = blockText.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (!dateMatch) return;
      
      const month = dateMatch[1].padStart(2, '0');
      const day = dateMatch[2].padStart(2, '0');
      const year = dateMatch[3];
      const date = `${year}-${month}-${day}`;
      
      // Validate year
      if (year !== '2026' && year !== '2027') return;
      
      // Extract time
      const timeMatch = blockText.match(/(?:from\s+)?(\d{1,2}(?::\d{2})?\s*[AP]M)/i);
      let time = 'TBD';
      if (timeMatch) {
        time = timeMatch[1].trim();
        // Normalize "6 PM" to "6:00 PM"
        if (!/:\d{2}/.test(time)) {
          time = time.replace(/(\d+)\s*([AP]M)/i, '$1:00 $2');
        }
      }
      
      // Extract category from nearby text
      let category = 'Community';
      for (const [erCat, ourCat] of Object.entries(CATEGORY_MAP)) {
        if (blockText.includes(erCat)) {
          category = ourCat;
          break;
        }
      }
      
      // Extract venue — typically after the date line
      let venue = 'Erie, PA';
      // Look for known venue patterns or address-like text
      const venuePatterns = [
        /(?:Erie Art Museum|Warner Theatre|UPMC Park|Erie Insurance Arena|Bayfront Convention Center|Perry Square|Liberty Park|Frontier Park)/,
        /([^,\n]{5,50}),\s*\d+\s+[A-Z][a-z]+\s+(?:St|Ave|Rd|Dr|Blvd|Pkwy)/,
      ];
      for (const pat of venuePatterns) {
        const vm = blockText.match(pat);
        if (vm) {
          venue = vm[0].split(',')[0].trim();
          break;
        }
      }
      // Fallback: grab text that looks like a venue name
      if (venue === 'Erie, PA') {
        const lines = blockText.split('\n').map(l => l.trim()).filter(Boolean);
        for (const line of lines) {
          // Venue lines often contain a street address
          if (/\d+\s+\w+\s+(St|Ave|Rd|Dr|Blvd|Street|Avenue|Road|Drive)\b/i.test(line)) {
            venue = line.split(',')[0].trim();
            break;
          }
        }
      }
      
      // Get URL if there's a link
      const $link = $h3.find('a').length ? $h3.find('a') : $h3.closest('a');
      const href = $link.attr('href') || '';
      const eventUrl = href.startsWith('http') ? href : 
                       href ? `https://www.eriereader.com${href}` : '';
      
      // Try to grab image from nearby content
      const $img = $parent.find('img').first();
      let image = '';
      if ($img.length) {
        image = $img.attr('src') || $img.attr('data-src') || '';
        if (image && !image.startsWith('http')) image = 'https://www.eriereader.com' + image;
      }

      events.push({
        id: makeId(SOURCE, date, name),
        name: name.slice(0, 120),
        date,
        time,
        venue: venue.slice(0, 80),
        category,
        source: SOURCE,
        url: eventUrl,
        image,
        description: '',
        lastScraped: now(),
      });
    });

    console.log(`  Page ${page}: ${events.length} events so far`);
    
    // Check if we've gone past a reasonable date range
    const lastEvent = events[events.length - 1];
    if (lastEvent && lastEvent.date > '2026-12-31') {
      console.log('  Reached end of 2026, stopping pagination');
      break;
    }
    
    await sleep(2000); // Be polite to Erie Reader's server
  }

  console.log(`  ✓ ErieReader: ${events.length} events`);
  return events;
}
