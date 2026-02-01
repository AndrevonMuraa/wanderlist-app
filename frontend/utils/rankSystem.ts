// User Rank System Configuration
// Total points available in app: ~7,595 (560 landmarks: 427 official @ 10pts + 133 premium @ 25pts)

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
    name: 'Explorer',
    minPoints: 0,
    maxPoints: 499,
    color: '#CD7F32',
    icon: 'compass',
    gradient: ['#CD7F32', '#A0522D'],
    description: 'Just starting your journey',
  },
  {
    name: 'Adventurer',
    minPoints: 500,
    maxPoints: 1499,
    color: '#C0C0C0',
    icon: 'navigate',
    gradient: ['#C0C0C0', '#A8A8A8'],
    description: 'Building your travel portfolio',
  },
  {
    name: 'Voyager',
    minPoints: 1500,
    maxPoints: 2999,
    color: '#FFD700',
    icon: 'airplane',
    gradient: ['#FFD700', '#FFA500'],
    description: 'Seasoned traveler',
  },
  {
    name: 'Globetrotter',
    minPoints: 3000,
    maxPoints: 4999,
    color: '#20B2AA',
    icon: 'earth',
    gradient: ['#20B2AA', '#48D1CC'],
    description: 'World explorer extraordinaire',
  },
  {
    name: 'Legend',
    minPoints: 5000,
    maxPoints: Infinity,
    color: '#1E8A8A',
    icon: 'trophy',
    gradient: ['#1E8A8A', '#E1BEE7'],
    description: 'Elite travel master',
  },
];

export function getUserRank(points: number): Rank {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (points >= RANKS[i].minPoints) {
      return RANKS[i];
    }
  }
  return RANKS[0]; // Default to Explorer
}

export function getNextRank(currentPoints: number): Rank | null {
  const currentRank = getUserRank(currentPoints);
  const currentIndex = RANKS.findIndex(r => r.name === currentRank.name);
  
  if (currentIndex < RANKS.length - 1) {
    return RANKS[currentIndex + 1];
  }
  
  return null; // Already at max rank
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
    // Max rank reached
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
    return newRank; // User leveled up!
  }
  
  return null;
}
