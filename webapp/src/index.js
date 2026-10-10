import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import CssBaseline from '@material-ui/core/CssBaseline'
import App from './App'
import { CustomThemeProvider } from './themes/CustomThemeProvider'
import { EmulatorProvider } from './context/EmulatorContext'

ReactDOM.render(
	<React.Fragment>
		<CustomThemeProvider>
			{/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
			<CssBaseline />
			<EmulatorProvider>
				<App />
			</EmulatorProvider>
		</CustomThemeProvider>
	</React.Fragment>,
	document.getElementById('root')
);