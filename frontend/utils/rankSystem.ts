// User Rank System Configuration
// Total points available: ~19,000 (796 landmarks + bonuses + country visits)
// 8 ranks with progressive thresholds

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
    maxPoints: 199,
    color: '#CD7F32',
    icon: 'compass-outline',
    gradient: ['#CD7F32', '#A0522D'],
    description: 'Taking your first steps',
  },
  {
    name: 'Wanderer',
    minPoints: 200,
    maxPoints: 749,
    color: '#A8A8A8',
    icon: 'footsteps',
    gradient: ['#C0C0C0', '#A8A8A8'],
    description: 'The world is calling',
  },
  {
    name: 'Explorer',
    minPoints: 750,
    maxPoints: 1999,
    color: '#4CAF50',
    icon: 'map',
    gradient: ['#4CAF50', '#388E3C'],
    description: 'Charting new territory',
  },
  {
    name: 'Adventurer',
    minPoints: 2000,
    maxPoints: 4499,
    color: '#2196F3',
    icon: 'airplane',
    gradient: ['#2196F3', '#1976D2'],
    description: 'No border can stop you',
  },
  {
    name: 'Trailblazer',
    minPoints: 4500,
    maxPoints: 8499,
    color: '#FF6B35',
    icon: 'flame',
    gradient: ['#FF6B35', '#E65100'],
    description: 'Blazing your own path',
  },
  {
    name: 'Globetrotter',
    minPoints: 8500,
    maxPoints: 13999,
    color: '#20B2AA',
    icon: 'earth',
    gradient: ['#20B2AA', '#008B8B'],
    description: 'The world knows your name',
  },
  {
    name: 'Legend',
    minPoints: 14000,
    maxPoints: 17999,
    color: '#FFD700',
    icon: 'star',
    gradient: ['#FFD700', '#FFA000'],
    description: 'A true travel legend',
  },
  {
    name: 'Titan',
    minPoints: 18000,
    maxPoints: Infinity,
    color: '#E040FB',
    icon: 'diamond',
    gradient: ['#E040FB', '#AA00FF'],
    description: 'Master of all destinations',
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
