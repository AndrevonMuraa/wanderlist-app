/**
 * Your Year on WanderMark — Spotify Wrapped-style yearly recap.
 *
 * Multi-slide stories experience, auto-advancing, tap left/right to navigate.
 * Final slide is a shareable card (rendered with view-shot).
 *
 * Backend endpoint: GET /api/me/year-in-travel?year=YYYY
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { captureRef } from 'react-native-view-shot';
import { BACKEND_URL } from '../utils/config';
import { getToken } from '../utils/token';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const SLIDE_DURATION = 5500; // ms

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface YearStats {
  year: number;
  user_name: string;
  memories_added: number;
  photos_uploaded: number;
  countries_count: number;
  new_countries: string[];
  top_continent: { name: string; count: number } | null;
  busiest_month: { month: number; count: number } | null;
  oldest_memory: {
    visit_id?: string;
    landmark_name?: string;
    country?: string;
    visited_at?: string;
    years_ago?: number;
  } | null;
  top_landmarks: Array<{
    visit_id?: string;
    landmark_name?: string;
    country?: string;
    photo_count: number;
    cover_photo: string | null;
  }>;
  hero_photo: string | null;
  trips_actually_taken: number;
  show_taken_section: boolean;
}

type SlideKey =
  | 'intro'
  | 'memories'
  | 'countries'
  | 'continent'
  | 'month'
  | 'timeTravel'
  | 'topLandmarks'
  | 'finale';

const CURRENT_YEAR = new Date().getFullYear();
const DEFAULT_YEAR = CURRENT_YEAR - 1; // last completed year, like Spotify Wrapped

export default function YearInTravelScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ year?: string }>();
  const initialYear = params.year ? parseInt(params.year, 10) : DEFAULT_YEAR;
  const [year, setYear] = useState<number>(Number.isNaN(initialYear) ? DEFAULT_YEAR : initialYear);
  const [data, setData] = useState<YearStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [paused, setPaused] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);

  const fetchData = useCallback(async (y: number) => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/me/year-in-travel?year=${y}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as YearStats;
      setData(json);
    } catch (e: any) {
      setError(e?.message || 'Failed to load your recap');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(year);
  }, [year, fetchData]);

  // Build slide list dynamically based on data availability.
  const slides = useMemo<SlideKey[]>(() => {
    if (!data) return [];
    const list: SlideKey[] = ['intro', 'memories'];
    if (data.countries_count > 0) list.push('countries');
    if (data.top_continent) list.push('continent');
    if (data.busiest_month) list.push('month');
    if (data.oldest_memory) list.push('timeTravel');
    if (data.top_landmarks.length > 0) list.push('topLandmarks');
    list.push('finale');
    return list;
  }, [data]);

  const goNext = useCallback(() => {
    setSlideIndex((idx) => Math.min(idx + 1, Math.max(0, slides.length - 1)));
    if (Platform.OS !== 'web') Haptics.selectionAsync();
  }, [slides.length]);

  const goPrev = useCallback(() => {
    setSlideIndex((idx) => Math.max(0, idx - 1));
    if (Platform.OS !== 'web') Haptics.selectionAsync();
  }, []);

  const isEmpty = data && data.memories_added === 0;

  if (loading) {
    return (
      <LinearGradient colors={['#0a0418', '#1a0b2e', '#3d1f5c']} style={styles.fullScreen}>
        <ActivityIndicator size="large" color="#FFD700" />
      </LinearGradient>
    );
  }

  if (error || !data) {
    return (
      <LinearGradient colors={['#0a0418', '#1a0b2e']} style={styles.fullScreen}>
        <Text style={styles.errorText}>{error || 'Could not load your recap.'}</Text>
        <TouchableOpacity
          style={styles.errorBtn}
          onPress={() => router.back()}
          testID="recap-error-back"
        >
          <Text style={styles.errorBtnText}>Go back</Text>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  if (isEmpty) {
    return (
      <EmptyState
        year={year}
        userName={data.user_name}
        onClose={() => router.back()}
        onPickYear={() => setShowYearPicker(true)}
        showYearPicker={showYearPicker}
        onSelectYear={(y) => {
          setShowYearPicker(false);
          setYear(y);
          setSlideIndex(0);
        }}
        onDismissPicker={() => setShowYearPicker(false)}
      />
    );
  }

  const currentSlide = slides[slideIndex];

  return (
    <View style={styles.fullScreen} testID="year-in-travel-screen">
      <SlideRenderer slide={currentSlide} data={data} />

      {/* Top bar: progress + close + year picker */}
      <View style={styles.topBar} pointerEvents="box-none">
        <View style={styles.progressRow} pointerEvents="none">
          {slides.map((_, i) => (
            <ProgressBar
              key={`${i}-${slideIndex}`}
              active={i === slideIndex}
              completed={i < slideIndex}
              paused={paused}
              duration={SLIDE_DURATION}
              onComplete={() => {
                if (i === slideIndex) {
                  if (slideIndex < slides.length - 1) {
                    setSlideIndex(slideIndex + 1);
                  }
                }
              }}
            />
          ))}
        </View>

        <View style={styles.topActions}>
          <TouchableOpacity
            onPress={() => setShowYearPicker(true)}
            style={styles.yearChip}
            testID="recap-year-picker-open"
          >
            <Ionicons name="calendar-outline" size={12} color="#fff" />
            <Text style={styles.yearChipText}>{year}</Text>
            <Ionicons name="chevron-down" size={12} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.closeBtn}
            testID="recap-close"
          >
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tap zones for navigation */}
      <View style={styles.tapZones} pointerEvents="box-none">
        <Pressable
          style={styles.tapZoneLeft}
          onPress={goPrev}
          onLongPress={() => setPaused(true)}
          onPressOut={() => setPaused(false)}
          testID="recap-tap-prev"
        />
        <Pressable
          style={styles.tapZoneRight}
          onPress={goNext}
          onLongPress={() => setPaused(true)}
          onPressOut={() => setPaused(false)}
          testID="recap-tap-next"
        />
      </View>

      <YearPicker
        visible={showYearPicker}
        currentYear={year}
        onSelect={(y) => {
          setShowYearPicker(false);
          setYear(y);
          setSlideIndex(0);
        }}
        onDismiss={() => setShowYearPicker(false)}
      />
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Progress bar                                                               */
/* -------------------------------------------------------------------------- */

