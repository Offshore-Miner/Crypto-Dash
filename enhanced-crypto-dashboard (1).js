// API Configurations
const API_CONFIG = {
  coingecko: {
    baseUrl: 'https://pro-api.coingecko.com/api/v3',
    key: 'CG-3wdoCYkmrzsUmKiBMD9eKwp3'
  },
  xeggex: {
    baseUrl: 'https://api.xeggex.com/api/v2',
    // You'll need to add your Xeggex API key and secret
    key: 'YOUR_XEGGEX_API_KEY',
    secret: 'YOUR_XEGGEX_API_SECRET'
  }
};

// Local Storage Service
class LocalStorageService {
  static KEYS = {
    PORTFOLIO: 'crypto_portfolio',
    MARKET_DATA: 'crypto_market_data',
    LAST_UPDATED: 'crypto_last_updated',
    CACHED_PRICES: 'crypto_cached_prices',
    XEGGEX_BALANCES: 'xeggex_balances'
  };

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

// Xeggex API Service
class XeggexAPI {
  constructor(apiKey, apiSecret) {
    this.baseUrl = API_CONFIG.xeggex.baseUrl;
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  generateSignature(timestamp, method, endpoint, body = '') {
    const message = timestamp + method + endpoint + body;
    const signature = crypto.createHmac('sha256', this.apiSecret)
      .update(message)
      .digest('hex');
    return signature;
  }

  async fetchWithAuth(endpoint, method = 'GET', body = null) {
    const timestamp = Date.now().toString();
    const signature = this.generateSignature(timestamp, method, endpoint, body ? JSON.stringify(body) : '');

    const headers = {
      'X-API-KEY': this.apiKey,
      'X-SIGNATURE': signature,
      'X-TIMESTAMP': timestamp,
      'Content-Type': 'application/json'
    };

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
      });

      if (!response.ok) {
        throw new Error(`Xeggex API Error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Xeggex API Error:', error);
      throw error;
    }
  }

  async getBalances() {
    return this.fetchWithAuth('/balances');
  }
}

// React Component
const CryptoDashboard = () => {
  // State management
  const [portfolio, setPortfolio] = useState([]);
  const [xeggexBalances, setXeggexBalances] = useState([]);
  const [offlineMode, setOfflineMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Initialize APIs
  const xeggexApi = new XeggexAPI(API_CONFIG.xeggex.key, API_CONFIG.xeggex.secret);

  // Network status hook
  const useNetworkStatus = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    
    useEffect(() => {
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }, []);
    
    return isOnline;
  };

  const isOnline = useNetworkStatus();

  // Fetch Xeggex balances
  const fetchXeggexBalances = async () => {
    try {
      const balances = await xeggexApi.getBalances();
      setXeggexBalances(balances);
      LocalStorageService.save(LocalStorageService.KEYS.XEGGEX_BALANCES, balances);
      return balances;
    } catch (error) {
      console.error('Error fetching Xeggex balances:', error);
      // Fall back to cached balances
      const cachedBalances = LocalStorageService.get(LocalStorageService.KEYS.XEGGEX_BALANCES);
      if (cachedBalances) {
        setXeggexBalances(cachedBalances);
        return cachedBalances;
      }
      throw error;
    }
  };

  // Update portfolio with Xeggex balances
  const updatePortfolioWithXeggex = (balances) => {
    const updatedPortfolio = balances.map(balance => ({
      id: balance.currency.toLowerCase(),
      symbol: balance.currency,
      amount: parseFloat(balance.available) + parseFloat(balance.reserved),
      source: 'xeggex'
    }));

    setPortfolio(prev => {
      // Merge existing manual entries with Xeggex balances
      const manualEntries = prev.filter(entry => entry.source !== 'xeggex');
      return [...manualEntries, ...updatedPortfolio];
    });

    LocalStorageService.save(LocalStorageService.KEYS.PORTFOLIO, portfolio);
  };

  // Fetch all data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!isOnline) {
        // Load cached data
        const cachedPortfolio = LocalStorageService.get(LocalStorageService.KEYS.PORTFOLIO);
        const cachedXeggexBalances = LocalStorageService.get(LocalStorageService.KEYS.XEGGEX_BALANCES);
        
        if (cachedPortfolio) setPortfolio(cachedPortfolio);
        if (cachedXeggexBalances) setXeggexBalances(cachedXeggexBalances);
        
        setOfflineMode(true);
        return;
      }

      // Fetch fresh data
      const balances = await fetchXeggexBalances();
      updatePortfolioWithXeggex(balances);
      
      setOfflineMode(false);
      setLastUpdated(new Date());
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Initial load and periodic refresh
  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, [isOnline]);

  // Offline banner component
  const OfflineBanner = () => (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-yellow-400" />
        </div>
        <div className="ml-3">
          <p className="text-sm text-yellow-700">
            You're currently offline. Showing cached data from {lastUpdated?.toLocaleString() || 'last sync'}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {!isOnline && <OfflineBanner />}
      
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          Crypto Portfolio Dashboard
          {offlineMode && (
            <span className="ml-2 text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
              Offline Mode
            </span>
          )}
        </h1>
        <div className="text-sm text-gray-500">
          Last updated: {lastUpdated?.toLocaleString() || 'Never'}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-500 rounded-lg">
          Error: {error}
        </div>
      )}

      {/* Portfolio Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Overview (Including Xeggex)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {portfolio.map(coin => (
              <div key={coin.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">{coin.symbol.toUpperCase()}</div>
                  <div className="text-sm text-gray-500">
                    Source: {coin.source === 'xeggex' ? 'Xeggex' : 'Manual Entry'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{coin.amount.toFixed(8)}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CryptoDashboard;
