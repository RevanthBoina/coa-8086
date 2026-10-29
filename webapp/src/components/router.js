import React, { useState, useEffect } from "react";
import Home from "../pages/home";
import Compiler from "../pages/compiler";
import InstructionSet from "../pages/instructions";
import Navbar from "./navbar";
import Footer from "./footer";
import {
  Route,
  BrowserRouter as Router,
  Switch,
  Redirect,
} from "react-router-dom";

function RootRouter() {
  const [wasm, setWasm] = useState(null);
  useEffect(() => {
    async function load() {
      try {
        const wasmModule = await import("emulator_8086");
        if (typeof wasmModule.default === "function") {
          const wasmUrl = (process.env.PUBLIC_URL || "") + "/emulator_8086_web_bg.wasm";
          await wasmModule.default(wasmUrl);
        }
        setWasm(wasmModule);
      } catch (err) {
        console.error(
          `Unexpected error in loadWasm. [Message: ${err.message}]`
        );
        setWasm(false);
      }
    }
    load();
  }, []);

  const pUrl = process.env.PUBLIC_URL || "";
  const defaultRedirect = () => (
    <Redirect to={pUrl ? `${pUrl}/compile` : "/compile"} />
  );

  const compilerPaths = Array.from(new Set([
    "/",
    "/compile",
    "/8086-emulator-web/",
    "/8086-emulator-web/compile",
    "/coa-8086",
    "/coa-8086/",
    "/coa-8086/compile",
    pUrl,
    `${pUrl}/`,
    `${pUrl}/compile`,
  ].filter(Boolean)));

  const helpPaths = Array.from(new Set([
    "/help",
    "/instructions",
    "/8086-emulator-web/help",
    "/8086-emulator-web/instructions",
    "/coa-8086/help",
    "/coa-8086/instructions",
    `${pUrl}/help`,
    `${pUrl}/instructions`,
  ].filter(Boolean)));

  return (
    <Router>
      <div id="page-container">
        <Navbar />
        <div className="App">
          <Switch>
            <Route exact path="/8086-emulator-web/home" component={Home} />
            <Route
              exact
              path={compilerPaths}
              component={() => <Compiler wasm={wasm} />}
            />
            <Route
              exact
              path={helpPaths}
              component={InstructionSet}
            />
            <Route component={defaultRedirect} />
          </Switch>
        </div>
      </div>
      <footer id="footer">
        <Footer />
      </footer>
    </Router>
  );
}

export default RootRouter;
