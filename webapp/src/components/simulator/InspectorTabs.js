import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Chip from '@material-ui/core/Chip';
import HistoryTimeline from '../HistoryTimeline';
import ALUPanel from '../ALUPanel';
import StackInspector from './StackInspector';
import { useEmulator } from '../../context/EmulatorContext';

const useStyles = makeStyles((theme) => ({
  root: {
    backgroundColor: theme.palette.type === 'dark' ? '#1e293b' : '#ffffff',
    border: `1px solid ${theme.palette.type === 'dark' ? '#334155' : '#e2e8f0'}`,
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    overflow: 'hidden',
  },
  tabsHeader: {
    borderBottom: `1px solid ${theme.palette.type === 'dark' ? '#334155' : '#e2e8f0'}`,
    backgroundColor: theme.palette.type === 'dark' ? '#0f172a' : '#f8fafc',
    minHeight: '44px',
  },
  tab: {
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'none',
    minHeight: '44px',
    padding: '6px 14px',
  },
  tabPanel: {
    padding: '12px',
  },
  badge: {
    marginLeft: '6px',
    height: '18px',
    fontSize: '10px',
  },
}));

export default function InspectorTabs({
  memoryComponent,
  ioComponent,
  memory = [],
  liveRegisters = {},
  changedMemCount = 0,
}) {
  const classes = useStyles();
  const { state, setActiveTab } = useEmulator();
  const activeTab = state.activeTab || 'history';

  const tabIndexMap = {
    history: 0,
    memory: 1,
    stack: 2,
    alu: 3,
    io: 4,
  };
  const reverseMap = ['history', 'memory', 'stack', 'alu', 'io'];

  const currentTabIdx = tabIndexMap[activeTab] !== undefined ? tabIndexMap[activeTab] : 0;

  const handleTabChange = (event, newIndex) => {
    const tabName = reverseMap[newIndex] || 'history';
    setActiveTab(tabName);
  };

  return (
    <div className={classes.root}>
      <div className={classes.tabsHeader}>
        <Tabs
          value={currentTabIdx}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab
            label={
              <span style={{ display: 'flex', alignItems: 'center' }}>
                📜 History Timeline
                {state.history.length > 0 && (
                  <Chip
                    label={state.history.filter((s) => !s.isBaseline).length}
                    size="small"
                    className={classes.badge}
                    color="primary"
                  />
                )}
              </span>
            }
            className={classes.tab}
          />
          <Tab
            label={
              <span style={{ display: 'flex', alignItems: 'center' }}>
                💾 Memory (RAM)
                {changedMemCount > 0 && (
                  <Chip
                    label={`${changedMemCount} changed`}
                    size="small"
                    className={classes.badge}
                    style={{ backgroundColor: '#f59e0b', color: '#000' }}
                  />
                )}
              </span>
            }
            className={classes.tab}
          />
          <Tab label="📚 Stack (SS:SP)" className={classes.tab} />
          <Tab label="⚙️ ALU Breakdown" className={classes.tab} />
          <Tab label="💻 Console / I/O" className={classes.tab} />
        </Tabs>
      </div>

      <div className={classes.tabPanel}>
        {/* Tab 0: History */}
        <div style={{ display: currentTabIdx === 0 ? 'block' : 'none' }}>
          <HistoryTimeline />
        </div>

        {/* Tab 1: Memory */}
        <div style={{ display: currentTabIdx === 1 ? 'block' : 'none' }}>
          {memoryComponent}
        </div>

        {/* Tab 2: Stack */}
        <div style={{ display: currentTabIdx === 2 ? 'block' : 'none' }}>
          <StackInspector memory={memory} liveRegisters={liveRegisters} />
        </div>

        {/* Tab 3: ALU */}
        <div style={{ display: currentTabIdx === 3 ? 'block' : 'none' }}>
          <ALUPanel />
        </div>

        {/* Tab 4: Console / IO */}
        <div style={{ display: currentTabIdx === 4 ? 'block' : 'none' }}>
          {ioComponent}
        </div>
      </div>
    </div>
  );
}
