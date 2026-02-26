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

  const handleCreate = async () => {
    if (!newCode.trim()) {
      Alert.alert('Feil', 'Kode er paakrevd');
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
        Alert.alert('Opprettet', 'Kampanjekode opprettet');
      } else {
        const err = await res.json();
        Alert.alert('Feil', err.detail || 'Kunne ikke opprette kode');
      }
    } catch (e) {
      Alert.alert('Feil', 'Noe gikk galt');
    } finally {
      setCreating(false);
    }
  };

  const handleBatchCreate = async () => {
    if (!batchPrefix.trim()) {
      Alert.alert('Feil', 'Prefiks er paakrevd');
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
        Alert.alert('Feil', err.detail || 'Kunne ikke opprette koder');
      }
    } catch (e) {
      Alert.alert('Feil', 'Noe gikk galt');
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
          Alert.alert('Eksport', `CSV med ${codes.length} koder er klar`);
        }
      }
    } catch (e) {
      Alert.alert('Feil', 'Kunne ikke eksportere');
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
        Alert.alert('Feil', 'Kunne ikke slette kode');
      }
    };
    if (Platform.OS === 'web') {
      if (confirm(`Slett koden "${codeName}"?`)) doDelete();
    } else {
      Alert.alert('Slett kode', `Slett "${codeName}"?`, [
        { text: 'Avbryt', style: 'cancel' },
        { text: 'Slett', style: 'destructive', onPress: doDelete },
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
      Alert.alert('Feil', 'Legg til minst en gyldig e-postadresse');
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
        Alert.alert('Feil', err.detail || 'Kunne ikke sende e-post');
      }
    } catch {
      Alert.alert('Feil', 'Noe gikk galt');
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
            <Text style={styles.headerTitle}>Kampanjekoder</Text>
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

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCodes(); }} />}
      >
        {/* Create Form */}
        {showCreate && (
          <View style={[styles.createForm, { backgroundColor: colors.surface }]} data-testid="create-promo-form">
            <Text style={[styles.formTitle, { color: colors.text }]}>Opprett ny kampanjekode</Text>

            <Text style={[styles.label, { color: colors.textSecondary }]}>Kode</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={newCode}
              onChangeText={setNewCode}
              placeholder="F.eks. WANDERMARK-VIP-2026"
              placeholderTextColor={colors.textLight}
              autoCapitalize="characters"
              data-testid="promo-code-input"
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Beskrivelse</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={newDescription}
              onChangeText={setNewDescription}
              placeholder="F.eks. For reiseblogger @username"
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
                  Evig Premium
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, newType === 'timed_premium' && styles.typeBtnActive]}
                onPress={() => setNewType('timed_premium')}
                data-testid="type-timed-btn"
              >
                <Ionicons name="time" size={16} color={newType === 'timed_premium' ? '#fff' : colors.text} />
                <Text style={[styles.typeBtnText, newType === 'timed_premium' && styles.typeBtnTextActive]}>
                  Tidsbegrenset
                </Text>
              </TouchableOpacity>
            </View>

            {newType === 'timed_premium' && (
              <>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Varighet (dager)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={newDuration}
                  onChangeText={setNewDuration}
                  placeholder="F.eks. 30, 90, 365"
                  placeholderTextColor={colors.textLight}
                  keyboardType="numeric"
                  data-testid="promo-duration-input"
                />
              </>
            )}

            <Text style={[styles.label, { color: colors.textSecondary }]}>Maks antall bruk</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={newMaxUses}
              onChangeText={setNewMaxUses}
              placeholder="1 = engangskode, 0 = ubegrenset"
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
                    <Text style={styles.createBtnText}>Opprett kode</Text>
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
            <Text style={[styles.batchBtnText, { color: colors.text }]}>Batch-opprett</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.batchBtn, { backgroundColor: colors.surface }]}
            onPress={handleExportCSV}
            data-testid="export-csv-btn"
          >
            <Ionicons name="download-outline" size={18} color="#10b981" />
            <Text style={[styles.batchBtnText, { color: colors.text }]}>Eksporter CSV</Text>
          </TouchableOpacity>
        </View>

        {/* Batch Create Form */}
        {showBatch && (
          <View style={[styles.createForm, { backgroundColor: colors.surface }]} data-testid="batch-create-form">
            <Text style={[styles.formTitle, { color: colors.text }]}>Batch-opprett kampanjekoder</Text>
            <Text style={[styles.formSubtitle, { color: colors.textSecondary }]}>
              Generer flere unike koder med prefiks. Format: PREFIKS-001, PREFIKS-002, osv.
            </Text>

            <Text style={[styles.label, { color: colors.textSecondary }]}>Prefiks</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={batchPrefix}
              onChangeText={setBatchPrefix}
              placeholder="F.eks. INFLUENCER, BLOGGER"
              placeholderTextColor={colors.textLight}
              autoCapitalize="characters"
              data-testid="batch-prefix-input"
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Antall koder</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={batchCount}
              onChangeText={setBatchCount}
              placeholder="10"
              placeholderTextColor={colors.textLight}
              keyboardType="numeric"
              data-testid="batch-count-input"
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Beskrivelse (valgfritt)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={batchDesc}
              onChangeText={setBatchDesc}
              placeholder="F.eks. Influencer-kampanje Q1 2026"
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
                  Evig Premium
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, batchType === 'timed_premium' && styles.typeBtnActive]}
                onPress={() => setBatchType('timed_premium')}
              >
                <Ionicons name="time" size={16} color={batchType === 'timed_premium' ? '#fff' : colors.text} />
                <Text style={[styles.typeBtnText, batchType === 'timed_premium' && styles.typeBtnTextActive]}>
                  Tidsbegrenset
                </Text>
              </TouchableOpacity>
            </View>

            {batchType === 'timed_premium' && (
              <>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Varighet (dager)</Text>
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

            <Text style={[styles.label, { color: colors.textSecondary }]}>Maks bruk per kode</Text>
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
                    <Text style={styles.createBtnText}>Generer {batchCount || '0'} koder</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {batchResult && (
              <View style={styles.batchResultBox}>
                <View style={styles.batchResultHeader}>
                  <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                  <Text style={styles.batchResultTitle}>{batchResult.created} koder opprettet!</Text>
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
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Totalt</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statNum, { color: '#10b981' }]}>{codes.filter(c => c.is_active).length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Aktive</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statNum, { color: '#3b82f6' }]}>
              {codes.reduce((sum, c) => sum + c.current_uses, 0)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Innlost</Text>
          </View>
        </View>

        {/* Codes List */}
        {codes.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="ticket-outline" size={48} color={colors.textLight} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Ingen kampanjekoder enna. Trykk + for aa opprette en.
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
                        <Text style={styles.typeTagText}>Evig</Text>
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
                    Brukt {code.current_uses}/{code.max_uses === 0 ? '\u221E' : code.max_uses}
                    {' \u00B7 '}Opprettet {new Date(code.created_at).toLocaleDateString('nb-NO')}
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
                    Innlosninger ({code.redemptions?.length || 0})
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
                  <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Slett</Text>
                </TouchableOpacity>
                {code.is_active && (
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => openEmailModal(code.code_id)}
                    data-testid={`send-email-${code.code_id}`}
                  >
                    <Ionicons name="mail-outline" size={16} color="#f59e0b" />
                    <Text style={[styles.actionBtnText, { color: '#f59e0b' }]}>Send e-post</Text>
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
                        {new Date(r.redeemed_at).toLocaleDateString('nb-NO')}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
              {expandedCode === code.code_id && (!code.redemptions || code.redemptions.length === 0) && (
                <View style={[styles.redemptionsList, { borderTopColor: colors.border }]}>
                  <Text style={[styles.noRedemptions, { color: colors.textLight }]}>Ingen har innlost denne koden enna</Text>
                </View>
              )}
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Email Send Modal */}
      <Modal visible={showEmailModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]} data-testid="email-modal">
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Ionicons name="mail" size={22} color="#f59e0b" />
                <Text style={[styles.modalTitle, { color: colors.text }]}>Send kampanjekode</Text>
              </View>
              <TouchableOpacity onPress={() => setShowEmailModal(false)} data-testid="close-email-modal">
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>E-postadresser (en per linje, eller kommaseparert)</Text>
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

              <Text style={[styles.label, { color: colors.textSecondary }]}>Emne (valgfritt)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={emailSubject}
                onChangeText={setEmailSubject}
                placeholder="Du har faatt en eksklusiv WanderMark Premium-tilgang!"
                placeholderTextColor={colors.textLight}
                data-testid="email-subject-input"
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Personlig melding (valgfritt)</Text>
              <TextInput
                style={[styles.input, styles.emailTextArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={emailMessage}
                onChangeText={setEmailMessage}
                placeholder="Hei! Vi elsker innholdet ditt og vil gjerne at du tester WanderMark..."
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
                    {emailResult.sent} sendt{emailResult.failed > 0 ? `, ${emailResult.failed} feilet` : ''}
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
                      <Text style={styles.createBtnText}>Send e-post</Text>
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
});
