const fs = require('fs');

let mainJs = fs.readFileSync('src/main.js', 'utf8');

// 1. Add UX State
const uxStateStr = `
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
`;

// Inject state after imports
mainJs = mainJs.replace(/(import Chart from 'chart\.js\/auto';\n)/, "$1" + uxStateStr + "\n");

// 2. Set toggle states on window.onload
const onloadStr = `          if (localStorage.getItem("h_uxVibracion") !== null) {
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
`;
mainJs = mainJs.replace(/(if \(localStorage\.getItem\("h_tema"\)\)\n\s+currentTheme = localStorage\.getItem\("h_tema"\) \|\| "dark";)/, "$1\n" + onloadStr);

// 3. Inject triggerVibration, playSound, showSnackbar in registrarTiro
// Replaces mostrarFeedbackVisual(pego); with UX triggers
mainJs = mainJs.replace(/mostrarFeedbackVisual\(pego\);/g, "mostrarFeedbackVisual(pego);\n            triggerVibration(pego);\n            playSound(pego);\n            showSnackbar('Tiro registrado');");

// 4. Update deshacerUltimoTiro to hide snackbar
mainJs = mainJs.replace(/actualizarInterfaz\(\);\n\s+}/g, "actualizarInterfaz();\n            const sb = document.getElementById('snackbar-undo');\n            if(sb) sb.classList.add('translate-y-24', 'opacity-0');\n          }");

// 5. Swipe logic in actualizarInterfaz
const swipeInjection = `
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
`;
mainJs = mainJs.replace(/(idiv\.onclick = \(\) => seleccionarTirador\(t\.id\);)/, "$1" + swipeInjection);

// Write to window exports
mainJs = mainJs.replace(/window\.reiniciarApp = reiniciarApp;/, `window.reiniciarApp = reiniciarApp;
window.toggleVibracion = toggleVibracion;
window.toggleSonido = toggleSonido;
window.toggleWakeLock = toggleWakeLock;
window.showSnackbar = showSnackbar;
`);

fs.writeFileSync('src/main.js', mainJs);
console.log('src/main.js updated with UX features');
