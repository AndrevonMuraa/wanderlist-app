import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, Platform, Image } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { safeGoBack } from '../../utils/navigation';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import theme from '../../styles/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { BACKEND_URL } from '../../utils/config';

const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('auth_token');
  }
  return await SecureStore.getItemAsync('auth_token');
};

interface ReportItem {
  report_id: string;
  reporter_id: string;
  report_type: string;
  target_id: string;
  target_name?: string;
  reason: string;
  status: string;
  admin_notes?: string;
  created_at: string;
  reviewed_at?: string;
  reviewed_by_user_id?: string;
  reviewed_by_name?: string;
  reviewed_by_role?: string;
  auto_flagged?: boolean;
  pending_report_count?: number;
  reporter?: {
    name: string;
    email: string;
    picture?: string;
  };
  target?: {
    name: string;
    email: string;
    picture?: string;
  };
  content_preview?: {
    photo_url?: string;
    photo_count?: number;
    diary_snippet?: string;
    comment_text?: string;
    landmark_id?: string;
    trip_name?: string;
    country_name?: string;
    visited_at?: string;
    comment_created_at?: string;
    activity_id?: string;
  };
}

const REPORT_REASONS: { [key: string]: string } = {
  // Generic reasons (any type)
  spam: 'Spam or promotional content',
  harassment: 'Harassment or bullying',
  inappropriate: 'Inappropriate content',
  hate_speech: 'Hate speech',
  offensive: 'Offensive content',
  copyright: 'Copyright violation',
  other: 'Other violation',
  // User-specific
  fake_profile: 'Fake profile',
  cheating: 'Cheating / abusing the system',
  // Photo/activity-specific
  fake: 'Fake or misleading',
  fake_visit: 'Fake visit',
  inappropriate_photo: 'Inappropriate photo',
  wrong_location: 'Wrong location tag',
  not_landmark: 'Not a real landmark',
  // Diary-specific
  inappropriate_diary: 'Inappropriate diary text',
  harassment_diary: 'Harassing diary text',
};

const TYPE_ICONS: { [key: string]: { name: any; color: string; label: string } } = {
  user: { name: 'person', color: '#8B5CF6', label: 'User' },
  photo: { name: 'image', color: '#3B82F6', label: 'Photo' },
  diary: { name: 'book', color: '#F59E0B', label: 'Diary' },
  comment: { name: 'chatbubble-ellipses', color: '#10B981', label: 'Comment' },
  activity: { name: 'footsteps', color: '#EC4899', label: 'Activity' },
};

const STATUS_COLORS: { [key: string]: string } = {
  pending: '#f59e0b',
  reviewed: '#3b82f6',
  resolved: '#10b981',
  dismissed: '#6b7280',
};

