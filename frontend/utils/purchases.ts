/**
 * RevenueCat Integration for WanderMark
 * 
 * This module handles in-app purchases using RevenueCat.
 * Set MOCK_PURCHASES to false to use real RevenueCat SDK.
 */

import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ⚠️ SET TO FALSE TO USE REAL REVENUECAT
export const MOCK_PURCHASES = false;

// RevenueCat API Keys
const REVENUECAT_IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || 'test_CtFYyqeJsPDwTZgaeoKPUoKJAny';
const REVENUECAT_ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || '';

// Product identifiers (must match App Store Connect / Play Console)
export const PRODUCT_IDS = {
  MONTHLY: 'wandermark_pro_monthly',
  YEARLY: 'wandermark_pro_yearly',
};

// Entitlement identifier (must match RevenueCat dashboard)
export const ENTITLEMENT_ID = 'WanderMark Pro';

// Storage key for mock purchases
const MOCK_PURCHASE_KEY = 'mock_pro_purchase';

// Types
export interface Package {
  identifier: string;
  product: {
    identifier: string;
    priceString: string;
    price: number;
    currencyCode: string;
    title: string;
    description: string;
  };
  packageType: 'MONTHLY' | 'ANNUAL';
}

export interface CustomerInfo {
  entitlements: {
    active: {
      [key: string]: {
        identifier: string;
        isActive: boolean;
        willRenew: boolean;
        expirationDate: string | null;
      };
    };
  };
  activeSubscriptions: string[];
}

export interface Offering {
  identifier: string;
  availablePackages: Package[];
  monthly?: Package;
  annual?: Package;
}

// Mock data for testing
const MOCK_OFFERINGS: Offering = {
  identifier: 'default',
  availablePackages: [
    {
      identifier: '$rc_monthly',
      product: {
        identifier: PRODUCT_IDS.MONTHLY,
        priceString: '$3.99',
        price: 3.99,
        currencyCode: 'USD',
        title: 'WanderMark Pro Monthly',
        description: 'Monthly subscription to WanderMark Pro',
      },
      packageType: 'MONTHLY',
    },
    {
      identifier: '$rc_annual',
      product: {
        identifier: PRODUCT_IDS.YEARLY,
        priceString: '$29.99',
        price: 29.99,
        currencyCode: 'USD',
        title: 'WanderMark Pro Yearly',
        description: 'Yearly subscription to WanderMark Pro - Save 37%!',
      },
      packageType: 'ANNUAL',
    },
  ],
  monthly: undefined,
  annual: undefined,
};

// Initialize mock offerings
MOCK_OFFERINGS.monthly = MOCK_OFFERINGS.availablePackages[0];
MOCK_OFFERINGS.annual = MOCK_OFFERINGS.availablePackages[1];

let Purchases: any = null;
let isInitialized = false;

/**
 * Initialize RevenueCat SDK
 */
export async function initializePurchases(userId?: string): Promise<void> {
  if (MOCK_PURCHASES) {
    console.log('[Purchases] Running in MOCK mode');
    isInitialized = true;
    return;
  }

  if (Platform.OS === 'web') {
    console.log('[Purchases] Web platform - purchases disabled');
    return;
  }

  try {
    // Dynamic import for native only
    const PurchasesModule = await import('react-native-purchases');
    Purchases = PurchasesModule.default;

    const apiKey = Platform.OS === 'ios' ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY;
    
    if (!apiKey) {
      console.warn('[Purchases] No API key configured for platform:', Platform.OS);
      return;
    }

    await Purchases.configure({ apiKey });
    
    if (userId) {
      await Purchases.logIn(userId);
    }
    
    isInitialized = true;
    console.log('[Purchases] Initialized successfully');
  } catch (error) {
    console.error('[Purchases] Initialization failed:', error);
  }
}

/**
 * Get available subscription offerings
 */
export async function getOfferings(): Promise<Offering | null> {
  if (MOCK_PURCHASES) {
    return MOCK_OFFERINGS;
  }

  if (!isInitialized || !Purchases) {
    console.warn('[Purchases] Not initialized');
    return null;
  }

  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (error) {
    console.error('[Purchases] Error getting offerings:', error);
    return null;
  }
}

