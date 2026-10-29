/**
 * EmulatorAdapter
 * Normalizes WASM driver interactions, errors, snapshots, and I/O.
 */

export class EmulatorAdapter {
  constructor(wasm) {
    this.wasm = wasm;
    this.driver = null;
    this.currentCode = '';
  }

  isLoaded() {
    return !!this.wasm;
  }

  /**
   * Preprocess and prepare assembly source code
   * @param {string} code 
   * @returns {{ success: boolean, driver?: any, baseline?: any, line?: number, error?: string }}
   */
  prepare(code) {
    if (!this.wasm) {
      return { success: false, error: 'WebAssembly engine is not loaded yet.' };
    }

    try {
      this.currentCode = code;
      const driver = this.wasm.preprocess(code);
      this.driver = driver;

      let baseline = null;
      try {
        const raw = driver.get_state_snapshot();
        baseline = JSON.parse(raw);
        baseline.isBaseline = true;
        baseline.instruction = 'Program Prepared (Initial State)';
        baseline.line = driver.line;
      } catch (snapErr) {
        console.warn('Could not read baseline snapshot:', snapErr);
      }

      return {
        success: true,
        driver,
        baseline,
        line: driver.line,
      };
    } catch (err) {
      const msg = typeof err === 'string' ? err : err.message || String(err);
      return {
        success: false,
        error: msg,
      };
    }
  }

  /**
   * Step single instruction
   */
  step() {
    if (!this.driver) {
      return { success: false, error: 'No program prepared. Please prepare code first.' };
    }

    try {
      const res = this.driver.next();
      const line = this.driver.line;

      let snapshot = null;
      try {
        const raw = this.driver.get_state_snapshot();
        snapshot = JSON.parse(raw);
        snapshot.line = line;
      } catch (snapErr) {
        console.warn('Could not read step snapshot:', snapErr);
      }

      const isHalted = res && res.halt === true;
      const intNum = res && res.int !== undefined ? res.int : null;
      const ahVal = res && res.ah !== undefined ? res.ah : null;

      return {
        success: true,
        result: res,
        snapshot,
        line,
        isHalted,
        intNum,
        ahVal,
      };
    } catch (err) {
      const msg = typeof err === 'string' ? err : err.message || String(err);
      return {
        success: false,
        error: msg,
      };
    }
  }

  /**
   * Get 128 bytes of memory starting at address
   */
  getMemory(startAddress, count = 128) {
    if (!this.driver) return new Array(count).fill(0);
    const start = Math.max(0, Math.min(startAddress, 1024 * 1024 - count));
    const end = start + count - 1;
    try {
      return this.driver.get_mem(start, end);
    } catch (err) {
      console.warn('Memory read error:', err);
      return new Array(count).fill(0);
    }
  }

  /**
   * Handle INT 10h output string
   */
  getInt10Output() {
    if (!this.driver) return '';
    try {
      return this.driver.int_10() || '';
    } catch (err) {
      console.warn('INT 10h read error:', err);
      return '';
    }
  }

  /**
   * Handle INT 21h char output
   */
  getInt21Output() {
    if (!this.driver) return '';
    try {
      return this.driver.get_int_21() || '';
    } catch (err) {
      console.warn('INT 21h read error:', err);
      return '';
    }
  }

  /**
   * Set INT 21h input string
   */
  setInt21Input(inputStr) {
    if (!this.driver) return;
    try {
      this.driver.set_int_21(inputStr);
    } catch (err) {
      console.warn('INT 21h write error:', err);
    }
  }

  reset() {
    this.driver = null;
  }
}

export default EmulatorAdapter;
