import React, { createContext, useContext, useReducer } from 'react';

const EmulatorContext = createContext(null);

const initialState = {
  history: [],          // Array of snapshot objects from WASM / adapter
  currentIndex: -1,     // Which snapshot we are currently viewing (-1 = none)
  speed: 800,           // Auto-run delay in ms
  status: 'IDLE',       // 'IDLE' | 'NEEDS_PREPARATION' | 'READY' | 'RUNNING' | 'PAUSED' | 'WAITING_INPUT' | 'FINISHED' | 'ERROR'
  radix: 'HEX',         // 'HEX' | 'DEC' | 'BIN'
  activeTab: 'history', // 'history' | 'memory' | 'stack' | 'alu' | 'io'
  runId: 0,             // Unique run ID for canceling stale async execution
  instructionBudget: 5000,
  instructionCount: 0,
  error: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'PUSH_SNAPSHOT': {
      const newHistory = [...state.history, action.payload];
      return {
        ...state,
        history: newHistory,
        currentIndex: newHistory.length - 1,
        instructionCount: state.instructionCount + 1,
      };
    }

    case 'SET_BASELINE': {
      // Step 0 baseline snapshot before execution
      return {
        ...state,
        history: [action.payload],
        currentIndex: 0,
        instructionCount: 0,
        error: null,
      };
    }

    case 'STEP_BACK':
      if (state.currentIndex <= 0) return state;
      return { ...state, currentIndex: state.currentIndex - 1 };

    case 'STEP_FORWARD':
      if (state.currentIndex >= state.history.length - 1) return state;
      return { ...state, currentIndex: state.currentIndex + 1 };

    case 'JUMP_TO_STEP':
      if (action.payload < 0 || action.payload >= state.history.length) return state;
      return { ...state, currentIndex: action.payload };

    case 'RETURN_TO_LIVE':
      if (state.history.length === 0) return state;
      return { ...state, currentIndex: state.history.length - 1 };

    case 'SET_SPEED':
      return { ...state, speed: action.payload };

    case 'SET_STATUS':
      return { ...state, status: action.payload };

    case 'SET_RADIX':
      return { ...state, radix: action.payload };

    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.payload };

    case 'NEW_RUN_ID':
      return { ...state, runId: state.runId + 1 };

    case 'SET_BUDGET':
      return { ...state, instructionBudget: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload, status: 'ERROR' };

    case 'RESET':
      return {
        ...initialState,
        speed: state.speed,
        radix: state.radix,
        runId: state.runId + 1,
      };

    default:
      return state;
  }
}

export function EmulatorProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const pushSnapshot = (snapshot) =>
    dispatch({ type: 'PUSH_SNAPSHOT', payload: snapshot });

  const setBaseline = (snapshot) =>
    dispatch({ type: 'SET_BASELINE', payload: snapshot });

  const stepBack = () =>
    dispatch({ type: 'STEP_BACK' });

  const stepForward = () =>
    dispatch({ type: 'STEP_FORWARD' });

  const jumpToStep = (index) =>
    dispatch({ type: 'JUMP_TO_STEP', payload: index });

  const returnToLive = () =>
    dispatch({ type: 'RETURN_TO_LIVE' });

  const setSpeed = (ms) =>
    dispatch({ type: 'SET_SPEED', payload: ms });

  const setStatus = (status) =>
    dispatch({ type: 'SET_STATUS', payload: status });

  const setRadix = (radix) =>
    dispatch({ type: 'SET_RADIX', payload: radix });

  const setActiveTab = (tab) =>
    dispatch({ type: 'SET_ACTIVE_TAB', payload: tab });

  const newRunId = () =>
    dispatch({ type: 'NEW_RUN_ID' });

  const setInstructionBudget = (budget) =>
    dispatch({ type: 'SET_BUDGET', payload: budget });

  const setError = (err) =>
    dispatch({ type: 'SET_ERROR', payload: err });

  const resetHistory = () =>
    dispatch({ type: 'RESET' });

  const isHistorical =
    state.currentIndex >= 0 &&
    state.history.length > 0 &&
    state.currentIndex < state.history.length - 1;

  return (
    <EmulatorContext.Provider
      value={{
        state: { ...state, isHistorical },
        pushSnapshot,
        setBaseline,
        stepBack,
        stepForward,
        jumpToStep,
        returnToLive,
        setSpeed,
        setStatus,
        setRadix,
        setActiveTab,
        newRunId,
        setInstructionBudget,
        setError,
        resetHistory,
      }}
    >
      {children}
    </EmulatorContext.Provider>
  );
}

export function useEmulator() {
  return useContext(EmulatorContext);
}

export default EmulatorContext;
