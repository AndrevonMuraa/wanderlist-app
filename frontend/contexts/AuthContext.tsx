import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { BACKEND_URL } from '../utils/config';

interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  is_premium: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  isAppleSignInAvailable: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAppleSignInAvailable, setIsAppleSignInAvailable] = useState(false);

  useEffect(() => {
    // Check if Apple Sign-In is available (iOS only)
    const checkAppleSignIn = async () => {
      if (Platform.OS === 'ios') {
        const isAvailable = await AppleAuthentication.isAvailableAsync();
        setIsAppleSignInAvailable(isAvailable);
      }
    };
    checkAppleSignIn();
    checkAuth();
  }, []);

  const getToken = async (): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return localStorage.getItem('auth_token');
    } else {
      return await SecureStore.getItemAsync('auth_token');
    }
  };

  const setToken = async (token: string) => {
    if (Platform.OS === 'web') {
      localStorage.setItem('auth_token', token);
    } else {
      await SecureStore.setItemAsync('auth_token', token);
    }
  };

  const removeToken = async () => {
    if (Platform.OS === 'web') {
      localStorage.removeItem('auth_token');
    } else {
      await SecureStore.deleteItemAsync('auth_token');
    }
  };

  const checkAuth = async () => {
    try {
      const token = await getToken();
      if (token) {
        const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          await removeToken();
        }
      }
    } catch (error) {
      console.error('Error checking auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const token = await getToken();
      if (token) {
        const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    const data = await response.json();
    await setToken(data.access_token);
    setUser(data.user);
  };

  const register = async (email: string, password: string, name: string, username: string) => {
    const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password, name, username })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Registration failed');
    }

    const data = await response.json();
    await setToken(data.access_token);
    setUser(data.user);
  };

  const loginWithGoogle = async () => {
    // Google Sign-In temporarily disabled - will be re-enabled in a future update
    throw new Error('Google Sign-In is temporarily unavailable. Please use Apple Sign-In or email login.');
  };

  const loginWithApple = async () => {
    try {
      if (Platform.OS !== 'ios') {
        throw new Error('Apple Sign-In is only available on iOS');
      }

      console.log('[Apple Auth] Starting Apple Sign-In...');
      console.log('[Apple Auth] BACKEND_URL:', BACKEND_URL);

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      console.log('[Apple Auth] Got credential from Apple');
      console.log('[Apple Auth] Has identityToken:', !!credential.identityToken);
      console.log('[Apple Auth] Has user:', !!credential.user);
      console.log('[Apple Auth] Has email:', !!credential.email);
      console.log('[Apple Auth] Has fullName:', !!credential.fullName);

      const fullName = credential.fullName
        ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
        : null;

      const payload = {
        identity_token: credential.identityToken,
        user_id: credential.user,
        email: credential.email || null,
        full_name: fullName || null,
      };

      const apiUrl = `${BACKEND_URL}/api/auth/apple/callback`;
      console.log('[Apple Auth] Sending to backend:', apiUrl);
      console.log('[Apple Auth] Payload keys:', Object.keys(payload));
      console.log('[Apple Auth] identity_token length:', credential.identityToken?.length || 0);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('[Apple Auth] Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('[Apple Auth] Login successful, user:', data.user?.email);
        await setToken(data.access_token);
        setUser(data.user);
      } else {
        let errorDetail = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorDetail = errorData.detail || errorDetail;
        } catch (e) {
          const errorText = await response.text();
          errorDetail = errorText || errorDetail;
        }
        console.error('[Apple Auth] Backend error:', errorDetail);
        throw new Error(`Apple Sign-In failed: ${errorDetail}`);
      }
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        console.log('[Apple Auth] User cancelled sign-in');
        return;
      }
      console.error('[Apple Auth] Error:', error.message || error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const token = await getToken();
      if (token) {
        await fetch(`${BACKEND_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      await removeToken();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginWithGoogle, loginWithApple, isAppleSignInAvailable, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
