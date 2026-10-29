# 8086 Learning Lab

> **Write assembly. Step through execution. Understand the CPU.**

An interactive, educational 8086 CPU execution workspace designed for Computer Organization & Architecture (COA) students and learners.

Repository: [https://github.com/RevanthBoina/coa-8086](https://github.com/RevanthBoina/coa-8086)  
Upstream Engine: [https://github.com/YJDoc2/8086-Emulator](https://github.com/YJDoc2/8086-Emulator)

---

## 🎯 Educational Overview & Scope

**8086 Learning Lab** turns assembly programming into a transparent learning loop: **write → prepare → step → observe changes → understand why → review history**.

### Key Architectural Notes
- **Educational Interpreter:** This workspace is an educational assembly interpreter and visual emulator. Assembly code is parsed, validated, and interpreted rather than assembled into binary machine code.
- **Execution Position:** The displayed execution position represents the interpreter's source line and instruction sequence index.
- **CPU Registers & Radix:** Inspect 16-bit registers (AX, BX, CX, DX, SP, BP, SI, DI, CS, DS, SS, ES) and 8-bit aliases (AH, AL, BH, BL, CH, CL, DH, DL) in **HEX**, unsigned/signed **DEC**, and **BIN** formats.
- **Status Flags:** Clear distinction between active flag state and transitions (CF, ZF, SF, OF, PF, AF, DF, IF, TF). Value 1 does not imply changed; transitions are explicitly tracked.
- **Read-Only History:** Step backward to inspect past states without corrupting live CPU execution.
- **ALU Breakdown:** Verified breakdown for ADD, SUB, CMP, AND, OR, XOR, INC, DEC, NOT, and MUL/DIV with implicit operands. Unsupported or complex memory operations explicitly report "Detailed breakdown unavailable" rather than guessing zeroes.
- **Memory & Stack Inspectors:** 20-bit physical address derivation `(Segment × 16 + Offset) & 0xFFFFF` with 16-byte/row RAM view and word-aligned little-endian stack inspector.
- **Trace Export:** Export execution traces in formatted Text, versioned JSON (schema 1.0.0), or formula-safe CSV.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js:** v18+ or v20+
- **Rust toolchain:** `rustc`, `cargo`, `wasm-pack` (if building WASM from source)

### Building and Running
1. **Build the WASM Driver (if modifying Rust engine):**
   ```sh
   wasm-pack build --target web --out-dir pkg
   ```
2. **Start the Frontend:**
   ```sh
   cd webapp
   npm install
   npm start
   ```
   The application will open at `http://localhost:3000/8086-emulator-web/compile`.

3. **Build for Production:**
   ```sh
   cd webapp
   npm run build
   ```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + Enter` | Prepare / Assemble program |
| `F8` or `Ctrl + Shift + 2` | Step single instruction |
| `Shift + F8` | View previous recorded step (History) |
| `Ctrl + Shift + 3` | Run automated execution |
| `Ctrl + Shift + 4` | Pause execution |
| `Alt + Z` | Jump to code editor |

---

## 📁 Repository Structure

```text
.
├── src/                    # Rust WebAssembly driver
│   ├── driver/             # Driver implementation & state snapshots
│   ├── util.rs             # Error handling & panic hooks
│   └── lib.rs              # WASM bindings
├── webapp/                 # React 17 + Material-UI Frontend
│   ├── public/             # Static assets and curated assembly examples
│   └── src/
│       ├── components/     # UI components (Toolbar, Registers, Flags, Tabs, ALU)
│       │   └── simulator/  # Modular simulator panels
│       ├── context/        # EmulatorContext (state, history, cursor)
│       ├── hooks/          # useExecutionController
│       ├── services/       # EmulatorAdapter (WASM abstraction)
│       ├── utils/          # numberFormat, instructionSemantics, traceSelectors
│       └── pages/          # compiler, home, instructions
├── Cargo.toml              # Rust configuration
├── README.md               # Project documentation
└── verify_all_15.js        # Automated verification script
```

---

## 📜 License & Attribution

- Built upon the open-source 8086 web emulator by [YJDoc2](https://github.com/YJDoc2/8086-Emulator).
- Licensed under either of:
  - Apache License, Version 2.0 ([LICENSE_APACHE](LICENSE_APACHE))
  - MIT License ([LICENSE_MIT](LICENSE_MIT))