const ProgressBar: React.FC<{
  active: boolean;
  completed: boolean;
  paused: boolean;
  duration: number;
  onComplete: () => void;
}> = ({ active, completed, paused, duration, onComplete }) => {
  const anim = useRef(new Animated.Value(completed ? 1 : 0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    if (completed) {
      anim.setValue(1);
      return;
    }
    if (!active) {
      anim.setValue(0);
      return;
    }
    completedRef.current = false;
    anim.setValue(0);
    animationRef.current = Animated.timing(anim, {
      toValue: 1,
      duration,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    animationRef.current.start(({ finished }) => {
      if (finished && !completedRef.current) {
        completedRef.current = true;
        onComplete();
      }
    });
    return () => {
      animationRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, completed, duration]);

  useEffect(() => {
    if (!active || completed) return;
    if (paused) {
      animationRef.current?.stop();
    } else {
      // resume from current value
      const current = (anim as any)._value ?? 0;
      const remaining = duration * (1 - current);
      if (remaining > 0) {
        animationRef.current = Animated.timing(anim, {
          toValue: 1,
          duration: remaining,
          easing: Easing.linear,
          useNativeDriver: false,
        });
        animationRef.current.start(({ finished }) => {
          if (finished && !completedRef.current) {
            completedRef.current = true;
            onComplete();
          }
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  const widthPct = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={styles.progressTrack}>
      <Animated.View style={[styles.progressFill, { width: widthPct }]} />
    </View>
  );
};

/* -------------------------------------------------------------------------- */
/* Slide router                                                                */
/* -------------------------------------------------------------------------- */

const SlideRenderer: React.FC<{ slide: SlideKey; data: YearStats }> = ({ slide, data }) => {
  switch (slide) {
    case 'intro':
      return <IntroSlide data={data} />;
    case 'memories':
      return <MemoriesSlide data={data} />;
    case 'countries':
      return <CountriesSlide data={data} />;
    case 'continent':
      return <ContinentSlide data={data} />;
    case 'month':
      return <MonthSlide data={data} />;
    case 'timeTravel':
      return <TimeTravelSlide data={data} />;
    case 'topLandmarks':
      return <TopLandmarksSlide data={data} />;
    case 'finale':
      return <FinaleSlide data={data} />;
  }
};

/* -------------------------------------------------------------------------- */
/* Reusable                                                                   */
/* -------------------------------------------------------------------------- */

const SlideShell: React.FC<{
  colors: readonly [string, string, ...string[]];
  children: React.ReactNode;
}> = ({ colors, children }) => {
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    fade.setValue(0);
    slide.setValue(20);
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: 0,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, slide]);

  return (
    <LinearGradient colors={colors} style={styles.slide}>
      <Animated.View
        style={[
          styles.slideInner,
          { opacity: fade, transform: [{ translateY: slide }] },
        ]}
      >
        {children}
      </Animated.View>
      <DecorOrbs />
    </LinearGradient>
  );
};

const DecorOrbs: React.FC = () => (
  <>
    <View style={[styles.bgOrb, styles.bgOrbA]} />
    <View style={[styles.bgOrb, styles.bgOrbB]} />
    <View style={[styles.bgOrb, styles.bgOrbC]} />
  </>
);

const EyebrowText: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text style={styles.eyebrow}>{children}</Text>
);

/* -------------------------------------------------------------------------- */
/* Slides                                                                      */
/* -------------------------------------------------------------------------- */

const IntroSlide: React.FC<{ data: YearStats }> = ({ data }) => {
  const firstName = data.user_name?.split(' ')[0] || data.user_name || 'Traveler';
  return (
    <SlideShell colors={['#0a0418', '#1a0b2e', '#3d1f5c']}>
      <Text style={styles.eyebrowSparkle}>✨ WANDERMARK · {data.year}</Text>
      <Text style={styles.introTitle}>Hey {firstName},</Text>
      <Text style={styles.introTitleAccent}>your {data.year}{'\n'}was a journey.</Text>
      <Text style={styles.introSubtitle}>
        Let's relive every memory you logged this year.
      </Text>
      <View style={styles.swipeHint}>
        <Ionicons name="hand-left-outline" size={14} color="rgba(255,255,255,0.7)" />
        <Text style={styles.swipeHintText}>Tap to continue</Text>
      </View>
    </SlideShell>
  );
};

const MemoriesSlide: React.FC<{ data: YearStats }> = ({ data }) => {
  return (
    <SlideShell colors={['#0d3b66', '#1e8a8a', '#4DB8D8']}>
      <EyebrowText>YOUR YEAR IN MEMORIES</EyebrowText>
      <Text style={styles.bigNumber}>{data.memories_added}</Text>
      <Text style={styles.bigLabel}>
        {data.memories_added === 1 ? 'memory' : 'memories'}{'\n'}added in {data.year}
      </Text>

      <View style={styles.metaRow}>
        <View style={styles.metaPill}>
          <Ionicons name="images" size={14} color="#FFD700" />
          <Text style={styles.metaPillText}>{data.photos_uploaded} photos</Text>
        </View>
        {data.show_taken_section && (
          <View style={styles.metaPill}>
            <Ionicons name="airplane" size={14} color="#FFD700" />
            <Text style={styles.metaPillText}>{data.trips_actually_taken} trips taken</Text>
          </View>
        )}
      </View>

      <Text style={styles.footnote}>
        That's {Math.max(1, Math.round(data.memories_added / 12))} memories every month.
      </Text>
    </SlideShell>
  );
};

const CountriesSlide: React.FC<{ data: YearStats }> = ({ data }) => {
  const newCount = data.new_countries.length;
  return (
    <SlideShell colors={['#1a0b2e', '#3d1f5c', '#7a3fa9']}>
      <EyebrowText>COUNTRIES ON YOUR MAP</EyebrowText>
      <Text style={styles.bigNumber}>{data.countries_count}</Text>
      <Text style={styles.bigLabel}>
        {data.countries_count === 1 ? 'country' : 'countries'}{'\n'}in {data.year}
      </Text>

      {newCount > 0 && (
        <View style={styles.newCountriesBlock}>
          <Text style={styles.newCountriesTitle}>
            {newCount} brand new {newCount === 1 ? 'country' : 'countries'}
          </Text>
          <View style={styles.chipRow}>
            {data.new_countries.slice(0, 8).map((c) => (
              <View key={c} style={styles.countryChip}>
                <Text style={styles.countryChipText}>{c}</Text>
              </View>
            ))}
            {newCount > 8 && (
              <View style={styles.countryChip}>
                <Text style={styles.countryChipText}>+{newCount - 8} more</Text>
              </View>
            )}
          </View>
        </View>
      )}
    </SlideShell>
  );
};

const ContinentSlide: React.FC<{ data: YearStats }> = ({ data }) => {
  if (!data.top_continent) return null;
  return (
    <SlideShell colors={['#143d2b', '#1e6b4a', '#3aa674']}>
      <EyebrowText>YOUR FAVORITE CONTINENT</EyebrowText>
      <Text style={styles.continentName}>{data.top_continent.name}</Text>
      <Text style={styles.bigLabel}>
        {data.top_continent.count} {data.top_continent.count === 1 ? 'memory' : 'memories'}{'\n'}lived here
      </Text>
      <View style={styles.continentBadge}>
        <Ionicons name="earth" size={28} color="#FFD700" />
      </View>
      <Text style={styles.footnote}>
        You spent more of {data.year} here than anywhere else.
      </Text>
    </SlideShell>
  );
};

const MonthSlide: React.FC<{ data: YearStats }> = ({ data }) => {
  if (!data.busiest_month) return null;
  const monthName = MONTHS[(data.busiest_month.month - 1) % 12];
  return (
    <SlideShell colors={['#5a1a3d', '#a02b5f', '#e87a9e']}>
      <EyebrowText>YOUR BUSIEST MONTH</EyebrowText>
      <Text style={styles.monthName}>{monthName}</Text>
      <Text style={styles.bigLabel}>
        {data.busiest_month.count} {data.busiest_month.count === 1 ? 'memory' : 'memories'}{'\n'}added in just one month
      </Text>
      <View style={styles.continentBadge}>
        <Ionicons name="flame" size={28} color="#FFD700" />
      </View>
    </SlideShell>
  );
};

const TimeTravelSlide: React.FC<{ data: YearStats }> = ({ data }) => {
  const m = data.oldest_memory;
  if (!m) return null;
  const yearsAgo = m.years_ago ?? 0;
  return (
    <SlideShell colors={['#2a1f0a', '#5c4422', '#c9a961']}>
      <EyebrowText>TIME TRAVELER</EyebrowText>
      <Text style={styles.timeTravelHeadline}>
        You added a memory from{'\n'}
        <Text style={styles.timeTravelYears}>{yearsAgo} years ago</Text>
      </Text>
      <View style={styles.tlCard}>
        <Ionicons name="time-outline" size={20} color="#FFD700" />
        <View style={{ flex: 1 }}>
          <Text style={styles.tlLandmark}>{m.landmark_name || 'A special place'}</Text>
          {m.country && <Text style={styles.tlCountry}>{m.country}</Text>}
        </View>
      </View>
      <Text style={styles.footnote}>
        Some memories deserve to be saved, no matter when they happened.
      </Text>
    </SlideShell>
  );
};

const TopLandmarksSlide: React.FC<{ data: YearStats }> = ({ data }) => {
  return (
    <SlideShell colors={['#0a0418', '#3d1f5c', '#0d3b66']}>
      <EyebrowText>YOUR TOP MOMENTS</EyebrowText>
      <Text style={styles.topMomentsTitle}>The places you photographed most</Text>

      <View style={styles.topLandmarksList}>
        {data.top_landmarks.map((lm, idx) => (
          <View key={lm.visit_id || idx} style={styles.tlRow}>
            <Text style={styles.tlRank}>{`0${idx + 1}`}</Text>
            {lm.cover_photo ? (
              <Image source={{ uri: lm.cover_photo }} style={styles.tlPhoto} />
            ) : (
              <View style={[styles.tlPhoto, styles.tlPhotoFallback]}>
                <Ionicons name="image" size={20} color="rgba(255,255,255,0.5)" />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.tlLandmarkLg} numberOfLines={1}>
                {lm.landmark_name || 'Unknown place'}
              </Text>
              {lm.country && (
                <Text style={styles.tlCountrySm} numberOfLines={1}>
                  {lm.country}
                </Text>
              )}
              <Text style={styles.tlPhotoCount}>{lm.photo_count} photos</Text>
            </View>
          </View>
        ))}
      </View>
    </SlideShell>
  );
};

/* -------------------------------------------------------------------------- */
/* Finale (shareable card)                                                    */
/* -------------------------------------------------------------------------- */

const FinaleSlide: React.FC<{ data: YearStats }> = ({ data }) => {
  const cardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    try {
      setSharing(true);
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      const available = await Sharing.isAvailableAsync();
      if (available) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: `My ${data.year} on WanderMark`,
        });
      }
    } catch (e) {
      // best-effort: silent on web / permission denied
    } finally {
      setSharing(false);
    }
  };

  const handleSaveToPhotos = async () => {
    try {
      setSharing(true);
      if (Platform.OS === 'web') {
        // On web: just trigger share sheet (download)
        await handleShare();
        return;
      }
      const MediaLibrary = await import('expo-media-library');
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!perm.granted) return;
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      await MediaLibrary.saveToLibraryAsync(uri);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      // silent
    } finally {
      setSharing(false);
    }
  };

  const firstName = data.user_name?.split(' ')[0] || data.user_name || 'Traveler';

  return (
    <LinearGradient colors={['#0a0418', '#1a0b2e', '#3d1f5c']} style={styles.slide}>
      <View style={styles.finaleWrap}>
        <Text style={styles.finaleEyebrow}>YOUR {data.year} RECAP</Text>
        <Text style={styles.finaleTitle}>Share your year</Text>

        {/* Capture target */}
        <View ref={cardRef} collapsable={false} style={styles.shareCardOuter}>
          <LinearGradient
            colors={['#0c1220', '#1a0b2e', '#3d1f5c', '#0d3b66']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.shareCard}
          >
            {data.hero_photo ? (
              <Image source={{ uri: data.hero_photo }} style={styles.shareHeroImg} />
            ) : (
              <View style={[styles.shareHeroImg, styles.shareHeroFallback]}>
                <Ionicons name="earth" size={48} color="rgba(255,255,255,0.5)" />
              </View>
            )}
            <LinearGradient
              colors={['transparent', 'rgba(10,4,24,0.6)', '#0a0418']}
              style={styles.shareHeroOverlay}
            />

            <View style={styles.shareBrandRow}>
              <View style={styles.shareBrandLogo}>
                <Text style={styles.shareBrandLogoText}>W</Text>
              </View>
              <Text style={styles.shareBrandText}>WANDERMARK</Text>
            </View>

            <View style={styles.shareBottom}>
              <Text style={styles.shareYear}>{data.year}</Text>
              <Text style={styles.shareName}>{firstName}'s year of memories</Text>

              <View style={styles.shareStatsGrid}>
                <ShareStat value={data.memories_added} label="memories" />
                <ShareStat value={data.countries_count} label="countries" />
                <ShareStat value={data.photos_uploaded} label="photos" />
              </View>

              {data.top_continent && (
                <Text style={styles.shareTagline}>
                  Most loved · {data.top_continent.name}
                </Text>
              )}
            </View>
          </LinearGradient>
        </View>

        <View style={styles.finaleActions}>
          <TouchableOpacity
            style={[styles.finaleBtn, styles.finaleBtnPrimary]}
            onPress={handleShare}
            disabled={sharing}
            testID="recap-share-btn"
          >
            {sharing ? (
              <ActivityIndicator size="small" color="#0d0a1a" />
            ) : (
              <>
                <Ionicons name="share-outline" size={16} color="#0d0a1a" />
                <Text style={styles.finaleBtnTextPrimary}>Share</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.finaleBtn, styles.finaleBtnGhost]}
            onPress={handleSaveToPhotos}
            disabled={sharing}
            testID="recap-save-btn"
          >
            <Ionicons name="download-outline" size={16} color="#fff" />
            <Text style={styles.finaleBtnTextGhost}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
      <DecorOrbs />
    </LinearGradient>
  );
};

const ShareStat: React.FC<{ value: number; label: string }> = ({ value, label }) => (
  <View style={styles.shareStat}>
    <Text style={styles.shareStatValue}>{value}</Text>
    <Text style={styles.shareStatLabel}>{label}</Text>
  </View>
);

/* -------------------------------------------------------------------------- */
/* Empty state                                                                */
/* -------------------------------------------------------------------------- */

const EmptyState: React.FC<{
  year: number;
  userName: string;
  onClose: () => void;
  onPickYear: () => void;
  showYearPicker: boolean;
  onSelectYear: (y: number) => void;
  onDismissPicker: () => void;
}> = ({ year, userName, onClose, onPickYear, showYearPicker, onSelectYear, onDismissPicker }) => {
  const firstName = userName?.split(' ')[0] || 'there';
  return (
    <LinearGradient colors={['#0a0418', '#1a0b2e', '#3d1f5c']} style={styles.fullScreen}>
      <View style={styles.emptyWrap}>
        <Ionicons name="moon-outline" size={56} color="#FFD700" />
        <Text style={styles.emptyTitle}>Hi {firstName},</Text>
        <Text style={styles.emptyBody}>
          You didn't add any memories in {year} yet.{'\n'}Pick another year, or start logging your trips today.
        </Text>

        <TouchableOpacity
          style={styles.emptyPrimaryBtn}
          onPress={onPickYear}
          testID="recap-empty-pick-year"
        >
          <Ionicons name="calendar-outline" size={14} color="#0d0a1a" />
          <Text style={styles.emptyPrimaryBtnText}>Choose a different year</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onClose} style={styles.emptyGhostBtn} testID="recap-empty-close">
          <Text style={styles.emptyGhostBtnText}>Close</Text>
        </TouchableOpacity>
      </View>

      <YearPicker
        visible={showYearPicker}
        currentYear={year}
        onSelect={onSelectYear}
        onDismiss={onDismissPicker}
      />
    </LinearGradient>
  );
};

