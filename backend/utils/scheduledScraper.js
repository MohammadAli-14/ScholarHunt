import { ScraperEngine, Scholars4DevScraper, OpportunityDeskScraper, normalizeScholarship, deduplicateScholarships } from '../scrapers/index.js';

/**
 * Scheduled scraper job - runs periodically to fetch new scholarships
 */
export class ScheduledScraper {
  constructor(db, intervalHours = 24) {
    this.db = db;
    this.intervalHours = intervalHours;
    this.isRunning = false;
    this.lastRun = null;
  }

  start() {
    console.log(`Starting scheduled scraper (interval: ${this.intervalHours} hours)`);
    
    // Run immediately on start
    this.runScrape();
    
    // Schedule recurring runs
    const intervalMs = this.intervalHours * 60 * 60 * 1000;
    this.intervalId = setInterval(() => {
      this.runScrape();
    }, intervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('Scheduled scraper stopped');
  }

  async runScrape() {
    if (this.isRunning) {
      console.log('Scrape already in progress, skipping...');
      return;
    }

    this.isRunning = true;
    console.log(`Starting scheduled scrape at ${new Date().toISOString()}`);

    try {
      const engine = new ScraperEngine();
      engine.register(new Scholars4DevScraper());
      engine.register(new OpportunityDeskScraper());

      const results = await engine.scrapeAll();

      // Collect all scholarships
      let allScholarships = [];
      results.forEach(result => {
        if (result.scholarships && result.scholarships.length > 0) {
          allScholarships = allScholarships.concat(result.scholarships);
        }
      });

      console.log(`Scraped ${allScholarships.length} total scholarships from all sources`);

      // Normalize and deduplicate
      const normalized = allScholarships.map(s => normalizeScholarship(s));
      const unique = deduplicateScholarships(normalized);

      // Get existing IDs to avoid overwriting
      const existingIds = await this.db.collection('scholarships').distinct('id');
      const existingSet = new Set(existingIds);

      // Filter out existing ones and add new ones
      const newScholarships = unique.filter(s => !existingSet.has(s.id));

      if (newScholarships.length > 0) {
        await this.db.collection('scholarships').insertMany(newScholarships);
        console.log(`Added ${newScholarships.length} new scholarships to database`);
      } else {
        console.log('No new scholarships found');
      }

      // Update scrape log
      await this.db.collection('scrape_logs').insertOne({
        timestamp: new Date(),
        totalFound: allScholarships.length,
        newAdded: newScholarships.length,
        sources: results.map(r => ({ source: r.source, count: r.count, error: r.error }))
      });

      this.lastRun = new Date();
      console.log('Scheduled scrape completed successfully');

    } catch (error) {
      console.error('Scheduled scrape failed:', error);
      
      // Log the error
      await this.db.collection('scrape_logs').insertOne({
        timestamp: new Date(),
        error: error.message,
        status: 'failed'
      });
    } finally {
      this.isRunning = false;
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      intervalHours: this.intervalHours
    };
  }
}
