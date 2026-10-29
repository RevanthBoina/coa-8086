import React, { useState, useContext, useRef, useEffect } from "react";
import { CustomThemeContext } from "../themes/CustomThemeProvider";
import { useEmulator } from "../context/EmulatorContext";
import ExecutionToolbar from "../components/simulator/ExecutionToolbar";
import ExplanationCard from "../components/simulator/ExplanationCard";
import RegisterPanel from "../components/simulator/RegisterPanel";
import FlagsPanel from "../components/simulator/FlagsPanel";
import InspectorTabs from "../components/simulator/InspectorTabs";
// Ace Editor
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-assembly_x86";
import "ace-builds/src-noconflict/theme-dreamweaver";
import "ace-builds/src-noconflict/theme-twilight";
// Material UI
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";
import Textfield from "@material-ui/core/TextField";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableContainer from "@material-ui/core/TableContainer";
import TableRow from "@material-ui/core/TableRow";
import Paper from "@material-ui/core/Paper";
import Snackbar from "@material-ui/core/Snackbar";
import { makeStyles } from "@material-ui/core/styles";
import Tooltip from "@material-ui/core/Tooltip";
// Hotkeys
import Hotkeys from "react-hot-keys";
// Images
import { ReactComponent as DownloadButton } from "../images/download.svg";
import { ReactComponent as CopyIcon } from "../images/copy.svg";

const MEM_MAX = 16 * 8;
const MB = 1024 * 1024;
const ALLOWED_ADDRESS_MAX = MB - MEM_MAX - 1;

const useStyles = makeStyles((theme) => ({
  root: {
    marginTop: -20,
  },
  backdrop: {
    zIndex: theme.zIndex.drawer + 3,
    color: "#fff",
  },
  tutorialBackdrop: {
    zIndex: theme.zIndex.drawer + 1,
  },
  tooltips: {
    padding: "10px 15px 20px 15px",
  },
  loadingText: {
    paddingLeft: 20,
  },
  error: {
    color: "#dc2626",
    marginTop: 10,
    padding: 10,
    backgroundColor: "rgba(220, 38, 38, 0.08)",
    border: "1px solid rgba(220, 38, 38, 0.2)",
    borderRadius: 6,
    fontFamily: "monospace",
    fontSize: 13,
  },
  textF: {
    marginRight: 10,
  },
  snackbar: {
    fontWeight: "bold",
  },
  tutorialIcon: {
    position: "absolute",
    right: 158,
    top: 11,
  },
  cursor: {
    cursor: "pointer",
  },
  keyboardCMD: {
    backgroundColor: "#777777",
    borderRadius: "5px",
    padding: "3px",
  },
}));

let intervalHandler = null;

function convertArray(arr) {
  let newArr = [];
  while (arr.length) newArr.push(arr.splice(0, 16));
  return newArr;
}

