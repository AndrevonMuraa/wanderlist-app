import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Platform } from 'react-native';
import {
  initializePurchases,
  getOfferings,
  getCustomerInfo,
  hasProAccess,
  purchasePackage,
  restorePurchases,
  logoutPurchases,
  MOCK_PURCHASES,
  Package,
  Offering,
  CustomerInfo,
} from '../utils/purchases';
import { useAuth } from './AuthContext';

interface PurchaseContextType {
  isInitialized: boolean;
  isLoading: boolean;
  isPro: boolean;
  offerings: Offering | null;
  customerInfo: CustomerInfo | null;
  isMockMode: boolean;
  // Actions
  purchase: (pkg: Package) => Promise<boolean>;
  restore: () => Promise<boolean>;
  refresh: () => Promise<void>;
}

const PurchaseContext = createContext<PurchaseContextType | undefined>(undefined);

export function PurchaseProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const [offerings, setOfferings] = useState<Offering | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  // Initialize on mount
  useEffect(() => {
    initialize();
  }, []);

  // Re-initialize when user changes
  useEffect(() => {
    if (user?.user_id) {
      initialize(user.user_id);
    }
  }, [user?.user_id]);

  const initialize = async (userId?: string) => {
    try {
      setIsLoading(true);
      await initializePurchases(userId);
      setIsInitialized(true);
      
      // Fetch initial data
      const [offeringsData, proStatus] = await Promise.all([
        getOfferings(),
        hasProAccess(),
      ]);
      
      setOfferings(offeringsData);
      setIsPro(proStatus);
      
      const info = await getCustomerInfo();
      setCustomerInfo(info);
    } catch (error) {
      console.error('[PurchaseContext] Initialization error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const [proStatus, info] = await Promise.all([
        hasProAccess(),
        getCustomerInfo(),
      ]);
      setIsPro(proStatus);
      setCustomerInfo(info);
    } catch (error) {
      console.error('[PurchaseContext] Refresh error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const purchase = useCallback(async (pkg: Package): Promise<boolean> => {
    setIsLoading(true);
    try {
      const result = await purchasePackage(pkg);
      
      if (result.success) {
        setIsPro(true);
        if (result.customerInfo) {
          setCustomerInfo(result.customerInfo);
        }
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[PurchaseContext] Purchase error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const restore = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const result = await restorePurchases();
      
      if (result.success) {
        setIsPro(true);
        if (result.customerInfo) {
          setCustomerInfo(result.customerInfo);
        }
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[PurchaseContext] Restore error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value: PurchaseContextType = {
    isInitialized,
    isLoading,
    isPro,
    offerings,
    customerInfo,
    isMockMode: MOCK_PURCHASES,
    purchase,
    restore,
    refresh,
  };

  return (
    <PurchaseContext.Provider value={value}>
      {children}
    </PurchaseContext.Provider>
  );
}

export function usePurchases() {
  const context = useContext(PurchaseContext);
  if (context === undefined) {
    throw new Error('usePurchases must be used within a PurchaseProvider');
  }
  return context;
}

export default PurchaseContext;
