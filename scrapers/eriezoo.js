/**
 * Scraper: eriezoo.org
 * Crawls the Erie Zoo website for events (seasonal events, camps, special programs)
 */

import { fetchPage, parseDate, parseTime, makeId, inferCategory, sleep, now, fetchEventDetail } from './utils.js';

const SOURCE = 'ErieZoo';
const DEFAULT_VENUE = 'Erie Zoo';
const DEFAULT_CATEGORY = 'Family';

// URLs to try — zoo sites vary in where they list events
const EVENT_URLS = [
  'https://www.eriezoo.org/events',
  'https://www.eriezoo.org/calendar',
  'https://www.eriezoo.org',
];

// Selectors to try for event containers
const EVENT_SELECTORS = [
  'article',
  '.event-item',
  '.event-card',
  '[class*="event"]',
  '.views-row',
  '.tribe-events-calendar-list__event',
  '.tribe-common-g-row',
  '.tribe-events-list .type-tribe_events',
  '.eventlist-event',
  '.sqs-block-content .summary-item',
  '[data-item-id]',
  '.wp-block-post',
  '.entry',
  '.post',
  '.card',
  '.list-item',
];

// Selectors for event name within a container
const NAME_SELECTORS = [
  'h1', 'h2', 'h3', 'h4',
  '.event-title', '.event-name',
  '.summary-title', '.eventlist-title',
  '.tribe-events-list-event-title',
  '[class*="title"]',
  'a',
];

// Selectors for date within a container
const DATE_SELECTORS = [
  'time', '.event-date', '.eventlist-meta-date',
  '.tribe-event-schedule-details',
  '[class*="date"]', '[datetime]',
  '.meta', '.event-meta',
];

// Selectors for description within a container
const DESC_SELECTORS = [
  '.event-description', '.event-excerpt', '.summary-excerpt',
  '.eventlist-description', '.tribe-events-list-event-description',
  '[class*="description"]', '[class*="excerpt"]',
  'p',
];

