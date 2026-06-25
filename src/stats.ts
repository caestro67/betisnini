import { db } from "./firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";

export interface GameResult {
  playerName: string;
  score: number;
  rounds: number;
  date: string;
}

export interface PlayerStats {
  id: string;
  name: string;
  correct: number;
  incorrect: number;
}

export interface GlobalStats {
  gamesPlayed: number;
  recordScore: number;
  recordRounds: number;
  totalGuesses: number;
  correctGuesses: number;
  playerStats: Record<string, PlayerStats>;
  history: GameResult[];
  topGames: GameResult[];
}

export async function getStats(): Promise<GlobalStats> {
  const defaultStats: GlobalStats = {
    gamesPlayed: 0,
    recordScore: 0,
    recordRounds: 0,
    totalGuesses: 0,
    correctGuesses: 0,
    playerStats: {},
    history: [],
    topGames: [],
  };

  try {
    const summaryRef = doc(db, "global_stats", "summary");
    const summarySnap = await getDoc(summaryRef);
    if (summarySnap.exists()) {
      const data = summarySnap.data();
      defaultStats.gamesPlayed = data.gamesPlayed || 0;
      defaultStats.recordScore = data.recordScore || 0;
      defaultStats.recordRounds = data.recordRounds || 0;
      defaultStats.totalGuesses = data.totalGuesses || 0;
      defaultStats.correctGuesses = data.correctGuesses || 0;
    }

    const historyQ = query(
      collection(db, "games"),
      orderBy("timestamp", "desc"),
      limit(20),
    );
    const historySnap = await getDocs(historyQ);
    defaultStats.history = historySnap.docs.map((d) => {
      const data = d.data();
      return {
        playerName: data.playerName,
        score: data.score,
        rounds: data.rounds,
        date: data.date,
      };
    });

    const topGamesQ = query(
      collection(db, "games"),
      orderBy("score", "desc"),
      orderBy("rounds", "asc"),
      limit(20),
    );
    const topGamesSnap = await getDocs(topGamesQ);
    defaultStats.topGames = topGamesSnap.docs.map((d) => {
      const data = d.data();
      return {
        playerName: data.playerName,
        score: data.score,
        rounds: data.rounds,
        date: data.date,
      };
    });

    const playersSnap = await getDocs(collection(db, "player_stats"));
    playersSnap.forEach((doc) => {
      const data = doc.data();
      defaultStats.playerStats[doc.id] = {
        id: doc.id,
        name: data.name,
        correct: data.correct || 0,
        incorrect: data.incorrect || 0,
      };
    });

    return defaultStats;
  } catch (error) {
    console.error("Error fetching stats from Firebase", error);
    return defaultStats;
  }
}

export async function recordGuess(
  playerId: string,
  playerName: string,
  isCorrect: boolean,
) {
  try {
    const summaryRef = doc(db, "global_stats", "summary");
    await setDoc(
      summaryRef,
      {
        totalGuesses: increment(1),
        correctGuesses: isCorrect ? increment(1) : increment(0),
      },
      { merge: true },
    );

    const playerRef = doc(db, "player_stats", playerId);
    await setDoc(
      playerRef,
      {
        name: playerName,
        correct: isCorrect ? increment(1) : increment(0),
        incorrect: isCorrect ? increment(0) : increment(1),
      },
      { merge: true },
    );
  } catch (error) {
    console.error("Error recording guess", error);
  }
}

export async function recordGameFinished(
  playerName: string,
  score: number,
  rounds: number,
) {
  try {
    const summaryRef = doc(db, "global_stats", "summary");
    const summarySnap = await getDoc(summaryRef);
    let recordScore = score;
    let recordRounds = rounds;

    if (summarySnap.exists()) {
      const data = summarySnap.data();
      if (data.recordScore && data.recordScore > recordScore) {
        recordScore = data.recordScore;
      }
      if (data.recordRounds && data.recordRounds > recordRounds) {
        recordRounds = data.recordRounds;
      }
    }

    await setDoc(
      summaryRef,
      {
        gamesPlayed: increment(1),
        recordScore: recordScore,
        recordRounds: recordRounds,
      },
      { merge: true },
    );

    const today = new Date();
    const dateStr = `${today.getDate().toString().padStart(2, "0")}/${(today.getMonth() + 1).toString().padStart(2, "0")}/${today.getFullYear().toString().substring(2)}`;

    await addDoc(collection(db, "games"), {
      playerName: playerName || "Jugador Anónimo",
      score,
      rounds,
      date: dateStr,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error recording game finished", error);
  }
}

export function getMostGuessedPlayer(stats: GlobalStats): PlayerStats | null {
  let best: PlayerStats | null = null;
  for (const pid in stats.playerStats) {
    const p = stats.playerStats[pid];
    if (!best || p.correct > best.correct) {
      best = p;
    }
  }
  return best && best.correct > 0 ? best : null;
}

export function getMostMissedPlayer(stats: GlobalStats): PlayerStats | null {
  let worst: PlayerStats | null = null;
  for (const pid in stats.playerStats) {
    const p = stats.playerStats[pid];
    if (!worst || p.incorrect > worst.incorrect) {
      worst = p;
    }
  }
  return worst && worst.incorrect > 0 ? worst : null;
}
