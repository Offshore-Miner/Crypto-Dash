// XeggeX API Configuration
const XEGGEX_CONFIG = {
  baseUrl: 'https://api.xeggex.com/api/v2',
  apiKey: '7da6122cc0a793799c8f020745e256fc',
  // Will need API secret for private endpoints
};

class XeggeXAPI {
  constructor() {
    this.baseUrl = XEGGEX_CONFIG.baseUrl;
    this.apiKey = XEGGEX_CONFIG.apiKey;
  }

  // Helper method for API calls
  async fetchData(endpoint, options = {}) {
    try {
      const headers = {
        'X-API-KEY': this.apiKey,
        'Content-Type': 'application/json'
      };

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          ...headers,
          ...options.headers
        }
      });

      if (!response.ok) {
        throw new Error(`XeggeX API Error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('XeggeX API Error:', error);
      throw error;
    }
  }

  // Public endpoints
  async getMarkets() {
    return this.fetchData('/markets');
  }

  async getTicker(market) {
    return this.fetchData(`/ticker/${market}`);
  }

  async getOrderBook(market) {
    return this.fetchData(`/depth/${market}`);
  }

  async getRecentTrades(market) {
    return this.fetchData(`/trades/${market}`);
  }

  // Private endpoints (will need API secret)
  async getBalances() {
    // Note: This will require API secret for authentication
    console.warn('Getting balances requires API secret for authentication');
    return null;
  }
}

// Test Component to verify API connection
const XeggeXTest = () => {
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const api = new XeggeXAPI();

  useEffect(() => {
    const testConnection = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Test API connection by fetching markets
        const marketData = await api.getMarkets();
        setMarkets(marketData);
        
        console.log('Successfully connected to XeggeX API');
      } catch (err) {
        setError(err.message);
        console.error('Error connecting to XeggeX:', err);
      } finally {
        setLoading(false);
      }
    };

    testConnection();
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">XeggeX API Test</h2>
      
      {loading && (
        <div className="text-blue-500">Testing API connection...</div>
      )}
      
      {error && (
        <div className="text-red-500">
          Error: {error}
        </div>
      )}
      
      {markets.length > 0 && (
        <div className="mt-4">
          <h3 className="font-medium mb-2">Available Markets:</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {markets.slice(0, 9).map(market => (
              <div key={market.id} className="p-2 bg-gray-50 rounded">
                {market.symbol}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Usage example in your dashboard
const CryptoDashboard = () => {
  const [xeggexData, setXeggexData] = useState({
    markets: [],
    selectedMarket: null,
    ticker: null
  });

  const api = new XeggeXAPI();

  const fetchXeggexData = async () => {
    try {
      // Fetch basic market data
      const markets = await api.getMarkets();
      
      // Get ticker for a specific market (e.g., BTC/USDT)
      const ticker = await api.getTicker('BTC_USDT');
      
      setXeggexData({
        markets,
        selectedMarket: 'BTC_USDT',
        ticker
      });
    } catch (error) {
      console.error('Error fetching XeggeX data:', error);
    }
  };

  useEffect(() => {
    fetchXeggexData();
    const interval = setInterval(fetchXeggexData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Market Overview */}
      <Card>
        <CardHeader>
          <CardTitle>XeggeX Markets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {xeggexData.markets.slice(0, 5).map(market => (
              <div key={market.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div className="font-medium">{market.symbol}</div>
                <div className="text-sm text-gray-500">
                  Base: {market.baseCurrency} / Quote: {market.quoteCurrency}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add more components for order book, recent trades, etc. */}
    </div>
  );
};
