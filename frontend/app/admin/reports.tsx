import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, Platform } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
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
}

const REPORT_REASONS: { [key: string]: string } = {
  spam: 'Spam or misleading',
  harassment: 'Harassment or bullying',
  inappropriate: 'Inappropriate content',
  fake: 'Fake or misleading information',
  other: 'Other violation',
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
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>('pending');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchReports();
  }, [page, statusFilter]);

  const fetchReports = async () => {
    try {
      const token = await getToken();
      let url = `${BACKEND_URL}/api/admin/reports?page=${page}&limit=20`;
      
      if (statusFilter) {
        url += `&status=${statusFilter}`;
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
    <View style={[styles.reportCard, { backgroundColor: colors.surface }]}>
      {/* Header */}
      <View style={styles.reportHeader}>
        <View style={[styles.typeBadge, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons 
            name={report.report_type === 'user' ? 'person' : 'image'} 
            size={14} 
            color={colors.primary} 
          />
          <Text style={[styles.typeText, { color: colors.primary }]}>
            {report.report_type.charAt(0).toUpperCase() + report.report_type.slice(1)}
          </Text>
        </View>
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
              onPress={() => router.push(`/admin/user-detail?id=${report.target_id}`)}
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
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reports & Moderation</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
        <View style={styles.filtersRow}>
          <FilterChip label="All" value={null} active={statusFilter === null} />
          <FilterChip label="Pending" value="pending" active={statusFilter === 'pending'} />
          <FilterChip label="Resolved" value="resolved" active={statusFilter === 'resolved'} />
          <FilterChip label="Dismissed" value="dismissed" active={statusFilter === 'dismissed'} />
        </View>
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
