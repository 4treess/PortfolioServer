import React from 'react';
import { createRoot } from 'react-dom/client';
import 'katex/dist/katex.min.css';
import iconUrl from '../icon.png';
import App from '../App.jsx';

document.querySelector('link[rel="icon"]').href = iconUrl;
createRoot(document.getElementById('root')).render(<App />);
