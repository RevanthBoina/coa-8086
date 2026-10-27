import React, { useState, useContext, useRef, useEffect } from "react";
import { CustomThemeContext } from "../themes/CustomThemeProvider";
import { useEmulator } from "../context/EmulatorContext";
import ExamplesDropdown from "../components/ExamplesDropdown";
import HistoryTimeline from "../components/HistoryTimeline";
import ExplanationBar from "../components/ExplanationBar";
import SpeedControl from "../components/SpeedControl";
import ALUPanel from "../components/ALUPanel";
import ExportButton from "../components/ExportButton";
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
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Backdrop from "@material-ui/core/Backdrop";
import Paper from "@material-ui/core/Paper";
import InputAdornment from "@material-ui/core/InputAdornment";
import IconButton from "@material-ui/core/IconButton";
import Snackbar from "@material-ui/core/Snackbar";
import CircularProgress from "@material-ui/core/CircularProgress";
import { makeStyles } from "@material-ui/core/styles";
import useMediaQuery from "@material-ui/core/useMediaQuery";
import Popover from "@material-ui/core/Popover";
import Tooltip from "@material-ui/core/Tooltip";
// Hotkeys
import Hotkeys from "react-hot-keys";
//

// Images
import help from "../images/help.png";
import { ReactComponent as DownloadButton } from "../images/download.svg";
import { ReactComponent as CopyIcon } from "../images/copy.svg";
import { ReactComponent as AccessibilityIcon } from "../images/accessibility.svg";
import AntSwitch from "../components/switch";

const MEM_MAX = 16 * 8;
const MB = 1024 * 1024;
const ALLOWED_ADDRESS_MAX = MB - MEM_MAX - 1; // -1 for zero based

function useNativeSpeechSynthesis() {
  const [voices, setVoices] = useState([]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return undefined;
    const updateVoices = () => setVoices(window.speechSynthesis.getVoices());
    updateVoices();
    window.speechSynthesis.addEventListener("voiceschanged", updateVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", updateVoices);
  }, []);

  const speak = ({ text, voice, r }) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    if (voice) utterance.voice = voice;
    utterance.rate = r || 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const cancel = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
  };

  return { speak, cancel, voices };
}

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
    paddingTop: 10,
    paddingBottom: 20,
    paddingLeft: 15,
    paddingRight: 15,
  },
  loadingText: {
    paddingLeft: 20,
  },
  flex: {
    display: "flex",
    flexWrap: "wrap",
  },
  segmentTable: {
    marginRight: 15,
    marginLeft: 15,
  },
  flagTable: {
    marginTop: 20,
    marginBottom: 10,
  },
  ramTable: {
    marginTop: 10,
  },
  error: {
    color: "red",
    marginTop: 10,
    padding: 10,
  },
  textF: {
    marginRight: 20,
  },
  runBtn: {
    border: " 1px solid #0f0 !important",
    color: "#0f0 !important",
    marginRight: 10,
  },
  nextBtn: {
    border: " 1px solid #77f !important",
    color: "#77f !important",
    marginRight: 10,
  },
  stopBtn: {
    border: " 1px solid red !important",
    color: "red !important",
    marginRight: 10,
  },
  compileButton: {
    minWidth: 120,
    marginRight: 10,
  },
  topBtn: {
    marginRight: 10,
  },
  spaceBelow: {
    marginBottom: 5,
  },
  snackbar: {
    fontWeight: "bold",
  },
  tutorialIcon: {
    position: "absolute",
    right: 158,
    top: 11,
  },
  hidden: {
    display: "none",
  },
  tableHead: {
    backgroundColor: theme.palette.common.black,
    color: theme.palette.common.white,
    fontWeight: "700",
  },
  flag: {
    paddingLeft: 10,
  },
  cursor: {
    cursor: "pointer",
  },
  keyboardCMD: {
    backgroundColor: '#777777',
    borderRadius: '5px',
    padding: '3px'
  }
}));

