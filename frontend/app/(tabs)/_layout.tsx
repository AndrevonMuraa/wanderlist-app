import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import theme from '../../styles/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textLight,
        tabBarStyle: {
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          ...theme.shadows.md,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="earth-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          title: 'Social',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
      {/* Hidden tabs - functionality integrated into Social */}
      <Tabs.Screen
        name="journey"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          href: null, // Hide from tab bar
        }}
      />
    </Tabs>
  );
}
