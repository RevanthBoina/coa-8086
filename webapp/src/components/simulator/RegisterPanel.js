import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import ButtonGroup from '@material-ui/core/ButtonGroup';
import Button from '@material-ui/core/Button';
import Tooltip from '@material-ui/core/Tooltip';
import Accordion from '@material-ui/core/Accordion';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import Chip from '@material-ui/core/Chip';
import { useEmulator } from '../../context/EmulatorContext';
import { formatValue, toDecSigned } from '../../utils/numberFormat';

const useStyles = makeStyles((theme) => ({
  root: {
    backgroundColor: theme.palette.type === 'dark' ? '#1e293b' : '#ffffff',
    border: `1px solid ${theme.palette.type === 'dark' ? '#334155' : '#e2e8f0'}`,
    borderRadius: '8px',
    padding: '14px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  title: {
    fontWeight: 700,
    fontSize: '15px',
    letterSpacing: '0.5px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
    marginBottom: '10px',
  },
  card: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: `1px solid ${theme.palette.type === 'dark' ? '#334155' : '#e2e8f0'}`,
    backgroundColor: theme.palette.type === 'dark' ? '#0f172a' : '#f8fafc',
    display: 'flex',
    flexDirection: 'column',
    transition: 'all 0.2s ease',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '12px',
    fontWeight: 600,
    color: theme.palette.type === 'dark' ? '#94a3b8' : '#64748b',
    marginBottom: '4px',
  },
  valRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    fontFamily: 'monospace',
  },
  regVal: {
    fontSize: '15px',
    fontWeight: 700,
    color: theme.palette.type === 'dark' ? '#f8fafc' : '#0f172a',
  },
  diffBadge: {
    fontSize: '10px',
    height: '18px',
    backgroundColor: '#bfdbfe',
    color: '#1e3a8a',
    fontWeight: 600,
  },
  accordion: {
    backgroundColor: 'transparent !important',
    boxShadow: 'none !important',
    border: `1px solid ${theme.palette.type === 'dark' ? '#334155' : '#e2e8f0'}`,
    borderRadius: '6px !important',
    marginTop: '8px !important',
    '&:before': {
      display: 'none',
    },
  },
  accordionSummary: {
    minHeight: '36px !important',
    padding: '0 12px !important',
    '& .MuiAccordionSummary-content': {
      margin: '6px 0 !important',
    },
  },
}));

const REGISTER_INFO = {
  AX: 'Accumulator Register: preferred for arithmetic, logic, and I/O operations.',
  BX: 'Base Register: commonly used as a base pointer for memory addressing.',
  CX: 'Count Register: hardware counter for loops, shifts, and string instructions.',
  DX: 'Data Register: used in multiplication, division, and I/O port addressing.',
  SP: 'Stack Pointer: points to the current top of the stack in SS.',
  BP: 'Base Pointer: typically points to stack frame base for local variables.',
  SI: 'Source Index: used as source pointer in string and memory operations.',
  DI: 'Destination Index: used as destination pointer in string/memory ops.',
  CS: 'Code Segment: base address of the executing program instructions.',
  DS: 'Data Segment: base address for program variables and memory data.',
  SS: 'Stack Segment: base address of the CPU runtime stack.',
  ES: 'Extra Segment: supplementary data segment commonly used for strings.',
  IP: 'Instruction Pointer: execution position (interpreter index).',
};

