'use client';
import { createContext, useContext, useState } from 'react';

const LoadingContext = createContext<{
  isLoading: boolean;
  setIsLoading: (val: boolean) => void;
}>({
  isLoading: false,
  setIsLoading: () => { },
});

export const useLoading = () => useContext(LoadingContext);

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <LoadingContext.Provider value={{ isLoading, setIsLoading }}>
      {children}
    </LoadingContext.Provider>
  );
}
