import { toHex4, toHex2 } from './numberFormat';

export function getRegisterDiffs(currentSnap, prevSnap) {
  if (!currentSnap || !currentSnap.registers) return [];
  const diffs = [];
  const currentRegs = currentSnap.registers;
  const prevRegs = prevSnap ? prevSnap.registers || {} : {};

  const order = ['AX', 'BX', 'CX', 'DX', 'SP', 'BP', 'SI', 'DI', 'CS', 'DS', 'SS', 'ES', 'IP'];
  order.forEach((reg) => {
    const currVal = currentRegs[reg];
    const prevVal = prevRegs[reg];
    if (prevVal !== undefined && currVal !== undefined && prevVal !== currVal) {
      diffs.push({
        register: reg,
        before: prevVal,
        after: currVal,
        text: `${reg}: ${toHex4(prevVal)} → ${toHex4(currVal)}`,
      });
    }
  });

  return diffs;
}

export function getFlagDiffs(currentSnap, prevSnap) {
  if (!currentSnap || !currentSnap.flags) return [];
  const diffs = [];
  const currentFlags = currentSnap.flags;
  const prevFlags = prevSnap ? prevSnap.flags || {} : {};

  const flagsOrder = ['CF', 'ZF', 'SF', 'OF', 'PF', 'AF', 'DF', 'IF', 'TF'];
  flagsOrder.forEach((flag) => {
    const currVal = currentFlags[flag];
    const prevVal = prevFlags[flag];
    if (prevVal !== undefined && currVal !== undefined && prevVal !== currVal) {
      diffs.push({
        flag,
        before: prevVal ? 1 : 0,
        after: currVal ? 1 : 0,
        text: `${flag}: ${prevVal ? 1 : 0} → ${currVal ? 1 : 0}`,
      });
    }
  });

  return diffs;
}

export function getMemoryDiffs(currentSnap) {
  if (!currentSnap || !currentSnap.changed_memory) return [];
  return currentSnap.changed_memory.map((c) => {
    const val = c.after !== undefined ? c.after : c.value;
    const addrHex = '0x' + (c.address || 0).toString(16).toUpperCase().padStart(5, '0');
    return {
      address: c.address,
      addressHex: addrHex,
      value: val,
      valueHex: toHex2(val),
      before: c.before,
    };
  });
}

/**
 * Escape formula injection for CSV export
 */
function sanitizeCSV(val) {
  const str = String(val === undefined || val === null ? '' : val);
  if (/^[=+\-@\t\r]/.test(str)) {
    return `"'${str.replace(/"/g, '""')}"`;
  }
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Export trace as versioned JSON format
 */
export function exportTraceToJSON(history, metadata = {}) {
  const payload = {
    schemaVersion: '1.0.0',
    generator: '8086 Learning Lab',
    timestamp: new Date().toISOString(),
    runId: metadata.runId || 1,
    sourceRevision: metadata.sourceRevision || 'local',
    totalSteps: history.length,
    steps: history.map((snap, idx) => ({
      sequence: idx,
      instruction: snap.instruction || '',
      line: snap.line || null,
      isBaseline: !!snap.isBaseline,
      registers: snap.registers || {},
      flags: snap.flags || {},
      changed_memory: snap.changed_memory || [],
    })),
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Export trace as formula-safe CSV format
 */
export function exportTraceToCSV(history) {
  const headers = [
    'Step',
    'Instruction',
    'AX',
    'BX',
    'CX',
    'DX',
    'SP',
    'BP',
    'SI',
    'DI',
    'CF',
    'ZF',
    'SF',
    'OF',
    'MemoryChanges',
  ];

  const rows = [headers.map(sanitizeCSV).join(',')];

  history.forEach((snap, idx) => {
    const regs = snap.registers || {};
    const flags = snap.flags || {};
    const memStr = (snap.changed_memory || [])
      .map((c) => `[0x${c.address.toString(16).toUpperCase()}]=${toHex2(c.after !== undefined ? c.after : c.value)}`)
      .join('; ');

    const row = [
      idx,
      snap.instruction || '',
      toHex4(regs.AX),
      toHex4(regs.BX),
      toHex4(regs.CX),
      toHex4(regs.DX),
      toHex4(regs.SP),
      toHex4(regs.BP),
      toHex4(regs.SI),
      toHex4(regs.DI),
      flags.CF ? 1 : 0,
      flags.ZF ? 1 : 0,
      flags.SF ? 1 : 0,
      flags.OF ? 1 : 0,
      memStr,
    ];
    rows.push(row.map(sanitizeCSV).join(','));
  });

  return rows.join('\r\n');
}

/**
 * Export trace as formatted text format
 */
export function exportTraceToText(history) {
  const lines = [];
  lines.push('====================================');
  lines.push(' 8086 Learning Lab — Execution Trace');
  lines.push(` Generated: ${new Date().toLocaleString()}`);
  lines.push(' Schema Version: 1.0.0');
  lines.push('====================================');
  lines.push('');

  history.forEach((snap, idx) => {
    lines.push(`--- Step ${idx} ---`);
    lines.push(`Instruction: ${snap.instruction || '(baseline)'}`);
    if (snap.line) lines.push(`Source Line: ${snap.line}`);
    lines.push('Registers:');
    if (snap.registers) {
      Object.entries(snap.registers).forEach(([reg, val]) => {
        lines.push(`  ${reg.padEnd(3)}: ${toHex4(val)}  (${val})`);
      });
    }
    lines.push('Flags:');
    if (snap.flags) {
      const fls = Object.entries(snap.flags)
        .map(([fl, val]) => `${fl}=${val ? 1 : 0}`)
        .join(' ');
      lines.push(`  ${fls}`);
    }
    if (snap.changed_memory && snap.changed_memory.length > 0) {
      lines.push('Memory Changes:');
      snap.changed_memory.forEach((c) => {
        const val = c.after !== undefined ? c.after : c.value;
        lines.push(`  [0x${c.address.toString(16).toUpperCase().padStart(5, '0')}] = ${toHex2(val)}`);
      });
    } else {
      lines.push('Memory Changes: none');
    }
    lines.push('');
  });

  lines.push('====================================');
  lines.push(`Total recorded steps: ${history.length}`);
  return lines.join('\n');
}
