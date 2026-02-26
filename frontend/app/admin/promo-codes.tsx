import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity, Platform,
  StatusBar, Alert, TextInput, RefreshControl, Modal,
} from 'react-native';
import { Text, ActivityIndicator, Switch } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import theme, { gradients } from '../../styles/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { BACKEND_URL } from '../../utils/config';
import { WebView } from 'react-native-webview';

const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') return localStorage.getItem('auth_token');
  return await SecureStore.getItemAsync('auth_token');
};

interface Redemption {
  redemption_id: string;
  user_email: string;
  user_name: string;
  redeemed_at: string;
  type: string;
  duration_days: number | null;
}

interface PromoCode {
  code_id: string;
  code: string;
  description: string | null;
  type: string;
  duration_days: number | null;
  max_uses: number;
  current_uses: number;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
  redemptions: Redemption[];
}

export default function AdminPromoCodes() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedCode, setExpandedCode] = useState<string | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<'codes' | 'history' | 'template'>('codes');

  // Email history state
  const [emailHistory, setEmailHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  // Create form state
  const [newCode, setNewCode] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newType, setNewType] = useState<'lifetime_premium' | 'timed_premium'>('lifetime_premium');
  const [newDuration, setNewDuration] = useState('');
  const [newMaxUses, setNewMaxUses] = useState('1');
  const [creating, setCreating] = useState(false);

  // Batch create state
  const [showBatch, setShowBatch] = useState(false);
  const [batchPrefix, setBatchPrefix] = useState('');
  const [batchCount, setBatchCount] = useState('10');
  const [batchDesc, setBatchDesc] = useState('');
  const [batchType, setBatchType] = useState<'lifetime_premium' | 'timed_premium'>('lifetime_premium');
  const [batchDuration, setBatchDuration] = useState('');
  const [batchMaxUses, setBatchMaxUses] = useState('1');
  const [batchCreating, setBatchCreating] = useState(false);
  const [batchResult, setBatchResult] = useState<{ created: number; codes: string[] } | null>(null);

  // Email send state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailCodeIds, setEmailCodeIds] = useState<string[]>([]);
  const [emailRecipients, setEmailRecipients] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailResult, setEmailResult] = useState<{ sent: number; failed: number } | null>(null);

  // Email template state
  interface EmailTemplate {
    subject: string;
    heading: string;
    subheading: string;
    body_text: string;
    code_label: string;
    steps_title: string;
    steps: string[];
    footer_text: string;
    support_text: string;
  }
  const [template, setTemplate] = useState<EmailTemplate | null>(null);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateDirty, setTemplateDirty] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'admin' && user.role !== 'moderator') {
      router.replace('/(tabs)/profile');
      return;
    }
    fetchCodes();
  }, [user]);

  const fetchCodes = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/admin/promo-codes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setCodes(await res.json());
      }
    } catch (e) {
      console.error('Error fetching promo codes:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchEmailHistory = async () => {
    setHistoryLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/admin/promo-codes/email-history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setEmailHistory(await res.json());
      }
    } catch (e) {
      console.error('Error fetching email history:', e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchTemplate = async () => {
    setTemplateLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/admin/email-template`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setTemplate(await res.json());
        setTemplateDirty(false);
      }
    } catch (e) {
      console.error('Error fetching template:', e);
    } finally {
      setTemplateLoading(false);
    }
  };

  const saveTemplate = async () => {
    if (!template) return;
    setTemplateSaving(true);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/admin/email-template`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(template),
      });
      if (res.ok) {
        setTemplate(await res.json());
        setTemplateDirty(false);
        Alert.alert('Saved', 'Email template updated successfully');
      } else {
        const err = await res.json();
        Alert.alert('Error', err.detail || 'Could not save template');
      }
    } catch (e) {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setTemplateSaving(false);
    }
  };

  const updateTemplateField = (field: string, value: string) => {
    if (!template) return;
    setTemplate({ ...template, [field]: value });
    setTemplateDirty(true);
  };

  const updateTemplateStep = (index: number, value: string) => {
    if (!template) return;
    const newSteps = [...template.steps];
    newSteps[index] = value;
    setTemplate({ ...template, steps: newSteps });
    setTemplateDirty(true);
  };

  const addTemplateStep = () => {
    if (!template) return;
    setTemplate({ ...template, steps: [...template.steps, ''] });
    setTemplateDirty(true);
  };

  const removeTemplateStep = (index: number) => {
    if (!template || template.steps.length <= 1) return;
    const newSteps = template.steps.filter((_, i) => i !== index);
    setTemplate({ ...template, steps: newSteps });
    setTemplateDirty(true);
  };

  const buildPreviewHtml = (): string => {
    if (!template) return '';
    const bodyText = template.body_text.replace('{access_desc}', '<strong>lifetime Premium access</strong>');
    const stepsHtml = template.steps.map(s => `<li>${s}</li>`).join('');
    return `<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>body{margin:0;padding:0;background:#e5e7eb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;}</style>
</head><body>
<div style="max-width:520px;margin:20px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.12);">
  <div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);padding:40px 30px;text-align:center;border-radius:0 0 24px 24px;">
    <h1 style="color:#fff;font-size:28px;margin:0 0 8px 0;font-weight:800;">WanderMark</h1>
    <p style="color:#94a3b8;font-size:14px;margin:0;">${template.subheading}</p>
  </div>
  <div style="padding:32px 30px;">
    <h2 style="color:#1a1a2e;font-size:22px;margin:0 0 16px 0;">${template.heading}</h2>
    <p style="color:#374151;font-size:15px;line-height:1.6;">${bodyText}</p>
    <div style="background:linear-gradient(135deg,rgba(245,158,11,0.12),rgba(217,119,6,0.12));border:2px dashed #f59e0b;border-radius:16px;padding:24px;text-align:center;margin:28px 0;">
      <p style="color:#92400e;font-size:12px;text-transform:uppercase;letter-spacing:2px;margin:0 0 8px 0;font-weight:600;">${template.code_label}</p>
      <p style="font-size:28px;font-weight:800;color:#1a1a2e;letter-spacing:3px;margin:0;font-family:'SF Mono','Menlo','Courier New',monospace;">EXAMPLE-CODE</p>
    </div>
    <div style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="color:#374151;font-size:14px;margin:0 0 12px 0;font-weight:600;">${template.steps_title}</p>
      <ol style="color:#6b7280;font-size:14px;padding-left:20px;margin:0;line-height:1.8;">${stepsHtml}</ol>
    </div>
    <p style="color:#9ca3af;font-size:13px;text-align:center;">${template.support_text}</p>
  </div>
  <div style="background:#f8fafc;padding:20px 30px;text-align:center;border-top:1px solid #e5e7eb;">
    <p style="color:#9ca3af;font-size:12px;margin:0;">${template.footer_text}</p>
  </div>
</div>
</body></html>`;
  };

  const handleCreate = async () => {
    if (!newCode.trim()) {
      Alert.alert('Error', 'Code is required');
      return;
    }
    setCreating(true);
    try {
      const token = await getToken();
      const body: any = {
        code: newCode.trim(),
        description: newDescription.trim() || null,
        type: newType,
        max_uses: parseInt(newMaxUses) || 1,
      };
      if (newType === 'timed_premium' && newDuration) {
        body.duration_days = parseInt(newDuration);
      }
      const res = await fetch(`${BACKEND_URL}/api/admin/promo-codes`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowCreate(false);
        setNewCode('');
        setNewDescription('');
        setNewType('lifetime_premium');
        setNewDuration('');
        setNewMaxUses('1');
        fetchCodes();
        Alert.alert('Created', 'Promo code created');
      } else {
        const err = await res.json();
        Alert.alert('Error', err.detail || 'Could not create code');
      }
    } catch (e) {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setCreating(false);
    }
  };

  const handleBatchCreate = async () => {
    if (!batchPrefix.trim()) {
      Alert.alert('Error', 'Prefix is required');
      return;
    }
    setBatchCreating(true);
    setBatchResult(null);
    try {
      const token = await getToken();
      const body: any = {
        prefix: batchPrefix.trim(),
        count: parseInt(batchCount) || 10,
        description: batchDesc.trim() || null,
        type: batchType,
        max_uses: parseInt(batchMaxUses) || 1,
      };
      if (batchType === 'timed_premium' && batchDuration) {
        body.duration_days = parseInt(batchDuration);
      }
      const res = await fetch(`${BACKEND_URL}/api/admin/promo-codes/batch`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        setBatchResult({ created: data.created, codes: data.codes });
        fetchCodes();
      } else {
        const err = await res.json();
        Alert.alert('Error', err.detail || 'Could not create codes');
      }
    } catch (e) {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setBatchCreating(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/admin/promo-codes/export-csv`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const csvText = await res.text();
        if (Platform.OS === 'web') {
          const blob = new Blob([csvText], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'wandermark_promo_codes.csv';
          a.click();
          URL.revokeObjectURL(url);
        } else {
          Alert.alert('Export', `CSV with ${codes.length} codes is ready`);
        }
      }
    } catch (e) {
      Alert.alert('Error', 'Could not export');
    }
  };

  const toggleActive = async (codeId: string, isActive: boolean) => {
    try {
      const token = await getToken();
      await fetch(`${BACKEND_URL}/api/admin/promo-codes/${codeId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive }),
      });
      fetchCodes();
    } catch (e) {
      console.error('Error toggling code:', e);
    }
  };

  const handleDelete = (codeId: string, codeName: string) => {
    const doDelete = async () => {
      try {
        const token = await getToken();
        await fetch(`${BACKEND_URL}/api/admin/promo-codes/${codeId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        fetchCodes();
      } catch (e) {
        Alert.alert('Error', 'Could not delete code');
      }
    };
    if (Platform.OS === 'web') {
      if (confirm(`Delete code "${codeName}"?`)) doDelete();
    } else {
      Alert.alert('Delete code', `Delete "${codeName}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const openEmailModal = (codeId: string) => {
    setEmailCodeIds([codeId]);
    setEmailRecipients('');
    setEmailSubject('');
    setEmailMessage('');
    setEmailResult(null);
    setShowEmailModal(true);
  };

  const handleSendEmails = async () => {
    const emailList = emailRecipients.split(/[\n,;]+/).map(e => e.trim()).filter(e => e.includes('@'));
    if (emailList.length === 0) {
      Alert.alert('Error', 'Add at least one valid email address');
      return;
    }
    setEmailSending(true);
    setEmailResult(null);
    try {
      const token = await getToken();
      const body: any = {
        code_ids: emailCodeIds,
        emails: emailList,
      };
      if (emailSubject.trim()) body.subject = emailSubject.trim();
      if (emailMessage.trim()) body.personal_message = emailMessage.trim();
      const res = await fetch(`${BACKEND_URL}/api/admin/promo-codes/send-email`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        setEmailResult({ sent: data.sent, failed: data.failed });
      } else {
        const err = await res.json();
        Alert.alert('Error', err.detail || 'Could not send email');
      }
    } catch {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setEmailSending(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Ionicons name="ticket-outline" size={22} color="#f59e0b" />
            <Text style={styles.headerTitle}>Promo Codes</Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowCreate(!showCreate)}
            style={styles.headerAdd}
            data-testid="create-promo-btn"
          >
            <Ionicons name={showCreate ? 'close' : 'add'} size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Tab Bar */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'codes' && styles.tabActive]}
          onPress={() => setActiveTab('codes')}
          data-testid="tab-codes"
        >
          <Ionicons name="ticket-outline" size={16} color={activeTab === 'codes' ? '#f59e0b' : colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'codes' && styles.tabTextActive]}>Codes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => { setActiveTab('history'); fetchEmailHistory(); }}
          data-testid="tab-history"
        >
          <Ionicons name="time-outline" size={16} color={activeTab === 'history' ? '#f59e0b' : colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>Dispatch History</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'template' && styles.tabActive]}
          onPress={() => { setActiveTab('template'); fetchTemplate(); }}
          data-testid="tab-template"
        >
          <Ionicons name="mail-outline" size={16} color={activeTab === 'template' ? '#f59e0b' : colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'template' && styles.tabTextActive]}>Email Template</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'codes' ? (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCodes(); }} />}
      >
        {/* Create Form */}
        {showCreate && (
          <View style={[styles.createForm, { backgroundColor: colors.surface }]} data-testid="create-promo-form">
            <Text style={[styles.formTitle, { color: colors.text }]}>Create new promo code</Text>

            <Text style={[styles.label, { color: colors.textSecondary }]}>Code</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={newCode}
              onChangeText={setNewCode}
              placeholder="e.g. WANDERMARK-VIP-2026"
              placeholderTextColor={colors.textLight}
              autoCapitalize="characters"
              data-testid="promo-code-input"
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Description</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={newDescription}
              onChangeText={setNewDescription}
              placeholder="e.g. For travel blogger @username"
              placeholderTextColor={colors.textLight}
              data-testid="promo-desc-input"
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Type</Text>
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[styles.typeBtn, newType === 'lifetime_premium' && styles.typeBtnActive]}
                onPress={() => setNewType('lifetime_premium')}
                data-testid="type-lifetime-btn"
              >
                <Ionicons name="infinite" size={16} color={newType === 'lifetime_premium' ? '#fff' : colors.text} />
                <Text style={[styles.typeBtnText, newType === 'lifetime_premium' && styles.typeBtnTextActive]}>
                  Lifetime Premium
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, newType === 'timed_premium' && styles.typeBtnActive]}
                onPress={() => setNewType('timed_premium')}
                data-testid="type-timed-btn"
              >
                <Ionicons name="time" size={16} color={newType === 'timed_premium' ? '#fff' : colors.text} />
                <Text style={[styles.typeBtnText, newType === 'timed_premium' && styles.typeBtnTextActive]}>
                  Time-limited
                </Text>
              </TouchableOpacity>
            </View>

            {newType === 'timed_premium' && (
              <>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Duration (days)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={newDuration}
                  onChangeText={setNewDuration}
                  placeholder="e.g. 30, 90, 365"
                  placeholderTextColor={colors.textLight}
                  keyboardType="numeric"
                  data-testid="promo-duration-input"
                />
              </>
            )}

            <Text style={[styles.label, { color: colors.textSecondary }]}>Max uses</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={newMaxUses}
              onChangeText={setNewMaxUses}
              placeholder="1 = single use, 0 = unlimited"
              placeholderTextColor={colors.textLight}
              keyboardType="numeric"
              data-testid="promo-maxuses-input"
            />

            <TouchableOpacity
              style={[styles.createBtn, creating && styles.createBtnDisabled]}
              onPress={handleCreate}
              disabled={creating}
              data-testid="submit-promo-btn"
            >
              <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.createBtnGradient}>
                {creating ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="add-circle" size={20} color="#fff" />
                    <Text style={styles.createBtnText}>Create code</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Action Buttons: Batch Create & Export CSV */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={[styles.batchBtn, { backgroundColor: colors.surface }]}
            onPress={() => { setShowBatch(!showBatch); setShowCreate(false); }}
            data-testid="batch-create-btn"
          >
            <Ionicons name="layers-outline" size={18} color="#8b5cf6" />
            <Text style={[styles.batchBtnText, { color: colors.text }]}>Batch create</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.batchBtn, { backgroundColor: colors.surface }]}
            onPress={handleExportCSV}
            data-testid="export-csv-btn"
          >
            <Ionicons name="download-outline" size={18} color="#10b981" />
            <Text style={[styles.batchBtnText, { color: colors.text }]}>Export CSV</Text>
          </TouchableOpacity>
        </View>

        {/* Batch Create Form */}
        {showBatch && (
          <View style={[styles.createForm, { backgroundColor: colors.surface }]} data-testid="batch-create-form">
            <Text style={[styles.formTitle, { color: colors.text }]}>Batch create promo codes</Text>
            <Text style={[styles.formSubtitle, { color: colors.textSecondary }]}>
              Generate multiple unique codes with a prefix. Format: PREFIX-001, PREFIX-002, etc.
            </Text>

            <Text style={[styles.label, { color: colors.textSecondary }]}>Prefix</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={batchPrefix}
              onChangeText={setBatchPrefix}
              placeholder="e.g. INFLUENCER, BLOGGER"
              placeholderTextColor={colors.textLight}
              autoCapitalize="characters"
              data-testid="batch-prefix-input"
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Number of codes</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={batchCount}
              onChangeText={setBatchCount}
              placeholder="10"
              placeholderTextColor={colors.textLight}
              keyboardType="numeric"
              data-testid="batch-count-input"
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Description (optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={batchDesc}
              onChangeText={setBatchDesc}
              placeholder="e.g. Influencer campaign Q1 2026"
              placeholderTextColor={colors.textLight}
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Type</Text>
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[styles.typeBtn, batchType === 'lifetime_premium' && styles.typeBtnActive]}
                onPress={() => setBatchType('lifetime_premium')}
              >
                <Ionicons name="infinite" size={16} color={batchType === 'lifetime_premium' ? '#fff' : colors.text} />
                <Text style={[styles.typeBtnText, batchType === 'lifetime_premium' && styles.typeBtnTextActive]}>
                  Lifetime Premium
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, batchType === 'timed_premium' && styles.typeBtnActive]}
                onPress={() => setBatchType('timed_premium')}
              >
                <Ionicons name="time" size={16} color={batchType === 'timed_premium' ? '#fff' : colors.text} />
                <Text style={[styles.typeBtnText, batchType === 'timed_premium' && styles.typeBtnTextActive]}>
                  Time-limited
                </Text>
              </TouchableOpacity>
            </View>

            {batchType === 'timed_premium' && (
              <>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Duration (days)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={batchDuration}
                  onChangeText={setBatchDuration}
                  placeholder="30"
                  placeholderTextColor={colors.textLight}
                  keyboardType="numeric"
                />
              </>
            )}

            <Text style={[styles.label, { color: colors.textSecondary }]}>Max uses per code</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={batchMaxUses}
              onChangeText={setBatchMaxUses}
              placeholder="1"
              placeholderTextColor={colors.textLight}
              keyboardType="numeric"
            />

            <TouchableOpacity
              style={[styles.createBtn, batchCreating && styles.createBtnDisabled]}
              onPress={handleBatchCreate}
              disabled={batchCreating}
              data-testid="submit-batch-btn"
            >
              <LinearGradient colors={['#8b5cf6', '#7c3aed']} style={styles.createBtnGradient}>
                {batchCreating ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="layers" size={20} color="#fff" />
                    <Text style={styles.createBtnText}>Generate {batchCount || '0'} codes</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {batchResult && (
              <View style={styles.batchResultBox}>
                <View style={styles.batchResultHeader}>
                  <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                  <Text style={styles.batchResultTitle}>{batchResult.created} codes created!</Text>
                </View>
                <ScrollView style={styles.batchResultScroll} nestedScrollEnabled>
                  {batchResult.codes.map((code, i) => (
                    <Text key={i} style={styles.batchResultCode}>{code}</Text>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        )}

        {/* Stats Summary */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statNum, { color: '#f59e0b' }]}>{codes.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statNum, { color: '#10b981' }]}>{codes.filter(c => c.is_active).length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statNum, { color: '#3b82f6' }]}>
              {codes.reduce((sum, c) => sum + c.current_uses, 0)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Redeemed</Text>
          </View>
        </View>

        {/* Codes List */}
        {codes.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="ticket-outline" size={48} color={colors.textLight} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No promo codes yet. Tap + to create one.
            </Text>
          </View>
        ) : (
          codes.map(code => (
            <View key={code.code_id} style={[styles.codeCard, { backgroundColor: colors.surface }]} data-testid={`promo-card-${code.code_id}`}>
              <View style={styles.codeCardHeader}>
                <View style={styles.codeCardLeft}>
                  <View style={styles.codeNameRow}>
                    <View style={[styles.codeBadge, code.is_active ? styles.codeBadgeActive : styles.codeBadgeInactive]}>
                      <Text style={styles.codeBadgeText}>{code.code}</Text>
                    </View>
                    {code.type === 'lifetime_premium' ? (
                      <View style={styles.typeTag}>
                        <Ionicons name="infinite" size={12} color="#f59e0b" />
                        <Text style={styles.typeTagText}>Lifetime</Text>
                      </View>
                    ) : (
                      <View style={[styles.typeTag, { backgroundColor: '#3b82f620' }]}>
                        <Ionicons name="time" size={12} color="#3b82f6" />
                        <Text style={[styles.typeTagText, { color: '#3b82f6' }]}>{code.duration_days}d</Text>
                      </View>
                    )}
                  </View>
                  {code.description && (
                    <Text style={[styles.codeDesc, { color: colors.textSecondary }]}>{code.description}</Text>
                  )}
                  <Text style={[styles.codeStats, { color: colors.textLight }]}>
                    Used {code.current_uses}/{code.max_uses === 0 ? '\u221E' : code.max_uses}
                    {' \u00B7 '}Created {new Date(code.created_at).toLocaleDateString('en-US')}
                  </Text>
                </View>

                <View style={styles.codeCardRight}>
                  <Switch
                    value={code.is_active}
                    onValueChange={() => toggleActive(code.code_id, code.is_active)}
                    color="#10b981"
                  />
                </View>
              </View>

              {/* Actions row */}
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => setExpandedCode(expandedCode === code.code_id ? null : code.code_id)}
                >
                  <Ionicons name="people-outline" size={16} color="#3b82f6" />
                  <Text style={[styles.actionBtnText, { color: '#3b82f6' }]}>
                    Redemptions ({code.redemptions?.length || 0})
                  </Text>
                  <Ionicons
                    name={expandedCode === code.code_id ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color="#3b82f6"
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => handleDelete(code.code_id, code.code)}
                  data-testid={`delete-promo-${code.code_id}`}
                >
                  <Ionicons name="trash-outline" size={16} color="#ef4444" />
                  <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Delete</Text>
                </TouchableOpacity>
                {code.is_active && (
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => openEmailModal(code.code_id)}
                    data-testid={`send-email-${code.code_id}`}
                  >
                    <Ionicons name="mail-outline" size={16} color="#f59e0b" />
                    <Text style={[styles.actionBtnText, { color: '#f59e0b' }]}>Send email</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Redemptions list */}
              {expandedCode === code.code_id && code.redemptions && code.redemptions.length > 0 && (
                <View style={[styles.redemptionsList, { borderTopColor: colors.border }]}>
                  {code.redemptions.map(r => (
                    <View key={r.redemption_id} style={styles.redemptionItem}>
                      <View style={styles.redemptionLeft}>
                        <Text style={[styles.redemptionName, { color: colors.text }]}>{r.user_name}</Text>
                        <Text style={[styles.redemptionEmail, { color: colors.textSecondary }]}>{r.user_email}</Text>
                      </View>
                      <Text style={[styles.redemptionDate, { color: colors.textLight }]}>
                        {new Date(r.redeemed_at).toLocaleDateString('en-US')}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
              {expandedCode === code.code_id && (!code.redemptions || code.redemptions.length === 0) && (
                <View style={[styles.redemptionsList, { borderTopColor: colors.border }]}>
                  <Text style={[styles.noRedemptions, { color: colors.textLight }]}>No one has redeemed this code yet</Text>
                </View>
              )}
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
      ) : activeTab === 'history' ? (
      /* History Tab */
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={historyLoading} onRefresh={fetchEmailHistory} />}
      >
        {historyLoading && emailHistory.length === 0 ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : emailHistory.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="mail-outline" size={48} color={colors.textLight} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No emails sent yet
            </Text>
          </View>
        ) : (
          emailHistory.map(log => (
            <TouchableOpacity
              key={log.log_id}
              style={[styles.historyCard, { backgroundColor: colors.surface }]}
              onPress={() => setExpandedLog(expandedLog === log.log_id ? null : log.log_id)}
              activeOpacity={0.7}
              data-testid={`history-card-${log.log_id}`}
            >
              <View style={styles.historyCardHeader}>
                <View style={styles.historyCardLeft}>
                  <View style={styles.historyStatusRow}>
                    <View style={[styles.historyStatusDot, log.failed > 0 ? styles.historyStatusMixed : styles.historyStatusSuccess]} />
                    <Text style={[styles.historyDate, { color: colors.text }]}>
                      {new Date(log.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <Text style={[styles.historySubject, { color: colors.textSecondary }]} numberOfLines={1}>
                    {log.subject || 'Default subject'}
                  </Text>
                  <View style={styles.historyStatsRow}>
                    <View style={styles.historyStatChip}>
                      <Ionicons name="checkmark-circle" size={13} color="#10b981" />
                      <Text style={styles.historyStatSent}>{log.sent} sent</Text>
                    </View>
                    {log.failed > 0 && (
                      <View style={styles.historyStatChip}>
                        <Ionicons name="close-circle" size={13} color="#ef4444" />
                        <Text style={styles.historyStatFailed}>{log.failed} failed</Text>
                      </View>
                    )}
                    <View style={styles.historyStatChip}>
                      <Ionicons name="ticket-outline" size={13} color="#8b5cf6" />
                      <Text style={[styles.historyStatCode, { color: '#8b5cf6' }]}>
                        {log.code_names?.join(', ') || '?'}
                      </Text>
                    </View>
                  </View>
                </View>
                <Ionicons
                  name={expandedLog === log.log_id ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.textLight}
                />
              </View>

              {expandedLog === log.log_id && (
                <View style={[styles.historyDetails, { borderTopColor: colors.border }]}>
                  {log.sender_name && (
                    <View style={styles.historyDetailRow}>
                      <Text style={[styles.historyDetailLabel, { color: colors.textLight }]}>Sent by</Text>
                      <Text style={[styles.historyDetailValue, { color: colors.text }]}>{log.sender_name}</Text>
                    </View>
                  )}
                  {log.personal_message ? (
                    <View style={styles.historyDetailRow}>
                      <Text style={[styles.historyDetailLabel, { color: colors.textLight }]}>Message</Text>
                      <Text style={[styles.historyDetailValue, { color: colors.text }]} numberOfLines={2}>{log.personal_message}</Text>
                    </View>
                  ) : null}
                  <Text style={[styles.historyDetailLabel, { color: colors.textLight, marginTop: 10 }]}>Recipients</Text>
                  {log.results?.map((r: any, i: number) => (
                    <View key={i} style={styles.historyRecipient}>
                      <Ionicons
                        name={r.status === 'sent' ? 'checkmark-circle' : 'close-circle'}
                        size={14}
                        color={r.status === 'sent' ? '#10b981' : '#ef4444'}
                      />
                      <Text style={[styles.historyRecipientEmail, { color: colors.text }]}>{r.email}</Text>
                      <Text style={[styles.historyRecipientCode, { color: colors.textLight }]}>{r.code}</Text>
                    </View>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
      )}

      {/* Template Tab */}
      {activeTab === 'template' && (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {templateLoading && !template ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : template ? (
          <View style={styles.templateWrap}>
            <View style={[styles.formCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.formTitle, { color: colors.text }]}>Email Template</Text>
              <Text style={[styles.formSubtitle, { color: colors.textSecondary }]}>
                Customize the email sent with promo codes. Use {'{{access_desc}}'} in the body text as a placeholder for the access description.
              </Text>

              <Text style={[styles.label, { color: colors.textSecondary }]}>Subject</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={template.subject}
                onChangeText={(v) => updateTemplateField('subject', v)}
                placeholder="Email subject line"
                placeholderTextColor={colors.textLight}
                data-testid="template-subject-input"
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Heading</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={template.heading}
                onChangeText={(v) => updateTemplateField('heading', v)}
                placeholder="e.g. You're invited!"
                placeholderTextColor={colors.textLight}
                data-testid="template-heading-input"
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Subheading</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={template.subheading}
                onChangeText={(v) => updateTemplateField('subheading', v)}
                placeholder="e.g. Explore the world. Collect memories."
                placeholderTextColor={colors.textLight}
                data-testid="template-subheading-input"
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Body text</Text>
              <Text style={[styles.formHint, { color: colors.textLight }]}>Use {'{{access_desc}}'} where you want the access description (e.g. "lifetime Premium access")</Text>
              <TextInput
                style={[styles.input, styles.emailTextArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={template.body_text}
                onChangeText={(v) => updateTemplateField('body_text', v)}
                placeholder="Email body text..."
                placeholderTextColor={colors.textLight}
                multiline
                numberOfLines={4}
                data-testid="template-body-input"
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Code label</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={template.code_label}
                onChangeText={(v) => updateTemplateField('code_label', v)}
                placeholder="e.g. Your promo code"
                placeholderTextColor={colors.textLight}
                data-testid="template-code-label-input"
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Steps title</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={template.steps_title}
                onChangeText={(v) => updateTemplateField('steps_title', v)}
                placeholder="e.g. How to use your code:"
                placeholderTextColor={colors.textLight}
                data-testid="template-steps-title-input"
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Steps</Text>
              {template.steps.map((step, i) => (
                <View key={i} style={styles.templateStepRow}>
                  <Text style={[styles.templateStepNum, { color: colors.textLight }]}>{i + 1}.</Text>
                  <TextInput
                    style={[styles.input, styles.templateStepInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    value={step}
                    onChangeText={(v) => updateTemplateStep(i, v)}
                    placeholder={`Step ${i + 1}`}
                    placeholderTextColor={colors.textLight}
                    data-testid={`template-step-${i}-input`}
                  />
                  {template.steps.length > 1 && (
                    <TouchableOpacity onPress={() => removeTemplateStep(i)} style={styles.templateStepRemove}>
                      <Ionicons name="close-circle" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              <TouchableOpacity onPress={addTemplateStep} style={styles.templateAddStep} data-testid="template-add-step-btn">
                <Ionicons name="add-circle-outline" size={18} color="#f59e0b" />
                <Text style={[styles.templateAddStepText, { color: '#f59e0b' }]}>Add step</Text>
              </TouchableOpacity>

              <Text style={[styles.label, { color: colors.textSecondary }]}>Footer text</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={template.footer_text}
                onChangeText={(v) => updateTemplateField('footer_text', v)}
                placeholder="Footer text"
                placeholderTextColor={colors.textLight}
                data-testid="template-footer-input"
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Support text (HTML allowed)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={template.support_text}
                onChangeText={(v) => updateTemplateField('support_text', v)}
                placeholder="Contact support text"
                placeholderTextColor={colors.textLight}
                data-testid="template-support-input"
              />

              <TouchableOpacity
                style={[styles.createBtn, !templateDirty && styles.createBtnDisabled]}
                onPress={saveTemplate}
                disabled={!templateDirty || templateSaving}
                data-testid="save-template-btn"
              >
                <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.createBtnGradient}>
                  {templateSaving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="save-outline" size={18} color="#fff" />
                      <Text style={styles.createBtnText}>Save template</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.previewBtn}
                onPress={() => setShowPreview(true)}
                data-testid="preview-template-btn"
              >
                <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.createBtnGradient}>
                  <Ionicons name="eye-outline" size={18} color="#fff" />
                  <Text style={styles.createBtnText}>Preview email</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
        <View style={{ height: 40 }} />
      </ScrollView>
      )}

      {/* Email Preview Modal */}
      <Modal visible={showPreview} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.previewModalContent, { backgroundColor: colors.surface }]} data-testid="preview-modal">
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Ionicons name="eye" size={22} color="#3b82f6" />
                <Text style={[styles.modalTitle, { color: colors.text }]}>Email Preview</Text>
              </View>
              <TouchableOpacity onPress={() => setShowPreview(false)} data-testid="close-preview-modal">
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.previewSubjectBar}>
              <Ionicons name="mail-outline" size={14} color={colors.textLight} />
              <Text style={[styles.previewSubjectText, { color: colors.textSecondary }]} numberOfLines={1}>
                Subject: {template?.subject || ''}
              </Text>
            </View>
            {Platform.OS === 'web' ? (
              <iframe
                srcDoc={buildPreviewHtml()}
                style={{ flex: 1, border: 'none', width: '100%', minHeight: 500 } as any}
                title="Email Preview"
              />
            ) : (
              <WebView
                originWhitelist={['*']}
                source={{ html: buildPreviewHtml() }}
                style={styles.previewWebView}
                scrollEnabled={true}
                scalesPageToFit={true}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Email Send Modal */}
      <Modal visible={showEmailModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]} data-testid="email-modal">
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Ionicons name="mail" size={22} color="#f59e0b" />
                <Text style={[styles.modalTitle, { color: colors.text }]}>Send promo code</Text>
              </View>
              <TouchableOpacity onPress={() => setShowEmailModal(false)} data-testid="close-email-modal">
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Email addresses (one per line, or comma separated)</Text>
              <TextInput
                style={[styles.input, styles.emailTextArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={emailRecipients}
                onChangeText={setEmailRecipients}
                placeholder={"blogger@example.com\ninfluencer@example.com"}
                placeholderTextColor={colors.textLight}
                multiline
                numberOfLines={4}
                data-testid="email-recipients-input"
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Subject (optional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={emailSubject}
                onChangeText={setEmailSubject}
                placeholder="You've received exclusive WanderMark Premium access!"
                placeholderTextColor={colors.textLight}
                data-testid="email-subject-input"
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Personal message (optional)</Text>
              <TextInput
                style={[styles.input, styles.emailTextArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={emailMessage}
                onChangeText={setEmailMessage}
                placeholder="Hi! We love your content and would like you to try WanderMark..."
                placeholderTextColor={colors.textLight}
                multiline
                numberOfLines={3}
                data-testid="email-message-input"
              />

              {emailResult && (
                <View style={[styles.emailResultBox, emailResult.failed > 0 ? styles.emailResultMixed : styles.emailResultSuccess]}>
                  <Ionicons
                    name={emailResult.failed > 0 ? 'alert-circle' : 'checkmark-circle'}
                    size={20}
                    color={emailResult.failed > 0 ? '#f59e0b' : '#10b981'}
                  />
                  <Text style={[styles.emailResultText, { color: emailResult.failed > 0 ? '#f59e0b' : '#10b981' }]}>
                    {emailResult.sent} sent{emailResult.failed > 0 ? `, ${emailResult.failed} failed` : ''}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.createBtn, emailSending && styles.createBtnDisabled]}
                onPress={handleSendEmails}
                disabled={emailSending}
                data-testid="submit-email-btn"
              >
                <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.createBtnGradient}>
                  {emailSending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="send" size={18} color="#fff" />
                      <Text style={styles.createBtnText}>Send email</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingBottom: 16, paddingHorizontal: 16, paddingTop: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerBack: { width: 40, height: 40, justifyContent: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerAdd: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },

  // Create form
  createForm: { borderRadius: 16, padding: 20, marginBottom: 16 },
  formTitle: { fontSize: 17, fontWeight: '700', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15,
  },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 10,
    backgroundColor: '#f0f0f0',
  },
  typeBtnActive: { backgroundColor: '#f59e0b' },
  typeBtnText: { fontSize: 14, fontWeight: '600' },
  typeBtnTextActive: { color: '#fff' },
  createBtn: { marginTop: 20, borderRadius: 12, overflow: 'hidden' },
  createBtnDisabled: { opacity: 0.6 },
  createBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14,
  },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statBox: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 12, marginTop: 2 },

  // Code cards
  codeCard: { borderRadius: 14, padding: 16, marginBottom: 12 },
  codeCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  codeCardLeft: { flex: 1, marginRight: 12 },
  codeCardRight: { alignItems: 'center' },
  codeNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  codeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  codeBadgeActive: { backgroundColor: '#10b98120' },
  codeBadgeInactive: { backgroundColor: '#ef444420' },
  codeBadgeText: { fontSize: 14, fontWeight: '800', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', letterSpacing: 0.5 },
  typeTag: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#f59e0b20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  typeTagText: { fontSize: 11, fontWeight: '600', color: '#f59e0b' },
  codeDesc: { fontSize: 13, marginTop: 6 },
  codeStats: { fontSize: 12, marginTop: 4 },

  // Actions
  actionsRow: { flexDirection: 'row', gap: 16, marginTop: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e5e7eb' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionBtnText: { fontSize: 13, fontWeight: '600' },

  // Redemptions
  redemptionsList: { marginTop: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  redemptionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  redemptionLeft: {},
  redemptionName: { fontSize: 14, fontWeight: '600' },
  redemptionEmail: { fontSize: 12 },
  redemptionDate: { fontSize: 12 },
  noRedemptions: { fontSize: 13, textAlign: 'center', paddingVertical: 10 },

  // Empty
  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, textAlign: 'center', maxWidth: 280 },

  // Action buttons row
  actionButtonsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  batchBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: 12,
  },
  batchBtnText: { fontSize: 14, fontWeight: '600' },
  formSubtitle: { fontSize: 13, marginBottom: 8, lineHeight: 18 },

  // Batch result
  batchResultBox: {
    marginTop: 16, backgroundColor: '#10b98110', borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: '#10b98130',
  },
  batchResultHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  batchResultTitle: { fontSize: 15, fontWeight: '700', color: '#10b981' },
  batchResultScroll: { maxHeight: 150 },
  batchResultCode: {
    fontSize: 13, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#10b981', paddingVertical: 2, letterSpacing: 0.5,
  },

  // Email modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20,
  },
  modalContent: {
    borderRadius: 20, maxHeight: '85%', overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb',
  },
  modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalScroll: { padding: 20 },
  emailTextArea: { minHeight: 80, textAlignVertical: 'top', paddingTop: 12 },
  emailResultBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 12, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10,
  },
  emailResultSuccess: { backgroundColor: '#10b98115' },
  emailResultMixed: { backgroundColor: '#f59e0b15' },
  emailResultText: { fontSize: 14, fontWeight: '600' },

  // Tab bar
  tabBar: {
    flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#f59e0b' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#9ca3af' },
  tabTextActive: { color: '#f59e0b' },

  // History cards
  historyCard: { borderRadius: 14, padding: 16, marginBottom: 12, overflow: 'hidden' },
  historyCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  historyCardLeft: { flex: 1, marginRight: 10 },
  historyStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  historyStatusDot: { width: 8, height: 8, borderRadius: 4 },
  historyStatusSuccess: { backgroundColor: '#10b981' },
  historyStatusMixed: { backgroundColor: '#f59e0b' },
  historyDate: { fontSize: 15, fontWeight: '700' },
  historySubject: { fontSize: 13, marginTop: 4 },
  historyStatsRow: { flexDirection: 'row', gap: 10, marginTop: 8, flexWrap: 'wrap' },
  historyStatChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  historyStatSent: { fontSize: 12, fontWeight: '600', color: '#10b981' },
  historyStatFailed: { fontSize: 12, fontWeight: '600', color: '#ef4444' },
  historyStatCode: { fontSize: 12, fontWeight: '600' },
  historyDetails: { marginTop: 14, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth },
  historyDetailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  historyDetailLabel: { fontSize: 12, fontWeight: '600' },
  historyDetailValue: { fontSize: 13, flex: 1, textAlign: 'right' },
  historyRecipient: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6,
  },
  historyRecipientEmail: { fontSize: 13, flex: 1 },
  historyRecipientCode: {
    fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // Template
  templateWrap: {},
  formCard: { borderRadius: 16, padding: 20, marginBottom: 16 },
  formHint: { fontSize: 12, marginBottom: 6, fontStyle: 'italic' },
  templateStepRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  templateStepNum: { fontSize: 14, fontWeight: '700', width: 20 },
  templateStepInput: { flex: 1, marginTop: 0 },
  templateStepRemove: { padding: 4 },
  templateAddStep: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  templateAddStepText: { fontSize: 14, fontWeight: '600' },
  createBtnContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  previewBtn: { marginTop: 10, borderRadius: 12, overflow: 'hidden' },

  // Preview modal
  previewModalContent: {
    borderRadius: 20, flex: 1, marginVertical: 40, overflow: 'hidden',
  },
  previewSubjectBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb',
  },
  previewSubjectText: { fontSize: 13, flex: 1 },
  previewWebView: { flex: 1 },
});
