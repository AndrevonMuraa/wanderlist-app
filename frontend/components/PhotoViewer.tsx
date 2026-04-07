import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  Modal,
  FlatList,
  ScrollView,
  Platform,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import theme from '../styles/theme';

const { width, height } = Dimensions.get('window');

interface PhotoViewerProps {
  visible: boolean;
  photos: string[];
  initialIndex: number;
  onClose: () => void;
  onPhotosUpdate?: (photos: string[]) => void;
  editable?: boolean;
}

export default function PhotoViewer({
  visible,
  photos,
  initialIndex,
  onClose,
  onPhotosUpdate,
  editable = true,
}: PhotoViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const flatListRef = useRef<FlatList>(null);

  // Animation values for pinch-to-zoom
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);

  // Reset zoom when changing photos
  const resetZoom = useCallback(() => {
    scale.value = withSpring(1, { damping: 15 });
    savedScale.value = 1;
    translateX.value = withSpring(0, { damping: 15 });
    translateY.value = withSpring(0, { damping: 15 });
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, []);

  // Pinch gesture for zooming
  const pinchGesture = Gesture.Pinch()
    .onStart((event) => {
      focalX.value = event.focalX;
      focalY.value = event.focalY;
    })
    .onUpdate((event) => {
      const newScale = Math.max(0.5, Math.min(6, savedScale.value * event.scale));
      scale.value = newScale;
    })
    .onEnd(() => {
      if (scale.value < 1) {
        scale.value = withSpring(1, { damping: 15 });
        savedScale.value = 1;
        translateX.value = withSpring(0, { damping: 15 });
        translateY.value = withSpring(0, { damping: 15 });
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else if (scale.value > 5) {
        scale.value = withSpring(5, { damping: 15 });
        savedScale.value = 5;
      } else {
        savedScale.value = scale.value;
      }
    });

  // Pan gesture for moving zoomed image
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (savedScale.value > 1) {
        translateX.value = savedTranslateX.value + event.translationX / savedScale.value;
        translateY.value = savedTranslateY.value + event.translationY / savedScale.value;
      }
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
      
      // Snap back if dragged too far
      const maxX = (width * (savedScale.value - 1)) / (2 * savedScale.value);
      const maxY = (height * 0.7 * (savedScale.value - 1)) / (2 * savedScale.value);
      
      if (Math.abs(translateX.value) > maxX) {
        translateX.value = withSpring(Math.sign(translateX.value) * maxX, { damping: 15 });
        savedTranslateX.value = Math.sign(translateX.value) * maxX;
      }
      if (Math.abs(translateY.value) > maxY) {
        translateY.value = withSpring(Math.sign(translateY.value) * maxY, { damping: 15 });
        savedTranslateY.value = Math.sign(translateY.value) * maxY;
      }
    });

  // Double tap to zoom in/out
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onStart((event) => {
      if (scale.value > 1.5) {
        scale.value = withSpring(1, { damping: 15 });
        savedScale.value = 1;
        translateX.value = withSpring(0, { damping: 15 });
        translateY.value = withSpring(0, { damping: 15 });
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        const targetScale = 3;
        // Zoom toward tap point
        const offsetX = (width / 2 - event.x) / targetScale;
        const offsetY = (height / 2 - event.y) / targetScale;
        scale.value = withSpring(targetScale, { damping: 15 });
        savedScale.value = targetScale;
        translateX.value = withSpring(offsetX, { damping: 15 });
        translateY.value = withSpring(offsetY, { damping: 15 });
        savedTranslateX.value = offsetX;
        savedTranslateY.value = offsetY;
      }
    });

  // Combine gestures
  const composedGestures = Gesture.Simultaneous(
    pinchGesture,
    Gesture.Race(doubleTapGesture, Gesture.Tap()),
    panGesture
  );

  // Animated style for the image
  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const newIndex = viewableItems[0].index || 0;
      setCurrentIndex(newIndex);
      resetZoom();
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const goToPhoto = (index: number) => {
    flatListRef.current?.scrollToIndex({ index, animated: true });
    resetZoom();
  };

  const goToPrev = () => {
    if (currentIndex > 0) goToPhoto(currentIndex - 1);
  };

  const goToNext = () => {
    if (currentIndex < photos.length - 1) goToPhoto(currentIndex + 1);
  };

  React.useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, visible]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={styles.container}>
        {/* Blurred background layer */}
        <Image
          source={{ uri: photos[currentIndex] }}
          style={StyleSheet.absoluteFill}
          blurRadius={40}
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />

        {/* Close button */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
          
          {photos.length > 1 && (
            <View style={styles.counter}>
              <Text style={styles.counterText}>
                {currentIndex + 1} / {photos.length}
              </Text>
            </View>
          )}
          <View style={{ width: 44 }} />
        </View>

        {/* Photo Gallery */}
        <FlatList
          ref={flatListRef}
          data={photos}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
          keyExtractor={(_, index) => `photo-${index}`}
          renderItem={({ item, index }) => (
            <View style={styles.photoContainer}>
              {index === currentIndex ? (
                <GestureDetector gesture={composedGestures}>
                  <Animated.View style={[styles.imageWrapper, animatedImageStyle]}>
                    <Image
                      source={{ uri: item }}
                      style={styles.photo}
                      resizeMode="contain"
                    />
                  </Animated.View>
                </GestureDetector>
              ) : (
                <Image
                  source={{ uri: item }}
                  style={styles.photo}
                  resizeMode="contain"
                />
              )}
            </View>
          )}
        />

        {/* Navigation Arrows */}
        {photos.length > 1 && (
          <>
            {currentIndex > 0 && (
              <TouchableOpacity style={[styles.navArrow, styles.navArrowLeft]} onPress={goToPrev}>
                <Ionicons name="chevron-back" size={32} color="#fff" />
              </TouchableOpacity>
            )}
            {currentIndex < photos.length - 1 && (
              <TouchableOpacity style={[styles.navArrow, styles.navArrowRight]} onPress={goToNext}>
                <Ionicons name="chevron-forward" size={32} color="#fff" />
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Thumbnail Strip */}
        {photos.length > 1 && (
          <View style={styles.thumbnailContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbnailContent}
            >
              {photos.map((photo, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => goToPhoto(index)}
                  style={[styles.thumbnail, currentIndex === index && styles.thumbnailActive]}
                >
                  <Image source={{ uri: photo }} style={styles.thumbnailImage} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 54 : 30,
    paddingHorizontal: 16,
    paddingBottom: 16,
    zIndex: 10,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counter: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  counterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  photoContainer: {
    width: width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageWrapper: {
    width: width,
    height: height * 0.75,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  navArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  navArrowLeft: {
    left: 12,
  },
  navArrowRight: {
    right: 12,
  },
  thumbnailContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 44 : 24,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  thumbnailContent: {
    paddingHorizontal: 16,
    gap: 8,
    justifyContent: 'center',
  },
  thumbnail: {
    width: 52,
    height: 52,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    opacity: 0.5,
  },
  thumbnailActive: {
    borderColor: '#fff',
    opacity: 1,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
});
