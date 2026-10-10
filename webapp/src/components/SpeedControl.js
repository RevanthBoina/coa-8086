import React from 'react';
import { useEmulator } from '../context/EmulatorContext';

export default function SpeedControl() {
  const { state, setSpeed } = useEmulator();
  const speed = state?.speed || 800;

  return (
    <div
      className="speed-control"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        color: 'var(--text-color, inherit)',
        fontSize: '13px',
      }}
    >
      <label style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>⏱ Speed:</label>
      <input
        type="range"
        min={300}
        max={2500}
        step={100}
        value={2500 - speed + 300}
        onChange={(e) => {
          const sliderVal = parseInt(e.target.value, 10);
          const ms = 2500 - sliderVal + 300;
          setSpeed(ms);
        }}
        style={{
          cursor: 'pointer',
          width: '110px',
        }}
      />
      <span
        className="speed-label"
        style={{
          minWidth: '85px',
          fontWeight: 500,
        }}
      >
        {speed <= 400
          ? '🚀 Fast'
          : speed <= 900
          ? '⚡ Normal'
          : speed <= 1600
          ? '🚶 Slow'
          : '🐢 Very Slow'}
      </span>
    </div>
  );
}
