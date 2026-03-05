import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, Alert, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import theme from '../styles/theme';
import { BACKEND_URL } from '../utils/config';

const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') return localStorage.getItem('auth_token');
  return await SecureStore.getItemAsync('auth_token');
};

const REPORT_REASONS = [
  { key: 'spam', label: 'Spam or misleading' },
  { key: 'inappropriate', label: 'Inappropriate content' },
  { key: 'harassment', label: 'Harassment or bullying' },
  { key: 'fake', label: 'Fake or inauthentic' },
  { key: 'other', label: 'Other' },
];

interface ReportButtonProps {
  contentType: 'activity' | 'comment' | 'photo' | 'user';
  contentId: string;
  size?: number;
  color?: string;
}

export default function ReportButton({ contentType, contentId, size = 18, color }: ReportButtonProps) {
  const [visible, setVisible] = useState(false);
  const [sending, setSending] = useState(false);

  const submitReport = async (reason: string) => {
    setSending(true);
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/reports`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_type: contentType, content_id: contentId, reason }),
      });
      if (response.ok) {
        Alert.alert('Report Submitted', 'Thank you. We will review this content.');
      } else {
        const data = await response.json();
        Alert.alert('Error', data.detail || 'Could not submit report');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to submit report');
    } finally {
      setSending(false);
      setVisible(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setVisible(true)}
        style={styles.triggerButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        data-testid={`report-btn-${contentType}-${contentId}`}
      >
        <Ionicons name="flag-outline" size={size} color={color || theme.colors.textLight} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setVisible(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Report {contentType}</Text>
            <Text style={styles.sheetSubtitle}>Why are you reporting this?</Text>
            {REPORT_REASONS.map((r) => (
              <TouchableOpacity
                key={r.key}
                style={styles.reasonRow}
                onPress={() => submitReport(r.key)}
                disabled={sending}
                data-testid={`report-reason-${r.key}`}
              >
                <Text style={styles.reasonText}>{r.label}</Text>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textLight} />
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.cancelButton} onPress={() => setVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  triggerButton: { padding: 4 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text, marginBottom: 4 },
  sheetSubtitle: { fontSize: 14, color: theme.colors.textSecondary, marginBottom: 16 },
  reasonRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  reasonText: { fontSize: 16, color: theme.colors.text },
  cancelButton: { marginTop: 12, alignItems: 'center', paddingVertical: 14 },
  cancelText: { fontSize: 16, fontWeight: '600', color: theme.colors.textSecondary },
});
