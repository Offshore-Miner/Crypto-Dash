// Advanced mock data generator with realistic market behavior
const generateEnhancedMarketData = (config = {}) => {
  const {
    days = 30,
    basePrice = 45000,
    volatility = 0.02,
    trend = 0,  // -1 to 1, bearish to bullish
    hasMarketCycles = true,
    includeFlashCrashes = true,
    includeNewsEvents = true
  } = config;

  const data = [];
  let currentPrice = basePrice;
  const now = Date.now();
  
  // Market cycle parameters
  const cycleLength = 24 * 7; // Weekly cycles
  const cycleAmplitude = basePrice * 0.05; // 5% cycle magnitude
  
  // Generate price data with realistic patterns
  for (let i = 0; i < days * 24; i++) {
    // Base random walk
    const randomWalk = (Math.random() - 0.5) * volatility;
    
    // Add trend component
    const trendComponent = trend * (volatility / 24);
    
    // Add cyclical component
    const cyclicalComponent = hasMarketCycles ? 
      Math.sin(2 * Math.PI * i / cycleLength) * cycleAmplitude / basePrice : 0;
    
    // Calculate price change
    const priceChange = currentPrice * (randomWalk + trendComponent + cyclicalComponent);
    
    // Add flash crashes (rare, sudden price drops)
    const flashCrash = includeFlashCrashes && Math.random() < 0.001 ? 
      currentPrice * -0.1 : 0;
    
    // Update current price
    currentPrice += priceChange + flashCrash;
    
    // Generate realistic volume
    const baseVolume = currentPrice * 1000;
    const volumeVariation = Math.random() * 0.5 + 0.75; // 75% to 125% of base volume
    const volume = baseVolume * volumeVariation;
    
    // Calculate high and low with realistic spreads
    const high = currentPrice * (1 + Math.random() * 0.02);
    const low = currentPrice * (1 - Math.random() * 0.02);
    
    // Generate order book snapshot
    const orderBook = generateOrderBook(currentPrice);
    
    // Generate trading metrics
    const metrics = generateTradingMetrics(currentPrice, volume);

    // Add news events impact
    if (includeNewsEvents && Math.random() < 0.05) { // 5% chance of news event
      const newsEvent = generateNewsEvent();
      currentPrice *= (1 + newsEvent.priceImpact);
    }

    data.push({
      timestamp: new Date(now - (days * 24 - i) * 3600000).toISOString(),
      price: currentPrice,
      open: currentPrice,
      high,
      low,
      close: currentPrice,
      volume,
      orderBook,
      metrics,
      liquidations: generateLiquidationData(currentPrice),
      sentiment: generateMarketSentiment(i, days * 24)
    });
  }

  return data;
};

// Generate realistic order book data
const generateOrderBook = (currentPrice) => {
  const asks = [];
  const bids = [];
  
  // Generate ask orders (selling)
  for (let i = 0; i < 10; i++) {
    const price = currentPrice * (1 + (i * 0.001));
    asks.push({
      price,
      size: Math.random() * 10 + 0.1
    });
  }
  
  // Generate bid orders (buying)
  for (let i = 0; i < 10; i++) {
    const price = currentPrice * (1 - (i * 0.001));
    bids.push({
      price,
      size: Math.random() * 10 + 0.1
    });
  }
  
  return { asks, bids };
};

// Generate trading metrics
const generateTradingMetrics = (price, volume) => {
  return {
    rsi: Math.random() * 100,
    macd: {
      line: Math.random() * 100 - 50,
      signal: Math.random() * 100 - 50,
      histogram: Math.random() * 20 - 10
    },
    bollingerBands: {
      upper: price * 1.02,
      middle: price,
      lower: price * 0.98
    },
    averageVolume: volume * (Math.random() * 0.2 + 0.9)
  };
};

// Generate liquidation data
const generateLiquidationData = (currentPrice) => {
  const hasLiquidation = Math.random() < 0.1; // 10% chance of liquidation event
  
  if (!hasLiquidation) return null;
  
  return {
    price: currentPrice * (Math.random() > 0.5 ? 1.01 : 0.99),
    size: Math.random() * 100 + 1,
    type: Math.random() > 0.5 ? 'long' : 'short'
  };
};

// Generate market sentiment
const generateMarketSentiment = (currentHour, totalHours) => {
  // Generate cyclical sentiment that gradually changes
  const baseScore = Math.sin(2 * Math.PI * currentHour / totalHours);
  const randomComponent = (Math.random() - 0.5) * 0.2;
  
  return {
    score: baseScore + randomComponent,
    magnitude: Math.random() * 0.5 + 0.5,
    sources: {
      social: Math.random() * 100,
      news: Math.random() * 100,
      technical: Math.random() * 100
    }
  };
};

// Generate news events
const generateNewsEvent = () => {
  const eventTypes = [
    { type: 'regulatory', maxImpact: 0.15 },
    { type: 'adoption', maxImpact: 0.08 },
    { type: 'technical', maxImpact: 0.05 },
    { type: 'market', maxImpact: 0.03 }
  ];

  const selectedEvent = eventTypes[Math.floor(Math.random() * eventTypes.length)];
  const impact = (Math.random() - 0.5) * 2 * selectedEvent.maxImpact;

  return {
    type: selectedEvent.type,
    priceImpact: impact,
    magnitude: Math.abs(impact) / selectedEvent.maxImpact
  };
};

// Example usage:
const mockData = generateEnhancedMarketData({
  days: 30,
  basePrice: 45000,
  volatility: 0.02,
  trend: 0.1,  // Slightly bullish
  hasMarketCycles: true,
  includeFlashCrashes: true,
  includeNewsEvents: true
});
