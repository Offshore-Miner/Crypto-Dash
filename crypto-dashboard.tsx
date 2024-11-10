import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ArrowUpCircle, ArrowDownCircle, RefreshCcw } from 'lucide-react';

const CryptoDashboard = () => {
  const [cryptoData, setCryptoData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  // In a real application, you would replace this with your actual API key
  const DEMO_PRICES = [
    { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', price: 43250.65, change24h: 2.5 },
    { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', price: 2280.30, change24h: -1.2 },
    { id: 'cardano', symbol: 'ADA', name: 'Cardano', price: 0.45, change24h: 1.8 }
  ];

  const fetchCryptoData = async () => {
    setLoading(true);
    try {
      // In production, replace this with actual API call:
      // const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,cardano&vs_currencies=usd&include_24hr_change=true');
      // const data = await response.json();
      
      // Simulating API call for demo
      await new Promise(resolve => setTimeout(resolve, 1000));
      setCryptoData(DEMO_PRICES);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Error fetching crypto data:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCryptoData();
    const interval = setInterval(fetchCryptoData, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Cryptocurrency Prices</CardTitle>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          {lastUpdated && <span>Last updated: {lastUpdated}</span>}
          <button 
            onClick={fetchCryptoData}
            className="p-1 rounded-full hover:bg-gray-100"
            disabled={loading}
          >
            <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {cryptoData.map((crypto) => (
            <div 
              key={crypto.id}
              className="flex items-center justify-between p-4 rounded-lg bg-gray-50"
            >
              <div>
                <h3 className="font-semibold">{crypto.name}</h3>
                <p className="text-sm text-gray-500">{crypto.symbol.toUpperCase()}</p>
              </div>
              <div className="text-right">
                <p className="font-bold">${crypto.price.toLocaleString()}</p>
                <div className={`flex items-center gap-1 text-sm ${
                  crypto.change24h >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {crypto.change24h >= 0 ? (
                    <ArrowUpCircle className="w-4 h-4" />
                  ) : (
                    <ArrowDownCircle className="w-4 h-4" />
                  )}
                  <span>{Math.abs(crypto.change24h)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default CryptoDashboard;
