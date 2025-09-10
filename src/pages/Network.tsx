import React, { createContext, useContext, useEffect, useState } from "react";

// ✅ Hook: Detect network status
const useNetworkStatus = (): boolean => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const updateStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);
    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  return isOnline;
};

// ✅ Context
const NetworkStatusContext = createContext<boolean>(true);

// ✅ Provider to wrap around your app
export const NetworkStatusProvider = ({ children }: { children: React.ReactNode }) => {
  const isOnline = useNetworkStatus();
  return (
    <NetworkStatusContext.Provider value={isOnline}>
      {children}
    </NetworkStatusContext.Provider>
  );
};

// ✅ Hook to use in any component
export const useNetwork = () => useContext(NetworkStatusContext);
