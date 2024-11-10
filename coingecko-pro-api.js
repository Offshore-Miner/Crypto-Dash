// CoinGecko Pro API Wrapper
const COINGECKO_PRO_URL = 'https://pro-api.coingecko.com/api/v3';
const API_KEY = 'CG-3wdoCYkmrzsUmKiBMD9eKwp3';

class CoinGeckoAPI {
  constructor() {
    this.baseUrl = COINGECKO_PRO_URL;
    this.headers = {
      'x-cg-pro-api-key': API_KEY,
      'Content-Type': 'application/json'
    };
  }

  // Helper method for API calls
  async fetchData(endpoint, params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const url = `${this.baseUrl}${endpoint}${queryParams ? '?' + queryParams : ''}`;
      
      const response = await fetch(url, {
        headers: this.headers,
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${await response.text()}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error fetching data from ${endpoint}:`, error);
      throw error;
    }
  }

  // Get current prices for multiple coins
  async getPrices(coinIds, vsCurrency = 'usd') {
    return await this.fetchData('/simple/price', {
      ids: coinIds.join(','),
      vs_currencies: vsCurrency,
      include_24hr_change: true,
      include_24hr_vol: true,
      include_last_updated_at: true
    });
  }

  // Get detailed coin data
  async getCoinData(coinId) {
    return await this.fetchData(`/coins/${coinId}`, {
      localization: false,
      tickers: true,
      market_data: true,
      community_data: false,
      developer_data: false,
      sparkline: true
    });
  }

  // Get market chart data
  async getMarketChart(coinId, days = 1, interval = 'hourly') {
    return await this.fetchData(`/coins/${coinId}/market_chart`, {
      vs_currency: 'usd',
      days: days,
      interval: interval
    });
  }

  // Get market data for multiple coins
  async getMarketData(coinIds, page = 1, perPage = 100) {
    return await this.fetchData('/coins/markets', {
      vs_currency: 'usd',
      ids: coinIds.join(','),
      order: 'market_cap_desc',
      page: page,
      per_page: perPage,
      sparkline: true,
      price_change_percentage: '1h,24h,7d'
    });
  }

  // Get global market data
  async getGlobalData() {
    return await this.fetchData('/global');
  }

  // Get trending coins
  async getTrendingCoins() {
    return await this.fetchData('/search/trending');
  }

  // Get coin OHLC data
  async getOHLC(coinId, days = 1) {
    return await this.fetchData(`/coins/${coinId}/ohlc`, {
      vs_currency: 'usd',
      days: days
    });
  }

  // Get supported coins list
  async getCoinsList() {
    return await this.fetchData('/coins/list', {
      include_platform: true
    });
  }

  // Get coin status updates
  async getCoinUpdates(coinId, page = 1, perPage = 50) {
    return await this.fetchData(`/coins/${coinId}/status_updates`, {
      per_page: perPage,
      page: page
    });
  }

  // Get exchange rates
  async getExchangeRates() {
    return await this.fetchData('/exchange_rates');
  }
}

// Example usage
const api = new CoinGeckoAPI();

// Error handling wrapper
const safeApiCall = async (apiFunction) => {
  try {
    const data = await apiFunction;
    return { success: true, data };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      isRateLimit: error.message.includes('429')
    };
  }
};

// Export the API instance and helper functions
export {
  CoinGeckoAPI,
  api,
  safeApiCall
};

// Example portfolio tracking functions
export const trackPortfolio = async (portfolio) => {
  const api = new CoinGeckoAPI();
  
  try {
    // Get current prices for all portfolio coins
    const coinIds = portfolio.map(coin => coin.id);
    const prices = await api.getPrices(coinIds);
    
    // Calculate portfolio values
    return portfolio.map(coin => {
      const price = prices[coin.id]?.usd || 0;
      const value = price * coin.amount;
      const change24h = prices[coin.id]?.usd_24h_change || 0;
      
      return {
        ...coin,
        currentPrice: price,
        value,
        change24h,
        profitLoss: coin.entryPrice ? (price - coin.entryPrice) * coin.amount : null
      };
    });
  } catch (error) {
    console.error('Error tracking portfolio:', error);
    throw error;
  }
};

// Example usage with portfolio tracking
const exampleUsage = async () => {
  try {
    // Initialize portfolio
    const portfolio = [
      { id: 'bitcoin', amount: 0.5, entryPrice: 45000 },
      { id: 'ethereum', amount: 5, entryPrice: 3000 }
    ];

    // Track portfolio
    const portfolioStatus = await trackPortfolio(portfolio);
    console.log('Portfolio Status:', portfolioStatus);

    // Get detailed market data
    const marketData = await api.getMarketData(portfolio.map(coin => coin.id));
    console.log('Market Data:', marketData);

    // Get historical charts
    const btcChart = await api.getMarketChart('bitcoin', 30, 'daily');
    console.log('Bitcoin 30-day Chart:', btcChart);

  } catch (error) {
    console.error('Error in example usage:', error);
  }
};