export default function AdminReportsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<'reports' | 'bugs' | 'blocks'>('reports');
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [bugReports, setBugReports] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>('pending');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (activeTab === 'reports') fetchReports();
    else if (activeTab === 'bugs') fetchBugReports();
    else if (activeTab === 'blocks') fetchBlocks();
  }, [page, statusFilter, typeFilter, activeTab]);

  const fetchBugReports = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/admin/bug-reports`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setBugReports(await res.json());
    } catch {} finally { setLoading(false); setRefreshing(false); }
  };

  const fetchBlocks = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/admin/blocks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setBlocks(await res.json());
    } catch {} finally { setLoading(false); setRefreshing(false); }
  };

  const fetchReports = async () => {
    try {
      const token = await getToken();
      let url = `${BACKEND_URL}/api/admin/reports?page=${page}&limit=20`;
      
      if (statusFilter) {
        url += `&status=${statusFilter}`;
      }
      if (typeFilter) {
        url += `&report_type=${typeFilter}`;
      }

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setReports(data.reports);
        setTotalPages(data.pages);
      }
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchReports();
  };

  const updateReportStatus = async (reportId: string, status: string) => {
    const token = await getToken();
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/reports/${reportId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        Alert.alert('Success', `Report marked as ${status}`);
        fetchReports();
      } else {
        Alert.alert('Error', 'Failed to update report');
      }
    } catch (err) {
      Alert.alert('Error', 'Network error');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const ReportCard = ({ report }: { report: ReportItem }) => (
    <View
      style={[
        styles.reportCard,
        { backgroundColor: colors.surface },
        report.auto_flagged && styles.autoFlaggedCard,
      ]}
      data-testid={`report-card-${report.report_id}`}
    >
      {/* Auto-flag banner */}
      {report.auto_flagged && (
        <View style={styles.autoFlagBanner}>
          <Ionicons name="shield" size={13} color="#FFF" />
          <Text style={styles.autoFlagBannerText}>
            Auto-hidden — {report.pending_report_count} pending reports
          </Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.reportHeader}>
        {(() => {
          const t = TYPE_ICONS[report.report_type] || { name: 'help-circle', color: colors.primary, label: report.report_type };
          return (
            <View style={[styles.typeBadge, { backgroundColor: t.color + '20' }]}>
              <Ionicons name={t.name} size={14} color={t.color} />
              <Text style={[styles.typeText, { color: t.color }]}>{t.label}</Text>
            </View>
          );
        })()}
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[report.status] }]}>
          <Text style={styles.statusText}>
            {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
          </Text>
        </View>
      </View>

      {/* Reason */}
      <View style={styles.reasonContainer}>
        <Ionicons name="flag" size={16} color={colors.error} />
        <Text style={[styles.reasonText, { color: colors.text }]}>
          {REPORT_REASONS[report.reason] || report.reason}
        </Text>
      </View>

      {/* Content preview — only for non-user reports */}
      {report.content_preview && (
        <View style={[styles.previewBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
          {report.content_preview.photo_url && (
            <Image
              source={{ uri: report.content_preview.photo_url }}
              style={styles.previewImage}
              resizeMode="cover"
            />
          )}
          {report.content_preview.diary_snippet ? (
            <View style={styles.previewTextBlock}>
              <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>Diary excerpt:</Text>
              <Text style={[styles.previewText, { color: colors.text }]} numberOfLines={4}>
                "{report.content_preview.diary_snippet}"
              </Text>
            </View>
          ) : null}
          {report.content_preview.comment_text ? (
            <View style={styles.previewTextBlock}>
              <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>Comment:</Text>
              <Text style={[styles.previewText, { color: colors.text }]} numberOfLines={4}>
                "{report.content_preview.comment_text}"
              </Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Reporter Info */}
      <View style={styles.infoRow}>
        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Reported by:</Text>
        <Text style={[styles.infoValue, { color: colors.text }]}>
          {report.reporter?.name || 'Unknown'} ({report.reporter?.email || 'N/A'})
        </Text>
      </View>

      {/* Target Info */}
      {report.target && (
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Target:</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {report.target?.name} ({report.target?.email})
          </Text>
        </View>
      )}

      {/* Date */}
      <View style={styles.infoRow}>
        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Submitted:</Text>
        <Text style={[styles.infoValue, { color: colors.textSecondary }]}>
          {formatDate(report.created_at)}
        </Text>
      </View>

      {/* Admin Notes */}
      {report.admin_notes && (
        <View style={[styles.notesContainer, { backgroundColor: colors.background }]}>
          <Text style={[styles.notesLabel, { color: colors.textSecondary }]}>Admin Notes:</Text>
          <Text style={[styles.notesText, { color: colors.text }]}>{report.admin_notes}</Text>
        </View>
      )}

      {/* Audit trail — who reviewed and when */}
      {report.reviewed_by_name && report.reviewed_at && (
        <View style={styles.auditRow}>
          <Ionicons
            name={report.reviewed_by_role === 'admin' ? 'shield-checkmark' : 'shield-outline'}
            size={12}
            color={report.reviewed_by_role === 'admin' ? '#FFD700' : colors.textSecondary}
          />
          <Text style={[styles.auditText, { color: colors.textSecondary }]}>
            Reviewed by <Text style={{ fontWeight: '600' }}>{report.reviewed_by_name}</Text>
            {report.reviewed_by_role ? ` (${report.reviewed_by_role})` : ''} · {new Date(report.reviewed_at).toLocaleDateString()}
          </Text>
        </View>
      )}

      {/* Actions */}
      {report.status === 'pending' && (
        <View style={styles.actionsRow}>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: '#10b981' + '20' }]}
            onPress={() => {
              Alert.alert('Resolve Report', 'Mark this report as resolved?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Resolve', onPress: () => updateReportStatus(report.report_id, 'resolved') }
              ]);
            }}
          >
            <Ionicons name="checkmark-circle" size={18} color="#10b981" />
            <Text style={[styles.actionBtnText, { color: '#10b981' }]}>Resolve</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: '#6b7280' + '20' }]}
            onPress={() => {
              Alert.alert('Dismiss Report', 'Dismiss this report?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Dismiss', onPress: () => updateReportStatus(report.report_id, 'dismissed') }
              ]);
            }}
          >
            <Ionicons name="close-circle" size={18} color="#6b7280" />
            <Text style={[styles.actionBtnText, { color: '#6b7280' }]}>Dismiss</Text>
          </TouchableOpacity>

          {report.report_type === 'user' && report.target && (
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: colors.error + '20' }]}
              onPress={() => router.push(`/admin/user-detail?id=${report.target_id}` as any)}
            >
              <Ionicons name="person" size={18} color={colors.error} />
              <Text style={[styles.actionBtnText, { color: colors.error }]}>View User</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  const FilterChip = ({ label, value, active }: { label: string; value: string | null; active: boolean }) => (
    <TouchableOpacity
      style={[
        styles.filterChip,
        { backgroundColor: active ? colors.primary : colors.surface },
      ]}
      onPress={() => {
        setStatusFilter(active ? null : value);
        setPage(1);
      }}
    >
      <Text style={[styles.filterChipText, { color: active ? '#fff' : colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={['#1a1a2e', '#16213e']}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => safeGoBack(router)} style={styles.headerBackButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reports & Moderation</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      {/* Tab Selector */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, gap: 8 }}>
        {[
          { key: 'reports', label: 'Reports', icon: 'flag' },
          { key: 'bugs', label: 'Bug reports', icon: 'bug' },
          { key: 'blocks', label: 'Blocks', icon: 'close-circle' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => { setActiveTab(tab.key as any); setLoading(true); }}
            style={{
              flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
              paddingVertical: 8, borderRadius: 10,
              backgroundColor: activeTab === tab.key ? theme.colors.primary : theme.colors.backgroundSecondary,
            }}
          >
            <Ionicons name={tab.icon as any} size={14} color={activeTab === tab.key ? '#fff' : theme.colors.textSecondary} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: activeTab === tab.key ? '#fff' : theme.colors.textSecondary }}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      {activeTab === 'reports' && (
      <>
      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
        <View style={styles.filtersRow}>
          <FilterChip label="All" value={null} active={statusFilter === null} />
          <FilterChip label="Pending" value="pending" active={statusFilter === 'pending'} />
          <FilterChip label="Resolved" value="resolved" active={statusFilter === 'resolved'} />
          <FilterChip label="Dismissed" value="dismissed" active={statusFilter === 'dismissed'} />
        </View>
      </ScrollView>

      {/* Type Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersRow}
      >
        <TouchableOpacity
          onPress={() => { setTypeFilter(null); setPage(1); }}
          style={[styles.typeFilterChip, typeFilter === null && { backgroundColor: colors.primary, borderColor: colors.primary }]}
        >
          <Text style={[styles.typeFilterText, { color: typeFilter === null ? '#FFF' : colors.text }]}>All Types</Text>
        </TouchableOpacity>
        {Object.entries(TYPE_ICONS).map(([type, info]) => {
          const active = typeFilter === type;
          return (
            <TouchableOpacity
              key={type}
              onPress={() => { setTypeFilter(active ? null : type); setPage(1); }}
              style={[styles.typeFilterChip, active && { backgroundColor: info.color, borderColor: info.color }]}
            >
              <Ionicons name={info.name} size={12} color={active ? '#FFF' : info.color} />
              <Text style={[styles.typeFilterText, { color: active ? '#FFF' : colors.text }]}>{info.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Reports List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : reports.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="checkmark-circle" size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Reports</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {statusFilter === 'pending' ? 'No pending reports to review' : 'No reports found'}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          {reports.map((report) => (
            <ReportCard key={report.report_id} report={report} />
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <View style={styles.pagination}>
              <TouchableOpacity
                style={[styles.pageButton, { opacity: page === 1 ? 0.5 : 1 }]}
                onPress={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                <Ionicons name="chevron-back" size={20} color={colors.primary} />
              </TouchableOpacity>
              <Text style={[styles.pageText, { color: colors.text }]}>
                Page {page} of {totalPages}
              </Text>
              <TouchableOpacity
                style={[styles.pageButton, { opacity: page === totalPages ? 0.5 : 1 }]}
                onPress={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
              >
                <Ionicons name="chevron-forward" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )}
          
          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}
      </>
      )}

      {/* Bug Reports Tab */}
      {activeTab === 'bugs' && (
        loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : bugReports.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No bug reports</Text>
          </View>
        ) : (
          <ScrollView style={styles.reportsList} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchBugReports} />}>
            {bugReports.map((bug) => (
              <View key={bug.report_id} style={[styles.reportCard, { backgroundColor: colors.surface }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ fontSize: 11, color: colors.textSecondary }}>{bug.user_name} ({bug.user_email})</Text>
                  <View style={{ backgroundColor: bug.status === 'open' ? '#f59e0b' : '#10b981', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                    <Text style={{ fontSize: 10, color: '#fff', fontWeight: '700' }}>{bug.status}</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 14, color: colors.text, lineHeight: 20 }}>{bug.description}</Text>
                {bug.screenshots?.length > 0 && (
                  <Text style={{ fontSize: 11, color: colors.primary, marginTop: 6 }}>{bug.screenshots.length} screenshot(s) attached</Text>
                )}
                <Text style={{ fontSize: 10, color: colors.textLight, marginTop: 6 }}>
                  {new Date(bug.created_at).toLocaleDateString()} {new Date(bug.created_at).toLocaleTimeString()}
                </Text>
              </View>
            ))}
            <View style={styles.bottomSpacer} />
          </ScrollView>
        )
      )}

      {/* Blocks Tab */}
      {activeTab === 'blocks' && (
        loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : blocks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No blocks</Text>
          </View>
        ) : (
          <ScrollView style={styles.reportsList} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchBlocks} />}>
            {blocks.map((b, i) => (
              <View key={i} style={[styles.reportCard, { backgroundColor: colors.surface }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="close-circle" size={16} color="#E53935" />
                  <Text style={{ fontSize: 13, color: colors.text, fontWeight: '600' }}>
                    {b.blocker_name} {b.blocker_username ? `(@${b.blocker_username})` : ''}
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginLeft: 22, marginTop: 2 }}>
                  blocked {b.blocked_name} {b.blocked_username ? `(@${b.blocked_username})` : ''}
                </Text>
                <Text style={{ fontSize: 10, color: colors.textLight, marginTop: 6 }}>
                  {b.created_at ? new Date(b.created_at).toLocaleDateString() : ''}
                </Text>
              </View>
            ))}
            <View style={styles.bottomSpacer} />
          </ScrollView>
        )
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  filtersScroll: {
    maxHeight: 60,
  },
  filtersRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 8,
    paddingVertical: 12,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  typeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: 'transparent',
  },
  typeFilterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  previewBox: {
    flexDirection: 'row',
    gap: 12,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 4,
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  previewTextBlock: {
    flex: 1,
    gap: 4,
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewText: {
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  auditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  auditText: {
    fontSize: 11,
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 15,
    marginTop: 8,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    gap: 12,
  },
  reportCard: {
    padding: 16,
    borderRadius: 16,
  },
  autoFlaggedCard: {
    borderWidth: 1.5,
    borderColor: '#dc2626',
  },
  autoFlagBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#dc2626',
    marginHorizontal: -16,
    marginTop: -16,
    marginBottom: 12,
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  autoFlagBannerText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  typeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  reasonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  reasonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 13,
    width: 100,
  },
  infoValue: {
    fontSize: 13,
    flex: 1,
  },
  notesContainer: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
    flexWrap: 'wrap',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 16,
  },
  pageButton: {
    padding: 8,
  },
  pageText: {
    fontSize: 15,
  },
  bottomSpacer: {
    height: 40,
  },
});