/**
 * Get current customer info (subscription status)
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (MOCK_PURCHASES) {
    const mockPurchase = await AsyncStorage.getItem(MOCK_PURCHASE_KEY);
    if (mockPurchase) {
      const data = JSON.parse(mockPurchase);
      return {
        entitlements: {
          active: {
            [ENTITLEMENT_ID]: {
              identifier: ENTITLEMENT_ID,
              isActive: true,
              willRenew: true,
              expirationDate: data.expirationDate,
            },
          },
        },
        activeSubscriptions: [data.productId],
      };
    }
    return {
      entitlements: { active: {} },
      activeSubscriptions: [],
    };
  }

  if (!isInitialized || !Purchases) {
    return null;
  }

  try {
    return await Purchases.getCustomerInfo();
  } catch (error) {
    console.error('[Purchases] Error getting customer info:', error);
    return null;
  }
}

/**
 * Check if user has active Pro subscription
 */
export async function hasProAccess(): Promise<boolean> {
  const customerInfo = await getCustomerInfo();
  if (!customerInfo) return false;
  
  return ENTITLEMENT_ID in customerInfo.entitlements.active;
}

/**
 * Purchase a subscription package
 */
export async function purchasePackage(pkg: Package): Promise<{ success: boolean; customerInfo?: CustomerInfo; error?: string }> {
  if (MOCK_PURCHASES) {
    // Simulate purchase flow
    return new Promise((resolve) => {
      Alert.alert(
        '🧪 Test Purchase',
        `This is a MOCK purchase for testing.\n\nProduct: ${pkg.product.title}\nPrice: ${pkg.product.priceString}\n\nIn production, this will open the real payment sheet.`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve({ success: false, error: 'User cancelled' }),
          },
          {
            text: 'Simulate Purchase',
            onPress: async () => {
              // Calculate expiration date based on package type
              const now = new Date();
              const expirationDate = pkg.packageType === 'ANNUAL'
                ? new Date(now.setFullYear(now.getFullYear() + 1))
                : new Date(now.setMonth(now.getMonth() + 1));
              
              // Store mock purchase
              await AsyncStorage.setItem(MOCK_PURCHASE_KEY, JSON.stringify({
                productId: pkg.product.identifier,
                purchaseDate: new Date().toISOString(),
                expirationDate: expirationDate.toISOString(),
                packageType: pkg.packageType,
              }));
              
              const customerInfo = await getCustomerInfo();
              resolve({ success: true, customerInfo: customerInfo! });
            },
          },
        ]
      );
    });
  }

  if (!isInitialized || !Purchases) {
    return { success: false, error: 'Purchases not initialized' };
  }

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { success: true, customerInfo };
  } catch (error: any) {
    if (error.userCancelled) {
      return { success: false, error: 'User cancelled' };
    }
    console.error('[Purchases] Purchase failed:', error);
    return { success: false, error: error.message || 'Purchase failed' };
  }
}

/**
 * Restore previous purchases
 */
export async function restorePurchases(): Promise<{ success: boolean; customerInfo?: CustomerInfo; error?: string }> {
  if (MOCK_PURCHASES) {
    const mockPurchase = await AsyncStorage.getItem(MOCK_PURCHASE_KEY);
    if (mockPurchase) {
      const customerInfo = await getCustomerInfo();
      return { success: true, customerInfo: customerInfo! };
    }
    return { success: false, error: 'No purchases to restore' };
  }

  if (!isInitialized || !Purchases) {
    return { success: false, error: 'Purchases not initialized' };
  }

  try {
    const customerInfo = await Purchases.restorePurchases();
    const hasPro = ENTITLEMENT_ID in customerInfo.entitlements.active;
    return { 
      success: hasPro, 
      customerInfo,
      error: hasPro ? undefined : 'No active subscription found',
    };
  } catch (error: any) {
    console.error('[Purchases] Restore failed:', error);
    return { success: false, error: error.message || 'Restore failed' };
  }
}

/**
 * Clear mock purchase (for testing)
 */
export async function clearMockPurchase(): Promise<void> {
  if (MOCK_PURCHASES) {
    await AsyncStorage.removeItem(MOCK_PURCHASE_KEY);
    console.log('[Purchases] Mock purchase cleared');
  }
}

/**
 * Log out user from RevenueCat (call on app logout)
 */
export async function logoutPurchases(): Promise<void> {
  if (MOCK_PURCHASES) {
    await clearMockPurchase();
    return;
  }

  if (isInitialized && Purchases) {
    try {
      await Purchases.logOut();
    } catch (error) {
      console.error('[Purchases] Logout failed:', error);
    }
  }
}
