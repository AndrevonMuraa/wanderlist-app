import React from 'react';
import { View, StyleSheet, Modal, ScrollView } from 'react-native';
import { Text, Button, Surface } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../styles/theme';

interface UpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade?: (tier: 'basic' | 'premium') => void;
}

export default function UpgradeModal({ visible, onClose, onUpgrade }: UpgradeModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Surface style={styles.modal}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.primaryDark]}
              style={styles.header}
            >
              <Ionicons name="star" size={48} color="#FFD700" />
              <Text style={styles.headerTitle}>Unlock Premium</Text>
              <Text style={styles.headerSubtitle}>
                Access exclusive landmarks worldwide
              </Text>
            </LinearGradient>

            {/* Current Tier */}
            <View style={styles.currentTier}>
              <Text style={styles.currentTierLabel}>Your Current Plan</Text>
              <Text style={styles.currentTierName}>Free Traveler</Text>
              <Text style={styles.currentTierDesc}>5 friends max • Friends leaderboard only</Text>
            </View>

            {/* Basic Tier */}
            <Surface style={styles.tierCard}>
              <View style={styles.tierHeader}>
                <View>
                  <Text style={styles.tierName}>Basic Traveler</Text>
                  <Text style={styles.tierPrice}>$4.99/month</Text>
                </View>
                <Ionicons name="ribbon" size={32} color={theme.colors.accent} />
              </View>
              
              <View style={styles.features}>
                <View style={styles.feature}>
                  <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                  <Text style={styles.featureText}>Up to 25 friends</Text>
                </View>
                <View style={styles.feature}>
                  <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                  <Text style={styles.featureText}>Direct messaging</Text>
                </View>
                <View style={styles.feature}>
                  <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                  <Text style={styles.featureText}>Friends leaderboard</Text>
                </View>
              </View>

              <Button
                mode="contained"
                onPress={() => onUpgrade?.('basic')}
                style={styles.upgradeButton}
                buttonColor={theme.colors.accent}
              >
                Upgrade to Basic
              </Button>
            </Surface>

            {/* Premium Tier */}
            <Surface style={[styles.tierCard, styles.premiumCard]}>
              <View style={styles.popularBadge}>
                <Text style={styles.popularText}>MOST POPULAR</Text>
              </View>
              
              <View style={styles.tierHeader}>
                <View>
                  <Text style={styles.tierName}>Premium Traveler</Text>
                  <Text style={styles.tierPrice}>$9.99/month</Text>
                </View>
                <Ionicons name="diamond" size={32} color="#FFD700" />
              </View>
              
              <View style={styles.features}>
                <View style={styles.feature}>
                  <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                  <Text style={styles.featureText}>Everything in Basic</Text>
                </View>
                <View style={styles.feature}>
                  <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                  <Text style={styles.featureText}>Premium landmarks access</Text>
                </View>
                <View style={styles.feature}>
                  <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                  <Text style={styles.featureText}>25 points per premium visit</Text>
                </View>
                <View style={styles.feature}>
                  <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                  <Text style={styles.featureText}>Global leaderboard</Text>
                </View>
                <View style={styles.feature}>
                  <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                  <Text style={styles.featureText}>Unlimited friends</Text>
                </View>
                <View style={styles.feature}>
                  <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                  <Text style={styles.featureText}>Priority support</Text>
                </View>
              </View>

              <Button
                mode="contained"
                onPress={() => onUpgrade?.('premium')}
                style={styles.upgradeButton}
                buttonColor={theme.colors.primary}
              >
                Upgrade to Premium
              </Button>
            </Surface>

            {/* Close Button */}
            <Button
              mode="text"
              onPress={onClose}
              style={styles.closeButton}
              textColor={theme.colors.textLight}
            >
              Maybe Later
            </Button>
          </ScrollView>
        </Surface>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modal: {
    borderRadius: 20,
    maxHeight: '90%',
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    padding: 30,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 8,
  },
  currentTier: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  currentTierLabel: {
    fontSize: 12,
    color: theme.colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  currentTierName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 4,
  },
  currentTierDesc: {
    fontSize: 14,
    color: theme.colors.textLight,
    marginTop: 4,
  },
  tierCard: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    elevation: 2,
  },
  premiumCard: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  tierName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  tierPrice: {
    fontSize: 18,
    color: theme.colors.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  features: {
    marginBottom: 20,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 15,
    color: theme.colors.text,
    marginLeft: 12,
  },
  upgradeButton: {
    borderRadius: 12,
    paddingVertical: 6,
  },
  closeButton: {
    marginVertical: 20,
  },
});
