import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // Importa tu componente principal App.js

// Este archivo es el punto de inicio de la aplicación React.

// 1. Obtiene el elemento raíz de tu index.html (el div con id="root")
const root = ReactDOM.createRoot(document.getElementById('root'));

// 2. Renderiza el componente principal <App /> dentro de ese elemento.
// Los <React.StrictMode> ayudan a detectar problemas en el desarrollo.
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Nota: En un proyecto real, también podrías importar aquí un archivo CSS
// global, pero como estamos usando Tailwind CSS a través del CDN en index.html,
// este archivo se mantiene simple.