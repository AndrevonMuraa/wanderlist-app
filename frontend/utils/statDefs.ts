/**
 * The 4 Journey-page stats with their exact icons + colors.
 * Single source of truth so every stat display stays visually consistent.
 */
export interface StatDef {
  key: 'continents' | 'destinations' | 'landmarks' | 'points';
  label: string;
  icon: 'earth' | 'flag' | 'location' | 'star';
  color: string;
}

export const STAT_DEFS: StatDef[] = [
  { key: 'continents',   label: 'Continents',   icon: 'earth',    color: '#4CAF50' },
  { key: 'destinations', label: 'Destinations', icon: 'flag',     color: '#4DB8D8' },
  { key: 'landmarks',    label: 'Landmarks',    icon: 'location', color: '#E87850' },
  { key: 'points',       label: 'Total points', icon: 'star',     color: '#FFD700' },
];
