import React from 'react';
import { useEmulator } from '../context/EmulatorContext';

export default function ExportButton() {
  const { state } = useEmulator();

  const exportTrace = () => {
    if (!state || !state.history || state.history.length === 0) {
      alert('Run the program first to generate a trace.');
      return;
    }

    const now = new Date();
    const ts = now.toISOString().slice(0, 16).replace('T', '_').replace(':', '-');

    const lines = [];
    lines.push('====================================');
    lines.push(' 8086 Emulator — Execution Trace');
    lines.push(` Generated: ${now.toLocaleString()}`);
    lines.push(' Project: COA Learning Extension');
    lines.push('====================================');
    lines.push('');

    state.history.forEach((snap, idx) => {
      lines.push(`--- Step ${idx + 1} ---`);
      lines.push(`Instruction: ${snap.instruction}`);
      lines.push('Registers:');
      if (snap.registers) {
        Object.entries(snap.registers).forEach(([reg, val]) => {
          const num = typeof val === 'number' ? val : 0;
          lines.push(
            `  ${reg.padEnd(3)}: ${num.toString(16).toUpperCase().padStart(4, '0')}h  (${num})`
          );
        });
      }
      lines.push('Flags:');
      if (snap.flags) {
        Object.entries(snap.flags).forEach(([flag, val]) => {
          lines.push(`  ${flag}: ${val ? 1 : 0}`);
        });
      }
      if (snap.changed_memory && snap.changed_memory.length > 0) {
        lines.push('Memory Changes:');
        snap.changed_memory.forEach((c) => {
          const val = c.after !== undefined ? c.after : c.value;
          lines.push(
            `  [0x${c.address.toString(16).toUpperCase().padStart(5, '0')}] = ${val
              .toString(16)
              .toUpperCase()
              .padStart(2, '0')}h (${val})`
          );
        });
      } else {
        lines.push('Memory Changes: none');
      }
      lines.push('');
    });

    lines.push('====================================');
    lines.push(` Total steps: ${state.history.length}`);
    lines.push('====================================');

    const content = lines.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trace_${ts}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={exportTrace}
      className="btn-export export-btn"
      title="Download full execution trace as text file"
      style={{
        padding: '6px 12px',
        fontSize: '13px',
        fontWeight: 600,
        borderRadius: '4px',
        border: '1px solid var(--border-color, #444)',
        backgroundColor: 'var(--card-bg, #2c3e50)',
        color: 'var(--text-color, #fff)',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
      }}
    >
      📥 Export Trace
    </button>
  );
}
