// News Analysis and Integration Service
class CryptoNewsAnalyzer {
  constructor() {
    this.coindeskUrl = 'https://api.coindesk.com/v1/news';
    this.newsCache = new Map();
    this.sentimentScores = new Map();
    this.lastUpdate = null;
  }

  // Fetch and analyze news from multiple sources
  async aggregateNews() {
    try {
      // Fetch CoinDesk RSS feed (since they don't have a public news API)
      const coindeskNews = await fetch('https://www.coindesk.com/arc/outboundfeeds/rss/');
      const coindeskText = await coindeskNews.text();
      const coindeskData = await this.parseRSSFeed(coindeskText);

      // Combine with existing CoinGecko news data
      const combinedNews = {
        articles: [...coindeskData],
        lastUpdate: new Date(),
        sentiment: await this.analyzeNewsSentiment(coindeskData)
      };

      this.newsCache.set('latest', combinedNews);
      return combinedNews;
    } catch (error) {
      console.error('Error fetching news:', error);
      // Fallback to cached news if available
      return this.newsCache.get('latest') || { articles: [], sentiment: neutral };
    }
  }

  // Parse RSS feed
  parseRSSFeed(rssText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(rssText, 'text/xml');
    const items = doc.querySelectorAll('item');
    
    return Array.from(items).map(item => ({
      title: item.querySelector('title')?.textContent || '',
      description: item.querySelector('description')?.textContent || '',
      pubDate: new Date(item.querySelector('pubDate')?.textContent || ''),
      link: item.querySelector('link')?.textContent || '',
      source: 'coindesk'
    }));
  }

  // Analyze news sentiment
  async analyzeNewsSentiment(articles) {
    const keywords = {
      positive: [
        'bullish', 'surge', 'gain', 'rally', 'breakthrough', 'adoption',
        'upgrade', 'partnership', 'innovation', 'growth'
      ],
      negative: [
        'bearish', 'crash', 'drop', 'ban', 'hack', 'scam', 'risk',
        'warning', 'concern', 'sell-off'
      ],
      neutral: [
        'announce', 'report', 'launch', 'update', 'develop',
        'plan', 'consider', 'review'
      ]
    };

    const sentiment = articles.reduce((acc, article) => {
      const text = `${article.title} ${article.description}`.toLowerCase();
      
      const sentimentScores = {
        positive: keywords.positive.filter(word => text.includes(word)).length,
        negative: keywords.negative.filter(word => text.includes(word)).length,
        neutral: keywords.neutral.filter(word => text.includes(word)).length
      };

      // Calculate impact based on freshness
      const hoursSincePublished = (new Date() - new Date(article.pubDate)) / (1000 * 60 * 60);
      const timeDecay = Math.exp(-hoursSincePublished / 24); // Exponential decay over 24 hours

      return {
        positive: acc.positive + sentimentScores.positive * timeDecay,
        negative: acc.negative + sentimentScores.negative * timeDecay,
        neutral: acc.neutral + sentimentScores.neutral * timeDecay
      };
    }, { positive: 0, negative: 0, neutral: 0 });

    // Normalize scores
    const total = sentiment.positive + sentiment.negative + sentiment.neutral;
    return {
      score: (sentiment.positive - sentiment.negative) / total,
      confidence: Math.min(total / articles.length, 1),
      distribution: {
        positive: sentiment.positive / total,
        negative: sentiment.negative / total,
        neutral: sentiment.neutral / total
      }
    };
  }

  // Extract market impact factors
  extractMarketImpactFactors(articles) {
    const impactFactors = {
      regulatory: [],
      technical: [],
      adoption: [],
      market: []
    };

    const categoryKeywords = {
      regulatory: ['regulation', 'sec', 'law', 'compliance', 'government'],
      technical: ['upgrade', 'protocol', 'development', 'network', 'technology'],
      adoption: ['adoption', 'partnership', 'integration', 'institutional'],
      market: ['trading', 'volume', 'price', 'market', 'investors']
    };

    articles.forEach(article => {
      const text = `${article.title} ${article.description}`.toLowerCase();
      
      Object.entries(categoryKeywords).forEach(([category, keywords]) => {
        if (keywords.some(keyword => text.includes(keyword))) {
          impactFactors[category].push({
            title: article.title,
            date: article.pubDate,
            source: article.source,
            relevance: keywords.filter(keyword => text.includes(keyword)).length
          });
        }
      });
    });

    return impactFactors;
  }

