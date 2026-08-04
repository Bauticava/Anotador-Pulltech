# Plan de Implementación: Torneos Oficiales en Vivo & Buscador Realtime

## 📌 Visión General
Transformar la aplicación en una plataforma en vivo para clubes y torneos de tiro deportivo. Permite a los organizadores/planilleros transmitir los resultados de los torneos en tiempo real via WebSockets (Supabase Realtime), y a los usuarios/espectadores buscar y seguir las competencias en vivo desde cualquier lugar o proyectarlas en Smart TVs en las sedes de los clubes.

---

## 👥 Roles y Experiencia de Usuario

### 1. Planillero / Administrador del Torneo
- **Creación de Torneo:** Define título, fecha, club/sede, modalidad (Hélices Torneo/Americana), tandas y costo de inscripción.
- **Gestión de Tiradores:** Inscribe tiradores y asigna categorías.
- **Control de Pedana:** Registra los disparos (`PEGÓ` / `ERRÓ`) y desempates. Cada acción transmite eventos en tiempo real (< 100ms) a la nube.

### 2. Espectadores (Público General)
- **Buscador de Torneos ("Torneos En Vivo"):** Explora torneos activos marcados como `🔴 EN VIVO` y torneos pasados `🏁 FINALIZADO`.
- **Vista de Espectador (Live Leaderboard):** Tabla de posiciones reordenada automáticamente en vivo, estado del tirador activo en pedana y secuencias de disparos.
- **Solo Lectura:** Los controles de anotación y edición están ocultos.

### 3. Modo Pantalla Gigante (Club TV)
- Vista adaptada con tipografía de alto contraste diseñada para ser proyectada en TVs o pantallas gigantes dentro de las sedes de los clubes.

---

## 🗄️ Esquema de Base de Datos en Supabase

### Tabla `torneos`
```sql
CREATE TABLE torneos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  club_sede TEXT NOT NULL,
  fecha TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  estado TEXT NOT NULL DEFAULT 'en_curso', -- 'en_curso', 'finalizado'
  modalidad TEXT NOT NULL DEFAULT 'torneo', -- 'torneo', 'americana'
  configuracion JSONB DEFAULT '{}'::jsonb,
  creador_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
```

### Tabla `participantes_torneo`
```sql
CREATE TABLE participantes_torneo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  torneo_id UUID REFERENCES torneos(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  categoria TEXT DEFAULT 'General',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
```

### Tabla `tiros_torneo`
```sql
CREATE TABLE tiros_torneo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  torneo_id UUID REFERENCES torneos(id) ON DELETE CASCADE,
  participante_id UUID REFERENCES participantes_torneo(id) ON DELETE CASCADE,
  ronda INT NOT NULL,
  pego BOOLEAN NOT NULL,
  es_desempate BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
```

---

## ⚡ Conexión en Tiempo Real (Supabase Realtime)

### Suscripción del Espectador
```javascript
// Suscripción a cambios en disparos del torneo activo
const channel = supabase
  .channel(`torneo-${torneoId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'tiros_torneo',
      filter: `torneo_id=eq.${torneoId}`
    },
    (payload) => {
      // Actualizar tabla de posiciones y destellos de color en vivo
      procesarTiroEnVivo(payload.new);
    }
  )
  .subscribe();
```

---

## 🎨 Pantallas y Módulos Frontend a Desarrollar

1. **`#pantalla-explorar-torneos`**:
   - Barra de búsqueda por club/nombre.
   - Pestañas: `🔴 En Vivo` | `🏁 Históricos`.
   - Tarjetas de torneos con resumen de participantes y ronda actual.

2. **`#pantalla-espectador-torneo`**:
   - Tarjeta del tirador activo en pedana con luces dinámicas (`PEGÓ`/`ERRÓ`).
   - Tabla de posiciones (Leaderboard) con ordenamiento automático por puntaje.
   - Indicador visual de conexión en tiempo real (`🟢 En vivo`).

3. **`#pantalla-tv-club`**:
   - Vista limpia sin barras de navegación, optimizada para resoluciones 16:9 de TVs.

---

## 🛡️ Seguridad y Row Level Security (RLS)
- **Lectura pública (`SELECT`):** Permitida para todos los usuarios (incluso anónimos o espectadores no autenticados).
- **Escritura (`INSERT`, `UPDATE`, `DELETE`):** Permitida únicamente al usuario cuyo `auth.uid() == creador_id`.

---

## 🚀 Fases de Desarrollo Sugeridas
1. **Fase 1:** Creación de tablas y políticas RLS en Supabase.
2. **Fase 2:** Pantalla de Explorador/Buscador de Torneos.
3. **Fase 3:** Vista de Espectador en Tiempo Real (`supabase.channel`).
4. **Fase 4:** Modo TV para clubes y pulido visual de animaciones.
