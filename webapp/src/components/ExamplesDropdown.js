import React, { useState } from 'react';

export default function ExamplesDropdown({ onSelectExample, onError }) {
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = async (e) => {
    const val = e.target.value;
    if (!val) return;
    setSelected(val);
    setLoading(true);

    const label = e.target.options[e.target.selectedIndex]?.text || val;
    try {
      const publicUrl = process.env.PUBLIC_URL || '';
      let res = await fetch(`${publicUrl}/examples/${val}`);
      if (!res.ok) {
        res = await fetch(`/examples/${val}`);
      }
      if (!res.ok) {
        res = await fetch(`./examples/${val}`);
      }
      if (!res.ok) {
        throw new Error(`File ${val} could not be retrieved from example assets (HTTP ${res.status}).`);
      }
      const code = await res.text();
      if (onSelectExample) {
        onSelectExample(code, label);
      }
    } catch (err) {
      console.error('Failed to load example:', err);
      if (onError) {
        onError(`Failed to load example "${label}": ${err.message}`);
      } else {
        alert(`Failed to load example "${label}". Please check your network or try another example.`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="examples-dropdown-container"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        marginRight: '12px',
      }}
    >
      <label
        htmlFor="example-select"
        style={{
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--text-color, inherit)',
          whiteSpace: 'nowrap',
        }}
      >
        📂 Load Example:
      </label>
      <select
        id="example-select"
        value={selected}
        onChange={handleChange}
        disabled={loading}
        style={{
          width: '230px',
          padding: '6px 10px',
          fontSize: '13px',
          borderRadius: '4px',
          border: '1px solid var(--border-color, #888)',
          backgroundColor: 'var(--bg-color, #fff)',
          color: 'var(--text-color, #222)',
          cursor: loading ? 'wait' : 'pointer',
        }}
      >
        <option value="" disabled>
          --Select Example--
        </option>
        <optgroup label="Group 1 — Basic">
          <option value="addition.s">Addition & Subtraction</option>
          <option value="data_transfer.s">Data Transfer & Addressing</option>
        </optgroup>
        <optgroup label="Group 2 — Math">
          <option value="factorial.s">Factorial (Recursion)</option>
          <option value="lcm_gcd.s">GCD & LCM</option>
          <option value="min_max.s">Min / Max of Array</option>
        </optgroup>
        <optgroup label="Group 3 — String & Array">
          <option value="hello_world.s">Hello World (String Print)</option>
          <option value="sort.s">Bubble Sort</option>
        </optgroup>
        <optgroup label="Group 4 — Advanced">
          <option value="macro.s">Macro Example</option>
          <option value="interrupt.s">Interrupts</option>
        </optgroup>
      </select>
    </div>
  );
}