  // Generate trading signals from news
  generateNewsSignals(news) {
    const { sentiment, impactFactors } = news;
    
    // Weight different factors
    const weights = {
      sentiment: 0.3,
      regulatory: 0.25,
      technical: 0.2,
      adoption: 0.15,
      market: 0.1
    };

    // Calculate regulatory impact
    const regulatorySignal = impactFactors.regulatory.reduce((acc, factor) => {
      const sentiment = this.analyzeNewsSentiment([factor]);
      return acc + sentiment.score * factor.relevance;
    }, 0) / Math.max(impactFactors.regulatory.length, 1);

    // Calculate technical impact
    const technicalSignal = impactFactors.technical.reduce((acc, factor) => {
      const sentiment = this.analyzeNewsSentiment([factor]);
      return acc + sentiment.score * factor.relevance;
    }, 0) / Math.max(impactFactors.technical.length, 1);

    // Combined signal
    const signal = (
      sentiment.score * weights.sentiment +
      regulatorySignal * weights.regulatory +
      technicalSignal * weights.technical
    );

    return {
      signal: signal,
      confidence: sentiment.confidence,
      factors: {
        sentiment: sentiment.score,
        regulatory: regulatorySignal,
        technical: technicalSignal
      },
      recommendation: this.generateTradeRecommendation(signal, sentiment.confidence)
    };
  }

  // Generate trade recommendation
  generateTradeRecommendation(signal, confidence) {
    if (confidence < 0.5) {
      return {
        action: 'HOLD',
        reason: 'Insufficient confidence in news analysis'
      };
    }

    if (signal > 0.6 && confidence > 0.7) {
      return {
        action: 'BUY',
        reason: 'Strong positive news sentiment with high confidence'
      };
    }

    if (signal < -0.6 && confidence > 0.7) {
      return {
        action: 'SELL',
        reason: 'Strong negative news sentiment with high confidence'
      };
    }

    return {
      action: 'HOLD',
      reason: 'No clear signal from news analysis'
    };
  }
}

// Integration with trading system
class EnhancedTradingAnalyzer {
  constructor() {
    this.newsAnalyzer = new CryptoNewsAnalyzer();
    this.lastAnalysis = null;
  }

  async analyzeMarket(price, volume, technicalIndicators) {
    // Get fresh news analysis
    const newsData = await this.newsAnalyzer.aggregateNews();
    const newsSignals = this.newsAnalyzer.generateNewsSignals(newsData);

    // Combine with technical analysis
    const analysis = {
      technical: this.analyzeTechnicalFactors(technicalIndicators),
      news: newsSignals,
      price: this.analyzePriceAction(price, volume),
      timestamp: new Date()
    };

    // Generate combined trading signal
    const tradingSignal = this.generateTradingSignal(analysis);
    
    this.lastAnalysis = {
      ...analysis,
      tradingSignal
    };

    return this.lastAnalysis;
  }

  // Validate trade against analysis
  validateTrade(trade) {
    if (!this.lastAnalysis) {
      return {
        isValid: false,
        reason: 'No recent market analysis available'
      };
    }

    const { tradingSignal } = this.lastAnalysis;
    const signalAge = Date.now() - this.lastAnalysis.timestamp;

    // Check if analysis is fresh (less than 5 minutes old)
    if (signalAge > 5 * 60 * 1000) {
      return {
        isValid: false,
        reason: 'Market analysis is outdated'
      };
    }

    // Validate trade direction against signals
    if (trade.side === 'BUY' && tradingSignal.signal < 0) {
      return {
        isValid: false,
        reason: 'Trade direction conflicts with market analysis'
      };
    }

    if (trade.side === 'SELL' && tradingSignal.signal > 0) {
      return {
        isValid: false,
        reason: 'Trade direction conflicts with market analysis'
      };
    }

    return {
      isValid: true,
      confidence: tradingSignal.confidence
    };
  }
}

// Example usage in your trading component
const TradingDashboard = () => {
  const [newsAnalysis, setNewsAnalysis] = useState(null);
  const analyzer = useMemo(() => new EnhancedTradingAnalyzer(), []);

  // Fetch and update analysis
  const updateAnalysis = useCallback(async () => {
    try {
      const analysis = await analyzer.analyzeMarket(
        currentPrice,
        currentVolume,
        technicalIndicators
      );
      setNewsAnalysis(analysis);
    } catch (error) {
      console.error('Error updating market analysis:', error);
    }
  }, [currentPrice, currentVolume, technicalIndicators]);

  // Update analysis every 5 minutes
  useEffect(() => {
    updateAnalysis();
    const interval = setInterval(updateAnalysis, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [updateAnalysis]);

  // Rest of your component code...
};
