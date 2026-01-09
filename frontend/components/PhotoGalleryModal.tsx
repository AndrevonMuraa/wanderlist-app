import React, { useState } from 'react';
import { View, StyleSheet, Modal, Image, Dimensions, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import theme from '../styles/theme';
import { lightHaptic } from '../utils/haptics';

const { width, height } = Dimensions.get('window');

interface PhotoGalleryModalProps {
  visible: boolean;
  photos: string[];
  initialIndex?: number;
  onClose: () => void;
}

export const PhotoGalleryModal: React.FC<PhotoGalleryModalProps> = ({
  visible,
  photos,
  initialIndex = 0,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const handleNext = async () => {
    await lightHaptic();
    if (currentIndex < photos.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = async () => {
    await lightHaptic();
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      transparent={true}
    >
      <View style={styles.container}>
        {/* Close Button */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={async () => {
            await lightHaptic();
            onClose();
          }}
        >
          <BlurView intensity={80} style={styles.closeBlur}>
            <Ionicons name="close" size={28} color="#fff" />
          </BlurView>
        </TouchableOpacity>

        {/* Photo Counter */}
        <View style={styles.counterContainer}>
          <BlurView intensity={80} style={styles.counterBlur}>
            <Text style={styles.counterText}>
              {currentIndex + 1} / {photos.length}
            </Text>
          </BlurView>
        </View>

        {/* Main Photo */}
        <View style={styles.photoContainer}>
          <Image
            source={{ uri: photos[currentIndex] }}
            style={styles.mainPhoto}
            resizeMode="contain"
          />
        </View>

        {/* Navigation */}
        {photos.length > 1 && (
          <>
            {currentIndex > 0 && (
              <TouchableOpacity
                style={[styles.navButton, styles.navButtonLeft]}
                onPress={handlePrevious}
              >
                <BlurView intensity={80} style={styles.navBlur}>
                  <Ionicons name="chevron-back" size={32} color="#fff" />
                </BlurView>
              </TouchableOpacity>
            )}

            {currentIndex < photos.length - 1 && (
              <TouchableOpacity
                style={[styles.navButton, styles.navButtonRight]}
                onPress={handleNext}
              >
                <BlurView intensity={80} style={styles.navBlur}>
                  <Ionicons name="chevron-forward" size={32} color="#fff" />
                </BlurView>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Thumbnail Strip */}
        {photos.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.thumbnailStrip}
            contentContainerStyle={styles.thumbnailContent}
          >
            {photos.map((photo, index) => (
              <TouchableOpacity
                key={index}
                onPress={async () => {
                  await lightHaptic();
                  setCurrentIndex(index);
                }}
              >
                <Image
                  source={{ uri: photo }}
                  style={[
                    styles.thumbnail,
                    currentIndex === index && styles.thumbnailActive,
                  ]}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    borderRadius: 22,
    overflow: 'hidden',
  },
  closeBlur: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterContainer: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    zIndex: 10,
    borderRadius: 20,
    overflow: 'hidden',
  },
  counterBlur: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  counterText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  photoContainer: {
    width: width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainPhoto: {
    width: width,
    height: height * 0.8,
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -28,
    zIndex: 10,
    borderRadius: 28,
    overflow: 'hidden',
  },
  navButtonLeft: {
    left: 20,
  },
  navButtonRight: {
    right: 20,
  },
  navBlur: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailStrip: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
  },
  thumbnailContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    opacity: 0.6,
  },
  thumbnailActive: {
    opacity: 1,
    borderColor: theme.colors.primary,
  },
});
