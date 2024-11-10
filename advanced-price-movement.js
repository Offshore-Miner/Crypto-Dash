// Advanced price movement generator with realistic market behavior
const generateAdvancedPriceMovements = (config = {}) => {
  const {
    days = 30,
    basePrice = 45000,
    baseVolatility = 0.02,
    baseTrend = 0,
    marketRegime = 'normal', // 'normal', 'volatile', 'trending', 'ranging'
    includeWhalesActivity = true,
    includeLiquidationCascades = true,
    supportResistanceLevels = true,
    volumeProfile = true
  } = config;

  // Market state tracking
  let currentState = {
    price: basePrice,
    volatility: baseVolatility,
    momentum: 0,
    volumeAccumulation: 0,
    trendStrength: 0,
    supportsAndResistances: []
  };

  // Initialize support and resistance levels
  if (supportResistanceLevels) {
    currentState.supportsAndResistances = generateKeyLevels(basePrice);
  }

  const data = [];
  const now = Date.now();

  // Volatility clustering using GARCH-like model
  const calculateDynamicVolatility = (prevVolatility, prevReturn) => {
    const omega = 0.000002; // Long-term variance
    const alpha = 0.05;     // Previous return impact
    const beta = 0.90;      // Previous volatility persistence
    return Math.sqrt(omega + alpha * prevReturn ** 2 + beta * prevVolatility ** 2);
  };

  // Momentum calculation using multiple timeframes
  const calculateMomentum = (prices, shortPeriod = 10, longPeriod = 21) => {
    if (prices.length < longPeriod) return 0;
    
    const shortMA = prices.slice(-shortPeriod).reduce((a, b) => a + b) / shortPeriod;
    const longMA = prices.slice(-longPeriod).reduce((a, b) => a + b) / longPeriod;
    return (shortMA / longMA - 1) * 100;
  };

  // Volume profile analysis
  const analyzeVolumeProfile = (price, volume) => {
    const baseVolume = volume * (1 + Math.random() * 0.5);
    const volumeZones = {
      highVolume: Math.abs(price - currentState.price) < currentState.volatility * price,
      volumeCluster: volume > baseVolume * 1.5
    };
    return volumeZones;
  };

  // Whale activity simulation
  const simulateWhaleActivity = (currentPrice) => {
    if (Math.random() < 0.02) { // 2% chance of whale activity
      const whaleImpact = {
        size: Math.random() * 1000 + 100, // 100-1100 BTC
        direction: Math.random() > 0.5 ? 1 : -1,
        priceImpact: 0
      };
      
      whaleImpact.priceImpact = (whaleImpact.size / 1000) * 
                                (whaleImpact.direction) * 
                                (currentPrice * 0.01); // 1% max impact per 1000 BTC
      return whaleImpact;
    }
    return null;
  };

  // Liquidation cascade simulation
  const simulateLiquidationCascade = (price, trend) => {
    if (Math.random() < 0.01) { // 1% chance of liquidation cascade
      const cascadeEffect = {
        initialPrice: price,
        depth: Math.random() * 0.05 + 0.02, // 2-7% cascade
        steps: Math.floor(Math.random() * 5) + 3, // 3-7 steps
        direction: trend < 0 ? -1 : 1
      };
      return cascadeEffect;
    }
    return null;
  };

  // Generate key price levels
  const generateKeyLevels = (basePrice) => {
    const levels = [];
    const numLevels = 5;
    const maxDeviation = 0.15; // 15% max deviation from base price
    
    for (let i = 0; i < numLevels; i++) {
      const deviation = (Math.random() * maxDeviation) * (Math.random() > 0.5 ? 1 : -1);
      levels.push({
        price: basePrice * (1 + deviation),
        strength: Math.random(),
        type: Math.random() > 0.5 ? 'support' : 'resistance'
      });
    }
    return levels.sort((a, b) => a.price - b.price);
  };

  // Market regime characteristics
  const regimeCharacteristics = {
    normal: {
      volatilityMultiplier: 1,
      trendStrength: 1,
      meanReversion: 0.1
    },
    volatile: {
      volatilityMultiplier: 2.5,
      trendStrength: 1.5,
      meanReversion: 0.05
    },
    trending: {
      volatilityMultiplier: 0.8,
      trendStrength: 2,
      meanReversion: 0.02
    },
    ranging: {
      volatilityMultiplier: 0.6,
      trendStrength: 0.5,
      meanReversion: 0.2
    }
  };

  const regime = regimeCharacteristics[marketRegime];

  // Generate price movements
  for (let i = 0; i < days * 24; i++) {
    // Calculate dynamic volatility
    const prevReturn = data.length > 0 ? 
      (currentState.price - data[data.length - 1].price) / data[data.length - 1].price : 0;
    currentState.volatility = calculateDynamicVolatility(currentState.volatility, prevReturn) * 
                             regime.volatilityMultiplier;

    // Calculate momentum
    const prices = data.map(d => d.price);
    currentState.momentum = calculateMomentum(prices);

    // Base price movement
    let priceChange = 0;

    // Trend component
    const trendComponent = baseTrend * regime.trendStrength +
                          (currentState.momentum / 100) * regime.trendStrength;

    // Volatility component
    const volatilityComponent = currentState.volatility * 
                               (Math.random() * 2 - 1) * 
                               regime.volatilityMultiplier;

    // Mean reversion component
    const meanReversion = (basePrice - currentState.price) / basePrice * regime.meanReversion;

    // Support and resistance effects
    let supportResistanceEffect = 0;
    if (supportResistanceLevels) {
      const nearestLevel = currentState.supportsAndResistances.reduce((nearest, level) => {
        const distance = Math.abs(level.price - currentState.price);
        return distance < Math.abs(nearest.price - currentState.price) ? level : nearest;
      });

      const distanceToLevel = (nearestLevel.price - currentState.price) / currentState.price;
      supportResistanceEffect = distanceToLevel * nearestLevel.strength * 0.1;
    }

    // Combine all components
    priceChange = currentState.price * (
      trendComponent +
      volatilityComponent +
      meanReversion +
      supportResistanceEffect
    );

    // Simulate whale activity
    if (includeWhalesActivity) {
      const whaleActivity = simulateWhaleActivity(currentState.price);
      if (whaleActivity) {
        priceChange += whaleActivity.priceImpact;
      }
    }

    // Simulate liquidation cascades
    if (includeLiquidationCascades) {
      const cascade = simulateLiquidationCascade(currentState.price, trendComponent);
      if (cascade) {
        priceChange += (cascade.depth * cascade.direction * currentState.price) / cascade.steps;
      }
    }

    // Update price
    currentState.price += priceChange;

    // Generate volume
    const volume = calculateVolume(currentState, regime);

    // Store data point
    data.push({
      timestamp: new Date(now - (days * 24 - i) * 3600000).toISOString(),
      price: currentState.price,
      volume,
      volatility: currentState.volatility,
      momentum: currentState.momentum,
      regime: marketRegime,
      metrics: {
        trendStrength: currentState.trendStrength,
        volumeProfile: volumeProfile ? analyzeVolumeProfile(currentState.price, volume) : null,
        supportResistance: supportResistanceLevels ? findNearestLevels(currentState) : null
      }
    });
  }

  return data;
};

// Helper function to calculate volume
const calculateVolume = (state, regime) => {
  const baseVolume = state.price * 10;
  const volatilityImpact = 1 + Math.abs(state.volatility) * 10;
  const momentumImpact = 1 + Math.abs(state.momentum) * 0.1;
  const randomFactor = 0.5 + Math.random();
  
  return baseVolume * volatilityImpact * momentumImpact * randomFactor * regime.volatilityMultiplier;
};

// Helper function to find nearest support/resistance levels
const findNearestLevels = (state) => {
  const levels = state.supportsAndResistances.map(level => ({
    ...level,
    distance: Math.abs(level.price - state.price) / state.price
  }));
  
  return {
    support: levels.filter(l => l.type === 'support')
                   .sort((a, b) => a.distance - b.distance)[0],
    resistance: levels.filter(l => l.type === 'resistance')
                     .sort((a, b) => a.distance - b.distance)[0]
  };
};

// Usage example
const priceData = generateAdvancedPriceMovements({
  days: 30,
  basePrice: 45000,
  baseVolatility: 0.02,
  baseTrend: 0.001,
  marketRegime: 'volatile',
  includeWhalesActivity: true,
  includeLiquidationCascades: true,
  supportResistanceLevels: true,
  volumeProfile: true
});
