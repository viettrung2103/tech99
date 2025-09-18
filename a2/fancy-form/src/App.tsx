import { useState, useEffect } from "react";
import TokenImg from "./TokenImg";

const PRICES_URL = "https://interview.switcheo.com/prices.json";

interface Token {
  currency: string;
  price: number;
  date: string;
}

interface ConversionHistory {
  from: string;
  to: string;
  amount: number;
  result: number;
  rate: number;
  timestamp: string;
}

export default function SimpleCurrencyConverter() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  // Conversion form
  const [fromCurrency, setFromCurrency] = useState("");
  const [toCurrency, setToCurrency] = useState("");
  const [amount, setAmount] = useState("");
  const [result, setResult] = useState<number | null>(null);

  const [history, setHistory] = useState<ConversionHistory[]>([]);

  useEffect(() => {
    fetchTokens();
    loadHistory();
  }, []);

  const fetchTokens = async () => {
    try {
      setLoading(true);
      const response = await fetch(PRICES_URL);
      await new Promise((r) => setTimeout(r, 2000));
      if (!response.ok) throw new Error("Failed to fetch prices");

      const data: Token[] = await response.json();

      const latestPrices = getLatestPrices(data);
      setTokens(latestPrices);

      if (latestPrices.length > 0) {
        setFromCurrency(latestPrices[0].currency);
        setToCurrency(latestPrices[1]?.currency || latestPrices[0].currency);
      }

      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const getLatestPrices = (data: Token[]) => {
    const currencyMap = new Map<string, Token>();

    data.forEach((token) => {
      const existing = currencyMap.get(token.currency);
      if (!existing || new Date(token.date) > new Date(existing.date)) {
        currencyMap.set(token.currency, token);
      }
    });

    return Array.from(currencyMap.values())
      .filter((token) => token.price > 0)
      .sort((a, b) => a.currency.localeCompare(b.currency));
  };

  const loadHistory = () => {
    const saved = sessionStorage.getItem("conversionHistory");
    console.log("saved ", saved);
    if (saved) {
      setHistory(JSON.parse(saved));
    }
  };

  const saveToHistory = (conversion: ConversionHistory) => {
    const newHistory = [conversion, ...history].slice(0, 10); // Keep last 10
    setHistory(newHistory);
    sessionStorage.setItem("conversionHistory", JSON.stringify(newHistory));
  };

  const convertCurrency = () => {
    const amountNum = parseFloat(amount);
    if (!amountNum || !fromCurrency || !toCurrency) return;

    const fromToken = tokens.find((t) => t.currency === fromCurrency);
    const toToken = tokens.find((t) => t.currency === toCurrency);

    if (!fromToken || !toToken) return;

    // Convert via USD: FROM -> USD -> TO
    const rate = fromToken.price / toToken.price;
    const convertedAmount = amountNum * rate;

    setResult(convertedAmount);

    // Save to history
    const conversion: ConversionHistory = {
      from: fromCurrency,
      to: toCurrency,
      amount: amountNum,
      result: convertedAmount,
      rate: rate,
      timestamp: new Date().toLocaleString(),
    };
    saveToHistory(conversion);
  };

  const clearHistory = () => {
    setHistory([]);
    sessionStorage.removeItem("conversionHistory");
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading tokens and prices...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="error">Error: {error}</div>
        <button onClick={fetchTokens} className="retry-btn">
          Try Again
        </button>
      </div>
    );
  }

  console.log("history ", history);
  return (
    <div className="container">
      <div className="header">
        <h1>Crypto Converter</h1>
        
      </div>

      <div className="converter-card">
        <div className="form-group">
          <label>From Currency:</label>
          <select
            value={fromCurrency}
            onChange={(e) => setFromCurrency(e.target.value)}
            className="select"
          >
            {tokens.map((token) => (
              <option key={token.currency} value={token.currency}>
                <TokenImg symbol={token.currency} /> {token.currency} - $
                {token.price.toFixed(4)}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>To Currency:</label>
          <select
            value={toCurrency}
            onChange={(e) => setToCurrency(e.target.value)}
            className="select"
          >
            {tokens.map((token) => (
              <option key={token.currency} value={token.currency}>
                {token.currency} - ${token.price.toFixed(4)}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Amount:</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount to convert"
            className="input"
          />
        </div>

        <button
          onClick={convertCurrency}
          disabled={
            !amount ||
            !fromCurrency ||
            !toCurrency ||
            fromCurrency === toCurrency
          }
          className="convert-btn"
        >
          Convert
        </button>

        {result !== null && (
          <div className="result">
            <h3>Result:</h3>
            <p className="result-text">
              <TokenImg symbol={fromCurrency} /> {parseFloat(amount).toFixed(2)}{" "}
              {fromCurrency} = <TokenImg symbol={toCurrency} />{" "}
              {result.toFixed(6)} {toCurrency}
            </p>
            <p className="rate">
              Rate: 1 {fromCurrency} ={" "}
              {(
                tokens.find((t) => t.currency === fromCurrency)!.price /
                tokens.find((t) => t.currency === toCurrency)!.price
              ).toFixed(6)}{" "}
              {toCurrency}
            </p>
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div className="history-card">
          <div className="history-header">
            <h3>Conversion History</h3>
            <button onClick={clearHistory} className="clear-btn">
              Clear History
            </button>
          </div>
          <div className="history-list">
            {history.map((item, index) => (
              <div key={index} className="history-item">
                <div className="conversion">
                  <TokenImg symbol={item.from} /> {item.amount.toFixed(2)}{" "}
                  {item.from}→<TokenImg symbol={item.to} />{" "}
                  {item.result.toFixed(6)}
                  {item.to}
                </div>
                <div className="timestamp">{item.timestamp}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
