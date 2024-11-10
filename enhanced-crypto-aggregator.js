// src/services/rateLimit.js
class RateLimiter {
  constructor(maxRequests, timeWindow) {
    this.maxRequests = maxRequests;    // Maximum requests allowed
    this.timeWindow = timeWindow;      // Time window in milliseconds
    this.requests = [];                // Request timestamps
    this.waiting = [];                // Queue of waiting requests
  }

  async throttle() {
    const now = Date.now();
    
    // Remove old requests outside the time window
    this.requests = this.requests.filter(
      time => time > now - this.timeWindow
    );

    if (this.requests.length >= this.maxRequests) {
      // Calculate wait time for next available slot
      const oldestRequest = this.requests[0];
      const waitTime = oldestRequest + this.timeWindow - now;
      
      // Wait for next available slot
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.requests.push(now);
  }
}

// src/services/tradingViewIntegrator.js
class TradingViewIntegrator {
  constructor() {
    // Rate limits for TradingView API
    this.rateLimiter = new RateLimiter(30, 60000); // 30 requests per minute
    this.wsEndpoint = 'wss://data.tradingview.com/socket.io/websocket';
    this.connection = null;
    this.subscriptions = new Map();
  }

  async connect() {
    if (this.connection) return;

    this.connection = new WebSocket(this.wsEndpoint);
    
    this.connection.onmessage = (event) => {
      this.handleMessage(JSON.parse(event.data));
    };

    await new Promise((resolve, reject) => {
      this.connection.onopen = resolve;
      this.connection.onerror = reject;
    });
  }

  async subscribeToSymbol(symbol) {
    await this.rateLimiter.throttle();
    
    const subscription = {
      symbol,
      indicators: ['RSI', 'MACD', 'BB'], // Default technical indicators
      timeframe: '1D'
    };

    this.connection.send(JSON.stringify({
      action: 'subscribe',
      params: subscription
    }));

    this.subscriptions.set(symbol, subscription);
  }

  async getAnalysis(symbol) {
    await this.rateLimiter.throttle();
    
    try {
      const response = await fetch(`https://scanner.tradingview.com/${symbol}/analysis`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching TradingView analysis:', error);
      return null;
    }
  }
}

// src/services/metadataExtractor.js
class MetadataExtractor {
  constructor() {
    this.entityRecognizer = new EntityRecognizer();
    this.cache = new Map();
  }

  extractMetadata(article) {
    const cacheKey = this.generateCacheKey(article);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const metadata = {
      entities: this.extractEntities(article),
      topics: this.identifyTopics(article),
      sentiment: this.analyzeSentiment(article),
      marketImpact: this.assessMarketImpact(article),
      credibilityScore: this.calculateCredibilityScore(article),
      timestamp: new Date(),
    };

    this.cache.set(cacheKey, metadata);
    return metadata;
  }

  extractEntities(article) {
    const content = `${article.title} ${article.description}`;
    return {
      cryptocurrencies: this.findCryptocurrencies(content),
      companies: this.findCompanies(content),
      people: this.findPeople(content),
      organizations: this.findOrganizations(content),
      locations: this.findLocations(content)
    };
  }

  identifyTopics(article) {
    const topics = {
      primary: [],
      secondary: [],
      tags: []
    };

    const content = `${article.title} ${article.description}`.toLowerCase();

    // Topic categories and their keywords
    const topicPatterns = {
      regulation: ['regulation', 'sec', 'policy', 'law', 'compliance'],
      technology: ['blockchain', 'protocol', 'upgrade', 'development'],
      trading: ['price', 'market', 'trading', 'volatility'],
      defi: ['defi', 'yield', 'lending', 'amm', 'liquidity'],
      nft: ['nft', 'collectible', 'marketplace', 'art'],
      security: ['hack', 'security', 'breach', 'vulnerability'],
      adoption: ['adoption', 'partnership', 'integration', 'enterprise'],
      mining: ['mining', 'hashrate', 'difficulty', 'miner']
    };

    // Score each topic based on keyword matches
    Object.entries(topicPatterns).forEach(([topic, keywords]) => {
      const matches = keywords.filter(keyword => content.includes(keyword));
      if (matches.length > 2) {
        topics.primary.push(topic);
      } else if (matches.length > 0) {
        topics.secondary.push(topic);
      }
    });

    return topics;
  }

  analyzeSentiment(article) {
    const content = `${article.title} ${article.description}`.toLowerCase();
    
    // Sentiment dictionaries
    const sentimentPatterns = {
      strongPositive: ['surge', 'breakthrough', 'revolutionary', 'massive adoption'],
      positive: ['increase', 'gain', 'bullish', 'growth', 'partnership'],
      neutral: ['announces', 'states', 'reports', 'updates'],
      negative: ['decrease', 'loss', 'bearish', 'concern', 'issue'],
      strongNegative: ['crash', 'hack', 'ban', 'crisis', 'scam']
    };

    let sentimentScores = {
      score: 0,
      magnitude: 0,
      aspects: {}
    };

    // Calculate base sentiment
    Object.entries(sentimentPatterns).forEach(([category, patterns]) => {
      const matches = patterns.filter(pattern => content.includes(pattern));
      const score = matches.length * (category.includes('strong') ? 2 : 1);
      
      if (category.includes('negative')) {
        sentimentScores.score -= score;
      } else if (category.includes('positive')) {
        sentimentScores.score += score;
      }
      
      sentimentScores.magnitude += score;
    });

    // Normalize scores
    sentimentScores.score = sentimentScores.score / (sentimentScores.magnitude || 1);
    
    return sentimentScores;
  }

