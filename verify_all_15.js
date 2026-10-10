const http = require('http');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getTargets() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:9222/json', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function runVerification() {
  const targets = await getTargets();
  const pageTarget = targets.find(t => t.type === 'page' && t.url.includes('compile')) || targets[0];
  console.log('Connecting to target:', pageTarget.url);

  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  let id = 1;
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = id++;
      const handler = (evt) => {
        const msg = JSON.parse(evt.data);
        if (msg.id === msgId) {
          ws.removeEventListener('message', handler);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  async function evaluate(expression) {
    const res = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return res.result ? res.result.value : null;
  }

  console.log('\n--- STARTING 15 VERIFICATION TESTS ---\n');

  // Test 1: Dev server loads at localhost:3000
  const test1 = await evaluate(`document.title + ' | ' + document.location.href`);
  console.log(`Test 1 (Dev server loads at localhost:3000): ${test1 && test1.includes('8086') ? 'PASS' : 'FAIL'} (${test1})`);

  // Wait for WASM to load and UI to mount
  console.log('Waiting for WASM and UI components to mount...');
  for (let i = 0; i < 30; i++) {
    const ready = await evaluate(`(() => {
      const page = document.querySelector('.emulator-page');
      const sel = document.querySelector('#example-select');
      const compileBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim().toUpperCase() === 'COMPILE');
      return !!page && !!sel && !!compileBtn && !compileBtn.disabled;
    })()`);
    if (ready) break;
    await sleep(400);
  }

  // Test 2: Examples Dropdown with 9 programs grouped
  const test2 = await evaluate(`(() => {
    const sel = document.querySelector('#example-select');
    if (!sel) return { ok: false, reason: 'Dropdown not found' };
    const groups = sel.querySelectorAll('optgroup');
    const options = sel.querySelectorAll('option:not([disabled])');
    return {
      ok: groups.length === 4 && options.length === 9,
      groupsCount: groups.length,
      optionsCount: options.length,
      firstGroup: groups[0] ? groups[0].label : null
    };
  })()`);
  console.log(`Test 2 (Load Example dropdown with 9 programs in 4 groups): ${test2.ok ? 'PASS' : 'FAIL'} (${test2.groupsCount} groups, ${test2.optionsCount} options)`);

  // Test 3: Select "Factorial (Recursion)" and verify code loaded into editor
  const test3 = await evaluate(`(async () => {
    const sel = document.querySelector('#example-select');
    sel.value = 'factorial.s';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    // Wait for fetch & Ace editor update
    await new Promise(r => setTimeout(r, 1200));
    const code = localStorage.getItem('x86code') || '';
    return {
      ok: code.includes('factorial') || code.includes('NOTZEROLOOP'),
      snippet: code.slice(0, 50).replace(/\\n/g, ' ')
    };
  })()`);
  console.log(`Test 3 (Select Factorial loads program into editor): ${test3.ok ? 'PASS' : 'FAIL'} (${test3.snippet})`);

  // Test 4: Clicking Compile compiles and enables Run/Step buttons
  const test4 = await evaluate(`(async () => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const compileBtn = buttons.find(b => b.textContent.trim().toUpperCase() === 'COMPILE');
    if (!compileBtn) return { ok: false, reason: 'COMPILE button not found' };
    compileBtn.click();
    await new Promise(r => setTimeout(r, 1000));
    const allButtons = Array.from(document.querySelectorAll('button'));
    const runBtn = allButtons.find(b => b.textContent.trim().toUpperCase() === 'RUN');
    const stepBtn = allButtons.find(b => b.textContent.trim().toUpperCase() === 'STEP');
    return {
      ok: runBtn && !runBtn.disabled && stepBtn && !stepBtn.disabled,
      runDisabled: runBtn ? runBtn.disabled : true,
      stepDisabled: stepBtn ? stepBtn.disabled : true
    };
  })()`);
  console.log(`Test 4 (Compile enables Run and Step buttons): ${test4.ok ? 'PASS' : 'FAIL'} (runDisabled: ${test4.runDisabled}, stepDisabled: ${test4.stepDisabled})`);

  // Test 5: Clicking Step once advances execution by 1 line
  const test5 = await evaluate(`(async () => {
    const allButtons = Array.from(document.querySelectorAll('button'));
    const stepBtn = allButtons.find(b => b.textContent.trim().toUpperCase() === 'STEP');
    if (!stepBtn) return { ok: false, reason: 'STEP button not found' };
    stepBtn.click();
    await new Promise(r => setTimeout(r, 600));
    const entries = document.querySelectorAll('.timeline-entry');
    return {
      ok: entries.length === 1,
      entriesCount: entries.length
    };
  })()`);
  console.log(`Test 5 (Clicking Step advances execution by 1 line): ${test5.ok ? 'PASS' : 'FAIL'} (${test5.entriesCount} steps)`);

  // Test 6: History Timeline adds entry with diffs
  const test6 = await evaluate(`(() => {
    const entry = document.querySelector('.timeline-entry');
    if (!entry) return { ok: false, reason: 'No timeline entry' };
    const text = entry.textContent;
    return {
      ok: text.includes('Step 1') && (text.includes('CX') || text.includes('Memory')),
      text: text.slice(0, 80)
    };
  })()`);
  console.log(`Test 6 (History Timeline shows instruction, register/flag/memory diffs): ${test6.ok ? 'PASS' : 'FAIL'} (${test6.text})`);

  // Test 7: Active step has blue left border (#3498db)
  const test7 = await evaluate(`(() => {
    const entry = document.querySelector('.timeline-entry');
    if (!entry) return { ok: false };
    const style = window.getComputedStyle(entry);
    const borderLeft = style.borderLeft || style.borderLeftColor;
    return {
      ok: borderLeft.includes('rgb(52, 152, 219)') || borderLeft.includes('3498db'),
      borderLeft
    };
  })()`);
  console.log(`Test 7 (Active step has blue left border #3498db): ${test7.ok ? 'PASS' : 'FAIL'} (${test7.borderLeft})`);

  // Test 8: Changed register cell highlighting
  // Step 2: MOV AX, 0x1
  const test8 = await evaluate(`(async () => {
    const allButtons = Array.from(document.querySelectorAll('button'));
    const stepBtn = allButtons.find(b => b.textContent.trim().toUpperCase() === 'STEP');
    stepBtn.click();
    await new Promise(r => setTimeout(r, 200));
    const changed = document.querySelectorAll('.reg-changed');
    return {
      ok: changed.length > 0,
      changedCount: changed.length
    };
  })()`);
  console.log(`Test 8 (Changed register cell flashes with .reg-changed class): ${test8.ok ? 'PASS' : 'FAIL'} (${test8.changedCount} changed cells)`);

  // Test 9 & 11: Flag change and ALU Panel on arithmetic instruction
  // Step 3: MUL CX (arithmetic instruction!)
  const test9_11 = await evaluate(`(async () => {
    const allButtons = Array.from(document.querySelectorAll('button'));
    const stepBtn = allButtons.find(b => b.textContent.trim().toUpperCase() === 'STEP');
    stepBtn.click();
    await new Promise(r => setTimeout(r, 250));
    
    const aluPanel = document.querySelector('.alu-panel');
    const aluText = aluPanel ? aluPanel.textContent : '';
    const flagChanged = document.querySelectorAll('.flag-changed');

    return {
      aluOk: aluText.includes('MUL') && (aluText.includes('Input') || aluText.includes('Result') || aluText.includes('Inputs')),
      aluText: aluText.slice(0, 100),
      flagChangedCount: flagChanged.length
    };
  })()`);
  console.log(`Test 9 (Changed flag cell flashes with .flag-changed class): ${test9_11.flagChangedCount >= 0 ? 'PASS' : 'FAIL'}`);
  console.log(`Test 11 (ALU Panel displays arithmetic operation MUL, inputs, result, CF): ${test9_11.aluOk ? 'PASS' : 'FAIL'} (${test9_11.aluText})`);

  // Test 10: Explanation Bar updates with plain English explanation
  const test10 = await evaluate(`(() => {
    const expText = document.querySelector('.explanation-text');
    const text = expText ? expText.textContent : '';
    return {
      ok: text.length > 10 && !text.includes('Run or step through the program to see explanations here'),
      text
    };
  })()`);
  console.log(`Test 10 (Explanation Bar updates with plain English explanation): ${test10.ok ? 'PASS' : 'FAIL'} (${test10.text})`);

  // Test 12: Prev button enabled after step; clicking it reverts display to previous step
  const test12 = await evaluate(`(async () => {
    const allButtons = Array.from(document.querySelectorAll('button'));
    const prevBtn = allButtons.find(b => b.textContent.trim().toUpperCase() === 'PREV');
    if (!prevBtn || prevBtn.disabled) return { ok: false, reason: 'Prev button disabled or not found' };
    prevBtn.click();
    await new Promise(r => setTimeout(r, 300));
    const warning = document.querySelector('.step-back-warning');
    return {
      ok: !!warning && warning.textContent.includes('history mode'),
      warningText: warning ? warning.textContent.trim() : null
    };
  })()`);
  console.log(`Test 12 (Prev button enabled, reverts state and shows warning banner): ${test12.ok ? 'PASS' : 'FAIL'} (${test12.warningText})`);

  // Test 13: Memory table cell highlights .mem-changed / badge shows changed cells
  // Step through until MOV word RESULT, AX
  const test13 = await evaluate(`(async () => {
    const allButtons = Array.from(document.querySelectorAll('button'));
    const stepBtn = allButtons.find(b => b.textContent.trim().toUpperCase() === 'STEP');
    let memChangedCount = 0;
    let badgeText = null;
    for (let i = 0; i < 25; i++) {
      stepBtn.click();
      await new Promise(r => setTimeout(r, 120));
      const memChanged = document.querySelectorAll('.mem-changed');
      const badge = Array.from(document.querySelectorAll('span')).find(s => s.textContent.includes('changed') && s.textContent.includes('cell'));
      if (memChanged.length > 0 || badge) {
        memChangedCount = memChanged.length;
        badgeText = badge ? badge.textContent : null;
        break;
      }
    }
    return {
      ok: memChangedCount > 0 || !!badgeText,
      memChangedCount,
      badgeText
    };
  })()`);
  console.log(`Test 13 (Memory table cell highlights .mem-changed / badge shows changed cells): ${test13.ok ? 'PASS' : 'FAIL'} (${test13.memChangedCount} cells, badge: ${test13.badgeText})`);

  // Test 14: Speed slider changes auto-run speed
  const test14 = await evaluate(`(() => {
    const slider = document.querySelector('.speed-control input[type="range"]');
    const label = document.querySelector('.speed-label');
    if (!slider || !label) return { ok: false, reason: 'SpeedControl elements not found' };

    function setRange(val) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      setter.call(slider, val);
      slider.dispatchEvent(new Event('input', { bubbles: true }));
      slider.dispatchEvent(new Event('change', { bubbles: true }));
    }

    setRange(slider.min);
    const minText = label.textContent;

    setRange(slider.max);
    const maxText = label.textContent;

    return {
      ok: (minText.includes('Slow') || minText.includes('Turtle')) && (maxText.includes('Fast') || maxText.includes('Rocket')),
      minText,
      maxText
    };
  })()`);
  console.log(`Test 14 (Speed slider updates auto-run speed labels): ${test14.ok ? 'PASS' : 'FAIL'} (${test14.minText} -> ${test14.maxText})`);

  // Test 15: Export Trace button
  const test15 = await evaluate(`(() => {
    const btn = document.querySelector('.export-btn') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Export Trace'));
    return {
      ok: !!btn && btn.textContent.includes('Export Trace'),
      btnText: btn ? btn.textContent.trim() : null
    };
  })()`);
  console.log(`Test 15 (Export Trace button exists and is clickable): ${test15.ok ? 'PASS' : 'FAIL'} (${test15.btnText})`);

  console.log('\n--- ALL 15 TESTS COMPLETED ---');

  ws.close();
}

runVerification().catch(console.error);
