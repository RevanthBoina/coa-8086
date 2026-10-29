import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import Chip from '@material-ui/core/Chip';
import Tooltip from '@material-ui/core/Tooltip';
import { useEmulator } from '../../context/EmulatorContext';
import ExamplesDropdown from '../ExamplesDropdown';
import SpeedControl from '../SpeedControl';
import ExportButton from '../ExportButton';

const useStyles = makeStyles((theme) => ({
  toolbar: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
    backgroundColor: theme.palette.type === 'dark' ? '#1e293b' : '#ffffff',
    borderRadius: '8px',
    border: `1px solid ${theme.palette.type === 'dark' ? '#334155' : '#e2e8f0'}`,
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    gap: '12px',
  },
  leftGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '8px',
  },
  rightGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '10px',
  },
  statusSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '12px',
    fontFamily: 'monospace',
    color: theme.palette.type === 'dark' ? '#94a3b8' : '#64748b',
  },
  compileBtn: {
    backgroundColor: '#1d4ed8',
    color: '#fff',
    fontWeight: 600,
    '&:hover': {
      backgroundColor: '#1e40af',
    },
    '&:disabled': {
      backgroundColor: theme.palette.type === 'dark' ? '#334155' : '#cbd5e1',
      color: '#94a3b8',
    },
  },
  runBtn: {
    color: '#16a34a !important',
    borderColor: '#16a34a !important',
    fontWeight: 600,
    '&:hover': {
      backgroundColor: 'rgba(22, 163, 74, 0.08)',
    },
  },
  pauseBtn: {
    color: '#d97706 !important',
    borderColor: '#d97706 !important',
    fontWeight: 600,
  },
  stepBtn: {
    color: '#2563eb !important',
    borderColor: '#2563eb !important',
    fontWeight: 600,
    '&:hover': {
      backgroundColor: 'rgba(37, 99, 235, 0.08)',
    },
  },
  presetChip: {
    cursor: 'pointer',
    fontSize: '11px',
    height: '24px',
  },
}));

export default function ExecutionToolbar({
  compiled,
  halted,
  running,
  onCompile,
  onRun,
  onPause,
  onStep,
  onPrev,
  onReset,
  onSelectExample,
  currentLine,
  instructionIndex,
  needsPreparation,
}) {
  const classes = useStyles();
  const { state, setSpeed, returnToLive } = useEmulator();

  let statusText = 'Ready';
  let statusColor = 'primary';
  if (needsPreparation) {
    statusText = 'Needs preparation';
    statusColor = 'secondary';
  } else if (!compiled) {
    statusText = 'Editing';
    statusColor = 'default';
  } else if (running) {
    statusText = 'Running';
    statusColor = 'primary';
  } else if (halted) {
    statusText = 'Finished';
    statusColor = 'default';
  } else if (state.isHistorical) {
    statusText = `Viewing Step ${state.currentIndex + 1} (History)`;
    statusColor = 'secondary';
  }

  const speedPresets = [
    { label: '0.5/s', ms: 2000 },
    { label: '1/s', ms: 1000 },
    { label: '2/s', ms: 500 },
    { label: '5/s', ms: 200 },
  ];

  return (
    <div className="execution-toolbar" style={{ width: '100%', marginBottom: '12px' }}>
      <div className={classes.toolbar}>
        {/* Left Actions */}
        <div className={classes.leftGroup}>
          <ExamplesDropdown onSelectExample={onSelectExample} />

          {/* Prepare / Compile Button */}
          <Tooltip title="Validate and assemble program into interpreter memory (Ctrl+Enter)" arrow>
            <Button
              variant="contained"
              size="small"
              className={classes.compileBtn}
              onClick={onCompile}
            >
              COMPILE
            </Button>
          </Tooltip>

          {/* Step Button */}
          <Tooltip title="Step single instruction forward (F8)" arrow>
            <span>
              <Button
                variant="outlined"
                size="small"
                className={classes.stepBtn}
                onClick={onStep}
                disabled={!compiled || (halted && !state.isHistorical)}
              >
                STEP
              </Button>
            </span>
          </Tooltip>

          {/* Run / Pause Button */}
          {running ? (
            <Tooltip title="Pause automated execution" arrow>
              <Button
                variant="outlined"
                size="small"
                className={classes.pauseBtn}
                onClick={onPause}
              >
                PAUSE
              </Button>
            </Tooltip>
          ) : (
            <Tooltip title="Execute program automatically" arrow>
              <span>
                <Button
                  variant="outlined"
                  size="small"
                  className={classes.runBtn}
                  onClick={onRun}
                  disabled={!compiled || halted}
                >
                  RUN
                </Button>
              </span>
            </Tooltip>
          )}

          {/* Prev / Revert Button */}
          <Tooltip title="View previous recorded step (Shift+F8)" arrow>
            <span>
              <Button
                variant="outlined"
                size="small"
                onClick={onPrev}
                disabled={!state || state.currentIndex <= 0}
              >
                PREV
              </Button>
            </span>
          </Tooltip>

          {/* Reset Button */}
          <Tooltip title="Reset CPU state and interpreter execution" arrow>
            <span>
              <Button
                variant="outlined"
                size="small"
                color="secondary"
                onClick={onReset}
                disabled={!compiled && state.history.length === 0}
              >
                RESET
              </Button>
            </span>
          </Tooltip>

          {state.isHistorical && (
            <Button
              variant="contained"
              size="small"
              color="primary"
              onClick={returnToLive}
              style={{ fontWeight: 600 }}
            >
              Return to Live
            </Button>
          )}
        </div>

        {/* Right Section */}
        <div className={classes.rightGroup}>
          <div className={classes.statusSection}>
            <Chip
              label={statusText}
              size="small"
              color={statusColor}
              style={{ fontWeight: 600, fontSize: '11px' }}
            />
            {compiled && (
              <span>
                Execution position (interpreter): <strong>line {currentLine || 1}</strong>
                {instructionIndex !== undefined ? `, index ${instructionIndex}` : ''}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {speedPresets.map((preset) => (
              <Chip
                key={preset.label}
                label={preset.label}
                size="small"
                variant={state.speed === preset.ms ? 'default' : 'outlined'}
                color={state.speed === preset.ms ? 'primary' : 'default'}
                className={classes.presetChip}
                onClick={() => setSpeed(preset.ms)}
              />
            ))}
          </div>

          <SpeedControl />
          <ExportButton />
        </div>
      </div>
    </div>
  );
}
