import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const RefreshContext = createContext(null);

// Global refresh interval in ms — pages poll this to know when to re-fetch
const REFRESH_INTERVAL = 4000; // 4 seconds

export const RefreshProvider = ({ children }) => {
  const [tick, setTick] = useState(0);

  // Auto-tick every N seconds
  useEffect(() => {
    const id = setInterval(() => {
      setTick(t => t + 1);
    }, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, []);

  // Manual refresh — call this after any mutation (create/update/delete)
  const refresh = useCallback(() => setTick(t => t + 1), []);

  return (
    <RefreshContext.Provider value={{ tick, refresh }}>
      {children}
    </RefreshContext.Provider>
  );
};

export const useRefresh = () => useContext(RefreshContext);