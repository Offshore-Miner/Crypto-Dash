// CoinDesk API Client
class CoindeskAPI {
  constructor() {
    this.baseUrl = 'https://api.coindesk.com/v1/bpi';
  }

  // Fetch current Bitcoin price
  async getCurrentPrice() {
    try {
      const response = await fetch(`${this.baseUrl}/currentprice.json`);
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching CoinDesk data:', error);
      throw error;
    }
  }

  // Fetch historical Bitcoin price data
  async getHistoricalData(startDate, endDate) {
    try {
      const response = await fetch(
        `${this.baseUrl}/historical/close.json?start=${startDate}&end=${endDate}`
      );
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching historical data:', error);
      throw error;
    }
  }
}

// Example React component using CoinDesk API
const CoindeskPriceTracker = () => {
  const [btcPrice, setBtcPrice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const api = new CoindeskAPI();

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        setLoading(true);
        const data = await api.getCurrentPrice();
        setBtcPrice(data.bpi);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bitcoin Price (CoinDesk BPI)</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && <div>Loading...</div>}
        {error && <div className="text-red-500">Error: {error}</div>}
        {btcPrice && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(btcPrice).map(([currency, data]) => (
                <div key={currency} className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500">{currency}</div>
                  <div className="text-xl font-bold">
                    {data.symbol}{data.rate_float.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500">
                    Last Updated: {new Date(data.time.updated).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CoindeskPriceTracker;
