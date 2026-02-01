import React from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useOffline } from '../contexts/OfflineContext';
import { useTheme } from '../contexts/ThemeContext';

interface OfflineStatusBarProps {
  onSyncPress?: () => void;
}

export default function OfflineStatusBar({ onSyncPress }: OfflineStatusBarProps) {
  const { isOnline, pendingVisitsCount, isInitialized } = useOffline();
  const { colors } = useTheme();

  // Don't show anything if online and no pending visits
  if (!isInitialized || (isOnline && pendingVisitsCount === 0)) {
    return null;
  }

  return (
    <View style={[
      styles.container, 
      { backgroundColor: isOnline ? '#f59e0b' : '#ef4444' }
    ]}>
      <View style={styles.content}>
        <Ionicons 
          name={isOnline ? 'cloud-upload' : 'cloud-offline'} 
          size={16} 
          color="#fff" 
        />
        <Text style={styles.text}>
          {isOnline 
            ? `${pendingVisitsCount} visit${pendingVisitsCount > 1 ? 's' : ''} pending sync`
            : 'You are offline'}
        </Text>
      </View>
      
      {isOnline && pendingVisitsCount > 0 && onSyncPress && (
        <TouchableOpacity style={styles.syncButton} onPress={onSyncPress}>
          <Text style={styles.syncButtonText}>Sync Now</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function OfflineBadge() {
  const { isOnline, pendingVisitsCount, isInitialized } = useOffline();
  const { colors } = useTheme();

  if (!isInitialized || isOnline) return null;

  return (
    <View style={[styles.badge, { backgroundColor: '#ef4444' }]}>
      <Ionicons name="cloud-offline" size={12} color="#fff" />
      <Text style={styles.badgeText}>Offline</Text>
    </View>
  );
}

export function PendingSyncBadge() {
  const { isOnline, pendingVisitsCount, isInitialized } = useOffline();

  if (!isInitialized || !isOnline || pendingVisitsCount === 0) return null;

  return (
    <View style={[styles.badge, { backgroundColor: '#f59e0b' }]}>
      <Ionicons name="cloud-upload" size={12} color="#fff" />
      <Text style={styles.badgeText}>{pendingVisitsCount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  syncButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
