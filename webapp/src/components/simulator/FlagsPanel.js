import React, { useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import Tooltip from '@material-ui/core/Tooltip';
import Button from '@material-ui/core/Button';
import Collapse from '@material-ui/core/Collapse';
import { useEmulator } from '../../context/EmulatorContext';
import { FLAG_NAMES } from '../../utils/instructionSemantics';

const useStyles = makeStyles((theme) => ({
  root: {
    backgroundColor: theme.palette.type === 'dark' ? '#1e293b' : '#ffffff',
    border: `1px solid ${theme.palette.type === 'dark' ? '#334155' : '#e2e8f0'}`,
    borderRadius: '8px',
    padding: '14px',
    marginTop: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  title: {
    fontWeight: 700,
    fontSize: '15px',
    letterSpacing: '0.5px',
  },
  flagGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '8px',
  },
  extendedGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '6px',
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: `1px dashed ${theme.palette.type === 'dark' ? '#334155' : '#e2e8f0'}`,
  },
  flagCell: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 4px',
    borderRadius: '6px',
    border: `1px solid ${theme.palette.type === 'dark' ? '#334155' : '#e2e8f0'}`,
    backgroundColor: theme.palette.type === 'dark' ? '#0f172a' : '#f8fafc',
    transition: 'all 0.2s ease',
  },
  flagName: {
    fontSize: '11px',
    fontWeight: 700,
    color: theme.palette.type === 'dark' ? '#94a3b8' : '#64748b',
  },
  flagValue: {
    fontSize: '16px',
    fontWeight: 800,
    fontFamily: 'monospace',
    marginTop: '2px',
  },
  valActive: {
    color: '#2563eb',
  },
  valInactive: {
    color: theme.palette.type === 'dark' ? '#475569' : '#94a3b8',
  },
  transitionText: {
    fontSize: '9px',
    color: '#2563eb',
    fontWeight: 600,
    marginTop: '2px',
  },
  toggleBtn: {
    fontSize: '11px',
    padding: '2px 8px',
    textTransform: 'none',
  },
}));

export default function FlagsPanel({ liveFlags, changedFlags = {}, prevFlags = {} }) {
  const classes = useStyles();
  const { state } = useEmulator();
  const [showAll, setShowAll] = useState(false);

  const currentSnapshot = state.currentIndex >= 0 && state.history[state.currentIndex];
  const flags = (currentSnapshot && currentSnapshot.flags) || liveFlags || {};
  const prev = (state.currentIndex > 0 && state.history[state.currentIndex - 1]?.flags) || prevFlags || {};

  const renderFlag = (name, isPrimary = true) => {
    const val = flags[name] ? 1 : 0;
    const prevVal = prev[name] !== undefined ? (prev[name] ? 1 : 0) : val;
    const isChanged = changedFlags[name] || (prev && prevVal !== val);
    const desc = FLAG_NAMES[name] || `${name} Flag`;

    return (
      <Tooltip
        key={name}
        title={
          <div>
            <div><strong>{name}</strong>: {desc}</div>
            <div>Current value: {val}</div>
            {isChanged && (
              <div style={{ color: '#93c5fd', marginTop: '2px' }}>
                Transition: {prevVal} → {val} (Changed this step)
              </div>
            )}
          </div>
        }
        arrow
      >
        <div
          className={`${classes.flagCell} ${isChanged ? 'flag-changed' : ''}`}
          style={{
            borderColor: isChanged ? '#3b82f6' : undefined,
          }}
        >
          <span className={classes.flagName}>{name}</span>
          <span className={`${classes.flagValue} ${val === 1 ? classes.valActive : classes.valInactive}`}>
            {val}
          </span>
          {isChanged ? (
            <span className={classes.transitionText}>{prevVal}→{val}</span>
          ) : (
            <span style={{ fontSize: '9px', opacity: 0 }}>—</span>
          )}
        </div>
      </Tooltip>
    );
  };

  return (
    <Paper className={classes.root}>
      <div className={classes.header}>
        <Typography className={classes.title}>Status Flags</Typography>
        <Button
          size="small"
          className={classes.toggleBtn}
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? 'Key flags ▴' : 'All flags ▾'}
        </Button>
      </div>

      {/* Prominent Core Arithmetic Flags: CF, ZF, SF, OF */}
      <div className={classes.flagGrid}>
        {renderFlag('CF')}
        {renderFlag('ZF')}
        {renderFlag('SF')}
        {renderFlag('OF')}
      </div>

      {/* Secondary Flags: PF, AF, DF, IF, TF */}
      <Collapse in={showAll}>
        <div className={classes.extendedGrid}>
          {renderFlag('PF', false)}
          {renderFlag('AF', false)}
          {renderFlag('DF', false)}
          {renderFlag('IF', false)}
          {renderFlag('TF', false)}
        </div>
      </Collapse>
    </Paper>
  );
}
