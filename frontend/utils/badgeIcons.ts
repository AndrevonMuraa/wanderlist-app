// Badge Icons and Colors utility
// Maps badge types to Ionicons names and colors

// Icon mapping for different badge types
const BADGE_ICON_MAP: Record<string, string> = {
  // Exploration badges
  'explorer': 'compass',
  'adventurer': 'airplane',
  'globetrotter': 'earth',
  'pioneer': 'flag',
  
  // Achievement badges
  'first_visit': 'star',
  'milestone': 'trophy',
  'streak': 'flame',
  'completionist': 'ribbon',
  
  // Country/Continent badges
  'country': 'flag',
  'continent': 'earth',
  
  // Social badges
  'social': 'people',
  'friend': 'person-add',
  'community': 'people-circle',
  
  // Default fallback
  'default': 'medal',
};

// Color mapping for different badge types
const BADGE_COLOR_MAP: Record<string, string> = {
  // Exploration badges - blues/greens
  'explorer': '#4CAF50',
  'adventurer': '#2196F3',
  'globetrotter': '#20B2AA',
  'pioneer': '#FF6B35',
  
  // Achievement badges - golds/oranges
  'first_visit': '#FFD700',
  'milestone': '#FF9800',
  'streak': '#FF5722',
  'completionist': '#E91E63',
  
  // Country/Continent badges
  'country': '#3BB8C3',
  'continent': '#1E8A8A',
  
  // Social badges - purples
  'social': '#9C27B0',
  'friend': '#673AB7',
  'community': '#7B68EE',
  
  // Default fallback
  'default': '#607D8B',
};

/**
 * Get the Ionicons name for a badge icon
 * @param badgeIcon - The badge icon identifier (from backend)
 * @returns The Ionicons icon name
 */
export function getBadgeIconName(badgeIcon: string): string {
  // If the icon is already a valid Ionicons name, return it
  if (badgeIcon && badgeIcon.includes('-')) {
    return badgeIcon;
  }
  
  // Convert badge icon to lowercase for lookup
  const normalizedIcon = (badgeIcon || 'default').toLowerCase().replace(/[_\s]/g, '');
  
  // Check for direct matches
  if (BADGE_ICON_MAP[normalizedIcon]) {
    return BADGE_ICON_MAP[normalizedIcon];
  }
  
  // Check for partial matches
  for (const [key, value] of Object.entries(BADGE_ICON_MAP)) {
    if (normalizedIcon.includes(key) || key.includes(normalizedIcon)) {
      return value;
    }
  }
  
  // Return default medal icon
  return BADGE_ICON_MAP['default'];
}

/**
 * Get the color for a badge type
 * @param badgeType - The badge type identifier
 * @returns The hex color code
 */
export function getBadgeColor(badgeType: string): string {
  // Convert badge type to lowercase for lookup
  const normalizedType = (badgeType || 'default').toLowerCase().replace(/[_\s]/g, '');
  
  // Check for direct matches
  if (BADGE_COLOR_MAP[normalizedType]) {
    return BADGE_COLOR_MAP[normalizedType];
  }
  
  // Check for partial matches
  for (const [key, value] of Object.entries(BADGE_COLOR_MAP)) {
    if (normalizedType.includes(key) || key.includes(normalizedType)) {
      return value;
    }
  }
  
  // Return default gray color
  return BADGE_COLOR_MAP['default'];
}
