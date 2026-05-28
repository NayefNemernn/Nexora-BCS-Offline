import { createContext, useContext, useState, useEffect } from "react";

const CTX = createContext();
const LEVELS = [0.85, 1.0, 1.125, 1.25];

export function UIScaleProvider({ children }) {
  const [level, setLevel] = useState(() => {
    const saved = parseInt(localStorage.getItem("uiScale") ?? "1");
    return isNaN(saved) ? 1 : Math.max(0, Math.min(LEVELS.length - 1, saved));
  });

  useEffect(() => {
    document.documentElement.style.fontSize = `${LEVELS[level] * 16}px`;
    localStorage.setItem("uiScale", level);
  }, [level]);

  const increase = () => setLevel(l => Math.min(LEVELS.length - 1, l + 1));
  const decrease = () => setLevel(l => Math.max(0, l - 1));

  return (
    <CTX.Provider value={{ level, increase, decrease, max: LEVELS.length - 1 }}>
      {children}
    </CTX.Provider>
  );
}

export const useUIScale = () => useContext(CTX);
