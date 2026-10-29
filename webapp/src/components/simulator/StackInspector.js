import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import Table from '@material-ui/core/Table';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import TableCell from '@material-ui/core/TableCell';
import TableBody from '@material-ui/core/TableBody';
import Chip from '@material-ui/core/Chip';
import { useEmulator } from '../../context/EmulatorContext';
import { toHex4, toHex2, calculatePhysicalAddress } from '../../utils/numberFormat';

const useStyles = makeStyles((theme) => ({
  root: {
    padding: '16px',
    backgroundColor: theme.palette.type === 'dark' ? '#1e293b' : '#ffffff',
    borderRadius: '8px',
    border: `1px solid ${theme.palette.type === 'dark' ? '#334155' : '#e2e8f0'}`,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    flexWrap: 'wrap',
    gap: '8px',
  },
  title: {
    fontWeight: 700,
    fontSize: '15px',
  },
  chip: {
    fontFamily: 'monospace',
    fontWeight: 600,
  },
  stackContainer: {
    marginTop: '10px',
  },
  topPointerRow: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
}));

export default function StackInspector({ memory = [], liveRegisters = {} }) {
  const classes = useStyles();
  const { state } = useEmulator();

  const current = state.currentIndex >= 0 ? state.history[state.currentIndex] : null;
  const regs = (current && current.registers) || liveRegisters || {};

  const ss = regs.SS || 0;
  const sp = regs.SP || 0xfffe;
  const physicalSP = calculatePhysicalAddress(ss, sp);

  // Read stack entries around SP (e.g. from SP down or around SP)
  // Stack entries (words, little-endian)
  const stackEntries = [];
  for (let offset = -4; offset <= 12; offset += 2) {
    const wordSP = (sp + offset) & 0xffff;
    const physAddr = calculatePhysicalAddress(ss, wordSP);
    
    // Read 2 bytes in memory (little-endian: low byte at physAddr, high byte at physAddr + 1)
    const lowByte = memory[physAddr] !== undefined ? memory[physAddr] : 0;
    const highByte = memory[physAddr + 1] !== undefined ? memory[physAddr + 1] : 0;
    const wordVal = ((highByte << 8) | lowByte) & 0xffff;

    stackEntries.push({
      offset,
      logical: `${toHex4(ss)}:${toHex4(wordSP)}`,
      physical: '0x' + physAddr.toString(16).toUpperCase().padStart(5, '0'),
      isTop: offset === 0,
      lowByte,
      highByte,
      wordVal,
    });
  }

  return (
    <div className={classes.root}>
      <div className={classes.header}>
        <div>
          <Typography className={classes.title}>Stack Inspector (SS:SP)</Typography>
          <Typography variant="body2" color="textSecondary" style={{ fontSize: '12px' }}>
            8086 stack grows downward in memory. PUSH decrements SP by 2; POP increments SP by 2.
          </Typography>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Chip
            label={`SS:SP = ${toHex4(ss)}:${toHex4(sp)}`}
            color="primary"
            size="small"
            className={classes.chip}
          />
          <Chip
            label={`Physical = 0x${physicalSP.toString(16).toUpperCase().padStart(5, '0')}`}
            variant="outlined"
            size="small"
            className={classes.chip}
          />
        </div>
      </div>

      <div className={classes.stackContainer}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Role</TableCell>
              <TableCell>Segment:Offset</TableCell>
              <TableCell>20-Bit Physical</TableCell>
              <TableCell align="right">Low Byte (SP+0)</TableCell>
              <TableCell align="right">High Byte (SP+1)</TableCell>
              <TableCell align="right">Word Value</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {stackEntries.map((entry) => (
              <TableRow
                key={entry.logical}
                className={entry.isTop ? classes.topPointerRow : undefined}
                style={{ fontFamily: 'monospace' }}
              >
                <TableCell>
                  {entry.isTop ? (
                    <Chip label="▶ Top of Stack (SP)" size="small" color="primary" style={{ height: '20px', fontSize: '10px' }} />
                  ) : entry.offset < 0 ? (
                    <span style={{ color: '#94a3b8', fontSize: '11px' }}>Free Stack Space</span>
                  ) : (
                    <span style={{ fontSize: '11px' }}>SP + {entry.offset}</span>
                  )}
                </TableCell>
                <TableCell style={{ fontFamily: 'monospace' }}>{entry.logical}</TableCell>
                <TableCell style={{ fontFamily: 'monospace' }}>{entry.physical}</TableCell>
                <TableCell align="right" style={{ fontFamily: 'monospace' }}>{toHex2(entry.lowByte)}</TableCell>
                <TableCell align="right" style={{ fontFamily: 'monospace' }}>{toHex2(entry.highByte)}</TableCell>
                <TableCell align="right" style={{ fontFamily: 'monospace', fontWeight: entry.isTop ? 700 : 400 }}>
                  {toHex4(entry.wordVal)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
