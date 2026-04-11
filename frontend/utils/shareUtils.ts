import { Share } from 'react-native';
import { successHaptic } from './haptics';

const APP_LINK = 'https://wandermark.app';

export const shareVisit = async (landmarkName: string, countryName: string, points: number, photoCount?: number, diary?: string) => {
  try {
    await successHaptic();
    
    const diarySnippet = diary ? `\n"${diary.substring(0, 100)}${diary.length > 100 ? '...' : ''}"` : '';
    const photoStr = photoCount ? ` | ${photoCount} photo${photoCount !== 1 ? 's' : ''}` : '';
    const message = `Just visited ${landmarkName} in ${countryName}!${diarySnippet}\n\n${points} points${photoStr}\n\nTrack your travels: ${APP_LINK}\n#WanderMark #Travel #${countryName.replace(/\s/g, '')}`;
    
    await Share.share({
      message,
      title: 'My WanderMark visit',
    });
    return true;
  } catch {
    return false;
  }
};

export const shareDestinationVisit = async (countryName: string, photoCount: number, points: number, diary?: string) => {
  try {
    await successHaptic();
    
    const diarySnippet = diary ? `\n"${diary.substring(0, 100)}${diary.length > 100 ? '...' : ''}"` : '';
    const message = `My trip to ${countryName}!${diarySnippet}\n\n${photoCount} photo${photoCount !== 1 ? 's' : ''} | ${points} points\n\nTrack your travels: ${APP_LINK}\n#WanderMark #Travel #${countryName.replace(/\s/g, '')}`;
    
    await Share.share({
      message,
      title: `My ${countryName} adventure`,
    });
    return true;
  } catch {
    return false;
  }
};

export const shareCustomVisit = async (visitName: string, countryName: string, points: number, diary?: string) => {
  try {
    await successHaptic();
    
    const diarySnippet = diary ? `\n"${diary.substring(0, 100)}${diary.length > 100 ? '...' : ''}"` : '';
    const message = `Explored ${visitName} in ${countryName}!${diarySnippet}\n\n${points} points\n\nTrack your travels: ${APP_LINK}\n#WanderMark #Travel`;
    
    await Share.share({
      message,
      title: 'My WanderMark visit',
    });
    return true;
  } catch {
    return false;
  }
};
