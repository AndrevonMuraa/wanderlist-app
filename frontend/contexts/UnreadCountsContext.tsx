import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuth } from './AuthContext';
import { BACKEND_URL } from '../utils/config';
import { getToken } from '../utils/token';

interface UnreadCounts {
  messages: number;
  pendingFriends: number;
  total: number;
  refresh: () => Promise<void>;
}

const UnreadCountsContext = createContext<UnreadCounts>({
  messages: 0,
  pendingFriends: 0,
  total: 0,
  refresh: async () => {},
});

const POLL_INTERVAL_MS = 30_000;

/**
 * Polls `/api/messages/conversations` + `/api/friends/pending` every 30s
 * while the app is in the foreground and the user is authed.
 *
 * Exposes totals so the tab bar (both native & PersistentTabBar) can render
 * a small red dot on the Social tab whenever anything needs attention.
 */
export const UnreadCountsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState(0);
  const [pendingFriends, setPendingFriends] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setMessages(0);
      setPendingFriends(0);
      return;
    }
    try {
      const token = await getToken();
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };
      const [convResp, pendResp] = await Promise.all([
        fetch(`${BACKEND_URL}/api/messages/conversations`, { headers }),
        fetch(`${BACKEND_URL}/api/friends/pending`, { headers }),
      ]);
      if (convResp.ok) {
        const conversations = await convResp.json();
        const totalUnread = Array.isArray(conversations)
          ? conversations.reduce((acc: number, c: any) => acc + (c.unread_count || 0), 0)
          : 0;
        setMessages(totalUnread);
      }
      if (pendResp.ok) {
        const pending = await pendResp.json();
        setPendingFriends(Array.isArray(pending) ? pending.length : 0);
      }
    } catch {
      // Silent — transient network failure; next poll will recover.
    }
  }, [user]);

  // Poll while authed + app in foreground
  useEffect(() => {
    if (!user) {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
      setMessages(0);
      setPendingFriends(0);
      return;
    }
    refresh();
    pollRef.current = setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [user, refresh]);

  // Re-poll on foreground return
  useEffect(() => {
    const handler = (state: AppStateStatus) => {
      if (state === 'active' && user) refresh();
    };
    const sub = AppState.addEventListener('change', handler);
    return () => sub.remove();
  }, [user, refresh]);

  const total = messages + pendingFriends;

  return (
    <UnreadCountsContext.Provider value={{ messages, pendingFriends, total, refresh }}>
      {children}
    </UnreadCountsContext.Provider>
  );
};

export const useUnreadCounts = () => useContext(UnreadCountsContext);
