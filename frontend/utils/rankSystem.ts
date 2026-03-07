// User Rank System Configuration
// Total points available: ~30,000 (1500 landmarks + bonuses + country visits)
// 10 ranks with progressive thresholds

export interface Rank {
  name: string;
  minPoints: number;
  maxPoints: number;
  color: string;
  icon: string;
  gradient: string[];
  description: string;
}

export const RANKS: Rank[] = [
  {
    name: 'Newcomer',
    minPoints: 0,
    maxPoints: 249,
    color: '#CD7F32',
    icon: 'compass-outline',
    gradient: ['#CD7F32', '#A0522D'],
    description: 'Taking your first steps',
  },
  {
    name: 'Wanderer',
    minPoints: 250,
    maxPoints: 999,
    color: '#A8A8A8',
    icon: 'footsteps',
    gradient: ['#C0C0C0', '#A8A8A8'],
    description: 'The world is calling',
  },
  {
    name: 'Explorer',
    minPoints: 1000,
    maxPoints: 2499,
    color: '#4CAF50',
    icon: 'map',
    gradient: ['#4CAF50', '#388E3C'],
    description: 'Charting new territory',
  },
  {
    name: 'Adventurer',
    minPoints: 2500,
    maxPoints: 4999,
    color: '#2196F3',
    icon: 'airplane',
    gradient: ['#2196F3', '#1976D2'],
    description: 'No border can stop you',
  },
  {
    name: 'Trailblazer',
    minPoints: 5000,
    maxPoints: 8499,
    color: '#FF6B35',
    icon: 'flame',
    gradient: ['#FF6B35', '#E65100'],
    description: 'Blazing your own path',
  },
  {
    name: 'Voyager',
    minPoints: 8500,
    maxPoints: 12999,
    color: '#9C27B0',
    icon: 'navigate',
    gradient: ['#9C27B0', '#7B1FA2'],
    description: 'Sailing uncharted waters',
  },
  {
    name: 'Globetrotter',
    minPoints: 13000,
    maxPoints: 17999,
    color: '#20B2AA',
    icon: 'earth',
    gradient: ['#20B2AA', '#008B8B'],
    description: 'The world knows your name',
  },
  {
    name: 'Legend',
    minPoints: 18000,
    maxPoints: 23999,
    color: '#FFD700',
    icon: 'star',
    gradient: ['#FFD700', '#FFA000'],
    description: 'A true travel legend',
  },
  {
    name: 'Titan',
    minPoints: 24000,
    maxPoints: 29999,
    color: '#E040FB',
    icon: 'diamond',
    gradient: ['#E040FB', '#AA00FF'],
    description: 'Master of all destinations',
  },
  {
    name: 'Mythic',
    minPoints: 30000,
    maxPoints: Infinity,
    color: '#FF1744',
    icon: 'trophy',
    gradient: ['#FF1744', '#D50000'],
    description: 'Beyond legendary. Beyond mortal.',
  },
];

export function getUserRank(points: number): Rank {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (points >= RANKS[i].minPoints) {
      return RANKS[i];
    }
  }
  return RANKS[0];
}

export function getNextRank(currentPoints: number): Rank | null {
  const currentRank = getUserRank(currentPoints);
  const currentIndex = RANKS.findIndex(r => r.name === currentRank.name);
  
  if (currentIndex < RANKS.length - 1) {
    return RANKS[currentIndex + 1];
  }
  
  return null;
}

export function getProgressToNextRank(points: number): {
  currentRank: Rank;
  nextRank: Rank | null;
  pointsInCurrentRank: number;
  pointsNeededForNext: number;
  progressPercentage: number;
} {
  const currentRank = getUserRank(points);
  const nextRank = getNextRank(points);
  
  if (!nextRank) {
    return {
      currentRank,
      nextRank: null,
      pointsInCurrentRank: points - currentRank.minPoints,
      pointsNeededForNext: 0,
      progressPercentage: 100,
    };
  }
  
  const pointsInCurrentRank = points - currentRank.minPoints;
  const totalPointsNeeded = nextRank.minPoints - currentRank.minPoints;
  const progressPercentage = (pointsInCurrentRank / totalPointsNeeded) * 100;
  
  return {
    currentRank,
    nextRank,
    pointsInCurrentRank,
    pointsNeededForNext: nextRank.minPoints - points,
    progressPercentage: Math.min(progressPercentage, 100),
  };
}

export function checkLevelUp(oldPoints: number, newPoints: number): Rank | null {
  const oldRank = getUserRank(oldPoints);
  const newRank = getUserRank(newPoints);
  
  if (oldRank.name !== newRank.name) {
    return newRank;
  }
  
  return null;
}
