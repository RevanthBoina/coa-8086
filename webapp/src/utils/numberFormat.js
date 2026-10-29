/**
 * Number formatting utilities for 8086 Learning Lab
 * Supports HEX (hexadecimal), DEC (unsigned and signed decimal), and BIN (binary with nibble spacing)
 */

export function toHex4(val) {
  const safe = typeof val === 'number' && !isNaN(val) ? (val & 0xffff) >>> 0 : 0;
  return safe.toString(16).toUpperCase().padStart(4, '0') + 'h';
}

export function toHex2(val) {
  const safe = typeof val === 'number' && !isNaN(val) ? (val & 0xff) >>> 0 : 0;
  return safe.toString(16).toUpperCase().padStart(2, '0') + 'h';
}

export function toBin16(val) {
  const safe = typeof val === 'number' && !isNaN(val) ? (val & 0xffff) >>> 0 : 0;
  const bin = safe.toString(2).padStart(16, '0');
  return bin.match(/.{1,4}/g).join(' ');
}

export function toBin8(val) {
  const safe = typeof val === 'number' && !isNaN(val) ? (val & 0xff) >>> 0 : 0;
  const bin = safe.toString(2).padStart(8, '0');
  return bin.match(/.{1,4}/g).join(' ');
}

export function toDecUnsigned(val, isByte = false) {
  const mask = isByte ? 0xff : 0xffff;
  const safe = typeof val === 'number' && !isNaN(val) ? (val & mask) >>> 0 : 0;
  return safe.toString(10);
}

export function toDecSigned(val, isByte = false) {
  const mask = isByte ? 0xff : 0xffff;
  const safe = typeof val === 'number' && !isNaN(val) ? (val & mask) >>> 0 : 0;
  if (isByte) {
    return safe > 127 ? (safe - 256).toString(10) : safe.toString(10);
  } else {
    return safe > 32767 ? (safe - 65536).toString(10) : safe.toString(10);
  }
}

/**
 * Format a register value based on the selected radix
 * @param {number} val 
 * @param {'HEX'|'DEC'|'BIN'} radix 
 * @param {boolean} isByte 
 * @returns {string}
 */
export function formatValue(val, radix = 'HEX', isByte = false) {
  switch (radix) {
    case 'BIN':
      return isByte ? toBin8(val) : toBin16(val);
    case 'DEC':
      return toDecUnsigned(val, isByte);
    case 'HEX':
    default:
      return isByte ? toHex2(val) : toHex4(val);
  }
}

/**
 * Calculate physical address from segment and offset with 20-bit wraparound
 * Physical Address = (Segment * 16 + Offset) & 0xFFFFF
 */
export function calculatePhysicalAddress(segment, offset) {
  const seg = (segment || 0) & 0xffff;
  const off = (offset || 0) & 0xffff;
  return ((seg * 16 + off) & 0xfffff) >>> 0;
}
