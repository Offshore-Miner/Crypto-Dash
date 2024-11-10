import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  RefreshCw, Activity, AlertTriangle, Clock, TrendingUp, 
  DollarSign, Bell, Settings, ArrowUpCircle, ArrowDownCircle
} from 'lucide-react';
import CryptoJS from 'crypto-js';

// API Configuration
const XEGGEX_CONFIG = {
  baseUrl: 'https://api.xeggex.com/api/v2',
  apiKey: '7da6122cc0a793799c8f020745e256fc',
  apiSecret: '7441ed86f1c155c8b0c1aba2568ba3aa0bfa9bbcf7036afd'
};

// Price alert thresholds
const ALERT_TYPES = {
  PRICE_ABOVE: 'PRICE_ABOVE',
  PRICE_BELOW: 'PRICE_BELOW',
  VOLUME_SPIKE: 'VOLUME_SPIKE',
  PRICE_CHANGE: 'PRICE_CHANGE'
};

// Enhanced API Class
class XeggeXAPI {
  constructor() {
    this.baseUrl = XEGGEX_CONFIG.baseUrl;
    this.apiKey = XEGGEX_CONFIG.apiKey;
    this.apiSecret = XEGGEX_CONFIG.apiSecret;
    this.priceHistory = new Map();
  }

  // Previous authentication methods remain the same...
  generateSignature(timestamp, method, endpoint, body = '') {
    const message = timestamp + method + endpoint + body;
    return CryptoJS.HmacSHA256(message, this.apiSecret).toString();
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

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      throw new Error(`XeggeX API Error: ${response.status}`);
    }

    return await response.json();
  }

  // Trading Methods
  async placeOrder(market, side, type, amount, price = null) {
    const body = {
      market,
      side, // 'BUY' or 'SELL'
      type, // 'LIMIT' or 'MARKET'
      amount: amount.toString(),
      price: price ? price.toString() : undefined
    };

    return this.fetchWithAuth('/order', 'POST', body);
  }

  async cancelOrder(orderId) {
    return this.fetchWithAuth(`/order/${orderId}`, 'DELETE');
  }

  async cancelAllOrders(market = null) {
    return this.fetchWithAuth('/orders', 'DELETE', market ? { market } : null);
  }

  // Market Data Methods
  async getMarketHistory(market, interval = '1h', limit = 100) {
    const data = await this.fetchWithAuth(`/history/${market}?interval=${interval}&limit=${limit}`);
    this.priceHistory.set(market, data);
    return data;
  }

  async getMarketSummary(market) {
    return this.fetchWithAuth(`/summary/${market}`);
  }

  // Previous methods remain the same...
}

// Alert Manager
class AlertManager {
  constructor() {
    this.alerts = new Set();
    this.history = [];
  }

  addAlert(type, market, threshold, callback) {
    const alert = { id: Date.now(), type, market, threshold, callback };
    this.alerts.add(alert);
    return alert.id;
  }

  removeAlert(id) {
    this.alerts = new Set([...this.alerts].filter(alert => alert.id !== id));
  }

  checkAlerts(marketData) {
    this.alerts.forEach(alert => {
      const { type, market, threshold, callback } = alert;
      const data = marketData[market];

      if (!data) return;

      switch (type) {
        case ALERT_TYPES.PRICE_ABOVE:
          if (data.lastPrice > threshold) {
            this.triggerAlert(alert, data);
            callback(data);
          }
          break;
        case ALERT_TYPES.PRICE_BELOW:
          if (data.lastPrice < threshold) {
            this.triggerAlert(alert, data);
            callback(data);
          }
          break;
        // Add more alert types...
      }
    });
  }

  triggerAlert(alert, data) {
    const alertEvent = {
      ...alert,
      timestamp: new Date(),
      price: data.lastPrice
    };
    this.history.push(alertEvent);
    this.removeAlert(alert.id);
  }
}

