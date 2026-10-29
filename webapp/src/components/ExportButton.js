import React, { useState } from 'react';
import Button from '@material-ui/core/Button';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import Tooltip from '@material-ui/core/Tooltip';
import { useEmulator } from '../context/EmulatorContext';
import { exportTraceToJSON, exportTraceToCSV, exportTraceToText } from '../utils/traceSelectors';

export default function ExportButton() {
  const { state } = useEmulator();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleClick = (event) => {
    if (!state || !state.history || state.history.length === 0) {
      alert('Run or step through the program first to generate an execution trace.');
      return;
    }
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const downloadFile = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    handleClose();
  };

  const exportText = () => {
    const text = exportTraceToText(state.history);
    const ts = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '-');
    downloadFile(text, `trace_${ts}.txt`, 'text/plain;charset=utf-8');
  };

  const exportJSON = () => {
    const json = exportTraceToJSON(state.history, { runId: state.runId });
    const ts = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '-');
    downloadFile(json, `trace_${ts}.json`, 'application/json');
  };

  const exportCSV = () => {
    const csv = exportTraceToCSV(state.history);
    const ts = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '-');
    downloadFile(csv, `trace_${ts}.csv`, 'text/csv;charset=utf-8');
  };

  return (
    <div>
      <Tooltip title="Export execution trace as Text, JSON, or CSV" arrow>
        <span>
          <Button
            variant="outlined"
            size="small"
            className="export-btn"
            onClick={handleClick}
            style={{
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '12px',
            }}
          >
            Export Trace ▾
          </Button>
        </span>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <MenuItem onClick={exportText} style={{ fontSize: '13px' }}>
          📄 Formatted Text (.txt)
        </MenuItem>
        <MenuItem onClick={exportJSON} style={{ fontSize: '13px' }}>
          📦 Versioned Schema (.json)
        </MenuItem>
        <MenuItem onClick={exportCSV} style={{ fontSize: '13px' }}>
          📊 Formula-Safe (.csv)
        </MenuItem>
      </Menu>
    </div>
  );
}
