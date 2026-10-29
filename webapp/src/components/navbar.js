import React, { useContext } from "react";
import { CustomThemeContext } from "../themes/CustomThemeProvider";
// Assets
import cpu from "../images/chip-memory.svg";
// MuI Components
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import IconButton from "@material-ui/core/IconButton";
import Typography from "@material-ui/core/Typography";
import Button from "@material-ui/core/Button";
import Tooltip from "@material-ui/core/Tooltip";
import { makeStyles } from "@material-ui/core/styles";
import useMediaQuery from "@material-ui/core/useMediaQuery";
// Routing
import { useHistory } from "react-router-dom";

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
  },
  navbar: {
    padding: '2px 12px',
    backgroundColor: theme.palette.type === 'dark' ? '#0f172a' : '#1d4ed8',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  brandContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
    flexGrow: 1,
  },
  logo: {
    width: 32,
    height: 32,
  },
  title: {
    fontWeight: 800,
    fontSize: '20px',
    color: '#ffffff',
    lineHeight: 1.1,
  },
  subtitle: {
    fontSize: '11px',
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: 400,
  },
  navLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  navBtn: {
    color: '#ffffff',
    textTransform: 'none',
    fontSize: '13px',
    fontWeight: 600,
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
  },
  themeBtn: {
    color: '#ffffff',
    fontSize: '16px',
    minWidth: '36px',
  },
}));

function Navbar() {
  const classes = useStyles();
  const matches = useMediaQuery("(min-width:800px)");
  const history = useHistory();
  const { currentTheme, setTheme } = useContext(CustomThemeContext);

  const handleThemeChange = () => {
    if (currentTheme === "normal") {
      setTheme("dark");
    } else {
      setTheme("normal");
    }
  };

  const pUrl = process.env.PUBLIC_URL || "";
  const goToCompile = () => history.push(pUrl ? `${pUrl}/compile` : "/compile");
  const goToHelp = () => history.push(pUrl ? `${pUrl}/instructions` : "/instructions");

  return (
    <div className={classes.root}>
      <AppBar position="static" id="navbarCustomId" className={classes.navbar}>
        <Toolbar style={{ minHeight: '56px' }}>
          {/* Brand */}
          <div
            className={classes.brandContainer}
            onClick={goToCompile}
            role="link"
            tabIndex={0}
            onKeyUp={(e) => {
              if (e.key === "Enter") goToCompile();
            }}
          >
            <img src={cpu} alt="8086 CPU Logo" className={classes.logo} />
            <div>
              <Typography className={classes.title}>
                8086 Learning Lab
              </Typography>
              {matches && (
                <Typography className={classes.subtitle}>
                  Write assembly. Step through execution. Understand the CPU.
                </Typography>
              )}
            </div>
          </div>

          {/* Nav Links */}
          <div className={classes.navLinks}>
            <Button
              className={classes.navBtn}
              onClick={goToCompile}
            >
              💻 Simulator
            </Button>

            <Button
              className={classes.navBtn}
              onClick={goToHelp}
            >
              📖 Reference
            </Button>

            <Tooltip title="Toggle light/dark theme" arrow>
              <IconButton onClick={handleThemeChange} className={classes.themeBtn} size="small">
                {currentTheme === "dark" ? "☀️" : "🌙"}
              </IconButton>
            </Tooltip>
          </div>
        </Toolbar>
      </AppBar>
    </div>
  );
}

export default Navbar;
