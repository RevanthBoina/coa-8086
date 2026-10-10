import React from 'react';
import { useEmulator } from '../context/EmulatorContext';
import { explainInstruction } from '../utils/explanations';

export default function ExplanationBar() {
  const { state } = useEmulator();
  const current = state && state.currentIndex >= 0 ? state.history[state.currentIndex] : null;
  const previous = state && state.currentIndex > 0 ? state.history[state.currentIndex - 1] : null;

  const text = current
    ? explainInstruction(current, previous)
    : 'Run or step through the program to see explanations here.';

  return (
    <div
      className="explanation-bar"
      style={{
        background: '#1a3a5c',
        borderLeft: '4px solid #3498db',
        padding: '10px 16px',
        borderRadius: '4px',
        fontSize: '14px',
        fontStyle: 'italic',
        color: '#ecf0f1',
        minHeight: '44px',
        display: 'flex',
        alignItems: 'center',
        boxSizing: 'border-box',
      }}
    >
      <span
        className="explanation-label"
        style={{
          fontWeight: 'bold',
          marginRight: '8px',
          fontStyle: 'normal',
          whiteSpace: 'nowrap',
        }}
      >
        💡 What happened:
      </span>
      <span className="explanation-text">{text}</span>
    </div>
  );
}
