import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

// ABI for the two functions we want to call
const ABI = [
  {
    "inputs": [],
    "name": "getXauUsdPrice",
    "outputs": [{"internalType": "int256", "name": "", "type": "int256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "base", "type": "address"},
      {"internalType": "address", "name": "quote", "type": "address"}
    ],
    "name": "getPrice",
    "outputs": [{"internalType": "int256", "name": "", "type": "int256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

function PriceDisplay() {
  const [xauPrice, setXauPrice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const CONTRACT_ADDRESS = "0xC156A62d422E06C94Ee2bE9D67da11b3b48B25B5";

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(
          CONTRACT_ADDRESS,
          ABI,
          provider
        );

        const price = await contract.getXauUsdPrice();
        const formattedPrice = ethers.formatUnits(price, 8);
        setXauPrice(formattedPrice);
      console.log("price ======>", price);

      } catch (err: any) {
        setError(err.message);
        console.error("Error fetching price:", err);
      }
    };

    fetchPrice();
  }, []);

  // Function to get custom pair prices
  const getCustomPrice = async (baseAddress: string, quoteAddress: string) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
      
      const price = await contract.getPrice(baseAddress, quoteAddress);
      return ethers.formatUnits(price, 8);
    } catch (err) {
      console.error("Error fetching custom price:", err);
      throw err;
    }
  };

  return (
    <div>
      {error ? (
        <p>Error: {error}</p>
      ) : (
        <div>
          <h2>XAU/USD Price</h2>
          <p>{xauPrice ? `$${xauPrice}` : 'Loading...'}</p>
        </div>
      )}
    </div>
  );
}

export default PriceDisplay;