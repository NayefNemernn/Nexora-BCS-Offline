import React, { createContext, useContext, useState } from "react";

const CurrencyContext = createContext(null);

// Default exchange rate (user can change at any time)
const DEFAULT_RATE = 89500;

export const CurrencyProvider = ({ children }) => {
  const [exchangeRate, setExchangeRate] = useState(() => {
    const saved = localStorage.getItem("lbp_exchange_rate");
    return saved ? parseFloat(saved) : DEFAULT_RATE;
  });

  const [displayCurrency, setDisplayCurrency] = useState(() => {
    return localStorage.getItem("display_currency") || "lbp";
    // "usd" | "lbp" | "both"
  });

  const updateRate = (rate) => {
    const val = parseFloat(rate);
    if (!isNaN(val) && val > 0) {
      setExchangeRate(val);
      localStorage.setItem("lbp_exchange_rate", val);
    }
  };

  const updateDisplayCurrency = (currency) => {
    setDisplayCurrency(currency);
    localStorage.setItem("display_currency", currency);
  };

  // Convert USD price to LBP
  const toLBP = (usdPrice) => {
    return (parseFloat(usdPrice) * exchangeRate).toFixed(0);
  };

  // No rounding — show exact LBP value as entered by the user
  const toLBPNice = (usdPrice) => toLBP(usdPrice);

  // Format LBP with thousands separator
  const formatLBP = (amount) => {
    return Math.round(parseFloat(amount)).toLocaleString("en-US") + " ل.ل";
  };

  // Format USD
  const formatUSD = (amount) => {
    return "$" + parseFloat(amount).toFixed(2);
  };

  return (
    <CurrencyContext.Provider
      value={{
        exchangeRate,
        updateRate,
        displayCurrency,
        updateDisplayCurrency,
        toLBP,
        toLBPNice,
        formatLBP,
        formatUSD,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => useContext(CurrencyContext);