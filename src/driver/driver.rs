use super::error_helper::get_err_pos;
use super::util::{get_flags, get_reg, JSFlags, JSReg};
use lib8086::util::data_util::{get_byte_reg, set_byte_reg, ByteReg};
use lib8086::InterpreterContext;
use lib8086::LexerHelper;
use lib8086::PreprocessorOutput;
use lib8086::VM;
use lib8086::{get_flag_state, Flags, Interpreter, State};
use serde::Serialize;
use std::collections::HashMap;
use std::fmt::Write;
use wasm_bindgen::prelude::*;

#[derive(Serialize, Clone, Debug)]
pub struct MemChange {
    pub address: u32,
    pub value: u8,
}

#[allow(non_snake_case)]
#[derive(Serialize, Clone, Debug)]
pub struct RegistersSnapshot {
    pub AX: u16,
    pub BX: u16,
    pub CX: u16,
    pub DX: u16,
    pub SI: u16,
    pub DI: u16,
    pub SP: u16,
    pub BP: u16,
    pub CS: u16,
    pub DS: u16,
    pub SS: u16,
    pub ES: u16,
    pub IP: u16,
}

#[allow(non_snake_case)]
#[derive(Serialize, Clone, Debug)]
pub struct FlagsSnapshot {
    pub CF: bool,
    pub PF: bool,
    pub AF: bool,
    pub ZF: bool,
    pub SF: bool,
    pub TF: bool,
    pub IF: bool,
    pub DF: bool,
    pub OF: bool,
}

#[derive(Serialize, Clone, Debug)]
pub struct StateSnapshot {
    pub instruction: String,
    pub registers: RegistersSnapshot,
    pub flags: FlagsSnapshot,
    pub changed_memory: Vec<MemChange>,
}

#[wasm_bindgen]
pub struct WebDriver {
    pub line: usize,
    idx: usize,
    source_map: HashMap<usize, usize>,
    input: String,
    lh: LexerHelper,
    interpreter: Interpreter,
    processed_code: PreprocessorOutput,
    context: InterpreterContext,
    vm: VM,
    prev_memory: Vec<u8>,
    last_instruction: String,
    last_changed_memory: Vec<MemChange>,
}

#[wasm_bindgen]
pub struct InterpreterResult {
    pub halt: Option<bool>,
    pub int: Option<u8>,
    pub ah: Option<u8>,
}

impl InterpreterResult {
    pub fn new() -> Self {
        return InterpreterResult {
            halt: None,
            int: None,
            ah: None,
        };
    }
}

pub fn new_webdriver(
    idx: usize,
    line: usize,
    mut vm: VM,
    input: String,
    sm: HashMap<usize, usize>,
    lh: LexerHelper,
    out: PreprocessorOutput,
    ctx: InterpreterContext,
) -> WebDriver {
    let initial_memory = vm.mem.to_vec();
    vm.arch.ip = idx as u16;
    return WebDriver {
        line: line,
        idx: idx,
        input: input,
        lh: lh,
        processed_code: out,
        context: ctx,
        vm: vm,
        source_map: sm,
        interpreter: Interpreter::new(),
        prev_memory: initial_memory,
        last_instruction: String::new(),
        last_changed_memory: Vec::new(),
    };
}

