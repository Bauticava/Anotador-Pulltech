import './style.css';
import Chart from 'chart.js/auto';
import { supabase } from './supabase.js';

// Auth State
let authUser = null;
let isRegistering = false;


// UX State
let enableVibration = true;
let enableSound = true;
let enableWakeLock = true;
let wakeLock = null;

if (localStorage.getItem("h_uxVibracion") !== null) enableVibration = localStorage.getItem("h_uxVibracion") === "true";
if (localStorage.getItem("h_uxSonido") !== null) enableSound = localStorage.getItem("h_uxSonido") === "true";
if (localStorage.getItem("h_uxWakeLock") !== null) enableWakeLock = localStorage.getItem("h_uxWakeLock") === "true";

window.toggleVibracion = function() {
  enableVibration = document.getElementById('switch-vibracion')?.checked;
  localStorage.setItem("h_uxVibracion", enableVibration);
};

window.toggleSonido = function() {
  enableSound = document.getElementById('switch-sonido')?.checked;
  localStorage.setItem("h_uxSonido", enableSound);
};

window.toggleWakeLock = async function() {
  enableWakeLock = document.getElementById('switch-wakelock')?.checked;
  localStorage.setItem("h_uxWakeLock", enableWakeLock);
  if (enableWakeLock) {
    await requestWakeLock();
  } else if (wakeLock !== null) {
    wakeLock.release().catch(()=>{});
    wakeLock = null;
  }
};

async function requestWakeLock() {
  if ('wakeLock' in navigator && enableWakeLock) {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
    } catch (err) {}
  }
}

document.addEventListener('visibilitychange', async () => {
  if (wakeLock !== null && document.visibilityState === 'visible') {
    await requestWakeLock();
  }
});

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(isHit) {
  if (!enableSound) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  oscillator.type = isHit ? 'sine' : 'sawtooth';
  oscillator.frequency.setValueAtTime(isHit ? 800 : 200, audioCtx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(isHit ? 1200 : 100, audioCtx.currentTime + 0.1);
  
  gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
  
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + 0.1);
}

function triggerVibration(isHit) {
  if (!enableVibration) return;
  if ('vibrate' in navigator) {
    if (isHit) {
      navigator.vibrate(50);
    } else {
      navigator.vibrate([50, 100, 50]);
    }
  }
}

let snackbarTimeout;
function showSnackbar(mensaje) {
  const sb = document.getElementById('snackbar-undo');
  if (!sb) return;
  document.getElementById('snackbar-mensaje').textContent = mensaje;
  
  sb.classList.remove('translate-y-24', 'opacity-0');
  
  clearTimeout(snackbarTimeout);
  snackbarTimeout = setTimeout(() => {
    sb.classList.add('translate-y-24', 'opacity-0');
  }, 10000);
}



      let tiradores = [],
        baseTiradores = [],
        idSeleccionado = null,
        idHistorialDesplegado = null,
        estadoApp = "inicio";
      let precioHelice = 0,
        minimoPodio = 10,
        currentTheme = "dark",
        criterioOrden = "porcentaje",
        multiModeActivo = false;
      let seleccionadosMulti = [],
        mostrarDinero = true,
        graficoInstance = null;

      let modalCallback = null;

      function cerrarModalGenerico() {
        document.getElementById("modal-generico").classList.add("hidden");
        modalCallback = null;
      }

      function mostrarAlerta(mensaje) {
        document.getElementById("modal-generico").classList.remove("hidden");
        document.getElementById("modal-titulo").textContent = "Atención";
        document.getElementById("modal-mensaje").innerText = mensaje;
        document.getElementById("modal-input").classList.add("hidden");
        document.getElementById("btn-modal-cancelar").classList.add("hidden");

        const btnConf = document.getElementById("btn-modal-confirmar");
        btnConf.className =
          "flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl text-sm transition";
        btnConf.textContent = "Aceptar";
        btnConf.onclick = cerrarModalGenerico;
      }

      function mostrarConfirmacion(mensaje, callback, esPeligroso = false) {
        document.getElementById("modal-generico").classList.remove("hidden");
        document.getElementById("modal-titulo").textContent = "Confirmación";
        document.getElementById("modal-mensaje").innerText = mensaje;
        document.getElementById("modal-input").classList.add("hidden");
        document
          .getElementById("btn-modal-cancelar")
          .classList.remove("hidden");

        const btnConf = document.getElementById("btn-modal-confirmar");
        btnConf.className = `flex-1 ${esPeligroso ? "bg-red-600 hover:bg-red-500" : "bg-blue-600 hover:bg-blue-500"} text-white font-semibold py-2.5 rounded-xl text-sm transition`;
        btnConf.textContent = "Confirmar";

        document.getElementById("btn-modal-cancelar").onclick =
          cerrarModalGenerico;
        btnConf.onclick = () => {
          cerrarModalGenerico();
          if (callback) callback();
        };
      }


      function mostrarPrompt(mensaje, valorInicial, callback) {
        document.getElementById("modal-generico").classList.remove("hidden");
        document.getElementById("modal-titulo").textContent = "Ingresar dato";
        document.getElementById("modal-mensaje").innerText = mensaje;

        const input = document.getElementById("modal-input");
        input.classList.remove("hidden");
        input.value = valorInicial;
        input.focus();

        document
          .getElementById("btn-modal-cancelar")
          .classList.remove("hidden");

        const btnConf = document.getElementById("btn-modal-confirmar");
        btnConf.className =
          "flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl text-sm transition";
        btnConf.textContent = "Guardar";

        document.getElementById("btn-modal-cancelar").onclick =
          cerrarModalGenerico;
        btnConf.onclick = () => {
          const val = input.value;
          cerrarModalGenerico();
          if (callback) callback(val);
        };
      }

      document.addEventListener('fullscreenchange', () => {
        const switchFs = document.getElementById('switch-fullscreen');
        if (switchFs) {
          switchFs.checked = !!document.fullscreenElement;
        }
      });
      
      function toggleFullScreen() {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(err => {
            console.log(`Error al intentar habilitar pantalla completa: ${err.message}`);
          });
        } else {
          if (document.exitFullscreen) {
            document.exitFullscreen();
          }
        }
      }

      
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
}

