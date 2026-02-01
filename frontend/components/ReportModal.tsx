import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import theme from '../styles/theme';
import { BACKEND_URL } from '../utils/config';

const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('auth_token');
  } else {
    return await SecureStore.getItemAsync('auth_token');
  }
};

export type ReportType = 'user' | 'activity' | 'photo' | 'comment';

interface ReportReason {
  id: string;
  label: string;
  description: string;
}

const REPORT_REASONS: Record<ReportType, ReportReason[]> = {
  user: [
    { id: 'fake_profile', label: 'Fake Profile', description: 'This profile appears to be fake or impersonating someone' },
    { id: 'harassment', label: 'Harassment', description: 'This user is harassing or bullying others' },
    { id: 'spam', label: 'Spam', description: 'This user is posting spam or promotional content' },
    { id: 'inappropriate', label: 'Inappropriate Behavior', description: 'This user is behaving inappropriately' },
    { id: 'cheating', label: 'Cheating/Gaming System', description: 'This user appears to be cheating the points system' },
    { id: 'other', label: 'Other', description: 'Other reason not listed above' },
  ],
  activity: [
    { id: 'fake_visit', label: 'Fake Visit', description: 'This visit appears to be fabricated or fraudulent' },
    { id: 'inappropriate_photo', label: 'Inappropriate Photo', description: 'The photo contains inappropriate content' },
    { id: 'spam', label: 'Spam', description: 'This is spam or promotional content' },
    { id: 'wrong_location', label: 'Wrong Location', description: 'The photo does not match the claimed landmark' },
    { id: 'copyright', label: 'Copyright Violation', description: 'This photo may be stolen or copyrighted' },
    { id: 'other', label: 'Other', description: 'Other reason not listed above' },
  ],
  photo: [
    { id: 'inappropriate', label: 'Inappropriate Content', description: 'This photo contains inappropriate content' },
    { id: 'not_landmark', label: 'Not the Landmark', description: 'This photo is not of the claimed landmark' },
    { id: 'copyright', label: 'Copyright Violation', description: 'This photo may be stolen or copyrighted' },
    { id: 'offensive', label: 'Offensive Content', description: 'This photo contains offensive material' },
    { id: 'other', label: 'Other', description: 'Other reason not listed above' },
  ],
  comment: [
    { id: 'harassment', label: 'Harassment', description: 'This comment is harassing or bullying' },
    { id: 'spam', label: 'Spam', description: 'This is spam or promotional content' },
    { id: 'inappropriate', label: 'Inappropriate Language', description: 'This comment contains inappropriate language' },
    { id: 'hate_speech', label: 'Hate Speech', description: 'This comment contains hate speech' },
    { id: 'other', label: 'Other', description: 'Other reason not listed above' },
  ],
};

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  reportType: ReportType;
  targetId: string;
  targetName?: string;
}

export default function ReportModal({
  visible,
  onClose,
  reportType,
  targetId,
  targetName,
}: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reasons = REPORT_REASONS[reportType] || REPORT_REASONS.user;

  const getTitle = () => {
    switch (reportType) {
      case 'user': return 'Report User';
      case 'activity': return 'Report Activity';
      case 'photo': return 'Report Photo';
      case 'comment': return 'Report Comment';
      default: return 'Report';
    }
  };

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert('Select Reason', 'Please select a reason for your report.');
      return;
    }

    setSubmitting(true);
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          report_type: reportType,
          target_id: targetId,
          reason: selectedReason,
          target_name: targetName,
        }),
      });

      if (response.ok) {
        Alert.alert(
          'Report Submitted',
          'Thank you for helping keep WanderMark safe. Our team will review your report.',
          [{ text: 'OK', onPress: onClose }]
        );
        setSelectedReason(null);
      } else {
        const error = await response.json();
        Alert.alert('Error', error.detail || 'Failed to submit report. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', 'Failed to submit report. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedReason(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="flag" size={24} color={theme.colors.error} />
              <Text style={styles.headerTitle}>{getTitle()}</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Target info */}
          {targetName && (
            <View style={styles.targetInfo}>
              <Text style={styles.targetLabel}>Reporting:</Text>
              <Text style={styles.targetName}>{targetName}</Text>
            </View>
          )}

          {/* Reason selection */}
          <Text style={styles.sectionTitle}>Select a reason:</Text>
          <ScrollView style={styles.reasonsList} showsVerticalScrollIndicator={false}>
            {reasons.map((reason) => (
              <TouchableOpacity
                key={reason.id}
                style={[
                  styles.reasonItem,
                  selectedReason === reason.id && styles.reasonItemSelected,
                ]}
                onPress={() => setSelectedReason(reason.id)}
                activeOpacity={0.7}
              >
                <View style={styles.reasonContent}>
                  <View style={styles.radioOuter}>
                    {selectedReason === reason.id && <View style={styles.radioInner} />}
                  </View>
                  <View style={styles.reasonText}>
                    <Text style={[
                      styles.reasonLabel,
                      selectedReason === reason.id && styles.reasonLabelSelected,
                    ]}>
                      {reason.label}
                    </Text>
                    <Text style={styles.reasonDescription}>{reason.description}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Policy note */}
          <View style={styles.policyNote}>
            <Ionicons name="shield-checkmark" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.policyText}>
              Reports are reviewed within 24-48 hours. False reports may result in account restrictions.
            </Text>
          </View>

          {/* Submit button */}
          <TouchableOpacity
            style={[styles.submitButton, !selectedReason && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!selectedReason || submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <Text style={styles.submitButtonText}>Submitting...</Text>
            ) : (
              <>
                <Ionicons name="send" size={18} color="#fff" />
                <Text style={styles.submitButtonText}>Submit Report</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
  },
  closeButton: {
    padding: 4,
  },
  targetInfo: {
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  targetLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  targetName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  reasonsList: {
    maxHeight: 300,
  },
  reasonItem: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  reasonItemSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
  },
  reasonContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.primary,
  },
  reasonText: {
    flex: 1,
  },
  reasonLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  reasonLabelSelected: {
    color: theme.colors.primary,
  },
  reasonDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  policyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
    marginBottom: 16,
  },
  policyText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  submitButton: {
    backgroundColor: theme.colors.error,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  submitButtonDisabled: {
    backgroundColor: theme.colors.border,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
