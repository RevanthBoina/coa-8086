import React from 'react';
import { useEmulator } from '../context/EmulatorContext';

const SUPPORTED_ALU_OPS = new Set([
  'ADD', 'SUB', 'MUL', 'DIV', 'AND', 'OR', 'XOR', 'NOT',
  'SHL', 'SHR', 'INC', 'DEC', 'CMP'
]);

function toBin16(n) {
  const safe = typeof n === 'number' && !isNaN(n) ? (n & 0xffff) >>> 0 : 0;
  return safe.toString(2).padStart(16, '0').match(/.{1,4}/g).join(' ');
}

function toHex4(n) {
  const safe = typeof n === 'number' && !isNaN(n) ? (n & 0xffff) >>> 0 : 0;
  return safe.toString(16).toUpperCase().padStart(4, '0') + 'h';
}

function parseVal(token, registers) {
  if (!token) return null;
  const upper = token.trim().toUpperCase();
  if (registers && registers[upper] !== undefined) {
    return registers[upper];
  }
  // Check 8-bit registers
  if (registers) {
    if (upper === 'AH') return (registers.AX >> 8) & 0xff;
    if (upper === 'AL') return registers.AX & 0xff;
    if (upper === 'BH') return (registers.BX >> 8) & 0xff;
    if (upper === 'BL') return registers.BX & 0xff;
    if (upper === 'CH') return (registers.CX >> 8) & 0xff;
    if (upper === 'CL') return registers.CX & 0xff;
    if (upper === 'DH') return (registers.DX >> 8) & 0xff;
    if (upper === 'DL') return registers.DX & 0xff;
  }
  // Hex with 'h' suffix (e.g., 0003h)
  if (/^[0-9A-F]+H$/i.test(upper)) {
    return parseInt(upper.slice(0, -1), 16);
  }
  // Hex with '0x' prefix
  if (upper.startsWith('0X')) {
    return parseInt(upper, 16);
  }
  // Decimal integer
  if (/^-?\d+$/.test(upper)) {
    return parseInt(upper, 10);
  }
  return null;
}

