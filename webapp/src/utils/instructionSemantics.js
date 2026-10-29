import { toHex4 } from './numberFormat';

export const FLAG_NAMES = {
  CF: 'Carry Flag (unsigned overflow/borrow)',
  ZF: 'Zero Flag (result is zero)',
  SF: 'Sign Flag (high bit is 1, negative in signed interpretation)',
  OF: 'Overflow Flag (signed overflow)',
  PF: 'Parity Flag (even number of 1-bits in low byte)',
  AF: 'Auxiliary Carry Flag (BCD carry from bit 3 to 4)',
  TF: 'Trap Flag (single-step debug mode)',
  IF: 'Interrupt Enable Flag',
  DF: 'Direction Flag (string operation direction)',
};

/**
 * Classify flag behavior for a given mnemonic
 */
export function getFlagSemantics(mnemonic) {
  const m = (mnemonic || '').toUpperCase();
  switch (m) {
    case 'MOV':
    case 'LEA':
    case 'PUSH':
    case 'POP':
    case 'XCHG':
      return { affects: [], preserves: ['CF', 'ZF', 'SF', 'OF', 'PF', 'AF'] };

    case 'INC':
    case 'DEC':
      return { affects: ['ZF', 'SF', 'OF', 'PF', 'AF'], preserves: ['CF'] };

    case 'ADD':
    case 'SUB':
    case 'CMP':
      return { affects: ['CF', 'ZF', 'SF', 'OF', 'PF', 'AF'], preserves: [] };

    case 'AND':
    case 'OR':
    case 'XOR':
      return { affects: ['CF', 'OF', 'ZF', 'SF', 'PF'], preserves: ['AF'], notes: 'CF and OF cleared to 0' };

    case 'NOT':
      return { affects: [], preserves: ['CF', 'ZF', 'SF', 'OF', 'PF', 'AF'] };

    default:
      return { affects: [], preserves: [] };
  }
}

/**
 * Answer the three core student questions:
 * 1. What executed?
 * 2. What changed?
 * 3. Why?
 */
