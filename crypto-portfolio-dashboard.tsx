import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { RefreshCw, Activity, Briefcase, AlertTriangle, Clock, Plus, X, Search } from 'lucide-react';

// API Configuration
const API_CONFIG = {
  baseUrl: 'https://pro-api.coingecko.com/api/v3',
  key: 'CG-3wdoCYkmrzsUmKiBMD9eKwp3',
  maxRetries: 3,
  initialRetryDelay: 1000, // 1 second
  maxRetryDelay: 10000, // 10 seconds
  retryStatusCodes: [408, 429, 500, 502, 503, 504] // Retryable status codes
};

// Retry logic utility
const fetchWithRetry = async (url, options = {}, retryCount = 0) => {
  try {
    const response = await fetch(url, options);
    
    // Check if response needs retry
    if (!response.ok) {
      if (
        retryCount < API_CONFIG.maxRetries &&
        API_CONFIG.retryStatusCodes.includes(response.status)
      ) {
        // Calculate delay with exponential backoff
        const delay = Math.min(
          API_CONFIG.initialRetryDelay * Math.pow(2, retryCount),
          API_CONFIG.maxRetryDelay
        );

        // Add some jitter to prevent thundering herd
        const jitter = Math.random() * 1000;
        
        console.log(`Retrying request (${retryCount + 1}/${API_CONFIG.maxRetries}) after ${delay}ms`);
        
        await new Promise(resolve => setTimeout(resolve, delay + jitter));
        return fetchWithRetry(url, options, retryCount + 1);
      }
      
      throw new Error(`API Error: ${response.status} - ${await response.text()}`);
    }

    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request was aborted');
    }
    
    if (retryCount < API_CONFIG.maxRetries) {
      const delay = Math.min(
        API_CONFIG.initialRetryDelay * Math.pow(2, retryCount),
        API_CONFIG.maxRetryDelay
      );
      
      console.log(`Retrying failed request (${retryCount + 1}/${API_CONFIG.maxRetries}) after ${delay}ms`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retryCount + 1);
    }
    
    throw new Error(`Failed after ${retryCount} retries: ${error.message}`);
  }
};

// API Client with retry logic
class CoinGeckoAPI {
  constructor() {
    this.baseUrl = API_CONFIG.baseUrl;
    this.headers = {
      'x-cg-pro-api-key': API_CONFIG.key,
      'Content-Type': 'application/json'
    };
    this.controller = null;
  }

  // Abort previous request if new one is made
  abortPreviousRequest() {
    if (this.controller) {
      this.controller.abort();
    }
    this.controller = new AbortController();
  }