/* -------------------------------------------------------------------------- */
/* Year picker                                                                 */
/* -------------------------------------------------------------------------- */

const YearPicker: React.FC<{
  visible: boolean;
  currentYear: number;
  onSelect: (y: number) => void;
  onDismiss: () => void;
}> = ({ visible, currentYear, onSelect, onDismiss }) => {
  if (!visible) return null;
  const years = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2, CURRENT_YEAR - 3];
  return (
    <Pressable style={styles.pickerBackdrop} onPress={onDismiss} testID="recap-year-picker-backdrop">
      <Pressable style={styles.pickerSheet} onPress={(e) => e.stopPropagation()}>
        <View style={styles.pickerHandle} />
        <Text style={styles.pickerTitle}>Choose a year</Text>
        {years.map((y) => {
          const active = y === currentYear;
          return (
            <TouchableOpacity
              key={y}
              style={[styles.pickerRow, active && styles.pickerRowActive]}
              onPress={() => onSelect(y)}
              testID={`recap-year-option-${y}`}
            >
              <Text style={[styles.pickerYear, active && styles.pickerYearActive]}>{y}</Text>
              {active && <Ionicons name="checkmark" size={18} color="#FFD700" />}
            </TouchableOpacity>
          );
        })}
      </Pressable>
    </Pressable>
  );
};

