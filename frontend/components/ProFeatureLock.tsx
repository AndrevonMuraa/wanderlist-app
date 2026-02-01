import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import theme from '../styles/theme';

interface ProFeatureLockProps {
  visible: boolean;
  onClose: () => void;
  feature: 'premium_landmarks' | 'custom_visits' | 'unlimited_photos' | 'unlimited_friends';
  featureName?: string;
}

const FEATURE_INFO = {
  premium_landmarks: {
    title: 'Premium Landmarks',
    description: 'Unlock 92 premium landmarks including Blue Lagoon, Zhangjiajie, and more exclusive destinations.',
    icon: 'diamond' as const,
    benefits: [
      '92 Premium Landmarks',
      '25 points per visit',
      'Hidden gems worldwide',
    ],
  },
  custom_visits: {
    title: 'Custom Visits',
    description: 'Record visits to places not in our database. Perfect for off-the-beaten-path adventures!',
    icon: 'airplane' as const,
    benefits: [
      'Any destination worldwide',
      'Up to 10 landmarks per visit',
      'Photo memories for each place',
    ],
  },
  unlimited_photos: {
    title: 'Unlimited Photos',
    description: 'Capture more memories with up to 10 photos per visit instead of just 1.',
    icon: 'images' as const,
    benefits: [
      '10 photos per landmark visit',
      '10 photos per country visit',
      '20 photos for custom visits',
    ],
  },
  unlimited_friends: {
    title: 'Unlimited Friends',
    description: 'Connect with all your travel companions. Free users are limited to 5 friends.',
    icon: 'people' as const,
    benefits: [
      'Unlimited friends',
      'Full leaderboard access',
      'Compare travel stats',
    ],
  },
};

export default function ProFeatureLock({ visible, onClose, feature, featureName }: ProFeatureLockProps) {
  const router = useRouter();
  const info = FEATURE_INFO[feature];

  const handleUpgrade = () => {
    onClose();
    router.push('/subscription');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Close button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          {/* Icon */}
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={['#4DB8D8', '#1E8A8A']}
              style={styles.iconGradient}
            >
              <Ionicons name={info.icon} size={32} color="#fff" />
            </LinearGradient>
          </View>

          {/* Title */}
          <View style={styles.proTag}>
            <Ionicons name="diamond" size={14} color="#1E8A8A" />
            <Text style={styles.proTagText}>PRO FEATURE</Text>
          </View>
          
          <Text style={styles.title}>{featureName || info.title}</Text>
          <Text style={styles.description}>{info.description}</Text>

          {/* Benefits */}
          <View style={styles.benefitsContainer}>
            {info.benefits.map((benefit, index) => (
              <View key={index} style={styles.benefitRow}>
                <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                <Text style={styles.benefitText}>{benefit}</Text>
              </View>
            ))}
          </View>

          {/* CTA Button */}
          <TouchableOpacity onPress={handleUpgrade} activeOpacity={0.9}>
            <LinearGradient
              colors={['#4DB8D8', '#1E8A8A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.upgradeButton}
            >
              <Ionicons name="diamond" size={20} color="#fff" />
              <Text style={styles.upgradeText}>Upgrade to Pro</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Price hint */}
          <Text style={styles.priceHint}>Starting at $3.99/month</Text>

          {/* Maybe later */}
          <TouchableOpacity onPress={onClose} style={styles.laterButton}>
            <Text style={styles.laterText}>Maybe later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 8,
    zIndex: 1,
  },
  iconContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  iconGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  proTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 138, 138, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
    gap: 6,
  },
  proTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E8A8A',
    letterSpacing: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  benefitsContainer: {
    alignSelf: 'stretch',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  benefitText: {
    fontSize: 14,
    color: theme.colors.text,
    flex: 1,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
    width: '100%',
  },
  upgradeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  priceHint: {
    fontSize: 12,
    color: theme.colors.textLight,
    marginTop: 8,
  },
  laterButton: {
    paddingVertical: 12,
    marginTop: 4,
  },
  laterText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
});