export default function RegisterPanel({ liveRegisters, changedRegs = {}, prevRegisters = {} }) {
  const classes = useStyles();
  const { state, setRadix } = useEmulator();
  const radix = state.radix || 'HEX';

  const currentSnapshot = state.currentIndex >= 0 && state.history[state.currentIndex];
  const regs = (currentSnapshot && currentSnapshot.registers) || liveRegisters || {};
  const prev = (state.currentIndex > 0 && state.history[state.currentIndex - 1]?.registers) || prevRegisters || {};

  const renderRegisterCard = (name, isByte = false) => {
    let val = 0;
    if (name === 'AH') val = (regs.AX >> 8) & 0xff;
    else if (name === 'AL') val = regs.AX & 0xff;
    else if (name === 'BH') val = (regs.BX >> 8) & 0xff;
    else if (name === 'BL') val = regs.BX & 0xff;
    else if (name === 'CH') val = (regs.CX >> 8) & 0xff;
    else if (name === 'CL') val = regs.CX & 0xff;
    else if (name === 'DH') val = (regs.DX >> 8) & 0xff;
    else if (name === 'DL') val = regs.DX & 0xff;
    else val = regs[name] !== undefined ? regs[name] : 0;

    let prevVal = val;
    if (prev) {
      if (name === 'AH') prevVal = (prev.AX >> 8) & 0xff;
      else if (name === 'AL') prevVal = prev.AX & 0xff;
      else if (name === 'BH') prevVal = (prev.BX >> 8) & 0xff;
      else if (name === 'BL') prevVal = prev.BL & 0xff;
      else if (name === 'CH') prevVal = (prev.CX >> 8) & 0xff;
      else if (name === 'CL') prevVal = prev.CL & 0xff;
      else if (name === 'DH') prevVal = (prev.DX >> 8) & 0xff;
      else if (name === 'DL') prevVal = prev.DL & 0xff;
      else if (prev[name] !== undefined) prevVal = prev[name];
    }

    const isChanged = changedRegs[name] || (prev && prevVal !== val);
    const formatted = formatValue(val, radix, isByte);
    const signedDec = toDecSigned(val, isByte);
    const info = REGISTER_INFO[name] || `${name} register`;

    return (
      <Tooltip
        key={name}
        title={
          <div>
            <div><strong>{name}</strong>: {info}</div>
            <div>Unsigned: {val} | Signed: {signedDec}</div>
            {isChanged && (
              <div style={{ color: '#93c5fd', marginTop: '4px' }}>
                Previous: {formatValue(prevVal, radix, isByte)} → {formatted}
              </div>
            )}
          </div>
        }
        arrow
      >
        <div className={`${classes.card} ${isChanged ? 'reg-changed' : ''}`}>
          <div className={classes.cardHeader}>
            <span>{name}</span>
            {isChanged && <Chip label="Changed" size="small" className={classes.diffBadge} />}
          </div>
          <div className={classes.valRow}>
            <span className={classes.regVal}>{formatted}</span>
            {isChanged && (
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                was {formatValue(prevVal, radix, isByte)}
              </span>
            )}
          </div>
        </div>
      </Tooltip>
    );
  };

  return (
    <Paper className={classes.root}>
      <div className={classes.header}>
        <Typography className={classes.title}>CPU Registers</Typography>
        <ButtonGroup size="small" variant="outlined">
          <Button
            variant={radix === 'HEX' ? 'contained' : 'outlined'}
            color={radix === 'HEX' ? 'primary' : 'default'}
            onClick={() => setRadix('HEX')}
          >
            HEX
          </Button>
          <Button
            variant={radix === 'DEC' ? 'contained' : 'outlined'}
            color={radix === 'DEC' ? 'primary' : 'default'}
            onClick={() => setRadix('DEC')}
          >
            DEC
          </Button>
          <Button
            variant={radix === 'BIN' ? 'contained' : 'outlined'}
            color={radix === 'BIN' ? 'primary' : 'default'}
            onClick={() => setRadix('BIN')}
          >
            BIN
          </Button>
        </ButtonGroup>
      </div>

      {/* Main General Purpose Registers */}
      <div className={classes.grid}>
        {renderRegisterCard('AX')}
        {renderRegisterCard('BX')}
        {renderRegisterCard('CX')}
        {renderRegisterCard('DX')}
      </div>

      {/* 8-bit Register Aliases */}
      <Accordion className={classes.accordion}>
        <AccordionSummary expandIcon={<span>▾</span>} className={classes.accordionSummary}>
          <Typography style={{ fontSize: '12px', fontWeight: 600 }}>8-Bit Aliases (H / L)</Typography>
        </AccordionSummary>
        <AccordionDetails style={{ padding: '8px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', width: '100%' }}>
            {renderRegisterCard('AH', true)}
            {renderRegisterCard('AL', true)}
            {renderRegisterCard('BH', true)}
            {renderRegisterCard('BL', true)}
            {renderRegisterCard('CH', true)}
            {renderRegisterCard('CL', true)}
            {renderRegisterCard('DH', true)}
            {renderRegisterCard('DL', true)}
          </div>
        </AccordionDetails>
      </Accordion>

      {/* Pointer & Index Registers */}
      <Accordion className={classes.accordion}>
        <AccordionSummary expandIcon={<span>▾</span>} className={classes.accordionSummary}>
          <Typography style={{ fontSize: '12px', fontWeight: 600 }}>Pointers & Index (SP, BP, SI, DI)</Typography>
        </AccordionSummary>
        <AccordionDetails style={{ padding: '8px' }}>
          <div className={classes.grid} style={{ width: '100%', marginBottom: 0 }}>
            {renderRegisterCard('SP')}
            {renderRegisterCard('BP')}
            {renderRegisterCard('SI')}
            {renderRegisterCard('DI')}
          </div>
        </AccordionDetails>
      </Accordion>

      {/* Segment Registers */}
      <Accordion className={classes.accordion}>
        <AccordionSummary expandIcon={<span>▾</span>} className={classes.accordionSummary}>
          <Typography style={{ fontSize: '12px', fontWeight: 600 }}>Segment Registers (CS, DS, SS, ES)</Typography>
        </AccordionSummary>
        <AccordionDetails style={{ padding: '8px' }}>
          <div className={classes.grid} style={{ width: '100%', marginBottom: 0 }}>
            {renderRegisterCard('CS')}
            {renderRegisterCard('DS')}
            {renderRegisterCard('SS')}
            {renderRegisterCard('ES')}
          </div>
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
}