// Trading Dashboard Component
const TradingDashboard = () => {
  // State Management
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [orderType, setOrderType] = useState('LIMIT');
  const [orderSide, setOrderSide] = useState('BUY');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [balances, setBalances] = useState([]);
  const [openOrders, setOpenOrders] = useState([]);
  const [marketData, setMarketData] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const api = useMemo(() => new XeggeXAPI(), []);
  const alertManager = useMemo(() => new AlertManager(), []);

  // Trading Functions
  const handlePlaceOrder = async () => {
    try {
      setLoading(true);
      await api.placeOrder(selectedMarket, orderSide, orderType, amount, price);
      // Refresh orders and balances
      await fetchAccountData();
      setAmount('');
      setPrice('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    try {
      setLoading(true);
      await api.cancelOrder(orderId);
      await fetchAccountData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Alert Functions
  const addPriceAlert = (market, price, type) => {
    const id = alertManager.addAlert(
      type,
      market,
      price,
      (data) => {
        // Trigger notification
        if (Notification.permission === 'granted') {
          new Notification(`Price Alert: ${market}`, {
            body: `Price ${type === ALERT_TYPES.PRICE_ABOVE ? 'above' : 'below'} ${price}`,
          });
        }
      }
    );
    setAlerts(prev => [...prev, { id, market, price, type }]);
  };

  // Data Fetching
  const fetchAccountData = async () => {
    try {
      setLoading(true);
      const [balancesData, ordersData, marketsData] = await Promise.all([
        api.getBalances(),
        api.getOpenOrders(),
        Promise.all(selectedMarket ? [api.getMarketHistory(selectedMarket)] : [])
      ]);

      setBalances(balancesData);
      setOpenOrders(ordersData);
      if (selectedMarket) {
        setMarketData(prev => ({
          ...prev,
          [selectedMarket]: marketsData[0]
        }));
      }
      setLastUpdated(new Date());
      
      // Check alerts
      alertManager.checkAlerts(marketData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Trading Interface Component
  const TradingInterface = () => (
    <Card>
      <CardHeader>
        <CardTitle>Place Order</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-4">
            <button
              onClick={() => setOrderSide('BUY')}
              className={`flex-1 py-2 rounded ${
                orderSide === 'BUY' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-100'
              }`}
            >
              Buy
            </button>
            <button
              onClick={() => setOrderSide('SELL')}
              className={`flex-1 py-2 rounded ${
                orderSide === 'SELL' 
                  ? 'bg-red-500 text-white' 
                  : 'bg-gray-100'
              }`}
            >
              Sell
            </button>
          </div>
          
          <div>
            <label className="block text-sm text-gray-500 mb-1">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="Enter amount..."
            />
          </div>

          {orderType === 'LIMIT' && (
            <div>
              <label className="block text-sm text-gray-500 mb-1">Price</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="Enter price..."
              />
            </div>
          )}

          <button
            onClick={handlePlaceOrder}
            disabled={loading}
            className="w-full py-2 bg-blue-500 text-white rounded"
          >
            Place Order
          </button>
        </div>
      </CardContent>
    </Card>
  );

  // Market History Chart Component
  const MarketHistoryChart = () => (
    <Card>
      <CardHeader>
        <CardTitle>Price History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={marketData[selectedMarket]?.history || []}>
              <XAxis 
                dataKey="timestamp"
                tickFormatter={(ts) => new Date(ts).toLocaleTimeString()}
              />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone"
                dataKey="price"
                stroke="#2563eb"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );

  // Alerts Panel Component
  const AlertsPanel = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Price Alerts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {alerts.map(alert => (
            <div key={alert.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <div>
                <div className="font-medium">{alert.market}</div>
                <div className="text-sm text-gray-500">
                  {alert.type === ALERT_TYPES.PRICE_ABOVE ? 'Above' : 'Below'} {alert.price}
                </div>
              </div>
              <button
                onClick={() => alertManager.removeAlert(alert.id)}
                className="text-red-500"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  // Effects
  useEffect(() => {
    fetchAccountData();
    const interval = setInterval(fetchAccountData, 10000); // 10-second updates
    return () => clearInterval(interval);
  }, [selectedMarket]);

  return (
    <div className="space-y-6">
      {/* Trading Interface */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TradingInterface />
        <AlertsPanel />
      </div>

      {/* Market Data */}
      <MarketHistoryChart />

      {/* Open Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Open Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {openOrders.map(order => (
              <div key={order.id} className="flex justify-between items-center p-4 bg-gray-50 rounded">
                <div>
                  <div className="font-medium">{order.market}</div>
                  <div className="text-sm text-gray-500">
                    {order.side} {order.amount} @ {order.price}
                  </div>
                </div>
                <button
                  onClick={() => handleCancelOrder(order.id)}
                  className="px-3 py-1 bg-red-100 text-red-500 rounded"
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TradingDashboard;
