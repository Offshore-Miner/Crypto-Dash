import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowUpCircle, ArrowDownCircle, RefreshCcw, TrendingUp, AlertTriangle } from 'lucide-react';

const AdvancedCryptoDashboard = () => {
  const [selectedTimeframe, setSelectedTimeframe] = useState('1y');
  const [selectedCoin, setSelectedCoin] = useState('bitcoin');
  const [historicalData, setHistoricalData] = useState([]);
  const [watchlist, setWatchlist] = useState([
    { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
    { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
    { id: 'cardano', symbol: 'ADA', name: 'Cardano' }
  ]);
  
  // Technical indicators state
  const [indicators, setIndicators] = useState({
    rsi: 0,
    macd: { macd: 0, signal: 0, histogram: 0 },
    sma: { short: 0, long: 0 }
  });

  const calculateTechnicalIndicators = (data) => {
    // RSI Calculation (14 periods)
    const calculateRSI = (prices) => {
      if (prices.length < 14) return 50;
      let gains = 0;
      let losses = 0;
      
      for (let i = 1; i < 14; i++) {
        const difference = prices[i] - prices[i - 1];
        if (difference >= 0) gains += difference;
        else losses -= difference;
      }
      
      const RS = gains / losses;
      return 100 - (100 / (1 + RS));
    };

    // Simple Moving Averages
    const calculateSMA = (prices, periods) => {
      if (prices.length < periods) return 0;
      const sum = prices.slice(-periods).reduce((a, b) => a + b, 0);
      return sum / periods;
    };

    const prices = data.map(d => d.price);
    
    setIndicators({
      rsi: calculateRSI(prices),
      sma: {
        short: calculateSMA(prices, 20),
        long: calculateSMA(prices, 50)
      },
      macd: {
        macd: calculateSMA(prices, 12) - calculateSMA(prices, 26),
        signal: calculateSMA(prices, 9),
        histogram: 0 // Simplified for demo
      }
    });
  };

  const timeframes = [
    { label: '24h', value: '1d' },
    { label: '7D', value: '7d' },
    { label: '1M', value: '30d' },
    { label: '3M', value: '90d' },
    { label: '1Y', value: '1y' },
    { label: 'Max', value: 'max' }
  ];

  // Demo data generator
  const generateDemoData = (timeframe) => {
    const data = [];
    const periods = timeframe === '1d' ? 24 : 
                   timeframe === '7d' ? 168 :
                   timeframe === '30d' ? 720 :
                   timeframe === '90d' ? 2160 : 8760;
    
    let price = 45000;
    for (let i = 0; i < periods; i++) {
      price = price * (1 + (Math.random() - 0.5) * 0.02);
      data.push({
        timestamp: new Date(Date.now() - (periods - i) * 3600000).toISOString(),
        price: price,
        volume: Math.random() * 1000000000
      });
    }
    return data;
  };

  useEffect(() => {
    // In production, replace with actual API call
    const fetchHistoricalData = async () => {
      // Simulate API call
      const data = generateDemoData(selectedTimeframe);
      setHistoricalData(data);
      calculateTechnicalIndicators(data);
    };

    fetchHistoricalData();
  }, [selectedTimeframe, selectedCoin]);

  const renderPriceChart = () => (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={historicalData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="timestamp" 
          tickFormatter={(timestamp) => new Date(timestamp).toLocaleDateString()}
        />
        <YAxis 
          domain={['auto', 'auto']}
          tickFormatter={(value) => `$${value.toLocaleString()}`}
        />
        <Tooltip 
          formatter={(value) => [`$${value.toLocaleString()}`, 'Price']}
          labelFormatter={(label) => new Date(label).toLocaleString()}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="price" 
          stroke="#2563eb" 
          dot={false}
          name="Price"
        />
      </LineChart>
    </ResponsiveContainer>
  );

  const getTrendSignal = () => {
    const { rsi, sma } = indicators;
    if (rsi > 70) return { signal: 'Overbought', color: 'text-red-500' };
    if (rsi < 30) return { signal: 'Oversold', color: 'text-green-500' };
    if (sma.short > sma.long) return { signal: 'Bullish', color: 'text-green-500' };
    return { signal: 'Bearish', color: 'text-red-500' };
  };

  return (
    <div className="space-y-6 w-full max-w-6xl">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Advanced Crypto Analysis</CardTitle>
            <div className="flex gap-2">
              {timeframes.map((tf) => (
                <button
                  key={tf.value}
                  onClick={() => setSelectedTimeframe(tf.value)}
                  className={`px-3 py-1 rounded ${
                    selectedTimeframe === tf.value 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-gray-500">RSI (14)</div>
                <div className="text-2xl font-bold">{indicators.rsi.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-gray-500">MACD</div>
                <div className="text-2xl font-bold">{indicators.macd.macd.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-gray-500">20 SMA</div>
                <div className="text-2xl font-bold">${indicators.sma.short.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-gray-500">Trend Signal</div>
                <div className={`text-2xl font-bold ${getTrendSignal().color}`}>
                  {getTrendSignal().signal}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {renderPriceChart()}
          
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4">Market Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <h4 className="flex items-center gap-2 font-semibold">
                    <TrendingUp className="w-4 h-4" />
                    Technical Analysis
                  </h4>
                  <ul className="mt-2 space-y-2">
                    <li className="flex justify-between">
                      <span>RSI Signal:</span>
                      <span className={indicators.rsi > 70 ? 'text-red-500' : indicators.rsi < 30 ? 'text-green-500' : ''}>
                        {indicators.rsi > 70 ? 'Overbought' : indicators.rsi < 30 ? 'Oversold' : 'Neutral'}
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span>Trend Direction:</span>
                      <span className={indicators.sma.short > indicators.sma.long ? 'text-green-500' : 'text-red-500'}>
                        {indicators.sma.short > indicators.sma.long ? 'Uptrend' : 'Downtrend'}
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span>MACD Signal:</span>
                      <span className={indicators.macd.macd > indicators.macd.signal ? 'text-green-500' : 'text-red-500'}>
                        {indicators.macd.macd > indicators.macd.signal ? 'Bullish' : 'Bearish'}
                      </span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <h4 className="flex items-center gap-2 font-semibold">
                    <AlertTriangle className="w-4 h-4" />
                    Key Levels
                  </h4>
                  <ul className="mt-2 space-y-2">
                    <li className="flex justify-between">
                      <span>Support:</span>
                      <span>${(historicalData[historicalData.length - 1]?.price * 0.95).toFixed(2)}</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Resistance:</span>
                      <span>${(historicalData[historicalData.length - 1]?.price * 1.05).toFixed(2)}</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Daily Range:</span>
                      <span>${(historicalData[historicalData.length - 1]?.price * 0.98).toFixed(2)} - ${(historicalData[historicalData.length - 1]?.price * 1.02).toFixed(2)}</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvancedCryptoDashboard;
