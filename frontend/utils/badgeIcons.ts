// Maps badge_icon string names from backend to Ionicons icon names
const BADGE_ICON_MAP: Record<string, string> = {
  target: 'locate',
  map: 'map',
  climbing: 'footsteps',
  globe: 'globe',
  plane: 'airplane',
  compass: 'compass',
  medal: 'medal',
  trophy: 'trophy',
  crown: 'flash',
  flag: 'flag',
  star: 'star',
  bullseye: 'aperture',
  sparkles: 'sparkles',
  sparkle: 'thunderstorm',
  wave: 'hand-left',
  handshake: 'people',
  butterfly: 'people-circle',
  flame: 'flame',
  diamond: 'diamond',
  rocket: 'rocket',
  shield: 'shield-checkmark',
};

export const getBadgeIconName = (iconStr: string): string => {
  return BADGE_ICON_MAP[iconStr] || 'ribbon';
};

// Color for each badge type category - graduated prestige system
export const getBadgeColor = (badgeType: string): string => {
  // Milestone badges - graduated colors by tier
  if (badgeType === 'first_visit') return '#4CAF50';
  if (badgeType === 'milestone_10') return '#4CAF50';
  if (badgeType === 'milestone_25') return '#26A69A';
  if (badgeType === 'milestone_50') return '#4DB8D8';
  if (badgeType === 'milestone_100') return '#5C6BC0';
  if (badgeType === 'milestone_200') return '#7E57C2';
  if (badgeType === 'milestone_250') return '#FF8F00';
  if (badgeType === 'milestone_350') return '#FF6D00';
  if (badgeType === 'milestone_500') return '#FFD700';
  if (badgeType.startsWith('milestone_')) return '#4DB8D8';
  // Points badges
  if (badgeType === 'points_100') return '#43A047';
  if (badgeType === 'points_500') return '#FFB300';
  if (badgeType === 'points_1000') return '#FF8F00';
  if (badgeType === 'points_5000') return '#FFD700';
  if (badgeType.startsWith('points_')) return '#FFB300';
  // Social badges
  if (badgeType === 'social_5') return '#AB47BC';
  if (badgeType === 'social_10') return '#8E24AA';
  if (badgeType === 'social_25') return '#E91E63';
  if (badgeType.startsWith('social_')) return '#AB47BC';
  // Country complete
  if (badgeType.startsWith('country_complete')) return '#26A69A';
  return '#4DB8D8';
};
