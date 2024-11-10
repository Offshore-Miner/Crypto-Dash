// src/services/newsAggregator.js
class CryptoNewsAggregator {
  constructor(apiKeys = {}) {
    this.newsSources = {
      // RSS Feed Sources
      coindesk: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
      cointelegraph: 'https://cointelegraph.com/rss',
      theBlock: 'https://www.theblock.co/rss/all',
      decrypt: 'https://decrypt.co/feed',
      bitcoinMagazine: 'https://bitcoinmagazine.com/.rss/full/',
      cryptoBriefing: 'https://cryptobriefing.com/feed/',
      
      // API-Based Sources
      cryptoPanic: {
        url: 'https://cryptopanic.com/api/v1/posts/',
        requiresKey: true
      },
      lunarCrush: {
        url: 'https://api.lunarcrush.com/v2/assets/news',
        requiresKey: true
      },
      newsapi: {
        url: 'https://newsapi.org/v2/everything',
        requiresKey: true
      },
      benzinga: {
        url: 'https://api.benzinga.com/api/v2/news',
        requiresKey: true
      },
      
      // Specialized Crypto News
      defipulse: 'https://defipulse.com/blog/feed/',
      glassnode: {
        url: 'https://api.glassnode.com/v1/metrics/news',
        requiresKey: true
      },
      messari: {
        url: 'https://data.messari.io/api/v1/news',
        requiresKey: true
      },
      
      // Social Media and Forum Sources
      reddit: {
        subreddits: [
          'cryptocurrency',
          'bitcoin',
          'ethfinance',
          'defi',
          'cryptomarkets'
        ]
      },
      twitter: {
        accounts: [
          'whale_alert',
          'documentingbtc',
          'coinmetrics',
          'santimentfeed'
        ]
      }
    };

    this.apiKeys = {
      cryptoPanic: apiKeys.cryptoPanic || process.env.CRYPTO_PANIC_KEY,
      lunarCrush: apiKeys.lunarCrush || process.env.LUNAR_CRUSH_KEY,
      newsapi: apiKeys.newsapi || process.env.NEWS_API_KEY,
      benzinga: apiKeys.benzinga || process.env.BENZINGA_KEY,
      glassnode: apiKeys.glassnode || process.env.GLASSNODE_KEY,
      messari: apiKeys.messari || process.env.MESSARI_KEY
    };

    this.newsCache = new Map();
    this.lastUpdate = null;
  }

  async fetchAllNews() {
    try {
      const newsPromises = [
        ...this.fetchRSSFeeds(),
        ...this.fetchAPIFeeds(),
        this.fetchSocialMediaContent()
      ];

      const results = await Promise.allSettled(newsPromises);
      const allNews = results
        .filter(result => result.status === 'fulfilled')
        .flatMap(result => result.value);

      // Deduplicate news based on content similarity
      const uniqueNews = this.deduplicateNews(allNews);
      
      // Cache the results
      this.newsCache.set('latest', uniqueNews);
      this.lastUpdate = new Date();

      return uniqueNews;
    } catch (error) {
      console.error('Error aggregating news:', error);
      return this.newsCache.get('latest') || [];
    }
  }

  // Fetch from RSS feeds
  fetchRSSFeeds() {
    const rssFeeds = Object.entries(this.newsSources)
      .filter(([_, source]) => typeof source === 'string' && source.includes('rss'))
      .map(([source, url]) => this.fetchRSS(source, url));
    
    return rssFeeds;
  }

  // Fetch from API sources
  fetchAPIFeeds() {
    const apiFeeds = Object.entries(this.newsSources)
      .filter(([_, source]) => typeof source === 'object' && source.requiresKey)
      .map(([source, config]) => this.fetchAPI(source, config));
    
    return apiFeeds;
  }

  // Fetch from social media
  async fetchSocialMediaContent() {
    const socialContent = [];

    // Reddit content
    if (this.newsSources.reddit) {
      for (const subreddit of this.newsSources.reddit.subreddits) {
        try {
          const response = await fetch(
            `https://www.reddit.com/r/${subreddit}/top.json?limit=25`
          );
          const data = await response.json();
          const posts = data.data.children.map(child => ({
            title: child.data.title,
            content: child.data.selftext,
            url: `https://reddit.com${child.data.permalink}`,
            source: 'reddit',
            subreddit: subreddit,
            score: child.data.score,
            pubDate: new Date(child.data.created_utc * 1000)
          }));
          socialContent.push(...posts);
        } catch (error) {
          console.error(`Error fetching Reddit content from r/${subreddit}:`, error);
        }
      }
    }

    // Twitter content (requires Twitter API v2)
    if (this.newsSources.twitter && this.apiKeys.twitter) {
      for (const account of this.newsSources.twitter.accounts) {
        try {
          const tweets = await this.fetchTwitterContent(account);
          socialContent.push(...tweets);
        } catch (error) {
          console.error(`Error fetching Twitter content from ${account}:`, error);
        }
      }
    }

    return socialContent;
  }

  // Helper method to deduplicate news
  deduplicateNews(news) {
    const seen = new Set();
    return news.filter(article => {
      const key = this.generateArticleKey(article);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // Generate a unique key for each article based on content
  generateArticleKey(article) {
    const content = `${article.title}${article.description}`.toLowerCase();
    return content.replace(/[^a-z0-9]/g, '');
  }

  // Add source-specific metadata
  enrichNewsData(articles) {
    return articles.map(article => ({
      ...article,
      metadata: this.extractMetadata(article),
      relevanceScore: this.calculateRelevance(article),
      impactScore: this.assessImpact(article)
    }));
  }

  // Calculate relevance score
  calculateRelevance(article) {
    // Implementation details in next section...
  }

  // Assess potential market impact
  assessImpact(article) {
    // Implementation details in next section...
  }
}
