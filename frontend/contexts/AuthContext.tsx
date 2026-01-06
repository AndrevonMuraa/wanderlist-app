import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// For web, use relative URLs (same origin) which routes to localhost:8001 via proxy
// For mobile, use the external URL
const BACKEND_URL = Platform.OS === 'web' 
  ? '' 
  : (process.env.EXPO_PUBLIC_BACKEND_URL || '');
const AUTH_URL = 'https://auth.emergentagent.com';

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
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for OAuth callback on page load (web)
    if (Platform.OS === 'web') {
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const sessionId = urlParams.get('session_id') || hashParams.get('session_id');
      
      if (sessionId) {
        console.log('Found session_id in URL:', sessionId);
        handleOAuthCallback(sessionId).finally(() => {
          setLoading(false);
        });
      } else {
        checkAuth();
      }
    } else {
      checkAuth();
      
      // Handle deep links for mobile
      const subscription = Linking.addEventListener('url', handleDeepLink);
      
      // Check initial URL (cold start)
      Linking.getInitialURL().then(url => {
        if (url) handleUrl(url);
      });

      return () => {
        subscription.remove();
      };
    }
  }, []);

  const handleOAuthCallback = async (sessionId: string) => {
    try {
      console.log('Processing OAuth callback with session_id:', sessionId);
      const response = await fetch(`${BACKEND_URL}/api/auth/google/callback?session_id=${sessionId}`, {
        method: 'POST',
        credentials: 'include'  // Include cookies
      });

      if (response.ok) {
        const data = await response.json();
        console.log('OAuth callback successful:', data);
        
        // Store token
        if (Platform.OS === 'web') {
          // For web, use localStorage as fallback
          localStorage.setItem('auth_token', data.session_token);
        } else {
          await SecureStore.setItemAsync('auth_token', data.session_token);
        }
        
        // Clean URL
        if (Platform.OS === 'web') {
          window.history.replaceState({}, document.title, '/');
        }
        
        // Refresh user data
        await refreshUser();
      } else {
        console.error('OAuth callback failed:', response.status);
        const errorData = await response.json().catch(() => ({ detail: 'OAuth callback failed' }));
        throw new Error(errorData.detail || 'OAuth callback failed');
      }
    } catch (error) {
      console.error('Error processing Google OAuth callback:', error);
      // Don't throw - just log the error so app doesn't crash
      // User will stay on login screen
    }
  };

  const handleDeepLink = (event: { url: string }) => {
    console.log('Deep link received:', event.url);
    handleUrl(event.url);
  };

  const handleUrl = async (url: string) => {
    console.log('Processing URL:', url);
    // Parse session_id from URL (both hash and query)
    let sessionId = null;
    
    if (url.includes('#session_id=')) {
      sessionId = url.split('#session_id=')[1].split('&')[0];
    } else if (url.includes('?session_id=')) {
      sessionId = url.split('?session_id=')[1].split('&')[0];
    }

    if (sessionId) {
      console.log('Found session_id in deep link:', sessionId);
      await handleOAuthCallback(sessionId);
    }
  };

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
    try {
      // For web, use current window location
      // For mobile, use deep linking URL
      const redirectUrl = Platform.OS === 'web' 
        ? window.location.origin 
        : Linking.createURL('/');
      
      console.log('Google OAuth Redirect URL:', redirectUrl);
      
      const authUrl = `${AUTH_URL}/?redirect=${encodeURIComponent(redirectUrl)}`;

      if (Platform.OS === 'web') {
        // For web, redirect directly
        window.location.href = authUrl;
      } else {
        // For mobile, use WebBrowser
        const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
        
        if (result.type === 'success' && result.url) {
          await handleUrl(result.url);
        }
      }
    } catch (error) {
      console.error('Error with Google login:', error);
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
    <AuthContext.Provider value={{ user, loading, login, register, loginWithGoogle, logout, refreshUser }}>
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
