// Local Storage Service for offline data persistence
class LocalStorageService {
  static KEYS = {
    PORTFOLIO: 'crypto_portfolio',
    MARKET_DATA: 'crypto_market_data',
    LAST_UPDATED: 'crypto_last_updated',
    CACHED_PRICES: 'crypto_cached_prices'
  };

  // Save data to local storage
  static save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }

  // Get data from local storage with optional expiry
  static get(key, maxAge = Infinity) {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      const { data, timestamp } = JSON.parse(stored);
      const age = Date.now() - timestamp;

      return age > maxAge ? null : data;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  }
}

// Network status detection
const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [reconnecting, setReconnecting] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setReconnecting(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setReconnecting(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, reconnecting };
};

// Enhanced Dashboard with Offline Support
const CryptoDashboard = () => {
  const { isOnline, reconnecting } = useNetworkStatus();
  const [offlineMode, setOfflineMode] = useState(false);

  // Fetch data with offline fallback
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage('');

      if (!isOnline) {
        // Load cached data when offline
        const cachedPortfolio = LocalStorageService.get(LocalStorageService.KEYS.PORTFOLIO);
        const cachedMarketData = LocalStorageService.get(LocalStorageService.KEYS.MARKET_DATA);
        const cachedPrices = LocalStorageService.get(LocalStorageService.KEYS.CACHED_PRICES);
        const lastUpdated = LocalStorageService.get(LocalStorageService.KEYS.LAST_UPDATED);

        if (cachedPortfolio && cachedMarketData && cachedPrices) {
          setPortfolio(cachedPortfolio);
          setMarketData(cachedMarketData);
          setLastUpdated(new Date(lastUpdated));
          setOfflineMode(true);
          return;
        }
      }

      // Online fetch
      const coinIds = portfolio.map(coin => coin.id);
      
      if (coinIds.length === 0) {
        setPortfolioStats({ totalValue: 0, dailyChange: 0, totalProfitLoss: 0 });
        return;
      }

      const [prices, markets] = await Promise.all([
        getPricesWithRateLimit(coinIds),
        getMarketDataWithRateLimit(coinIds)
      ]);

      // Cache the fresh data
      LocalStorageService.save(LocalStorageService.KEYS.PORTFOLIO, portfolio);
      LocalStorageService.save(LocalStorageService.KEYS.MARKET_DATA, markets);
      LocalStorageService.save(LocalStorageService.KEYS.CACHED_PRICES, prices);
      LocalStorageService.save(LocalStorageService.KEYS.LAST_UPDATED, Date.now());

      // Update state with fresh data
      const updatedPortfolio = calculatePortfolioValues(portfolio, prices, markets);
      setPortfolio(updatedPortfolio);
      setMarketData(markets);
      setLastUpdated(new Date());
      setOfflineMode(false);
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  }, [isOnline, portfolio]);

  // Sync data when coming back online
  useEffect(() => {
    if (reconnecting) {
      fetchDashboardData();
    }
  }, [reconnecting, fetchDashboardData]);

  // Offline UI Components
  const OfflineBanner = () => (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-yellow-400" />
        </div>
        <div className="ml-3">
          <p className="text-sm text-yellow-700">
            You're currently offline. Showing cached data from{' '}
            {new Date(lastUpdated).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );

  const OfflineIndicator = () => (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
      Offline
    </span>
  );

  // Example of offline-aware portfolio management
  const updatePortfolio = (updatedPortfolio) => {
    setPortfolio(updatedPortfolio);
    LocalStorageService.save(LocalStorageService.KEYS.PORTFOLIO, updatedPortfolio);
  };

  const addCoin = (coin) => {
    const updatedPortfolio = [
      ...portfolio,
      {
        id: coin.id,
        symbol: coin.symbol,
        amount: 0,
        entryPrice: 0
      }
    ];
    updatePortfolio(updatedPortfolio);
  };

  const removeCoin = (coinId) => {
    const updatedPortfolio = portfolio.filter(coin => coin.id !== coinId);
    updatePortfolio(updatedPortfolio);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {!isOnline && <OfflineBanner />}
      
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          Crypto Portfolio Dashboard
          {offlineMode && <OfflineIndicator />}
        </h1>
        <div className="text-sm text-gray-500 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Last updated: {lastUpdated?.toLocaleString() || 'Never'}
          {offlineMode && ' (Cached)'}
        </div>
      </div>

      {/* Rest of the dashboard components */}
    </div>
  );
};