export default function ALUPanel() {
  const { state } = useEmulator();
  const current = state && state.currentIndex >= 0 ? state.history[state.currentIndex] : null;
  const prev = state && state.currentIndex > 0 ? state.history[state.currentIndex - 1] : null;

  if (!current || !current.instruction || current.isBaseline) {
    return (
      <div className="alu-panel" style={panelStyle}>
        <div style={titleStyle}>⚙️ ALU Operation Breakdown</div>
        <div className="alu-inactive" style={inactiveStyle}>
          Run or step through an arithmetic/logical instruction to view ALU state.
        </div>
      </div>
    );
  }

  const raw = current.instruction.trim();
  const spaceIdx = raw.indexOf(' ');
  const mnemonic = (spaceIdx === -1 ? raw : raw.slice(0, spaceIdx)).toUpperCase().trim();
  const operandStr = spaceIdx === -1 ? '' : raw.slice(spaceIdx + 1).trim();
  const parts = operandStr.split(',').map((s) => s.trim()).filter(Boolean);
  const destToken = parts[0] || '';
  const srcToken = parts[1] || '';

  if (!SUPPORTED_ALU_OPS.has(mnemonic)) {
    return (
      <div className="alu-panel" style={panelStyle}>
        <div style={titleStyle}>⚙️ ALU Operation Breakdown</div>
        <div className="alu-inactive" style={inactiveStyle}>
          No ALU operation in this instruction.
          <br />
          ({mnemonic} is a data transfer / control instruction.)
        </div>
      </div>
    );
  }

  const currentRegs = current.registers || {};
  const prevRegs = prev ? prev.registers || {} : currentRegs;
  const currentFlags = current.flags || {};

  let op1Name = 'Operand 1';
  let op2Name = 'Operand 2';
  let op1Val = null;
  let op2Val = null;
  let resultVal = null;
  let resultNote = '';

  // MUL instruction (AX is implicit operand)
  if (mnemonic === 'MUL') {
    op1Name = 'Input AX (implicit)';
    op2Name = `Input ${destToken || 'Multiplier'}`;
    op1Val = prevRegs.AX !== undefined ? prevRegs.AX : currentRegs.AX;
    op2Val = parseVal(destToken, prevRegs);
    resultVal = currentRegs.AX || 0;
    resultNote = `DX:AX = ${toHex4(currentRegs.DX)}:${toHex4(currentRegs.AX)} | Flags: CF=${currentFlags.CF ? 1 : 0}, OF=${currentFlags.OF ? 1 : 0}`;
  } else if (mnemonic === 'DIV') {
    op1Name = 'Input DX:AX (implicit)';
    op2Name = `Input ${destToken || 'Divisor'}`;
    const lo = prevRegs.AX !== undefined ? prevRegs.AX : currentRegs.AX;
    op1Val = lo;
    op2Val = parseVal(destToken, prevRegs);
    resultVal = currentRegs.AX || 0;
    resultNote = `Quotient (AX) = ${toHex4(currentRegs.AX)}, Remainder (DX) = ${toHex4(currentRegs.DX)}`;
  } else if (mnemonic === 'INC') {
    op1Name = destToken;
    op2Name = 'Constant 1';
    op1Val = prevRegs[destToken] !== undefined ? prevRegs[destToken] : ((currentRegs[destToken] - 1) & 0xffff);
    op2Val = 1;
    resultVal = currentRegs[destToken] !== undefined ? currentRegs[destToken] : 0;
    resultNote = 'CF preserved; ZF, SF, OF updated';
  } else if (mnemonic === 'DEC') {
    op1Name = destToken;
    op2Name = 'Constant 1';
    op1Val = prevRegs[destToken] !== undefined ? prevRegs[destToken] : ((currentRegs[destToken] + 1) & 0xffff);
    op2Val = 1;
    resultVal = currentRegs[destToken] !== undefined ? currentRegs[destToken] : 0;
    resultNote = 'CF preserved; ZF, SF, OF updated';
  } else if (mnemonic === 'NOT') {
    op1Name = destToken;
    op2Name = 'N/A';
    op1Val = prevRegs[destToken] !== undefined ? prevRegs[destToken] : (~currentRegs[destToken] & 0xffff);
    op2Val = 0;
    resultVal = currentRegs[destToken] !== undefined ? currentRegs[destToken] : 0;
    resultNote = 'Bitwise inverted; flags unaffected';
  } else if (mnemonic === 'CMP') {
    op1Name = destToken;
    op2Name = srcToken;
    op1Val = parseVal(destToken, prevRegs) !== null ? parseVal(destToken, prevRegs) : parseVal(destToken, currentRegs);
    op2Val = parseVal(srcToken, prevRegs) !== null ? parseVal(srcToken, prevRegs) : parseVal(srcToken, currentRegs);
    if (op1Val !== null && op2Val !== null) {
      resultVal = (op1Val - op2Val) & 0xffff;
      resultNote = `Temporary subtraction (${toHex4(resultVal)}); ${destToken} unchanged. CF=${currentFlags.CF ? 1 : 0}, ZF=${currentFlags.ZF ? 1 : 0}`;
    }
  } else {
    // ADD, SUB, AND, OR, XOR, SHL, SHR
    op1Name = destToken;
    op2Name = srcToken;
    op1Val = parseVal(destToken, prevRegs) !== null ? parseVal(destToken, prevRegs) : currentRegs[destToken];
    op2Val = parseVal(srcToken, prevRegs);
    resultVal = currentRegs[destToken] !== undefined ? currentRegs[destToken] : null;
    resultNote = `Flags: CF=${currentFlags.CF ? 1 : 0}, ZF=${currentFlags.ZF ? 1 : 0}, SF=${currentFlags.SF ? 1 : 0}, OF=${currentFlags.OF ? 1 : 0}`;
  }

  // If operands could not be resolved reliably, do not substitute guessed zero
  if (op1Val === null || op2Val === null || resultVal === null) {
    return (
      <div className="alu-panel" style={panelStyle}>
        <div style={titleStyle}>⚙️ ALU Operation Breakdown</div>
        <div className="alu-inactive" style={inactiveStyle}>
          Detailed breakdown unavailable for complex or memory operands in {raw}.
          <br />
          Observed CPU State: AX={toHex4(currentRegs.AX)}, BX={toHex4(currentRegs.BX)}, CX={toHex4(currentRegs.CX)}, DX={toHex4(currentRegs.DX)}
        </div>
      </div>
    );
  }

  return (
    <div className="alu-panel" style={panelStyle}>
      <div style={titleStyle}>⚙️ ALU Operation Breakdown</div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          gap: '8px',
          alignItems: 'center',
          textAlign: 'center',
          marginTop: '8px',
        }}
      >
        {/* Operand 1 */}
        <div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>{op1Name}</div>
          <div className="alu-binary" style={binaryStyle}>
            {toBin16(op1Val)}
          </div>
          <div className="alu-hex" style={hexStyle}>
            ({toHex4(op1Val)})
          </div>
        </div>

        {/* Operation Mnemonic */}
        <div
          style={{
            fontWeight: 'bold',
            padding: '4px 10px',
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            borderRadius: '4px',
            color: '#2563eb',
            fontSize: '13px',
          }}
        >
          [{mnemonic}]
        </div>

        {/* Operand 2 */}
        <div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>{op2Name}</div>
          <div className="alu-binary" style={binaryStyle}>
            {toBin16(op2Val)}
          </div>
          <div className="alu-hex" style={hexStyle}>
            ({toHex4(op2Val)})
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', margin: '6px 0', fontSize: '16px', color: '#2563eb' }}>
        ↓
      </div>

      {/* Result */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '11px', color: '#94a3b8' }}>ALU Result (Destination)</div>
        <div className="alu-binary" style={binaryStyle}>
          {toBin16(resultVal)}
        </div>
        <div className="alu-hex" style={hexStyle}>
          ({toHex4(resultVal)})
        </div>
        {resultNote && (
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            {resultNote}
          </div>
        )}
      </div>
    </div>
  );
}

const panelStyle = {
  border: '1px solid #3b82f6',
  borderRadius: '8px',
  padding: '14px',
  fontFamily: "'Courier New', Courier, monospace",
  fontSize: '13px',
  backgroundColor: 'var(--card-bg, rgba(0,0,0,0.03))',
  color: 'var(--text-color, inherit)',
  boxSizing: 'border-box',
};

const titleStyle = {
  fontWeight: 'bold',
  fontSize: '14px',
  textAlign: 'center',
  paddingBottom: '8px',
  borderBottom: '1px solid rgba(128,128,128,0.2)',
  marginBottom: '8px',
};

const binaryStyle = {
  fontSize: '13px',
  letterSpacing: '1px',
  color: '#16a34a',
  fontWeight: 'bold',
  margin: '2px 0',
};

const hexStyle = {
  fontSize: '11px',
  color: '#64748b',
};

const inactiveStyle = {
  color: '#64748b',
  fontStyle: 'italic',
  textAlign: 'center',
  padding: '16px 8px',
  fontSize: '12px',
  lineHeight: '1.5',
};
