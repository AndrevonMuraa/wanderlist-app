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
      const savedY = scrollY.current;
      if (savedY > 0) {
        // Use multiple attempts with increasing delays to handle layout timing
        const t1 = setTimeout(() => {
          scrollRef.current?.scrollTo?.({ y: savedY, animated: false });
        }, 50);
        const t2 = setTimeout(() => {
          scrollRef.current?.scrollTo?.({ y: savedY, animated: false });
        }, 150);
        return () => { clearTimeout(t1); clearTimeout(t2); };
      }
    }, [])
  );

  return { scrollRef, scrollHandler };
}