#[wasm_bindgen]
impl WebDriver {
    pub fn next(&mut self) -> Result<InterpreterResult, JsValue> {
        let executed_inst = if self.idx < self.processed_code.code.len() {
            self.processed_code.code[self.idx].clone()
        } else {
            String::new()
        };

        let res = match self.interpreter.parse(
            self.idx,
            &mut self.vm,
            &mut self.context,
            &self.processed_code.code[self.idx],
        ) {
            Err(e) => {
                // should not reach here, as all error of syntax should have checked in preprocessor
                return Err(JsValue::from(
                    format!("Internal Error : Should not have reached here in interpreter parser\nError : {}",
                    e)
                ));
            }
            Ok(s) => match s {
                State::HALT => {
                    // stop and return
                    InterpreterResult {
                        halt: Some(true),
                        int: None,
                        ah: None,
                    }
                }
                State::PRINT => {
                    self.idx += 1;
                    self.set_line();
                    InterpreterResult::new()
                }
                State::JMP(next) => {
                    // jump to next commnand
                    self.idx = next;
                    self.set_line();
                    InterpreterResult::new()
                }
                State::NEXT => {
                    // we can do this without check, as we have inserted a 'hlt' in the code at end
                    self.idx += 1;
                    self.set_line();
                    InterpreterResult::new()
                }
                State::INT(int) => {
                    match int {
                        0 => {
                            // divide by 0 error
                            let pos = self.source_map.get(&self.idx).unwrap();
                            let (line, start, end) = get_err_pos(&self.lh, *pos);
                            self.idx += 1;
                            self.set_line();
                            self.record_step(executed_inst);
                            return Err(JsValue::from(format!(
                                "Attempt to divide by 0 : int 0 at line {} : {}",
                                line,
                                &self.input[start..end]
                            )));
                        }
                        0x3 => {
                            self.idx += 1;
                            self.set_line();
                            InterpreterResult {
                                halt: None,
                                int: Some(3),
                                ah: None,
                            }
                        }
                        0x10 => {
                            // BIOS interrupt
                            let ah = get_byte_reg(&self.vm, ByteReg::AH);
                            if ah != 0xA && ah != 0x13 {
                                let pos = self.source_map.get(&self.idx).unwrap();
                                let (line, start, end) = get_err_pos(&self.lh, *pos);
                                return Err(JsValue::from(format!(
                                    "Error at line {} : {}, value of AH = {} is not supported for int 0x10",
                                    line,
                                    &self.input[start..end],
                                    ah
                                )));
                            }
                            self.idx += 1;
                            self.set_line();
                            InterpreterResult {
                                halt: None,
                                int: Some(10),
                                ah: Some(ah),
                            }
                        }
                        0x21 => {
                            // DOS interrupts
                            let ah = get_byte_reg(&self.vm, ByteReg::AH);
                            if ah != 0x1 && ah != 0x2 && ah != 0xA {
                                let pos = self.source_map.get(&self.idx).unwrap();
                                let (line, start, end) = get_err_pos(&self.lh, *pos);
                                return Err(JsValue::from(format!(
                                    "Error at line {} : {}, value of AH = {} is not supported for int 0x21",
                                    line,
                                    &self.input[start..end],
                                    ah
                                )));
                            }
                            self.idx += 1;
                            self.set_line();
                            InterpreterResult {
                                halt: None,
                                int: Some(21),
                                ah: Some(ah),
                            }
                        }
                        _ => {
                            return Err(JsValue::from(format!("Internal Error : Should not have reached here in interrupt parser\nError : int {} not supported",int)));
                        }
                    }
                }
                State::REPEAT => {
                    InterpreterResult::new()
                }
            },
        };

        self.record_step(executed_inst);
        Ok(res)
    }

    fn record_step(&mut self, executed_inst: String) {
        self.last_instruction = executed_inst;
        self.vm.arch.ip = self.idx as u16;
        let changed: Vec<MemChange> = self.vm.mem
            .iter()
            .enumerate()
            .filter(|(i, &v)| v != self.prev_memory[*i])
            .map(|(i, &v)| MemChange { address: i as u32, value: v })
            .collect();
        self.prev_memory.copy_from_slice(self.vm.mem.as_ref());
        self.last_changed_memory = changed;
    }

