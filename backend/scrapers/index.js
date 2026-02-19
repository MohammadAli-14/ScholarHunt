import axios from 'axios'
import * as cheerio from 'cheerio'

/**
 * Base scraper with shared functionality
 */
class BaseScraper {
  constructor(config = {}) {
    this.config = {
      timeout: 30000,
      minDelay: 2000,
      maxDelay: 5000,
      userAgents: [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0'
      ],
      ...config
    };
    this.metadata = {};
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async randomDelay() {
    const ms = Math.floor(Math.random() * (this.config.maxDelay - this.config.minDelay + 1)) + this.config.minDelay;
    await this.delay(ms);
  }

  getRandomUserAgent() {
    return this.config.userAgents[Math.floor(Math.random() * this.config.userAgents.length)];
  }

  setMetadata(metadata) {
    this.metadata = { ...this.metadata, ...metadata };
  }

  async fetchWithConfig(url, customHeaders = {}) {
    const userAgent = this.metadata.userAgent || this.getRandomUserAgent();
    return axios.get(url, {
      timeout: this.config.timeout,
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0',
        ...customHeaders
      }
    });
  }
}

/**
 * Scraper engine for orchestration
 */
class ScraperEngine {
  constructor(config = {}) {
    this.config = {
      retries: 3,
      minDelay: 2000,
      ...config
    };
    this.scrapers = [];
  }

  register(scraper) {
    this.scrapers.push(scraper);
  }