  assessMarketImpact(article) {
    const impact = {
      score: 0,
      confidence: 0,
      timeframe: 'short', // short, medium, long
      factors: []
    };

    // Impact factors and their weights
    const impactFactors = {
      regulatoryNews: {
        weight: 0.8,
        keywords: ['regulation', 'sec', 'law', 'ban', 'approve']
      },
      institutionalActivity: {
        weight: 0.7,
        keywords: ['institution', 'fund', 'invest', 'acquisition']
      },
      marketMovement: {
        weight: 0.6,
        keywords: ['surge', 'crash', 'breakout', 'dump', 'pump']
      },
      technicalDevelopment: {
        weight: 0.5,
        keywords: ['upgrade', 'fork', 'development', 'launch']
      },
      adoption: {
        weight: 0.4,
        keywords: ['adopt', 'use', 'integrate', 'partnership']
      }
    };

    const content = `${article.title} ${article.description}`.toLowerCase();

    // Calculate impact score
    Object.entries(impactFactors).forEach(([factor, data]) => {
      const matches = data.keywords.filter(keyword => content.includes(keyword));
      if (matches.length > 0) {
        const factorImpact = matches.length * data.weight;
        impact.score += factorImpact;
        impact.factors.push({
          factor,
          impact: factorImpact,
          matches: matches
        });
      }
    });

    // Determine timeframe
    const timeframeKeywords = {
      short: ['immediate', 'today', 'now', 'hours'],
      medium: ['week', 'month', 'quarter'],
      long: ['year', 'long-term', 'future']
    };

    Object.entries(timeframeKeywords).forEach(([timeframe, keywords]) => {
      if (keywords.some(keyword => content.includes(keyword))) {
        impact.timeframe = timeframe;
      }
    });

    // Calculate confidence based on source credibility and impact factors
    impact.confidence = this.calculateConfidence(article, impact.factors);

    return impact;
  }

  calculateCredibilityScore(article) {
    const credibilityFactors = {
      sourceTier: {
        tier1: ['coindesk', 'cointelegraph', 'bloomberg', 'reuters'],
        tier2: ['decrypt', 'theblock', 'cryptobriefing'],
        tier3: ['medium', 'blog', 'social']
      },
      verificationIndicators: {
        hasQuotes: /["']([^"']+)["']/g,
        hasStatistics: /\d+(\.\d+)?%|\$\d+|\d+\s*(BTC|ETH|USD)/g,
        hasSourceAttribution: /(according to|said|reported|confirmed by)/i
      }
    };

    let score = 0;

    // Score based on source tier
    const source = article.source.toLowerCase();
    if (credibilityFactors.sourceTier.tier1.some(t => source.includes(t))) score += 3;
    if (credibilityFactors.sourceTier.tier2.some(t => source.includes(t))) score += 2;
    if (credibilityFactors.sourceTier.tier3.some(t => source.includes(t))) score += 1;

    // Score based on verification indicators
    const content = `${article.title} ${article.description}`;
    if (credibilityFactors.verificationIndicators.hasQuotes.test(content)) score += 1;
    if (credibilityFactors.verificationIndicators.hasStatistics.test(content)) score += 1;
    if (credibilityFactors.verificationIndicators.hasSourceAttribution.test(content)) score += 1;

    return score / 6; // Normalize to 0-1 range
  }

  calculateConfidence(article, impactFactors) {
    const credibilityScore = this.calculateCredibilityScore(article);
    const impactDiversity = impactFactors.length / 5; // Normalize by total number of factor types
    return (credibilityScore * 0.6 + impactDiversity * 0.4);
  }
}

// Example usage
const setupNewsAggregator = async () => {
  const tradingView = new TradingViewIntegrator();
  const metadataExtractor = new MetadataExtractor();
  
  // Rate limiters for different APIs
  const rateLimiters = {
    tradingView: new RateLimiter(30, 60000),     // 30 requests per minute
    cryptoPanic: new RateLimiter(60, 60000),     // 60 requests per minute
    newsAPI: new RateLimiter(100, 3600000),      // 100 requests per hour
    reddit: new RateLimiter(30, 60000)           // 30 requests per minute
  };

  return {
    async fetchNews() {
      await rateLimiters.cryptoPanic.throttle();
      // Fetch news implementation...
    },

    async getTradingViewAnalysis(symbol) {
      await rateLimiters.tradingView.throttle();
      return tradingView.getAnalysis(symbol);
    },

    async processArticle(article) {
      return metadataExtractor.extractMetadata(article);
    }
  };
};
