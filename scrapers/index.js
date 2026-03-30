#!/usr/bin/env node

/**
 * Erie Events Dashboard — Main Scraper Orchestrator
 * 
 * Runs all source scrapers, deduplicates results,
 * and writes the unified events.json file.
 * 
 * Usage:
 *   npm run scrape           # Full run, writes data/events.json
 *   npm run scrape:test      # Dry run, console output only
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { deduplicateEvents, isValidEvent } from './utils.js';

// Import all scrapers
import { scrapeErieEvents } from './erieevents.js';
import { scrapeFlagshipCity } from './flagshipcity.js';
import { scrapeVisitErie } from './visiterie.js';
import { scrapeErieDowntown } from './eriedowntown.js';
import { scrapeArtMuseum } from './artmuseum.js';
import { scrapeChildrensMuseum } from './childrensmuseum.js';
import { scrapeCelebrateErie } from './celebrateerie.js';
import { scrapeCityOfErie } from './cityoferie.js';
import { scrapeErieReader } from './eriereader.js';
import { scrapeErieChamber } from './eriechamber.js';
import { scrapeGannonEvents } from './gannonevents.js';
import { scrapeEriePlayhouse } from './erieplayhouse.js';
import { scrapeErieZoo } from './eriezoo.js';
import { scrapeErieArtsCulture } from './erieartsculture.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, '..', 'data');
const OUTPUT_FILE = join(DATA_DIR, 'events.json');
const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  ⚓ Erie Events Dashboard — Daily Scraper');
  console.log(`  ${new Date().toISOString()}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  const allEvents = [];
  const errors = [];

  // Run each scraper with error isolation
  const scrapers = [
    { name: 'ErieEvents', fn: scrapeErieEvents },
    { name: 'FlagshipCity', fn: scrapeFlagshipCity },
    { name: 'VisitErie', fn: scrapeVisitErie },
    { name: 'ErieDowntown', fn: scrapeErieDowntown },
    { name: 'ArtMuseum', fn: scrapeArtMuseum },
    { name: 'ChildrensMuseum', fn: scrapeChildrensMuseum },
    { name: 'CelebrateErie', fn: scrapeCelebrateErie },
    { name: 'CityOfErie', fn: scrapeCityOfErie },
    { name: 'ErieReader', fn: scrapeErieReader },
    { name: 'ErieChamber', fn: scrapeErieChamber },
    { name: 'GannonEvents', fn: scrapeGannonEvents },
    { name: 'EriePlayhouse', fn: scrapeEriePlayhouse },
    { name: 'ErieZoo', fn: scrapeErieZoo },
    { name: 'ErieArtsCulture', fn: scrapeErieArtsCulture },
  ];

  for (const { name, fn } of scrapers) {
    try {
      const events = await fn();
      const valid = events.filter(isValidEvent);
      if (valid.length < events.length) {
        console.warn(`  ⚠ ${name}: ${events.length - valid.length} events failed validation`);
      }
      allEvents.push(...valid);
    } catch (err) {
      console.error(`  ✗ ${name} FAILED: ${err.message}`);
      errors.push({ source: name, error: err.message });
    }
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Remove past events (keep today and forward)
  const today = new Date().toISOString().slice(0, 10);
  const current = allEvents.filter(e => e.date >= today);
  console.log(`  Removed past:      ${allEvents.length - current.length} events before ${today}`);

  // Deduplicate
  const deduped = deduplicateEvents(current);

  // Sort by date
  deduped.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  // Summary
  const bySrc = {};
  deduped.forEach(e => bySrc[e.source] = (bySrc[e.source] || 0) + 1);

  console.log(`  Total scraped:     ${allEvents.length}`);
  console.log(`  After dedup:       ${deduped.length}`);
  console.log(`  Errors:            ${errors.length}`);
  console.log('');
  console.log('  By source:');
  Object.entries(bySrc).sort((a,b) => b[1] - a[1]).forEach(([src, count]) => {
    console.log(`    ${src.padEnd(20)} ${count}`);
  });
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Build output
  const output = {
    meta: {
      lastUpdated: new Date().toISOString(),
      totalEvents: deduped.length,
      sources: Object.keys(bySrc),
      errors: errors.length > 0 ? errors : undefined,
    },
    events: deduped,
  };

  if (DRY_RUN) {
    console.log('');
    console.log('  [DRY RUN] Would write to:', OUTPUT_FILE);
    console.log('  Sample events:');
    deduped.slice(0, 5).forEach(e => {
      console.log(`    ${e.date} | ${e.name.slice(0, 50)} | ${e.source}`);
    });
  } else {
    // Ensure data directory exists
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    
    // Write JSON
    writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
    console.log('');
    console.log(`  ✓ Written to: ${OUTPUT_FILE}`);
    console.log(`  ✓ File size: ${(JSON.stringify(output).length / 1024).toFixed(1)} KB`);
  }

  console.log('');
  console.log('  Done! ⚓');
  console.log('');

  // Exit with error code if any scrapers failed
  if (errors.length > 0) process.exit(1);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
