const fs = require('fs');
let js = fs.readFileSync('src/main.js', 'utf8');

// 1. Remove DOMContentLoaded block that calls initAuth
const domBlock = `document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-auth');
  if (form) form.addEventListener('submit', handleAuth);
  
  const toggleBtn = document.getElementById('btn-toggle-auth');
  if (toggleBtn) toggleBtn.addEventListener('click', toggleAuthMode);
  
  initAuth();
});`;
js = js.replace(domBlock, '');

// 2. We need a function to restore DOM state
const restoreDOMFunc = `
window.restaurarEstadoDOM = function() {
  if (estadoApp === "inicio") {
    mostrarPantallaInicio();
  } else if (estadoApp === "resultados") {
    document.getElementById("pantalla-inicio").classList.add("hidden");
    document.getElementById("pantalla-inicio").classList.remove("flex");
    document.getElementById("pantalla-principal").classList.remove("hidden");
    mostrarPantallaResultados();
  } else {
    document.getElementById("pantalla-inicio").classList.add("hidden");
    document.getElementById("pantalla-inicio").classList.remove("flex");
    document.getElementById("pantalla-principal").classList.remove("hidden");
    actualizarInterfaz();
    const sb = document.getElementById('snackbar-undo');
    if(sb) sb.classList.add('translate-y-24', 'opacity-0');
  }
  renderizarHistorialSidebar();
}
`;
// inject the function after window.onload
js = js.replace('window.onload = function () {', restoreDOMFunc + '\nwindow.onload = function () {');

// 3. Remove the immediate DOM manipulation inside window.onload and replace it with calling initAuth
const onloadEndBlock = `          if (estadoApp === "inicio") {
            mostrarPantallaInicio();
          } else if (estadoApp === "resultados") {
            document.getElementById("pantalla-inicio").classList.add("hidden");
            document.getElementById("pantalla-inicio").classList.remove("flex");
            document.getElementById("pantalla-principal").classList.remove("hidden");
            mostrarPantallaResultados();
          } else {
            document.getElementById("pantalla-inicio").classList.add("hidden");
            document.getElementById("pantalla-inicio").classList.remove("flex");
            document.getElementById("pantalla-principal").classList.remove("hidden");
            actualizarInterfaz();
            const sb = document.getElementById('snackbar-undo');
            if(sb) sb.classList.add('translate-y-24', 'opacity-0');
          }
          renderizarHistorialSidebar();
        } catch (e) {`;

const newOnloadEndBlock = `          
          // Setup auth event listeners here since DOM is loaded
          const form = document.getElementById('form-auth');
          if (form) form.addEventListener('submit', handleAuth);
          
          const toggleBtn = document.getElementById('btn-toggle-auth');
          if (toggleBtn) toggleBtn.addEventListener('click', toggleAuthMode);
          
          initAuth(); // This will eventually call restaurarEstadoDOM
        } catch (e) {`;
js = js.replace(onloadEndBlock, newOnloadEndBlock);

// 4. Update initAuth to use restaurarEstadoDOM
js = js.replace(/hideAuthScreen\(\);\s*mostrarPantallaInicio\(\);/g, `hideAuthScreen();\n    window.restaurarEstadoDOM();`);

fs.writeFileSync('src/main.js', js);
console.log('Fixed auth state handling');
