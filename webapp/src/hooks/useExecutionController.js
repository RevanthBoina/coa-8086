import { useRef, useCallback, useEffect } from 'react';
import { useEmulator } from '../context/EmulatorContext';

/**
 * useExecutionController
 * Owns execution loop, stepping, scheduling, and run cancellation.
 */
export function useExecutionController({ adapter, onOutput, onLineChange, onInputRequired }) {
  const {
    state,
    pushSnapshot,
    setBaseline,
    setStatus,
    returnToLive,
    setError,
    resetHistory,
    newRunId,
  } = useEmulator();

  const isRunningRef = useRef(false);
  const activeRunIdRef = useRef(0);
  const timeoutIdRef = useRef(null);
  const inFlightRef = useRef(false);

  // Clear running timers on unmount
  useEffect(() => {
    return () => {
      isRunningRef.current = false;
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
    };
  }, []);

  const pause = useCallback(() => {
    isRunningRef.current = false;
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
    setStatus('PAUSED');
  }, [setStatus]);

  const stepOnce = useCallback(() => {
    if (!adapter || inFlightRef.current) return null;

    // If viewing history, return to live first
    if (state.isHistorical) {
      returnToLive();
      return null;
    }

    inFlightRef.current = true;
    const res = adapter.step();
    inFlightRef.current = false;

    if (!res.success) {
      pause();
      setError(res.error);
      return res;
    }

    if (res.snapshot) {
      pushSnapshot(res.snapshot);
    }

    if (onLineChange && res.line !== undefined) {
      onLineChange(res.line);
    }

    // Handle interrupts
    if (res.intNum === 10) {
      const out = adapter.getInt10Output();
      if (out && onOutput) onOutput(out);
    } else if (res.intNum === 21) {
      if (res.ahVal === 1 || res.ahVal === 0x0a) {
        pause();
        setStatus('WAITING_INPUT');
        if (onInputRequired) onInputRequired(res.ahVal);
      } else if (res.ahVal === 2) {
        const out = adapter.getInt21Output();
        if (out && onOutput) onOutput(out);
      }
    }

    if (res.isHalted) {
      pause();
      setStatus('FINISHED');
    }

    return res;
  }, [adapter, state.isHistorical, returnToLive, pushSnapshot, onLineChange, onOutput, onInputRequired, pause, setError, setStatus]);

  const scheduleNextStep = useCallback((runId) => {
    if (!isRunningRef.current || runId !== activeRunIdRef.current) return;

    timeoutIdRef.current = setTimeout(() => {
      if (!isRunningRef.current || runId !== activeRunIdRef.current) return;

      const res = stepOnce();
      if (res && res.success && !res.isHalted && isRunningRef.current) {
        scheduleNextStep(runId);
      }
    }, state.speed || 800);
  }, [stepOnce, state.speed]);

  const run = useCallback(() => {
    if (state.isHistorical) {
      returnToLive();
    }

    isRunningRef.current = true;
    newRunId();
    activeRunIdRef.current += 1;
    const runId = activeRunIdRef.current;

    setStatus('RUNNING');
    scheduleNextStep(runId);
  }, [state.isHistorical, returnToLive, newRunId, setStatus, scheduleNextStep]);

  const reset = useCallback(() => {
    isRunningRef.current = false;
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
    activeRunIdRef.current += 1;
    inFlightRef.current = false;
    resetHistory();
    if (adapter) {
      adapter.reset();
    }
  }, [resetHistory, adapter]);

  return {
    step: stepOnce,
    run,
    pause,
    reset,
    isRunning: state.status === 'RUNNING',
  };
}

export default useExecutionController;
