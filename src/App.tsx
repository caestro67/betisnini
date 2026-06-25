import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  RotateCcw,
  Check,
  X,
  Moon,
  LineChart,
  ChevronLeft,
  Gamepad,
  Share2,
  Home,
  BarChart3,
  Trophy,
  Users,
  HelpCircle,
  Puzzle,
  Timer,
  Edit3,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { BETIS_PLAYERS, Player } from "./players";
import { normalizeText, shuffleArray, getDailyPlayers, isMatch } from "./utils";
import {
  getStats,
  recordGuess,
  recordGameFinished,
  getMostGuessedPlayer,
  getMostMissedPlayer,
  GlobalStats,
} from "./stats";
import * as htmlToImage from "html-to-image";
import { motion } from "motion/react";

const StickerPackLogo = ({ className = "" }: { className?: string }) => (
  <div
    className={`relative w-24 h-32 flex items-center justify-center filter drop-shadow-md transform -rotate-3 transition-transform hover:rotate-0 ${className}`}
  >
    {/* Cuerpo del sobre */}
    <div className="absolute inset-0 bg-gradient-to-br from-[#10b981] to-[#059669] rounded-sm border border-[#34d399]/50 overflow-hidden shadow-inner">
      {/* Reflejo metálico */}
      <div className="absolute top-0 left-[-50%] right-[-50%] bottom-0 bg-gradient-to-r from-transparent via-white/30 to-transparent transform rotate-45 translate-x-[-20%]"></div>
      {/* Rayas en la parte inferior */}
      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-white/10 transform -skew-y-6 translate-y-4"></div>
    </div>

    {/* Sellado superior */}
    <div
      className="absolute -top-1 left-1 right-1 h-2 bg-[#047857] rounded-t-sm opacity-90 border border-[#065f46]"
      style={{
        backgroundImage:
          "repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.15) 2px, rgba(255,255,255,0.15) 4px)",
      }}
    ></div>

    {/* Sellado inferior */}
    <div
      className="absolute -bottom-1 left-1 right-1 h-2 bg-[#047857] rounded-b-sm opacity-90 border border-[#065f46]"
      style={{
        backgroundImage:
          "repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.15) 2px, rgba(255,255,255,0.15) 4px)",
      }}
    ></div>

    {/* Contenido del logo dentro del sobre */}
    <div className="z-10 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
      <span className="font-display font-bold text-2xl text-[#10b981] tracking-tighter">
        B
      </span>
    </div>
  </div>
);

type GameState =
  | "START"
  | "LOADING"
  | "PLAYING"
  | "ROUND_WON"
  | "GAME_OVER"
  | "GAME_WON";

const TOTAL_ROUNDS = 20;
const MAX_STRIKES = 3;
const TIME_PER_ROUND = 30;
const TOTAL_TILES = 50;
const TILE_REVEAL_INTERVAL = (TIME_PER_ROUND * 1000) / TOTAL_TILES;

