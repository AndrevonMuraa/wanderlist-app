import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  Platform,
} from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import theme from '../styles/theme';

const { width, height } = Dimensions.get('window');

const ONBOARDING_COMPLETE_KEY = 'onboarding_complete';

interface OnboardingSlide {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  description: string;
  gradient: [string, string];
}

const slides: OnboardingSlide[] = [
  {
    id: '1',
    icon: 'globe-outline',
    iconColor: '#4DB8D8',
    title: 'Discover the World',
    description: 'Explore 560+ iconic landmarks across 48 countries on 5 continents.',
    gradient: ['#4DB8D8', '#7DCBE3'],
  },
  {
    id: '2',
    icon: 'camera-outline',
    iconColor: '#10b981',
    title: 'Capture Your Journey',
    description: 'Take photos, write diary entries, and share travel tips for each landmark you visit.',
    gradient: ['#10b981', '#34d399'],
  },
  {
    id: '3',
    icon: 'trophy-outline',
    iconColor: '#f59e0b',
    title: 'Earn Achievements',
    description: 'Collect badges, maintain streaks, and climb the global leaderboard.',
    gradient: ['#f59e0b', '#fbbf24'],
  },
  {
    id: '4',
    icon: 'people-outline',
    iconColor: '#8b5cf6',
    title: 'Connect with Travelers',
    description: 'Add friends, share your adventures, and get inspired by fellow explorers.',
    gradient: ['#8b5cf6', '#a78bfa'],
  },
];

interface OnboardingFlowProps {
  onComplete: () => void;
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
      setCurrentIndex(currentIndex + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = async () => {
    await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    onComplete();
  };

  const renderSlide = ({ item, index }: { item: OnboardingSlide; index: number }) => (
    <View style={styles.slide}>
      <LinearGradient
        colors={item.gradient}
        style={styles.iconContainer}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name={item.icon} size={80} color="#fff" />
      </LinearGradient>
      
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </View>
  );

  const renderDots = () => (
    <View style={styles.dotsContainer}>
      {slides.map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            index === currentIndex ? styles.dotActive : styles.dotInactive,
          ]}
        />
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Skip button */}
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
        scrollEventThrottle={16}
      />

      {/* Bottom section */}
      <View style={styles.bottomContainer}>
        {renderDots()}
        
        <TouchableOpacity onPress={handleNext} activeOpacity={0.8}>
          <LinearGradient
            colors={[theme.colors.primary, '#2dd4bf']}
            style={styles.nextButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.nextButtonText}>
              {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
            </Text>
            <Ionicons
              name={currentIndex === slides.length - 1 ? 'checkmark' : 'arrow-forward'}
              size={20}
              color="#fff"
            />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export async function shouldShowOnboarding(): Promise<boolean> {
  try {
    const completed = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);
    return completed !== 'true';
  } catch {
    return true;
  }
}

export async function resetOnboarding(): Promise<void> {
  await AsyncStorage.removeItem(ONBOARDING_COMPLETE_KEY);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  skipButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  skipText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  bottomContainer: {
    paddingHorizontal: 40,
    paddingBottom: Platform.OS === 'ios' ? 50 : 30,
    alignItems: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    marginBottom: 30,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  dotActive: {
    backgroundColor: theme.colors.primary,
    width: 30,
  },
  dotInactive: {
    backgroundColor: theme.colors.border,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
    gap: 8,
    minWidth: 200,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
