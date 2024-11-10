import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowUpCircle, ArrowDownCircle, AlertTriangle, TrendingUp, Newspaper, Brain, Activity, Target } from 'lucide-react';

// Generate mock historical data
const generateMockHistoricalData = (days = 30) => {
  const data = [];
  let price = 45000;
  const now = Date.now();
  
  for (let i = 0; i < days * 24; i++) {
    price = price * (1 + (Math.random() - 0.5) * 0.02);
    data.push({
      timestamp: new Date(now - (days * 24 - i) * 3600000).toISOString(),
      price,
      volume: Math.random() * 1000000,
      high: price * 1.02,
      low: price * 0.98
    });
  }
  return data;
};

// Generate mock news data
const generateMockNewsData = () => {
  return {
    recent: [
      {
        title: "Major Bank Announces Crypto Integration",
        summary: "Leading financial institution launches crypto trading services",
        source: "major_news",
        timestamp: new Date().toISOString(),
        sentiment: 0.8
      },
      {
        title: "New Blockchain Protocol Update Released",
        summary: "Significant improvements in transaction speed and security",
        source: "crypto_news",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        sentiment: 0.6
      },
      {
        title: "Market Analysis: Bullish Patterns Emerging",
        summary: "Technical indicators suggest positive momentum",
        source: "crypto_news",
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        sentiment: 0.5
      }
    ],
    sentiment: {
      score: 0.65,
      magnitude: 0.8,
      direction: 'bullish'
    },
    impactPrediction: {
      shortTerm: 0.03,
      mediumTerm: 0.05,
      longTerm: 0.02
    }
  };
};

const ProfitMaximizingDashboard = () => {
  // Initialize market data with mock data
  const [marketData, setMarketData] = useState({
    price: 45000,
    historicalData: generateMockHistoricalData(),
    volatility: 0.02,
    volume: 1000000000,
    correlation: 0.7
  });

  // Initialize news data
  const [newsData, setNewsData] = useState(generateMockNewsData());

  // Initialize predictions
  const [combinedPredictions, setCombinedPredictions] = useState({
    price: 46500,
    confidence: 75,
    factors: [
      { name: 'Technical Analysis', impact: 0.03 },
      { name: 'News Sentiment', impact: 0.02 },
      { name: 'Market Context', impact: 0.01 }
    ]
  });

  // Utility functions remain the same as in the previous version
  const analyzeSentiment = (text) => {
    const positiveWords = new Set(['bullish', 'surge', 'gain', 'positive', 'up', 'rally', 'growth', 'strong', 'boost']);
    const negativeWords = new Set(['bearish', 'drop', 'fall', 'negative', 'down', 'crash', 'weak', 'decline']);
    
    const words = text.toLowerCase().split(/\s+/);
    let score = 0;
    let magnitude = 0;
    
    words.forEach(word => {
      if (positiveWords.has(word)) {
        score += 1;
        magnitude += 1;
      } else if (negativeWords.has(word)) {
        score -= 1;
        magnitude += 1;
      }
    });
    
    return {
      score: score / (magnitude || 1),
      magnitude: magnitude / words.length,
      direction: score > 0 ? 'bullish' : score < 0 ? 'bearish' : 'neutral'
    };
  };

  const calculateNewsImpact = (newsItems) => {
    const impacts = newsItems.map(news => ({
      impact: news.sentiment,
      magnitude: 0.8,
      category: 'market'
    }));
    
    return {
      shortTerm: 0.03,
      mediumTerm: 0.05,
      longTerm: 0.02
    };
  };

  // News Analysis Panel Component
  const NewsAnalysisPanel = () => (
    <Card className="p-4">
      <h3 className="flex items-center gap-2 text-lg font-bold mb-4">
        <Newspaper className="w-5 h-5" />
        Real-Time News Analysis
      </h3>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm text-gray-500">Sentiment Score</h4>
            <div className={`text-xl font-bold ${
              newsData.sentiment.score > 0 ? 'text-green-500' : 
              newsData.sentiment.score < 0 ? 'text-red-500' : 'text-gray-500'
            }`}>
              {(newsData.sentiment.score * 100).toFixed(1)}%
            </div>
          </div>
          <div>
            <h4 className="text-sm text-gray-500">Impact Magnitude</h4>
            <div className="text-xl font-bold">
              {(newsData.sentiment.magnitude * 100).toFixed(1)}%
            </div>
          </div>
        </div>
        
        <div>
          <h4 className="text-sm text-gray-500 mb-2">Recent News Impact</h4>
          <div className="space-y-2">
            {newsData.recent.slice(0, 3).map((news, index) => (
              <div key={index} className="p-2 bg-gray-50 rounded">
                <div className="font-medium">{news.title}</div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-sm text-gray-500">{news.source}</span>
                  <span className={`text-sm ${
                    news.sentiment > 0 ? 'text-green-500' : 
                    news.sentiment < 0 ? 'text-red-500' : 'text-gray-500'
                  }`}>
                    Impact: {(news.sentiment * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );

  // AI Prediction Panel Component
  const AIPredictionPanel = () => (
    <Card className="p-4">
      <h3 className="flex items-center gap-2 text-lg font-bold mb-4">
        <Brain className="w-5 h-5" />
        AI Price Predictions
      </h3>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm text-gray-500">Price Target</h4>
            <div className="text-xl font-bold">
              ${combinedPredictions.price.toLocaleString()}
            </div>
          </div>
          <div>
            <h4 className="text-sm text-gray-500">Confidence</h4>
            <div className="text-xl font-bold">
              {combinedPredictions.confidence.toFixed(1)}%
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm text-gray-500 mb-2">Contributing Factors</h4>
          <div className="space-y-2">
            {combinedPredictions.factors.map((factor, index) => (
              <div key={index} className="flex justify-between items-center">
                <span>{factor.name}</span>
                <span className={`${
                  factor.impact > 0 ? 'text-green-500' : 
                  factor.impact < 0 ? 'text-red-500' : 'text-gray-500'
                }`}>
                  {(factor.impact * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );

  // Effect to update predictions based on news
  useEffect(() => {
    // Simulated periodic updates
    const updateInterval = setInterval(() => {
      // Update market data
      setMarketData(prev => ({
        ...prev,
        price: prev.price * (1 + (Math.random() - 0.5) * 0.01),
        historicalData: generateMockHistoricalData()
      }));

      // Update news data
      setNewsData(generateMockNewsData());

      // Update predictions
      setCombinedPredictions(prev => ({
        ...prev,
        price: marketData.price * (1 + (Math.random() - 0.5) * 0.02),
        confidence: 75 + (Math.random() - 0.5) * 10
      }));
    }, 60000); // Update every minute

    return () => clearInterval(updateInterval);
  }, []);

  return (
    <div className="space-y-6 w-full max-w-7xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <NewsAnalysisPanel />
        <AIPredictionPanel />
      </div>
      
      <Card className="p-4">
        <h3 className="text-lg font-bold mb-4">Price History</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={marketData.historicalData.slice(-24)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="timestamp"
                tickFormatter={(ts) => new Date(ts).toLocaleTimeString()}
              />
              <YAxis 
                domain={['auto', 'auto']}
                tickFormatter={(value) => `$${value.toLocaleString()}`}
              />
              <Tooltip 
                formatter={(value) => [`$${value.toLocaleString()}`, 'Price']}
                labelFormatter={(label) => new Date(label).toLocaleString()}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#2563eb"
                dot={false}
                name="Price"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

export default ProfitMaximizingDashboard;
