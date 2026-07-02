const fs = require('fs');

const htmlFile = 'index.html';
const mainJsFile = 'src/main.js';

let html = fs.readFileSync(htmlFile, 'utf8');

// 1. Remove Tailwind and Chart.js CDNs
html = html.replace(/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@tailwindcss\/browser@4"><\/script>\n?/g, '');
html = html.replace(/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/chart\.js"><\/script>\n?/g, '');

// 2. Remove the style block (we already have src/style.css)
html = html.replace(/<style>[\s\S]*?<\/style>/, '');

// 3. Extract the script block
const scriptRegex = /<script>([\s\S]*?)<\/script>/;
const match = html.match(scriptRegex);
if (match) {
  let scriptContent = match[1];

  // Add imports at the top
  const imports = `import './style.css';\nimport Chart from 'chart.js/auto';\n\n`;

  // Attach functions to window
  const windowExports = `
// Expose functions to window for inline event handlers
window.toggleConfigPanel = toggleConfigPanel;
window.toggleMostrarDinero = toggleMostrarDinero;
window.irAPantallaPrincipal = irAPantallaPrincipal;
window.toggleTheme = toggleTheme;
window.cambiarPrecio = cambiarPrecio;
window.cambiarMinimumPodio = cambiarMinimumPodio;
window.cambiarCriterioOrden = cambiarCriterioOrden;
window.cerrarModalPodio = cerrarModalPodio;
window.toggleMultiModeLogica = toggleMultiModeLogica;
window.compartirWhatsApp = compartirWhatsApp;
window.compartirWhatsAppIndividual = compartirWhatsAppIndividual;
window.imprimirReporteIndividual = imprimirReporteIndividual;
window.manejarSeleccionMultiMode = manejarSeleccionMultiMode;
window.agregarTirador = agregarTirador;
window.editarTirador = editarTirador;
window.eliminarTirador = eliminarTirador;
window.registrarTiro = registrarTiro;
window.deshacerUltimoTiro = deshacerUltimoTiro;
window.verPodioParcial = verPodioParcial;
window.finalizarSesion = finalizarSesion;
window.imprimirConSistemaNativo = imprimirConSistemaNativo;
window.eliminarSesionHistorial = eliminarSesionHistorial;
window.cargarSesionPasada = cargarSesionPasada;
window.borrarTodoElHistorial = borrarTodoElHistorial;
window.reiniciarApp = reiniciarApp;
`;

  fs.writeFileSync(mainJsFile, imports + scriptContent + windowExports);
  html = html.replace(scriptRegex, '<script type="module" src="/src/main.js"></script>');
}

fs.writeFileSync(htmlFile, html);
console.log('Refactor done');
