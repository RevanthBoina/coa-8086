import React, { useRef, useEffect } from 'react';
import Button from '@material-ui/core/Button';
import Chip from '@material-ui/core/Chip';
import { useEmulator } from '../context/EmulatorContext';
import { toHex4, toHex2 } from '../utils/numberFormat';

export default function HistoryTimeline() {
  const { state, jumpToStep, returnToLive } = useEmulator();
  const { history = [], currentIndex = -1 } = state || {};
  const timelineRef = useRef(null);

  useEffect(() => {
    if (timelineRef.current) {
      timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
    }
  }, [history.length]);

  const executedSteps = history.map((snap, i) => ({ snap, index: i })).filter((item) => !item.snap.isBaseline);

  return (
    <div
      className="history-timeline-panel"
      style={{
        border: '1px solid var(--border-color, #cbd5e1)',
        borderRadius: '8px',
        backgroundColor: 'var(--card-bg, rgba(0,0,0,0.02))',
        color: 'var(--text-color, inherit)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'monospace',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '10px 14px',
          fontWeight: 'bold',
          fontSize: '13px',
          borderBottom: '1px solid var(--border-color, #cbd5e1)',
          backgroundColor: 'var(--header-bg, rgba(0,0,0,0.04))',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>📜 Execution Timeline & History</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Chip
            label={`${executedSteps.length} executed step${executedSteps.length !== 1 ? 's' : ''}`}
            size="small"
            style={{ fontSize: '11px', height: '22px' }}
          />
        </div>
      </div>

      {/* Historical Mode Warning Banner */}
      {state.isHistorical && (
        <div className="step-back-warning" style={{ margin: '8px 10px', display: 'flex', justifyContent: 'space-between' }}>
          <span>
            ⚠️ Viewing step {currentIndex + 1} of {history.length} (history mode). CPU remains at latest step.
          </span>
          <Button
            size="small"
            variant="contained"
            color="primary"
            onClick={returnToLive}
            style={{ height: '24px', fontSize: '11px', textTransform: 'none' }}
          >
            Return to Live
          </Button>
        </div>
      )}

      {/* Timeline Steps */}
      <div
        ref={timelineRef}
        style={{
          maxHeight: '380px',
          overflowY: 'auto',
          padding: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {executedSteps.length === 0 ? (
          <div
            style={{
              padding: '24px 12px',
              textAlign: 'center',
              color: 'var(--muted-color, #64748b)',
              fontSize: '12px',
              fontStyle: 'italic',
            }}
          >
            No execution steps yet. Click Step or Run to begin execution.
          </div>
        ) : (
          executedSteps.map(({ snap, index: i }, displayIdx) => {
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
                        `[0x${c.address.toString(16).toUpperCase().padStart(5, '0')}]=${toHex2(
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
                  padding: '8px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  backgroundColor: isActive
                    ? 'rgba(52, 152, 219, 0.15)'
                    : 'var(--entry-bg, rgba(0,0,0,0.02))',
                  borderLeft: isActive ? '3px solid #3498db' : '3px solid transparent',
                  borderTop: '1px solid rgba(128,128,128,0.2)',
                  borderRight: '1px solid rgba(128,128,128,0.2)',
                  borderBottom: '1px solid rgba(128,128,128,0.2)',
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
                  <span style={{ color: '#3498db' }}>Step {displayIdx + 1}</span>
                  <span style={{ color: '#d97706' }}>
                    {snap.instruction || 'NOP'}
                  </span>
                </div>

                {regDiffs.length > 0 && (
                  <div style={{ color: '#16a34a', fontSize: '11px', marginTop: '2px' }}>
                    {regDiffs.join('   ')}
                  </div>
                )}

                {flagDiffs.length > 0 && (
                  <div style={{ color: '#ea580c', fontSize: '11px', marginTop: '2px' }}>
                    {flagDiffs.join('   ')}
                  </div>
                )}

                <div style={{ color: '#64748b', fontSize: '11px', marginTop: '2px' }}>
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
