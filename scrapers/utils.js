/**
 * Shared utilities for Erie Events scrapers
 */

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

// Polite delay between requests
const DELAY_MS = 1500;

/**
 * Fetch a URL with retry logic and polite delay
 */
export async function fetchPage(url, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      if (i > 0) await sleep(DELAY_MS * 2);
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'ErieEventsAggregator/1.0 (EDDC Downtown Erie; contact@erieddc.org)',
          'Accept': 'text/html,application/xhtml+xml',
        },
        timeout: 15000,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      const html = await res.text();
      return cheerio.load(html);
    } catch (err) {
      if (i === retries) {
        console.error(`  ✗ Failed to fetch ${url}: ${err.message}`);
        return null;
      }
      console.warn(`  ↻ Retry ${i + 1} for ${url}`);
    }
  }
  return null;
}

/**
 * Sleep helper
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate a stable event ID from source + date + name
 */
export function makeId(source, date, name) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
  return `${source}-${date}-${slug}`;
}

/**
 * Parse a date string into YYYY-MM-DD format
 * Handles formats like "Friday Apr 3rd, 2026", "April 3, 2026", "2026-04-03"
 */
export function parseDate(str) {
  if (!str) return null;
  
  // Already in ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(str.trim())) return str.trim();
  
  // Remove ordinal suffixes
  const cleaned = str.replace(/(\d+)(st|nd|rd|th)/gi, '$1').trim();
  
  // Try native Date parsing
  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear();
    if (year < 2026 || year > 2027) return null;
    return `${year}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  
  return null;
}

/**
 * Extract time from a string like "06:05 PM" or "7:30 PM"
 */
export function parseTime(str) {
  if (!str) return 'TBD';
  const match = str.match(/(\d{1,2}:\d{2}\s*[AP]M)/i);
  return match ? match[1].trim() : 'TBD';
}

/**
 * Infer event category from name and venue keywords
 */
export function inferCategory(name, venue = '') {
  const text = `${name} ${venue}`.toLowerCase();
  
  if (/seawolves|otters|globetrotters|bull rid|sports|game|rodeo/.test(text)) return 'Sports';
  if (/seinfeld|cable guy|comedy|laugh|mochrie|sherwood|standup|stand-up/.test(text)) return 'Comedy';
  if (/musical|ballet|broadway|book of mormon|clue|bat out|theater|theatre|opera|requiem/.test(text)) return 'Theater';
  if (/gallery night|art museum|spring show|art walk|exhibition|curator/.test(text)) return 'Arts';
  if (/dance|recital/.test(text)) return 'Arts';
  if (/festival|fest |celebrate|pride|juneteenth|greek|polish|italian|german|irish|masala|winefest|wine fest|cherry|heritage|discover presque|fireworks|parade|carnival/.test(text)) return 'Festival';
  if (/concert|live music|karaoke|trio|band|tour |singer|musician|blues|jazz|reggae|sunset series|8 great/.test(text)) return 'Music';
  if (/kids|children|family|egg hunt|camp|santa|bike rodeo|play/.test(text)) return 'Family';
  if (/gala|expo|dinner|yoga|farmers|market|fundraiser|volunteer/.test(text)) return 'Community';
  
  return 'Community';
}

/**
 * Deduplicate events by normalized name + date
 */
export function deduplicateEvents(events) {
  const seen = new Map();
  
  return events.filter(e => {
    const key = e.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30) + '|' + e.date;
    if (seen.has(key)) {
      // Keep the one with more info (has time, has URL, etc.)
      const existing = seen.get(key);
      if (!existing.url && e.url) {
        seen.set(key, e);
        return true;
      }
      return false;
    }
    seen.set(key, e);
    return true;
  });
}

/**
 * Validate an event object has minimum required fields
 */
export function isValidEvent(e) {
  return (
    e.name && e.name.length > 2 &&
    e.date && /^\d{4}-\d{2}-\d{2}$/.test(e.date) &&
    e.venue && e.venue.length > 1 &&
    e.source
  );
}

/**
 * Format the current timestamp
 */
export function now() {
  return new Date().toISOString();
}