  async scrapeAll() {
    const results = [];
    for (const scraper of this.scrapers) {
      try {
        console.log(`[${new Date().toISOString()}] Running scraper: ${scraper.name}`);
        const data = await this.runWithRetry(scraper);
        results.push({
          source: scraper.name,
          scholarships: data,
          count: data.length,
          timestamp: new Date()
        });
        
        // Randomized delay between scrapers if scraper has randomDelay method
        if (scraper.randomDelay) {
          await scraper.randomDelay();
        } else {
           await this.delay(this.config.minDelay);
        }
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Scraper ${scraper.name} failed:`, {
          message: error.message,
          stack: error.stack,
          url: scraper.baseUrl
        });
        results.push({
          source: scraper.name,
          scholarships: [],
          error: error.message,
          timestamp: new Date()
        });
      }
    }
    return results;
  }

  async runWithRetry(scraper) {
    let lastError;
    for (let i = 0; i < this.config.retries; i++) {
      try {
        // Update scraper config with a random user agent for this attempt
        if (scraper.setMetadata && scraper.getRandomUserAgent) {
          scraper.setMetadata({ userAgent: scraper.getRandomUserAgent() });
        }
        return await scraper.scrape();
      } catch (error) {
        lastError = error;
        const delayTime = this.config.minDelay * Math.pow(2, i); // Exponential backoff
        console.warn(`[${new Date().toISOString()}] Retry ${i + 1}/${this.config.retries} for ${scraper.name}. Waiting ${delayTime}ms. Error: ${error.message}`);
        
        if (error.response) {
          console.error(`HTTP Status: ${error.response.status}`);
        }
        
        await this.delay(delayTime);
      }
    }
    throw lastError;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Scholars4Dev scraper - scrapes scholars4dev.com
 */
class Scholars4DevScraper extends BaseScraper {
  constructor() {
    super();
    this.name = 'scholars4dev';
    this.baseUrl = 'https://www.scholars4dev.com';
  }

  async scrape() {
    const scholarships = [];
    
    try {
      // Scrape the main scholarship listings page
      const listUrl = `${this.baseUrl}/category/scholarships-list/`;
      const response = await this.fetchWithConfig(listUrl);
      const $ = cheerio.load(response.data);

      // Extract scholarship listings from the page
      $('.post').each((i, element) => {
        try {
          const $el = $(element);
          const title = $el.find('.entry-title a').text().trim();
          const link = $el.find('.entry-title a').attr('href');
          const excerpt = $el.find('.entry-summary').text().trim();
          const dateText = $el.find('.entry-date').text().trim();

          if (title && link) {
            const scholarship = this.parseScholarship(title, excerpt, link, dateText);
            if (scholarship) {
              scholarships.push(scholarship);
            }
          }
        } catch (err) {
          console.warn('Error parsing individual scholarship:', err.message);
        }
      });

      console.log(`Scholars4Dev scraper found ${scholarships.length} scholarships`);
      return scholarships;
    } catch (error) {
      console.error('Scholars4Dev scraping failed:', error.message);
      // Fallback: return empty array instead of throwing to allow other scrapers to proceed
      return scholarships; 
    }
  }

  parseScholarship(title, excerpt, link, dateText) {
    // Extract key information from title and excerpt
    const country = this.extractCountry(title, excerpt);
    const fieldOfStudy = this.extractFieldOfStudy(title, excerpt);
    const deadline = this.extractDeadline(dateText, excerpt);
    const amount = this.extractAmount(excerpt);
    const fundingType = this.determineFundingType(title, excerpt);
    const university = this.extractUniversity(title, excerpt);

    return {
      id: `s4d-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: title.slice(0, 200),
      university: university || 'Various Universities',
      country: country || 'International',
      fieldOfStudy: fieldOfStudy || ['All Fields'],
      fundingType: fundingType,
      amount: amount || 'Full Funding',
      deadline: deadline,
      applicationFee: 0,
      ieltsRequired: this.hasIELTSRequirement(excerpt),
      minGPA: 3.0,
      description: excerpt.slice(0, 500),
      benefits: this.extractBenefits(excerpt),
      requirements: this.extractRequirements(excerpt),
      applicationLink: link.startsWith('http') ? link : `${this.baseUrl}${link}`,
      imageUrl: 'https://images.unsplash.com/photo-1569982175971-d92b01cf8694?w=400',
      source: 'scholars4dev',
      sourceUrl: link.startsWith('http') ? link : `${this.baseUrl}${link}`,
      lastScraped: new Date(),
      isActive: true
    };
  }

  extractCountry(title, excerpt) {
    const countries = [
      'USA', 'UK', 'Canada', 'Australia', 'Germany', 'France', 'Netherlands', 
      'Sweden', 'Switzerland', 'Japan', 'Singapore', 'New Zealand', 'Denmark',
      'Norway', 'Finland', 'Ireland', 'Austria', 'Belgium', 'Italy', 'Spain',
      'China', 'South Korea', 'Hong Kong', 'UAE', 'Saudi Arabia', 'Qatar'
    ];
    
    const text = `${title} ${excerpt}`.toLowerCase();
    
    for (const country of countries) {
      if (text.includes(country.toLowerCase())) {
        return country;
      }
    }
    
    // Check for specific patterns
    if (text.includes('united states') || text.includes('america')) return 'USA';
    if (text.includes('united kingdom') || text.includes('britain')) return 'UK';
    if (text.includes('kingdom of saudi arabia') || text.includes('ksa')) return 'Saudi Arabia';
    if (text.includes('united arab emirates')) return 'UAE';
    
    return 'International';
  }

  extractFieldOfStudy(title, excerpt) {
    const fields = [];
    const text = `${title} ${excerpt}`.toLowerCase();
    
    const fieldKeywords = {
      'Computer Science': ['computer science', 'cs', 'software', 'programming', 'computing'],
      'Engineering': ['engineering', 'engineer'],
      'Data Science': ['data science', 'data analytics', 'big data'],
      'Artificial Intelligence': ['artificial intelligence', 'ai', 'machine learning', 'ml'],
      'Cybersecurity': ['cybersecurity', 'cyber security', 'information security'],
      'Cloud Computing': ['cloud computing', 'cloud'],
      'Software Engineering': ['software engineering'],
      'Information Technology': ['information technology', 'it'],
      'Business': ['business', 'mba', 'management'],
      'Medicine': ['medicine', 'medical', 'healthcare'],
      'Law': ['law', 'legal'],
      'Economics': ['economics', 'economy'],
      'Finance': ['finance', 'financial'],
      'Mathematics': ['mathematics', 'math'],
      'Physics': ['physics'],
      'Chemistry': ['chemistry'],
      'Biology': ['biology', 'biological'],
      'Environmental Science': ['environmental', 'climate'],
    };

    for (const [field, keywords] of Object.entries(fieldKeywords)) {
      if (keywords.some(kw => text.includes(kw))) {
        fields.push(field);
      }
    }

    return fields.length > 0 ? fields : ['All Fields'];
  }

  extractDeadline(dateText, excerpt) {
    // Try to find deadline in text
    const deadlinePatterns = [
      /deadline[:\s]+([\w\s,\d]+)/i,
      /closes?[:\s]+([\w\s,\d]+)/i,
      /due[:\s]+([\w\s,\d]+)/i,
      /(\w+\s+\d{1,2},?\s+\d{4})/,
      /(\d{1,2}\s+\w+\s+\d{4})/,
    ];

    const text = `${dateText} ${excerpt}`;
    
    for (const pattern of deadlinePatterns) {
      const match = text.match(pattern);
      if (match) {
        const parsed = new Date(match[1]);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      }
    }

    // Default to 6 months from now if no deadline found
    const defaultDeadline = new Date();
    defaultDeadline.setMonth(defaultDeadline.getMonth() + 6);
    return defaultDeadline;
  }

  extractAmount(excerpt) {
    const patterns = [
      /\$[\d,]+/,
      /€[\d,]+/,
      /£[\d,]+/,
      /full tuition/,
      /full funding/,
      /fully funded/,
      /stipend/,
    ];

    for (const pattern of patterns) {
      const match = excerpt.match(pattern);
      if (match) {
        return match[0];
      }
    }

    return 'Full Funding';
  }

  determineFundingType(title, excerpt) {
    const text = `${title} ${excerpt}`.toLowerCase();
    
    if (text.includes('fully funded') || text.includes('full scholarship') || text.includes('full tuition')) {
      return 'Full Scholarship';
    }
    if (text.includes('partial')) {
      return 'Partial Scholarship';
    }
    return 'Full Scholarship';
  }

  extractUniversity(title, excerpt) {
    const text = `${title} ${excerpt}`;
    const patterns = [
      /at\s+([A-Z][\w\s]+(?:University|College|Institute|School))/,
      /([A-Z][\w\s]+University)/,
      /([A-Z][\w\s]+College)/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return null;
  }

  hasIELTSRequirement(excerpt) {
    const text = excerpt.toLowerCase();
    return text.includes('ielts') || text.includes('toefl') || text.includes('english proficiency');
  }

  extractBenefits(excerpt) {
    const benefits = [];
    const text = excerpt.toLowerCase();
    
    if (text.includes('tuition')) benefits.push('Tuition coverage');
    if (text.includes('stipend')) benefits.push('Monthly stipend');
    if (text.includes('accommodation') || text.includes('housing')) benefits.push('Accommodation');
    if (text.includes('travel')) benefits.push('Travel allowance');
    if (text.includes('health') || text.includes('insurance')) benefits.push('Health insurance');
    if (text.includes('visa')) benefits.push('Visa support');
    
    return benefits.length > 0 ? benefits : ['Full funding package'];
  }

  extractRequirements(excerpt) {
    const requirements = [];
    const text = excerpt.toLowerCase();
    
    if (text.includes('bachelor')) requirements.push("Bachelor's degree");
    if (text.includes('master')) requirements.push("Master's degree");
    if (text.includes('phd') || text.includes('doctoral')) requirements.push('PhD or equivalent');
    if (text.includes('experience')) requirements.push('Relevant experience');
    if (text.includes('ielts') || text.includes('toefl')) requirements.push('English proficiency');
    if (text.includes('gpa') || text.includes('academic')) requirements.push('Strong academic record');
    
    return requirements.length > 0 ? requirements : ['See official website for requirements'];
  }
}

/**
 * Opportunity Desk scraper - scrapes opportunitydesk.org
 */
class OpportunityDeskScraper extends BaseScraper {
  constructor() {
    super();
    this.name = 'opportunitydesk';
    this.baseUrl = 'https://opportunitydesk.org';
  }

  async scrape() {
    const scholarships = [];
    
    try {
      const listUrl = `${this.baseUrl}/category/fellowships-and-scholarships/`;
      const response = await this.fetchWithConfig(listUrl);
      const $ = cheerio.load(response.data);

      $('.post, article, .opportunity-item').each((i, element) => {
        try {
          const $el = $(element);
          const title = $el.find('h2 a, .entry-title a, h1 a').text().trim();
          const link = $el.find('h2 a, .entry-title a, h1 a').attr('href');
          const excerpt = $el.find('.entry-summary, .excerpt, p').first().text().trim();
          const deadline = $el.find('.deadline, .date').text().trim();

          if (title && link) {
            const scholarship = this.parseScholarship(title, excerpt, link, deadline);
            if (scholarship) {
              scholarships.push(scholarship);
            }
          }
        } catch (err) {
          console.warn('Error parsing opportunity:', err.message);
        }
      });

      console.log(`OpportunityDesk scraper found ${scholarships.length} scholarships`);
      return scholarships;
    } catch (error) {
      console.error('OpportunityDesk scraping failed:', error.message);
      return scholarships;
    }
  }

  parseScholarship(title, excerpt, link, deadlineText) {
    // Reuse parsing logic from Scholars4DevScraper with minor adjustments
    const s4dScraper = new Scholars4DevScraper();
    
    return {
      id: `od-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: title.slice(0, 200),
      university: s4dScraper.extractUniversity(title, excerpt) || 'Various',
      country: s4dScraper.extractCountry(title, excerpt),
      fieldOfStudy: s4dScraper.extractFieldOfStudy(title, excerpt),
      fundingType: s4dScraper.determineFundingType(title, excerpt),
      amount: s4dScraper.extractAmount(excerpt) || 'See details',
      deadline: s4dScraper.extractDeadline(deadlineText, excerpt),
      applicationFee: 0,
      ieltsRequired: s4dScraper.hasIELTSRequirement(excerpt),
      minGPA: 3.0,
      description: excerpt.slice(0, 500),
      benefits: s4dScraper.extractBenefits(excerpt),
      requirements: s4dScraper.extractRequirements(excerpt),
      applicationLink: link.startsWith('http') ? link : `${this.baseUrl}${link}`,
      imageUrl: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400',
      source: 'opportunitydesk',
      sourceUrl: link.startsWith('http') ? link : `${this.baseUrl}${link}`,
      lastScraped: new Date(),
      isActive: true
    };
  }
}

/**
 * Data normalizer - ensures consistent data format across sources
 */
function normalizeScholarship(data) {
  return {
    id: data.id || `sch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: String(data.title || '').slice(0, 200),
    university: String(data.university || 'Various Universities').slice(0, 200),
    country: String(data.country || 'International').slice(0, 100),
    fieldOfStudy: Array.isArray(data.fieldOfStudy) ? data.fieldOfStudy : ['All Fields'],
    fundingType: ['Full Scholarship', 'Partial Scholarship'].includes(data.fundingType) 
      ? data.fundingType 
      : 'Full Scholarship',
    amount: String(data.amount || 'Full Funding').slice(0, 200),
    deadline: data.deadline instanceof Date ? data.deadline : new Date(data.deadline || Date.now() + 180 * 24 * 60 * 60 * 1000),
    applicationFee: Number(data.applicationFee) || 0,
    ieltsRequired: Boolean(data.ieltsRequired),
    minGPA: Number(data.minGPA) || 3.0,
    description: String(data.description || '').slice(0, 1000),
    benefits: Array.isArray(data.benefits) ? data.benefits : ['Full funding package'],
    requirements: Array.isArray(data.requirements) ? data.requirements : ['See official website'],
    applicationLink: String(data.applicationLink || '#'),
    imageUrl: data.imageUrl || 'https://images.unsplash.com/photo-1569982175971-d92b01cf8694?w=400',
    source: String(data.source || 'manual'),
    sourceUrl: String(data.sourceUrl || data.applicationLink || '#'),
    lastScraped: data.lastScraped || new Date(),
    isActive: data.isActive !== false,
    verified: Boolean(data.verified)
  };
}

/**
 * Deduplicate scholarships based on title and university
 */
function deduplicateScholarships(scholarships) {
  const seen = new Map();
  
  return scholarships.filter(sch => {
    const key = `${sch.title.toLowerCase().trim()}-${sch.university.toLowerCase().trim()}`;
    
    if (seen.has(key)) {
      // Keep the one with more recent scrape date
      const existing = seen.get(key);
      if (new Date(sch.lastScraped) > new Date(existing.lastScraped)) {
        seen.set(key, sch);
        return true;
      }
      return false;
    }
    
    seen.set(key, sch);
    return true;
  });
}

/**
 * World Scholarship Forum scraper - scrapes worldscholarshipforum.com
 */
class WorldForumScraper extends BaseScraper {
  constructor() {
    super();
    this.name = 'worldforum';
    this.baseUrl = 'https://worldscholarshipforum.com';
    this.retryCount = 3;
    this.retryDelay = 2000;
  }

  async scrape() {
    const scholarships = [];
    
    try {
      const pages = [
        `${this.baseUrl}/scholarships-for-international-students/`,
        `${this.baseUrl}/fully-funded-scholarships/`,
        `${this.baseUrl}/category/scholarships/`
      ];
      
      for (const listUrl of pages) {
        try {
          console.log(`WorldForum scraping: ${listUrl}`);
          const response = await this.fetchWithRetry(listUrl);
          const $ = cheerio.load(response.data);
          
          $('article, .post-item, .scholarship-item, .entry').each((i, element) => {
            try {
              const $el = $(element);
              const title = $el.find('h2 a, h3 a, .entry-title a, .title a').first().text().trim();
              const link = $el.find('h2 a, h3 a, .entry-title a, .title a').first().attr('href');
              const excerpt = $el.find('p, .excerpt, .summary').first().text().trim();
              
              if (title && link && title.length > 10) {
                const scholarship = this.parseScholarship(title, excerpt, link);
                if (scholarship) {
                  scholarships.push(scholarship);
                }
              }
            } catch (err) {
              console.warn('Error parsing individual scholarship:', err.message);
            }
          });
          
          await this.delay(2000);
        } catch (err) {
          console.warn(`Failed to scrape ${listUrl}:`, err.message);
        }
      }

      console.log(`WorldForum scraper found ${scholarships.length} scholarships`);
      return scholarships;
    } catch (error) {
      console.error('WorldForum scraping failed:', error.message);
      return scholarships;
    }
  }

  async fetchWithRetry(url) {
    let lastError;
    for (let i = 0; i < this.retryCount; i++) {
      try {
        return await this.fetchWithConfig(url);
      } catch (err) {
        lastError = err;
        if (i < this.retryCount - 1) {
          await this.delay(this.retryDelay * (i + 1));
        }
      }
    }
    throw lastError;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  parseScholarship(title, excerpt, link) {
    const s4dScraper = new Scholars4DevScraper();
    
    return {
      id: `wf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: title.slice(0, 200),
      university: s4dScraper.extractUniversity(title, excerpt) || 'Various Universities',
      country: s4dScraper.extractCountry(title, excerpt),
      fieldOfStudy: s4dScraper.extractFieldOfStudy(title, excerpt),
      fundingType: s4dScraper.determineFundingType(title, excerpt),
      amount: s4dScraper.extractAmount(excerpt) || 'Full Funding',
      deadline: s4dScraper.extractDeadline('', excerpt),
      applicationFee: 0,
      ieltsRequired: s4dScraper.hasIELTSRequirement(excerpt),
      minGPA: 3.0,
      description: excerpt.slice(0, 500),
      benefits: s4dScraper.extractBenefits(excerpt),
      requirements: s4dScraper.extractRequirements(excerpt),
      applicationLink: link.startsWith('http') ? link : `${this.baseUrl}${link}`,
      imageUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=400',
      source: 'worldforum',
      sourceUrl: link.startsWith('http') ? link : `${this.baseUrl}${link}`,
      lastScraped: new Date(),
      isActive: true
    };
  }
}

/**
 * International Education Financial Aid scraper - scrapes iefa.org
 */
class IEAFScraper extends BaseScraper {
  constructor() {
    super();
    this.name = 'iefa';
    this.baseUrl = 'https://www.iefa.org';
    this.retryCount = 3;
    this.retryDelay = 2000;
  }

  async scrape() {
    const scholarships = [];
    
    try {
      const listUrl = `${this.baseUrl}/scholarships`;
      console.log(`IEAF scraping: ${listUrl}`);
      
      const response = await this.fetchWithRetry(listUrl);
      const $ = cheerio.load(response.data);
      
      $('.scholarship-item, .result-item, article, .listing').each((i, element) => {
        try {
          const $el = $(element);
          const title = $el.find('h2 a, h3 a, .title a, .scholarship-title').first().text().trim();
          const link = $el.find('h2 a, h3 a, .title a').first().attr('href');
          const excerpt = $el.find('p, .description, .summary').first().text().trim();
          
          if (title && title.length > 10) {
            const scholarship = this.parseScholarship(title, excerpt, link || listUrl);
            if (scholarship) {
              scholarships.push(scholarship);
            }
          }
        } catch (err) {
          console.warn('Error parsing individual scholarship:', err.message);
        }
      });

      console.log(`IEAF scraper found ${scholarships.length} scholarships`);
      return scholarships;
    } catch (error) {
      console.error('IEAF scraping failed:', error.message);
      return scholarships;
    }
  }

  async fetchWithRetry(url) {
    let lastError;
    for (let i = 0; i < this.retryCount; i++) {
      try {
        return await this.fetchWithConfig(url);
      } catch (err) {
        lastError = err;
        if (i < this.retryCount - 1) {
          await this.delay(this.retryDelay * (i + 1));
        }
      }
    }
    throw lastError;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  parseScholarship(title, excerpt, link) {
    const s4dScraper = new Scholars4DevScraper();
    
    return {
      id: `iefa-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: title.slice(0, 200),
      university: s4dScraper.extractUniversity(title, excerpt) || 'Various Universities',
      country: s4dScraper.extractCountry(title, excerpt),
      fieldOfStudy: s4dScraper.extractFieldOfStudy(title, excerpt),
      fundingType: s4dScraper.determineFundingType(title, excerpt),
      amount: s4dScraper.extractAmount(excerpt) || 'Full Funding',
      deadline: s4dScraper.extractDeadline('', excerpt),
      applicationFee: 0,
      ieltsRequired: s4dScraper.hasIELTSRequirement(excerpt),
      minGPA: 3.0,
      description: excerpt.slice(0, 500),
      benefits: s4dScraper.extractBenefits(excerpt),
      requirements: s4dScraper.extractRequirements(excerpt),
      applicationLink: link.startsWith('http') ? link : `${this.baseUrl}${link}`,
      imageUrl: 'https://images.unsplash.com/photo-1562774053-701939374585?w=400',
      source: 'iefa',
      sourceUrl: link.startsWith('http') ? link : `${this.baseUrl}${link}`,
      lastScraped: new Date(),
      isActive: true
    };
  }
}

/**
 * After School Africa scraper - scrapes afterschoolafrica.com
 */
class AfterSchoolAfricaScraper extends BaseScraper {
  constructor() {
    super();
    this.name = 'afterschoolafrica';
    this.baseUrl = 'https://www.afterschoolafrica.com';
    this.retryCount = 3;
    this.retryDelay = 2000;
  }

  async scrape() {
    const scholarships = [];
    
    try {
      const listUrl = `${this.baseUrl}/scholarships/`;
      console.log(`AfterSchoolAfrica scraping: ${listUrl}`);
      
      const response = await this.fetchWithRetry(listUrl);
      const $ = cheerio.load(response.data);
      
      $('article, .post').each((i, element) => {
        try {
          const $el = $(element);
          const title = $el.find('h2 a, h3 a, .entry-title a').first().text().trim();
          const link = $el.find('h2 a, h3 a, .entry-title a').first().attr('href');
          const excerpt = $el.find('.entry-summary, p').first().text().trim();
          
          if (title && link && title.length > 10) {
            const scholarship = this.parseScholarship(title, excerpt, link);
            if (scholarship) {
              scholarships.push(scholarship);
            }
          }
        } catch (err) {
          console.warn('Error parsing individual scholarship:', err.message);
        }
      });

      console.log(`AfterSchoolAfrica scraper found ${scholarships.length} scholarships`);
      return scholarships;
    } catch (error) {
      console.error('AfterSchoolAfrica scraping failed:', error.message);
      return scholarships;
    }
  }

  async fetchWithRetry(url) {
    let lastError;
    for (let i = 0; i < this.retryCount; i++) {
      try {
        return await this.fetchWithConfig(url);
      } catch (err) {
        lastError = err;
        if (i < this.retryCount - 1) {
          await this.delay(this.retryDelay * (i + 1));
        }
      }
    }
    throw lastError;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  parseScholarship(title, excerpt, link) {
    const s4dScraper = new Scholars4DevScraper();
    
    return {
      id: `asa-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: title.slice(0, 200),
      university: s4dScraper.extractUniversity(title, excerpt) || 'Various Universities',
      country: s4dScraper.extractCountry(title, excerpt),
      fieldOfStudy: s4dScraper.extractFieldOfStudy(title, excerpt),
      fundingType: s4dScraper.determineFundingType(title, excerpt),
      amount: s4dScraper.extractAmount(excerpt) || 'Full Funding',
      deadline: s4dScraper.extractDeadline('', excerpt),
      applicationFee: 0,
      ieltsRequired: s4dScraper.hasIELTSRequirement(excerpt),
      minGPA: 3.0,
      description: excerpt.slice(0, 500),
      benefits: s4dScraper.extractBenefits(excerpt),
      requirements: s4dScraper.extractRequirements(excerpt),
      applicationLink: link.startsWith('http') ? link : `${this.baseUrl}${link}`,
      imageUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400',
      source: 'afterschoolafrica',
      sourceUrl: link.startsWith('http') ? link : `${this.baseUrl}${link}`,
      lastScraped: new Date(),
      isActive: true
    };
  }
}

export {
  ScraperEngine,
  Scholars4DevScraper,
  OpportunityDeskScraper,
  WorldForumScraper,
  IEAFScraper,
  AfterSchoolAfricaScraper,
  normalizeScholarship,
  deduplicateScholarships
}