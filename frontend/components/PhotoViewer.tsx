import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  Modal,
  FlatList,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import * as ImageManipulator from 'expo-image-manipulator';
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
  const [editedPhotos, setEditedPhotos] = useState<string[]>(photos);
  const [isEditing, setIsEditing] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  // Animation values for pinch-to-zoom
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Reset zoom when changing photos
  const resetZoom = useCallback(() => {
    scale.value = withSpring(1);
    savedScale.value = 1;
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, []);

  // Pinch gesture for zooming
  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = savedScale.value * event.scale;
    })
    .onEnd(() => {
      if (scale.value < 1) {
        scale.value = withSpring(1);
        savedScale.value = 1;
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else if (scale.value > 4) {
        scale.value = withSpring(4);
        savedScale.value = 4;
      } else {
        savedScale.value = scale.value;
      }
    });

  // Pan gesture for moving zoomed image
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (savedScale.value > 1) {
        translateX.value = savedTranslateX.value + event.translationX;
        translateY.value = savedTranslateY.value + event.translationY;
      }
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  // Double tap to zoom in/out
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      if (scale.value > 1) {
        scale.value = withSpring(1);
        savedScale.value = 1;
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        scale.value = withSpring(2.5);
        savedScale.value = 2.5;
      }
    });

  // Single tap to toggle controls
  const singleTapGesture = Gesture.Tap()
    .onStart(() => {
      runOnJS(setShowControls)(!showControls);
    });

  // Combine gestures
  const composedGestures = Gesture.Simultaneous(
    pinchGesture,
    Gesture.Race(doubleTapGesture, singleTapGesture),
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

  // Rotate photo
  const rotatePhoto = async (direction: 'left' | 'right') => {
    setIsEditing(true);
    try {
      const currentPhoto = editedPhotos[currentIndex];
      const degrees = direction === 'right' ? 90 : -90;
      
      const result = await ImageManipulator.manipulateAsync(
        currentPhoto,
        [{ rotate: degrees }],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      const newPhotos = [...editedPhotos];
      newPhotos[currentIndex] = result.base64 
        ? `data:image/jpeg;base64,${result.base64}` 
        : result.uri;
      
      setEditedPhotos(newPhotos);
      onPhotosUpdate?.(newPhotos);
    } catch (error) {
      console.error('Error rotating image:', error);
    } finally {
      setIsEditing(false);
    }
  };

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
    if (currentIndex > 0) {
      goToPhoto(currentIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentIndex < editedPhotos.length - 1) {
      goToPhoto(currentIndex + 1);
    }
  };

  // Update photos when prop changes
  React.useEffect(() => {
    setEditedPhotos(photos);
  }, [photos]);

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
        {/* Header Controls */}
        {showControls && (
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            
            {editedPhotos.length > 1 && (
              <View style={styles.counter}>
                <Text style={styles.counterText}>
                  {currentIndex + 1} / {editedPhotos.length}
                </Text>
              </View>
            )}

            {/* Zoom indicator */}
            <View style={styles.zoomIndicator}>
              <Ionicons name="search" size={16} color="#fff" />
              <Text style={styles.zoomText}>Pinch to zoom</Text>
            </View>
          </View>
        )}

        {/* Photo Gallery */}
        <FlatList
          ref={flatListRef}
          data={editedPhotos}
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
        {showControls && editedPhotos.length > 1 && (
          <>
            {currentIndex > 0 && (
              <TouchableOpacity
                style={[styles.navArrow, styles.navArrowLeft]}
                onPress={goToPrev}
              >
                <Ionicons name="chevron-back" size={36} color="#fff" />
              </TouchableOpacity>
            )}
            {currentIndex < editedPhotos.length - 1 && (
              <TouchableOpacity
                style={[styles.navArrow, styles.navArrowRight]}
                onPress={goToNext}
              >
                <Ionicons name="chevron-forward" size={36} color="#fff" />
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Editing Controls */}
        {showControls && editable && (
          <View style={styles.editControls}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => rotatePhoto('left')}
              disabled={isEditing}
            >
              <Ionicons name="arrow-undo" size={24} color="#fff" />
              <Text style={styles.editButtonText}>Rotate Left</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.editButton}
              onPress={resetZoom}
            >
              <Ionicons name="scan" size={24} color="#fff" />
              <Text style={styles.editButtonText}>Reset Zoom</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.editButton}
              onPress={() => rotatePhoto('right')}
              disabled={isEditing}
            >
              <Ionicons name="arrow-redo" size={24} color="#fff" />
              <Text style={styles.editButtonText}>Rotate Right</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Thumbnail Strip */}
        {showControls && editedPhotos.length > 1 && (
          <View style={styles.thumbnailContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbnailContent}
            >
              {editedPhotos.map((photo, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => goToPhoto(index)}
                  style={[
                    styles.thumbnail,
                    currentIndex === index && styles.thumbnailActive,
                  ]}
                >
                  <Image source={{ uri: photo }} style={styles.thumbnailImage} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Loading overlay */}
        {isEditing && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Processing...</Text>
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
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: 16,
    paddingBottom: 16,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counter: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  counterText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  zoomIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  zoomText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  photoContainer: {
    width: width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageWrapper: {
    width: width,
    height: height * 0.7,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  navArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  navArrowLeft: {
    left: 16,
  },
  navArrowRight: {
    right: 16,
  },
  editControls: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  editButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    minWidth: 90,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
  thumbnailContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  thumbnailContent: {
    paddingHorizontal: 16,
    gap: 10,
    justifyContent: 'center',
  },
  thumbnail: {
    width: 56,
    height: 56,
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
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 12,
    fontWeight: '500',
  },
});
