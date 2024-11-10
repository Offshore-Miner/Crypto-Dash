// Basic API endpoints and fetch functions
const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';

// Helper functions for API calls
const fetchCryptoPrice = async (coinId) => {
  try {
    const response = await fetch(
      `${COINGECKO_BASE_URL}/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`
    );
    return await response.json();
  } catch (error) {
    console.error('Error fetching price:', error);
    throw error;
  }
};

const fetchCoinList = async () => {
  try {
    const response = await fetch(`${COINGECKO_BASE_URL}/coins/list`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching coin list:', error);
    throw error;
  }
};

const fetchCoinData = async (coinId) => {
  try {
    const response = await fetch(
      `${COINGECKO_BASE_URL}/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`
    );
    return await response.json();
  } catch (error) {
    console.error('Error fetching coin data:', error);
    throw error;
  }
};

const fetchMarketChart = async (coinId, days = 1) => {
  try {
    const response = await fetch(
      `${COINGECKO_BASE_URL}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`
    );
    return await response.json();
  } catch (error) {
    console.error('Error fetching market chart:', error);
    throw error;
  }
};

// Example usage:
const example = async () => {
  try {
    // Get Bitcoin price
    const btcPrice = await fetchCryptoPrice('bitcoin');
    console.log('Bitcoin price:', btcPrice);

    // Get list of all supported coins
    const coinList = await fetchCoinList();
    console.log('Total supported coins:', coinList.length);

    // Get detailed data for Ethereum
    const ethData = await fetchCoinData('ethereum');
    console.log('Ethereum data:', ethData.market_data.current_price);

    // Get Bitcoin price chart for last 7 days
    const btcChart = await fetchMarketChart('bitcoin', 7);
    console.log('Bitcoin price history:', btcChart.prices);
  } catch (error) {
    console.error('Error in example:', error);
  }
};

// Export functions for use in other files
export {
  fetchCryptoPrice,
  fetchCoinList,
  fetchCoinData,
  fetchMarketChart
};