// These are used as global state holders for interval value and output values, as when running
// in interval Task, the interval Handler value is set to null when re rendering is done,
// and it does not get latest value of output either.
let intervalHandler = null;
let outputHolder = "";
//Compiler Page
function Compiler(props) {
  const matches = useMediaQuery("(max-width:1024px)");
  const {
    state: emulatorState,
    pushSnapshot,
    stepBack,
    stepForward,
    resetHistory,
  } = useEmulator();

  const speedRef = useRef(emulatorState ? emulatorState.speed : 800);
  useEffect(() => {
    if (emulatorState) {
      speedRef.current = emulatorState.speed;
    }
  }, [emulatorState?.speed]);

  const startIntervalTask = () => {
    if (intervalHandler !== null) {
      return;
    }
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
          console.error("Snapshot capture error in interval:", snapErr);
        }
        if (res.halt) {
          setCompiled(false);
          setHalted(true);
          showSnackbar("Execution Halted!");
          stopIntervalTask();
          if (accessibilityMode) {
            const voice = voices[1];
            const r = 2.5;
            speak({ text: "Execution Halted", voice, r });
          }
        }
        if (res.int) {
          if (res.int === 3) {
            // don't do anything here
            stopIntervalTask();
          }
          if (res.int === 10) {
            let out = outputHolder + "\n" + driver.int_10();
            outputHolder = out;
            setOutput(out);
          }
          if (res.int === 21) {
            if (res.ah === 2) {
              let out = outputHolder + "\n" + driver.get_int_21();
              outputHolder = out;
              setOutput(out);
            } else {
              stopIntervalTask();
              setHalted(true);
              showSnackbar("Please Give input for INT 21");
              if (accessibilityMode) {
                const voice = voices[1];
                const r = 2.5;
                speak({ text: "Please Give input for INT 21", voice, r });
              }
            }
          }
        }
        set8086State(driver);
      } catch (e) {
        setCompiled(false);
        setHalted(true);
        setErrors(e);
        stopIntervalTask();
      }
    }, currentSpeed);
  };

  const stopIntervalTask = () => {
    clearInterval(intervalHandler);
    intervalHandler = null;
  };

  const [changedRegs, setChangedRegs] = useState({});
  const [changedFlags, setChangedFlags] = useState({});
  const [highlightedMem, setHighlightedMem] = useState(new Set());

  const currentSnapshot = emulatorState && emulatorState.currentIndex >= 0
    ? emulatorState.history[emulatorState.currentIndex]
    : null;

  // Flash changed registers and flags
  useEffect(() => {
    if (!emulatorState || emulatorState.history.length === 0 || emulatorState.currentIndex < 0) {
      setChangedRegs({});
      setChangedFlags({});
      return;
    }
    const idx = emulatorState.currentIndex;
    const cur = emulatorState.history[idx];
    const prv = idx > 0 ? emulatorState.history[idx - 1] : null;

    if (cur && prv) {
      const regDiff = {};
      if (cur.registers && prv.registers) {
        const curAX = cur.registers.AX || 0;
        const prvAX = prv.registers.AX || 0;
        if ((curAX >> 8) !== (prvAX >> 8)) regDiff.AH = true;
        if ((curAX & 0xff) !== (prvAX & 0xff)) regDiff.AL = true;

        const curBX = cur.registers.BX || 0;
        const prvBX = prv.registers.BX || 0;
        if ((curBX >> 8) !== (prvBX >> 8)) regDiff.BH = true;
        if ((curBX & 0xff) !== (prvBX & 0xff)) regDiff.BL = true;

        const curCX = cur.registers.CX || 0;
        const prvCX = prv.registers.CX || 0;
        if ((curCX >> 8) !== (prvCX >> 8)) regDiff.CH = true;
        if ((curCX & 0xff) !== (prvCX & 0xff)) regDiff.CL = true;

        const curDX = cur.registers.DX || 0;
        const prvDX = prv.registers.DX || 0;
        if ((curDX >> 8) !== (prvDX >> 8)) regDiff.DH = true;
        if ((curDX & 0xff) !== (prvDX & 0xff)) regDiff.DL = true;

        ['SP', 'BP', 'SI', 'DI', 'SS', 'DS', 'ES', 'CS', 'IP'].forEach((k) => {
          if (cur.registers[k] !== prv.registers[k]) {
            regDiff[k] = true;
          }
        });
      }
      setChangedRegs(regDiff);

      const flagDiff = {};
      if (cur.flags && prv.flags) {
        Object.keys(cur.flags).forEach((k) => {
          if (cur.flags[k] !== prv.flags[k]) {
            flagDiff[k] = true;
          }
        });
      }
      setChangedFlags(flagDiff);

      const timer = setTimeout(() => {
        setChangedRegs({});
        setChangedFlags({});
      }, 1200);
      return () => clearTimeout(timer);
    } else if (cur && !prv) {
      const regDiff = {};
      if (cur.registers) {
        const curAX = cur.registers.AX || 0;
        if ((curAX >> 8) !== 0) regDiff.AH = true;
        if ((curAX & 0xff) !== 0) regDiff.AL = true;

        const curBX = cur.registers.BX || 0;
        if ((curBX >> 8) !== 0) regDiff.BH = true;
        if ((curBX & 0xff) !== 0) regDiff.BL = true;

        const curCX = cur.registers.CX || 0;
        if ((curCX >> 8) !== 0) regDiff.CH = true;
        if ((curCX & 0xff) !== 0) regDiff.CL = true;

        const curDX = cur.registers.DX || 0;
        if ((curDX >> 8) !== 0) regDiff.DH = true;
        if ((curDX & 0xff) !== 0) regDiff.DL = true;

        ['SP', 'BP', 'SI', 'DI', 'SS', 'DS', 'ES', 'CS', 'IP'].forEach((k) => {
          if (cur.registers[k] !== 0) regDiff[k] = true;
        });
        regDiff.IP = true;
      }
      setChangedRegs(regDiff);

      const flagDiff = {};
      if (cur.flags) {
        Object.keys(cur.flags).forEach((k) => {
          if (cur.flags[k]) {
            flagDiff[k] = true;
          }
        });
      }
      setChangedFlags(flagDiff);

      const timer = setTimeout(() => {
        setChangedRegs({});
        setChangedFlags({});
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [emulatorState?.currentIndex, emulatorState?.history.length]);

  // Flash changed memory and auto-scroll startAddress if needed
  useEffect(() => {
    if (!emulatorState || emulatorState.currentIndex < 0) {
      setHighlightedMem(new Set());
      return;
    }
    const cur = emulatorState.history[emulatorState.currentIndex];
    if (cur && cur.changed_memory && cur.changed_memory.length > 0) {
      const set = new Set(cur.changed_memory.map((c) => c.address));
      setHighlightedMem(set);

      // Auto-update Start Address if changed address is not visible
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
  const [halted, setHalted] = useState(false); // To check if compilation is halted, if this is true all buttons except compile are disabled
  const [memory, setMemory] = useState([
    [
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
    ],
    [
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
    ],
    [
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
    ],
    [
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
    ],
    [
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
    ],
    [
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
    ],
    [
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
    ],
    [
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
      "00",
    ],
  ]);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [tutorial, setTutorial] = useState(false); // To show backdrop for tutorial
  const [tutorialStep, setTutorialStep] = useState(-1); // To show backdrop for tutorial
  const [driver, setDriver] = useState(null); //To set driver
  const [startAddress, setStartAddress] = useState("00000"); //Start address of memory
  const [compiled, setCompiled] = useState(false); // To enable/disable Run, next and stop button
  const [loading, setLoading] = useState(false); //Backdrop
  const [errors, setErrors] = useState(""); // Post compilation errors are stored here
  const [addressError, setAddressError] = useState(""); // Stores error in address start format
  const [errorAnnotations, setErrorAnnotations] = useState([]); //For Error Annotations
  const [register, setRegister] = useState({
    ah: "00",
    al: "00",
    bh: "00",
    bl: "00",
    ch: "00",
    cl: "00",
    dh: "00",
    dl: "00",
    si: "0000",
    di: "0000",
    bp: "0000",
    sp: "0000",
    ss: "0000",
    ds: "0000",
    es: "0000",
  });
  const [flags, setFlags] = useState({
    of: 0,
    df: 0,
    if: 0,
    tf: 0,
    sf: 0,
    zf: 0,
    af: 0,
    pf: 0,
    cf: 0,
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
            if (r >= 0 && r < 8 && c >= 0 && c < 16) {
              memCopy[r][c] = cm.before;
            }
          }
        }
      }
    }
    return memCopy;
  }, [memory, emulatorState?.currentIndex, emulatorState?.history, startAddress]);

  const handleStepForwardOrNext = () => {
    if (emulatorState && emulatorState.currentIndex < emulatorState.history.length - 1) {
      stepForward();
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
    if (emulatorState && emulatorState.currentIndex < emulatorState.history.length - 1) {
      while (emulatorState.currentIndex < emulatorState.history.length - 1) {
        stepForward();
      }
    }
    runCode();
  };

  const [code, setCode] = useState(
    localStorage.getItem("x86code") ||
    `; Program to show use of interrupts
; Also, Hello World program !
hello: DB "Hello World" ; store string

; actual entry point of the program, must be present
start:
MOV AH, 0x13            ; move BIOS interrupt number in AH
MOV CX, 11              ; move length of string in cx
MOV BX, 0               ; mov 0 to bx, so we can move it to es
MOV ES, BX              ; move segment start of string to es, 0
MOV BP, OFFSET hello    ; move start offset of string in bp
MOV DL, 0               ; start writing from col 0
int 0x10                ; BIOS interrupt`
  ); //State to maintain the code string
  //To add an error annotation, call this function and pas row number (starts with 0), column number (starts with 0) and error text
  const [editorFocus, setEditorFocus] = useState(false);// To check if editor is in focus
  const [textReader, setTextReader] = useState("");// To store the text that will be spoken
  const [accessibilityMode, setAccessibilityMode] = useState(false);// Check if accessibility mode is on or off
  const { speak, cancel, voices } = useNativeSpeechSynthesis();//Speech synthesis hook


  const addAnnotation = (errorText) => {
    if (errorText === "") {
      setErrorAnnotations([]);
      return;
    }
    if (errorText.length > 30) {
      errorText = errorText.slice(0, errorText.indexOf(" ", 30)) + "...";
    }
    let re = new RegExp(/(?=(\d+))/); //to find digit
    let rowNumber = 0;
    if (re.exec(errorText.slice(errorText.indexOf("at line "))) !== null) {
      rowNumber =
        re.exec(errorText.slice(errorText.indexOf("at line ")))[1] - 1; //subtract 1 as index starts from 0
      codeEditor.current.editor.focus();
      codeEditor.current.editor.gotoLine(rowNumber + 1);
    }
    setErrorAnnotations((errorAnnotations) => [
      ...errorAnnotations,
      { row: rowNumber, column: 0, type: "error", text: errorText },
    ]);
  };

  //Uncomment below lines for Marker
  // const [markers, setMarkers] = useState([])
  // const addMarker = (startRowNumber, startColumnNumber, endRowNumber, endColumnNumber) => {
  // 	setMarkers(markers => [...markers, { startRow: startRowNumber, startCol: startColumnNumber, endRow: endRowNumber, endCol: endColumnNumber, className: 'error-marker', type: 'background' }])
  // }

  const set8086State = (driver) => {
    let reg = driver.get_reg();
    let flags = driver.get_flags();
    let start = parseInt("0x" + startAddress);
    let mem = driver.get_mem(start, start + MEM_MAX - 1);
    setFlags({
      of: flags.of,
      df: flags.df,
      if: flags.iflag,
      tf: flags.tf,
      sf: flags.sf,
      zf: flags.zf,
      af: flags.af,
      pf: flags.pf,
      cf: flags.cf,
    });
    setMemory(convertArray(mem));
    setRegister({
      ah: reg.ah.toString(16).padStart(2, 0),
      al: reg.al.toString(16).padStart(2, 0),
      bh: reg.bh.toString(16).padStart(2, 0),
      bl: reg.bl.toString(16).padStart(2, 0),
      ch: reg.ch.toString(16).padStart(2, 0),
      cl: reg.cl.toString(16).padStart(2, 0),
      dh: reg.dh.toString(16).padStart(2, 0),
      dl: reg.dl.toString(16).padStart(2, 0),
      si: reg.si.toString(16).padStart(4, 0),
      di: reg.di.toString(16).padStart(4, 0),
      bp: reg.bp.toString(16).padStart(4, 0),
      sp: reg.sp.toString(16).padStart(4, 0),
      ss: reg.ss.toString(16).padStart(4, 0),
      ds: reg.ds.toString(16).padStart(4, 0),
      es: reg.es.toString(16).padStart(4, 0),
    });
  };
  // Call when compiling the code
  const compile = () => {
    setInput("");
    setOutput("");
    clearTimeout();
    outputHolder = "";
    resetHistory();
    if (props.wasm) {
      try {
        const currentCode = (codeEditor.current && codeEditor.current.editor)
          ? codeEditor.current.editor.getValue()
          : code;
        let driver = props.wasm.preprocess(currentCode);
        setDriver(driver);
        setLine(driver.line);
        //	Compile code here
        setCompiled(true);
        showSnackbar("Compiled Sucessfully");
        setHalted(false);
        set8086State(driver);
        setErrors("");
        addAnnotation("");
        if (accessibilityMode) {
          const voice = voices[1]
          const r = 2.5;
          speak({ text: "Compiled Successfully", voice, r })
        }
      } catch (e) {
        console.error("Compilation error in compile():", e);
        setCompiled(false);
        setHalted(true);
        showSnackbar("Error Occured!");
        const errStr = typeof e === "string" ? e : (e.message || String(e));
        setErrors(errStr);
        addAnnotation(errStr);
        if (accessibilityMode) {
          const voice = voices[1]
          const r = 2.5;
          speak({ text: "Error Occured", voice, r })
        }
      }

      localStorage.setItem("x86code", code);
    } else {
      setLoading(true);
    }
  };

  // To set editor to highlight a line
  const setLine = (line) => {
    codeEditor.current.editor.gotoLine(line);
  };

  // Validate start address
  const validateAndSetAddress = (address) => {
    if (!driver) {
      setAddressError("Compile Program Before Setting Memory");
      startAddressRef.current.blur()
      return;
    }
    if (address === "") {
      setStartAddress("");
      return;
    }
    if (/^[0-9A-F]{0,5}$/.test(address)) {
      let start = parseInt("0x" + address);

      if (start > ALLOWED_ADDRESS_MAX) {
        setAddressError(
          "Must be between 00000 to " +
          ALLOWED_ADDRESS_MAX.toString(16).toUpperCase()
        );
        return;
      }
      setAddressError("");
      setStartAddress(address);
    } else {
      setStartAddress(startAddress);
      setAddressError("Must be between 00000 to FFF7F");
    }
  };

  // On change handler for set code editor
  const onChange = (newValue) => {
    setCode(newValue);
    localStorage.setItem("x86code", newValue);
    callAnimation();
  };
  //Auto Save
  const callAnimation = () => {
    if (!saved) setTimeout(() => saveValue(), 1000);
  };
  const saveValue = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };

  //called when you enter a start address and press set
  const saveAddress = () => {
    if (!addressError) {
      let start = parseInt("0x" + startAddress);
      let mem = driver.get_mem(start, start + MEM_MAX - 1);
      setMemory(convertArray(mem));
    }
  };

  //runs when you press RUN button
  const runCode = () => {
    startIntervalTask();
  };

  //runs when you press NEXT button
  const executeNext = () => {
    try {
      let res = driver.next();
      setLine(driver.line);
      try {
        const rawSnap = driver.get_state_snapshot();
        const snapshot = JSON.parse(rawSnap);
        pushSnapshot(snapshot);
      } catch (snapErr) {
        console.error("Snapshot capture error in step:", snapErr);
      }
      if (res.halt) {
        setCompiled(false);
        setHalted(true);
        showSnackbar("Execution Halted!");
        if (accessibilityMode) {
          const voice = voices[1]
          const r = 2.5;
          speak({ text: "Execution Halted", voice, r })
        }
      }
      if (res.int) {
        if (res.int === 3) {
          // don't do anything here
        }
        if (res.int === 10) {
          let out = outputHolder + "\n" + driver.int_10();
          outputHolder = out;
          setOutput(out);
        }
        if (res.int === 21) {
          if (res.ah === 2) {
            let out = outputHolder + "\n" + driver.get_int_21();
            outputHolder = out;
            setOutput(out);
          } else {
            setHalted(true);
            showSnackbar("Execution Halted!");
            if (accessibilityMode) {
              const voice = voices[1]
              const r = 2.5;
              speak({ text: "Execution Halted", voice, r })
            }
          }
        }
      }
      set8086State(driver);
    } catch (e) {
      console.log(e);
      setCompiled(false);
      setHalted(true);
      showSnackbar("Error Occured!");
      setErrors(e);
      addAnnotation(e);
    }
  };

  //runs when you press STOP button
  const stopCode = () => {
    stopIntervalTask();
  };

  //To set an input
  const handleInput = () => {
    if (halted && driver) {
      driver.set_int_21(input.slice(0));
      setHalted(false);
      showSnackbar("Click Run or Next to continue Execution");
      inputRef.current.blur();
      if (accessibilityMode) {
        const voice = voices[1]
        const r = 2.5;
        speak({ text: "Input submitted. Click Run or Next to continue Execution", voice, r })
      }
    }
  };

  const convertArray = (arr) => {
    let temp = [];
    let temp2d = [];
    arr.forEach((item, index) => {
      temp.push(item);
      if (index % 16 === 15) {
        temp2d.push(temp);
        temp = [];
      }
    });
    return temp2d;
  };

  const startTutorial = () => {
    setTutorial(true);
    setTutorialStep(0);
  };

  const nextTutorial = () => {
    if (tutorialStep === 8 || (matches && tutorialStep === 7)) {
      setTutorial(false);
      localStorage.setItem("tutorial", "done");
    }
    setTutorialStep(tutorialStep + 1);
  };

  //Function for downloading the code
  const downloadCode = (text) => {
    const element = document.createElement("a");
    const file = new Blob([code], {
      type: "text/plain;charset=utf-8",
    });
    element.href = URL.createObjectURL(file);
    element.download = "MyAssemblyCode.s";
    document.body.appendChild(element);
    element.click();
  };

  useEffect(() => {
    if (localStorage.getItem("tutorial") !== "done") {
      startTutorial();
    }
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(code)
      .then(() => {
        setOpenCopySnackbar(true);
        setTimeout(function () {
          setOpenCopySnackbar(false);
        }, 2000);
      })
      .catch((e) => console.error(e));
  };

  // Hotkeys
  const handleHotkeys = (s, e) => {
    if (s === "ctrl+shift+1") {
      compile();
    } else if (s === "ctrl+shift+2") {
      if (compiled) {
        executeNext();
      }
    } else if (s === "ctrl+shift+3") {
      if (compiled) {
        runCode();
      }
    } else if (s === "ctrl+shift+4") {
      stopCode();
      if (!compiled) {
        if (errors && errors.length) {
          codeEditor.current.editor.gotoLine(1);
          codeEditor.current.editor.focus();
        }
      }
    } else if (s === "ctrl+shift+5" || s === "cmd+shift+5") {
      handleInput()
    } else if (s === "ctrl+shift+6" || s === "cmd+shift+6") {
      startAddressRef.current.focus()
    } else if (s === "ctrl+shift+7" || s === "cmd+shift+7") {
      saveAddress()
    } else if (s === "alt+a") {
      handleAccessibilityMode()
    } else if (s === "alt+z") {
      codeEditor.current.editor.focus();
    } else if (s === "alt+i") {
      inputRef.current.focus();
    }
  };

  const handleAccessibilityMode = () => {
    setAccessibilityMode(!accessibilityMode);
  }

  const handleTextReader = (val, e) => {
    if (accessibilityMode && editorFocus) {
      console.log(val.doc.$lines[val.cursor.row], val.cursor.row);
      let text = val.doc.$lines[val.cursor.row];
      text = text.replace(/  +/g, ' '); // replace multiple spaces with single space
      setTextReader(text);
    } else {

    }
  };

  useEffect(() => {
    if (accessibilityMode) {
      const voice = voices[1];
      const r = 2.5;
      cancel();
      textReader
        .trim()
        .split("")
        .map((val) => {
          return speak({ text: val, voice, r });
        });
    }
  }, [textReader]);

  // If accessibilityMode toggle switched to off in between speaking then cancel the current operation
  useEffect(() => {
    if (!accessibilityMode) {
      cancel();
    } else {
      showSnackbar("Editor switched to Read-only mode!");
      const voice = voices[1]
      const r = 2.5;
      speak({ text: "Editor switched to Read-only mode", voice, r })
    }
  }, [accessibilityMode])


  // Tooltip title component
  const TooltipTitle = ({ content, cmd }) =>
    <p style={{ textAlign: 'center' }}>{content}<br />{cmd}</p>

  return (
    <div className={classes.root}>
      <div className={classes.chatbot}>
        <df-messenger
          intent="WELCOME"
          chat-title="8086-FAQ"
          agent-id="e8ee4339-e450-41f5-9715-d8f8b2aa45a1"
          language-code="en"
        ></df-messenger>
      </div>

      <Tooltip title="Tutorial" arrow>
        <IconButton
          onClick={() => startTutorial()}
          className={matches ? classes.hidden : classes.tutorialIcon}
          aria-label="Help Tutorial"
        >
          <img
            style={
              currentTheme === "dark"
                ? { filter: "invert(0.7)", height: "2rem" }
                : { height: "2rem", opacity: 0.4 }
            }
            src={help}
            alt="start tutorial"
          />
        </IconButton>
      </Tooltip>
      <Snackbar
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        open={openSnackbar}
        message={snackbarText}
        className={classes.snackbar}
      />
      <Snackbar
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        open={openCopySnackbar}
        message="Copied to Clipboard"
        className={classes.snackbar}
      />
      <Backdrop className={classes.backdrop} open={loading}>
        <CircularProgress color="inherit" />
        <h3 className={classes.loadingText}>Compiling</h3>
      </Backdrop>
      <Backdrop className={classes.tutorialBackdrop} open={tutorial}></Backdrop>
      <div className="emulator-page">
        {/* AREA 1: TOOLBAR */}
        <div className="grid-area-toolbar">
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
              <ExamplesDropdown
                onSelectExample={(newCode, label) => {
                  setCode(newCode);
                  if (codeEditor.current && codeEditor.current.editor) {
                    codeEditor.current.editor.setValue(newCode, -1);
                  }
                  localStorage.setItem("x86code", newCode);
                  resetHistory();
                  setCompiled(false);
                  setHalted(false);
                  showSnackbar(`Loaded: ${label}`);
                }}
              />
              <SpeedControl />
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginRight: '6px' }}>
                <Tooltip title={<TooltipTitle content={"Accessibility Mode"} cmd={"(Alt+a)"} />} arrow>
                  <Typography style={{ display: 'flex', alignItems: 'center' }}>
                    <AccessibilityIcon
                      style={{
                        fill: currentTheme === "dark" ? "#ccc" : "black",
                        marginRight: 4,
                      }}
                    />
                  </Typography>
                </Tooltip>
                <AntSwitch checked={accessibilityMode} inputProps={{ 'aria-label': 'Accessibility Mode' }} onChange={handleAccessibilityMode} />
              </div>

              {/* Hotkeys */}
              <Hotkeys keyName="ctrl+shift+1" onKeyUp={(s, e) => handleHotkeys(s, e)} filter={() => true} />
              <Hotkeys keyName="ctrl+shift+3" onKeyUp={(s, e) => handleHotkeys(s, e)} filter={() => true} />
              <Hotkeys keyName="ctrl+shift+2" onKeyUp={(s, e) => handleHotkeys(s, e)} filter={() => true} />
              <Hotkeys keyName="ctrl+shift+4" onKeyUp={(s, e) => handleHotkeys(s, e)} filter={() => true} />

              {/* Compile Button */}
              <Tooltip title={<TooltipTitle content={"Compile"} cmd={"(Ctrl+Shift+1 | Cmd+Shift+1)"} />} enterDelay={1000} arrow>
                <span>
                  <Button
                    aria-describedby={tutorialStep === 1 ? "compile" : ""}
                    variant="contained"
                    color="primary"
                    size="small"
                    ref={compileRef}
                    onClick={compile}
                    disabled={!props.wasm}
                    className={classes.compileButton}
                  >
                    COMPILE
                  </Button>
                </span>
              </Tooltip>

              {/* Run Button */}
              <Tooltip title={<TooltipTitle content={"Run"} cmd={"(Ctrl+Shift+3 | Cmd+Shift+3)"} />} enterDelay={1000} arrow>
                <span>
                  <Button
                    variant="outlined"
                    aria-describedby={tutorialStep === 2 ? "run" : ""}
                    size="small"
                    onClick={handleRun}
                    ref={runRef}
                    disabled={!compiled || halted}
                    className={compiled && !halted ? classes.runBtn : classes.topBtn}
                  >
                    Run
                  </Button>
                </span>
              </Tooltip>

              {/* Step / Next Button */}
              <Tooltip title={<TooltipTitle content={"Next"} cmd={"(Ctrl+Shift+2 | Cmd+Shift+2)"} />} enterDelay={1000} arrow>
                <span>
                  <Button
                    variant="outlined"
                    size="small"
                    ref={singleStepRef}
                    aria-describedby={tutorialStep === 3 ? "single_step" : ""}
                    onClick={handleStepForwardOrNext}
                    disabled={!compiled || halted}
                    className={compiled && !halted ? classes.nextBtn : classes.topBtn}
                  >
                    Step
                  </Button>
                </span>
              </Tooltip>

              {/* Prev Button (Step Backward) */}
              <Tooltip title={<p style={{ textAlign: 'center' }}>Step Backward<br />Revert to previous execution state</p>} enterDelay={1000} arrow>
                <span>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleStepBack}
                    disabled={!emulatorState || emulatorState.currentIndex <= 0}
                    className={classes.topBtn}
                  >
                    Prev
                  </Button>
                </span>
              </Tooltip>

              {/* Stop Button */}
              <Tooltip title={<TooltipTitle content={"Stop"} cmd={"(Ctrl+Shift+4 | Cmd+Shift+4)"} />} enterDelay={1000} arrow>
                <span>
                  <Button
                    variant="outlined"
                    size="small"
                    ref={stopRef}
                    aria-describedby={tutorialStep === 4 ? "stop" : ""}
                    onClick={stopCode}
                    disabled={!compiled || halted}
                    className={compiled && !halted ? classes.stopBtn : classes.topBtn}
                  >
                    Stop
                  </Button>
                </span>
              </Tooltip>

              {/* Reset Button */}
              <Tooltip title={<p style={{ textAlign: 'center' }}>Reset<br />Re-compile and reset execution to start</p>} enterDelay={1000} arrow>
                <span>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={compile}
                    disabled={!props.wasm}
                    className={classes.topBtn}
                  >
                    Reset
                  </Button>
                </span>
              </Tooltip>

              {/* Export Trace Button */}
              <ExportButton />
            </div>
          </div>

          {/* History Mode Warning Banner */}
          {emulatorState && emulatorState.history.length > 0 && emulatorState.currentIndex < emulatorState.history.length - 1 && (
            <div className="step-back-warning">
              <span>⚠️</span>
              <span>
                Viewing step {emulatorState.currentIndex + 1} of {emulatorState.history.length} (history mode). Press Run or Step to continue from here.
              </span>
            </div>
          )}

          {/* Tutorial Popovers for Buttons */}
          <Popover
            id={"compile"}
            open={tutorialStep === 1}
            anchorEl={compileRef.current}
            onClose={() => nextTutorial()}
            onClick={() => nextTutorial()}
            onKeyUp={(e) => { if (e.key === "Enter") nextTutorial(); }}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            transformOrigin={{ vertical: "top", horizontal: "center" }}
          >
            <Typography className={classes.tooltips} component="div">
              <b>Step 2</b><hr />Next, Compile the code.
            </Typography>
          </Popover>
          <Popover
            id={"run"}
            open={tutorialStep === 2}
            anchorEl={runRef.current}
            onClose={() => nextTutorial()}
            onClick={() => nextTutorial()}
            onKeyUp={(e) => { if (e.key === "Enter") nextTutorial(); }}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            transformOrigin={{ vertical: "top", horizontal: "center" }}
          >
            <Typography className={classes.tooltips} component="div">
              <b>Step 3</b><hr />Run the compiled code.
            </Typography>
          </Popover>
          <Popover
            id={"single_step"}
            open={tutorialStep === 3}
            anchorEl={singleStepRef.current}
            onClose={() => nextTutorial()}
            onClick={() => nextTutorial()}
            onKeyUp={(e) => { if (e.key === "Enter") nextTutorial(); }}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            transformOrigin={{ vertical: "top", horizontal: "center" }}
          >
            <Typography className={classes.tooltips} component="div">
              <b>Step 4</b><hr />Execute the next line of the instruction.
            </Typography>
          </Popover>
          <Popover
            id={"stop"}
            open={tutorialStep === 4}
            anchorEl={stopRef.current}
            onClose={() => nextTutorial()}
            onClick={() => nextTutorial()}
            onKeyUp={(e) => { if (e.key === "Enter") nextTutorial(); }}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            transformOrigin={{ vertical: "top", horizontal: "center" }}
          >
            <Typography className={classes.tooltips} component="div">
              <b>Step 5</b><hr />Halt the execution.
            </Typography>
          </Popover>
        </div>

        {/* AREA 2: EXPLANATION BAR */}
        <div className="grid-area-expbar">
          <ExplanationBar />
        </div>

        {/* AREA 3: CODE EDITOR */}
        <div className="grid-area-editor">
          <Paper
            ref={editorContainer}
            elevation={5}
            style={{
              position: "relative",
            }}
          >
            {/* Editor Header Toolbar (Download, Copy, AutoSave) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', borderBottom: '1px solid rgba(128,128,128,0.2)' }}>
              <Typography variant="subtitle1" style={{ fontWeight: '700' }}>
                Code Editor
              </Typography>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {saved && (
                  <span className="save-icon" style={{ display: 'flex', alignItems: 'center' }}>
                    <span className="loader"></span>
                    <span className="loader"></span>
                    <span className="loader"></span>
                  </span>
                )}
                <div
                  onClick={() => downloadCode(code)}
                  ref={downloadRef}
                  aria-describedby={tutorialStep === 8 ? "download_code" : ""}
                  style={{ cursor: "pointer", display: 'flex', alignItems: 'center' }}
                >
                  <Tooltip title="Download Code" arrow>
                    <DownloadButton
                      style={{
                        width: 20,
                        fill: currentTheme === "dark" ? "#ccc" : "black",
                      }}
                    />
                  </Tooltip>
                </div>
                <div
                  onClick={copyToClipboard}
                  style={{ cursor: "pointer", display: 'flex', alignItems: 'center' }}
                >
                  <Tooltip title="Copy to Clipboard" arrow>
                    <CopyIcon
                      style={{
                        width: 20,
                        fill: currentTheme === "dark" ? "#ccc" : "black",
                      }}
                    />
                  </Tooltip>
                </div>
              </div>
            </div>

            <Popover
              id={"downloadCode"}
              open={tutorialStep === 8}
              anchorEl={downloadRef.current}
              onClose={() => nextTutorial()}
              onClick={() => nextTutorial()}
              onKeyUp={(e) => { if (e.key === "Enter") nextTutorial(); }}
              anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
              transformOrigin={{ vertical: "top", horizontal: "center" }}
            >
              <Typography className={classes.tooltips} component="div">
                <b>Step 9</b><hr />Download Code from here
              </Typography>
            </Popover>

            <Hotkeys
              keyName="alt+z"
              onKeyUp={(s, e) => handleHotkeys(s, e)}
              filter={() => true}
            />
            <AceEditor
              ref={codeEditor}
              aria-describedby={tutorialStep === 0 ? "editor" : ""}
              mode="assembly_x86"
              height="52vh"
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
              readOnly={accessibilityMode}
              onCursorChange={(val, e) => handleTextReader(val, e)}
              onFocus={() => setEditorFocus(true)}
              onBlur={() => setEditorFocus(false)}
            />
          </Paper>

          <Popover
            id={"editor"}
            open={tutorialStep === 0}
            anchorEl={editorContainer.current}
            onClose={() => nextTutorial()}
            onClick={() => nextTutorial()}
            onKeyUp={(e) => { if (e.key === "Enter") nextTutorial(); }}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            transformOrigin={{ vertical: "top", horizontal: "center" }}
          >
            <Typography className={classes.tooltips} component="div">
              <b>Step 1</b><hr />Write your Code in the editor.<br />
              <b className={classes.keyboardCMD}>Alt+Shift+e</b> to focus on editor.
            </Typography>
          </Popover>

          {errors ? (
            <Paper className={classes.error} elevation={4}>
              Errors: <br />
              {typeof errors === "string" ? errors : (errors.message || String(errors))}
            </Paper>
          ) : (
            <div>
              <Hotkeys keyName="ctrl+shift+5" onKeyUp={(s, e) => handleHotkeys(s, e)} filter={() => true} />
              <Hotkeys keyName="alt+i" onKeyUp={(s, e) => handleHotkeys(s, e)} filter={() => true} />
              <Tooltip title={<TooltipTitle content={"Set Input"} cmd={"(Ctrl+Shift+5)"} />} enterDelay={1000}>
                <Textfield
                  label="Input"
                  fullWidth
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  style={{ marginTop: 8 }}
                  inputRef={inputRef}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title="Use this to submit your input on runtime" arrow placement="right">
                          <IconButton onClick={handleInput}>&#10003;</IconButton>
                        </Tooltip>
                      </InputAdornment>
                    ),
                  }}
                />
              </Tooltip>
              <Textfield
                label="Output"
                value={output}
                multiline
                fullWidth
                disabled
                style={{ marginTop: 6 }}
              />
            </div>
          )}
        </div>

        {/* AREA 4: EXECUTION HISTORY TIMELINE */}
        <div className="grid-area-history">
          <HistoryTimeline />
        </div>

        {/* AREA 5: REGISTERS + FLAGS */}
        <div className="grid-area-regflags">
          <Popover
            id={"register"}
            open={tutorialStep === 5}
            anchorEl={registerRef.current}
            onClose={() => nextTutorial()}
            onClick={() => nextTutorial()}
            onKeyUp={(e) => { if (e.key === "Enter") nextTutorial(); }}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            transformOrigin={{ vertical: "top", horizontal: "center" }}
          >
            <Typography className={classes.tooltips} component="div">
              <b>Step 6</b><hr />Check Registers values here.
            </Typography>
          </Popover>

          <div ref={registerRef} className={classes.flex} style={{ gap: '8px' }}>
            {/* General Purpose Registers */}
            <Paper elevation={3} style={{ flex: 1, minWidth: '120px' }}>
              <TableContainer component={Paper}>
                <Table size="small" aria-label="general registers table">
                  <TableHead>
                    <TableRow>
                      <TableCell className={classes.tableHead} style={{ width: "33%" }}>Reg</TableCell>
                      <TableCell className={classes.tableHead} style={{ width: "33%" }}>H</TableCell>
                      <TableCell className={classes.tableHead} style={{ width: "33%" }}>L</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell component="th" scope="row">A</TableCell>
                      <TableCell align="right" className={changedRegs.AH ? "reg-changed" : ""}>{displayRegister.ah}</TableCell>
                      <TableCell align="right" className={changedRegs.AL ? "reg-changed" : ""}>{displayRegister.al}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell component="th" scope="row">B</TableCell>
                      <TableCell align="right" className={changedRegs.BH ? "reg-changed" : ""}>{displayRegister.bh}</TableCell>
                      <TableCell align="right" className={changedRegs.BL ? "reg-changed" : ""}>{displayRegister.bl}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell component="th" scope="row">C</TableCell>
                      <TableCell align="right" className={changedRegs.CH ? "reg-changed" : ""}>{displayRegister.ch}</TableCell>
                      <TableCell align="right" className={changedRegs.CL ? "reg-changed" : ""}>{displayRegister.cl}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell component="th" scope="row">D</TableCell>
                      <TableCell align="right" className={changedRegs.DH ? "reg-changed" : ""}>{displayRegister.dh}</TableCell>
                      <TableCell align="right" className={changedRegs.DL ? "reg-changed" : ""}>{displayRegister.dl}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

            {/* Segment Registers */}
            <Paper elevation={3} style={{ flex: 1, minWidth: '100px' }}>
              <TableContainer>
                <Table size="small" aria-label="segment registers table">
                  <TableHead className={classes.tableHead}>
                    <TableRow>
                      <TableCell colSpan={2} className={classes.tableHead}>Segments</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell component="th" scope="row">
                        <Tooltip title="Stack Segment" arrow className={classes.cursor} placement="left">
                          <span>SS</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="right" className={changedRegs.SS ? "reg-changed" : ""}>{displayRegister.ss}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell component="th" scope="row">
                        <Tooltip title="Data Segment" arrow className={classes.cursor} placement="left">
                          <span>DS</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="right" className={changedRegs.DS ? "reg-changed" : ""}>{displayRegister.ds}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell component="th" scope="row">
                        <Tooltip title="Extra Segment" arrow className={classes.cursor} placement="left">
                          <span>ES</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="right" className={changedRegs.ES ? "reg-changed" : ""}>{displayRegister.es}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

            {/* Pointer Registers */}
            <Paper elevation={3} style={{ flex: 1, minWidth: '100px' }}>
              <TableContainer component={Paper}>
                <Table size="small" aria-label="pointer registers table">
                  <TableHead>
                    <TableRow>
                      <TableCell colSpan={2} className={classes.tableHead}>Pointers</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell component="th" scope="row">
                        <Tooltip title="Stack Pointer" arrow className={classes.cursor} placement="left">
                          <span>SP</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="right" className={changedRegs.SP ? "reg-changed" : ""}>{displayRegister.sp}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell component="th" scope="row">
                        <Tooltip title="Base Pointer" arrow className={classes.cursor} placement="left">
                          <span>BP</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="right" className={changedRegs.BP ? "reg-changed" : ""}>{displayRegister.bp}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell component="th" scope="row">
                        <Tooltip title="Source Index" arrow className={classes.cursor} placement="left">
                          <span>SI</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="right" className={changedRegs.SI ? "reg-changed" : ""}>{displayRegister.si}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell component="th" scope="row">
                        <Tooltip title="Destination Index" arrow className={classes.cursor} placement="left">
                          <span>DI</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="right" className={changedRegs.DI ? "reg-changed" : ""}>{displayRegister.di}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </div>

          {/* Flags Table */}
          <TableContainer
            className={classes.flagTable}
            aria-describedby={tutorialStep === 6 ? "flags" : ""}
            ref={flagRef}
            component={Paper}
            elevation={3}
            style={{ marginTop: 10 }}
          >
            <Table size="small" aria-label="flags table">
              <TableHead>
                <TableRow>
                  <TableCell component="th" colSpan="9" className={classes.tableHead}>
                    Flags:
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell component="th" scope="column" className={classes.cursor}>
                    <Tooltip title="Overflow Flag: Set if signed arithmetic overflow occurred (1: Overflow, 0: No overflow)" placement="top" arrow>
                      <span>OF</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell component="th" scope="column" className={classes.cursor}>
                    <Tooltip title="Direction Flag: String processing direction (1: Decrement / Down, 0: Increment / Up)" placement="top" arrow>
                      <span>DF</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell component="th" scope="column" className={classes.cursor}>
                    <Tooltip title="Interrupt Flag: Controls hardware interrupts (1: Enabled, 0: Disabled)" placement="top" arrow>
                      <span>IF</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell component="th" scope="column" className={classes.cursor}>
                    <Tooltip title="Trap Flag: Single-step debugging mode (1: Single-step enabled, 0: Normal)" placement="top" arrow>
                      <span>TF</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell component="th" scope="column" className={classes.cursor}>
                    <Tooltip title="Sign Flag: Set to most significant bit of result (1: Negative, 0: Positive/Zero)" placement="top" arrow>
                      <span>SF</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell component="th" scope="column" className={classes.cursor}>
                    <Tooltip title="Zero Flag: Set if arithmetic/logic result is zero (1: Result is zero, 0: Non-zero)" placement="top" arrow>
                      <span>ZF</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell component="th" scope="column" className={classes.cursor}>
                    <Tooltip title="Auxiliary Carry Flag: Carry from bit 3 to bit 4 for BCD (1: Aux carry, 0: None)" placement="top" arrow>
                      <span>AF</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell component="th" scope="column" className={classes.cursor}>
                    <Tooltip title="Parity Flag: Set if low byte has even number of 1s (1: Even parity, 0: Odd parity)" placement="top" arrow>
                      <span>PF</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell component="th" scope="column" className={classes.cursor}>
                    <Tooltip title="Carry Flag: Unsigned arithmetic carry or borrow (1: Carry/Borrow, 0: None)" placement="top" arrow>
                      <span>CF</span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell align="center" component="th" scope="row" className={`${classes.flag} ${changedFlags.OF ? "flag-changed" : ""}`}>
                    {displayFlags.of}
                  </TableCell>
                  <TableCell align="center" component="th" scope="row" className={`${classes.flag} ${changedFlags.DF ? "flag-changed" : ""}`}>
                    {displayFlags.df}
                  </TableCell>
                  <TableCell align="center" component="th" scope="row" className={`${classes.flag} ${changedFlags.IF ? "flag-changed" : ""}`}>
                    {displayFlags.if}
                  </TableCell>
                  <TableCell align="center" component="th" scope="row" className={`${classes.flag} ${changedFlags.TF ? "flag-changed" : ""}`}>
                    {displayFlags.tf}
                  </TableCell>
                  <TableCell align="center" component="th" scope="row" className={`${classes.flag} ${changedFlags.SF ? "flag-changed" : ""}`}>
                    {displayFlags.sf}
                  </TableCell>
                  <TableCell align="center" component="th" scope="row" className={`${classes.flag} ${changedFlags.ZF ? "flag-changed" : ""}`}>
                    {displayFlags.zf}
                  </TableCell>
                  <TableCell align="center" component="th" scope="row" className={`${classes.flag} ${changedFlags.AF ? "flag-changed" : ""}`}>
                    {displayFlags.af}
                  </TableCell>
                  <TableCell align="center" component="th" scope="row" className={`${classes.flag} ${changedFlags.PF ? "flag-changed" : ""}`}>
                    {displayFlags.pf}
                  </TableCell>
                  <TableCell align="center" component="th" scope="row" className={`${classes.flag} ${changedFlags.CF ? "flag-changed" : ""}`}>
                    {displayFlags.cf}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Popover
            id={"flags"}
            open={tutorialStep === 6}
            anchorEl={flagRef.current}
            onClose={() => nextTutorial()}
            onClick={() => nextTutorial()}
            onKeyUp={(e) => { if (e.key === "Enter") nextTutorial(); }}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            transformOrigin={{ vertical: "top", horizontal: "center" }}
          >
            <Typography className={classes.tooltips} component="div">
              <b>Step 7</b><hr />Check flags here
            </Typography>
          </Popover>
        </div>

        {/* AREA 6: ALU PANEL */}
        <div className="grid-area-alupanel">
          <ALUPanel />
        </div>

        {/* AREA 7: MEMORY VIEWER (RAM) */}
        <div className="grid-area-memory">
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Typography variant="h6" style={{ fontWeight: 700 }}> Memory </Typography>
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
              <Hotkeys keyName="ctrl+shift+6" onKeyUp={(s, e) => handleHotkeys(s, e)} />
              <Tooltip title={<TooltipTitle content={"Start Address"} cmd={"(Ctrl+Shift+6)"} />} enterDelay={1000}>
                <Textfield
                  inputRef={startAddressRef}
                  error={!!addressError}
                  size="small"
                  value={startAddress}
                  label="Start Address"
                  onChange={(e) => validateAndSetAddress(e.target.value.toUpperCase())}
                  helperText={addressError}
                  className={classes.textF}
                  placeholder="Start Address"
                />
              </Tooltip>

              <Hotkeys keyName="ctrl+shift+7" onKeyUp={(s, e) => handleHotkeys(s, e)} filter={() => true} />
              <Tooltip title={<TooltipTitle content={"Set the starting address for the below memory table"} cmd={"(Ctrl+Shift+7)"} />}>
                <Button variant="outlined" size="small" onClick={saveAddress}>
                  Set
                </Button>
              </Tooltip>
            </div>
          </div>

          <Paper elevation={4}>
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

          <Popover
            id={"ram"}
            open={tutorialStep === 7}
            anchorEl={ramRef.current}
            onClose={() => nextTutorial()}
            onClick={() => nextTutorial()}
            onKeyUp={(e) => { if (e.key === "Enter") nextTutorial(); }}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            transformOrigin={{ vertical: "top", horizontal: "center" }}
          >
            <Typography className={classes.tooltips} component="div">
              <b>Step 8</b><hr />Check RAM Memory here. You can also adjust the memory locations with the text field
            </Typography>
          </Popover>
        </div>
      </div>
    </div>
  );
}

export default Compiler;