window.onload = function () {
        try {
          if (localStorage.getItem("h_tiradores"))
            tiradores = JSON.parse(localStorage.getItem("h_tiradores")) || [];
          if (localStorage.getItem("h_base_tiradores"))
            baseTiradores = JSON.parse(localStorage.getItem("h_base_tiradores")) || [];
          if (localStorage.getItem("h_estado"))
            estadoApp = localStorage.getItem("h_estado") || "inicio";
          
          if (!localStorage.getItem("h_estado") && tiradores.length > 0) {
            estadoApp = "registro";
          }
          if (localStorage.getItem("h_idSel"))
            idSeleccionado = JSON.parse(localStorage.getItem("h_idSel"));
          if (localStorage.getItem("h_precio")) {
            precioHelice = parseFloat(localStorage.getItem("h_precio")) || 0;
            document.getElementById("precio-helice").value = precioHelice;
          }
          if (localStorage.getItem("h_minPodio")) {
            minimoPodio = parseInt(localStorage.getItem("h_minPodio")) || 10;
            document.getElementById("min-podio").value = minimoPodio;
          }
          if (localStorage.getItem("h_criterio"))
            criterioOrden = localStorage.getItem("h_criterio") || "porcentaje";
          if (localStorage.getItem("h_tema"))
            currentTheme = localStorage.getItem("h_tema") || "dark";
          if (localStorage.getItem("h_uxVibracion") !== null) {
            enableVibration = localStorage.getItem("h_uxVibracion") === "true";
            const swV = document.getElementById("switch-vibracion");
            if (swV) swV.checked = enableVibration;
          }
          if (localStorage.getItem("h_uxSonido") !== null) {
            enableSound = localStorage.getItem("h_uxSonido") === "true";
            const swS = document.getElementById("switch-sonido");
            if (swS) swS.checked = enableSound;
          }
          if (localStorage.getItem("h_uxWakeLock") !== null) {
            enableWakeLock = localStorage.getItem("h_uxWakeLock") === "true";
            const swW = document.getElementById("switch-wakelock");
            if (swW) swW.checked = enableWakeLock;
          }
          requestWakeLock();

          if (localStorage.getItem("h_mostrarDinero"))
            mostrarDinero = localStorage.getItem("h_mostrarDinero") !== "false";

          if (localStorage.getItem("h_multiModeActivo")) {
            multiModeActivo =
              localStorage.getItem("h_multiModeActivo") === "true";
            const switchEl = document.getElementById("switch-multimode");
            if (switchEl) switchEl.checked = multiModeActivo;

            const tituloLista = document.getElementById(
              "titulo-lista-tiradores",
            );
            if (tituloLista) {
              tituloLista.textContent = multiModeActivo
                ? "👥 Elegí 2 o 3 tiradores para tirar juntos:"
                : "Tiradores Añadidos (Toque para acciones)";
            }
          }
          if (localStorage.getItem("h_seleccionadosMulti")) {
            seleccionadosMulti =
              JSON.parse(localStorage.getItem("h_seleccionadosMulti")) || [];
          }

          aplicarTema(currentTheme, false);
          
          // Setup auth event listeners here since DOM is loaded
          const form = document.getElementById('form-auth');
          if (form) form.addEventListener('submit', handleAuth);
          
          const toggleBtn = document.getElementById('btn-toggle-auth');
          if (toggleBtn) toggleBtn.addEventListener('click', toggleAuthMode);
          
          // Auto-sync when internet connection is restored
          window.addEventListener('online', () => {
            if (authUser) {
              console.log('Conexión restaurada. Sincronizando datos pendientes...');
              showSnackbar('🌐 Conexión restaurada. Sincronizando...');
              syncCloudData();
            }
          });

          initAuth(); // This will eventually call restaurarEstadoDOM
        } catch (e) {
          localStorage.clear();
          tiradores = [];
          estadoApp = "registro";
          actualizarInterfaz();
          const sb = document.getElementById('snackbar-undo');
          if(sb) sb.classList.add('translate-y-24', 'opacity-0');
        }
      };

      function mostrarPantallaInicio() {
        estadoApp = "inicio";
        guardarEnLocalStorage();
        document.getElementById("pantalla-principal").classList.add("hidden");
        document.getElementById("pantalla-historial").classList.add("hidden");
        document.getElementById("pantalla-historial").classList.remove("flex");
        document.getElementById("pantalla-configuracion").classList.add("hidden");
        document.getElementById("pantalla-configuracion").classList.remove("flex");
        document.getElementById("pantalla-inicio").classList.remove("hidden");
        document.getElementById("pantalla-inicio").classList.add("flex");
        
        const btnContinuar = document.getElementById("btn-continuar-serie");
        if (btnContinuar) {
          if (tiradores.length > 0) {
            btnContinuar.classList.remove("hidden");
            btnContinuar.classList.add("flex");
          } else {
            btnContinuar.classList.add("hidden");
            btnContinuar.classList.remove("flex");
          }
        }
      }

      function iniciarNuevaSerie() {
        tiradores = [];
        idSeleccionado = null;
        estadoApp = "registro";
        guardarEnLocalStorage();
        
        document.getElementById("pantalla-inicio").classList.add("hidden");
        document.getElementById("pantalla-inicio").classList.remove("flex");
        document.getElementById("pantalla-principal").classList.remove("hidden");
        
        document.getElementById("panel-resultados").classList.add("hidden");
        document.getElementById("panel-configuracion").classList.add("hidden");
        document.getElementById("panel-registro").classList.remove("hidden");
        
        actualizarInterfaz();
      }

      function continuarSerieActual() {
        estadoApp = "registro";
        guardarEnLocalStorage();
        document.getElementById("pantalla-inicio").classList.add("hidden");
        document.getElementById("pantalla-inicio").classList.remove("flex");
        document.getElementById("pantalla-principal").classList.remove("hidden");
        document.getElementById("pantalla-configuracion").classList.add("hidden");
        document.getElementById("pantalla-configuracion").classList.remove("flex");
        
        document.getElementById("panel-resultados").classList.add("hidden");
        document.getElementById("panel-registro").classList.remove("hidden");
        
        actualizarInterfaz();
      }

      function verHistorialDesdeInicio() {
        mostrarPantallaHistorial();
      }

      function mostrarPantallaHistorial() {
        estadoApp = "historial";
        guardarEnLocalStorage();
        document.getElementById("pantalla-inicio").classList.add("hidden");
        document.getElementById("pantalla-inicio").classList.remove("flex");
        document.getElementById("pantalla-principal").classList.add("hidden");
        document.getElementById("pantalla-configuracion").classList.add("hidden");
        document.getElementById("pantalla-configuracion").classList.remove("flex");
        
        document.getElementById("pantalla-historial").classList.remove("hidden");
        document.getElementById("pantalla-historial").classList.add("flex");
        
        renderizarHistorialPantalla();
      }

      function guardarEnLocalStorage() {
        localStorage.setItem("h_tiradores", JSON.stringify(tiradores));
        localStorage.setItem("h_estado", estadoApp);
        localStorage.setItem("h_idSel", JSON.stringify(idSeleccionado));
        localStorage.setItem("h_precio", precioHelice.toString());
        localStorage.setItem("h_minPodio", minimoPodio.toString());
        localStorage.setItem("h_criterio", criterioOrden);
        localStorage.setItem("h_mostrarDinero", mostrarDinero.toString());
        localStorage.setItem("h_multiModeActivo", multiModeActivo.toString());
        localStorage.setItem(
          "h_seleccionadosMulti",
          JSON.stringify(seleccionadosMulti),
        );
      }

      function mostrarPantallaConfiguracion() {
        if (!authUser) return;
        document.getElementById("pantalla-inicio").classList.add("hidden");
        document.getElementById("pantalla-inicio").classList.remove("flex");
        document.getElementById("pantalla-principal").classList.add("hidden");
        document.getElementById("pantalla-historial").classList.add("hidden");
        document.getElementById("pantalla-historial").classList.remove("flex");
        
        document.getElementById("pantalla-configuracion").classList.remove("hidden");
        document.getElementById("pantalla-configuracion").classList.add("flex");
      }
      function cerrarPantallaConfiguracion() {
        document.getElementById("pantalla-configuracion").classList.add("hidden");
        document.getElementById("pantalla-configuracion").classList.remove("flex");
        
        if (estadoApp === "inicio") {
          mostrarPantallaInicio();
        } else if (estadoApp === "historial") {
          mostrarPantallaHistorial();
        } else if (estadoApp === "registro") {
          continuarSerieActual();
        } else if (estadoApp === "resultados") {
          document.getElementById("pantalla-principal").classList.remove("hidden");
          mostrarPantallaResultados();
        } else {
          mostrarPantallaInicio();
        }
      }

      function toggleMostrarDinero() {
        mostrarDinero = !mostrarDinero;
        guardarEnLocalStorage();
        mostrarPantallaResultados();
      }
      function irAPantallaPrincipal() {
        if (!authUser) return;
        mostrarPantallaInicio();
      }
      function escapeHTML(str) {
        if (!str) return "";
        return str
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");
      }

      function toggleTheme() {
        currentTheme = currentTheme === "dark" ? "light" : "dark";
        localStorage.setItem("h_tema", currentTheme);
        aplicarTema(currentTheme, true);
      }
      function cambiarPrecio() {
        precioHelice =
          parseFloat(document.getElementById("precio-helice").value) || 0;
        guardarEnLocalStorage();
      }
      function cambiarMinimumPodio() {
        minimoPodio = parseInt(document.getElementById("min-podio").value) || 0;
        guardarEnLocalStorage();
        if (estadoApp === "resultados") mostrarPantallaResultados();
      }
      function cambiarCriterioOrden(nc) {
        criterioOrden = nc;
        guardarEnLocalStorage();
        if (estadoApp === "resultados") {
          mostrarPantallaResultados();
        } else {
          verPodioParcial();
        }
      }
      function cerrarModalPodio() {
        document.getElementById("modal-podio").classList.add("hidden");
      }

      function aplicarTema(tema, conTransicion) {
        const b = document.body;
        const html = document.documentElement;
        const btn = document.getElementById("btn-tema");
        if (!b) return;

        if (tema === "dark") {
          html.classList.add("dark");
          b.className =
            "theme-dark min-h-screen flex flex-col font-sans antialiased" +
            (conTransicion ? " transition-colors duration-200" : "");
          if (btn) btn.textContent = "🌙";
        } else {
          html.classList.remove("dark");
          b.className =
            "theme-light min-h-screen flex flex-col font-sans antialiased" +
            (conTransicion ? " transition-colors duration-200" : "");
          if (btn) btn.textContent = "☀️";
        }

        // Actualizar tarjetas dinámicamente
        const cards = document.querySelectorAll(".card-dark, .card-light");
        cards.forEach((c) => {
          c.classList.remove("card-dark", "card-light");
          c.classList.add(tema === "dark" ? "card-dark" : "card-light");
        });

        if (graficoInstance)
          renderizarGraficoBarras(obtenerListaOrdenada(true));
      }

      function toggleMultiModeLogica() {
        multiModeActivo = document.getElementById("switch-multimode").checked;
        idSeleccionado = null;
        idHistorialDesplegado = null;
        seleccionadosMulti = [];
        const tl = document.getElementById("titulo-lista-tiradores");
        if (tl)
          tl.textContent = multiModeActivo
            ? "👥 Elegí 2 o 3 tiradores para tirar juntos:"
            : "Tiradores Añadidos (Toque para acciones)";
        guardarEnLocalStorage();
        actualizarInterfaz();
            const sb = document.getElementById('snackbar-undo');
            if(sb) sb.classList.add('translate-y-24', 'opacity-0');
          }

      function compartirWhatsApp() {
        const ord = obtenerListaOrdenada(true);
        let texto = `*🏆 Resumen de Tiro*\n_Fecha: ${new Date().toLocaleDateString("es-AR")}_\n\n`;
        ord.forEach((t, i) => {
          const s = obtenerEstadisticas(t);
          texto += `${i + 1}. *${t.nombre}*: ${s.pegados}/${s.total} (${s.efectividad}%)\n`;
        });
        const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
        window.open(url, "_blank");
      }

      function compartirWhatsAppIndividual(id, event) {
        if (event) event.stopPropagation();
        const t = tiradores.find((x) => x.id === id);
        if (!t) return;
        const s = obtenerEstadisticas(t);
        const cadena = t.tiros.map((x) => (x ? "🟢" : "🔴")).join("");

        const cantInd = t.tiros.length;
        const cantMulti = Math.ceil(t.tirosMultiCargados || 0);
        const totalInd = cantInd * precioHelice;
        const totalMulti = cantMulti * precioHelice;

        const fecha = new Date().toLocaleDateString("es-AR");

        let texto = `*🎯 Reporte de Tiro Individual*\n`;
        texto += `*Fecha:* ${fecha}\n`;
        texto += `*Tirador:* ${t.nombre}\n`;
        texto += `*Resultado:* ${s.pegados} de ${s.total}\n`;
        texto += `*Secuencia:* ${cadena}\n`;
        texto += `*Eficacia:* ${s.efectividad}%\n`;
        texto += `*Racha Máx:* ${s.rachaMaxima}\n\n`;

        texto += `*Liquidación:*\n`;
        texto += `*Hélices Individuales:* ${cantInd} ($${totalInd.toFixed(0)})\n`;
        if (cantMulti > 0) {
          texto += `*Hélices Múltiples:* ${cantMulti} ($${totalMulti.toFixed(0)})\n`;
        }
        texto += `*Total a Abonar:* $${s.costoTotal.toFixed(0)}`;

        const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
        window.open(url, "_blank");
      }

      function imprimirReporteIndividual(id, event) {
        if (event) event.stopPropagation();
        const t = tiradores.find((x) => x.id === id);
        if (!t) return;

        const s = obtenerEstadisticas(t);
        const fInd = document.getElementById("pdf-ind-fecha");
        if (fInd) fInd.textContent = new Date().toLocaleDateString("es-AR");
        document.getElementById("pdf-ind-nombre").textContent = t.nombre;
        document.getElementById("pdf-ind-total").textContent = s.total;
        document.getElementById("pdf-ind-pegados").textContent = s.pegados;
        document.getElementById("pdf-ind-errados").textContent = s.errados;
        document.getElementById("pdf-ind-efectividad").textContent =
          s.efectividad + "%";
        document.getElementById("pdf-ind-racha").textContent = s.rachaMaxima;
        document.getElementById("pdf-ind-cadena").innerHTML = t.tiros
          .map((x) => (x ? `<span style="display:inline-block; width:16px; height:16px; background-color:#10b981; border-radius:50%; box-shadow: 0 1px 2px rgba(0,0,0,0.1);"></span>` : `<span style="display:inline-block; width:16px; height:16px; background-color:#ef4444; border-radius:50%; box-shadow: 0 1px 2px rgba(0,0,0,0.1);"></span>`))
          .join("");

        // Desglose de costos
        const cantInd = t.tiros.length;
        const cantMulti = Math.ceil(t.tirosMultiCargados || 0);
        const totalInd = cantInd * precioHelice;
        const totalMulti = cantMulti * precioHelice;

        document.getElementById("pdf-ind-cant-ind").textContent = cantInd;
        document.getElementById("pdf-ind-unit-ind").textContent =
          precioHelice.toFixed(0);
        document.getElementById("pdf-ind-total-ind").textContent =
          totalInd.toFixed(0);

        const mLine = document.getElementById("pdf-ind-multi-linea");
        if (cantMulti > 0) {
          mLine.style.display = "table-row";
          document.getElementById("pdf-ind-cant-multi").textContent = cantMulti;
          document.getElementById("pdf-ind-unit-multi").textContent =
            precioHelice.toFixed(0);
          document.getElementById("pdf-ind-total-multi").textContent =
            totalMulti.toFixed(0);
        } else {
          mLine.style.display = "none";
        }
        document.getElementById("pdf-ind-monto").textContent =
          s.costoTotal.toFixed(0);

        // Secuencias multimode
        const mCont = document.getElementById("pdf-ind-multi-container");
        const mSec = document.getElementById("pdf-ind-multi-secuencias");
        const gruposRel = tiradores.filter(
          (x) =>
            x.esGrupo && x.idsComponentes && x.idsComponentes.includes(t.id),
        );

        if (gruposRel.length > 0) {
          mCont.style.display = "block";
          mSec.innerHTML = "";
          gruposRel.forEach((g) => {
            const gDiv = document.createElement("div");
            gDiv.style.marginBottom = "8px";
            const gCadena = g.tiros.map((x) => (x ? `<span style="display:inline-block; width:10px; height:10px; background-color:#10b981; border-radius:50%; margin-right:3px;"></span>` : `<span style="display:inline-block; width:10px; height:10px; background-color:#ef4444; border-radius:50%; margin-right:3px;"></span>`)).join("");
            gDiv.innerHTML = `<div style="font-weight:700; color:#475569; margin-bottom:4px;">${g.nombre}</div><div style="display:flex; flex-wrap:wrap;">${gCadena}</div>`;
            mSec.appendChild(gDiv);
          });
        } else {
          mCont.style.display = "none";
        }

        const wG = document.getElementById("wrapper-pdf");
        const wI = document.getElementById("wrapper-individual-pdf");

        if(wG) wG.classList.add("hidden");
        
        prepararYImprimir(wI, `Reporte Individual - ${t.nombre}`);
      }

      function manejarSeleccionMultiMode(id) {
        const idx = seleccionadosMulti.indexOf(id);
        if (idx > -1) {
          seleccionadosMulti.splice(idx, 1);
        } else {
          if (seleccionadosMulti.length >= 3) {
            mostrarAlerta("Máximo 3 tiradores.");
            return;
          }
          seleccionadosMulti.push(id);
        }
        guardarEnLocalStorage();
        actualizarInterfaz();
            const sb = document.getElementById('snackbar-undo');
            if(sb) sb.classList.add('translate-y-24', 'opacity-0');
          }

      function agregarTirador(nombreManual = null) {
        const i = document.getElementById("nombre-tirador");
        const n = (nombreManual !== null) ? nombreManual : i.value.trim();
        if (n === "") return;
        tiradores.push({
          id: Date.now() + Math.random(),
          nombre: n,
          tiros: [],
          tirosMultiCargados: 0,
          esGrupo: false,
        });
        
        if (!baseTiradores.includes(n)) {
          baseTiradores.push(n);
          localStorage.setItem("h_base_tiradores", JSON.stringify(baseTiradores));
          syncCloudData();
        }

        if (nombreManual === null) i.value = "";
        guardarEnLocalStorage();
        actualizarInterfaz();
        const sb = document.getElementById('snackbar-undo');
        if(sb) sb.classList.add('translate-y-24', 'opacity-0');
      }


      function abrirModalBaseTiradores() {
        renderizarBaseTiradores();
        document.getElementById("modal-base-tiradores").classList.remove("hidden");
      }

      function cerrarModalBaseTiradores() {
        document.getElementById("modal-base-tiradores").classList.add("hidden");
      }

      function renderizarBaseTiradores() {
        const lista = document.getElementById("lista-base-tiradores");
        lista.innerHTML = "";
        
        const disponibles = baseTiradores.filter(n => !tiradores.some(t => t.nombre === n && !t.esGrupo));

        if (disponibles.length === 0) {
          lista.innerHTML = `<div class="text-center text-xs text-gray-500 py-4">No hay tiradores frecuentes guardados o todos ya están en la serie.</div>`;
          return;
        }

        disponibles.forEach((nombre) => {
          const div = document.createElement("div");
          div.className = `p-2 rounded-lg border flex justify-between items-center cursor-pointer mb-2 ${currentTheme === "dark" ? "bg-gray-800 border-gray-700 text-gray-200" : "bg-gray-50 border-gray-200 text-gray-700"}`;
          div.innerHTML = `
            <div class="flex-1 truncate font-semibold" onclick="agregarDesdeBase('${nombre}')">${nombre}</div>
            <button onclick="eliminarDeBaseTiradores('${nombre}', event)" class="text-xs text-gray-500 hover:text-red-500 ml-2 px-2 py-1">❌</button>
          `;
          lista.appendChild(div);
        });
      }

      function agregarDesdeBase(nombre) {
        agregarTirador(nombre);
        cerrarModalBaseTiradores();
      }

      function eliminarDeBaseTiradores(nombre, event) {
        event.stopPropagation();
        baseTiradores = baseTiradores.filter(n => n !== nombre);
        localStorage.setItem("h_base_tiradores", JSON.stringify(baseTiradores));
        syncCloudData();
        renderizarBaseTiradores();
      }
      function editarTirador(id, event) {
        event.stopPropagation();
        const t = tiradores.find((x) => x.id === id);
        if (!t) return;
        mostrarPrompt("Editar nombre:", t.nombre, (nn) => {
          if (nn && nn.trim() !== "") {
            t.nombre = nn.trim();
            guardarEnLocalStorage();
            actualizarInterfaz();
            const sb = document.getElementById('snackbar-undo');
            if(sb) sb.classList.add('translate-y-24', 'opacity-0');
          }
        });
      }
      function eliminarTirador(id, event) {
        event.stopPropagation();
        mostrarConfirmacion(
          "¿Eliminar tirador?",
          () => {
            tiradores = tiradores.filter((x) => x.id !== id);
            if (idSeleccionado === id) idSeleccionado = null;
            guardarEnLocalStorage();
            actualizarInterfaz();
            const sb = document.getElementById('snackbar-undo');
            if(sb) sb.classList.add('translate-y-24', 'opacity-0');
          },
          true,
        );
      }
      function seleccionarTirador(id) {
        if (multiModeActivo) return;
        if (idSeleccionado === id) {
          idHistorialDesplegado = idHistorialDesplegado === id ? null : id;
        } else {
          idSeleccionado = id;
          idHistorialDesplegado = null;
        }
        guardarEnLocalStorage();
        actualizarInterfaz();
            const sb = document.getElementById('snackbar-undo');
            if(sb) sb.classList.add('translate-y-24', 'opacity-0');
          }

      function mostrarFeedbackVisual(pego) {
        const card = document.getElementById("card-tiro");
        if (!card) return;

        card.style.transition =
          "background-color 0.3s ease, border-color 0.3s ease";

        if (pego) {
          card.style.backgroundColor =
            currentTheme === "dark"
              ? "rgba(20, 83, 45, 0.6)"
              : "rgba(187, 247, 208, 0.8)";
          card.style.borderColor = "#22c55e";
        } else {
          card.style.backgroundColor =
            currentTheme === "dark"
              ? "rgba(127, 29, 29, 0.6)"
              : "rgba(254, 202, 202, 0.8)";
          card.style.borderColor = "#ef4444";
        }

        setTimeout(() => {
          card.style.backgroundColor = "";
          card.style.borderColor = "";
        }, 400);
      }

      function registrarTiro(pego) {
        if (!multiModeActivo) {
          if (idSeleccionado === null) return;
          const t = tiradores.find((x) => x.id === idSeleccionado);
          if (t) {
            t.tiros.push(pego);
            guardarEnLocalStorage();
            actualizarInterfaz();
            mostrarFeedbackVisual(pego);
            triggerVibration(pego);
            playSound(pego);
            showSnackbar('Tiro registrado');
          }
        } else {
          if (seleccionadosMulti.length < 2) {
            mostrarAlerta("Seleccioná al menos 2 tiradores.");
            return;
          }
          const ng = tiradores
            .filter((x) => seleccionadosMulti.includes(x.id))
            .map((x) => x.nombre)
            .sort()
            .join(" + ");
          let g = tiradores.find((x) => x.nombre === ng && x.esGrupo === true);
          if (!g) {
            g = {
              id: Date.now() + Math.floor(Math.random() * 100),
              nombre: ng,
              tiros: [],
              esGrupo: true,
              idsComponentes: [...seleccionadosMulti],
            };
            tiradores.push(g);
          }
          g.tiros.push(pego);
          const tp = seleccionadosMulti.length;
          seleccionadosMulti.forEach((cid) => {
            const c = tiradores.find((x) => x.id === cid);
            if (c) c.tirosMultiCargados += 1 / tp;
          });
          guardarEnLocalStorage();
          actualizarInterfaz();
          mostrarFeedbackVisual(pego);
            triggerVibration(pego);
            playSound(pego);
            showSnackbar('Tiro registrado');
        }
      }

      function deshacerUltimoTiro() {
        if (!multiModeActivo) {
          if (idSeleccionado === null) return;
          const t = tiradores.find((x) => x.id === idSeleccionado);
          if (t && t.tiros.length > 0) {
            t.tiros.pop();
            guardarEnLocalStorage();
            actualizarInterfaz();
            const sb = document.getElementById('snackbar-undo');
            if(sb) sb.classList.add('translate-y-24', 'opacity-0');
          }
        } else {
          if (seleccionadosMulti.length < 2) return;
          const ng = tiradores
            .filter((x) => seleccionadosMulti.includes(x.id))
            .map((x) => x.nombre)
            .sort()
            .join(" + ");
          const g = tiradores.find(
            (x) => x.nombre === ng && x.esGrupo === true,
          );
          if (g && g.tiros.length > 0) {
            g.tiros.pop();
            const tp = seleccionadosMulti.length;
            seleccionadosMulti.forEach((cid) => {
              const c = tiradores.find((x) => x.id === cid);
              if (c && c.tirosMultiCargados > 0) c.tirosMultiCargados -= 1 / tp;
            });
            guardarEnLocalStorage();
            actualizarInterfaz();
            const sb = document.getElementById('snackbar-undo');
            if(sb) sb.classList.add('translate-y-24', 'opacity-0');
          }
        }
      }

      function obtenerEstadisticas(t) {
        if (!t)
          return {
            total: 0,
            pegados: 0,
            errados: 0,
            efectividad: "0.0",
            rachaActual: 0,
            rachaMaxima: 0,
            rachaNegativaActual: 0,
            costoTotal: 0,
            totalACobrar: 0,
          };
        const ts = Array.isArray(t.tiros) ? t.tiros : [];
        const p = ts.filter((v) => v === true).length;
        const e = ts.filter((v) => v === false).length;
        const tot = ts.length;
        const ef = tot > 0 ? ((p / tot) * 100).toFixed(1) : "0.0";
        const tmc = t.tirosMultiCargados || 0;
        const tac = t.esGrupo ? 0 : Math.ceil(tot + tmc);
        const ct = tac * precioHelice;
        let act = 0,
          max = 0,
          actNeg = 0;
        for (let i = 0; i < ts.length; i++) {
          if (ts[i] === true) {
            act++;
            actNeg = 0;
            if (act > max) max = act;
          } else {
            act = 0;
            actNeg++;
          }
        }
        return {
          total: tot,
          pegados: p,
          errados: e,
          efectividad: ef,
          rachaActual: act,
          rachaMaxima: max,
          rachaNegativaActual: actNeg,
          costoTotal: ct,
          totalACobrar: tac,
        };
      }

      function obtenerListaOrdenada(inclGrupos = true) {
        let l = inclGrupos ? tiradores : tiradores.filter((x) => !x.esGrupo);
        return [...l].sort((a, b) => {
          const sA = obtenerEstadisticas(a),
            sB = obtenerEstadisticas(b);
          if (criterioOrden === "porcentaje") {
            return (
              parseFloat(sB.efectividad) - parseFloat(sA.efectividad) ||
              sB.pegados - sA.pegados
            );
          } else {
            return (
              sB.pegados - sA.pegados ||
              parseFloat(sB.efectividad) - parseFloat(sA.efectividad)
            );
          }
        });
      }

      function actualizarInterfaz() {
        let totalHelicesGlobal = 0;
        tiradores.forEach((t) => {
          if (!t.esGrupo) {
            const ts = t.tiros || [];
            const mc = t.tirosMultiCargados || 0;
            totalHelicesGlobal += ts.length + mc;
          }
        });
        const indTot = document.getElementById("indicador-total-helices");
        if (indTot)
          indTot.textContent = `Total: ${Math.ceil(totalHelicesGlobal)}`;

        const lista = document.getElementById("lista-tiradores");
        if (!lista) return;
        lista.innerHTML = "";
        const visibles = tiradores.filter((x) => !x.esGrupo);
        if (visibles.length === 0) {
          lista.innerHTML = `<div id="lista-vacia-estado" class="absolute inset-0 flex flex-col items-center justify-center text-center p-2 opacity-60">
              <p class="text-xs font-semibold text-gray-400 uppercase tracking-widest">Pedana vacía</p>
            </div>`;
        }
        visibles.forEach((t) => {
          const s = obtenerEstadisticas(t);
          const esS = t.id === idSeleccionado;
          const mH = t.id === idHistorialDesplegado;
          const mM = seleccionadosMulti.includes(t.id);
          const idiv = document.createElement("div");
          if (!multiModeActivo) {
            idiv.className = `p-3 rounded-lg border cursor-pointer ${esS ? (currentTheme === "dark" ? "bg-blue-950/40 border-blue-500 text-blue-200" : "bg-blue-50 border-blue-500 text-blue-900") : currentTheme === "dark" ? "bg-gray-900/60 border-gray-700 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-700"}`;
            idiv.onclick = () => seleccionarTirador(t.id);
            // SWIPE LOGIC
            let touchStartX = 0;
            idiv.addEventListener('touchstart', e => {
              touchStartX = e.changedTouches[0].screenX;
              idiv.style.transition = 'none';
            }, {passive: true});
            idiv.addEventListener('touchmove', e => {
              const deltaX = e.changedTouches[0].screenX - touchStartX;
              if (Math.abs(deltaX) < 80) {
                idiv.style.transform = 'translateX(' + deltaX + 'px)';
              }
            }, {passive: true});
            idiv.addEventListener('touchend', e => {
              const touchEndX = e.changedTouches[0].screenX;
              idiv.style.transition = 'transform 0.2s ease';
              idiv.style.transform = 'translateX(0)';
              const swipeThreshold = 40;
              if (touchEndX < touchStartX - swipeThreshold) {
                eliminarTirador(t.id);
              }
              if (touchEndX > touchStartX + swipeThreshold) {
                editarTirador(t.id);
              }
            });

            idiv.innerHTML = `<div class="flex justify-between items-center w-full"><div class="truncate font-semibold text-sm flex-1 mr-2">${t.nombre}</div><div class="flex items-center gap-2"><span class="text-[11px] font-mono opacity-80 px-1.5 py-0.5 rounded ${currentTheme === "dark" ? "bg-gray-800 text-gray-400" : "bg-gray-200 text-gray-600"}">H: ${t.tiros.length} | P:${s.pegados}</span><button onclick="editarTirador(${t.id}, event)" class="text-xs">✏️</button><button onclick="eliminarTirador(${t.id}, event)" class="text-xs">❌</button></div></div>`;
            if (mH) {
              const ct =
                t.tiros.length > 0
                  ? t.tiros.map((x) => (x ? "🟢" : "🔴")).join(" ")
                  : "Sin tiros individuales";
              const hdiv = document.createElement("div");
              hdiv.className =
                "mt-2 pt-2 border-t border-gray-700/50 text-xs space-y-2 opacity-90";
              hdiv.innerHTML = `<div class="tracking-widest overflow-x-auto py-0.5 font-mono">${ct}</div><div class="flex justify-between text-[11px] opacity-70"><span>Racha: 🔥 ${s.rachaActual} | Max: 🏆 ${s.rachaMaxima}</span><span>Total: $${s.costoTotal.toFixed(0)}</span></div><div class="grid grid-cols-2 gap-2 pt-1"><button onclick="imprimirReporteIndividual(${t.id}, event)" class="bg-blue-600/30 text-blue-300 text-[10px] py-1 rounded border border-blue-500/40 hover:bg-blue-600 hover:text-white">📄 PDF</button><button onclick="compartirWhatsAppIndividual(${t.id}, event)" class="bg-emerald-600/30 text-emerald-300 text-[10px] py-1 rounded border border-emerald-500/40 hover:bg-emerald-600 hover:text-white">💬 Wpp</button></div>`;
              idiv.appendChild(hdiv);
            }
          } else {
            idiv.className = `p-3 rounded-lg border flex justify-between items-center cursor-pointer ${mM ? (currentTheme === "dark" ? "bg-purple-950/40 border-purple-500 text-purple-200" : "bg-purple-50 border-purple-500 text-purple-900") : currentTheme === "dark" ? "bg-gray-900/60 border-gray-700 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-700"}`;
            idiv.onclick = () => manejarSeleccionMultiMode(t.id);
            idiv.innerHTML = `<div class="truncate font-semibold text-sm flex-1">${t.nombre}</div><input type="checkbox" ${mM ? "checked" : ""} class="w-4 h-4 accent-purple-500 pointer-events-none">`;
          }
          lista.appendChild(idiv);
        });
        const tn = document.getElementById("tirador-seleccionado-nombre"),
          bp = document.getElementById("btn-pego"),
          be = document.getElementById("btn-erro"),
          bd = document.getElementById("btn-deshacer"),
          br = document.getElementById("indicador-racha"),
          brNeg = document.getElementById("indicador-racha-negativa");
          
        let msd = document.getElementById("multimode-sequence-display");
        if (!msd && tn && tn.parentNode) {
          msd = document.createElement("div");
          msd.id = "multimode-sequence-display";
          msd.className = "hidden text-xs font-mono tracking-widest bg-black/20 p-2 rounded border border-gray-700/50 min-h-[30px] flex items-center justify-center";
          tn.parentNode.insertBefore(msd, tn.nextSibling);
        }
          if (!multiModeActivo) {
            const grd = document.getElementById("grupo-racha-display");
            if (grd) grd.classList.add("hidden");
            if (msd) msd.classList.add("hidden");
          if (idSeleccionado !== null) {
            const sel = tiradores.find((x) => x.id === idSeleccionado);
            if (sel) {
              const s = obtenerEstadisticas(sel);
              tn.textContent = `🎯 ${sel.nombre}`;
              bp.disabled = false;
              be.disabled = false;
              if (bd) bd.disabled = sel.tiros.length === 0;
              if (s.rachaActual > 0) {
                br.textContent = `🔥 Racha: ${s.rachaActual}`;
                br.classList.remove("hidden");
              } else {
                br.classList.add("hidden");
              }
              if (s.rachaNegativaActual > 0) {
                brNeg.textContent = `🧊 Racha: ${s.rachaNegativaActual}`;
                brNeg.classList.remove("hidden");
              } else {
                brNeg.classList.add("hidden");
              }
            }
          } else {
            tn.textContent = "Seleccioná un tirador";
            bp.disabled = true;
            be.disabled = true;
            if (bd) bd.disabled = true;
            br.classList.add("hidden");
            brNeg.classList.add("hidden");
          }
        } else {
          br.classList.add("hidden");
          brNeg.classList.add("hidden");
          let grd = document.getElementById("grupo-racha-display");
          if (!grd) {
            grd = document.createElement("div");
            grd.id = "grupo-racha-display";
            grd.className = "hidden flex justify-center gap-2 mt-1 mb-2";
            const tnEl = document.getElementById("tirador-seleccionado-nombre");
            if (tnEl && tnEl.parentNode) {
              tnEl.parentNode.insertBefore(grd, tnEl.nextSibling);
            }
          }
          if (seleccionadosMulti.length >= 2) {
            const ng = tiradores
              .filter((x) => seleccionadosMulti.includes(x.id))
              .map((x) => x.nombre)
              .sort()
              .join(" + ");
            tn.textContent = `👥 ${ng}`;
            bp.disabled = false;
            be.disabled = false;
            const ge = tiradores.find(
              (x) => x.nombre === ng && x.esGrupo === true,
            );
            if (bd) bd.disabled = !ge || ge.tiros.length === 0;
            
            if (grd) {
              let rachaAct = 0;
              let rachaNeg = 0;
              if (ge) {
                const s = obtenerEstadisticas(ge);
                rachaAct = s.rachaActual;
                rachaNeg = s.rachaNegativaActual;
              }
              
              let html = "";
              if (rachaNeg > 0) {
                html = `<div class="bg-blue-600/20 text-blue-300 text-xs md:text-sm font-bold px-2.5 py-0.5 rounded-full border border-blue-600/40">🧊 Racha Grupo: ${rachaNeg}</div>`;
              } else {
                html = `<div class="bg-yellow-600/20 text-yellow-400 text-xs md:text-sm font-bold px-2.5 py-0.5 rounded-full border border-yellow-600/40 ${rachaAct > 0 ? 'animate-pulse' : ''}">🔥 Racha Grupo: ${rachaAct}</div>`;
              }
              
              grd.innerHTML = html;
              grd.classList.remove("hidden");
            }
            
            if (msd) {
              msd.classList.remove("hidden");
              msd.innerHTML =
                ge && ge.tiros.length > 0
                  ? ge.tiros.map((x) => (x ? "🟢" : "🔴")).join(" ")
                  : '<span class="opacity-50 italic">Sin tiros de equipo</span>';
            }
          } else {
            tn.textContent = "Elegí 2 o 3 tiradores arriba";
            bp.disabled = true;
            be.disabled = true;
            if (bd) bd.disabled = true;
            if (msd) msd.classList.add("hidden");
            const grd = document.getElementById("grupo-racha-display");
            if (grd) grd.classList.add("hidden");
          }
        }
      }

      function verPodioParcial() {
        const podio = document.getElementById("contenedor-podio-parcial"),
          lc = document.getElementById("lista-parcial-completa");
        if (!podio || !lc) return;
        podio.innerHTML = "";
        lc.innerHTML = "";
        document.getElementById("modal-requisito-texto").textContent =
          `*Mínimo para podio: ${minimoPodio} hélices`;
        const bPct = document.getElementById("btn-modal-porcentaje"),
          bHel = document.getElementById("btn-modal-helices");
        if (criterioOrden === "porcentaje") {
          bPct.className = "px-1.5 py-0.5 rounded bg-blue-600 text-white";
          bHel.className = "px-1.5 py-0.5 rounded text-gray-400";
        } else {
          bPct.className = "px-1.5 py-0.5 rounded text-gray-400";
          bHel.className = "px-1.5 py-0.5 rounded bg-blue-600 text-white";
        }
        const ord = obtenerListaOrdenada(false);
        const fPod = ord
          .map((x) => ({ t: x, stats: obtenerEstadisticas(x) }))
          .filter((item) => item.stats.total >= minimoPodio);
        renderizarEstructuraPodio(fPod);
        ord.forEach((t, i) => {
          const s = obtenerEstadisticas(t);
          const r = document.createElement("div");
          r.className = `flex justify-between items-center text-xs py-1 px-2 rounded font-mono ${currentTheme === "dark" ? "hover:bg-gray-700/50 text-gray-300" : "hover:bg-gray-100 text-gray-700"}`;
          const txt =
            criterioOrden === "porcentaje"
              ? `<strong>${s.efectividad}%</strong> | P: ${s.pegados} | Tot: ${s.total}`
              : `<strong class="text-green-400">${s.pegados} P</strong> | ${s.efectividad}% | Tot: ${s.total}`;
          r.innerHTML = `<span class="font-sans font-medium truncate max-w-[140px]">${i + 1}. ${t.nombre}</span><span>${txt}</span>`;
          lc.appendChild(r);
        });
        document.getElementById("modal-podio").classList.remove("hidden");
      }

      function finalizarSesion() {
        if (tiradores.length === 0) {
          mostrarAlerta("Primero debés agregar al menos un tirador.");
          return;
        }
        estadoApp = "resultados";
        guardarEnLocalStorage();
        mostrarPantallaResultados();
      }

      function volverALaPedana() {
        estadoApp = "registro";
        guardarEnLocalStorage();
        
        const pReg = document.getElementById("panel-registro");
        const pRes = document.getElementById("panel-resultados");
        if (pRes) pRes.classList.add("hidden");
        if (pReg) pReg.classList.remove("hidden");
        
        actualizarInterfaz();
      }

      function guardarYFinalizarSesion() {
        mostrarConfirmacion(
          "⚠️ ¿Estás seguro de finalizar y guardar la sesión?\nSe archivará la planilla actual en el historial.",
          () => {
            let hist = [];
            if (localStorage.getItem("h_historial"))
              hist = JSON.parse(localStorage.getItem("h_historial"));
            hist.unshift({
              id: Date.now(),
              fecha: new Date().toLocaleString("es-AR"),
              precioUnitario: precioHelice,
              tiradores: JSON.parse(JSON.stringify(tiradores)),
            });
            localStorage.setItem("h_historial", JSON.stringify(hist));
            syncCloudData();
            
            // Clean up the active session
            tiradores = [];
            idSeleccionado = null;
            seleccionadosMulti = [];
            multiModeActivo = false;
            estadoApp = "inicio";
            guardarEnLocalStorage();
            
            // Render the history sidebar with the newly saved session
            renderizarHistorialPantalla();
            
            // Show the initial start screen (the main landing page)
            mostrarPantallaInicio();
            
            showSnackbar("Sesión guardada con éxito");
          },
          false,
        );
      }

      function mostrarPantallaResultados() {
        const pReg = document.getElementById("panel-registro");
        const pConf = document.getElementById("panel-configuracion");
        const pRes = document.getElementById("panel-resultados");
        if (pReg) pReg.classList.add("hidden");
        if (pConf) pConf.classList.add("hidden");
        if (pRes) pRes.classList.remove("hidden");
        
        const req = document.getElementById("podio-requisito-texto");
        if (req)
          req.textContent = `*Mínimo obligatorio: ${minimoPodio} hélices disparadas`;
        const bPct = document.getElementById("btn-orden-porcentaje"),
          bHel = document.getElementById("btn-orden-helices"),
          thD = document.querySelector(".th-dinero-col"),
          cFin = document.getElementById("card-resumen-financiero");
        if (criterioOrden === "porcentaje") {
          if (bPct)
            bPct.className = "px-2 py-1 rounded-md bg-blue-600 text-white";
          if (bHel) bHel.className = "px-2 py-1 rounded-md text-gray-400";
          document.getElementById("col-dinamica-header").textContent =
            "% Efic.";
        } else {
          if (bPct) bPct.className = "px-2 py-1 rounded-md text-gray-400";
          if (bHel)
            bHel.className = "px-2 py-1 rounded-md bg-blue-600 text-white";
          document.getElementById("col-dinamica-header").textContent =
            "P. Totales";
        }
        if (mostrarDinero) {
          document.getElementById("btn-toggle-dinero").textContent = "👁️";
          if (cFin) cFin.classList.remove("hidden");
          if (thD) thD.classList.remove("hidden");
        } else {
          document.getElementById("btn-toggle-dinero").textContent = "🙈";
          if (cFin) cFin.classList.add("hidden");
          if (thD) thD.classList.add("hidden");
        }

        const ord = obtenerListaOrdenada(false);
        const fPod = ord
          .map((x) => ({ t: x, stats: obtenerEstadisticas(x) }))
          .filter((item) => item.stats.total >= minimoPodio);
        renderizarEstructuraPodio(fPod);
        const tabla = document.getElementById("tabla-resultados");
        if (tabla) {
          tabla.innerHTML = "";
          let gH = 0,
            gD = 0;

          tiradores.forEach((t) => {
            const s = obtenerEstadisticas(t);
            if (!t.esGrupo) {
              gD += s.costoTotal;
              gH += t.tiros.length;
            } else {
              gH += s.total;
            }
          });

          ord.forEach((t) => {
            const s = obtenerEstadisticas(t);
            const cD =
              criterioOrden === "porcentaje"
                ? `${s.efectividad}%`
                : `${s.pegados} P`;
            const sV = t.esGrupo
              ? `<span class="text-gray-500 italic text-xs">Grupal</span>`
              : `$${s.costoTotal.toFixed(0)}`;
            const fila = document.createElement("tr");
            fila.className = "border-b border-gray-700/30 hover:bg-gray-50/5";
            fila.innerHTML = `<td class="py-2.5 font-semibold truncate max-w-[140px]">${t.nombre}</td><td class="py-2.5 text-center font-mono">${s.total}</td><td class="py-2.5 text-center text-green-400 font-bold font-mono">${s.pegados}</td><td class="py-2.5 text-right font-mono text-green-500 font-bold ${!mostrarDinero ? "hidden" : ""}">${sV}</td><td class="py-2.5 text-right font-mono text-gray-300 font-bold">${cD}</td>`;
            tabla.appendChild(fila);
          });
          document.getElementById("resumen-total-helices").textContent =
            `${gH} hélices disparadas`;
          document.getElementById("resumen-total-dinero").textContent =
            `$${gD.toFixed(0)}`;
        }
        renderizarGraficoBarras(ord);
      }

      function renderizarEstructuraPodio(listaFiltrada) {
        const podio = document.getElementById(
          estadoApp === "resultados"
            ? "contenedor-podio"
            : "contenedor-podio-parcial",
        );
        if (!podio) return;
        podio.innerHTML = "";
        const puestos = [
          { idx: 1, lbl: "2°", c: "bg-gray-400", h: "h-24" },
          { idx: 0, lbl: "1°", c: "bg-yellow-500", h: "h-32" },
          { idx: 2, lbl: "3°", c: "bg-amber-700", h: "h-16" },
        ];
        puestos.forEach((p) => {
          const item = listaFiltrada[p.idx];
          const col = document.createElement("div");
          col.className =
            "flex flex-col items-center justify-end flex-1 max-w-[90px] min-h-[140px]";
          if (item) {
            const vSub =
              criterioOrden === "porcentaje"
                ? `${item.stats.efectividad}%`
                : `${item.stats.pegados} P`;
            col.innerHTML = `<div class="text-[11px] font-bold truncate w-full text-center mb-1">${item.t.nombre}</div><div class="text-[10px] font-mono text-blue-400 font-bold mb-2">${vSub}</div><div class="${p.c} ${p.h} w-full rounded-t-lg flex items-center justify-center text-gray-950 font-black text-lg shadow-md">${p.lbl}</div>`;
          } else {
            col.innerHTML = `<div class="bg-gray-700/20 h-8 w-full rounded-t-lg border border-dashed border-gray-600 flex items-center justify-center text-xs text-gray-600">-</div>`;
          }
          podio.appendChild(col);
        });
      }

      function renderizarGraficoBarras(ord) {
        const canvasEl = document.getElementById("graficoResultados"),
          wrapper = document.getElementById("wrapper-canvas-grafico");
        if (!canvasEl || !wrapper || typeof Chart === "undefined") return;
        if (graficoInstance) graficoInstance.destroy();
        const totT = ord.length;
        wrapper.style.width = totT > 3 ? `${totT * 135}px` : "100%";
        const nomb = ord.map((x) =>
          x.nombre.includes(" ") && !x.esGrupo ? x.nombre.split(" ") : x.nombre,
        );
        const pData = ord.map((x) => obtenerEstadisticas(x).pegados),
          eData = ord.map((x) => obtenerEstadisticas(x).errados);
        const cTxt = currentTheme === "dark" ? "#9ca3af" : "#374151",
          cGrid =
            currentTheme === "dark"
              ? "rgba(55, 65, 81, 0.3)"
              : "rgba(229, 231, 235, 0.5)";

        graficoInstance = new Chart(canvasEl.getContext("2d"), {
          type: "bar",
          data: {
            labels: nomb,
            datasets: [
              {
                label: "Pegados",
                data: pData,
                backgroundColor: "#10b981",
                borderRadius: 5,
                barPercentage: 0.5,
              },
              {
                label: "Errados",
                data: eData,
                backgroundColor: "#f43f5e",
                borderRadius: 5,
                barPercentage: 0.5,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                labels: {
                  color: cTxt,
                  usePointStyle: true,
                  pointStyle: "circle",
                },
              },
            },
            scales: {
              x: {
                ticks: {
                  color: cTxt,
                  font: { weight: "600", size: 11 },
                  maxRotation: 0,
                  minRotation: 0,
                },
                grid: { display: false },
              },
              y: {
                min: 0,
                ticks: { color: cTxt, stepSize: 1 },
                grid: { color: cGrid, drawBorder: false },
              },
            },
          },
          plugins: [
            {
              id: "fixedYScale",
              afterDraw: (chart) => {
                const ctx = chart.ctx,
                  yS = chart.scales.y;
                ctx.save();
                ctx.fillStyle = currentTheme === "dark" ? "#1f2937" : "#ffffff";
                ctx.fillRect(0, yS.top - 10, yS.left, yS.height + 20);
                ctx.fillStyle = cTxt;
                ctx.font = "600 11px sans-serif";
                ctx.textAlign = "right";
                ctx.textBaseline = "middle";
                yS.ticks.forEach((t, idx) => {
                  ctx.fillText(t.value, yS.left - 8, yS.getPixelForTick(idx));
                });
                ctx.restore();
              },
            },
          ],
        });
      }

      function armarEstructuraDatosPDF() {
        const fechaEl = document.getElementById("pdf-fecha");
        if (fechaEl)
          fechaEl.textContent = `Fecha: ${new Date().toLocaleDateString("es-AR")}`;
        document.getElementById("pdf-titulo-tabla").textContent =
          criterioOrden === "porcentaje"
            ? "Clasificación General - Por Porcentaje"
            : "Clasificación General - Por Impactos";
        document.getElementById("pdf-col-dinamica-header").textContent =
          criterioOrden === "porcentaje" ? "% Efic." : "P. Totales";
        const ord = obtenerListaOrdenada(false);
        let gH = 0,
          gD = 0;

        tiradores.forEach((t) => {
          const s = obtenerEstadisticas(t);
          if (!t.esGrupo) {
            gD += s.costoTotal;
            gH += t.tiros.length;
          } else {
            gH += s.total;
          }
        });

        const pTabla = document.getElementById("pdf-tabla-cuerpo");
        if (!pTabla) return;
        pTabla.innerHTML = "";
        ord.forEach((t, idx) => {
          const s = obtenerEstadisticas(t);
          const cP =
              criterioOrden === "porcentaje"
                ? `${s.efectividad}%`
                : `${s.pegados} P`,
            mV = t.esGrupo ? "Grupal" : `$${s.costoTotal.toFixed(0)}`;
          const fila = document.createElement("tr");
          fila.style.cssText = "page-break-inside: avoid; border-bottom: 1px solid #e2e8f0; font-size: 14px;";
          fila.style.backgroundColor = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
          
          fila.innerHTML = `
            <td style="padding: 14px 20px; font-weight: 700; color: #1e293b;">${t.nombre}</td>
            <td style="padding: 14px 20px; text-align: center; color: #475569;">${s.total}</td>
            <td style="padding: 14px 20px; text-align: center; color: #16a34a; font-weight: 800;">${s.pegados}</td>
            <td style="padding: 14px 20px; text-align: center; color: #dc2626; font-weight: 800;">${s.errados}</td>
            <td style="padding: 14px 20px; text-align: center; color: #0f172a; font-weight: 700;">${cP}</td>
            <td style="padding: 14px 20px; text-align: right; color: #1e3a8a; font-weight: 900;">${mV}</td>
          `;
          pTabla.appendChild(fila);
        });

        const grupos = tiradores
          .filter((t) => t.esGrupo)
          .sort((a, b) => {
            const sA = obtenerEstadisticas(a),
              sB = obtenerEstadisticas(b);
            if (criterioOrden === "porcentaje") {
              return (
                parseFloat(sB.efectividad) - parseFloat(sA.efectividad) ||
                sB.pegados - sA.pegados
              );
            } else {
              return (
                sB.pegados - sA.pegados ||
                parseFloat(sB.efectividad) - parseFloat(sA.efectividad)
              );
            }
          });

        if (grupos.length > 0) {
          const separador = document.createElement("tr");
          separador.innerHTML = `<td colspan="6" style="background-color: #1e3a8a; color: white; padding: 10px 20px; font-weight: 700; font-size: 12px; text-transform: uppercase;">Clasificación de Grupos / Equipos</td>`;
          pTabla.appendChild(separador);
          
          grupos.forEach((g, idx) => {
            const s = obtenerEstadisticas(g);
            const cP =
              criterioOrden === "porcentaje"
                ? `${s.efectividad}%`
                : `${s.pegados} P`;
            const fila = document.createElement("tr");
            fila.style.cssText = "page-break-inside: avoid; border-bottom: 1px solid #e2e8f0; font-size: 14px;";
            fila.style.backgroundColor = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
            
            fila.innerHTML = `
              <td style="padding: 14px 20px; font-weight: 700; color: #b45309;">${g.nombre} (G)</td>
              <td style="padding: 14px 20px; text-align: center; color: #475569;">${s.total}</td>
              <td style="padding: 14px 20px; text-align: center; color: #16a34a; font-weight: 800;">${s.pegados}</td>
              <td style="padding: 14px 20px; text-align: center; color: #dc2626; font-weight: 800;">${s.errados}</td>
              <td style="padding: 14px 20px; text-align: center; color: #0f172a; font-weight: 700;">${cP}</td>
              <td style="padding: 14px 20px; text-align: right; color: #b45309; font-weight: 900;">Grupal</td>
            `;
            pTabla.appendChild(fila);
          });
        }

        const totalRec = document.getElementById("pdf-total-recaudado");
        if (totalRec) totalRec.textContent = `$${gD.toFixed(0)}`;
      }

      async function prepararYImprimir(wrapperElement, titulo) {
        if (!wrapperElement) return;

        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        if (!isMobile) {
          // --- SISTEMA DE IMPRESION NATIVO (ESCRITORIO) ---
          const children = Array.from(document.body.children);
          const hiddenElements = [];
          
          children.forEach(child => {
            if (child !== wrapperElement && child.tagName !== 'SCRIPT' && !child.classList.contains('hidden') && child.id !== 'modal-generico') {
              hiddenElements.push(child);
              child.classList.add('hidden');
            }
          });

          wrapperElement.classList.remove('hidden', 'absolute', 'top-0', 'left-0');
          wrapperElement.classList.add('block', 'static');

          const tOrig = document.title;
          document.title = titulo;

          // Esperar 100ms para renderizar y abrir la ventana de impresión clásica
          setTimeout(() => {
            window.print();
            
            // Restaurar DOM
            document.title = tOrig;
            wrapperElement.classList.add('hidden', 'absolute', 'top-0', 'left-0');
            wrapperElement.classList.remove('block', 'static');
            hiddenElements.forEach(child => child.classList.remove('hidden'));
          }, 100);

        } else {
          // --- SISTEMA HTML2PDF (CELULARES) ---
          if (typeof showSnackbar === "function") {
            showSnackbar("Generando PDF, por favor aguardá...", "info");
          }

          wrapperElement.classList.remove('hidden');
          wrapperElement.classList.add('absolute', 'top-0', 'left-0', 'w-full', 'bg-white', 'z-[9999]');

          window.scrollTo(0, 0);

          // Forzar reflow sincrónico para que html2canvas capture el elemento con sus estilos actualizados
          // sin necesidad de usar setTimeout (lo cual rompe el user gesture en iOS Safari)
          void wrapperElement.offsetWidth;

          const opt = {
            margin:       0.2,
            filename:     titulo + '.pdf',
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, logging: false, scrollY: 0 },
            jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
          };

          try {
            await window.html2pdf().set(opt).from(wrapperElement).save();
            
            if (typeof showSnackbar === "function") {
              showSnackbar("¡PDF descargado con éxito!", "success");
            }
          } catch (error) {
            console.error("Error al generar el PDF:", error);
            if (typeof mostrarAlerta === "function") {
              mostrarAlerta("Hubo un error al generar el PDF. Intentá nuevamente.");
            }
          } finally {
            wrapperElement.classList.add('hidden');
          }
        }
      }

      function imprimirConSistemaNativo() {
        const wG = document.getElementById("wrapper-pdf");
        const wI = document.getElementById("wrapper-individual-pdf");
        if (wI) wI.classList.add("hidden");
        
        armarEstructuraDatosPDF();
        prepararYImprimir(wG, `Sesion de Tiro - ${new Date().toLocaleDateString("es-AR").replace(/\//g, "-")}`);
      }

      function renderizarHistorialPantalla() {
        let hist = [];
        if (localStorage.getItem("h_historial"))
          hist = JSON.parse(localStorage.getItem("h_historial"));
        const txtV = document.getElementById("lista-historial-vacio"),
          cont = document.getElementById("contenedor-items-historial");
        if (!cont || !txtV) return;
        cont.innerHTML = "";
        if (hist.length === 0) {
          txtV.classList.remove("hidden");
          return;
        } else {
          txtV.classList.add("hidden");
        }
        hist.forEach((s) => {
          let tH = 0,
            tD = 0;
          const tl = s.tiradores || [];
          tl.forEach((x) => {
            if (!x.esGrupo) {
              const ts = x.tiros || [],
                mc = x.tirosMultiCargados || 0;
              tH += ts.length;
              tD += Math.ceil(ts.length + mc) * s.precioUnitario;
            }
          });
          
          const nombreSesion = s.nombrePersonalizado || `Sesión del ${s.fecha.split(" ")[0]}`;
          const hora = s.fecha.split(" ")[1] || "";
          
          const item = document.createElement("div");
          item.className = "p-4 rounded-xl text-sm border bg-gray-900 border-gray-700 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 transition hover:border-gray-600";
          
          item.innerHTML = `
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-xl">📅</span>
                <b class="text-base text-white">${nombreSesion}</b>
                <span class="text-xs text-gray-500">${hora}</span>
              </div>
              <div class="flex items-center gap-4 text-xs mt-2">
                <span class="bg-gray-800 px-2 py-1 rounded text-green-400 font-mono border border-gray-700">Recaudado: $${tD.toFixed(0)}</span>
                <span class="bg-gray-800 px-2 py-1 rounded text-blue-300 border border-gray-700">${tH} Hélices</span>
                <span class="bg-gray-800 px-2 py-1 rounded text-yellow-300 border border-gray-700">${s.tiradores.filter((x) => !x.esGrupo).length} Tiradores</span>
              </div>
            </div>
            <div class="flex items-center gap-2 w-full md:w-auto">
              <button onclick="renombrarSesion(${s.id})" class="flex-1 md:flex-none bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm border border-gray-600 transition flex items-center justify-center gap-2">
                <span>✏️</span> <span class="md:hidden">Renombrar</span>
              </button>
              <button onclick="eliminarSesionHistorial(${s.id})" class="flex-1 md:flex-none bg-red-900/30 hover:bg-red-800 text-red-300 px-3 py-2 rounded-lg text-sm border border-red-800/50 transition flex items-center justify-center gap-2">
                <span>🗑️</span> <span class="md:hidden">Eliminar</span>
              </button>
              <button onclick="cargarSesionPasada(${s.id})" class="flex-1 md:flex-none bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow transition flex items-center justify-center gap-2">
                <span>🚀</span> Entrar
              </button>
            </div>
          `;
          cont.appendChild(item);
        });
      }

      function renombrarSesion(id) {
        let h = JSON.parse(localStorage.getItem("h_historial") || "[]");
        const idx = h.findIndex(x => x.id === id);
        if (idx === -1) return;
        
        const nombreActual = h[idx].nombrePersonalizado || `Sesión del ${h[idx].fecha.split(" ")[0]}`;
        const nuevoNombre = prompt("Introduce el nuevo nombre para la sesión:", nombreActual);
        
        if (nuevoNombre !== null && nuevoNombre.trim() !== "") {
          h[idx].nombrePersonalizado = nuevoNombre.trim();
          localStorage.setItem("h_historial", JSON.stringify(h));
          syncCloudData();
          renderizarHistorialPantalla();
          showSnackbar("✅ Sesión renombrada");
        }
      }

      function eliminarSesionHistorial(id) {
        mostrarConfirmacion(
          "🗑️ ¿Eliminar esta sesión?",
          () => {
            let h = JSON.parse(localStorage.getItem("h_historial") || "[]");
            h = h.filter((x) => x.id !== id);
            localStorage.setItem("h_historial", JSON.stringify(h));
            syncCloudData();
            renderizarHistorialPantalla();
          },
          true,
        );
      }
      
      function cargarSesionPasada(id) {
        let h = JSON.parse(localStorage.getItem("h_historial") || "[]");
        const pas = h.find((x) => x.id === id);
        if (!pas) return;
        
        tiradores = pas.tiradores;
        precioHelice = pas.precioUnitario;
        document.getElementById("precio-helice").value = precioHelice;
        idSeleccionado = null;
        idHistorialDesplegado = null;
        
        // Vamos directo a la pantalla de resultados
        estadoApp = "resultados";
        guardarEnLocalStorage();
        
        document.getElementById("pantalla-historial").classList.add("hidden");
        document.getElementById("pantalla-historial").classList.remove("flex");
        document.getElementById("pantalla-configuracion").classList.add("hidden");
        document.getElementById("pantalla-configuracion").classList.remove("flex");
        document.getElementById("pantalla-principal").classList.remove("hidden");
        
        mostrarPantallaResultados();
      }
      
      function borrarTodoElHistorial() {
        mostrarConfirmacion(
          "⚠️ ¿Borrar todo el historial?",
          () => {
            localStorage.removeItem("h_historial");
            syncCloudData();
            renderizarHistorialPantalla();
          },
          true,
        );
      }
      function reiniciarApp() {
        mostrarConfirmacion(
          "¿Nueva serie?",
          () => {
            localStorage.removeItem("h_tiradores");
            localStorage.removeItem("h_estado");
            localStorage.removeItem("h_idSel");
            localStorage.removeItem("h_multiModeActivo");
            localStorage.removeItem("h_seleccionadosMulti");
            tiradores = [];
            idSeleccionado = null;
            idHistorialDesplegado = null;
            seleccionadosMulti = [];
            multiModeActivo = false;
            const sm = document.getElementById("switch-multimode");
            if (sm) sm.checked = false;
            const tl = document.getElementById("titulo-lista-tiradores");
            if (tl) tl.textContent = "Tiradores Añadidos (Toque para acciones)";
            estadoApp = "registro";
            document.getElementById("panel-resultados").classList.add("hidden");
            document
              .getElementById("panel-registro")
              .classList.remove("hidden");
            document.getElementById("precio-helice").value = precioHelice;
            document.getElementById("min-podio").value = minimoPodio;
            guardarEnLocalStorage();
            actualizarInterfaz();
            const sb = document.getElementById('snackbar-undo');
            if(sb) sb.classList.add('translate-y-24', 'opacity-0');
          },
          false,
        );
      }
      
      function exportarDatos() {
        try {
          const datos = {
            h_historial: localStorage.getItem("h_historial") || "[]",
            h_base_tiradores: localStorage.getItem("h_base_tiradores") || "[]"
          };
          
          const blob = new Blob([JSON.stringify(datos, null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          
          const fecha = new Date().toISOString().split("T")[0];
          const a = document.createElement("a");
          a.href = url;
          a.download = `anotador-backup-${fecha}.json`;
          
          document.body.appendChild(a);
          a.click();
          
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          showSnackbar("✅ Copia de seguridad exportada");
        } catch (error) {
          console.error(error);
          alert("Error al exportar los datos.");
        }
      }

      function importarDatos(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
          try {
            const contenido = JSON.parse(e.target.result);
            
            if (contenido.h_historial) {
              localStorage.setItem("h_historial", contenido.h_historial);
            }
            if (contenido.h_base_tiradores) {
              localStorage.setItem("h_base_tiradores", contenido.h_base_tiradores);
            }
            syncCloudData();
            
            alert("✅ Datos restaurados con éxito. La aplicación se reiniciará.");
            window.location.reload();
          } catch (error) {
            console.error(error);
            alert("❌ Error: El archivo no tiene el formato correcto.");
          }
        };
        reader.readAsText(file);
      }
    
// Expose functions to window for inline event handlers
window.mostrarPantallaConfiguracion = mostrarPantallaConfiguracion;
window.toggleMostrarDinero = toggleMostrarDinero;
window.irAPantallaPrincipal = irAPantallaPrincipal;
window.cerrarPantallaConfiguracion = cerrarPantallaConfiguracion;
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
window.volverALaPedana = volverALaPedana;
window.guardarYFinalizarSesion = guardarYFinalizarSesion;
window.imprimirConSistemaNativo = imprimirConSistemaNativo;
window.eliminarSesionHistorial = eliminarSesionHistorial;
window.cargarSesionPasada = cargarSesionPasada;
window.borrarTodoElHistorial = borrarTodoElHistorial;
window.reiniciarApp = reiniciarApp;
window.toggleVibracion = toggleVibracion;
window.toggleSonido = toggleSonido;
window.abrirModalBaseTiradores = abrirModalBaseTiradores;
window.cerrarModalBaseTiradores = cerrarModalBaseTiradores;
window.agregarDesdeBase = agregarDesdeBase;
window.eliminarDeBaseTiradores = eliminarDeBaseTiradores;
window.iniciarNuevaSerie = iniciarNuevaSerie;
window.continuarSerieActual = continuarSerieActual;
window.verHistorialDesdeInicio = verHistorialDesdeInicio;
window.mostrarPantallaHistorial = mostrarPantallaHistorial;
window.renombrarSesion = renombrarSesion;
window.toggleWakeLock = toggleWakeLock;
window.toggleFullScreen = toggleFullScreen;
window.showSnackbar = showSnackbar;
window.exportarDatos = exportarDatos;
window.importarDatos = importarDatos;



// --- AUTH LOGIC ---
async function initAuth() {
  const hideAllAppScreens = () => {
    ['pantalla-inicio', 'pantalla-configuracion', 'pantalla-historial', 'pantalla-principal'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.add('hidden');
        el.classList.remove('flex');
      }
    });
  };

  const showAuthScreen = () => {
    const header = document.getElementById('main-header');
    header.classList.add('hidden');
    header.classList.remove('flex');
    hideAllAppScreens();
    const auth = document.getElementById('pantalla-auth');
    auth.classList.remove('hidden');
    auth.classList.add('flex');
  };

  const showAppScreens = () => {
    const header = document.getElementById('main-header');
    header.classList.remove('hidden');
    header.classList.add('flex');
    const auth = document.getElementById('pantalla-auth');
    auth.classList.add('hidden');
    auth.classList.remove('flex');
    window.restaurarEstadoDOM();
  };

  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    authUser = session.user;
    showAppScreens();
    await fetchCloudData();
  } else {
    showAuthScreen();
  }

  supabase.auth.onAuthStateChange(async (_event, session) => {
    if (session) {
      authUser = session.user;
      showAppScreens();
      await fetchCloudData();
    } else {
      authUser = null;
      showAuthScreen();
    }
  });
}