    #[wasm_bindgen]
    pub fn get_state_snapshot(&self) -> JsValue {
        let snapshot = StateSnapshot {
            instruction: self.last_instruction.clone(),
            registers: RegistersSnapshot {
                AX: self.vm.arch.ax,
                BX: self.vm.arch.bx,
                CX: self.vm.arch.cx,
                DX: self.vm.arch.dx,
                SI: self.vm.arch.si,
                DI: self.vm.arch.di,
                SP: self.vm.arch.sp,
                BP: self.vm.arch.bp,
                CS: self.vm.arch.cs,
                DS: self.vm.arch.ds,
                SS: self.vm.arch.ss,
                ES: self.vm.arch.es,
                IP: self.vm.arch.ip,
            },
            flags: FlagsSnapshot {
                CF: get_flag_state(self.vm.arch.flag, Flags::CARRY),
                PF: get_flag_state(self.vm.arch.flag, Flags::PARITY),
                AF: get_flag_state(self.vm.arch.flag, Flags::AUX_CARRY),
                ZF: get_flag_state(self.vm.arch.flag, Flags::ZERO),
                SF: get_flag_state(self.vm.arch.flag, Flags::SIGN),
                TF: get_flag_state(self.vm.arch.flag, Flags::TRAP),
                IF: get_flag_state(self.vm.arch.flag, Flags::INTERRUPT),
                DF: get_flag_state(self.vm.arch.flag, Flags::DIRECTION),
                OF: get_flag_state(self.vm.arch.flag, Flags::OVERFLOW),
            },
            changed_memory: self.last_changed_memory.clone(),
        };
        JsValue::from_str(&serde_json::to_string(&snapshot).unwrap())
    }

    pub fn get_flags(&self) -> JSFlags {
        return get_flags(&self.vm);
    }

    pub fn get_reg(&self) -> JSReg {
        return get_reg(&self.vm);
    }

    pub fn get_mem(&self, start: usize, end: usize) -> Vec<u8> {
        return self.vm.mem[start..=end].iter().map(|v| *v).collect();
    }

    pub fn int_10(&self) -> JsValue {
        let ah = get_byte_reg(&self.vm, ByteReg::AH);
        let mut ret = String::new();
        if ah == 0xA {
            let al = get_byte_reg(&self.vm, ByteReg::AL);
            for _ in 0..self.vm.arch.cx {
                let _ = write!(&mut ret, "{}", al as char);
            }
        }
        if ah == 0x13 {
            // print a string
            let l = self.vm.arch.cx as usize; // length
            let dl = get_byte_reg(&self.vm, ByteReg::DL); // start col
            let start = self.vm.arch.es as usize * 0x10 + self.vm.arch.bp as usize;
            // pad till start col
            for _ in 0..dl {
                let _ = write!(&mut ret, " ");
            }
            // print actual string
            for i in 0..l {
                let _ = write!(&mut ret, "{}", self.vm.mem[start + i] as char);
            }
        }
        return JsValue::from(ret);
    }
    pub fn get_int_21(&mut self) -> JsValue {
        let ah = get_byte_reg(&self.vm, ByteReg::AH);
        // to print a single char
        let mut ret = String::new();
        if ah == 0x2 {
            let dl = get_byte_reg(&self.vm, ByteReg::DL);
            let _ = write!(&mut ret, "{}", dl as char);
            set_byte_reg(&mut self.vm, ByteReg::AL, dl);
        }
        return JsValue::from(ret);
    }

    pub fn set_int_21(&mut self, ip: String) {
        let ah = get_byte_reg(&self.vm, ByteReg::AH);
        if ah == 0x1 {
            // read the whole line
            // take the first byte, if nothing read, default to 0
            let byte = match ip.bytes().nth(0) {
                Some(a) => a,
                None => 0,
            };
            set_byte_reg(&mut self.vm, ByteReg::AL, byte);
        }

        if ah == 0xA {
            // read line
            // storage address
            let start = self.vm.arch.ds as usize * 0x10 + self.vm.arch.dx as usize;
            // how many are actually supposed to read
            let required = self.vm.mem[start] as usize;
            let max: u8;
            if ip.len() < required {
                max = ip.len() as u8;
                // store how many are read, skipping newline char
                self.vm.mem[start + 1] = max - 1;
            } else {
                max = required as u8;
                self.vm.mem[start + 1] = max;
            }
            // store the characters
            let mut ctr = 0;
            for i in ip.bytes() {
                self.vm.mem[start + 2 + ctr] = i;
                ctr += 1;
                if ctr == required {
                    break;
                }
            }
        }
    }

    fn set_line(&mut self) {
        match self.source_map.get(&(self.idx)) {
            Some(pos) => {
                let (line, _, _) = get_err_pos(&self.lh, *pos);
                self.line = line;
            }
            None => {}
        }
    }
}
