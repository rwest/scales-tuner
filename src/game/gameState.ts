import type { Brick, GameSettings, GameMode, GameState } from '../types';
import { loadSettings } from './settings';

export interface GameStateData {
  // Screen & mode
  screen: GameState;
  gameMode: GameMode;
  selectedScale: string;

  // Gameplay
  currentNoteIndex: number;
  bricks: Brick[];
  instability: number;
  score: number;
  noteScores: number[];
  isListening: boolean;
  isAutoplayMode: boolean;
  collapseTime: number | null;

  // Audio feedback (synced from refs via TICK)
  currentPitch: number | null;
  currentCents: number;
  holdProgress: number;

  // Between-note pause
  isPausedBetweenNotes: boolean;
  pauseAverageCents: number;

  // End-of-game
  fluencyFraction: number;

  // UI state
  error: string | null;
  updateAvailable: boolean;
  replayProgress: number;

  // Settings
  settings: GameSettings;
  noCollapse: boolean;
  hideTunerWhenPlaying: boolean;
}

export type GameAction =
  | { type: 'SET_SCREEN'; screen: GameState }
  | { type: 'START_GAME'; mode: GameMode }
  | { type: 'NOTE_ACCEPTED'; brick: Brick; points: number }
  | { type: 'TOWER_COLLAPSED'; brick: Brick; points: number }
  | { type: 'SCALE_COMPLETED'; brick: Brick; points: number }
  | { type: 'STOP_LISTENING' }
  | { type: 'TICK'; pitch: number | null; cents: number; holdProgress: number }
  | { type: 'EXIT_PAUSE' }
  | { type: 'SET_AUTOPLAY'; active: boolean }
  | { type: 'UPDATE_SETTINGS'; settings: GameSettings }
  | { type: 'SELECT_SCALE'; scale: string }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SET_UPDATE_AVAILABLE'; available: boolean }
  | { type: 'SET_REPLAY_PROGRESS'; progress: number }
  | { type: 'SET_FLUENCY'; fraction: number };

export function createInitialState(): GameStateData {
  const settings = loadSettings();
  return {
    screen: 'menu',
    gameMode: 'practice',
    selectedScale: settings.enabledScales[0] || 'G Major',
    currentNoteIndex: 0,
    bricks: [],
    instability: 0,
    score: 0,
    noteScores: [],
    isListening: false,
    isAutoplayMode: false,
    collapseTime: null,
    currentPitch: null,
    currentCents: 0,
    holdProgress: 0,
    isPausedBetweenNotes: false,
    pauseAverageCents: 0,
    fluencyFraction: 0,
    error: null,
    updateAvailable: false,
    replayProgress: 0,
    settings,
    noCollapse: settings.noCollapse,
    hideTunerWhenPlaying: settings.hideTunerWhenPlaying,
  };
}

export function gameReducer(state: GameStateData, action: GameAction): GameStateData {
  switch (action.type) {
    case 'SET_SCREEN':
      return { ...state, screen: action.screen };

    case 'START_GAME':
      return {
        ...state,
        screen: 'playing',
        gameMode: action.mode,
        currentNoteIndex: 0,
        bricks: [],
        instability: 0,
        score: 0,
        noteScores: [],
        isListening: true,
        holdProgress: 0,
        isPausedBetweenNotes: false,
        isAutoplayMode: false,
        pauseAverageCents: 0,
        fluencyFraction: 0,
        collapseTime: null,
        error: null,
      };

    case 'NOTE_ACCEPTED': {
      const newBricks = [...state.bricks, action.brick];
      const newNoteScores = [...state.noteScores, action.points];
      const newScore = Math.round(newNoteScores.reduce((a, b) => a + b, 0));
      const newInstability = state.instability + Math.abs(action.brick.angle);
      return {
        ...state,
        bricks: newBricks,
        noteScores: newNoteScores,
        score: newScore,
        instability: newInstability,
        currentNoteIndex: state.currentNoteIndex + 1,
        isPausedBetweenNotes: true,
        pauseAverageCents: action.brick.error,
      };
    }

    case 'TOWER_COLLAPSED': {
      const newBricks = [...state.bricks, action.brick];
      const newNoteScores = [...state.noteScores, action.points];
      const newScore = Math.round(newNoteScores.reduce((a, b) => a + b, 0));
      const newInstability = state.instability + Math.abs(action.brick.angle);
      return {
        ...state,
        bricks: newBricks,
        noteScores: newNoteScores,
        score: newScore,
        instability: newInstability,
        screen: 'collapsed',
        collapseTime: Date.now(),
        isListening: false,
        isAutoplayMode: false,
      };
    }

    case 'SCALE_COMPLETED': {
      const newBricks = [...state.bricks, action.brick];
      const newNoteScores = [...state.noteScores, action.points];
      const newScore = Math.round(newNoteScores.reduce((a, b) => a + b, 0));
      const newInstability = state.instability + Math.abs(action.brick.angle);
      return {
        ...state,
        bricks: newBricks,
        noteScores: newNoteScores,
        score: newScore,
        instability: newInstability,
        screen: 'success',
        isListening: false,
        isAutoplayMode: false,
      };
    }

    case 'STOP_LISTENING':
      return { ...state, isListening: false, isAutoplayMode: false };

    case 'TICK':
      return {
        ...state,
        currentPitch: action.pitch,
        currentCents: action.cents,
        holdProgress: action.holdProgress,
      };

    case 'EXIT_PAUSE':
      return {
        ...state,
        isPausedBetweenNotes: false,
        pauseAverageCents: 0,
        holdProgress: 0,
      };

    case 'SET_AUTOPLAY':
      return { ...state, isAutoplayMode: action.active };

    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: action.settings,
        noCollapse: action.settings.noCollapse,
        hideTunerWhenPlaying: action.settings.hideTunerWhenPlaying,
      };

    case 'SELECT_SCALE':
      return { ...state, selectedScale: action.scale };

    case 'SET_ERROR':
      return { ...state, error: action.error };

    case 'SET_UPDATE_AVAILABLE':
      return { ...state, updateAvailable: action.available };

    case 'SET_REPLAY_PROGRESS':
      return { ...state, replayProgress: action.progress };

    case 'SET_FLUENCY':
      return { ...state, fluencyFraction: action.fraction };

    default:
      return state;
  }
}
