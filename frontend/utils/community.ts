// Community enhancement utilities

import { BACKEND_URL } from './config';

// Get friend suggestions based on mutual connections and travel patterns
export const getFriendSuggestions = async (token: string, limit: number = 5) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/friend-suggestions?limit=${limit}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Error fetching friend suggestions:', error);
  }
  return [];
};

// Get trending landmarks (most visited recently)
export const getTrendingLandmarks = async (token: string, limit: number = 10) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/landmarks/trending?limit=${limit}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Error fetching trending landmarks:', error);
  }
  return [];
};

// Get popular destinations in your network
export const getPopularInNetwork = async (token: string) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/popular-in-network`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Error fetching popular destinations:', error);
  }
  return [];
};

// Submit landmark rating
export const rateLandmark = async (
  token: string,
  landmarkId: string,
  rating: number,
  review?: string
) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/landmarks/${landmarkId}/rate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rating, review }),
    });
    return response.ok;
  } catch (error) {
    console.error('Error rating landmark:', error);
    return false;
  }
};
