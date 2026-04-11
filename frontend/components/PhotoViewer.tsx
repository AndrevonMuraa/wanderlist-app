import React, { useState, useRef } from 'react';
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
}: PhotoViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const newIndex = viewableItems[0].index || 0;
      setCurrentIndex(newIndex);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const goToPhoto = (index: number) => {
    flatListRef.current?.scrollToIndex({ index, animated: true });
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
      <View style={styles.container}>
        {/* Blurred background */}
        <Image
          source={{ uri: photos[currentIndex] }}
          style={StyleSheet.absoluteFill}
          blurRadius={40}
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.7)' }]} />

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

        {/* Photo Gallery — ScrollView zoom per photo */}
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
          renderItem={({ item }) => (
            <View style={styles.photoPage}>
              <ScrollView
                contentContainerStyle={styles.scrollContent}
                maximumZoomScale={5}
                minimumZoomScale={1}
                bouncesZoom={true}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                centerContent={true}
              >
                <Image
                  source={{ uri: item }}
                  style={styles.photo}
                  resizeMode="contain"
                />
              </ScrollView>
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
      </View>
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
  photoPage: {
    width: width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photo: {
    width: width,
    height: height * 0.85,
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
