import { useRef, useCallback } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useFocusEffect } from 'expo-router';

/**
 * Hook to preserve scroll position when navigating back to a screen.
 * Attach `scrollHandler` to ScrollView's `onScroll` prop and
 * `scrollRef` as the ScrollView ref. Position restores automatically on focus.
 */
export function useScrollRestore() {
  const scrollRef = useRef<any>(null);
  const scrollY = useRef(0);

  const scrollHandler = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.current = event.nativeEvent.contentOffset.y;
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Restore scroll position when screen comes back into focus
      const timer = setTimeout(() => {
        if (scrollRef.current && scrollY.current > 0) {
          scrollRef.current.scrollTo?.({ y: scrollY.current, animated: false });
        }
      }, 50);
      return () => clearTimeout(timer);
    }, [])
  );

  return { scrollRef, scrollHandler };
}
