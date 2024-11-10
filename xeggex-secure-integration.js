import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { RefreshCw, Activity, AlertTriangle, Clock } from 'lucide-react';
import CryptoJS from 'crypto-js';

// API Configuration
const XEGGEX_CONFIG = {
  baseUrl: 'https://api.xeggex.com/api/v2',
  // In production, these should be environment variables
  apiKey: '7da6122cc0a793799c8f020745e256fc',
  apiSecret: '7441ed86f1c155c8b0c1aba2568ba3aa0bfa9bbcf7036afd'
};

class XeggeXAPI {
  constructor() {
    this.baseUrl = XEGGEX_CONFIG.baseUrl;
    this.apiKey = XEGGEX_CONFIG.apiKey;
    this.apiSecret = XEGGEX_CONFIG.apiSecret;
  }

  generateSignature(timestamp, method, endpoint, body = '') {
    const message = timestamp + method + endpoint + body;
    return CryptoJS.HmacSHA256(message, this.apiSecret).toString();
  }

  async fetchWithAuth(endpoint, method = 'GET', body = null) {
    try {
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

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('XeggeX API Error:', error);
      throw error;
    }
  }

  // Account endpoints
  async getBalances() {
    return this.fetchWithAuth('/balances');
  }

  async getOpenOrders() {
    return this.fetchWithAuth('/orders');
  }

  async getOrderHistory() {
    return this.fetchWithAuth('/ordersHistory');
  }

  // Market data endpoints
  async getMarkets() {
    return this.fetchWithAuth('/markets');
  }

  async getTicker(market) {
    return this.fetchWithAuth(`/ticker/${market}`);
  }

  async getOrderBook(market) {
    return this.fetchWithAuth(`/depth/${market}`);
  }
}

const XeggeXDashboard = () => {
  // State management
  const [balances, setBalances] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [openOrders, setOpenOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const api = new XeggeXAPI();

  // Format balance for display
  const formatBalance = (balance) => {
    return {
      ...balance,
      totalValue: parseFloat(balance.available) + parseFloat(balance.reserved),
      formattedAvailable: parseFloat(balance.available).toFixed(8),
      formattedReserved: parseFloat(balance.reserved).toFixed(8)
    };
  };

  // Fetch all account data
  const fetchAccountData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch balances and orders in parallel
      const [balancesData, marketsData, ordersData] = await Promise.all([
        api.getBalances(),
        api.getMarkets(),
        api.getOpenOrders()
      ]);

      // Process and set balances
      const formattedBalances = balancesData
        .map(formatBalance)
        .filter(b => b.totalValue > 0) // Only show non-zero balances
        .sort((a, b) => b.totalValue - a.totalValue);

      setBalances(formattedBalances);
      setMarkets(marketsData);
      setOpenOrders(ordersData);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Initial load and periodic refresh
  useEffect(() => {
    fetchAccountData();
    const interval = setInterval(fetchAccountData, 30000); // 30-second updates
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">XeggeX Account Overview</h2>
        <div className="flex items-center gap-4">
          <button
            onClick={fetchAccountData}
            disabled={loading}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <div className="text-sm text-gray-500 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Last updated: {lastUpdated?.toLocaleString() || 'Never'}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 text-red-500 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Balances Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Account Balances
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {balances.map(balance => (
              <div key={balance.currency} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">{balance.currency}</div>
                    <div className="text-sm text-gray-500">
                      Total: {(parseFloat(balance.available) + parseFloat(balance.reserved)).toFixed(8)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm">
                      Available: {balance.formattedAvailable}
                    </div>
                    {parseFloat(balance.reserved) > 0 && (
                      <div className="text-sm text-gray-500">
                        Reserved: {balance.formattedReserved}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Open Orders Card */}
      <Card>
        <CardHeader>
          <CardTitle>Open Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {openOrders.length === 0 ? (
              <div className="text-gray-500 text-center py-4">
                No open orders
              </div>
            ) : (
              openOrders.map(order => (
                <div key={order.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-gray-500">Market</div>
                      <div className="font-medium">{order.market}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Type</div>
                      <div className="font-medium">{order.side} {order.type}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Price</div>
                      <div className="font-medium">{parseFloat(order.price).toFixed(8)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Amount</div>
                      <div className="font-medium">{parseFloat(order.amount).toFixed(8)}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default XeggeXDashboard;