// Remove duplicate function. Auth login will now just call original mostrarPantallaInicio.
function hideAuthScreen() {
  document.getElementById('pantalla-auth').classList.add('hidden');
}

async function handleAuth(e) {
  e.preventDefault();
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;
  
  const btn = document.getElementById('btn-login');
  btn.disabled = true;
  btn.textContent = 'Cargando...';

  try {
    if (isRegistering) {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      
      // If email confirmation is required, session will be null
      if (data.user && data.user.identities && data.user.identities.length > 0 && !data.session) {
        mostrarAlerta('¡Registro exitoso! Por favor, revisa tu correo electrónico para confirmar tu cuenta antes de ingresar.');
      } else {
        mostrarAlerta('¡Registro exitoso! Ya puedes ingresar.');
      }
      
      isRegistering = false;
      document.getElementById('btn-toggle-auth').textContent = 'Registrate';
      btn.textContent = 'Ingresar';
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // onAuthStateChange will handle UI
      btn.textContent = 'Ingresar';
    }
  } catch (error) {
    mostrarAlerta(error.message);
    btn.textContent = isRegistering ? 'Crear Cuenta' : 'Ingresar';
  }
  btn.disabled = false;
}

window.toggleAuthMode = function() {
  isRegistering = !isRegistering;
  const btn = document.getElementById('btn-login');
  const toggleBtn = document.getElementById('btn-toggle-auth');
  
  if (isRegistering) {
    btn.textContent = 'Crear Cuenta';
    toggleBtn.textContent = 'Ingresar';
  } else {
    btn.textContent = 'Ingresar';
    toggleBtn.textContent = 'Registrate';
  }
}

