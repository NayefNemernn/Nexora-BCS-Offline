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
    // A tiny floating-point residual (e.g. a fully-discounted sale landing on
    // -0.0000004 instead of exactly 0) rounds to -0, and -0 !== 0 as far as
    // Number#toLocaleString is concerned — it prints "-0" instead of "0".
    // `v === 0` is true for both +0 and -0, so this normalizes it away
    // without masking a genuinely non-zero (or NaN) value.
    const v = Math.round(parseFloat(amount));
    return (v === 0 ? 0 : v).toLocaleString("en-US") + " ل.ل";
  };

  // Format USD
  const formatUSD = (amount) => {
    // Same -0 rounding artifact as formatLBP, but at the 2-decimal level —
    // e.g. -0.003 rounds to the string "-0.00". Normalize that specific case.
    const fixed = parseFloat(amount).toFixed(2);
    return "$" + (fixed === "-0.00" ? "0.00" : fixed);
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