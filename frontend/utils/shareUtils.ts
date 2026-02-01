import { Platform, Share } from 'react-native';
import { successHaptic } from './haptics';

export const shareVisit = async (landmarkName: string, countryName: string, points: number) => {
  try {
    await successHaptic();
    
    const message = `🎉 Just visited ${landmarkName} in ${countryName}! +${points} points on WanderMark! 🌍✈️`;
    
    const result = await Share.share({
      message,
      title: 'My Travel Achievement',
    });

    if (result.action === Share.sharedAction) {
      return true;
    }
  } catch (error) {
    console.error('Error sharing:', error);
    return false;
  }
};

export const shareAchievement = async (badgeName: string, badgeDescription: string) => {
  try {
    await successHaptic();
    
    const message = `🏆 Achievement Unlocked: ${badgeName}! ${badgeDescription} #WanderMark 🌍`;
    
    await Share.share({
      message,
      title: 'Achievement Unlocked',
    });
    return true;
  } catch (error) {
    console.error('Error sharing achievement:', error);
    return false;
  }
};

export const shareProgress = async (visits: number, countries: number, points: number) => {
  try {
    await successHaptic();
    
    const message = `📊 My WanderMark Progress:\n${visits} landmarks visited\n${countries} countries explored\n${points} points earned!\n\nJoin me on this amazing journey! 🌍✈️`;
    
    await Share.share({
      message,
      title: 'My Travel Stats',
    });
    return true;
  } catch (error) {
    console.error('Error sharing progress:', error);
    return false;
  }
};

export const shareCollection = async (collectionName: string, landmarkCount: number) => {
  try {
    await successHaptic();
    
    const message = `📚 Check out my "${collectionName}" collection on WanderMark! ${landmarkCount} amazing landmarks to explore! 🗺️`;
    
    await Share.share({
      message,
      title: 'My Travel Collection',
    });
    return true;
  } catch (error) {
    console.error('Error sharing collection:', error);
    return false;
  }
};