/* -------------------------------------------------------------------------- */
/* Styles                                                                      */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    width: SCREEN_W,
    height: SCREEN_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 16,
    paddingHorizontal: 32,
    textAlign: 'center',
  },
  errorBtn: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    backgroundColor: '#FFD700',
    borderRadius: 999,
  },
  errorBtnText: { color: '#0d0a1a', fontWeight: '700' },

  /* Top bar */
  topBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 32,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 10,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  yearChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderColor: 'rgba(255,255,255,0.2)',
    borderWidth: StyleSheet.hairlineWidth,
  },
  yearChipText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  /* Tap zones */
  tapZones: {
    position: 'absolute',
    top: 110,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  tapZoneLeft: { width: '35%', height: '100%' },
  tapZoneRight: { flex: 1, height: '100%' },

  /* Slide */
  slide: {
    flex: 1,
    width: SCREEN_W,
    height: SCREEN_H,
    overflow: 'hidden',
  },
  slideInner: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 110 : 92,
    paddingBottom: 40,
    paddingHorizontal: 32,
    justifyContent: 'center',
  },

  bgOrb: { position: 'absolute', borderRadius: 999 },
  bgOrbA: {
    width: 320,
    height: 320,
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    top: -100,
    right: -100,
  },
  bgOrbB: {
    width: 240,
    height: 240,
    backgroundColor: 'rgba(255, 99, 198, 0.07)',
    bottom: -80,
    left: -80,
  },
  bgOrbC: {
    width: 160,
    height: 160,
    backgroundColor: 'rgba(77, 184, 216, 0.10)',
    top: SCREEN_H * 0.35,
    right: -60,
  },

  /* Generic typography */
  eyebrow: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 16,
  },
  eyebrowSparkle: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2.5,
    marginBottom: 24,
  },
  bigNumber: {
    color: '#FFFFFF',
    fontSize: 130,
    fontWeight: '900',
    lineHeight: 130,
    letterSpacing: -4,
    fontVariant: ['tabular-nums'],
  },
  bigLabel: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
    marginTop: 12,
  },
  footnote: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 22,
  },

  /* Intro */
  introTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 4,
  },
  introTitleAccent: {
    color: '#FFFFFF',
    fontSize: 44,
    fontWeight: '900',
    lineHeight: 50,
    letterSpacing: -1,
  },
  introSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 16,
    lineHeight: 22,
    marginTop: 18,
  },
  swipeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 32,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 999,
  },
  swipeHintText: { color: 'rgba(255,255,255,0.78)', fontSize: 12 },

  /* Memories */
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 22,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  metaPillText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  /* Countries */
  newCountriesBlock: { marginTop: 28 },
  newCountriesTitle: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  countryChip: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  countryChipText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  /* Continent */
  continentName: {
    color: '#FFFFFF',
    fontSize: 56,
    fontWeight: '900',
    lineHeight: 60,
    letterSpacing: -1.5,
  },
  continentBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255, 215, 0, 0.5)',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },

  /* Month */
  monthName: {
    color: '#FFFFFF',
    fontSize: 64,
    fontWeight: '900',
    lineHeight: 68,
    letterSpacing: -2,
  },

  /* Time travel */
  timeTravelHeadline: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 34,
  },
  timeTravelYears: {
    color: '#FFD700',
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: -1,
  },
  tlCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 28,
    backgroundColor: 'rgba(255,255,255,0.14)',
    padding: 14,
    borderRadius: 14,
  },
  tlLandmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  tlCountry: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 2,
  },

  /* Top landmarks */
  topMomentsTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 32,
  },
  topLandmarksList: { marginTop: 28, gap: 14 },
  tlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tlRank: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
    width: 24,
    fontVariant: ['tabular-nums'],
  },
  tlPhoto: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  tlPhotoFallback: { alignItems: 'center', justifyContent: 'center' },
  tlLandmarkLg: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  tlCountrySm: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    marginTop: 1,
  },
  tlPhotoCount: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },

  /* Finale */
  finaleWrap: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 100 : 80,
    paddingBottom: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  finaleEyebrow: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2.5,
    marginBottom: 6,
  },
  finaleTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 16,
  },
  shareCardOuter: {
    width: SCREEN_W - 80,
    aspectRatio: 9 / 16,
    maxHeight: SCREEN_H * 0.55,
    borderRadius: 22,
    overflow: 'hidden',
  },
  shareCard: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 22,
  },
  shareHeroImg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  shareHeroFallback: {
    backgroundColor: '#1a0b2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareHeroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  shareBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: 14,
  },
  shareBrandLogo: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBrandLogoText: { color: '#0d0a1a', fontWeight: '900', fontSize: 13 },
  shareBrandText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 2,
  },
  shareBottom: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 18,
  },
  shareYear: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
  },
  shareName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 26,
    letterSpacing: -0.5,
    marginTop: 4,
  },
  shareStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.25)',
  },
  shareStat: { flex: 1 },
  shareStatValue: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  shareStatLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  shareTagline: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 10,
  },

  finaleActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
  },
  finaleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
  },
  finaleBtnPrimary: { backgroundColor: '#FFD700' },
  finaleBtnTextPrimary: { color: '#0d0a1a', fontWeight: '800' },
  finaleBtnGhost: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderColor: 'rgba(255,255,255,0.25)',
    borderWidth: StyleSheet.hairlineWidth,
  },
  finaleBtnTextGhost: { color: '#fff', fontWeight: '700' },

  /* Empty state */
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '900',
    marginTop: 14,
  },
  emptyBody: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 26,
  },
  emptyPrimaryBtn: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
  },
  emptyPrimaryBtnText: { color: '#0d0a1a', fontWeight: '800' },
  emptyGhostBtn: { marginTop: 12, padding: 10 },
  emptyGhostBtnText: { color: 'rgba(255,255,255,0.7)' },

  /* Year picker */
  pickerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  pickerSheet: {
    backgroundColor: '#1a0b2e',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 8,
    paddingBottom: 32,
    paddingHorizontal: 18,
  },
  pickerHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignSelf: 'center',
    marginBottom: 14,
  },
  pickerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: 12,
  },
  pickerRowActive: {
    backgroundColor: 'rgba(255,215,0,0.12)',
  },
  pickerYear: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  pickerYearActive: {
    color: '#FFD700',
  },
});
