import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';
import { useEmulator } from '../../context/EmulatorContext';
import { generateExplanation } from '../../utils/instructionSemantics';

const useStyles = makeStyles((theme) => ({
  root: {
    backgroundColor: theme.palette.type === 'dark' ? '#1e293b' : '#ffffff',
    border: `1px solid ${theme.palette.type === 'dark' ? '#334155' : '#e2e8f0'}`,
    borderLeft: '4px solid #3b82f6 !important',
    borderRadius: '8px',
    padding: '14px 18px',
    marginBottom: '14px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  title: {
    fontWeight: 700,
    fontSize: '14px',
    color: '#2563eb',
    fontFamily: 'monospace',
  },
  explanationGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    marginTop: '6px',
    '@media (max-width: 900px)': {
      gridTemplateColumns: '1fr',
    },
  },
  box: {
    padding: '8px 10px',
    borderRadius: '6px',
    backgroundColor: theme.palette.type === 'dark' ? '#0f172a' : '#f8fafc',
    border: `1px solid ${theme.palette.type === 'dark' ? '#334155' : '#e2e8f0'}`,
  },
  boxLabel: {
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    color: theme.palette.type === 'dark' ? '#94a3b8' : '#64748b',
    marginBottom: '4px',
  },
  boxText: {
    fontSize: '13px',
    lineHeight: '1.4',
    color: theme.palette.type === 'dark' ? '#f1f5f9' : '#1e293b',
  },
}));

export default function ExplanationCard() {
  const classes = useStyles();
  const { state } = useEmulator();

  const current = state.currentIndex >= 0 ? state.history[state.currentIndex] : null;
  const previous = state.currentIndex > 0 ? state.history[state.currentIndex - 1] : null;

  const expl = generateExplanation(current, previous);
  const plainSummary = `${expl.what} ${expl.changes} ${expl.why}`;

  return (
    <Paper className={`${classes.root} explanation-bar`}>
      <div className={classes.header}>
        <span className="explanation-label" style={{ fontWeight: 700, fontSize: '13px', color: '#2563eb' }}>
          💡 Instruction Explanation
        </span>
        <span className={classes.title}>
          {current ? current.instruction || 'NOP' : 'Interpreter Idle'}
        </span>
      </div>

      {/* Hidden/accessible plain text container for test matchers & screen readers */}
      <div className="explanation-text" style={{ fontSize: '13px', color: '#475569', marginBottom: '8px', fontStyle: 'italic' }}>
        {plainSummary}
      </div>

      {/* Structured 3-Question Student Cards */}
      <div className={classes.explanationGrid}>
        <div className={classes.box}>
          <div className={classes.boxLabel}>1. What Executed?</div>
          <div className={classes.boxText}>{expl.what}</div>
        </div>

        <div className={classes.box}>
          <div className={classes.boxLabel}>2. What Changed?</div>
          <div className={classes.boxText}>{expl.changes}</div>
        </div>

        <div className={classes.box}>
          <div className={classes.boxLabel}>3. Why?</div>
          <div className={classes.boxText}>{expl.why}</div>
        </div>
      </div>
    </Paper>
  );
}