export function generateExplanation(current, prev) {
  if (!current || !current.instruction) {
    return {
      title: 'Ready to Execute',
      what: 'No instruction executed yet.',
      changes: 'CPU is at its initial prepared state.',
      why: 'Press Step to execute one instruction or Run to execute continuously.',
    };
  }

  if (current.isBaseline) {
    return {
      title: 'Program Prepared',
      what: 'Assembly program parsed and initialized in interpreter memory.',
      changes: 'Registers initialized; baseline state captured.',
      why: 'Click Step to begin execution with the first instruction.',
    };
  }

  const raw = current.instruction.trim();
  const spaceIdx = raw.indexOf(' ');
  const mnemonic = (spaceIdx === -1 ? raw : raw.slice(0, spaceIdx)).toUpperCase().trim();
  const operandStr = spaceIdx === -1 ? '' : raw.slice(spaceIdx + 1).trim();
  const operands = operandStr.split(',').map((s) => s.trim()).filter(Boolean);
  const dest = operands[0] || '';
  const src = operands[1] || '';

  const regs = current.registers || {};
  const prevRegs = prev ? prev.registers || {} : regs;
  const flags = current.flags || {};
  const prevFlags = prev ? prev.flags || {} : flags;

  const destVal = regs[dest] !== undefined ? toHex4(regs[dest]) : (regs.AX !== undefined ? toHex4(regs.AX) : '0000h');
  const prevDestVal = prevRegs[dest] !== undefined ? toHex4(prevRegs[dest]) : destVal;

  let srcVal = '';
  if (src) {
    if (regs[src] !== undefined) {
      srcVal = toHex4(regs[src]);
    } else {
      srcVal = src.replace(/h$/i, '').toUpperCase() + 'h';
    }
  }

  // Detect which flags actually flipped
  const flagChanges = [];
  ['CF', 'ZF', 'SF', 'OF'].forEach((fl) => {
    if (flags[fl] !== undefined && prevFlags[fl] !== undefined) {
      if (flags[fl] !== prevFlags[fl]) {
        flagChanges.push(`${fl}: ${prevFlags[fl] ? 1 : 0} → ${flags[fl] ? 1 : 0}`);
      }
    }
  });

  const flagStatusStr = `CF=${flags.CF ? 1 : 0}, ZF=${flags.ZF ? 1 : 0}, SF=${flags.SF ? 1 : 0}, OF=${flags.OF ? 1 : 0}`;
  const flagChangeStr = flagChanges.length > 0 ? `Flag transitions: ${flagChanges.join(', ')}.` : 'No key flags (CF, ZF, SF, OF) changed state.';

  switch (mnemonic) {
    case 'MOV':
      return {
        title: `MOV ${dest}, ${src}`,
        what: `Copied ${srcVal || src} into ${dest}.`,
        changes: `${dest} changed from ${prevDestVal} to ${destVal}. Flags unchanged (MOV preserves all CPU flags).`,
        why: 'MOV transfers data without arithmetic evaluation.',
      };

    case 'ADD':
      return {
        title: `ADD ${dest}, ${src}`,
        what: `Added ${srcVal || src} to ${dest}.`,
        changes: `${dest} is now ${destVal} (was ${prevDestVal}). ${flagStatusStr}.`,
        why: `Addition computed by ALU. ${flagChangeStr}`,
      };

    case 'SUB':
      return {
        title: `SUB ${dest}, ${src}`,
        what: `Subtracted ${srcVal || src} from ${dest}.`,
        changes: `${dest} is now ${destVal} (was ${prevDestVal}). ${flagStatusStr}.`,
        why: `Subtraction computed by ALU (dest - src). ${flagChangeStr}`,
      };

    case 'CMP':
      return {
        title: `CMP ${dest}, ${src}`,
        what: `Compared ${dest} with ${srcVal || src}.`,
        changes: `Registers unchanged (${dest} remains ${destVal}). Flags updated: ${flagStatusStr}.`,
        why: `CMP performs a temporary subtraction (${dest} - ${srcVal || src}) and sets CPU flags without storing the result. ${flagChangeStr}`,
      };

    case 'INC':
      return {
        title: `INC ${dest}`,
        what: `Incremented ${dest} by 1.`,
        changes: `${dest} changed from ${prevDestVal} to ${destVal}. ${flagStatusStr}.`,
        why: 'ALU added 1 to destination. Note: INC updates ZF, SF, OF, but preserves the Carry Flag (CF).',
      };

    case 'DEC':
      return {
        title: `DEC ${dest}`,
        what: `Decremented ${dest} by 1.`,
        changes: `${dest} changed from ${prevDestVal} to ${destVal}. ${flagStatusStr}.`,
        why: 'ALU subtracted 1 from destination. Note: DEC updates ZF, SF, OF, but preserves the Carry Flag (CF).',
      };

    case 'MUL':
      return {
        title: `MUL ${dest || 'operand'}`,
        what: `Unsigned multiplication by ${dest || 'operand'}.`,
        changes: `AX = ${toHex4(regs.AX)}, DX = ${toHex4(regs.DX)}. CF=${flags.CF ? 1 : 0}, OF=${flags.OF ? 1 : 0}.`,
        why: 'ALU multiplied AX by the source operand. 16-bit multiplication places upper 16 bits in DX and lower 16 bits in AX.',
      };

    case 'DIV':
      return {
        title: `DIV ${dest || 'operand'}`,
        what: `Unsigned division by ${dest || 'operand'}.`,
        changes: `Quotient in AX = ${toHex4(regs.AX)}, Remainder in DX = ${toHex4(regs.DX)}.`,
        why: 'ALU divided DX:AX by operand. Arithmetic flags are undefined following DIV.',
      };

    case 'AND':
      return {
        title: `AND ${dest}, ${src}`,
        what: `Bitwise AND of ${dest} and ${srcVal || src}.`,
        changes: `${dest} is now ${destVal}. ${flagStatusStr}.`,
        why: 'Each bit is 1 only if corresponding bits in both operands are 1. CF and OF are cleared.',
      };

    case 'OR':
      return {
        title: `OR ${dest}, ${src}`,
        what: `Bitwise OR of ${dest} and ${srcVal || src}.`,
        changes: `${dest} is now ${destVal}. ${flagStatusStr}.`,
        why: 'Each bit is 1 if either bit in the operands is 1. CF and OF are cleared.',
      };

    case 'XOR':
      return {
        title: `XOR ${dest}, ${src}`,
        what: `Bitwise XOR of ${dest} and ${srcVal || src}.`,
        changes: `${dest} is now ${destVal}. ${flagStatusStr}.`,
        why: 'Each bit is 1 if exactly one operand bit is 1. If operands are identical, result is 0 and ZF=1.',
      };

    case 'NOT':
      return {
        title: `NOT ${dest}`,
        what: `Bitwise NOT (one's complement) of ${dest}.`,
        changes: `${dest} is now ${destVal} (all bits inverted). Flags unchanged.`,
        why: 'Every bit flipped (0 → 1, 1 → 0). NOT does not affect any CPU flags.',
      };

    case 'JMP':
      return {
        title: `JMP ${dest}`,
        what: `Unconditional jump to label ${dest}.`,
        changes: `Execution position branched to ${dest}. Flags unchanged.`,
        why: 'Unconditional transfer of interpreter control.',
      };

    case 'JZ':
    case 'JE': {
      const taken = flags.ZF;
      return {
        title: `${mnemonic} ${dest}`,
        what: `Jump if Zero / Equal (ZF=1).`,
        changes: taken ? `Branch TAKEN to ${dest} (ZF is 1).` : `Branch NOT taken; continued sequentially (ZF is 0).`,
        why: `Evaluated Zero Flag (ZF=${flags.ZF ? 1 : 0}).`,
      };
    }

    case 'JNZ':
    case 'JNE': {
      const taken = !flags.ZF;
      return {
        title: `${mnemonic} ${dest}`,
        what: `Jump if Not Zero / Not Equal (ZF=0).`,
        changes: taken ? `Branch TAKEN to ${dest} (ZF is 0).` : `Branch NOT taken; continued sequentially (ZF is 1).`,
        why: `Evaluated Zero Flag (ZF=${flags.ZF ? 1 : 0}).`,
      };
    }

    case 'JC':
    case 'JB': {
      const taken = flags.CF;
      return {
        title: `${mnemonic} ${dest}`,
        what: `Jump if Carry / Below (CF=1).`,
        changes: taken ? `Branch TAKEN to ${dest} (CF is 1).` : `Branch NOT taken (CF is 0).`,
        why: `Evaluated Carry Flag (CF=${flags.CF ? 1 : 0}).`,
      };
    }

    case 'JNC':
    case 'JAE': {
      const taken = !flags.CF;
      return {
        title: `${mnemonic} ${dest}`,
        what: `Jump if Not Carry / Above or Equal (CF=0).`,
        changes: taken ? `Branch TAKEN to ${dest} (CF is 0).` : `Branch NOT taken (CF is 1).`,
        why: `Evaluated Carry Flag (CF=${flags.CF ? 1 : 0}).`,
      };
    }

    case 'LOOP':
      return {
        title: `LOOP ${dest}`,
        what: `Loop iteration: decrement CX and branch if CX != 0.`,
        changes: `CX is now ${toHex4(regs.CX)}. ${regs.CX !== 0 ? 'Branch taken to ' + dest : 'Loop completed; sequential execution continues'}.`,
        why: 'Hardware loop instruction checks CX counter register.',
      };

    case 'PUSH':
      return {
        title: `PUSH ${dest}`,
        what: `Pushed ${dest} onto the stack.`,
        changes: `SP decremented by 2 (now ${toHex4(regs.SP)}). Word ${destVal} written to SS:SP.`,
        why: '8086 stack grows downward in memory towards lower addresses.',
      };

    case 'POP':
      return {
        title: `POP ${dest}`,
        what: `Popped word from the stack into ${dest}.`,
        changes: `${dest} loaded with ${destVal}. SP incremented by 2 (now ${toHex4(regs.SP)}).`,
        why: '8086 stack shrinks upward when popped.',
      };

    case 'INT':
      return {
        title: `INT ${dest}`,
        what: `Software interrupt call ${dest}.`,
        changes: 'Called system BIOS/DOS service.',
        why: `Triggered software interrupt handler for INT ${dest}.`,
      };

    case 'HLT':
      return {
        title: 'HLT',
        what: 'Halt CPU instruction execution.',
        changes: 'Program execution halted.',
        why: 'Execution reached end of program or explicit HLT.',
      };

    default:
      return {
        title: raw,
        what: `Executed: ${raw}`,
        changes: `Registers: ${dest ? `${dest}=${destVal}` : 'State updated'}. ${flagStatusStr}.`,
        why: 'State updated according to 8086 interpreter rules.',
      };
  }
}
