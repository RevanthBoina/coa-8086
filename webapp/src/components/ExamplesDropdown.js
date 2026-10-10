import React, { useState } from 'react';

export default function ExamplesDropdown({ onSelectExample }) {
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = async (e) => {
    const val = e.target.value;
    if (!val) return;
    setSelected(val);
    setLoading(true);

    try {
      const publicUrl = process.env.PUBLIC_URL || '';
      let res = await fetch(`${publicUrl}/examples/${val}`);
      if (!res.ok) {
        res = await fetch(`/examples/${val}`);
      }
      if (!res.ok) {
        res = await fetch(`./examples/${val}`);
      }
      const code = await res.text();
      if (onSelectExample) {
        onSelectExample(code);
      }
    } catch (err) {
      console.error('Failed to load example:', err);
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
          width: '220px',
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
        <optgroup label="Basic">
          <option value="addition.s">Addition</option>
          <option value="data_transfer.s">Data Transfer</option>
        </optgroup>
        <optgroup label="Math">
          <option value="factorial.s">Factorial</option>
          <option value="lcm_gcd.s">LCM and GCD</option>
          <option value="min_max.s">Min and Max</option>
        </optgroup>
        <optgroup label="String & Array">
          <option value="hello_world.s">Hello World</option>
          <option value="sort.s">Sort</option>
        </optgroup>
        <optgroup label="Advanced">
          <option value="macro.s">Macros</option>
          <option value="interrupt.s">Interrupts</option>
        </optgroup>
      </select>
    </div>
  );
}
