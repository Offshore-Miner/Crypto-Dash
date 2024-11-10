// src/services/newsAggregator.js
class CryptoNewsAggregator {
  constructor() {
    this.newsSources = {
      coindesk: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
      cointelegraph: 'https://cointelegraph.com/rss',
      cryptoPanic: 'https://cryptopanic.com/api/v1/posts/', // Requires free API key
      theBlock: 'https://www.theblock.co/rss/all',
      decrypt: 'https://decrypt.co/feed',
      bitcoinMagazine: 'https://bitcoinmagazine.com/.rss/full/',
      cryptoBriefing: 'https://cryptobriefing.com/feed/'
    };
    
    this.apiKeys = {
      cryptoPanic: 'YOUR_CRYPTO_PANIC_API_KEY', // Add your key here
      newsapi: 'YOUR_NEWSAPI_KEY' // Optional: Add for more sources
    };
  }

  async fetchAllNews() {
    try {
      const newsPromises = Object.entries(this.newsSources).map(([source, url]) => 
        this.fetchSourceNews(source, url)
      );

      const results = await Promise.allSettled(newsPromises);
      return results
        .filter(result => result.status === 'fulfilled')
        .flatMap(result => result.value);
    } catch (error) {
      console.error('Error fetching news:', error);
      return [];
    }
  }

  async fetchSourceNews(source, url) {
    try {
      const response = await fetch(url);
      const data = await response.text();
      const articles = await this.parseNewsData(source, data);
      return articles.map(article => ({
        ...article,
        source
      }));
    } catch (error) {
      console.error(`Error fetching ${source} news:`, error);
      return [];
    }
  }

  parseNewsData(source, data) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(data, 'text/xml');
    const items = Array.from(doc.querySelectorAll('item'));

    return items.map(item => ({
      title: item.querySelector('title')?.textContent || '',
      description: item.querySelector('description')?.textContent || '',
      pubDate: new Date(item.querySelector('pubDate')?.textContent || ''),
      link: item.querySelector('link')?.textContent || '',
      categories: Array.from(item.querySelectorAll('category')).map(cat => cat.textContent)
    }));
  }
}

// src/services/marketImpactAnalyzer.js
class MarketImpactAnalyzer {
  constructor() {
    this.impactFactors = {
      regulatory: 0.3,
      technical: 0.2,
      adoption: 0.15,
      market: 0.2,
      sentiment: 0.15
    };
  }

  analyzeMarketImpact(news, marketData, technicalIndicators) {
    const newsImpact = this.calculateNewsImpact(news);
    const technicalImpact = this.analyzeTechnicalFactors(technicalIndicators);
    const marketConditions = this.assessMarketConditions(marketData);

    return {
      overallImpact: this.combineImpactFactors(newsImpact, technicalImpact, marketConditions),
      breakdown: {
        news: newsImpact,
        technical: technicalImpact,
        market: marketConditions
      }
    };
  }

  calculateNewsImpact(news) {
    // Implement sentiment and impact analysis
    const sentimentScores = news.map(article => ({
      sentiment: this.analyzeSentiment(article.title + ' ' + article.description),
      age: this.calculateTimeDecay(article.pubDate),
      relevance: this.assessRelevance(article.categories)
    }));

    return {
      aggregate: this.aggregateScores(sentimentScores),
      topStories: this.identifySignificantStories(news, sentimentScores)
    };
  }

  analyzeTechnicalFactors(indicators) {
    return {
      trend: this.analyzeTrend(indicators),
      momentum: this.analyzeMomentum(indicators),
      volatility: this.analyzeVolatility(indicators),
      support: this.findSupportLevels(indicators),
      resistance: this.findResistanceLevels(indicators)
    };
  }

  assessMarketConditions(marketData) {
    return {
      liquidity: this.analyzeLiquidity(marketData),
      volume: this.analyzeVolume(marketData),
      orderBook: this.analyzeOrderBook(marketData),
      marketCap: this.analyzeMarketCap(marketData)
    };
  }

  // Helper methods for detailed analysis
  analyzeSentiment(text) {
    // Enhanced sentiment analysis with context
    const sentimentPatterns = {
      strongPositive: [
        ['bullish', 'breakthrough', 'surge'],
        ['adoption', 'partnership', 'launch'],
        ['upgrade', 'improve', 'success']
      ],
      positive: [
        ['grow', 'gain', 'rise'],
        ['support', 'approve', 'accept'],
        ['develop', 'build', 'expand']
      ],
      neutral: [
        ['announce', 'report', 'state'],
        ['consider', 'plan', 'review'],
        ['change', 'update', 'modify']
      ],
      negative: [
        ['bearish', 'decline', 'drop'],
        ['concern', 'risk', 'issue'],
        ['delay', 'problem', 'challenge']
      ],
      strongNegative: [
        ['crash', 'ban', 'hack'],
        ['scam', 'fraud', 'fail'],
        ['collapse', 'crisis', 'suspend']
      ]
    };

    let scores = {
      strongPositive: 0,
      positive: 0,
      neutral: 0,
      negative: 0,
      strongNegative: 0
    };

    text = text.toLowerCase();

    // Calculate pattern matches
    Object.entries(sentimentPatterns).forEach(([sentiment, patterns]) => {
      patterns.forEach(pattern => {
        const matches = pattern.filter(word => text.includes(word)).length;
        scores[sentiment] += matches;
      });
    });

    // Calculate weighted score
    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
    if (totalScore === 0) return 0;

    return (
      (scores.strongPositive * 2 + scores.positive - scores.negative - scores.strongNegative * 2) /
      totalScore
    );
  }

  calculateTimeDecay(pubDate) {
    const hoursAgo = (Date.now() - new Date(pubDate)) / (1000 * 60 * 60);
    return Math.exp(-hoursAgo / 24); // Exponential decay over 24 hours
  }

  assessRelevance(categories) {
    const relevantCategories = [
      'cryptocurrency', 'bitcoin', 'blockchain', 'defi', 'regulation',
      'market', 'trading', 'technology', 'adoption', 'investment'
    ];

    return categories.filter(cat => 
      relevantCategories.some(relCat => 
        cat.toLowerCase().includes(relCat)
      )
    ).length / categories.length;
  }

  aggregateScores(scores) {
    const validScores = scores.filter(s => s.sentiment !== 0);
    if (validScores.length === 0) return 0;

    return validScores.reduce((acc, score) => 
      acc + score.sentiment * score.age * score.relevance, 0
    ) / validScores.length;
  }

  identifySignificantStories(news, scores) {
    return news
      .map((article, index) => ({
        ...article,
        impact: Math.abs(scores[index].sentiment) * scores[index].age * scores[index].relevance
      }))
      .filter(article => article.impact > 0.5)
      .sort((a, b) => b.impact - a.impact)
      .slice(0, 5);
  }
}

// src/services/tradingSignalGenerator.js
class TradingSignalGenerator {
  generateSignals(marketImpact, technicalAnalysis, marketData) {
    const signals = {
      shortTerm: this.generateShortTermSignals(marketImpact, technicalAnalysis),
      mediumTerm: this.generateMediumTermSignals(marketImpact, marketData),
      longTerm: this.generateLongTermSignals(marketImpact, marketData)
    };

    return {
      signals,
      recommendation: this.generateRecommendation(signals),
      confidence: this.calculateConfidence(signals)
    };
  }

  // Additional methods will be added in part 2...
}