export async function scrapeErieZoo() {
  console.log('🦁 Scraping Erie Zoo...');
  const events = [];
  let foundContent = false;

  for (const url of EVENT_URLS) {
    console.log(`  Trying ${url}...`);
    const $ = await fetchPage(url);
    if (!$) {
      console.log(`  Could not fetch ${url}`);
      await sleep(1500);
      continue;
    }

    // Try each event selector to find event containers
    for (const selector of EVENT_SELECTORS) {
      const elements = $(selector).toArray();
      if (elements.length === 0) continue;

      console.log(`  Found ${elements.length} elements matching "${selector}" on ${url}`);

      for (const el of elements) {
        const $el = $(el);
        const fullText = $el.text().trim();

        // Skip tiny or navigation-only elements
        if (fullText.length < 10) continue;

        // Extract event name
        let name = '';
        for (const ns of NAME_SELECTORS) {
          const $name = $el.find(ns).first();
          if ($name.length) {
            name = $name.text().trim();
            if (name.length > 2 && name.length < 200) break;
            name = '';
          }
        }
        if (!name || name.length < 3) continue;

        // Skip generic navigation/footer text
        if (/^(menu|home|about|contact|donate|gift shop|membership|directions|hours)/i.test(name)) continue;
        if (/^(privacy|terms|copyright|follow us|newsletter)/i.test(name)) continue;

        // Extract date
        let date = null;

        // Try datetime attribute first
        const $time = $el.find('time[datetime], [datetime]').first();
        if ($time.length) {
          date = parseDate($time.attr('datetime'));
        }

        // Try date selectors
        if (!date) {
          for (const ds of DATE_SELECTORS) {
            const $date = $el.find(ds).first();
            if ($date.length) {
              const dateText = $date.text().trim();
              date = parseDate(dateText);
              if (date) break;
              // Try datetime attr on date element
              const dt = $date.attr('datetime');
              if (dt) {
                date = parseDate(dt);
                if (date) break;
              }
            }
          }
        }

        // Try to find date in the full text
        if (!date) {
          // Match patterns like "April 3, 2026" or "Apr 3rd, 2026"
          const datePatterns = [
            /(\w+ \d{1,2},?\s*\d{4})/,
            /(\d{1,2}\/\d{1,2}\/\d{4})/,
            /(\d{4}-\d{2}-\d{2})/,
          ];
          for (const pattern of datePatterns) {
            const match = fullText.match(pattern);
            if (match) {
              date = parseDate(match[1]);
              if (date) break;
            }
          }
        }

        // If still no date, skip this element (we need a date for a valid event)
        if (!date) continue;

        // Extract time
        let time = 'TBD';
        const timeMatch = fullText.match(/(\d{1,2}:\d{2}\s*[AP]M)/i);
        if (timeMatch) {
          time = parseTime(timeMatch[1]);
        }

        // Extract URL
        let eventUrl = '';
        const $link = $el.find('a[href]').first();
        if ($link.length) {
          const href = $link.attr('href') || '';
          if (href.startsWith('http')) {
            eventUrl = href;
          } else if (href.startsWith('/')) {
            eventUrl = `https://www.eriezoo.org${href}`;
          }
        }

        // If the container itself is a link
        if (!eventUrl && $el.is('a')) {
          const href = $el.attr('href') || '';
          if (href.startsWith('http')) {
            eventUrl = href;
          } else if (href.startsWith('/')) {
            eventUrl = `https://www.eriezoo.org${href}`;
          }
        }

        // Extract description
        let description = '';
        for (const ds of DESC_SELECTORS) {
          const $desc = $el.find(ds).first();
          if ($desc.length) {
            const descText = $desc.text().trim();
            if (descText.length > 20 && descText !== name) {
              description = descText.slice(0, 200);
              break;
            }
          }
        }

        // Extract image
        let image = '';
        const $img = $el.find('img').first();
        if ($img.length) {
          const src = $img.attr('src') || $img.attr('data-src') || '';
          if (src && !src.includes('logo') && !src.includes('icon')) {
            image = src.startsWith('http') ? src : `https://www.eriezoo.org${src}`;
          }
        }

        // Determine category — zoo events are typically Family, but check for specifics
        const category = inferCategory(name, DEFAULT_VENUE) === 'Community'
          ? DEFAULT_CATEGORY
          : inferCategory(name, DEFAULT_VENUE);

        // Check for duplicate within this scrape
        const id = makeId(SOURCE, date, name);
        if (events.some(e => e.id === id)) continue;

        events.push({
          id,
          name,
          date,
          time,
          venue: DEFAULT_VENUE,
          category,
          source: SOURCE,
          url: eventUrl,
          image: image || '',
          description,
          lastScraped: now(),
        });
      }

      // If we found events with this selector, don't try more selectors on this URL
      if (events.length > 0) {
        foundContent = true;
        break;
      }
    }

    // Also scan for links that look like event detail pages
    if (!foundContent) {
      const eventLinks = $('a[href*="event"], a[href*="program"], a[href*="camp"], a[href*="activity"]').toArray();
      console.log(`  Found ${eventLinks.length} event-like links on ${url}`);

      for (const link of eventLinks) {
        const $link = $(link);
        const name = $link.text().trim();
        const href = $link.attr('href') || '';

        if (!name || name.length < 3 || name.length > 200) continue;
        if (/^(menu|home|about|contact|donate)/i.test(name)) continue;

        let eventUrl = '';
        if (href.startsWith('http')) {
          eventUrl = href;
        } else if (href.startsWith('/')) {
          eventUrl = `https://www.eriezoo.org${href}`;
        }

        // We'll try to get date from the detail page later
        // For now, store what we have
        const fullText = $link.parent().text();
        let date = null;
        const datePatterns = [
          /(\w+ \d{1,2},?\s*\d{4})/,
          /(\d{1,2}\/\d{1,2}\/\d{4})/,
          /(\d{4}-\d{2}-\d{2})/,
        ];
        for (const pattern of datePatterns) {
          const match = fullText.match(pattern);
          if (match) {
            date = parseDate(match[1]);
            if (date) break;
          }
        }

        if (!date) continue;

        const time = parseTime(fullText);
        const id = makeId(SOURCE, date, name);
        if (events.some(e => e.id === id)) continue;

        const category = inferCategory(name, DEFAULT_VENUE) === 'Community'
          ? DEFAULT_CATEGORY
          : inferCategory(name, DEFAULT_VENUE);

        events.push({
          id,
          name,
          date,
          time,
          venue: DEFAULT_VENUE,
          category,
          source: SOURCE,
          url: eventUrl,
          image: '',
          description: '',
          lastScraped: now(),
        });
      }
    }

    if (events.length > 0) {
      console.log(`  Found ${events.length} events from ${url}`);
      foundContent = true;
      break; // Don't try more URLs if we found events
    }

    await sleep(1500);
  }

  // Fetch detail pages for images/descriptions (limit to 10 to avoid slowness)
  const toFetch = events.filter(e => e.url).slice(0, 10);
  console.log(`  Fetching ${toFetch.length} detail pages for images/descriptions...`);
  for (const e of toFetch) {
    const detail = await fetchEventDetail(e.url);
    if (detail.image && !e.image) e.image = detail.image;
    if (detail.description && !e.description) e.description = detail.description;
    await sleep(1000);
  }

  console.log(`  ✓ ErieZoo: ${events.length} events`);
  return events;
}