window.cerrarSesion = async function() {
  // Ocultar modal de ajustes sin animaciones raras ni cambiar estadoApp todavía
  document.getElementById("pantalla-configuracion").classList.add("hidden");
  
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Error signing out:", error);
    if (typeof mostrarAlerta === "function") mostrarAlerta("Error al cerrar sesión.");
  } else {
    // onAuthStateChange automatically handles showing the auth screen
  }
}

async function fetchCloudData() {
  if (!authUser) return;
  try {
    const { data, error } = await supabase
      .from('user_backups')
      .select('backup_json')
      .eq('user_id', authUser.id)
      .single();
      
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is 'not found'
    
    let cloudData = (data && data.backup_json) ? data.backup_json : null;
    
    let localBase = JSON.parse(localStorage.getItem("h_base_tiradores") || "[]");
    let localHist = JSON.parse(localStorage.getItem("h_historial") || "[]");

    if (cloudData) {
      // Merge base_tiradores (Array of Strings)
      let cloudBase = JSON.parse(cloudData.h_base_tiradores || "[]");
      let mergedBase = [...new Set([...localBase, ...cloudBase])];
      localStorage.setItem("h_base_tiradores", JSON.stringify(mergedBase));
      baseTiradores = mergedBase;
      
      // Merge historial (Array of Objects with id)
      let cloudHist = JSON.parse(cloudData.h_historial || "[]");
      
      let histMap = new Map();
      // Add cloud first
      cloudHist.forEach(item => histMap.set(item.id, item));
      // Overwrite/Add local
      localHist.forEach(item => histMap.set(item.id, item));
      
      let mergedHist = Array.from(histMap.values()).sort((a, b) => b.id - a.id);
      localStorage.setItem("h_historial", JSON.stringify(mergedHist));
      
      actualizarInterfaz();
    }
    
    // IMPORTANTE: Después de fusionar los datos locales con los de la nube (o si la nube estaba vacía),
    // forzamos una subida a Supabase. Esto asegura que los datos locales que tenías en el dispositivo
    // antes de activar este sistema, se suban automáticamente a tu cuenta.
    syncCloudData();
    
  } catch (e) {
    console.error("Error fetching cloud data:", e);
  }
}

async function syncCloudData() {
  if (!authUser) return;
  try {
    const backupData = {
      h_historial: localStorage.getItem("h_historial") || "[]",
      h_base_tiradores: localStorage.getItem("h_base_tiradores") || "[]"
    };
    
    const { error } = await supabase
      .from('user_backups')
      .upsert({ user_id: authUser.id, backup_json: backupData });
      
    if (error) console.error("Error syncing:", error);
  } catch(e) {
    console.error("Sync error:", e);
  }
}


// --- END AUTH LOGIC ---
