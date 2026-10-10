function toHex(val) {
  if (val === undefined || val === null) return '0000';
  return (val & 0xffff).toString(16).toUpperCase().padStart(4, '0');
}

export function explainInstruction(snapshot, prevSnapshot) {
  if (!snapshot || !snapshot.instruction) {
    return 'Run or step through the program to see explanations here.';
  }

  const raw = snapshot.instruction.trim();
  if (!raw) {
    return 'Run or step through the program to see explanations here.';
  }

  // Parse mnemonic and operands
  const spaceIdx = raw.indexOf(' ');
  const mnemonic = (spaceIdx === -1 ? raw : raw.slice(0, spaceIdx)).toUpperCase().trim();
  const operandStr = spaceIdx === -1 ? '' : raw.slice(spaceIdx + 1).trim();

  const operands = operandStr
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const dest = operands[0] || '';
  const src = operands[1] || '';

  const regs = snapshot.registers || {};
  const flags = snapshot.flags || {};

  const dest_val = toHex(regs[dest] !== undefined ? regs[dest] : 0);
  let src_val = '';
  if (src) {
    if (regs[src] !== undefined) {
      src_val = toHex(regs[src]);
    } else {
      src_val = src.replace(/h$/i, '').toUpperCase().padStart(4, '0');
    }
  }

  const ZF = flags.ZF ? 1 : 0;
  const CF = flags.CF ? 1 : 0;
  const SF = flags.SF ? 1 : 0;
  const OF = flags.OF ? 1 : 0;
  const IP = toHex(regs.IP !== undefined ? regs.IP : 0);
  const SP = toHex(regs.SP !== undefined ? regs.SP : 0);
  const AX = toHex(regs.AX !== undefined ? regs.AX : 0);
  const DX = toHex(regs.DX !== undefined ? regs.DX : 0);

  // Determine if branch was taken
  let taken = 'taken';
  if (prevSnapshot && prevSnapshot.registers) {
    const prevIP = prevSnapshot.registers.IP || 0;
    const currentIP = regs.IP || 0;
    // Sequential execution usually advances IP by 1
    if (Math.abs(currentIP - prevIP) <= 1 && !flags.ZF) {
      taken = 'not taken';
    }
  }

  switch (mnemonic) {
    case 'MOV':
      return `${dest} was loaded with the value ${src_val}h. ${dest} is now ${dest_val}h.`;

    case 'ADD':
      return `Added ${src_val}h to ${dest}. Result: ${dest} = ${dest_val}h. ZF=${ZF} (1=zero result) CF=${CF} (1=overflow occurred).`;

    case 'SUB':
      return `Subtracted ${src_val}h from ${dest}. Result: ${dest} = ${dest_val}h. ZF=${ZF} CF=${CF}.`;

    case 'MUL':
      return `Multiplied AX by ${src_val || dest_val}h. Result stored in DX:AX = ${DX}:${AX}h.`;

    case 'DIV':
      return `Divided DX:AX by ${src_val || dest_val}h. Quotient in AX = ${AX}h. Remainder in DX = ${DX}h.`;

    case 'AND':
      return `Bitwise AND of ${dest} and ${src_val}h. Result: ${dest} = ${dest_val}h. ZF=${ZF}.`;

    case 'OR':
      return `Bitwise OR of ${dest} and ${src_val}h. Result: ${dest} = ${dest_val}h.`;

    case 'XOR':
      return `Bitwise XOR of ${dest} and ${src_val}h. Result: ${dest} = ${dest_val}h. ZF=${ZF} (1 means operands were equal).`;

    case 'NOT':
      return `Bitwise NOT applied to ${dest}. All bits flipped. Result: ${dest_val}h.`;

    case 'INC':
      return `${dest} incremented by 1. New value: ${dest_val}h.`;

    case 'DEC':
      return `${dest} decremented by 1. New value: ${dest_val}h.`;

    case 'CMP': {
      return `Compared ${dest} and ${src_val}h. No register changed. ZF=${ZF} (1=equal) CF=${CF} (1=${src || 'src'}>${dest}).`;
    }

    case 'JMP':
      return `Unconditional jump executed. IP (Program Counter) moved to ${IP}h.`;

    case 'JE':
    case 'JZ':
      return `Jump-if-Equal: ZF=${ZF}. Jump was ${taken}. IP is now ${IP}h.`;

    case 'JNE':
    case 'JNZ':
      return `Jump-if-Not-Equal: ZF=${ZF}. Jump was ${taken}. IP is now ${IP}h.`;

    case 'JG':
    case 'JNLE':
      return `Jump-if-Greater: ZF=${ZF} SF=${SF} OF=${OF}. Jump was ${taken}. IP is now ${IP}h.`;

    case 'JL':
    case 'JNGE':
      return `Jump-if-Less: SF≠OF → ${taken}. IP is now ${IP}h.`;

    case 'PUSH':
      return `Pushed ${src_val || dest_val}h onto the stack. SP decreased to ${SP}h.`;

    case 'POP':
      return `Popped value ${dest_val}h from stack into ${dest}. SP increased to ${SP}h.`;

    case 'CALL':
      return `Called procedure. Return address pushed to stack. SP = ${SP}h. IP = ${IP}h.`;

    case 'RET':
      return `Returned from procedure. Return address popped from stack. IP = ${IP}h.`;

    case 'SHL':
      return `${dest} shifted left by ${src_val || '1'} bits. Result: ${dest_val}h. CF=${CF}.`;

    case 'SHR':
      return `${dest} shifted right by ${src_val || '1'} bits. Result: ${dest_val}h. CF=${CF}.`;

    case 'NOP':
      return 'No operation. Nothing changed.';

    case 'HLT':
      return 'Halt instruction. Program stopped.';

    default:
      return `Executed: ${snapshot.instruction}`;
  }
}
