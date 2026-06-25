export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function levenshteinDistance(s1: string, s2: string): number {
  const dp: number[][] = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(0));

  for (let i = 0; i <= s1.length; i++) dp[0][i] = i;
  for (let j = 0; j <= s2.length; j++) dp[j][0] = j;

  for (let j = 1; j <= s2.length; j++) {
    for (let i = 1; i <= s1.length; i++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[j][i] = dp[j - 1][i - 1];
      } else {
        dp[j][i] = Math.min(
          dp[j - 1][i] + 1, // deletion
          dp[j][i - 1] + 1, // insertion
          dp[j - 1][i - 1] + 1 // substitution
        );
      }
    }
  }

  return dp[s2.length][s1.length];
}

export function isMatch(name: string, aliases: string[], guess: string): boolean {
  const normGuess = normalizeText(guess);
  if (normGuess.length < 3) return false;

  const normName = normalizeText(name);
  const normAliases = aliases.map(normalizeText);

  // Exact match
  if (normName === normGuess || normAliases.includes(normGuess)) return true;

  // Partial inclusion (e.g. guessing "joaquin" for "Joaquin Sanchez")
  if (normName.includes(normGuess)) return true;
  if (normAliases.some(a => a.includes(normGuess))) return true;

  // Typo tolerance
  const isTypoMatch = (target: string) => {
    const dist = levenshteinDistance(target, normGuess);
    // Allow 1 typo for words < 6 chars, 2 typos for >= 6 chars
    const maxTypos = target.length < 6 ? 1 : 2;
    return dist <= maxTypos;
  };

  if (isTypoMatch(normName)) return true;
  if (normAliases.some(isTypoMatch)) return true;

  // Check individual words in the name (e.g., guessing "assuncao" for "Marcos Assunçao")
  const words = normName.split(/\s+/);
  if (words.some(word => isTypoMatch(word))) return true;

  return false;
}

export function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

import { Player, BETIS_PLAYERS } from './players';

export function getDailyPlayers(): Player[] {
  // Use UTC offset to switch day at midnight UTC
  const dayIndex = Math.floor(Date.now() / 86400000);
  
  const getSeededRandom = (seed: number) => {
    return () => {
      let x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };
  };

  const getShuffledPlayersForCycle = (cycle: number) => {
    const players = [...BETIS_PLAYERS];
    const rand = getSeededRandom(cycle + 12345);
    for (let i = players.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [players[i], players[j]] = [players[j], players[i]];
    }
    return players;
  };

  const N = BETIS_PLAYERS.length;
  const startIdx = dayIndex * 20;
  const cycle1 = Math.floor(startIdx / N);
  const offset1 = startIdx % N;
  
  let dailyPlayers: Player[] = [];
  let players1 = getShuffledPlayersForCycle(cycle1);
  
  for (let i = 0; i < 20; i++) {
    const currentOffset = offset1 + i;
    if (currentOffset < N) {
      dailyPlayers.push(players1[currentOffset]);
    } else {
      const cycle2 = Math.floor((startIdx + i) / N);
      const offset2 = (startIdx + i) % N;
      const players2 = getShuffledPlayersForCycle(cycle2);
      
      // Ensure no duplicates in the daily selection if we cross cycles
      let playerToAdd = players2[offset2];
      let fallbackOffset = offset2;
      while (dailyPlayers.some(p => p.id === playerToAdd.id)) {
        fallbackOffset = (fallbackOffset + 1) % N;
        playerToAdd = players2[fallbackOffset];
      }
      dailyPlayers.push(playerToAdd);
    }
  }

  return dailyPlayers;
}