  async fetchWithTimeout(endpoint, params = {}, timeout = 30000) {
    this.abortPreviousRequest();

    const queryParams = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${endpoint}${queryParams ? '?' + queryParams : ''}`;

    const options = {
      headers: this.headers,
      method: 'GET',
      signal: this.controller.signal
    };

    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        this.controller.abort();
        reject(new Error('Request timeout'));
      }, timeout);
    });

    // Race between fetch and timeout
    try {
      const response = await Promise.race([
        fetchWithRetry(url, options),
        timeoutPromise
      ]);
      return response;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request was aborted');
      }
      throw error;
    }
  }

  async getPrices(coinIds) {
    return this.fetchWithTimeout('/simple/price', {
      ids: coinIds.join(','),
      vs_currencies: 'usd',
      include_24hr_change: true,
      include_24hr_vol: true,
      include_last_updated_at: true
    });
  }

  async getMarketData(coinIds) {
    return this.fetchWithTimeout('/coins/markets', {
      vs_currency: 'usd',
      ids: coinIds.join(','),
      order: 'market_cap_desc',
      page: 1,
      per_page: 100,
      sparkline: true,
      price_change_percentage: '1h,24h,7d'
    });
  }

  async searchCoins(query) {
    return this.fetchWithTimeout('/search', { query });
  }
}

// Rate limiting utility
const rateLimiter = (func, limit = 30) => {
  const queue = [];
  let timeoutId = null;

  const processQueue = () => {
    if (queue.length === 0) {
      timeoutId = null;
      return;
    }

    const { args, resolve, reject } = queue.shift();
    func(...args)
      .then(resolve)
      .catch(reject)
      .finally(() => {
        timeoutId = setTimeout(processQueue, 1000 / limit);
      });
  };

  return (...args) => {
    return new Promise((resolve, reject) => {
      queue.push({ args, resolve, reject });
      if (!timeoutId) {
        processQueue();
      }
    });
  };
};

const CryptoDashboard = () => {
  // Initialize API with rate limiting
  const api = new CoinGeckoAPI();
  const getPricesWithRateLimit = rateLimiter(api.getPrices.bind(api));
  const getMarketDataWithRateLimit = rateLimiter(api.getMarketData.bind(api));
  const searchCoinsWithRateLimit = rateLimiter(api.searchCoins.bind(api));

  // State management
  const [portfolio, setPortfolio] = useState([
    { id: 'bitcoin', symbol: 'BTC', amount: 0.5, entryPrice: 45000 },
    { id: 'ethereum', symbol: 'ETH', amount: 5, entryPrice: 3000 }
  ]);
  
  const [portfolioStats, setPortfolioStats] = useState({
    totalValue: 0,
    dailyChange: 0,
    totalProfitLoss: 0
  });

  const [marketData, setMarketData] = useState({});
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isAddingCoin, setIsAddingCoin] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Fetch dashboard data with retry logic
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      
      const coinIds = portfolio.map(coin => coin.id);
      
      if (coinIds.length === 0) {
        setPortfolioStats({ totalValue: 0, dailyChange: 0, totalProfitLoss: 0 });
        return;
      }

      const [prices, markets] = await Promise.all([
        getPricesWithRateLimit(coinIds),
        getMarketDataWithRateLimit(coinIds)
      ]);

      const updatedPortfolio = portfolio.map(coin => {
        const price = prices[coin.id]?.usd || 0;
        const marketInfo = markets.find(m => m.id === coin.id) || {};
        
        return {
          ...coin,
          currentPrice: price || 0,
          value: (price || 0) * coin.amount,
          change24h: prices[coin.id]?.usd_24h_change || 0,
          marketData: marketInfo,
          profitLoss: ((price || 0) - coin.entryPrice) * coin.amount
        };
      });

      const stats = updatedPortfolio.reduce((acc, coin) => ({
        totalValue: acc.totalValue + (coin.value || 0),
        dailyChange: acc.dailyChange + ((coin.value || 0) * ((coin.change24h || 0) / 100)),
        totalProfitLoss: acc.totalProfitLoss + (coin.profitLoss || 0)
      }), { totalValue: 0, dailyChange: 0, totalProfitLoss: 0 });

      setPortfolio(updatedPortfolio);
      setPortfolioStats(stats);
      setMarketData(markets);
      setLastUpdated(new Date());
      setRetryCount(0); // Reset retry count on success
    } catch (error) {
      setErrorMessage(`${error.message} (Attempt ${retryCount + 1}/${API_CONFIG.maxRetries})`);
      setRetryCount(prev => prev + 1);
      
      // If we haven't reached max retries, try again
      if (retryCount < API_CONFIG.maxRetries) {
        const delay = Math.min(
          API_CONFIG.initialRetryDelay * Math.pow(2, retryCount),
          API_CONFIG.maxRetryDelay
        );
        setTimeout(fetchDashboardData, delay);
      }
    } finally {
      setLoading(false);
    }
  }, [portfolio, retryCount, getPricesWithRateLimit, getMarketDataWithRateLimit]);

  // Search coins with retry logic
  const handleSearchCoins = useCallback(async (query) => {
    if (!query) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const results = await searchCoinsWithRateLimit(query);
      setSearchResults(results.coins?.slice(0, 5) || []);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage('Error searching coins: ' + error.message);
    } finally {
      setSearchLoading(false);
    }
  }, [searchCoinsWithRateLimit]);

  // Rest of the component implementation remains the same...

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {errorMessage && (
        <div className="p-4 bg-red-50 text-red-500 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          {errorMessage}
          {retryCount < API_CONFIG.maxRetries && (
            <button
              onClick={fetchDashboardData}
              className="ml-4 px-3 py-1 bg-red-100 rounded-md text-sm"
            >
              Retry Now
            </button>
          )}
        </div>
      )}
      
      {/* Rest of the JSX remains the same... */}
    </div>
  );
};

export default CryptoDashboard;