export default function App() {
  const [gameState, setGameState] = useState<GameState>("START");
  const [dailyPlayers, setDailyPlayers] = useState<Player[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_ROUND);
  const [guess, setGuess] = useState("");
  const [revealedTiles, setRevealedTiles] = useState<Set<number>>(new Set());
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [showPlayers, setShowPlayers] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showRecords, setShowRecords] = useState(false);
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [playerName, setPlayerName] = useState(
    () => localStorage.getItem("betis_player_name") || "Jugador Local",
  );
  const [isDarkMode, setIsDarkMode] = useState(
    () => localStorage.getItem("betis_dark_mode") === "true",
  );
  const [copied, setCopied] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem("betis_dark_mode", isDarkMode.toString());
  }, [isDarkMode]);

  const timerRef = useRef<number | null>(null);
  const revealTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setDailyPlayers(getDailyPlayers());
    getStats().then(setStats);
  }, []);

  const saveGameAndReturn = async () => {
    try {
      localStorage.setItem("betis_player_name", playerName);
    } catch (e) {}
    const rounds = gameState === "GAME_WON" ? TOTAL_ROUNDS : currentRoundIndex;
    await recordGameFinished(playerName, score, rounds);
    getStats().then(setStats);
    setGameState("START");
  };

  const startGame = () => {
    setPlayers(shuffleArray([...dailyPlayers]).slice(0, TOTAL_ROUNDS));
    setCurrentRoundIndex(0);
    setScore(0);
    setStrikes(0);
    setShowRules(false);
    setShowPlayers(false);
    setGuess("");
    setRevealedTiles(new Set());
    setTimeLeft(TIME_PER_ROUND);
    setImageUrl(null);
    setGameState("LOADING");
  };

  const loadNextRound = () => {
    const nextRoundIndex = currentRoundIndex + 1;
    if (nextRoundIndex >= TOTAL_ROUNDS) {
      setGameState("GAME_WON");
      return;
    }
    setCurrentRoundIndex(nextRoundIndex);
    setGameState("LOADING");
    setGuess("");
    setRevealedTiles(new Set());
    setTimeLeft(TIME_PER_ROUND);
    setImageUrl(null);
  };

  useEffect(() => {
    if (gameState === "LOADING" && players.length > 0) {
      const player = players[currentRoundIndex];
      // Use pre-fetched image URL
      setImageUrl(player.imageUrl);

      // Artificial delay for loading state
      const timeoutId = setTimeout(() => {
        setGameState("PLAYING");
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [gameState, players, currentRoundIndex]);

  useEffect(() => {
    if (gameState === "PLAYING") {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            clearInterval(revealTimerRef.current!);
            const player = players[currentRoundIndex];
            recordGuess(player.id, player.name, false);
            setGameState("GAME_OVER"); // Time ends = game over
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      revealTimerRef.current = window.setInterval(() => {
        setRevealedTiles((prev) => {
          if (prev.size >= TOTAL_TILES) {
            clearInterval(revealTimerRef.current!);
            return prev;
          }
          const unrevealed = Array.from(
            { length: TOTAL_TILES },
            (_, i) => i,
          ).filter((i) => !prev.has(i));
          if (unrevealed.length === 0) return prev;
          const randomIndex =
            unrevealed[Math.floor(Math.random() * unrevealed.length)];
          const newSet = new Set(prev);
          newSet.add(randomIndex);
          return newSet;
        });
      }, TILE_REVEAL_INTERVAL);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (revealTimerRef.current) clearInterval(revealTimerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (revealTimerRef.current) clearInterval(revealTimerRef.current);
    };
  }, [gameState]);

  const handleGuessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (gameState !== "PLAYING" || !guess.trim()) return;

    const player = players[currentRoundIndex];

    const isCorrect = isMatch(player.name, player.aliases, guess);

    if (isCorrect) {
      recordGuess(player.id, player.name, true);
      setScore((prev) => prev + timeLeft);
      setGameState("ROUND_WON");
      setRevealedTiles(
        new Set(Array.from({ length: TOTAL_TILES }, (_, i) => i)),
      ); // Reveal all
    } else {
      recordGuess(player.id, player.name, false);
      const newStrikes = strikes + 1;
      setStrikes(newStrikes);
      if (newStrikes >= MAX_STRIKES) {
        setGameState("GAME_OVER");
      }
      setGuess("");
    }
  };

  const renderGrid = () => {
    return Array.from({ length: TOTAL_TILES }).map((_, i) => (
      <div
        key={i}
        className={`w-full h-full bg-[#10b981] border-[0.5px] border-[#059669] transition-opacity duration-300 ${revealedTiles.has(i) ? "opacity-0" : "opacity-100"}`}
      />
    ));
  };

  return (
    <div
      className={`min-h-screen ${isDarkMode ? "dark" : ""} bg-paper font-sans flex flex-col items-center p-4 pt-12 relative overflow-hidden transition-colors duration-300`}
    >
      <div className="max-w-2xl w-full flex flex-col items-center">
        {gameState === "START" &&
          !showRules &&
          !showPlayers &&
          !showStats &&
          !showRecords && (
            <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto relative z-10">
              <div className="absolute -top-10 -right-4">
                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="bg-white dark:bg-slate-800 p-3 rounded-sm shadow-sm hover:shadow-md transition-shadow"
                >
                  <Moon
                    className={
                      isDarkMode ? "text-yellow-400" : "text-yellow-500"
                    }
                    size={20}
                  />
                </button>
              </div>

              <StickerPackLogo className="mb-4 mt-8" />

              <h1 className="text-6xl font-display tracking-wide mb-2 flex drop-shadow-sm text-center">
                <span className="text-slate-800 dark:text-slate-100 mr-2">
                  ÁLBUM
                </span>
                <span className="text-[#10b981]">BETISNINI</span>
              </h1>

              <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500 text-center mb-10 text-sm font-medium">
                Adivina el cromo de jugadores históricos del Real Betis
              </p>

              <button
                onClick={startGame}
                className="w-full max-w-sm bg-teal-600 hover:bg-teal-500 text-white font-bold py-4 px-8 rounded-sm text-lg shadow-md hover:shadow-lg border-2 border-teal-700 transition-all flex items-center justify-center mb-10 transform hover:-translate-y-1"
              >
                <Play className="mr-2 fill-current" size={20} />
                Empezar partida
              </button>

              <div className="flex justify-between w-full px-2 mb-10">
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => {
                      getStats().then(setStats);
                      setShowStats(true);
                    }}
                    className="bg-white dark:bg-slate-800 w-16 h-16 rounded-sm sticker-shadow flex items-center justify-center mb-2 hover:scale-105 transition-transform text-teal-600 dark:text-teal-400"
                  >
                    <BarChart3 size={32} />
                  </button>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    Estadísticas
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => {
                      getStats().then(setStats);
                      setShowRecords(true);
                    }}
                    className="bg-white dark:bg-slate-800 w-16 h-16 rounded-sm sticker-shadow flex items-center justify-center mb-2 hover:scale-105 transition-transform text-yellow-500"
                  >
                    <Trophy size={32} />
                  </button>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    Récords
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => setShowPlayers(true)}
                    className="bg-white dark:bg-slate-800 w-16 h-16 rounded-sm sticker-shadow flex items-center justify-center mb-2 hover:scale-105 transition-transform text-blue-500"
                  >
                    <Users size={32} />
                  </button>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    Jugadores
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => setShowRules(true)}
                    className="bg-white dark:bg-slate-800 w-16 h-16 rounded-sm sticker-shadow flex items-center justify-center mb-2 hover:scale-105 transition-transform text-slate-600 dark:text-slate-300"
                  >
                    <HelpCircle size={32} />
                  </button>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    Cómo Jugar
                  </span>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 w-full rounded-sm border border-slate-200 dark:border-slate-700 sticker-shadow p-4 flex items-center shadow-sm mb-12">
                <div className="bg-emerald-50 dark:bg-emerald-900/30 p-3 rounded-sm mr-4">
                  <LineChart className="text-indigo-400" size={24} />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-slate-900 dark:text-white">
                    Resumen global
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
                    {stats?.gamesPlayed || 0} partidas globales · récord{" "}
                    {stats?.recordScore || 0} pts ·{" "}
                    {stats?.totalGuesses
                      ? Math.round(
                          (stats.correctGuesses / stats.totalGuesses) * 100,
                        )
                      : 0}
                    % acierto
                  </p>
                </div>
              </div>

              <footer className="text-xs text-slate-400 dark:text-slate-500 text-center">
                Cromos retro de futbolistas · BETISNINI ⚽
              </footer>
            </div>
          )}

        {gameState === "START" && showRules && (
          <div className="bg-white dark:bg-slate-800 rounded-sm border border-slate-200 dark:border-slate-700 sticker-shadow p-8 text-center shadow-xl relative z-10 w-full max-w-md mx-auto">
            <button
              onClick={() => setShowRules(false)}
              className="absolute top-4 left-4 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300"
            >
              <ChevronLeft size={28} />
            </button>
            <h2 className="text-2xl font-bold mb-6 text-slate-800 dark:text-slate-100 mt-2">
              Cómo jugar
            </h2>
            <ul className="text-left space-y-4 mb-8 text-slate-600 dark:text-slate-300">
              <li className="flex items-start">
                <Puzzle
                  className="mr-3 text-indigo-500 mt-0.5 flex-shrink-0"
                  size={20}
                />{" "}
                <span>50 casillas tapan el cromo del futbolista.</span>
              </li>
              <li className="flex items-start">
                <Timer
                  className="mr-3 text-orange-500 mt-0.5 flex-shrink-0"
                  size={20}
                />{" "}
                <span>
                  30 segundos por ronda. La cuadrícula se destapa poco a poco.
                </span>
              </li>
              <li className="flex items-start">
                <Edit3
                  className="mr-3 text-blue-500 mt-0.5 flex-shrink-0"
                  size={20}
                />{" "}
                <span>Escribe el nombre del jugador (con o sin tildes).</span>
              </li>
              <li className="flex items-start">
                <CheckCircle
                  className="mr-3 text-emerald-500 mt-0.5 flex-shrink-0"
                  size={20}
                />{" "}
                <span>Ganas puntos = segundos restantes.</span>
              </li>
              <li className="flex items-start">
                <XCircle
                  className="mr-3 text-red-500 mt-0.5 flex-shrink-0"
                  size={20}
                />{" "}
                <span>
                  Tienes 3 fallos en total. Al 3er fallo, o si el tiempo llega a
                  0, pierdes.
                </span>
              </li>
              <li className="flex items-start">
                <Trophy
                  className="mr-3 text-yellow-500 mt-0.5 flex-shrink-0"
                  size={20}
                />{" "}
                <span>20 rondas para la partida perfecta.</span>
              </li>
            </ul>
            <button
              onClick={startGame}
              className="w-full bg-[#0CB89B] hover:bg-teal-500 text-white font-bold py-3 px-8 rounded-sm flex items-center justify-center transition-colors shadow-md"
            >
              <Play className="mr-2 fill-current" size={20} />
              Empezar Partida
            </button>
          </div>
        )}

        {gameState === "START" && showStats && (
          <div className="flex flex-col w-full max-w-md mx-auto relative z-10 w-full mb-12">
            <div className="w-full flex justify-between items-center mb-6">
              <button
                onClick={() => setShowStats(false)}
                className="bg-white dark:bg-slate-800 p-3 rounded-sm shadow-sm hover:shadow-md transition-shadow text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-slate-700"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="bg-white dark:bg-slate-800 p-3 rounded-sm shadow-sm hover:shadow-md transition-shadow"
              >
                <Moon
                  className={isDarkMode ? "text-yellow-400" : "text-yellow-500"}
                  size={20}
                />
              </button>
            </div>

            <h1 className="text-3xl font-black italic tracking-tight mb-8 flex drop-shadow-sm justify-center">
              <span className="text-slate-800 dark:text-slate-100">
                Estadísticas{" "}
              </span>
              <span className="text-[#10b981] ml-2">Globales</span>
            </h1>

            <div className="grid grid-cols-3 gap-3 w-full mb-8">
              <div className="bg-white dark:bg-slate-800 rounded-sm border border-slate-200 dark:border-slate-700 sticker-shadow p-4 flex flex-col items-center shadow-sm">
                <span className="text-2xl font-black text-slate-900 dark:text-white mb-1">
                  {stats?.gamesPlayed || 0}
                </span>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                  Partidas
                </span>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-sm border border-slate-200 dark:border-slate-700 sticker-shadow p-4 flex flex-col items-center shadow-sm">
                <span className="text-2xl font-black text-slate-900 dark:text-white mb-1">
                  {stats?.recordScore || 0}
                </span>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                  Récord
                </span>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-sm border border-slate-200 dark:border-slate-700 sticker-shadow p-4 flex flex-col items-center shadow-sm">
                <span className="text-2xl font-black text-slate-900 dark:text-white mb-1">
                  {stats?.totalGuesses
                    ? Math.round(
                        (stats.correctGuesses / stats.totalGuesses) * 100,
                      )
                    : 0}
                  %
                </span>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                  Acierto
                </span>
              </div>
            </div>

            <div className="w-full mb-6">
              <h2 className="text-sm font-black text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 px-1 text-left">
                Jugador más adivinado
              </h2>
              <div className="bg-white dark:bg-slate-800 rounded-sm border border-slate-200 dark:border-slate-700 sticker-shadow p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center">
                  <div className="bg-[#10b981] w-12 h-12 rounded-sm flex items-center justify-center mr-4 shadow-sm flex-shrink-0">
                    <Check className="text-white" size={28} strokeWidth={3} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-tight mb-1 text-left">
                      {stats
                        ? getMostGuessedPlayer(stats)?.name || "Nadie"
                        : "Nadie"}
                    </h3>
                    <p className="text-sm text-slate-400 dark:text-slate-500 text-left">
                      {stats ? getMostGuessedPlayer(stats)?.correct || 0 : 0}{" "}
                      aciertos
                    </p>
                  </div>
                </div>
                <span className="text-2xl font-black text-[#10b981]">
                  {stats ? getMostGuessedPlayer(stats)?.correct || 0 : 0}
                </span>
              </div>
            </div>

            <div className="w-full mb-8">
              <h2 className="text-sm font-black text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 px-1 text-left">
                Jugador más fallado
              </h2>
              <div className="bg-white dark:bg-slate-800 rounded-sm border border-slate-200 dark:border-slate-700 sticker-shadow p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center">
                  <div className="bg-red-400 w-12 h-12 rounded-sm flex items-center justify-center mr-4 shadow-sm flex-shrink-0">
                    <X className="text-white" size={28} strokeWidth={3} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-tight mb-1 text-left">
                      {stats
                        ? getMostMissedPlayer(stats)?.name || "Nadie"
                        : "Nadie"}
                    </h3>
                    <p className="text-sm text-slate-400 dark:text-slate-500 text-left">
                      {stats ? getMostMissedPlayer(stats)?.incorrect || 0 : 0}{" "}
                      fallos
                    </p>
                  </div>
                </div>
                <span className="text-2xl font-black text-red-400">
                  {stats ? getMostMissedPlayer(stats)?.incorrect || 0 : 0}
                </span>
              </div>
            </div>

            <div className="w-full pb-8">
              <h2 className="text-sm font-black text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 px-1 text-left">
                Últimas partidas
              </h2>
              <div className="space-y-3">
                {!stats || stats.history.length === 0 ? (
                  <div className="text-center text-slate-400 dark:text-slate-500 text-sm py-4">
                    No hay partidas recientes
                  </div>
                ) : (
                  stats.history.map((partida, i) => (
                    <div
                      key={i}
                      className="bg-white dark:bg-slate-800 rounded-sm border border-slate-200 dark:border-slate-700 sticker-shadow p-4 flex items-center shadow-sm"
                    >
                      <div className="text-indigo-600 mr-4">
                        <Gamepad size={32} />
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 dark:text-white text-xl leading-tight text-left">
                          {partida.score} pts
                        </h3>
                        <p className="text-sm text-slate-400 dark:text-slate-500 text-left">
                          {partida.rounds} rondas · {partida.date}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {gameState === "START" && showRecords && (
          <div className="flex flex-col w-full max-w-md mx-auto relative z-10 w-full mb-12">
            <div className="w-full flex justify-between items-center mb-6">
              <button
                onClick={() => setShowRecords(false)}
                className="bg-white dark:bg-slate-800 p-3 rounded-sm shadow-sm hover:shadow-md transition-shadow text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-slate-700"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="bg-white dark:bg-slate-800 p-3 rounded-sm shadow-sm hover:shadow-md transition-shadow"
              >
                <Moon
                  className={isDarkMode ? "text-yellow-400" : "text-yellow-500"}
                  size={20}
                />
              </button>
            </div>

            <h1 className="text-3xl font-black italic tracking-tight mb-8 flex items-center justify-center">
              <span className="text-2xl mr-2">🏅</span>
              <span className="text-slate-800 dark:text-slate-100">
                Récords
              </span>
            </h1>

            <div className="space-y-3 w-full mb-8">
              <div className="bg-white dark:bg-slate-800 rounded-sm border border-slate-200 dark:border-slate-700 sticker-shadow p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">⭐</span>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm md:text-base leading-tight text-left">
                    Puntuación récord global
                  </h3>
                </div>
                <span className="text-xl font-black text-[#10b981]">
                  {stats?.recordScore || 0} pts
                </span>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-sm border border-slate-200 dark:border-slate-700 sticker-shadow p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">🔄</span>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm md:text-base leading-tight text-left">
                    Rondas en una partida (récord global)
                  </h3>
                </div>
                <span className="text-xl font-black text-[#10b981]">
                  {stats?.recordRounds || 0} rondas
                </span>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-sm border border-slate-200 dark:border-slate-700 sticker-shadow p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">🎯</span>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm md:text-base leading-tight text-left">
                    Partidas jugadas (todos los jugadores)
                  </h3>
                </div>
                <span className="text-xl font-black text-[#10b981]">
                  {stats?.gamesPlayed || 0}
                </span>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-sm border border-slate-200 dark:border-slate-700 sticker-shadow p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">📈</span>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm md:text-base leading-tight text-left">
                    Aciertos totales (todos los jugadores)
                  </h3>
                </div>
                <span className="text-xl font-black text-[#10b981]">
                  {stats?.correctGuesses || 0}
                </span>
              </div>
            </div>

            <div className="w-full pb-8">
              <h2 className="text-3xl font-handwriting text-slate-700 dark:text-slate-300 mb-4 px-1 text-left flex items-center">
                <Trophy className="mr-2 text-yellow-500" size={28} /> Top 20
                Partidas
              </h2>
              <div className="space-y-3">
                {!stats || stats.topGames.length === 0 ? (
                  <div className="text-center text-slate-400 dark:text-slate-500 text-sm py-4">
                    No hay récords todavía
                  </div>
                ) : (
                  stats.topGames.map((partida, i) => (
                    <div
                      key={i}
                      className="bg-white dark:bg-slate-800 rounded-sm border border-slate-200 dark:border-slate-700 sticker-shadow p-4 flex items-center justify-between shadow-sm"
                    >
                      <div className="flex items-center">
                        <div className="w-8 h-8 flex items-center justify-center mr-3 font-bold text-lg">
                          {i === 0 ? (
                            "🥇"
                          ) : i === 1 ? (
                            "🥈"
                          ) : i === 2 ? (
                            "🥉"
                          ) : (
                            <span className="text-slate-500 dark:text-slate-400 dark:text-slate-500">
                              #{i + 1}
                            </span>
                          )}
                        </div>
                        <div>
                          <h3 className="font-black text-slate-900 dark:text-white text-lg leading-tight text-left">
                            {partida.playerName}
                          </h3>
                          <p className="text-xs text-slate-400 dark:text-slate-500 text-left">
                            {partida.rounds} rondas · {partida.date}
                          </p>
                        </div>
                      </div>
                      <span className="font-black text-[#10b981] text-lg">
                        {partida.score} pts
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {gameState === "START" && showPlayers && (
          <div className="bg-white dark:bg-slate-800 rounded-sm border border-slate-200 dark:border-slate-700 sticker-shadow p-8 text-center shadow-xl relative z-10 w-full max-w-md mx-auto flex flex-col h-[600px] max-h-[80vh]">
            <button
              onClick={() => setShowPlayers(false)}
              className="absolute top-4 left-4 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300"
            >
              <ChevronLeft size={28} />
            </button>
            <h2 className="text-4xl font-handwriting mb-2 text-slate-800 dark:text-slate-100 mt-2">
              Jugadores de Hoy
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-6">
              Los {TOTAL_ROUNDS} jugadores del reto de hoy
            </p>

            <div className="flex-1 overflow-y-auto text-left space-y-2 mb-6 pr-2 custom-scrollbar">
              {dailyPlayers.map((player) => (
                <div
                  key={player.id}
                  className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 flex items-center"
                >
                  <span className="text-xl mr-3">⚽</span>
                  <span className="font-medium text-slate-700">
                    {player.name}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowPlayers(false)}
              className="w-full bg-[#0CB89B] hover:bg-teal-500 text-white font-bold py-3 px-8 rounded-sm transition-colors shadow-md flex-shrink-0"
            >
              Volver al inicio
            </button>
          </div>
        )}

        {(gameState === "PLAYING" ||
          gameState === "LOADING" ||
          gameState === "ROUND_WON") && (
          <div className="bg-white dark:bg-slate-800 rounded-sm border border-slate-200 dark:border-slate-700 sticker-shadow p-6 shadow-xl w-full max-w-md mx-auto relative z-10">
            <div className="flex justify-between items-center mb-6">
              <div className="text-lg font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500">
                Ronda: {currentRoundIndex + 1}/{TOTAL_ROUNDS}
              </div>
              <div className="text-2xl font-bold text-teal-500">
                Puntos: {score}
              </div>
              <div className="flex space-x-1">
                {Array.from({ length: MAX_STRIKES }).map((_, i) => (
                  <X
                    key={i}
                    size={24}
                    className={
                      i < strikes
                        ? "text-red-500"
                        : "text-slate-200 dark:text-slate-600"
                    }
                  />
                ))}
              </div>
            </div>

            <motion.div
              initial={false}
              animate={{ rotateY: gameState === "ROUND_WON" ? 180 : 0 }}
              transition={
                gameState === "ROUND_WON"
                  ? { duration: 0.6, type: "spring", bounce: 0.4 }
                  : { duration: 0 }
              }
              style={{ transformStyle: "preserve-3d" }}
              className="relative w-full aspect-[3/4] max-w-[280px] mx-auto mb-8 -rotate-1 hover:rotate-0 transition-transform duration-300 [perspective:1000px]"
            >
              {/* Front Face */}
              <div
                style={{ backfaceVisibility: "hidden" }}
                className="absolute inset-0 w-full h-full bg-slate-100 dark:bg-slate-700 rounded-sm overflow-hidden flex items-center justify-center sticker-shadow"
              >
                {gameState === "LOADING" ? (
                  <div className="animate-pulse text-teal-500 font-bold">
                    Cargando cromo...
                  </div>
                ) : (
                  <>
                    {imageUrl && (
                      <img
                        src={imageUrl}
                        alt="Jugador"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute inset-0 grid grid-cols-10 grid-rows-5">
                      {renderGrid()}
                    </div>
                  </>
                )}
              </div>

              {/* Back Face */}
              <div
                style={{
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
                className="absolute inset-0 w-full h-full bg-slate-100 dark:bg-slate-700 rounded-sm overflow-hidden flex items-center justify-center sticker-shadow"
              >
                {imageUrl && (
                  <>
                    <img
                      src={imageUrl}
                      alt="Jugador"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/90 to-transparent pt-12 pb-4 px-4">
                      <div className="text-white font-display text-2xl drop-shadow-md text-center">
                        {players[currentRoundIndex]?.name}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>

            <div className="text-center mb-6">
              <div
                className={`text-4xl font-mono font-bold ${timeLeft <= 5 ? "text-red-500 animate-pulse" : "text-slate-800 dark:text-slate-100"}`}
              >
                {timeLeft}s
              </div>
            </div>

            {gameState === "ROUND_WON" ? (
              <div className="text-center">
                <div className="text-4xl font-handwriting text-teal-600 dark:text-teal-400 mb-6 flex flex-col items-center justify-center -rotate-2">
                  <div className="flex items-center">
                    <Check className="mr-2" size={28} /> ¡Correcto!
                  </div>
                  <div className="mt-1">{players[currentRoundIndex].name}</div>
                </div>
                <button
                  onClick={loadNextRound}
                  className="bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 px-8 rounded-sm transition-colors w-full shadow-md"
                >
                  Siguiente Jugador
                </button>
              </div>
            ) : (
              <form onSubmit={handleGuessSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  placeholder="Nombre del jugador..."
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-sm px-4 py-3 text-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition-all text-slate-800 dark:text-slate-100 font-medium"
                  autoFocus
                  disabled={gameState !== "PLAYING"}
                />
                <button
                  type="submit"
                  disabled={gameState !== "PLAYING" || !guess.trim()}
                  className="bg-teal-500 hover:bg-teal-400 disabled:bg-slate-200 disabled:text-slate-400 dark:text-slate-500 text-white font-bold py-3 px-6 rounded-sm transition-colors shadow-sm"
                >
                  Adivinar
                </button>
              </form>
            )}
          </div>
        )}

        {(gameState === "GAME_OVER" || gameState === "GAME_WON") && (
          <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto relative z-10 w-full mb-12">
            <div className="w-full flex justify-between items-center mb-6">
              <button
                onClick={() => setGameState("START")}
                className="bg-white dark:bg-slate-800 p-3 rounded-sm shadow-sm hover:shadow-md transition-shadow text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="bg-white dark:bg-slate-800 p-3 rounded-sm shadow-sm hover:shadow-md transition-shadow"
              >
                <Moon
                  className={isDarkMode ? "text-yellow-400" : "text-yellow-500"}
                  size={20}
                />
              </button>
            </div>

            <div
              ref={resultRef}
              className="bg-[#0f172a] rounded-sm border border-slate-200 dark:border-slate-700 sticker-shadow p-6 text-center shadow-lg w-full mb-4 relative overflow-hidden transform rotate-1"
            >
              <div className="mb-6 pb-4 border-b border-slate-800/50 flex flex-col items-center">
                <StickerPackLogo className="scale-75 mb-2 origin-center" />
                <h1 className="text-3xl font-display tracking-wide mb-1 flex justify-center drop-shadow-sm">
                  <span className="text-slate-100 mr-2">ÁLBUM</span>
                  <span className="text-[#10b981]">BETISNINI</span>
                </h1>
                <p className="text-slate-400 text-xs font-medium px-2">
                  Adivina el cromo de jugadores históricos del Real Betis
                </p>
              </div>
              <h2 className="text-xl font-display text-slate-300 mb-2 tracking-[0.2em]">
                {gameState === "GAME_WON"
                  ? "PARTIDA PERFECTA"
                  : "PUNTUACIÓN FINAL"}
              </h2>
              <div className="text-[6rem] font-display text-[#0CB89B] leading-none mb-4 tracking-tighter drop-shadow-md">
                {score}
              </div>

              {gameState === "GAME_OVER" ? (
                <>
                  <p className="text-sm text-slate-300 mb-3">
                    Has fallado {strikes} veces en la partida. Llegaste a la
                    ronda {currentRoundIndex + 1}.
                  </p>
                  <p className="text-sm text-slate-400">
                    Era:{" "}
                    <span className="text-blue-300 font-medium">
                      {players[currentRoundIndex]?.name}
                    </span>
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-300 mb-3">
                  Has adivinado todos los jugadores de forma impecable.
                </p>
              )}

              <div className="mt-6 pt-4 border-t border-slate-800/50">
                <p className="text-slate-500 text-xs font-mono tracking-widest uppercase">
                  betisnini.vercel.app
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-sm border border-slate-200 dark:border-slate-700 sticker-shadow p-6 shadow-sm w-full mb-4">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-start mb-4 text-left leading-tight text-[15px]">
                <Trophy
                  className="text-yellow-500 mr-3 flex-shrink-0"
                  size={20}
                />
                ¿Quieres aparecer en el Top 20 global con tu nombre?
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Tu nombre (opcional)"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  maxLength={20}
                  className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-sm px-5 py-3 text-sm focus:outline-none focus:border-[#0db4b9] focus:ring-2 focus:ring-[#0db4b9]/30 transition-all text-slate-800 dark:text-slate-100 font-medium placeholder-slate-400"
                />
                <button
                  onClick={saveGameAndReturn}
                  className="bg-[#0db4b9] hover:bg-[#0ba1a6] text-white font-bold py-3 px-6 rounded-sm transition-colors shadow-sm shadow-[#0db4b9]/30"
                >
                  Guardar
                </button>
              </div>
            </div>

            <div className="w-full space-y-3">
              <button
                onClick={async () => {
                  if (resultRef.current) {
                    try {
                      const image = await htmlToImage.toPng(resultRef.current, {
                        backgroundColor: "#0f172a",
                        pixelRatio: 2,
                      });
                      const link = document.createElement("a");
                      link.href = image;
                      link.download = `betisnini-resultado-${score}.png`;
                      link.click();
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    } catch (e) {
                      console.error("Error generating image", e);
                    }
                  }
                }}
                className="w-full bg-gradient-to-r from-[#10b981] to-[#0db4b9] text-white font-bold py-4 px-6 rounded-sm flex items-center justify-center shadow-lg shadow-emerald-500/20 transition-transform active:scale-95"
              >
                {copied ? (
                  <Check className="mr-3" size={20} />
                ) : (
                  <Share2 className="mr-3" size={20} />
                )}
                {copied ? "¡Imagen guardada!" : "Descargar imagen"}
              </button>

              <button
                onClick={() => {
                  try {
                    if (playerName)
                      localStorage.setItem("betis_player_name", playerName);
                    startGame();
                  } catch (e) {
                    console.error("Error in Jugar de nuevo", e);
                  }
                }}
                className="w-full bg-[#0f172a] text-white font-bold py-4 px-6 rounded-sm flex items-center justify-center shadow-md transition-transform active:scale-95"
              >
                <RotateCcw className="mr-3" size={20} /> Jugar de nuevo
              </button>

              <button
                onClick={() => {
                  try {
                    if (playerName)
                      localStorage.setItem("betis_player_name", playerName);
                    setGameState("START");
                  } catch (e) {
                    console.error("Error in Volver al inicio", e);
                  }
                }}
                className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold py-4 px-6 rounded-sm flex items-center justify-center shadow-sm transition-transform active:scale-95"
              >
                <Home className="mr-3" size={20} /> Volver al inicio
              </button>
            </div>

            <div className="mt-8 text-xs text-slate-400 font-medium">
              Cromos retro de futbolistas · BETISNINI ⚽
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
