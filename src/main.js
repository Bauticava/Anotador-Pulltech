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

      let poolState = {
        activa: false,
        tipo: 'torneo',
        helices: 6,
        tandas: 2,
        participantes: [],
        indiceActual: 0,
        tirosEnTandaActual: 0,
        rondaActual: 1,
        inscripcion: 0,
        maxScore: 0,
        historialTiros: [],
        participantesStats: {}
      };
      let historialPools = [];
      let lastPlanillaSubScreen = "pedana";
      let seleccionadosPoolOrden = [];
      let pendingDesempateData = null;

      function sincronizarIdSeleccionadoPool() {
        if (!poolState || !poolState.activa) return;
        
        if (poolState.esDesempate) {
          if (poolState.participantesDesempate && poolState.participantesDesempate.length > 0) {
            let count = 0;
            while (count < poolState.participantesDesempate.length) {
              const id = poolState.participantesDesempate[poolState.indiceDesempateActual];
              const s = poolState.participantesStats[id];
              if (s && s.abandonado) {
                poolState.indiceDesempateActual = (poolState.indiceDesempateActual + 1) % poolState.participantesDesempate.length;
                count++;
              } else {
                break;
              }
            }
            idSeleccionado = poolState.participantesDesempate[poolState.indiceDesempateActual];
          }
        } else {
          if (poolState.participantes && poolState.participantes.length > 0) {
            let count = 0;
            while (count < poolState.participantes.length) {
              const id = poolState.participantes[poolState.indiceActual];
              const s = poolState.participantesStats[id];
              const inactivo = s && (s.abandonado || (poolState.tipo === 'americana' && s.eliminada));
              if (inactivo) {
                poolState.indiceActual = (poolState.indiceActual + 1) % poolState.participantes.length;
                count++;
              } else {
                break;
              }
            }
            idSeleccionado = poolState.participantes[poolState.indiceActual];
          }
        }
      }

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
          "btn-primary flex-1 py-2.5 text-sm";
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

      function mostrarAlertaFinPool(mensaje, callbackDeshacer) {
        document.getElementById("modal-generico").classList.remove("hidden");
        document.getElementById("modal-titulo").textContent = "¡Pool Finalizada!";
        document.getElementById("modal-mensaje").innerText = mensaje;
        document.getElementById("modal-input").classList.add("hidden");
        
        const btnCancelar = document.getElementById("btn-modal-cancelar");
        btnCancelar.classList.remove("hidden");
        btnCancelar.className = currentTheme === "dark" ? "btn-secondary flex-1 py-2.5 text-sm" : "bg-yellow-400 hover:bg-yellow-500 text-gray-950 font-bold flex-1 py-2.5 rounded-xl text-sm transition-colors";
        btnCancelar.textContent = "Deshacer tiro";
        btnCancelar.onclick = () => {
          cerrarModalGenerico();
          if (callbackDeshacer) callbackDeshacer();
        };

        const btnConf = document.getElementById("btn-modal-confirmar");
        btnConf.className = currentTheme === "dark" ? "btn-primary flex-1 py-2.5 text-sm" : "bg-lime-400 hover:bg-lime-500 text-gray-950 font-bold flex-1 py-2.5 rounded-xl text-sm transition-colors";
        btnConf.textContent = "Aceptar";
        btnConf.onclick = cerrarModalGenerico;
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
          "btn-primary flex-1 py-2.5 text-sm";
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

      window.toggleSeleccionPoolTirador = function(id, isChecked) {
        if (isChecked) {
          if (!seleccionadosPoolOrden.includes(id)) {
            seleccionadosPoolOrden.push(id);
          }
        } else {
          seleccionadosPoolOrden = seleccionadosPoolOrden.filter(x => x !== id);
        }
        actualizarBadgesOrdenPool();
      };

      function actualizarBadgesOrdenPool() {
        tiradores.filter(t => !t.esGrupo).forEach(t => {
          const badge = document.getElementById(`badge-orden-pool-${t.id}`);
          if (!badge) return;
          const idx = seleccionadosPoolOrden.indexOf(t.id);
          if (idx !== -1) {
            badge.textContent = `#${idx + 1}`;
            badge.classList.remove("hidden");
          } else {
            badge.classList.add("hidden");
          }
        });
      }

      window.abrirModalPool = function() {
        if (poolState && poolState.activa) {
          mostrarPoolActiva();
          return;
        }
        if (tiradores.length === 0) {
          mostrarAlerta("Agregá tiradores primero.");
          return;
        }
        
        seleccionadosPoolOrden = [];
        const lista = document.getElementById("lista-participantes-pool");
        lista.innerHTML = "";
        tiradores.filter(t => !t.esGrupo).forEach(t => {
          const d = document.createElement("label");
          d.className = "flex items-center justify-between p-2.5 hover:bg-gray-700/50 rounded-xl cursor-pointer transition select-none border border-gray-700/50";
          d.innerHTML = `
            <div class="flex items-center gap-3">
              <input type="checkbox" value="${t.id}" onchange="toggleSeleccionPoolTirador(${t.id}, this.checked)" class="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 bg-gray-700 border-gray-600 cursor-pointer">
              <span class="text-white font-bold text-sm">${t.nombre}</span>
            </div>
            <span id="badge-orden-pool-${t.id}" class="hidden text-xs font-black bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full"></span>
          `;
          lista.appendChild(d);
        });
        
        document.getElementById("pool-step-1").classList.remove("hidden");
        document.getElementById("pool-step-1").classList.add("flex");
        document.getElementById("pool-step-2").classList.add("hidden");
        document.getElementById("pool-step-2").classList.remove("flex");
        
        document.getElementById("modal-pool").classList.remove("hidden");
      };

      window.cerrarModalPool = function() {
        document.getElementById("modal-pool").classList.add("hidden");
      };

      window.abrirModalSumarTiradorPool = function() {
        if (!poolState || !poolState.activa || poolState.rondaActual > 1 || poolState.esDesempate) {
          mostrarAlerta("Solo se pueden sumar tiradores durante la Ronda 1.");
          return;
        }
        
        const modal = document.getElementById("modal-sumar-tirador-pool");
        const lista = document.getElementById("lista-disponibles-sumar-pool");
        if (!modal || !lista) return;
        
        lista.innerHTML = "";
        const disponibles = tiradores.filter(t => !t.esGrupo && !poolState.participantes.includes(t.id));
        
        if (disponibles.length === 0) {
          lista.innerHTML = `<p class="text-xs text-gray-400 text-center py-3 font-semibold">Todos los tiradores de la pedana ya están participando en la Pool.</p>`;
        } else {
          disponibles.forEach(t => {
            const div = document.createElement("div");
            div.className = "flex justify-between items-center p-2.5 rounded-xl border border-gray-200 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-800/60";
            div.innerHTML = `
              <span class="font-bold text-sm text-gray-900 dark:text-white">${t.nombre}</span>
              <button onclick="sumarTiradorExistenteAPool(${t.id})" class="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer">
                + Sumar
              </button>
            `;
            lista.appendChild(div);
          });
        }
        
        modal.classList.remove("hidden");
      };

      window.cerrarModalSumarTiradorPool = function() {
        const modal = document.getElementById("modal-sumar-tirador-pool");
        if (modal) modal.classList.add("hidden");
        const input = document.getElementById("input-nuevo-tirador-pool");
        if (input) input.value = "";
      };

      window.sumarTiradorExistenteAPool = function(id) {
        if (!poolState || !poolState.activa || poolState.rondaActual > 1) return;
        if (poolState.participantes.includes(id)) return;
        
        const t = tiradores.find(x => x.id === id);
        if (!t) return;
        
        poolState.participantes.push(id);
        poolState.participantesStats[id] = { tiros: 0, pegados: 0, eliminada: false, secuencia: [] };
        t.costoInscripciones = (t.costoInscripciones || 0) + poolState.inscripcion;
        
        cerrarModalSumarTiradorPool();
        guardarEnLocalStorage();
        actualizarInterfazPool();
        showSnackbar(`Tirador ${t.nombre} sumado a la Pool`);
      };

      window.crearYSumarTiradorPool = function() {
        const input = document.getElementById("input-nuevo-tirador-pool");
        if (!input) return;
        const nombre = input.value.trim();
        if (!nombre) {
          mostrarAlerta("Ingresá un nombre válido.");
          return;
        }
        
        let t = tiradores.find(x => x.nombre.toLowerCase() === nombre.toLowerCase() && !x.esGrupo);
        if (!t) {
          t = {
            id: Date.now(),
            nombre: nombre,
            tiros: [],
            costoInscripciones: 0
          };
          tiradores.push(t);
          baseTiradores.push(t.nombre);
        }
        
        input.value = "";
        sumarTiradorExistenteAPool(t.id);
      };

      window.siguientePasoPool = function() {
        if (seleccionadosPoolOrden.length < 2) {
          const checkboxes = document.querySelectorAll("#lista-participantes-pool input:checked");
          if (checkboxes.length < 2) {
            mostrarAlerta("Seleccioná al menos 2 participantes para la pool.");
            return;
          }
          poolState.participantes = Array.from(checkboxes).map(c => parseFloat(c.value));
        } else {
          poolState.participantes = [...seleccionadosPoolOrden];
        }
        
        document.getElementById("pool-step-1").classList.add("hidden");
        document.getElementById("pool-step-1").classList.remove("flex");
        document.getElementById("pool-step-2").classList.remove("hidden");
        document.getElementById("pool-step-2").classList.add("flex");
        
        setPoolModo('torneo');
      };

      window.volverPaso1Pool = function() {
        document.getElementById("pool-step-1").classList.remove("hidden");
        document.getElementById("pool-step-1").classList.add("flex");
        document.getElementById("pool-step-2").classList.add("hidden");
        document.getElementById("pool-step-2").classList.remove("flex");
      };

      window.setPoolModo = function(modo) {
        poolState.tipo = modo;
        document.getElementById("btn-pool-modo-torneo").className = modo === 'torneo' ? "bg-blue-600 text-white border border-blue-500 py-2 rounded-lg font-bold text-sm transition-colors" : "bg-gray-700 text-gray-300 border border-gray-600 py-2 rounded-lg font-bold text-sm transition-colors";
        document.getElementById("btn-pool-modo-americana").className = modo === 'americana' ? "bg-blue-600 text-white border border-blue-500 py-2 rounded-lg font-bold text-sm transition-colors" : "bg-gray-700 text-gray-300 border border-gray-600 py-2 rounded-lg font-bold text-sm transition-colors";
        
        if (modo === 'torneo') {
          document.getElementById("pool-config-torneo").classList.remove("hidden");
          setPoolHelices(6);
        } else {
          document.getElementById("pool-config-torneo").classList.add("hidden");
        }
      };

      window.setPoolHelices = function(h) {
        poolState.helices = h;
        [6, 9, 12].forEach(val => {
          document.getElementById(`btn-pool-helices-${val}`).className = val === h ? "bg-blue-600 text-white border border-blue-500 py-1.5 rounded-lg font-bold text-sm transition-colors" : "bg-gray-700 text-gray-300 border border-gray-600 py-1.5 rounded-lg font-bold text-sm transition-colors";
        });
        
        if (h === 9) {
          setPoolTandas(3);
          document.getElementById("btn-pool-tandas-2").disabled = true;
          document.getElementById("btn-pool-tandas-2").classList.add("opacity-50", "cursor-not-allowed");
        } else {
          document.getElementById("btn-pool-tandas-2").disabled = false;
          document.getElementById("btn-pool-tandas-2").classList.remove("opacity-50", "cursor-not-allowed");
          setPoolTandas(2);
        }
      };

      window.setPoolTandas = function(t) {
        poolState.tandas = t;
        document.getElementById("btn-pool-tandas-2").className = t === 2 && poolState.helices !== 9 ? "bg-blue-600 text-white border border-blue-500 py-1.5 rounded-lg font-bold text-sm transition-colors" : "bg-gray-700 text-gray-300 border border-gray-600 py-1.5 rounded-lg font-bold text-sm transition-colors" + (poolState.helices === 9 ? " opacity-50 cursor-not-allowed" : "");
        document.getElementById("btn-pool-tandas-3").className = t === 3 ? "bg-blue-600 text-white border border-blue-500 py-1.5 rounded-lg font-bold text-sm transition-colors" : "bg-gray-700 text-gray-300 border border-gray-600 py-1.5 rounded-lg font-bold text-sm transition-colors";
      };

      window.confirmarIniciarPool = function() {
        if (!poolState.participantes || poolState.participantes.length < 2) {
          mostrarAlerta("Seleccioná al menos 2 participantes para la pool.");
          volverPaso1Pool();
          return;
        }
        const inscripcionInput = document.getElementById("input-pool-inscripcion");
        poolState.inscripcion = inscripcionInput ? parseFloat(inscripcionInput.value) || 0 : 0;
        poolState.activa = true;
        poolState.indiceActual = 0;
        poolState.tirosEnTandaActual = 0;
        poolState.rondaActual = 1;
        poolState.maxScore = 0;
        poolState.historialTiros = [];
        poolState.participantesStats = {};
        
        poolState.participantes.forEach(id => {
          poolState.participantesStats[id] = { tiros: 0, pegados: 0, eliminada: false, secuencia: [] };
          const t = tiradores.find(x => x.id === id);
          if (t) {
             t.costoInscripciones = (t.costoInscripciones || 0) + poolState.inscripcion;
          }
        });
        
        cerrarModalPool();
        
        idSeleccionado = poolState.participantes[0];
        multiModeActivo = false;
        const switchEl = document.getElementById("switch-multimode");
        if(switchEl) switchEl.checked = false;
        
        document.getElementById("pantalla-principal").classList.add("hidden");
        document.getElementById("pantalla-pool-activa").classList.remove("hidden");
        
        guardarEnLocalStorage();
        actualizarInterfazPool();
      };

      window.forzarFinPool = function() {
        mostrarConfirmacion("¿Seguro querés terminar la pool actual?", finalizarPool);
      };

      window.iniciarDesempatePool = function(empatados, maxPegados) {
        poolState.esDesempate = true;
        poolState.rondaDesempate = 1;
        poolState.participantesDesempate = [...empatados];
        poolState.indiceDesempateActual = 0;
        poolState.tirosEnTandaActual = 0;
        poolState.desempateStats = {};
        
        empatados.forEach(id => {
          poolState.desempateStats[id] = { hitsEnRonda: 0 };
        });
        
        const nombres = empatados.map(id => {
          const t = tiradores.find(x => x.id === id);
          return t ? t.nombre : "";
        }).filter(Boolean).join(" y ");
        
        idSeleccionado = poolState.participantesDesempate[0];
        
        guardarEnLocalStorage();
        actualizarInterfazPool();
        showSnackbar(`¡Empate en ${maxPegados} aciertos! Desempate entre ${nombres} (${poolState.tandas} hél. por turno)`);
      };

      window.finalizarPool = function(ganadorForzadoId) {
        if (!poolState.activa) return;
        
        const sinDisparos = !poolState.historialTiros || poolState.historialTiros.length === 0;
        if (sinDisparos) {
          poolState.participantes.forEach(id => {
            const t = tiradores.find(x => x.id === id);
            if (t) {
              t.costoInscripciones = Math.max(0, (t.costoInscripciones || 0) - poolState.inscripcion);
            }
          });
          
          poolState.activa = false;
          poolState.esDesempate = false;
          
          document.getElementById("pantalla-pool-activa").classList.add("hidden");
          document.getElementById("pantalla-principal").classList.remove("hidden");
          
          guardarEnLocalStorage();
          actualizarInterfaz();
          actualizarFabIconoPool();
          
          showSnackbar("Pool finalizada con 0 disparos. No fue contabilizada.");
          return;
        }
        
        let ganadorId = ganadorForzadoId || null;
        let maxPegados = -1;
        
        if (!ganadorId) {
          if (poolState.tipo === 'torneo') {
            poolState.participantes.forEach(id => {
              const stats = poolState.participantesStats[id];
              if (stats.pegados > maxPegados) {
                maxPegados = stats.pegados;
                ganadorId = id;
              }
            });
          } else {
            poolState.participantes.forEach(id => {
              const stats = poolState.participantesStats[id];
              if (!stats.eliminada && stats.pegados > maxPegados) {
                maxPegados = stats.pegados;
                ganadorId = id;
              }
            });
          }
        } else {
          const stats = poolState.participantesStats[ganadorId];
          if (stats) maxPegados = stats.pegados;
        }
        
        let nombreGanador = "Nadie";
        if (ganadorId) {
          const t = tiradores.find(x => x.id === ganadorId);
          if (t) nombreGanador = t.nombre;
        }
        
        const esDesempateWin = poolState.esDesempate;
        
        const poolRecord = {
          tipo: poolState.tipo,
          inscripcion: poolState.inscripcion,
          helices: poolState.helices,
          ganador: nombreGanador,
          maxPegados: maxPegados,
          esDesempate: esDesempateWin,
          participantes: poolState.participantes.map(id => {
            const t = tiradores.find(x => x.id === id);
            return {
              nombre: t ? t.nombre : "Desconocido",
              stats: JSON.parse(JSON.stringify(poolState.participantesStats[id]))
            };
          })
        };
        historialPools.push(poolRecord);
        
        poolState.activa = false;
        poolState.esDesempate = false;
        
        document.getElementById("pantalla-pool-activa").classList.add("hidden");
        document.getElementById("pantalla-principal").classList.remove("hidden");
        
        guardarEnLocalStorage();
        actualizarInterfaz();
        actualizarFabIconoPool();
        
        const msj = esDesempateWin 
          ? `¡Ganador de la Pool en Desempate: ${nombreGanador} con ${maxPegados} aciertos!`
          : `¡Ganador de la Pool: ${nombreGanador} con ${maxPegados} aciertos!`;
          
        mostrarAlertaFinPool(msj, deshacerFinPool);
      };

      window.deshacerFinPool = function() {
        if (historialPools.length > 0) {
          historialPools.pop();
        }
        poolState.activa = true;
        document.getElementById("pantalla-principal").classList.add("hidden");
        document.getElementById("pantalla-pool-activa").classList.remove("hidden");
        
        if (poolState.historialTiros.length > 0) {
           window.deshacerTiroPool();
        } else {
           guardarEnLocalStorage();
           actualizarInterfazPool();
        }
      };

      window.terminarPoolManual = function() {
        mostrarConfirmacion("¿Seguro querés terminar la pool actual?", finalizarPool);
      };

      window.agregarTiradorPool = function() {
        if (!poolState.activa || poolState.rondaActual !== 1 || poolState.esDesempate) return;
        abrirModalSeleccionTirador((idTirador) => {
          if (poolState.participantes.includes(idTirador)) return;
          poolState.participantes.push(idTirador);
          poolState.participantesStats[idTirador] = { tiros: 0, pegados: 0, eliminada: false, secuencia: [] };
          const t = tiradores.find(x => x.id === idTirador);
          if (t) t.costoInscripciones = (t.costoInscripciones || 0) + poolState.inscripcion;
          guardarEnLocalStorage();
          actualizarInterfazPool();
        });
      };

      window.actualizarInterfazPool = function() {
        if (!poolState.activa) return;
        
        sincronizarIdSeleccionadoPool();
        
        const wrapperSumar = document.getElementById("wrapper-btn-sumar-pool");
        if (wrapperSumar) {
          if (poolState.activa && poolState.rondaActual === 1 && !poolState.esDesempate) {
            wrapperSumar.classList.remove("hidden");
          } else {
            wrapperSumar.classList.add("hidden");
          }
        }
        
        const rTitle = document.getElementById("pool-activa-ronda");
        if (rTitle) {
          if (poolState.esDesempate) {
            rTitle.innerHTML = `<span class="bg-yellow-500/20 text-yellow-400 px-2.5 py-1 rounded-lg border border-yellow-500/40 animate-pulse font-bold">DESEMPATE - Ronda ${poolState.rondaDesempate}</span>`;
          } else if (poolState.tipo === 'torneo') {
            rTitle.textContent = `Torneo - Ronda ${poolState.rondaActual} (${poolState.tandas} hél. por turno)`;
          } else {
            rTitle.textContent = `Americana - Ronda ${poolState.rondaActual}`;
          }
        }
        
        const tn = document.getElementById("pool-activa-tirador-nombre");
        if (tn) {
          const sel = tiradores.find(x => x.id === idSeleccionado);
          const statsActive = poolState.participantesStats[idSeleccionado];
          if (sel && statsActive && !poolState.esDesempate) {
            const targetTiros = Math.min(poolState.rondaActual * poolState.tandas, poolState.helices);
            const pendientes = targetTiros - statsActive.tiros;
            if (pendientes > poolState.tandas) {
              tn.innerHTML = `${sel.nombre} <span class="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full font-bold border border-yellow-500/40 ml-2">Recuperando Rondas (${pendientes} hélices)</span>`;
            } else {
              tn.textContent = sel.nombre;
            }
          } else {
            tn.textContent = sel ? sel.nombre : "---";
          }
        }
        
        const bd = document.getElementById("btn-pool-deshacer");
        if (bd) {
           bd.disabled = poolState.historialTiros.length === 0;
        }
        
        const lista = document.getElementById("pool-activa-lista");
        if (lista) {
           lista.innerHTML = "";
           poolState.participantes.forEach(id => {
             const t = tiradores.find(x => x.id === id);
             if (!t) return;
             const stats = poolState.participantesStats[id] || { tiros: 0, pegados: 0, eliminada: false, abandonado: false, secuencia: [] };
             const div = document.createElement("div");
             
             let bgClass = "";
             let nameColor = "";
             let badgeBg = "";
             let pegadosColor = "";
             let extraBadge = "";
             
             if (stats.abandonado) {
               bgClass = currentTheme === "dark" ? "opacity-35 grayscale bg-gray-900 border-gray-800" : "opacity-35 grayscale bg-gray-200 border-gray-300";
               nameColor = "line-through text-gray-500";
               badgeBg = currentTheme === "dark" ? "bg-black/40" : "bg-gray-100";
               pegadosColor = "text-red-500";
               extraBadge = `<span class="text-[10px] bg-red-900/30 text-red-400 px-1.5 py-0.5 rounded font-bold border border-red-800/40">Abandonó</span>`;
             } else if (poolState.esDesempate) {
               const enDesempate = poolState.participantesDesempate && poolState.participantesDesempate.includes(id);
               if (!enDesempate) {
                 bgClass = currentTheme === "dark" ? "opacity-35 grayscale bg-gray-900 border-gray-800" : "opacity-35 grayscale bg-gray-200 border-gray-300";
                 nameColor = "line-through text-gray-500";
                 badgeBg = currentTheme === "dark" ? "bg-black/40" : "bg-gray-100";
                 pegadosColor = currentTheme === "dark" ? "text-purple-500" : "text-gray-500";
               } else if (id === idSeleccionado) {
                 bgClass = currentTheme === "dark" ? "bg-purple-900/40 border-purple-500" : "bg-blue-50 border-blue-500 text-blue-900";
                 nameColor = "text-white";
                 badgeBg = currentTheme === "dark" ? "bg-black/40" : "bg-white/30";
                 pegadosColor = currentTheme === "dark" ? "text-purple-500" : "text-white";
                 extraBadge = `<span class="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded font-bold border border-yellow-500/30">Desempate</span>`;
               } else {
                 bgClass = currentTheme === "dark" ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200 shadow-sm";
                 nameColor = currentTheme === "dark" ? "text-white" : "text-gray-900";
                 badgeBg = currentTheme === "dark" ? "bg-black/40" : "bg-white/60";
                 pegadosColor = currentTheme === "dark" ? "text-purple-500" : "text-orange-500";
                 extraBadge = `<span class="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-semibold">Desempate</span>`;
               }
             } else if (stats.eliminada) {
               bgClass = currentTheme === "dark" ? "opacity-40 grayscale bg-gray-900 border-gray-800" : "opacity-40 grayscale bg-gray-200 border-gray-300";
               nameColor = "line-through text-gray-500";
               badgeBg = currentTheme === "dark" ? "bg-black/40" : "bg-gray-100";
               pegadosColor = currentTheme === "dark" ? "text-purple-500" : "text-gray-500";
             } else if (id === idSeleccionado) {
               bgClass = currentTheme === "dark" ? "bg-purple-900/40 border-purple-500" : "bg-blue-50 border-blue-500 text-blue-900";
               nameColor = "text-white";
               badgeBg = currentTheme === "dark" ? "bg-black/40" : "bg-white/30";
               pegadosColor = currentTheme === "dark" ? "text-purple-500" : "text-white";
             } else {
               bgClass = currentTheme === "dark" ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200 shadow-sm";
               nameColor = currentTheme === "dark" ? "text-white" : "text-gray-900";
               badgeBg = currentTheme === "dark" ? "bg-black/40" : "bg-white/60";
               pegadosColor = currentTheme === "dark" ? "text-purple-500" : "text-orange-500";
             }
             
             div.className = `p-3 rounded-xl border flex justify-between items-center transition-opacity ${bgClass}`;
             
             let seqArray = stats.secuencia || [];
             if (poolState.tipo === 'americana' && seqArray.length > 8) {
               seqArray = seqArray.slice(-8);
             }
             let seqHTML = seqArray.map(p => p ? '🟢' : '🔴').join(' ');
             
             div.innerHTML = `
               <div class="flex items-center gap-2">
                 <div class="font-bold text-sm ${nameColor}">${t.nombre}</div>
                 ${extraBadge}
               </div>
               <div class="flex items-center gap-2 text-xs font-mono tracking-widest ${badgeBg} px-2 py-1 rounded">
                  ${seqHTML || '---'} <span class="font-bold ${pegadosColor} ml-2">${stats.pegados}</span>
               </div>
             `;
             lista.appendChild(div);
           });
        }
        
        const sig = document.getElementById("pool-activa-siguiente");
        if (sig) {
          if (poolState.esDesempate) {
            let sigIdx = poolState.indiceDesempateActual + 1;
            if (sigIdx >= poolState.participantesDesempate.length) sigIdx = 0;
            if (poolState.participantesDesempate.length > 1) {
              const tSig = tiradores.find(x => x.id === poolState.participantesDesempate[sigIdx]);
              sig.textContent = tSig ? tSig.nombre : "---";
            } else {
              sig.textContent = "---";
            }
          } else {
            let sigIdx = poolState.indiceActual + 1;
            if (sigIdx >= poolState.participantes.length) sigIdx = 0;
            
            if (poolState.tipo === 'americana') {
              let loopCount = 0;
              while (poolState.participantesStats[poolState.participantes[sigIdx]].eliminada && loopCount < poolState.participantes.length) {
                sigIdx++;
                if (sigIdx >= poolState.participantes.length) sigIdx = 0;
                loopCount++;
              }
            }
            
            if (poolState.participantes.length > 1) {
              const tSig = tiradores.find(x => x.id === poolState.participantes[sigIdx]);
              sig.textContent = tSig ? tSig.nombre : "---";
            } else {
              sig.textContent = "---";
            }
          }
        }
      };

      window.deshacerTiroPool = function() {
        if (!poolState.activa || poolState.historialTiros.length === 0) return;
        const last = poolState.historialTiros.pop();
        
        const t = tiradores.find(x => x.id === last.id);
        if (t && t.tiros.length > 0) {
           t.tiros.pop(); 
        }
        
        idSeleccionado = last.id;
        const stats = poolState.participantesStats[last.id];
        if (stats) {
          stats.tiros = last.oldTiros;
          stats.pegados = last.oldPegados;
          stats.secuencia = [...last.oldSecuencia];
        }
        
        if (last.esDesempate) {
          poolState.esDesempate = true;
          poolState.rondaDesempate = last.oldRondaDesempate;
          poolState.participantesDesempate = [...last.oldParticipantesDesempate];
          poolState.indiceDesempateActual = last.oldIndiceDesempate;
          if (last.oldDesempateStats) poolState.desempateStats = JSON.parse(JSON.stringify(last.oldDesempateStats));
        } else {
          poolState.esDesempate = false;
        }

        poolState.participantes.forEach(pid => {
          if (last.oldParticipantesStats && last.oldParticipantesStats[pid]) {
             poolState.participantesStats[pid].eliminada = last.oldParticipantesStats[pid].eliminada;
             poolState.participantesStats[pid].esperando = last.oldParticipantesStats[pid].esperando;
          }
        });
        
        poolState.maxScore = last.oldMaxScore;
        poolState.indiceActual = last.oldIndice;
        poolState.rondaActual = last.oldRonda;
        poolState.tirosEnTandaActual = last.oldTirosEnTanda;
        
        guardarEnLocalStorage();
        actualizarInterfazPool();
      };

      window.avanzarSiguienteVivoAmericana = function() {
        let vivos = poolState.participantes.filter(id => !poolState.participantesStats[id].eliminada);
        if (vivos.length <= 1) {
           finalizarPool();
           return;
        }
        
        let loopCount = 0;
        do {
          poolState.indiceActual++;
          if (poolState.indiceActual >= poolState.participantes.length) {
            poolState.indiceActual = 0;
            poolState.rondaActual++;
            poolState.participantes.forEach(pid => {
              poolState.participantesStats[pid].esperando = false;
            });
          }
          loopCount++;
        } while (poolState.participantesStats[poolState.participantes[poolState.indiceActual]].eliminada && loopCount < poolState.participantes.length);
        
        idSeleccionado = poolState.participantes[poolState.indiceActual];
      };

      window.registrarTiroPool = function(pego) {
        if (!poolState.activa || idSeleccionado === null) return;
        const t = tiradores.find((x) => x.id === idSeleccionado);
        if (!t) return;
        
        const stats = poolState.participantesStats[idSeleccionado];
        
        if (poolState.tipo === 'torneo') {
          if (poolState.esDesempate) {
            const idActual = poolState.participantesDesempate[poolState.indiceDesempateActual];
            const statsActual = poolState.participantesStats[idActual];
            
            t.tiros.push(pego);
            statsActual.tiros++;
            if (pego) statsActual.pegados++;
            statsActual.secuencia.push(pego);
            
            if (!poolState.desempateStats) poolState.desempateStats = {};
            if (!poolState.desempateStats[idActual]) poolState.desempateStats[idActual] = { hitsEnRonda: 0 };
            if (pego) poolState.desempateStats[idActual].hitsEnRonda = (poolState.desempateStats[idActual].hitsEnRonda || 0) + 1;

            poolState.historialTiros.push({
               id: idActual,
               pego: pego,
               esDesempate: true,
               oldTiros: statsActual.tiros - 1,
               oldPegados: statsActual.pegados - (pego ? 1 : 0),
               oldSecuencia: statsActual.secuencia.slice(0, -1),
               oldIndiceDesempate: poolState.indiceDesempateActual,
               oldRondaDesempate: poolState.rondaDesempate,
               oldTirosEnTanda: poolState.tirosEnTandaActual,
               oldParticipantesDesempate: [...poolState.participantesDesempate],
               oldDesempateStats: JSON.parse(JSON.stringify(poolState.desempateStats))
            });

            poolState.tirosEnTandaActual++;

            const esFinTandaDesempate = (poolState.modoDesempate === 'americana' && !pego) || (poolState.tirosEnTandaActual >= poolState.tandas);

            if (esFinTandaDesempate) {
              poolState.indiceDesempateActual++;
              poolState.tirosEnTandaActual = 0;

              if (poolState.indiceDesempateActual >= poolState.participantesDesempate.length) {
                let maxHitsInRound = -1;
                poolState.participantesDesempate.forEach(pid => {
                  const h = poolState.desempateStats[pid] ? poolState.desempateStats[pid].hitsEnRonda || 0 : 0;
                  if (h > maxHitsInRound) maxHitsInRound = h;
                });

                const ganadoresDeRonda = poolState.participantesDesempate.filter(pid => {
                  const h = poolState.desempateStats[pid] ? poolState.desempateStats[pid].hitsEnRonda || 0 : 0;
                  return h === maxHitsInRound;
                });

                if (ganadoresDeRonda.length === 1) {
                  const ganadorId = ganadoresDeRonda[0];
                  finalizarPool(ganadorId);
                  return;
                } else {
                  poolState.participantesDesempate = ganadoresDeRonda;
                  poolState.rondaDesempate++;
                  poolState.indiceDesempateActual = 0;
                  poolState.tirosEnTandaActual = 0;
                  poolState.participantesDesempate.forEach(pid => {
                    if (poolState.desempateStats[pid]) poolState.desempateStats[pid].hitsEnRonda = 0;
                  });
                }
              }
            }

            idSeleccionado = poolState.participantesDesempate[poolState.indiceDesempateActual];

          } else {
            const oldParticipantesStats = {};
            poolState.participantes.forEach(pid => {
              oldParticipantesStats[pid] = { eliminada: poolState.participantesStats[pid].eliminada, esperando: poolState.participantesStats[pid].esperando };
            });
            
            poolState.historialTiros.push({
               id: idSeleccionado,
               pego: pego,
               esDesempate: false,
               oldTiros: stats.tiros,
               oldPegados: stats.pegados,
               oldSecuencia: [...stats.secuencia],
               oldMaxScore: poolState.maxScore,
               oldIndice: poolState.indiceActual,
               oldRonda: poolState.rondaActual,
               oldTirosEnTanda: poolState.tirosEnTandaActual,
               oldParticipantesStats: oldParticipantesStats
            });
            
            t.tiros.push(pego);
            stats.tiros++;
            if (pego) stats.pegados++;
            stats.secuencia.push(pego);
            
            poolState.tirosEnTandaActual++;
            const targetTiros = Math.min(poolState.rondaActual * poolState.tandas, poolState.helices);
            const limiteTurnoActual = Math.max(poolState.tandas, targetTiros - (stats.tiros - poolState.tirosEnTandaActual));

            if (poolState.tirosEnTandaActual >= limiteTurnoActual || stats.tiros >= poolState.helices) {
              poolState.tirosEnTandaActual = 0;
              
              let loopCount = 0;
              do {
                poolState.indiceActual++;
                if (poolState.indiceActual >= poolState.participantes.length) {
                  poolState.indiceActual = 0;
                  poolState.rondaActual++;
                }
                loopCount++;
                const pid = poolState.participantes[poolState.indiceActual];
                const s = poolState.participantesStats[pid];
                const inactivo = s && (s.abandonado || s.eliminada || s.tiros >= poolState.helices);
                if (!inactivo) break;
              } while (loopCount < poolState.participantes.length * 2);

              idSeleccionado = poolState.participantes[poolState.indiceActual];
              
              let todosTerminaron = true;
              poolState.participantes.forEach(id => {
                const s = poolState.participantesStats[id];
                if (s && !s.abandonado && !s.eliminada && s.tiros < poolState.helices) {
                  todosTerminaron = false;
                }
              });
              
              if (todosTerminaron) {
                let maxPegados = -1;
                poolState.participantes.forEach(id => {
                  const s = poolState.participantesStats[id];
                  if (s.pegados > maxPegados) maxPegados = s.pegados;
                });
                
                const empatados = poolState.participantes.filter(id => poolState.participantesStats[id].pegados === maxPegados);
                
                if (empatados.length > 1) {
                  solicitarConfiguracionDesempate(empatados, maxPegados);
                  return;
                } else {
                  finalizarPool();
                  return;
                }
              }
            }
          }
        } else {
          const oldParticipantesStats = {};
          poolState.participantes.forEach(pid => {
            oldParticipantesStats[pid] = { eliminada: poolState.participantesStats[pid].eliminada, esperando: poolState.participantesStats[pid].esperando };
          });
          
          poolState.historialTiros.push({
             id: idSeleccionado,
             pego: pego,
             esDesempate: false,
             oldTiros: stats.tiros,
             oldPegados: stats.pegados,
             oldSecuencia: [...stats.secuencia],
             oldMaxScore: poolState.maxScore,
             oldIndice: poolState.indiceActual,
             oldRonda: poolState.rondaActual,
             oldTirosEnTanda: poolState.tirosEnTandaActual,
             oldParticipantesStats: oldParticipantesStats
          });
          
          t.tiros.push(pego);
          stats.tiros++;
          if (pego) stats.pegados++;
          stats.secuencia.push(pego);
          
          if (pego) {
            poolState.tirosEnTandaActual++;
            if (stats.pegados > poolState.maxScore) {
              poolState.maxScore = stats.pegados;
              poolState.participantes.forEach(pid => {
                const s = poolState.participantesStats[pid];
                if (s.esperando && s.pegados < poolState.maxScore) {
                  s.eliminada = true;
                }
              });
            }
            
            if (poolState.tirosEnTandaActual >= 5) {
              poolState.tirosEnTandaActual = 0;
              avanzarSiguienteVivoAmericana();
            }
          } else {
            stats.esperando = true;
            poolState.tirosEnTandaActual = 0;
            if (stats.pegados < poolState.maxScore) {
              stats.eliminada = true;
            }
            
            avanzarSiguienteVivoAmericana();
          }
          
          let vivos = poolState.participantes.filter(pid => !poolState.participantesStats[pid].eliminada);
          if (vivos.length <= 1 && poolState.historialTiros.length > 1) {
             finalizarPool();
             return;
          }
        }
        
        guardarEnLocalStorage();
        actualizarInterfazPool();
        mostrarFeedbackVisual(pego);
        triggerVibration(pego);
        playSound(pego);
      };


      
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
    if (poolState && poolState.activa) {
      document.getElementById("pantalla-principal").classList.add("hidden");
      document.getElementById("pantalla-pool-activa").classList.remove("hidden");
      actualizarInterfazPool();
    } else {
      document.getElementById("pantalla-principal").classList.remove("hidden");
      const poolActiva = document.getElementById("pantalla-pool-activa");
      if(poolActiva) poolActiva.classList.add("hidden");
    }
    actualizarInterfaz();
    actualizarBottomTabBar("planilla");
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
          
          estadoApp = "inicio";
          
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
                : "Tiradores Añadidos";
            }
          }
          if (localStorage.getItem("h_seleccionadosMulti")) {
            seleccionadosMulti =
              JSON.parse(localStorage.getItem("h_seleccionadosMulti")) || [];
          }
          if (localStorage.getItem("h_poolState")) {
            poolState = JSON.parse(localStorage.getItem("h_poolState"));
          }
          if (localStorage.getItem("h_historialPools")) {
            historialPools = JSON.parse(localStorage.getItem("h_historialPools"));
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

      function actualizarFabIconoPool() {
        const fabBtn = document.getElementById("btn-fab-pool");
        if (!fabBtn) return;
        const poolActivaEl = document.getElementById("pantalla-pool-activa");
        const isPoolVisible = poolActivaEl && !poolActivaEl.classList.contains("hidden");
        
        if (poolState && poolState.activa) {
          if (isPoolVisible) {
            fabBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01m-.01 4h.01" /></svg>`;
            fabBtn.title = "Ir a Pedana General";
          } else {
            fabBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8m-4-4v4M7 4h10M17 4v7a5 5 0 01-10 0V4M5 9a3 3 0 01-3-3V4h5m12 5a3 3 0 003-3V4h-5" /></svg>`;
            fabBtn.title = "Ir a Pool Activa";
          }
        } else {
          fabBtn.innerHTML = `<svg id="icono-fab-plus" class="w-6 h-6 text-white transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m-8-8h16"></path></svg>`;
          fabBtn.title = "Opciones";
        }
      }

      window.toggleMenuFab = function() {
        if (poolState && poolState.activa) {
          const poolActivaEl = document.getElementById("pantalla-pool-activa");
          const isPoolVisible = poolActivaEl && !poolActivaEl.classList.contains("hidden");
          
          if (isPoolVisible) {
            mostrarPedanaGeneral();
          } else {
            mostrarPoolActiva();
          }
          return;
        }

        const menu = document.getElementById("menu-fab-opciones");
        const icono = document.getElementById("icono-fab-plus");
        if (!menu) return;
        const isHidden = menu.classList.contains("hidden");
        if (isHidden) {
          menu.classList.remove("hidden");
          menu.classList.add("flex");
          if (icono) icono.classList.add("rotate-45");
        } else {
          menu.classList.add("hidden");
          menu.classList.remove("flex");
          if (icono) icono.classList.remove("rotate-45");
        }
      };

      window.cerrarMenuFab = function() {
        const menu = document.getElementById("menu-fab-opciones");
        const icono = document.getElementById("icono-fab-plus");
        if (menu) {
          menu.classList.add("hidden");
          menu.classList.remove("flex");
        }
        if (icono) icono.classList.remove("rotate-45");
      };

      document.addEventListener("click", (e) => {
        const wrapper = document.getElementById("wrapper-fab-pool");
        if (wrapper && !wrapper.contains(e.target)) {
          cerrarMenuFab();
        }
      });

      function actualizarBottomTabBar(activeTab) {
        const bar = document.getElementById("bottom-tab-bar");
        if (!bar) return;

        cerrarMenuFab();

        const authScreen = document.getElementById("pantalla-auth");
        const isAuthVisible = authScreen && !authScreen.classList.contains("hidden");

        if (!authUser || isAuthVisible) {
          bar.classList.add("hidden");
          bar.classList.remove("flex");
          return;
        } else {
          bar.classList.remove("hidden");
          bar.classList.add("flex");
        }

        const fab = document.getElementById("wrapper-fab-pool");
        if (fab) {
          if (activeTab === "planilla") {
            fab.classList.remove("hidden");
            fab.classList.add("flex");
            actualizarFabIconoPool();
          } else {
            fab.classList.add("hidden");
            fab.classList.remove("flex");
          }
        }

        const poolActivaEl = document.getElementById("pantalla-pool-activa");
        const isPoolVisible = poolActivaEl && !poolActivaEl.classList.contains("hidden");

        const tabs = ["inicio", "planilla", "historial", "ajustes"];
        tabs.forEach((tab) => {
          const btn = document.getElementById(`tab-btn-${tab}`);
          if (btn) {
            let isTabActive = (tab === activeTab);
            if (tab === "planilla" && isPoolVisible) {
              isTabActive = false;
            }
            if (isTabActive) {
              btn.classList.add("tab-item-active");
              btn.classList.remove("text-gray-500", "dark:text-gray-400");
            } else {
              btn.classList.remove("tab-item-active");
              btn.classList.add("text-gray-500", "dark:text-gray-400");
            }
          }
        });
      }

      function navegarTab(tabName) {
        if (tabName === "inicio") {
          mostrarPantallaInicio();
        } else if (tabName === "planilla") {
          const tieneSerie = (tiradores && tiradores.length > 0) || (poolState && poolState.activa);
          if (tieneSerie) {
            const poolActivaEl = document.getElementById("pantalla-pool-activa");
            const isPoolVisible = poolActivaEl && !poolActivaEl.classList.contains("hidden");
            if (isPoolVisible) {
              mostrarPedanaGeneral();
            } else {
              continuarSerieActual();
            }
          } else {
            mostrarConfirmacion(
              "No hay una serie activa en curso. ¿Deseas iniciar una nueva serie?",
              function () {
                iniciarNuevaSerie();
              }
            );
          }
        } else if (tabName === "historial") {
          mostrarPantallaHistorial();
        } else if (tabName === "ajustes") {
          mostrarPantallaConfiguracion();
        }
      }

      function mostrarPantallaInicio() {
        estadoApp = "inicio";
        guardarEnLocalStorage();
        document.getElementById("pantalla-principal").classList.add("hidden");
        const poolActiva = document.getElementById("pantalla-pool-activa");
        if(poolActiva) poolActiva.classList.add("hidden");
        document.getElementById("pantalla-historial").classList.add("hidden");
        document.getElementById("pantalla-historial").classList.remove("flex");
        document.getElementById("pantalla-configuracion").classList.add("hidden");
        document.getElementById("pantalla-configuracion").classList.remove("flex");
        document.getElementById("pantalla-inicio").classList.remove("hidden");
        document.getElementById("pantalla-inicio").classList.add("flex");
        
        actualizarBottomTabBar("inicio");

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

      function iniciarNuevaSerie(forzar = false) {
        const tienePartidaEnCurso = (tiradores && tiradores.length > 0) || (poolState && poolState.activa);

        if (!forzar && tienePartidaEnCurso) {
          mostrarConfirmacion(
            "⚠️ Tenés una partida en curso.\n\n¿Estás seguro de que querés iniciar una nueva sesión? Se perderán los datos no guardados de la sesión actual.",
            () => iniciarNuevaSerie(true),
            true
          );
          return;
        }

        tiradores = [];
        idSeleccionado = null;
        estadoApp = "registro";
        historialPools = [];
        guardarEnLocalStorage();
        
        document.getElementById("pantalla-inicio").classList.add("hidden");
        document.getElementById("pantalla-inicio").classList.remove("flex");
        document.getElementById("pantalla-historial").classList.add("hidden");
        document.getElementById("pantalla-historial").classList.remove("flex");
        document.getElementById("pantalla-configuracion").classList.add("hidden");
        document.getElementById("pantalla-configuracion").classList.remove("flex");
        document.getElementById("pantalla-principal").classList.remove("hidden");
        if (poolState) poolState.activa = false;
        const poolActiva = document.getElementById("pantalla-pool-activa");
        if(poolActiva) poolActiva.classList.add("hidden");
        
        document.getElementById("panel-resultados").classList.add("hidden");
        document.getElementById("panel-registro").classList.remove("hidden");
        
        actualizarInterfaz();
        actualizarBottomTabBar("planilla");
      }

      function continuarSerieActual() {
        estadoApp = "registro";
        guardarEnLocalStorage();
        document.getElementById("pantalla-inicio").classList.add("hidden");
        document.getElementById("pantalla-inicio").classList.remove("flex");
        document.getElementById("pantalla-historial").classList.add("hidden");
        document.getElementById("pantalla-historial").classList.remove("flex");
        document.getElementById("pantalla-configuracion").classList.add("hidden");
        document.getElementById("pantalla-configuracion").classList.remove("flex");
        
        if (poolState && poolState.activa && lastPlanillaSubScreen === "pool") {
          document.getElementById("pantalla-principal").classList.add("hidden");
          document.getElementById("pantalla-pool-activa").classList.remove("hidden");
          actualizarInterfazPool();
        } else {
          document.getElementById("pantalla-principal").classList.remove("hidden");
          const poolActiva = document.getElementById("pantalla-pool-activa");
          if(poolActiva) poolActiva.classList.add("hidden");
        }
        
        document.getElementById("panel-resultados").classList.add("hidden");
        document.getElementById("panel-registro").classList.remove("hidden");
        
        actualizarInterfaz();
        actualizarBottomTabBar("planilla");
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
        const poolActiva = document.getElementById("pantalla-pool-activa");
        if(poolActiva) poolActiva.classList.add("hidden");
        document.getElementById("pantalla-configuracion").classList.add("hidden");
        document.getElementById("pantalla-configuracion").classList.remove("flex");
        
        document.getElementById("pantalla-historial").classList.remove("hidden");
        document.getElementById("pantalla-historial").classList.add("flex");
        
        renderizarHistorialPantalla();
        actualizarBottomTabBar("historial");
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
        localStorage.setItem("h_poolState", JSON.stringify(poolState));
        localStorage.setItem("h_historialPools", JSON.stringify(historialPools));
      }

      function mostrarPantallaConfiguracion() {
        if (!authUser) return;
        document.getElementById("pantalla-inicio").classList.add("hidden");
        document.getElementById("pantalla-inicio").classList.remove("flex");
        document.getElementById("pantalla-principal").classList.add("hidden");
        const poolActiva = document.getElementById("pantalla-pool-activa");
        if(poolActiva) poolActiva.classList.add("hidden");
        document.getElementById("pantalla-historial").classList.add("hidden");
        document.getElementById("pantalla-historial").classList.remove("flex");
        
        document.getElementById("pantalla-configuracion").classList.remove("hidden");
        document.getElementById("pantalla-configuracion").classList.add("flex");
        actualizarBottomTabBar("ajustes");
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
        
        // Forzar re-renderizado de listas para actualizar clases JS que dependen de currentTheme
        if (typeof actualizarInterfaz === "function") actualizarInterfaz();
        if (typeof renderizarBaseTiradores === "function") renderizarBaseTiradores();
        if (typeof actualizarInterfazPool === "function") actualizarInterfazPool();
      }
      function cambiarPrecio() {
        const el = document.getElementById("precio-helice");
        precioHelice = parseFloat(el ? el.value : 0) || 0;
        guardarEnLocalStorage();
        if (estadoApp === "resultados") mostrarPantallaResultados();
        actualizarInterfaz();
      }
      function cambiarMinimumPodio() {
        const el = document.getElementById("min-podio");
        minimoPodio = parseInt(el ? el.value : 0) || 0;
        guardarEnLocalStorage();
        if (estadoApp === "resultados") mostrarPantallaResultados();
        actualizarInterfaz();
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
      function abrirModalAjustesSesion() {
        const modal = document.getElementById("modal-ajustes-sesion");
        if (modal) modal.classList.remove("hidden");
      }
      function cerrarModalAjustesSesion() {
        const modal = document.getElementById("modal-ajustes-sesion");
        if (modal) modal.classList.add("hidden");
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
            : "Tiradores Añadidos";
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
        if (t.costoInscripciones > 0) {
          texto += `*Inscripción Pool:* $${t.costoInscripciones.toFixed(0)}\n`;
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
        const pLine = document.getElementById("pdf-ind-pool-line");
        if (pLine) {
          if (t.costoInscripciones > 0) {
            pLine.style.display = "table-row";
            document.getElementById("pdf-ind-total-pool").textContent = t.costoInscripciones.toFixed(0);
          } else {
            pLine.style.display = "none";
          }
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
        const poolActivaEl = document.getElementById("pantalla-pool-activa");
        const poolActivaVisible = poolActivaEl && !poolActivaEl.classList.contains("hidden");
        if (poolActivaVisible) return;
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
        const cards = [
          document.getElementById("card-tiro"),
          document.getElementById("card-tiro-pool")
        ].filter(Boolean);

        cards.forEach(card => {
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
        });
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
        const ct = (tac * precioHelice) + (t.costoInscripciones || 0);
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
        actualizarFabIconoPool();
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

        const poolBanner = document.getElementById("pool-status-banner");
        if (poolBanner) {
          if (poolState && poolState.activa) {
            poolBanner.classList.remove("hidden");
            poolBanner.classList.add("flex");
            const rInfo = document.getElementById("pool-ronda-info");
            if (rInfo) {
              rInfo.textContent = `🏆 Pool en curso (Ronda ${poolState.rondaActual})`;
            }
          } else {
            poolBanner.classList.add("hidden");
            poolBanner.classList.remove("flex");
          }
        }

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
            const editBtnClass = esS 
              ? "p-1.5 rounded-md bg-black/20 hover:bg-black/40 text-white transition-colors cursor-pointer flex items-center justify-center"
              : (currentTheme === "dark" ? "p-1.5 text-gray-400 hover:text-white transition-colors cursor-pointer flex items-center justify-center" : "p-1.5 text-gray-600 hover:text-gray-900 transition-colors cursor-pointer flex items-center justify-center");

            const deleteBtnClass = esS 
              ? "p-1.5 rounded-md bg-red-700/90 hover:bg-red-800 text-white transition-colors cursor-pointer flex items-center justify-center"
              : (currentTheme === "dark" ? "p-1.5 text-red-400 hover:text-red-300 transition-colors cursor-pointer flex items-center justify-center" : "p-1.5 text-red-600 hover:text-red-700 transition-colors cursor-pointer flex items-center justify-center");

            idiv.innerHTML = `<div class="flex justify-between items-center w-full"><div class="truncate font-semibold text-sm flex-1 mr-2">${t.nombre}</div><div class="flex items-center gap-2"><span class="text-[11px] font-mono opacity-80 px-1.5 py-0.5 rounded ${currentTheme === "dark" ? "bg-gray-800 text-gray-400" : (esS ? "bg-white/20 text-white" : "bg-gray-200 text-gray-600")}">H: ${t.tiros.length} | P:${s.pegados}</span><button onclick="editarTirador(${t.id}, event)" class="${editBtnClass}" title="Editar"><svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></button><button onclick="eliminarTirador(${t.id}, event)" class="${deleteBtnClass}" title="Eliminar"><svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button></div></div>`;
            if (mH) {
              const ct =
                t.tiros.length > 0
                  ? t.tiros.map((x) => (x ? "🟢" : "🔴")).join(" ")
                  : "Sin tiros individuales";
              const hdiv = document.createElement("div");
              hdiv.className =
                "mt-3 -mx-3 -mb-3 p-3 border-t border-gray-700/50 text-xs space-y-2 rounded-b-lg expanded-details";
              hdiv.innerHTML = `<div class="tracking-widest overflow-x-auto py-0.5 font-mono">${ct}</div><div class="flex justify-between text-[11px] opacity-70"><span>Racha: ${s.rachaActual} | Max: ${s.rachaMaxima}</span><span>Total: $${s.costoTotal.toFixed(0)}</span></div><div class="grid grid-cols-2 gap-2 pt-1"><button onclick="imprimirReporteIndividual(${t.id}, event)" class="btn-pdf text-white text-[10px] py-1 rounded shadow-sm transition-colors flex items-center justify-center gap-1"><svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg> PDF</button><button onclick="compartirWhatsAppIndividual(${t.id}, event)" class="btn-wpp text-white text-[10px] py-1 rounded shadow-sm transition-colors flex items-center justify-center gap-1"><svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 013 21c.287-.852.793-1.637 1.464-2.274C3.064 17.202 2.25 14.73 2.25 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"/></svg> Wpp</button></div>`;
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
          bd = document.getElementById("btn-deshacer-main"),
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
              tn.textContent = sel.nombre;
              bp.disabled = false;
              be.disabled = false;
              if (bd) bd.disabled = sel.tiros.length === 0;
              if (s.rachaActual > 0) {
                br.textContent = `Racha: ${s.rachaActual}`;
                br.classList.remove("hidden");
              } else {
                br.classList.add("hidden");
              }
              if (s.rachaNegativaActual > 0) {
                brNeg.textContent = `Racha: ${s.rachaNegativaActual}`;
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
            tn.textContent = ng;
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
                html = `<div class="bg-blue-600/20 text-blue-300 text-xs md:text-sm font-bold px-2.5 py-0.5 rounded-full border border-blue-600/40">Racha Grupo: ${rachaNeg}</div>`;
              } else {
                html = `<div class="bg-yellow-600/20 text-yellow-400 text-xs md:text-sm font-bold px-2.5 py-0.5 rounded-full border border-yellow-600/40 ${rachaAct > 0 ? 'animate-pulse' : ''}">Racha Grupo: ${rachaAct}</div>`;
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
        if (poolState && poolState.activa) {
          mostrarAlerta("No podés finalizar la sesión mientras haya una Pool en curso. Debés terminar la Pool primero.");
          return;
        }
        document.getElementById("pantalla-inicio").classList.add("hidden");
        document.getElementById("pantalla-inicio").classList.remove("flex");
        document.getElementById("pantalla-historial").classList.add("hidden");
        document.getElementById("pantalla-historial").classList.remove("flex");
        document.getElementById("pantalla-configuracion").classList.add("hidden");
        document.getElementById("pantalla-configuracion").classList.remove("flex");
        document.getElementById("pantalla-principal").classList.remove("hidden");
        const poolActiva = document.getElementById("pantalla-pool-activa");
        if(poolActiva) poolActiva.classList.add("hidden");

        const pReg = document.getElementById("panel-registro");
        const pConf = document.getElementById("panel-configuracion");
        const pRes = document.getElementById("panel-resultados");
        if (pReg) pReg.classList.add("hidden");
        if (pConf) pConf.classList.add("hidden");
        if (pRes) pRes.classList.remove("hidden");
        actualizarBottomTabBar("planilla");
        
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
        const btnToggle = document.getElementById("btn-toggle-dinero");
        if (btnToggle) {
          if (mostrarDinero) {
            btnToggle.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-400 hover:text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>`;
            if (cFin) cFin.classList.remove("hidden");
            if (thD) thD.classList.remove("hidden");
          } else {
            btnToggle.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400 hover:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"/></svg>`;
            if (cFin) cFin.classList.add("hidden");
            if (thD) thD.classList.add("hidden");
          }
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
                barPercentage: 0.9,
                categoryPercentage: 0.7,
              },
              {
                label: "Errados",
                data: eData,
                backgroundColor: "#f43f5e",
                borderRadius: 5,
                barPercentage: 0.9,
                categoryPercentage: 0.7,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false,
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

        const cSec = document.getElementById("pdf-secuencias-cuerpo");
        if (cSec) {
          cSec.innerHTML = "";
          tiradores.forEach((t) => {
            if (t.tiros.length === 0) return;
            const div = document.createElement("div");
            div.style.cssText = "border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; background: #f8fafc; page-break-inside: avoid;";
            
            const title = document.createElement("h4");
            title.style.cssText = "font-size: 14px; text-transform: uppercase; color: #1e3a8a; font-weight: 800; margin: 0 0 10px 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;";
            title.textContent = `${t.nombre} ${t.esGrupo ? '(Grupo)' : ''}`;
            
            const seqDiv = document.createElement("div");
            seqDiv.style.cssText = "display: flex; flex-wrap: wrap; gap: 4px;";
            seqDiv.innerHTML = t.tiros.map((tiro) => {
              return `<div style="display:inline-flex; align-items:center; justify-content:center; width:22px; height:22px; margin:2px; border-radius:50%; background-color:${tiro ? '#16a34a' : '#dc2626'}; box-shadow:0 1px 2px rgba(0,0,0,0.1);"></div>`;
            }).join("");
            
            div.appendChild(title);
            div.appendChild(seqDiv);
            cSec.appendChild(div);
          });
        }
        
        const cPools = document.getElementById("pdf-pools-cuerpo");
        const secPools = document.getElementById("pdf-seccion-pools");
        
        if (cPools && secPools) {
          if (historialPools && historialPools.length > 0) {
            secPools.style.display = "block";
            cPools.innerHTML = "";
            historialPools.forEach((pool, index) => {
              const pDiv = document.createElement("div");
              pDiv.style.cssText = "border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; background: #f8fafc; margin-bottom: 15px; page-break-inside: avoid;";
              
              const title = document.createElement("h4");
              title.style.cssText = "font-size: 14px; font-weight: bold; color: #1e3a8a; margin-bottom: 10px; text-transform: uppercase;";
              title.textContent = `Pool #${index + 1} - ${pool.tipo === 'torneo' ? 'Torneo' : 'Americana'}`;
              
              const infoDiv = document.createElement("div");
              infoDiv.style.cssText = "font-size: 12px; color: #64748b; margin-bottom: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;";
              infoDiv.innerHTML = `<strong>Ganador:</strong> <span style="color:#16a34a">${pool.ganador}</span> (${pool.maxPegados} aciertos) &nbsp;|&nbsp; <strong>Inscripción:</strong> $${pool.inscripcion}`;
              
              const partDiv = document.createElement("div");
              partDiv.style.cssText = "display: flex; flex-direction: column; gap: 8px;";
              
              pool.participantes.forEach(part => {
                const partRow = document.createElement("div");
                partRow.style.cssText = "display: flex; align-items: center; font-size: 12px;";
                
                const nameCol = document.createElement("div");
                nameCol.style.cssText = "width: 120px; font-weight: bold; color: #334155;";
                nameCol.innerHTML = `${part.nombre} <span style="font-weight: normal; color: #64748b; font-size: 10px;">(${part.stats.pegados})</span>`;
                
                const seqCol = document.createElement("div");
                seqCol.style.cssText = "display: flex; flex-wrap: wrap; gap: 2px;";
                seqCol.innerHTML = part.stats.secuencia.map((x) => (x ? `<span style="display:inline-block; width:12px; height:12px; background-color:#16a34a; border-radius:50%;"></span>` : `<span style="display:inline-block; width:12px; height:12px; background-color:#dc2626; border-radius:50%;"></span>`)).join("");
                
                partRow.appendChild(nameCol);
                partRow.appendChild(seqCol);
                partDiv.appendChild(partRow);
              });
              
              pDiv.appendChild(title);
              pDiv.appendChild(infoDiv);
              pDiv.appendChild(partDiv);
              cPools.appendChild(pDiv);
            });
          } else {
            secPools.style.display = "none";
          }
        }
      }

      async function prepararYImprimir(wrapperElement, titulo) {
        if (!wrapperElement) return;

        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const tOrig = document.title;

        if (!isMobile) {
          // --- COMPUTADORAS: Impresión nativa ---
          document.title = titulo;
          wrapperElement.classList.add('printing');

          setTimeout(() => {
            window.print();
            document.title = tOrig;
            wrapperElement.classList.remove('printing');
          }, 500);
        } else {
          // --- CELULARES: Alternativa robusta con html2pdf ---
          if (typeof showSnackbar === "function") {
            showSnackbar("Generando PDF, por favor aguardá...", "info");
          }

          // Para evitar que iOS Safari optimice y no dibuje el elemento (hoja en blanco),
          // lo ponemos visible temporalmente por encima de todo.
          let tempContainer = document.createElement('div');
          tempContainer.style.position = 'absolute';
          tempContainer.style.top = '0';
          tempContainer.style.left = '0';
          tempContainer.style.width = '800px';
          tempContainer.style.backgroundColor = 'white';
          tempContainer.style.zIndex = '999999'; // Visible para forzar renderizado real
          
          let clone = wrapperElement.cloneNode(true);
          // Limpiamos IDs para evitar colisiones internas en html2canvas
          clone.removeAttribute('id');
          Array.from(clone.querySelectorAll('[id]')).forEach(el => el.removeAttribute('id'));

          clone.classList.remove('hidden', 'absolute', 'top-0', 'left-0', 'w-full', 'z-[9999]');
          clone.classList.add('block', 'static', 'w-[800px]');
          clone.style.display = 'block';

          tempContainer.appendChild(clone);
          document.body.appendChild(tempContainer);

          window.scrollTo(0, 0);

          // Damos tiempo al navegador para repintar antes de capturar
          setTimeout(async () => {
            try {
              const { jsPDF } = window.jspdf;
              const pdfWidth = 210; // A4 width in mm
              const marginX = 12;   // 12mm horizontal margin
              const marginY = 12;   // 12mm vertical margin
              const printableWidth = pdfWidth - (marginX * 2); // 186mm printable width

              const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
              pdf.deletePage(1); // Delete the default A4 page to add custom sized pages

              const sections = Array.from(tempContainer.querySelectorAll('.pdf-page'));
              // If there are no .pdf-page (e.g. individual PDF), just capture the whole clone
              const targets = sections.length > 0 ? sections : [tempContainer.firstChild];

              for (const target of targets) {
                const height = target.offsetHeight;
                // High quality scale: 2.5. Limit to 4000px height for iOS memory limits.
                let safeScale = 2.5; 
                if (height * safeScale > 4000) {
                  safeScale = Math.max(1, 4000 / height);
                }

                const canvas = await window.html2canvas(target, {
                  scale: safeScale,
                  useCORS: true,
                  logging: false,
                  windowWidth: 800,
                  scrollY: 0
                });

                const imgData = canvas.toDataURL('image/jpeg', 0.95);
                const pdfContentHeight = (canvas.height * printableWidth) / canvas.width;
                const pageHeight = Math.max(297, pdfContentHeight + (marginY * 2));

                pdf.addPage([pdfWidth, pageHeight], 'portrait');
                pdf.addImage(imgData, 'JPEG', marginX, marginY, printableWidth, pdfContentHeight);
              }

              pdf.save(titulo + '.pdf');

              if (typeof showSnackbar === "function") {
                showSnackbar("¡PDF descargado con éxito!", "success");
              }
            } catch (error) {
              console.error("Error al generar el PDF en celular:", error);
              if (typeof mostrarAlerta === "function") {
                mostrarAlerta("Hubo un error al generar el PDF. Intentá nuevamente.");
              }
            } finally {
              // Limpiamos el DOM y liberamos memoria explícitamente
              document.body.removeChild(tempContainer);
              tempContainer = null;
              clone = null;
            }
          }, 800);
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
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <b class="text-base text-white">${nombreSesion}</b>
                <span class="text-xs text-gray-500">${hora}</span>
              </div>
              <div class="flex items-center gap-4 text-xs mt-2">
                <span class="bg-gray-800 px-2 py-1 rounded text-green-400 font-mono border border-gray-700">Recaudado: $${tD.toFixed(0)}</span>
                <span class="bg-gray-800 px-2 py-1 rounded text-blue-300 border border-gray-700">${tH} Hélices</span>
                <span class="bg-gray-800 px-2 py-1 rounded text-yellow-300 border border-gray-700">${s.tiradores.filter((x) => !x.esGrupo).length} Tiradores</span>
              </div>
            </div>
            <div class="flex items-center gap-2 w-full md:w-auto mt-3 md:mt-0">
              <button onclick="renombrarSesion(${s.id})" class="flex-1 md:flex-none bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm border border-gray-600 transition flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <span class="md:hidden">Renombrar</span>
              </button>
              <button onclick="eliminarSesionHistorial(${s.id})" class="flex-1 md:flex-none bg-red-900/30 hover:bg-red-800 text-red-300 px-3 py-2 rounded-lg text-sm border border-red-800/50 transition flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span class="md:hidden">Eliminar</span>
              </button>
              <button onclick="cargarSesionPasada(${s.id})" class="flex-1 md:flex-none bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow transition flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
                Entrar
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
            if (tl) tl.textContent = "Tiradores Añadidos";
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
window.mostrarPedanaGeneral = function() {
  lastPlanillaSubScreen = "pedana";
  const pPool = document.getElementById("pantalla-pool-activa");
  if (pPool) pPool.classList.add("hidden");
  
  document.getElementById("pantalla-principal").classList.remove("hidden");
  document.getElementById("panel-resultados").classList.add("hidden");
  document.getElementById("panel-registro").classList.remove("hidden");
  
  actualizarInterfaz();
  actualizarBottomTabBar("planilla");
  actualizarFabIconoPool();
};

window.mostrarPoolActiva = function() {
  if (!poolState || !poolState.activa) return;
  lastPlanillaSubScreen = "pool";
  
  document.getElementById("pantalla-principal").classList.add("hidden");
  const pPool = document.getElementById("pantalla-pool-activa");
  if (pPool) pPool.classList.remove("hidden");
  
  actualizarInterfazPool();
  actualizarBottomTabBar("planilla");
  actualizarFabIconoPool();
};

window.saltarTurnoPool = function() {
  if (!poolState || !poolState.activa) return;

  if (poolState.esDesempate) {
    if (!poolState.participantesDesempate || poolState.participantesDesempate.length < 2) return;
    
    const activosDesempate = poolState.participantesDesempate.filter(id => {
      const s = poolState.participantesStats[id];
      return !s || !s.abandonado;
    });
    if (activosDesempate.length < 2) {
      showSnackbar("No hay otros tiradores en el desempate para saltar el turno.");
      return;
    }

    const wasLast = poolState.indiceDesempateActual >= poolState.participantesDesempate.length - 1;
    const currentId = poolState.participantesDesempate[poolState.indiceDesempateActual];
    
    poolState.participantesDesempate = poolState.participantesDesempate.filter(id => id !== currentId);
    poolState.participantesDesempate.push(currentId);

    poolState.tirosEnTandaActual = 0;
    
    if (wasLast) {
      poolState.indiceDesempateActual = 0;
      poolState.rondaDesempate++;
    }

    let loop = 0;
    while (loop < poolState.participantesDesempate.length) {
      if (poolState.indiceDesempateActual >= poolState.participantesDesempate.length) {
        poolState.indiceDesempateActual = 0;
      }
      const nextId = poolState.participantesDesempate[poolState.indiceDesempateActual];
      const s = poolState.participantesStats[nextId];
      if (!s || !s.abandonado) break;
      poolState.indiceDesempateActual++;
      loop++;
    }

    const shooterObj = tiradores.find(x => x.id === currentId);
    showSnackbar(`Turno de ${shooterObj ? shooterObj.nombre : 'tirador'} salteado al final.`);
  } else {
    if (!poolState.participantes || poolState.participantes.length < 2) return;

    const activosPool = poolState.participantes.filter(id => {
      const s = poolState.participantesStats[id];
      return s && !s.abandonado && !s.eliminada;
    });
    if (activosPool.length < 2) {
      showSnackbar("No hay otros tiradores activos para saltar el turno.");
      return;
    }

    const wasLast = poolState.indiceActual >= poolState.participantes.length - 1;
    const currentId = poolState.participantes[poolState.indiceActual];

    poolState.participantes = poolState.participantes.filter(id => id !== currentId);
    poolState.participantes.push(currentId);

    poolState.tirosEnTandaActual = 0;

    if (wasLast) {
      poolState.indiceActual = 0;
      poolState.rondaActual++;
    }

    let loop = 0;
    while (loop < poolState.participantes.length) {
      if (poolState.indiceActual >= poolState.participantes.length) {
        poolState.indiceActual = 0;
      }
      const nextId = poolState.participantes[poolState.indiceActual];
      const s = poolState.participantesStats[nextId];
      const inactivo = s && (s.abandonado || (poolState.tipo === 'americana' && s.eliminada));
      if (!inactivo) break;
      poolState.indiceActual++;
      loop++;
    }

    const shooterObj = tiradores.find(x => x.id === currentId);
    showSnackbar(`Turno de ${shooterObj ? shooterObj.nombre : 'tirador'} salteado al final.`);
  }

  sincronizarIdSeleccionadoPool();
  guardarEnLocalStorage();
  actualizarInterfazPool();
};

window.confirmarAbandonoPoolActual = function() {
  if (!poolState || !poolState.activa) return;
  const currentId = poolState.esDesempate 
    ? poolState.participantesDesempate[poolState.indiceDesempateActual] 
    : poolState.participantes[poolState.indiceActual];
    
  const t = tiradores.find(x => x.id === currentId);
  const nombre = t ? t.nombre : "este tirador";
  
  mostrarConfirmacion(
    `¿Estás seguro de que ${nombre} abandona la Pool?`,
    () => abandonarPool(currentId),
    true
  );
};

window.abandonarPool = function(id) {
  if (!poolState || !poolState.activa) return;
  
  if (!poolState.participantesStats[id]) {
    poolState.participantesStats[id] = { tiros: 0, pegados: 0, eliminada: true, abandonado: true, secuencia: [] };
  } else {
    poolState.participantesStats[id].eliminada = true;
    poolState.participantesStats[id].abandonado = true;
  }
  
  const t = tiradores.find(x => x.id === id);
  showSnackbar(`Tirador ${t ? t.nombre : ''} abandonó la Pool.`);
  
  if (poolState.esDesempate) {
    if (poolState.participantesDesempate.includes(id)) {
      poolState.participantesDesempate = poolState.participantesDesempate.filter(x => x !== id);
      if (poolState.indiceDesempateActual >= poolState.participantesDesempate.length) {
        poolState.indiceDesempateActual = 0;
      }
      poolState.tirosEnTandaActual = 0;
    }
  } else {
    if (poolState.participantes[poolState.indiceActual] === id) {
      poolState.tirosEnTandaActual = 0;
      let nextIdx = poolState.indiceActual;
      let count = 0;
      while (count < poolState.participantes.length) {
        nextIdx = (nextIdx + 1) % poolState.participantes.length;
        const pid = poolState.participantes[nextIdx];
        const s = poolState.participantesStats[pid];
        if (!s || (!s.eliminada && !s.abandonado)) {
          poolState.indiceActual = nextIdx;
          break;
        }
        count++;
      }
    }
  }
  
  sincronizarIdSeleccionadoPool();
  guardarEnLocalStorage();
  actualizarInterfazPool();
  
  evaluarFinPoolTrasAbandono();
};

function evaluarFinPoolTrasAbandono() {
  if (!poolState || !poolState.activa) return;
  const activos = poolState.participantes.filter(pid => {
    const s = poolState.participantesStats[pid];
    return s && !s.eliminada && !s.abandonado;
  });
  
  if (activos.length === 1) {
    finalizarPool(activos[0]);
  } else if (activos.length === 0) {
    finalizarPool();
  }
}

function solicitarConfiguracionDesempate(empatados, maxPegados) {
  pendingDesempateData = { empatados, maxPegados };
  document.getElementById("modal-desempate-opciones").classList.remove("hidden");
}

window.confirmarDesempateSeleccionado = function(modo) {
  document.getElementById("modal-desempate-opciones").classList.add("hidden");
  if (!pendingDesempateData) return;
  
  const { empatados, maxPegados } = pendingDesempateData;
  pendingDesempateData = null;
  
  iniciarDesempatePoolConModo(empatados, maxPegados, modo);
};

function iniciarDesempatePoolConModo(empatados, maxPegados, modo) {
  poolState.esDesempate = true;
  poolState.modoDesempate = modo;
  poolState.rondaDesempate = 1;
  poolState.participantesDesempate = [...empatados];
  poolState.indiceDesempateActual = 0;
  poolState.tirosEnTandaActual = 0;
  poolState.desempateStats = {};
  
  if (modo === 'muerte_subita') {
    poolState.tandas = 1;
  } else if (modo === 'tandas_2') {
    poolState.tandas = 2;
  } else if (modo === 'americana') {
    poolState.tandas = 5;
  }
  
  empatados.forEach(id => {
    poolState.desempateStats[id] = { hitsEnRonda: 0 };
  });
  
  const nombres = empatados.map(id => {
    const t = tiradores.find(x => x.id === id);
    return t ? t.nombre : "";
  }).filter(Boolean).join(" y ");
  
  idSeleccionado = poolState.participantesDesempate[0];
  
  guardarEnLocalStorage();
  actualizarInterfazPool();
  
  let modoDesc = 'Muerte Súbita';
  if (modo === 'tandas_2') modoDesc = 'Tandas de 2';
  if (modo === 'americana') modoDesc = 'Americana';
  showSnackbar(`Desempate (${modoDesc}) entre ${nombres}`);
}

window.mostrarPantallaConfiguracion = mostrarPantallaConfiguracion;
window.toggleMostrarDinero = toggleMostrarDinero;
window.irAPantallaPrincipal = irAPantallaPrincipal;
window.cerrarPantallaConfiguracion = cerrarPantallaConfiguracion;
window.toggleTheme = toggleTheme;
window.cambiarPrecio = cambiarPrecio;
window.cambiarMinimumPodio = cambiarMinimumPodio;
window.cambiarCriterioOrden = cambiarCriterioOrden;
window.cerrarModalPodio = cerrarModalPodio;
window.abrirModalAjustesSesion = abrirModalAjustesSesion;
window.cerrarModalAjustesSesion = cerrarModalAjustesSesion;
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
window.navegarTab = navegarTab;
window.actualizarBottomTabBar = actualizarBottomTabBar;



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
    actualizarBottomTabBar('');
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

function sanitizarMensajeError(error) {
  if (!error) return 'Ocurrió un error inesperado.';
  const msg = error.message || error.toString();
  
  if (msg.includes('Unsupported provider') || msg.includes('provider is not enabled') || msg.includes('provider_not_enabled') || msg.includes('validation_failed')) {
    return 'El inicio de sesión con Google aún no está activado en tu panel de Supabase. Requiere habilitar el proveedor Google en Supabase Dashboard (Authentication -> Providers).';
  }
  if (msg.includes('Invalid login credentials')) {
    return 'Correo electrónico o contraseña incorrectos.';
  }
  if (msg.includes('User already registered') || msg.includes('already exists')) {
    return 'Este correo electrónico ya se encuentra registrado.';
  }
  if (msg.includes('Password should be at least')) {
    return 'La contraseña debe tener al menos 8 caracteres.';
  }
  if (msg.includes('Email rate limit exceeded')) {
    return 'Demasiados intentos de envío. Por favor, esperá unos minutos.';
  }
  if (msg.includes('Email not confirmed')) {
    return 'Por favor, confirmá tu correo electrónico antes de ingresar.';
  }
  if (msg.includes('Network error') || msg.includes('Failed to fetch')) {
    return 'Error de conexión a internet. Verificá tu red.';
  }
  return msg;
}

window.togglePasswordVisibility = function() {
  const input = document.getElementById('auth-password');
  const icon = document.getElementById('eye-icon');
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    if (icon) {
      icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.858A9.954 9.954 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m-4.592-4.591a3 3 0 10-4.243-4.243m4.243 4.243L3 3l18 18" />`;
    }
  } else {
    input.type = 'password';
    if (icon) {
      icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />`;
    }
  }
};

window.evaluarFortalezaPassword = function(pwd) {
  const container = document.getElementById('password-strength-container');
  const bar = document.getElementById('password-strength-bar');
  const text = document.getElementById('password-strength-text');
  if (!container || !bar || !text || !isRegistering) return;

  if (!pwd) {
    bar.style.width = '0%';
    text.textContent = 'Mínimo 8 caracteres';
    text.className = 'text-[11px] font-semibold text-gray-400 text-right';
    return;
  }

  let score = 0;
  if (pwd.length >= 8) score += 1;
  if (pwd.length >= 12) score += 1;
  if (/[A-Z]/.test(pwd)) score += 1;
  if (/[0-9]/.test(pwd)) score += 1;
  if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

  if (score <= 1) {
    bar.style.width = '25%';
    bar.className = 'h-full transition-all duration-300 bg-red-500';
    text.textContent = 'Débil (usá al menos 8 caracteres)';
    text.className = 'text-[11px] font-semibold text-red-500 text-right';
  } else if (score <= 3) {
    bar.style.width = '60%';
    bar.className = 'h-full transition-all duration-300 bg-yellow-500';
    text.textContent = 'Aceptable (agregá letras o números)';
    text.className = 'text-[11px] font-semibold text-yellow-500 text-right';
  } else {
    bar.style.width = '100%';
    bar.className = 'h-full transition-all duration-300 bg-emerald-500';
    text.textContent = '¡Excelente y segura!';
    text.className = 'text-[11px] font-semibold text-emerald-500 text-right';
  }
};

window.loginConGoogle = async function() {
  const btn = document.getElementById('btn-google-auth');
  if (btn) btn.disabled = true;
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) throw error;
  } catch (error) {
    console.error('Error con Google OAuth:', error);
    mostrarAlerta(sanitizarMensajeError(error));
  } finally {
    if (btn) btn.disabled = false;
  }
};

window.setAuthTab = function(mode) {
  isRegistering = (mode === 'register');

  const btn = document.getElementById('btn-login');
  const toggleBtn = document.getElementById('btn-toggle-auth');
  const titulo = document.getElementById('auth-titulo');
  const subtitulo = document.getElementById('auth-subtitulo');
  const togglePregunta = document.getElementById('auth-toggle-pregunta');
  const strengthContainer = document.getElementById('password-strength-container');
  const confirmContainer = document.getElementById('auth-confirm-password-container');

  const tabLogin = document.getElementById('tab-auth-login');
  const tabRegister = document.getElementById('tab-auth-register');

  if (isRegistering) {
    if (tabLogin) {
      tabLogin.className = 'flex-1 py-2 text-xs md:text-sm font-extrabold rounded-xl transition-all cursor-pointer text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white';
    }
    if (tabRegister) {
      tabRegister.className = 'flex-1 py-2 text-xs md:text-sm font-extrabold rounded-xl transition-all cursor-pointer bg-blue-600 text-white shadow-xs';
    }

    if (btn) btn.textContent = 'Crear Cuenta';
    if (toggleBtn) toggleBtn.textContent = 'Iniciar Sesión';
    if (titulo) titulo.textContent = 'Crear Cuenta';
    if (subtitulo) subtitulo.textContent = 'Registrate para guardar y sincronizar tu historial de tiro en la nube.';
    if (togglePregunta) togglePregunta.textContent = '¿Ya tenés una cuenta?';
    if (strengthContainer) strengthContainer.classList.remove('hidden');
    if (confirmContainer) confirmContainer.classList.remove('hidden');

    const pwdInput = document.getElementById('auth-password');
    if (pwdInput) evaluarFortalezaPassword(pwdInput.value);
  } else {
    if (tabLogin) {
      tabLogin.className = 'flex-1 py-2 text-xs md:text-sm font-extrabold rounded-xl transition-all cursor-pointer bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-xs';
    }
    if (tabRegister) {
      tabRegister.className = 'flex-1 py-2 text-xs md:text-sm font-extrabold rounded-xl transition-all cursor-pointer text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white';
    }

    if (btn) btn.textContent = 'Ingresar';
    if (toggleBtn) toggleBtn.textContent = 'Registrate';
    if (titulo) titulo.textContent = 'Iniciar Sesión';
    if (subtitulo) subtitulo.textContent = 'Ingresá a tu cuenta para guardar y sincronizar tu historial de tiro en la nube.';
    if (togglePregunta) togglePregunta.textContent = '¿No tenés cuenta?';
    if (strengthContainer) strengthContainer.classList.add('hidden');
    if (confirmContainer) confirmContainer.classList.add('hidden');
  }
};

async function handleAuth(e) {
  e.preventDefault();
  const rawEmail = document.getElementById('auth-email').value;
  const email = (rawEmail || '').trim().toLowerCase();
  const password = document.getElementById('auth-password').value;

  if (isRegistering) {
    const confirmPassword = document.getElementById('auth-confirm-password').value;
    if (password.length < 8) {
      mostrarAlerta('La contraseña debe tener al menos 8 caracteres por razones de seguridad.');
      return;
    }
    if (password !== confirmPassword) {
      mostrarAlerta('Las contraseñas no coinciden. Por favor, verificá que ambas sean iguales.');
      return;
    }
  }
  
  const btn = document.getElementById('btn-login');
  btn.disabled = true;
  btn.textContent = 'Cargando...';

  try {
    if (isRegistering) {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;

      // Check if user already exists (Supabase returns empty identities array when email exists and security protection is enabled)
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        mostrarAlerta('Este correo electrónico ya está registrado. Por favor, iniciá sesión.');
        setAuthTab('login');
        return;
      }

      // If email confirmation is required, session will be null
      if (data.user && data.user.identities && data.user.identities.length > 0 && !data.session) {
        mostrarAlerta('¡Registro exitoso! Por favor, revisá tu correo electrónico para confirmar tu cuenta antes de ingresar.');
      } else if (data.session) {
        mostrarAlerta('¡Registro e inicio de sesión exitosos!');
      } else {
        mostrarAlerta('¡Registro exitoso! Ya podés ingresar.');
      }
      
      setAuthTab('login');
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // onAuthStateChange will handle UI transition
      btn.textContent = 'Ingresar';
    }
  } catch (error) {
    mostrarAlerta(sanitizarMensajeError(error));
    btn.textContent = isRegistering ? 'Crear Cuenta' : 'Ingresar';
  } finally {
    btn.disabled = false;
  }
}

window.toggleAuthMode = function() {
  setAuthTab(isRegistering ? 'login' : 'register');
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
      .upsert({ user_id: authUser.id, backup_json: backupData }, { onConflict: 'user_id' });
      
    if (error) console.error("Error syncing:", error);
  } catch(e) {
    console.error("Sync error:", e);
  }
}


// --- END AUTH LOGIC ---
