const fs = require('fs');
let js = fs.readFileSync('src/main.js', 'utf8');

// Insert imports and auth state at the top
const importInject = `import { supabase } from './supabase.js';

// Auth State
let authUser = null;
let isRegistering = false;
`;

js = js.replace(/import Chart from 'chart\.js\/auto';/, "import Chart from 'chart.js/auto';\n" + importInject);

// Insert auth functions
const authFunctions = `
// --- AUTH LOGIC ---
async function initAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    authUser = session.user;
    mostrarPantallaInicio();
    await fetchCloudData();
  } else {
    document.getElementById('pantalla-inicio').classList.add('hidden');
    document.getElementById('pantalla-auth').classList.remove('hidden');
  }

  supabase.auth.onAuthStateChange(async (_event, session) => {
    if (session) {
      authUser = session.user;
      mostrarPantallaInicio();
      await fetchCloudData();
    } else {
      authUser = null;
      document.getElementById('pantalla-inicio').classList.add('hidden');
      document.getElementById('pantalla-auth').classList.remove('hidden');
    }
  });
}

function mostrarPantallaInicio() {
  document.getElementById('pantalla-auth').classList.add('hidden');
  document.getElementById('pantalla-inicio').classList.remove('hidden');
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
      alert('¡Registro exitoso! Ya puedes ingresar.');
      isRegistering = false;
      document.getElementById('btn-toggle-auth').textContent = 'Registrate';
      btn.textContent = 'Ingresar';
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // onAuthStateChange will handle UI
    }
  } catch (error) {
    alert(error.message);
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

async function fetchCloudData() {
  if (!authUser) return;
  // TODO: Fetch from supabase and update localStorage if newer
}

async function syncCloudData() {
  if (!authUser) return;
  try {
    // We can just dump the backup JSON for simplicity for now
    const backupData = {
      h_historial: localStorage.getItem("h_historial") || "[]",
      h_base_tiradores: localStorage.getItem("h_base_tiradores") || "[]"
    };
    
    // Instead of using real tables right away without knowing user schema, 
    // let's create a 'user_backups' table conceptually.
    // For now, we will just log it since we need to create the table in Supabase first.
    console.log("Syncing to cloud...", backupData);
    
    const { error } = await supabase
      .from('user_backups')
      .upsert({ user_id: authUser.id, backup_json: backupData });
      
    if (error) console.error("Error syncing:", error);
    else console.log("Synced successfully.");
  } catch(e) {
    console.error("Sync error:", e);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-auth');
  if (form) form.addEventListener('submit', handleAuth);
  
  const toggleBtn = document.getElementById('btn-toggle-auth');
  if (toggleBtn) toggleBtn.addEventListener('click', toggleAuthMode);
  
  initAuth();
});
// --- END AUTH LOGIC ---
`;

js = js + '\n' + authFunctions;

// Inject syncCloudData into guardarYFinalizarSesion
// find the declaration of guardarYFinalizarSesion
const oldGuardar = `function guardarYFinalizarSesion() {
        guardarEnHistorial();
        reiniciarApp();
      }`;
      
const newGuardar = `async function guardarYFinalizarSesion() {
        guardarEnHistorial();
        reiniciarApp();
        await syncCloudData();
      }`;

if (js.includes(oldGuardar)) {
  js = js.replace(oldGuardar, newGuardar);
}

fs.writeFileSync('src/main.js', js);
console.log("main.js updated");
