import React from 'react';
import { useEmulator } from '../context/EmulatorContext';

const ARITHMETIC_OPS = new Set([
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
  if (!token) return 0;
  const upper = token.trim().toUpperCase();
  if (registers && registers[upper] !== undefined) {
    return registers[upper];
  }
  // Check hex like 0003h
  if (/^[0-9A-F]+H$/i.test(upper)) {
    return parseInt(upper.slice(0, -1), 16) || 0;
  }
  // Decimal or hex with 0x
  if (upper.startsWith('0X')) {
    return parseInt(upper, 16) || 0;
  }
  return parseInt(upper, 10) || 0;
}

export default function ALUPanel() {
  const { state } = useEmulator();
  const current = state && state.currentIndex >= 0 ? state.history[state.currentIndex] : null;
  const prev = state && state.currentIndex > 0 ? state.history[state.currentIndex - 1] : null;

  if (!current || !current.instruction) {
    return (
      <div className="alu-panel" style={panelStyle}>
        <div style={titleStyle}>⚙️ ALU Operation</div>
        <div className="alu-inactive" style={inactiveStyle}>
          Run or step through an arithmetic/logical instruction to view ALU state.
        </div>
      </div>
    );
  }

  const raw = current.instruction.trim();
  const spaceIdx = raw.indexOf(' ');
  const mnemonic = (spaceIdx === -1 ? raw : raw.slice(0, spaceIdx)).toUpperCase();
  const operandStr = spaceIdx === -1 ? '' : raw.slice(spaceIdx + 1);
  const parts = operandStr.split(',').map((s) => s.trim()).filter(Boolean);
  const destToken = parts[0] || '';
  const srcToken = parts[1] || '';

  if (!ARITHMETIC_OPS.has(mnemonic)) {
    return (
      <div className="alu-panel" style={panelStyle}>
        <div style={titleStyle}>⚙️ ALU Operation</div>
        <div className="alu-inactive" style={inactiveStyle}>
          No ALU operation in this instruction.
          <br />
          ({mnemonic} is a data transfer / control instruction.)
        </div>
      </div>
    );
  }

  // Derive operand values
  const currentRegs = current.registers || {};
  const prevRegs = prev ? prev.registers || {} : currentRegs;

  let op1Val = 0;
  let op2Val = 0;
  let resultVal = 0;

  if (mnemonic === 'INC') {
    op1Val = prevRegs[destToken] !== undefined ? prevRegs[destToken] : (currentRegs[destToken] - 1);
    op2Val = 1;
    resultVal = currentRegs[destToken] || 0;
  } else if (mnemonic === 'DEC') {
    op1Val = prevRegs[destToken] !== undefined ? prevRegs[destToken] : (currentRegs[destToken] + 1);
    op2Val = 1;
    resultVal = currentRegs[destToken] || 0;
  } else if (mnemonic === 'NOT') {
    op1Val = prevRegs[destToken] !== undefined ? prevRegs[destToken] : (~currentRegs[destToken] & 0xffff);
    op2Val = 0;
    resultVal = currentRegs[destToken] || 0;
  } else if (mnemonic === 'CMP') {
    op1Val = parseVal(destToken, currentRegs);
    op2Val = parseVal(srcToken, currentRegs);
    resultVal = (op1Val - op2Val) & 0xffff;
  } else {
    // Binary arithmetic (ADD, SUB, AND, OR, XOR, SHL, SHR, etc.)
    op1Val = prevRegs[destToken] !== undefined ? prevRegs[destToken] : currentRegs[destToken];
    op2Val = parseVal(srcToken, prevRegs);
    resultVal = currentRegs[destToken] !== undefined ? currentRegs[destToken] : 0;
  }

  const op1Label = destToken ? `${destToken} = ${toHex4(op1Val)}` : toHex4(op1Val);
  const op2Label = srcToken ? `${srcToken} = ${toHex4(op2Val)}` : toHex4(op2Val);
  const resLabel = destToken ? `${destToken} = ${toHex4(resultVal)}` : toHex4(resultVal);

  return (
    <div className="alu-panel" style={panelStyle}>
      <div style={titleStyle}>⚙️ ALU Operation</div>
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
        <div>
          <div style={{ fontSize: '11px', color: '#95a5a6' }}>Operand 1</div>
          <div className="alu-binary" style={binaryStyle}>
            {toBin16(op1Val)}
          </div>
          <div className="alu-hex" style={hexStyle}>
            ({op1Label})
          </div>
        </div>

        <div
          style={{
            fontWeight: 'bold',
            padding: '4px 8px',
            backgroundColor: 'rgba(52, 152, 219, 0.2)',
            borderRadius: '4px',
            color: '#3498db',
            fontSize: '12px',
          }}
        >
          [{mnemonic}]
        </div>

        <div>
          <div style={{ fontSize: '11px', color: '#95a5a6' }}>Operand 2</div>
          <div className="alu-binary" style={binaryStyle}>
            {toBin16(op2Val)}
          </div>
          <div className="alu-hex" style={hexStyle}>
            ({op2Label})
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', margin: '8px 0', fontSize: '16px', color: '#3498db' }}>
        ↓
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '11px', color: '#95a5a6' }}>Result</div>
        <div className="alu-binary" style={binaryStyle}>
          {toBin16(resultVal)}
        </div>
        <div className="alu-hex" style={hexStyle}>
          ({resLabel})
        </div>
      </div>
    </div>
  );
}

const panelStyle = {
  border: '1px solid var(--accent-color, #3498db)',
  borderRadius: '6px',
  padding: '12px',
  fontFamily: "'Courier New', Courier, monospace",
  fontSize: '13px',
  backgroundColor: 'var(--card-bg, rgba(0,0,0,0.05))',
  color: 'var(--text-color, inherit)',
  boxSizing: 'border-box',
};

const titleStyle = {
  fontWeight: 'bold',
  fontSize: '13px',
  textAlign: 'center',
  paddingBottom: '6px',
  borderBottom: '1px solid var(--border-color, rgba(128,128,128,0.2))',
  marginBottom: '6px',
};

const binaryStyle = {
  fontSize: '13px',
  letterSpacing: '1px',
  color: '#2ecc71',
  fontWeight: 'bold',
  margin: '2px 0',
};

const hexStyle = {
  fontSize: '11px',
  color: '#95a5a6',
};

const inactiveStyle = {
  color: '#7f8c8d',
  fontStyle: 'italic',
  textAlign: 'center',
  padding: '16px 8px',
  fontSize: '12px',
  lineHeight: '1.5',
};
