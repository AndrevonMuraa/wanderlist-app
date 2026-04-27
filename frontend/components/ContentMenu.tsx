/**
 * ContentMenu — universal "•••" menu for user content (photos, diary, comments, profiles).
 *
 * Replaces the previous fragmented patterns (long-press to report, ReportButton, ad-hoc
 * report buttons in feed) with a single Instagram-style bottom-sheet flow:
 *
 *   1. User taps the "•••" icon next to/on content
 *   2. A bottom sheet slides up with View profile / Report / Cancel
 *   3. "Report" opens the existing ReportModal with the proper reportType + reasons
 *
 * Three visual variants tuned for context:
 *   - "overlay"  → for photos: white icon on translucent dark circle (top-right of image)
 *   - "subtle"   → for diary cards / lists: gray icon, transparent background
 *   - "compact"  → for comments: very small, far-right edge
 *
 * Always renders a 44×44 touch target (Apple HIG) regardless of visual size.
 * Renders nothing if isOwnContent is true.
 */
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet, Pressable, Alert, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import ReportModal, { ReportType } from './ReportModal';
import theme from '../styles/theme';

type Variant = 'overlay' | 'subtle' | 'compact';

interface ContentMenuProps {
  contentType: ReportType;          // 'photo' | 'diary' | 'comment' | 'activity' | 'user'
  contentId: string;
  contentName?: string;             // Shown in confirmation dialog (e.g. landmark name)
  ownerId?: string;                 // To navigate to profile + hide menu on own content
  ownerName?: string;               // Display name for "View profile"
  isOwnContent?: boolean;           // If true, renders nothing
  variant?: Variant;
  /** Override icon color (overrides variant default) */
  color?: string;
  /** Optional testid for automated tests */
  testID?: string;
}

const REPORT_LABEL: Record<ReportType, string> = {
  photo: 'Report photo',
  diary: 'Report diary text',
  comment: 'Report comment',
  activity: 'Report activity',
  user: 'Report user',
};

export default function ContentMenu({
  contentType,
  contentId,
  contentName,
  ownerId,
  ownerName,
  isOwnContent = false,
  variant = 'subtle',
  color,
  testID,
}: ContentMenuProps) {
  const [sheetVisible, setSheetVisible] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const router = useRouter();

  if (isOwnContent) return null;

  const iconSize = variant === 'compact' ? 14 : variant === 'overlay' ? 16 : 18;
  const defaultColor = variant === 'overlay' ? '#FFFFFF' : '#9CA3AF';

  const openSheet = () => setSheetVisible(true);
  const closeSheet = () => setSheetVisible(false);

  const handleViewProfile = () => {
    closeSheet();
    if (ownerId) {
      router.push(`/user-profile/${ownerId}` as any);
    }
  };

  const handleReportPress = () => {
    closeSheet();
    // Confirmation dialog before opening the report form. Adds friction
    // against accidental/abusive reporting (in addition to the per-hour
    // backend rate limit and the 2-tap minimum).
    Alert.alert(
      'Report this content?',
      'False reports may result in account restrictions. Continue only if this content violates our community guidelines.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => setReportVisible(true),
        },
      ],
    );
  };

  const buttonStyle = [
    styles.touchTarget,
    variant === 'overlay' && styles.overlayButton,
  ];

  return (
    <>
      <TouchableOpacity
        accessibilityLabel="More options"
        accessibilityRole="button"
        onPress={openSheet}
        style={buttonStyle}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        data-testid={testID || `content-menu-${contentType}-${contentId}`}
      >
        <Ionicons
          name="ellipsis-horizontal"
          size={iconSize}
          color={color || defaultColor}
        />
      </TouchableOpacity>

      <Modal
        visible={sheetVisible}
        transparent
        animationType="fade"
        onRequestClose={closeSheet}
      >
        <Pressable style={styles.backdrop} onPress={closeSheet}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            {ownerId && (
              <TouchableOpacity
                style={styles.row}
                onPress={handleViewProfile}
                data-testid="content-menu-view-profile"
              >
                <Ionicons name="person-outline" size={20} color={theme.colors.text} />
                <Text style={styles.rowText}>
                  View profile{ownerName ? ` · ${ownerName}` : ''}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.row}
              onPress={handleReportPress}
              data-testid="content-menu-report"
            >
              <Ionicons name="flag-outline" size={20} color="#E53935" />
              <Text style={[styles.rowText, styles.destructive]}>
                {REPORT_LABEL[contentType]}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.row, styles.cancelRow]}
              onPress={closeSheet}
              data-testid="content-menu-cancel"
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <ReportModal
        visible={reportVisible}
        onClose={() => setReportVisible(false)}
        reportType={contentType}
        targetId={contentId}
        targetName={contentName}
      />
    </>
  );
}

const styles = StyleSheet.create({
  touchTarget: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0E0E0',
    alignSelf: 'center',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    gap: 12,
  },
  cancelRow: {
    justifyContent: 'center',
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  rowText: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '500',
  },
  destructive: {
    color: '#E53935',
  },
  cancelText: {
    fontSize: 16,
    color: theme.colors.textLight,
    fontWeight: '600',
  },
});
