import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import theme, { gradients } from '../styles/theme';

interface UniversalHeaderProps {
  title: string;
  showBack?: boolean;
  rightElement?: React.ReactNode;
}

export const UniversalHeader: React.FC<UniversalHeaderProps> = ({
  title,
  showBack = true,
  rightElement,
}) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'ios' ? insets.top : (StatusBar.currentHeight || 20);

  return (
    <LinearGradient
      colors={gradients.oceanToSand}
      start={gradients.horizontal.start}
      end={gradients.horizontal.end}
      style={[styles.header, { paddingTop: topPadding }]}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleWithBack}>
          {showBack && (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        </View>
        {rightElement && (
          <View style={styles.rightElementContainer}>
            {rightElement}
          </View>
        )}
        <TouchableOpacity 
          style={styles.brandingContainer}
          onPress={() => router.push('/about')}
          activeOpacity={0.7}
        >
          <Ionicons name="earth" size={16} color="#2A2A2A" />
          <Text style={styles.brandingTextDark}>WanderList</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 32,
  },
  titleWithBack: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    padding: theme.spacing.xs,
    marginRight: theme.spacing.xs,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
  },
  rightElementContainer: {
    marginRight: theme.spacing.sm,
  },
  brandingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  brandingTextDark: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2A2A2A',
  },
});

export default UniversalHeader;