function Compiler(props) {
  const {
    state: emulatorState,
    pushSnapshot,
    setBaseline,
    stepBack,
    returnToLive,
    resetHistory,
  } = useEmulator();

  const speedRef = useRef(emulatorState ? emulatorState.speed : 800);
  useEffect(() => {
    if (emulatorState) {
      speedRef.current = emulatorState.speed;
    }
  }, [emulatorState?.speed]);

  const [running, setRunning] = useState(false);
  const [needsPreparation, setNeedsPreparation] = useState(false);
  const [changedRegs, setChangedRegs] = useState({});
  const [changedFlags, setChangedFlags] = useState({});
  const [highlightedMem, setHighlightedMem] = useState(new Set());

  // Derive diffs whenever currentIndex changes
  useEffect(() => {
    if (!emulatorState || emulatorState.currentIndex < 0) {
      setChangedRegs({});
      setChangedFlags({});
      return;
    }
    const idx = emulatorState.currentIndex;
    const cur = emulatorState.history[idx];
    const prev = idx > 0 ? emulatorState.history[idx - 1] : null;

    if (!cur) return;

    if (prev) {
      const regDiff = {};
      const curRegs = cur.registers || {};
      const prevRegs = prev.registers || {};
      ['AX', 'BX', 'CX', 'DX', 'SP', 'BP', 'SI', 'DI', 'CS', 'DS', 'SS', 'ES'].forEach((r) => {
        if (curRegs[r] !== undefined && prevRegs[r] !== undefined && curRegs[r] !== prevRegs[r]) {
          regDiff[r] = true;
          if (r === 'AX') { regDiff.AH = true; regDiff.AL = true; }
          if (r === 'BX') { regDiff.BH = true; regDiff.BL = true; }
          if (r === 'CX') { regDiff.CH = true; regDiff.CL = true; }
          if (r === 'DX') { regDiff.DH = true; regDiff.DL = true; }
        }
      });

      const flagDiff = {};
      const curFlags = cur.flags || {};
      const prevFlags = prev.flags || {};
      ['CF', 'ZF', 'SF', 'OF', 'PF', 'AF', 'DF', 'IF', 'TF'].forEach((f) => {
        if (curFlags[f] !== undefined && prevFlags[f] !== undefined && curFlags[f] !== prevFlags[f]) {
          flagDiff[f] = true;
        }
      });

      setChangedRegs(regDiff);
      setChangedFlags(flagDiff);

      const timer = setTimeout(() => {
        setChangedRegs({});
        setChangedFlags({});
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [emulatorState?.currentIndex, emulatorState?.history.length]);

  // Flash changed memory
  useEffect(() => {
    if (!emulatorState || emulatorState.currentIndex < 0) {
      setHighlightedMem(new Set());
      return;
    }
    const cur = emulatorState.history[emulatorState.currentIndex];
    if (cur && cur.changed_memory && cur.changed_memory.length > 0) {
      const set = new Set(cur.changed_memory.map((c) => c.address));
      setHighlightedMem(set);

      const start = parseInt("0x" + startAddress) || 0;
      const firstChanged = cur.changed_memory[0].address;
      if (firstChanged < start || firstChanged >= start + MEM_MAX) {
        const newStart = Math.floor(firstChanged / MEM_MAX) * MEM_MAX;
        const newStartHex = newStart.toString(16).toUpperCase().padStart(5, "0");
        setStartAddress(newStartHex);
        if (driver) {
          try {
            const mem = driver.get_mem(newStart, newStart + MEM_MAX - 1);
            setMemory(convertArray(mem));
          } catch (e) {}
        }
      }

      const timer = setTimeout(() => setHighlightedMem(new Set()), 1500);
      return () => clearTimeout(timer);
    } else {
      setHighlightedMem(new Set());
    }
  }, [emulatorState?.currentIndex, emulatorState?.history.length]);

  const [saved, setSaved] = useState(false);
  let codeEditor = useRef(null);
  let compileRef = useRef(null);
  let runRef = useRef(null);
  let ramRef = useRef(null);
  let flagRef = useRef(null);
  let registerRef = useRef(null);
  let singleStepRef = useRef(null);
  let stopRef = useRef(null);
  let editorContainer = useRef(null);
  let downloadRef = useRef(null);
  let startAddressRef = useRef(null);
  const inputRef = useRef();

  const { currentTheme } = useContext(CustomThemeContext);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [openCopySnackbar, setOpenCopySnackbar] = useState(false);
  const [snackbarText, setSnackbarText] = useState("");
  const showSnackbar = (text) => {
    setSnackbarText(text);
    setOpenSnackbar(true);
    setTimeout(function () {
      setOpenSnackbar(false);
    }, 3000);
  };

  const classes = useStyles();
  const [halted, setHalted] = useState(false);
  const [memory, setMemory] = useState([
    ["00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00"],
    ["00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00"],
    ["00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00"],
    ["00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00"],
    ["00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00"],
    ["00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00"],
    ["00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00"],
    ["00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00"],
  ]);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [tutorial, setTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(-1);
  const [driver, setDriver] = useState(null);
  const [startAddress, setStartAddress] = useState("00000");
  const [compiled, setCompiled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState("");
  const [addressError, setAddressError] = useState("");
  const [errorAnnotations, setErrorAnnotations] = useState([]);

  const currentSnapshot = emulatorState && emulatorState.currentIndex >= 0
    ? emulatorState.history[emulatorState.currentIndex]
    : null;

  const [register, setRegister] = useState({
    ah: "00", al: "00", bh: "00", bl: "00", ch: "00", cl: "00", dh: "00", dl: "00",
    si: "0000", di: "0000", bp: "0000", sp: "0000", ss: "0000", ds: "0000", es: "0000",
  });
  const [flags, setFlags] = useState({
    of: 0, df: 0, if: 0, tf: 0, sf: 0, zf: 0, af: 0, pf: 0, cf: 0,
  });

  const displayRegister = currentSnapshot && currentSnapshot.registers ? {
    ah: (((currentSnapshot.registers.AX || 0) >> 8) & 0xff).toString(16).padStart(2, '0'),
    al: ((currentSnapshot.registers.AX || 0) & 0xff).toString(16).padStart(2, '0'),
    bh: (((currentSnapshot.registers.BX || 0) >> 8) & 0xff).toString(16).padStart(2, '0'),
    bl: ((currentSnapshot.registers.BX || 0) & 0xff).toString(16).padStart(2, '0'),
    ch: (((currentSnapshot.registers.CX || 0) >> 8) & 0xff).toString(16).padStart(2, '0'),
    cl: ((currentSnapshot.registers.CX || 0) & 0xff).toString(16).padStart(2, '0'),
    dh: (((currentSnapshot.registers.DX || 0) >> 8) & 0xff).toString(16).padStart(2, '0'),
    dl: ((currentSnapshot.registers.DX || 0) & 0xff).toString(16).padStart(2, '0'),
    sp: (currentSnapshot.registers.SP !== undefined ? currentSnapshot.registers.SP : 0).toString(16).padStart(4, '0'),
    bp: (currentSnapshot.registers.BP !== undefined ? currentSnapshot.registers.BP : 0).toString(16).padStart(4, '0'),
    si: (currentSnapshot.registers.SI !== undefined ? currentSnapshot.registers.SI : 0).toString(16).padStart(4, '0'),
    di: (currentSnapshot.registers.DI !== undefined ? currentSnapshot.registers.DI : 0).toString(16).padStart(4, '0'),
    ss: (currentSnapshot.registers.SS !== undefined ? currentSnapshot.registers.SS : 0).toString(16).padStart(4, '0'),
    ds: (currentSnapshot.registers.DS !== undefined ? currentSnapshot.registers.DS : 0).toString(16).padStart(4, '0'),
    es: (currentSnapshot.registers.ES !== undefined ? currentSnapshot.registers.ES : 0).toString(16).padStart(4, '0'),
  } : register;

  const displayFlags = currentSnapshot && currentSnapshot.flags ? {
    of: currentSnapshot.flags.OF ? 1 : 0,
    df: currentSnapshot.flags.DF ? 1 : 0,
    if: currentSnapshot.flags.IF ? 1 : 0,
    tf: currentSnapshot.flags.TF ? 1 : 0,
    sf: currentSnapshot.flags.SF ? 1 : 0,
    zf: currentSnapshot.flags.ZF ? 1 : 0,
    af: currentSnapshot.flags.AF ? 1 : 0,
    pf: currentSnapshot.flags.PF ? 1 : 0,
    cf: currentSnapshot.flags.CF ? 1 : 0,
  } : flags;

  const displayMemory = React.useMemo(() => {
    if (!memory || memory.length === 0) return [];
    if (!emulatorState || emulatorState.currentIndex < 0 || emulatorState.currentIndex >= emulatorState.history.length - 1) {
      return memory;
    }
    const start = parseInt("0x" + startAddress) || 0;
    const memCopy = memory.map((row) => [...row]);
    for (let i = emulatorState.history.length - 1; i > emulatorState.currentIndex; i--) {
      const snap = emulatorState.history[i];
      if (snap && snap.changed_memory) {
        for (const cm of snap.changed_memory) {
          if (cm.address >= start && cm.address < start + MEM_MAX) {
            const offset = cm.address - start;
            const r = Math.floor(offset / 16);
            const c = offset % 16;
            if (cm.before !== undefined && r >= 0 && r < memCopy.length && c >= 0 && c < 16) {
              memCopy[r][c] = cm.before.toString(16).padStart(2, "0").toUpperCase();
            }
          }
        }
      }
    }
    return memCopy;
  }, [memory, emulatorState?.currentIndex, emulatorState?.history, startAddress]);

  const handleStepForwardOrNext = () => {
    if (emulatorState && emulatorState.isHistorical) {
      returnToLive();
    } else {
      executeNext();
    }
  };

  const handleStepBack = () => {
    if (emulatorState && emulatorState.currentIndex > 0) {
      stepBack();
    }
  };

  const handleRun = () => {
    if (emulatorState && emulatorState.isHistorical) {
      returnToLive();
    }
    runCode();
  };

  const [code, setCode] = useState(
    localStorage.getItem("x86code") ||
    `; 8086 Learning Lab — Example Program
; Addition and Subtraction
start:
MOV AX, 0005h        ; Load 5 into AX
MOV BX, 0003h        ; Load 3 into BX
ADD AX, BX           ; AX = AX + BX (5 + 3 = 8)
SUB AX, 0002h        ; AX = AX - 2 (8 - 2 = 6)
HLT                  ; Halt execution`
  );

  const addAnnotation = (errorText) => {
    if (errorText === "") {
      setErrorAnnotations([]);
      return;
    }
    if (errorText.length > 30) {
      errorText = errorText.slice(0, errorText.indexOf(" ", 30)) + "...";
    }
    let re = new RegExp(/(?=(\d+))/);
    let rowNumber = 0;
    if (re.exec(errorText.slice(errorText.indexOf("at line "))) !== null) {
      rowNumber = re.exec(errorText.slice(errorText.indexOf("at line ")))[1] - 1;
      if (codeEditor.current && codeEditor.current.editor) {
        codeEditor.current.editor.focus();
        codeEditor.current.editor.gotoLine(rowNumber + 1);
      }
    }
    setErrorAnnotations([{ row: rowNumber, column: 0, type: "error", text: errorText }]);
  };

  const set8086State = (drv) => {
    let reg = drv.get_reg();
    let flg = drv.get_flags();
    let start = parseInt("0x" + startAddress);
    let mem = drv.get_mem(start, start + MEM_MAX - 1);
    setFlags({
      of: flg.of,
      df: flg.df,
      if: flg.iflag,
      tf: flg.tf,
      sf: flg.sf,
      zf: flg.zf,
      af: flg.af,
      pf: flg.pf,
      cf: flg.cf,
    });
    setMemory(convertArray(mem));
    setRegister({
      ah: reg.ah.toString(16).padStart(2, '0'),
      al: reg.al.toString(16).padStart(2, '0'),
      bh: reg.bh.toString(16).padStart(2, '0'),
      bl: reg.bl.toString(16).padStart(2, '0'),
      ch: reg.ch.toString(16).padStart(2, '0'),
      cl: reg.cl.toString(16).padStart(2, '0'),
      dh: reg.dh.toString(16).padStart(2, '0'),
      dl: reg.dl.toString(16).padStart(2, '0'),
      si: reg.si.toString(16).padStart(4, '0'),
      di: reg.di.toString(16).padStart(4, '0'),
      bp: reg.bp.toString(16).padStart(4, '0'),
      sp: reg.sp.toString(16).padStart(4, '0'),
      ss: reg.ss.toString(16).padStart(4, '0'),
      ds: reg.ds.toString(16).padStart(4, '0'),
      es: reg.es.toString(16).padStart(4, '0'),
    });
  };

  const compile = () => {
    if (props.wasm) {
      try {
        const currentCode = (codeEditor.current && codeEditor.current.editor)
          ? codeEditor.current.editor.getValue()
          : code;
        let drv = props.wasm.preprocess(currentCode);
        setDriver(drv);
        setLine(drv.line);
        setCompiled(true);
        setNeedsPreparation(false);
        showSnackbar("Compiled Successfully");
        setHalted(false);
        set8086State(drv);
        setErrors("");
        addAnnotation("");

        // Baseline step 0 snapshot
        try {
          const rawSnap = drv.get_state_snapshot();
          const snapshot = JSON.parse(rawSnap);
          setBaseline({
            ...snapshot,
            isBaseline: true,
            instruction: "Program Prepared (Baseline)",
            line: drv.line,
          });
        } catch (snapErr) {
          console.warn("Could not capture baseline snapshot:", snapErr);
        }
      } catch (e) {
        console.error("Compilation error in compile():", e);
        setCompiled(false);
        setHalted(true);
        showSnackbar("Error Occurred!");
        const errStr = typeof e === "string" ? e : (e.message || String(e));
        setErrors(errStr);
        addAnnotation(errStr);
      }

      localStorage.setItem("x86code", code);
    } else {
      setLoading(true);
    }
  };

  const setLine = (line) => {
    if (codeEditor.current && codeEditor.current.editor) {
      codeEditor.current.editor.gotoLine(line);
    }
  };

  const validateAndSetAddress = (address) => {
    if (!driver) {
      setAddressError("Compile Program Before Setting Memory");
      if (startAddressRef.current) startAddressRef.current.blur();
      return;
    }
    if (address === "") {
      setAddressError("");
      setStartAddress("");
      return;
    }
    let re = /^[0-9A-Fa-f]{1,5}$/g;
    if (re.test(address)) {
      if (parseInt("0x" + address) <= ALLOWED_ADDRESS_MAX) {
        setAddressError("");
        setStartAddress(address);
      } else {
        setAddressError(`Allowed: 0 to ${ALLOWED_ADDRESS_MAX.toString(16).toUpperCase()}h`);
      }
    } else {
      setAddressError("Hex digits (0-9, A-F) only");
    }
  };

  const saveAddress = () => {
    if (!driver) {
      setAddressError("Compile Program Before Setting Memory");
      if (startAddressRef.current) startAddressRef.current.blur();
      return;
    }
    if (addressError !== "" || startAddress === "") {
      showSnackbar("Invalid Start Address");
    } else {
      let start = parseInt("0x" + startAddress);
      let mem = driver.get_mem(start, start + MEM_MAX - 1);
      setMemory(convertArray(mem));
      showSnackbar("Address Updated");
    }
  };

  const executeNext = () => {
    try {
      let res = driver.next();
      setLine(driver.line);
      try {
        const rawSnap = driver.get_state_snapshot();
        const snapshot = JSON.parse(rawSnap);
        pushSnapshot(snapshot);
      } catch (snapErr) {
        console.warn("Could not capture step snapshot:", snapErr);
      }

      set8086State(driver);
      if (res.halt !== undefined) {
        setHalted(true);
        stopCode();
        showSnackbar("Program Finished");
        return;
      }
      if (res.int !== undefined) {
        if (res.int === 10) {
          setOutput((prev) => prev + driver.int_10());
        } else if (res.int === 21) {
          if (res.ah === 1) {
            stopCode();
            showSnackbar("Waiting for character input...");
            if (inputRef.current) inputRef.current.focus();
          } else if (res.ah === 2) {
            setOutput((prev) => prev + driver.get_int_21());
          } else if (res.ah === 10) {
            stopCode();
            showSnackbar("Waiting for line input...");
            if (inputRef.current) inputRef.current.focus();
          }
        }
      }
    } catch (e) {
      stopCode();
      const errStr = typeof e === "string" ? e : (e.message || String(e));
      setErrors(errStr);
      showSnackbar("Runtime Error Occurred");
    }
  };

  const startIntervalTask = () => {
    if (!driver) return;
    const currentSpeed = speedRef.current || 800;
    intervalHandler = setInterval(async () => {
      try {
        let res = driver.next();
        setLine(driver.line);
        try {
          const rawSnap = driver.get_state_snapshot();
          const snapshot = JSON.parse(rawSnap);
          pushSnapshot(snapshot);
        } catch (snapErr) {
          console.warn("Could not capture step snapshot:", snapErr);
        }
        set8086State(driver);

        if (res.halt !== undefined) {
          setHalted(true);
          stopCode();
          showSnackbar("Program Finished");
          return;
        }
        if (res.int !== undefined) {
          if (res.int === 10) {
            setOutput((prev) => prev + driver.int_10());
          } else if (res.int === 21) {
            if (res.ah === 1) {
              stopCode();
              showSnackbar("Waiting for character input...");
              if (inputRef.current) inputRef.current.focus();
            } else if (res.ah === 2) {
              setOutput((prev) => prev + driver.get_int_21());
            } else if (res.ah === 10) {
              stopCode();
              showSnackbar("Waiting for line input...");
              if (inputRef.current) inputRef.current.focus();
            }
          }
        }
      } catch (e) {
        stopCode();
        const errStr = typeof e === "string" ? e : (e.message || String(e));
        setErrors(errStr);
        showSnackbar("Runtime Error Occurred");
      }
    }, currentSpeed);
  };

  const runCode = () => {
    if (running) return;
    setRunning(true);
    startIntervalTask();
  };

  const stopCode = () => {
    if (intervalHandler) {
      clearInterval(intervalHandler);
      intervalHandler = null;
    }
    setRunning(false);
  };

  const resetAll = () => {
    stopCode();
    resetHistory();
    setDriver(null);
    setCompiled(false);
    setNeedsPreparation(false);
    setHalted(false);
    setErrors("");
    addAnnotation("");
    setOutput("");
    setInput("");
    showSnackbar("CPU state reset. Ready to prepare.");
  };

  const onChange = (newCode) => {
    setCode(newCode);
    if (compiled) {
      setNeedsPreparation(true);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 800);
    localStorage.setItem("x86code", newCode);
  };

  const handleSelectExample = (newCode, label) => {
    stopCode();
    setCode(newCode);
    if (codeEditor.current && codeEditor.current.editor) {
      codeEditor.current.editor.setValue(newCode, -1);
    }
    localStorage.setItem("x86code", newCode);
    resetHistory();
    setCompiled(false);
    setNeedsPreparation(false);
    setHalted(false);
    showSnackbar(`Loaded: ${label}`);
  };

  const handleInput = () => {
    if (driver) {
      driver.set_int_21(input);
      setInput("");
      runCode();
    }
  };

  const downloadCode = (codeToDownload) => {
    const el = document.createElement("a");
    const file = new Blob([codeToDownload], { type: "text/plain" });
    el.href = URL.createObjectURL(file);
    el.download = "program.s";
    document.body.appendChild(el);
    el.click();
    document.body.removeChild(el);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setOpenCopySnackbar(true);
    setTimeout(() => setOpenCopySnackbar(false), 2000);
  };

  const handleHotkeys = (keyName) => {
    if (keyName === "ctrl+shift+1") compile();
    if (keyName === "ctrl+shift+2" || keyName === "f8") handleStepForwardOrNext();
    if (keyName === "shift+f8") handleStepBack();
    if (keyName === "ctrl+shift+3") handleRun();
    if (keyName === "ctrl+shift+4") stopCode();
  };

  const currentLine = driver ? driver.line : 1;

  // Memory tab sub-component
  const memoryTabContent = (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Typography variant="subtitle1" style={{ fontWeight: 700 }}> Memory Table (16 Bytes/Row) </Typography>
          {highlightedMem.size > 0 && (
            <span
              style={{
                backgroundColor: "#f59e0b",
                color: "#000",
                fontSize: "12px",
                fontWeight: "bold",
                padding: "2px 8px",
                borderRadius: "12px",
              }}
            >
              {highlightedMem.size} cell{highlightedMem.size > 1 ? "s" : ""} changed
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Textfield
            inputRef={startAddressRef}
            error={!!addressError}
            size="small"
            value={startAddress}
            label="Start Address"
            onChange={(e) => validateAndSetAddress(e.target.value.toUpperCase())}
            helperText={addressError}
            className={classes.textF}
            placeholder="00000"
          />
          <Button variant="outlined" size="small" onClick={saveAddress}>
            Set Address
          </Button>
        </div>
      </div>

      <Paper elevation={2}>
        <TableContainer
          className={classes.ramTable}
          ref={ramRef}
          aria-describedby={tutorialStep === 7 ? "ram" : ""}
          component={Paper}
        >
          <Table padding="none" size="small" aria-label="ram memory table">
            <TableBody>
              {displayMemory.map((row, index1) => (
                <TableRow key={index1}>
                  {row.map((item, index2) => {
                    const startNum = parseInt("0x" + startAddress) || 0;
                    const cellAddr = startNum + index1 * 16 + index2;
                    const isChanged = highlightedMem.has(cellAddr);
                    const hexVal = (item || 0).toString(16).padStart(2, "0").toUpperCase();
                    return (
                      <TableCell
                        align="center"
                        key={index2}
                        className={`mem-cell ${isChanged ? "mem-changed" : ""}`}
                        style={{ fontFamily: 'monospace', fontSize: '13px', padding: '4px' }}
                      >
                        {hexVal}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </div>
  );

  // IO Tab sub-component
  const ioTabContent = (
    <div>
      <Typography variant="subtitle1" style={{ fontWeight: 700, marginBottom: 8 }}>
        Program Console & I/O
      </Typography>
      <Textfield
        label="Terminal Output"
        value={output || "(No console output yet)"}
        multiline
        rows={5}
        fullWidth
        disabled
        style={{
          fontFamily: "monospace",
          backgroundColor: currentTheme === "dark" ? "#0f172a" : "#f8fafc",
          borderRadius: 4,
          padding: 8,
        }}
      />
      <div style={{ marginTop: 12, display: 'flex', gap: '8px' }}>
        <Textfield
          label="Input Buffer (for INT 21h)"
          fullWidth
          value={input}
          onChange={(e) => setInput(e.target.value)}
          inputRef={inputRef}
          placeholder="Type input here and press Send"
        />
        <Button variant="contained" color="primary" onClick={handleInput}>
          Send
        </Button>
      </div>
    </div>
  );

  return (
    <div className="emulator-page">
      {/* Keyboard Shortcuts */}
      <Hotkeys keyName="f8" onKeyUp={(s, e) => handleHotkeys(s, e)} filter={() => true} />
      <Hotkeys keyName="shift+f8" onKeyUp={(s, e) => handleHotkeys(s, e)} filter={() => true} />
      <Hotkeys keyName="ctrl+shift+1" onKeyUp={(s, e) => handleHotkeys(s, e)} filter={() => true} />
      <Hotkeys keyName="ctrl+shift+2" onKeyUp={(s, e) => handleHotkeys(s, e)} filter={() => true} />
      <Hotkeys keyName="ctrl+shift+3" onKeyUp={(s, e) => handleHotkeys(s, e)} filter={() => true} />
      <Hotkeys keyName="ctrl+shift+4" onKeyUp={(s, e) => handleHotkeys(s, e)} filter={() => true} />
      <Hotkeys keyName="ctrl+enter" onKeyUp={() => compile()} filter={() => true} />

      {/* TOP TOOLBAR */}
      <div className="grid-area-toolbar">
        <ExecutionToolbar
          compiled={compiled}
          halted={halted}
          running={running}
          onCompile={compile}
          onRun={handleRun}
          onPause={stopCode}
          onStep={handleStepForwardOrNext}
          onPrev={handleStepBack}
          onReset={resetAll}
          onSelectExample={handleSelectExample}
          currentLine={currentLine}
          needsPreparation={needsPreparation}
        />
      </div>

      {/* EXPLANATION CARD */}
      <div className="grid-area-expbar">
        <ExplanationCard />
      </div>

      {/* LEFT COLUMN: CODE EDITOR */}
      <div className="grid-area-editor">
        {needsPreparation && (
          <div className="needs-prep-banner">
            <span>⚠️ Source code modified. Re-preparation required before executing.</span>
            <Button size="small" variant="outlined" color="inherit" onClick={compile} style={{ fontSize: '11px', height: '22px' }}>
              Compile Now
            </Button>
          </div>
        )}

        <Paper ref={editorContainer} elevation={3} style={{ position: "relative", borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', borderBottom: '1px solid rgba(128,128,128,0.2)' }}>
            <Typography variant="subtitle2" style={{ fontWeight: 700 }}>
              Assembly Program Editor
            </Typography>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {saved && (
                <span className="save-icon" style={{ display: 'flex', alignItems: 'center' }}>
                  <span className="loader"></span>
                  <span className="loader"></span>
                  <span className="loader"></span>
                </span>
              )}
              <div onClick={() => downloadCode(code)} ref={downloadRef} style={{ cursor: "pointer", display: 'flex', alignItems: 'center' }}>
                <Tooltip title="Download Source (.s)" arrow>
                  <DownloadButton style={{ width: 18, fill: currentTheme === "dark" ? "#ccc" : "black" }} />
                </Tooltip>
              </div>
              <div onClick={copyToClipboard} style={{ cursor: "pointer", display: 'flex', alignItems: 'center' }}>
                <Tooltip title="Copy Code" arrow>
                  <CopyIcon style={{ width: 18, fill: currentTheme === "dark" ? "#ccc" : "black" }} />
                </Tooltip>
              </div>
            </div>
          </div>

          <AceEditor
            ref={codeEditor}
            aria-describedby={tutorialStep === 0 ? "editor" : ""}
            mode="assembly_x86"
            height="50vh"
            width="100%"
            value={code}
            fontSize={14}
            showPrintMargin={false}
            theme={currentTheme === "normal" ? "dreamweaver" : "twilight"}
            onChange={onChange}
            name="CODE_EDITOR"
            editorProps={{ $blockScrolling: false }}
            showGutter={true}
            annotations={errorAnnotations}
            readOnly={false}
          />
        </Paper>

        {errors ? (
          <Paper className={classes.error} elevation={2}>
            <strong>Diagnostics / Error:</strong>
            <br />
            {typeof errors === "string" ? errors : (errors.message || String(errors))}
          </Paper>
        ) : null}
      </div>

      {/* RIGHT COLUMN: REGISTERS & FLAGS */}
      <div className="grid-area-regflags">
        <RegisterPanel
          liveRegisters={currentSnapshot ? currentSnapshot.registers : register}
          changedRegs={changedRegs}
          prevRegisters={emulatorState?.currentIndex > 0 ? emulatorState.history[emulatorState.currentIndex - 1]?.registers : {}}
        />
        <FlagsPanel
          liveFlags={currentSnapshot ? currentSnapshot.flags : flags}
          changedFlags={changedFlags}
          prevFlags={emulatorState?.currentIndex > 0 ? emulatorState.history[emulatorState.currentIndex - 1]?.flags : {}}
        />
      </div>

      {/* LOWER INSPECTOR TABS (HISTORY, MEMORY, STACK, ALU, IO) */}
      <div className="grid-area-inspector">
        <InspectorTabs
          memoryComponent={memoryTabContent}
          ioComponent={ioTabContent}
          memory={memory}
          liveRegisters={currentSnapshot ? currentSnapshot.registers : register}
          changedMemCount={highlightedMem.size}
        />
      </div>

      {/* SNACKBAR NOTIFICATIONS */}
      <Snackbar
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        open={openSnackbar}
        message={snackbarText}
        ContentProps={{ className: classes.snackbar }}
      />
      <Snackbar
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        open={openCopySnackbar}
        message="Copied to clipboard!"
      />
    </div>
  );
}

export default Compiler;
