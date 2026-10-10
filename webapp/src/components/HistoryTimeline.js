import React, { useRef, useEffect } from 'react';
import { useEmulator } from '../context/EmulatorContext';

function toHex4(val) {
  return (val || 0).toString(16).toUpperCase().padStart(4, '0') + 'h';
}

function toHexByte(val) {
  return (val || 0).toString(16).toUpperCase().padStart(2, '0') + 'h';
}

export default function HistoryTimeline() {
  const { state, jumpToStep } = useEmulator();
  const { history = [], currentIndex = -1 } = state || {};
  const timelineRef = useRef(null);

  useEffect(() => {
    if (timelineRef.current) {
      timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
    }
  }, [history.length]);

  return (
    <div
      className="history-timeline-panel"
      style={{
        border: '1px solid var(--border-color, #444)',
        borderRadius: '6px',
        backgroundColor: 'var(--card-bg, rgba(0,0,0,0.05))',
        color: 'var(--text-color, inherit)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'monospace',
      }}
    >
      <div
        style={{
          padding: '8px 12px',
          fontWeight: 'bold',
          fontSize: '13px',
          borderBottom: '1px solid var(--border-color, #444)',
          backgroundColor: 'var(--header-bg, rgba(0,0,0,0.05))',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>📜 Execution Timeline</span>
        <span style={{ fontSize: '11px', opacity: 0.7 }}>
          {history.length} step{history.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div
        ref={timelineRef}
        style={{
          maxHeight: '380px',
          overflowY: 'auto',
          padding: '6px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        {history.length === 0 ? (
          <div
            style={{
              padding: '24px 12px',
              textAlign: 'center',
              color: 'var(--muted-color, #888)',
              fontSize: '12px',
              fontStyle: 'italic',
            }}
          >
            No execution steps yet. Click Step or Run to begin.
          </div>
        ) : (
          history.map((snap, i) => {
            const isActive = i === currentIndex;
            const prev = i > 0 ? history[i - 1] : null;

            // Register diffs
            const regDiffs = [];
            if (snap.registers) {
              Object.entries(snap.registers).forEach(([reg, val]) => {
                const prevVal = prev && prev.registers ? prev.registers[reg] : undefined;
                if (prevVal !== undefined && prevVal !== val) {
                  regDiffs.push(`${reg}: ${toHex4(prevVal)} → ${toHex4(val)}`);
                }
              });
            }

            // Flag diffs
            const flagDiffs = [];
            if (snap.flags) {
              Object.entries(snap.flags).forEach(([flag, val]) => {
                const prevVal = prev && prev.flags ? prev.flags[flag] : undefined;
                if (prevVal !== undefined && prevVal !== val) {
                  flagDiffs.push(`${flag}: ${prevVal ? 1 : 0} → ${val ? 1 : 0}`);
                }
              });
            }

            // Memory changes
            const memChanges =
              snap.changed_memory && snap.changed_memory.length > 0
                ? snap.changed_memory
                    .map(
                      (c) =>
                        `[0x${c.address.toString(16).toUpperCase().padStart(5, '0')}]=${toHexByte(
                          c.after !== undefined ? c.after : c.value
                        )}`
                    )
                    .join(', ')
                : 'no changes';

            return (
              <div
                key={i}
                className="timeline-entry"
                onClick={() => jumpToStep && jumpToStep(i)}
                style={{
                  padding: '8px 10px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  backgroundColor: isActive
                    ? 'var(--active-bg, rgba(52, 152, 219, 0.15))'
                    : 'var(--entry-bg, rgba(0,0,0,0.02))',
                  borderLeft: isActive ? '3px solid #3498db' : '3px solid transparent',
                  borderTop: '1px solid var(--border-color, rgba(128,128,128,0.2))',
                  borderRight: '1px solid var(--border-color, rgba(128,128,128,0.2))',
                  borderBottom: '1px solid var(--border-color, rgba(128,128,128,0.2))',
                  fontSize: '12px',
                  lineHeight: '1.4',
                  transition: 'background-color 0.15s ease',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontWeight: 'bold',
                    marginBottom: '4px',
                  }}
                >
                  <span style={{ color: '#3498db' }}>Step {i + 1}</span>
                  <span style={{ color: 'var(--accent-color, #e67e22)' }}>
                    {snap.instruction || 'NOP'}
                  </span>
                </div>

                {regDiffs.length > 0 && (
                  <div style={{ color: '#27ae60', fontSize: '11px' }}>
                    {regDiffs.join('   ')}
                  </div>
                )}

                {flagDiffs.length > 0 && (
                  <div style={{ color: '#e67e22', fontSize: '11px' }}>
                    {flagDiffs.join('   ')}
                  </div>
                )}

                <div style={{ color: 'var(--muted-color, #888)', fontSize: '11px' }}>
                  Memory: {memChanges}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
