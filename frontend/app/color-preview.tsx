import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Surface, Button, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../styles/theme';

// Color options
const COLOR_OPTIONS = {
  A: { name: 'Sunset Coral', color: '#E07A5F', emoji: '🌅' },
  B: { name: 'Deep Teal', color: '#1E8A8A', emoji: '🌊' },
  E: { name: 'Deep Ocean', color: '#2980B9', emoji: '🌊' },
};

export default function ColorPreviewScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#4DB8D8', '#E8DCC8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Color Preview</Text>
        <Text style={styles.headerSubtitle}>Compare accent colors</Text>
      </LinearGradient>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {Object.entries(COLOR_OPTIONS).map(([key, option]) => (
          <Surface key={key} style={styles.optionCard}>
            {/* Option Header */}
            <View style={styles.optionHeader}>
              <Text style={styles.optionEmoji}>{option.emoji}</Text>
              <View>
                <Text style={styles.optionKey}>Option {key}</Text>
                <Text style={styles.optionName}>{option.name}</Text>
              </View>
              <View style={[styles.colorSwatch, { backgroundColor: option.color }]} />
            </View>

            {/* Demo Elements */}
            <View style={styles.demoSection}>
              {/* Achievement Badge */}
              <View style={styles.demoRow}>
                <Text style={styles.demoLabel}>Achievement:</Text>
                <View style={[styles.achievementBadge, { backgroundColor: option.color + '20' }]}>
                  <Ionicons name="earth" size={20} color={option.color} />
                  <Text style={[styles.achievementText, { color: option.color }]}>
                    Continent Mastered!
                  </Text>
                </View>
              </View>

              {/* Stats Icon */}
              <View style={styles.demoRow}>
                <Text style={styles.demoLabel}>Statistics:</Text>
                <View style={[styles.statsIcon, { backgroundColor: option.color + '20' }]}>
                  <Ionicons name="stats-chart" size={22} color={option.color} />
                </View>
                <Text style={[styles.statsText, { color: option.color }]}>Detailed Stats</Text>
              </View>

              {/* Category Chip */}
              <View style={styles.demoRow}>
                <Text style={styles.demoLabel}>Category:</Text>
                <View style={[styles.categoryChip, { backgroundColor: option.color }]}>
                  <Ionicons name="color-palette" size={16} color="#fff" />
                  <Text style={styles.categoryText}>Cultural</Text>
                </View>
              </View>

              {/* Progress Ring */}
              <View style={styles.demoRow}>
                <Text style={styles.demoLabel}>Progress:</Text>
                <View style={[styles.progressRing, { borderColor: option.color }]}>
                  <Text style={[styles.progressText, { color: option.color }]}>75%</Text>
                </View>
                <Text style={styles.progressLabel}>Complete</Text>
              </View>

              {/* Button */}
              <View style={styles.demoRow}>
                <Text style={styles.demoLabel}>Button:</Text>
                <View style={[styles.accentButton, { backgroundColor: option.color }]}>
                  <Ionicons name="trophy" size={18} color="#fff" />
                  <Text style={styles.buttonText}>View Achievements</Text>
                </View>
              </View>

              {/* With Ocean Gradient */}
              <View style={styles.demoRow}>
                <Text style={styles.demoLabel}>With Gradient:</Text>
                <LinearGradient
                  colors={['#4DB8D8', '#E8DCC8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientBox}
                >
                  <View style={[styles.overlayIcon, { backgroundColor: option.color }]}>
                    <Ionicons name="star" size={20} color="#fff" />
                  </View>
                </LinearGradient>
              </View>
            </View>
          </Surface>
        ))}

        {/* Color Palette Reference */}
        <Surface style={styles.paletteCard}>
          <Text style={styles.paletteTitle}>Current Palette Reference</Text>
          <View style={styles.paletteRow}>
            <View style={styles.paletteItem}>
              <View style={[styles.paletteSwatch, { backgroundColor: '#4DB8D8' }]} />
              <Text style={styles.paletteLabel}>Primary</Text>
            </View>
            <View style={styles.paletteItem}>
              <View style={[styles.paletteSwatch, { backgroundColor: '#E8DCC8' }]} />
              <Text style={styles.paletteLabel}>Sand</Text>
            </View>
            <View style={styles.paletteItem}>
              <View style={[styles.paletteSwatch, { backgroundColor: '#C9A961' }]} />
              <Text style={styles.paletteLabel}>Gold</Text>
            </View>
            <View style={styles.paletteItem}>
              <View style={[styles.paletteSwatch, { backgroundColor: '#2A2A2A' }]} />
              <Text style={styles.paletteLabel}>Text</Text>
            </View>
          </View>
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  optionCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E4DF',
  },
  optionEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  optionKey: {
    fontSize: 12,
    color: '#9B9B9B',
    fontWeight: '600',
  },
  optionName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2A2A2A',
  },
  colorSwatch: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginLeft: 'auto',
  },
  demoSection: {
    gap: 12,
  },
  demoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  demoLabel: {
    width: 90,
    fontSize: 12,
    color: '#9B9B9B',
  },
  achievementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  achievementText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsText: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '600',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  categoryText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  progressRing: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressLabel: {
    marginLeft: 10,
    fontSize: 14,
    color: '#6B6B6B',
  },
  accentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  gradientBox: {
    width: 120,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paletteCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  paletteTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B6B6B',
    marginBottom: 12,
    textAlign: 'center',
  },
  paletteRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  paletteItem: {
    alignItems: 'center',
  },
  paletteSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 6,
  },
  paletteLabel: {
    fontSize: 11,
    color: '#9B9B9B',
  },
});
