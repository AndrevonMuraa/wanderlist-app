import { Platform, Share } from 'react-native';
import { successHaptic } from './haptics';

const APP_LINK = 'https://wandermark.app';

export const shareVisit = async (landmarkName: string, countryName: string, points: number) => {
  try {
    await successHaptic();
    
    const message = `🎉 Just visited ${landmarkName} in ${countryName}! +${points} points on WanderMark! 🌍✈️\n\nTrack your travels: ${APP_LINK}`;
    
    const result = await Share.share({
      message,
      title: 'My WanderMark Visit',
    });

    if (result.action === Share.sharedAction) {
      return true;
    }
  } catch (error) {
    console.error('Error sharing:', error);
    return false;
  }
};

export const shareBadge = async (badgeName: string, badgeDescription: string) => {
  try {
    await successHaptic();
    
    const message = `🏆 Badge Unlocked: ${badgeName}! ${badgeDescription}\n\nTrack your travels on WanderMark: ${APP_LINK}`;
    
    await Share.share({
      message,
      title: 'Badge Unlocked on WanderMark',
    });
    return true;
  } catch (error) {
    console.error('Error sharing badge:', error);
    return false;
  }
};

export const shareProgress = async (visits: number, countries: number, points: number) => {
  try {
    await successHaptic();
    
    const message = `📊 My WanderMark Progress:\n${visits} landmarks visited\n${countries} countries explored\n${points} points earned!\n\nJoin me on WanderMark! 🌍✈️\n${APP_LINK}`;
    
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
    
    const message = `📚 Check out my "${collectionName}" collection on WanderMark! ${landmarkCount} amazing landmarks to explore! 🗺️\n\n${APP_LINK}`;
    
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

export const shareCountryVisit = async (countryName: string, photoCount: number, points: number, diary?: string) => {
  try {
    await successHaptic();
    
    const diarySnippet = diary ? `\n"${diary.substring(0, 100)}${diary.length > 100 ? '...' : ''}"` : '';
    const message = `🌍 My trip to ${countryName}!${diarySnippet}\n\n📸 ${photoCount} photo${photoCount !== 1 ? 's' : ''} | ⭐ ${points} points\n\nTrack your travels: ${APP_LINK}\n#WanderMark #Travel #${countryName.replace(/\s/g, '')}`;
    
    await Share.share({
      message,
      title: `My ${countryName} Adventure`,
    });
    return true;
  } catch (error) {
    console.error('Error sharing country visit:', error);
    return false;
  }
};
