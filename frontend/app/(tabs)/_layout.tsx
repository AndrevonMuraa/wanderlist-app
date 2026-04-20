import { Tabs, useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useUnreadCounts } from '../../contexts/UnreadCountsContext';

/** Small red dot overlay used on the Social tab when there are unread items. */
const SocialTabIcon = ({ color, size }: { color: string; size: number }) => {
  const { total } = useUnreadCounts();
  return (
    <View>
      <Ionicons name="people-outline" size={size} color={color} />
      {total > 0 && (
        <View
          style={{
            position: 'absolute',
            top: -2,
            right: -4,
            minWidth: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: '#D4747E',
            borderWidth: 1.5,
            borderColor: '#FFFFFF',
          }}
        />
      )}
    </View>
  );
};

export default function TabsLayout() {
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();
  const { messages: unreadMessages } = useUnreadCounts();
  const router = useRouter();
  const pathname = usePathname();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textLight,
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 90 : 78,
          paddingBottom: Platform.OS === 'ios' ? 30 : 16,
          paddingTop: 8,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          ...shadows.md,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginTop: 0,
          marginBottom: 0,
        },
      }}
    >
      <Tabs.Screen
        name="explore"
        options={{
          title: t('tabs.explore'),
          tabBarAccessibilityLabel: 'Explore landmarks and countries',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="journey"
        options={{
          title: t('tabs.journey'),
          tabBarAccessibilityLabel: 'Your travel journey and stats',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          title: t('tabs.social'),
          tabBarAccessibilityLabel: 'Friends and social features',
          tabBarIcon: ({ color, size }) => <SocialTabIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarAccessibilityLabel: 'Your profile and settings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
