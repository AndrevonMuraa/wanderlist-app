// Maps badge_icon string names from backend to Ionicons icon names
const BADGE_ICON_MAP: Record<string, string> = {
  target: 'locate',
  map: 'map',
  climbing: 'trending-up',
  globe: 'globe',
  plane: 'airplane',
  compass: 'compass',
  medal: 'medal',
  trophy: 'trophy',
  crown: 'ribbon',
  flag: 'flag',
  star: 'star',
  bullseye: 'radio-button-on',
  sparkles: 'sparkles',
  sparkle: 'sparkles',
  wave: 'hand-left',
  handshake: 'people',
  butterfly: 'flower',
  flame: 'flame',
  diamond: 'diamond',
  rocket: 'rocket',
  shield: 'shield-checkmark',
};

export const getBadgeIconName = (iconStr: string): string => {
  return BADGE_ICON_MAP[iconStr] || 'ribbon';
};

// Color for each badge type category
export const getBadgeColor = (badgeType: string): string => {
  if (badgeType.startsWith('milestone_')) return '#4DB8D8';
  if (badgeType === 'first_visit') return '#4CAF50';
  if (badgeType.startsWith('points_')) return '#FFB300';
  if (badgeType.startsWith('social_')) return '#AB47BC';
  if (badgeType.startsWith('streak_')) return '#FF6B35';
  if (badgeType === 'country_complete') return '#26A69A';
  return '#4DB8D8';
};
