import React, { createContext, useContext, useReducer } from 'react';

const EmulatorContext = createContext(null);

const initialState = {
  history: [],          // Array of snapshot objects from WASM
  currentIndex: -1,     // Which snapshot we are currently viewing (-1 = none)
  speed: 800,           // Auto-run delay in ms
};

function reducer(state, action) {
  switch (action.type) {

    case 'PUSH_SNAPSHOT': {
      const newHistory = [...state.history, action.payload];
      return {
        ...state,
        history: newHistory,
        currentIndex: newHistory.length - 1,
      };
    }

    case 'STEP_BACK':
      if (state.currentIndex <= 0) return state;
      return { ...state, currentIndex: state.currentIndex - 1 };

    case 'STEP_FORWARD':
      if (state.currentIndex >= state.history.length - 1) return state;
      return { ...state, currentIndex: state.currentIndex + 1 };

    case 'SET_SPEED':
      return { ...state, speed: action.payload };

    case 'RESET':
      return { ...initialState };

    default:
      return state;
  }
}

export function EmulatorProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const pushSnapshot = (snapshot) =>
    dispatch({ type: 'PUSH_SNAPSHOT', payload: snapshot });

  const stepBack = () =>
    dispatch({ type: 'STEP_BACK' });

  const stepForward = () =>
    dispatch({ type: 'STEP_FORWARD' });

  const setSpeed = (ms) =>
    dispatch({ type: 'SET_SPEED', payload: ms });

  const resetHistory = () =>
    dispatch({ type: 'RESET' });

  return (
    <EmulatorContext.Provider
      value={{ state, pushSnapshot, stepBack, stepForward,
               setSpeed, resetHistory }}
    >
      {children}
    </EmulatorContext.Provider>
  );
}

export function useEmulator() {
  return useContext(EmulatorContext);
}

export default EmulatorContext;
