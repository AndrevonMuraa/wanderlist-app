// User Rank System Configuration
// Total points available: ~30,000 (1500 landmarks + bonuses + country visits)
// 20 ranks with progressive thresholds

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
    maxPoints: 149,
    color: '#CD7F32',
    icon: 'compass-outline',
    gradient: ['#CD7F32', '#A0522D'],
    description: 'Taking your first steps',
  },
  {
    name: 'Wanderer',
    minPoints: 150,
    maxPoints: 399,
    color: '#A8A8A8',
    icon: 'footsteps',
    gradient: ['#C0C0C0', '#A8A8A8'],
    description: 'The world is calling',
  },
  {
    name: 'Scout',
    minPoints: 400,
    maxPoints: 799,
    color: '#8D6E63',
    icon: 'binoculars',
    gradient: ['#A1887F', '#6D4C41'],
    description: 'Eyes on the horizon',
  },
  {
    name: 'Explorer',
    minPoints: 800,
    maxPoints: 1499,
    color: '#4CAF50',
    icon: 'map',
    gradient: ['#4CAF50', '#388E3C'],
    description: 'Charting new territory',
  },
  {
    name: 'Pathfinder',
    minPoints: 1500,
    maxPoints: 2499,
    color: '#66BB6A',
    icon: 'trail-sign',
    gradient: ['#81C784', '#43A047'],
    description: 'Finding hidden trails',
  },
  {
    name: 'Adventurer',
    minPoints: 2500,
    maxPoints: 3999,
    color: '#2196F3',
    icon: 'airplane',
    gradient: ['#42A5F5', '#1565C0'],
    description: 'No border can stop you',
  },
  {
    name: 'Voyager',
    minPoints: 4000,
    maxPoints: 5999,
    color: '#1E88E5',
    icon: 'boat',
    gradient: ['#42A5F5', '#0D47A1'],
    description: 'Sailing uncharted waters',
  },
  {
    name: 'Trailblazer',
    minPoints: 6000,
    maxPoints: 7999,
    color: '#FF6B35',
    icon: 'flame',
    gradient: ['#FF8A65', '#E65100'],
    description: 'Blazing your own path',
  },
  {
    name: 'Navigator',
    minPoints: 8000,
    maxPoints: 9999,
    color: '#5C6BC0',
    icon: 'navigate',
    gradient: ['#7986CB', '#283593'],
    description: 'Guided by the stars',
  },
  {
    name: 'Pioneer',
    minPoints: 10000,
    maxPoints: 11999,
    color: '#AB47BC',
    icon: 'flag',
    gradient: ['#CE93D8', '#7B1FA2'],
    description: 'Breaking new ground',
  },
  {
    name: 'Globetrotter',
    minPoints: 12000,
    maxPoints: 13999,
    color: '#20B2AA',
    icon: 'earth',
    gradient: ['#4DB6AC', '#00796B'],
    description: 'The world knows your name',
  },
  {
    name: 'Nomad King',
    minPoints: 14000,
    maxPoints: 15999,
    color: '#00ACC1',
    icon: 'compass',
    gradient: ['#26C6DA', '#006064'],
    description: 'Ruler of the open road',
  },
  {
    name: 'Horizon Chaser',
    minPoints: 16000,
    maxPoints: 17999,
    color: '#EC407A',
    icon: 'sunny',
    gradient: ['#F48FB1', '#AD1457'],
    description: 'Always chasing the next sunrise',
  },
  {
    name: 'Legend',
    minPoints: 18000,
    maxPoints: 19999,
    color: '#FFD700',
    icon: 'star',
    gradient: ['#FFE082', '#F9A825'],
    description: 'A true travel legend',
  },
  {
    name: 'Atlas',
    minPoints: 20000,
    maxPoints: 21999,
    color: '#FF7043',
    icon: 'globe-outline',
    gradient: ['#FF8A65', '#BF360C'],
    description: 'Carrying the world on your shoulders',
  },
  {
    name: 'Titan',
    minPoints: 22000,
    maxPoints: 23999,
    color: '#E040FB',
    icon: 'diamond',
    gradient: ['#EA80FC', '#AA00FF'],
    description: 'Forged in distant lands',
  },
  {
    name: 'Sovereign',
    minPoints: 24000,
    maxPoints: 25999,
    color: '#7C4DFF',
    icon: 'shield-checkmark',
    gradient: ['#B388FF', '#4A148C'],
    description: 'Master of every continent',
  },
  {
    name: 'Mythic',
    minPoints: 26000,
    maxPoints: 27999,
    color: '#FF1744',
    icon: 'bonfire',
    gradient: ['#FF5252', '#B71C1C'],
    description: 'Stories told around campfires',
  },
  {
    name: 'Eternal',
    minPoints: 28000,
    maxPoints: 29999,
    color: '#00E5FF',
    icon: 'infinite',
    gradient: ['#18FFFF', '#006064'],
    description: 'Your legacy echoes forever',
  },
  {
    name: 'Transcendent',
    minPoints: 30000,
    maxPoints: Infinity,
    color: '#FFD700',
    icon: 'trophy',
    gradient: ['#FFD700', '#FF6F00'],
    description: 'Beyond mortal. Beyond legendary.',
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
