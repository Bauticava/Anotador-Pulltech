# Plan: Pantalla Secundaria (Monitor Externo)

## Objetivo
Explorar la viabilidad y las opciones técnicas para conectar un teléfono o tablet a un monitor externo (vía cable o transmisión inalámbrica) y mostrar una interfaz distinta en el monitor (con menos información o adaptada para los espectadores/tiradores) mientras el dispositivo móvil mantiene la vista de control completa.

## Desafíos
Por defecto, al conectar un dispositivo móvil a un monitor, el sistema operativo realiza un "mirroring" (espejo) de la pantalla. Para mostrar contenido diferente en el monitor desde una aplicación web, necesitamos utilizar APIs específicas del navegador o arquitecturas de sincronización.

## Alternativas Técnicas

### 1. Presentation API (Recomendada para Web Móvil)
La **Presentation API** de HTML5 está diseñada exactamente para este propósito. Permite que una página web controle una segunda pantalla (como un monitor conectado, Chromecast o Apple TV) y envíe contenido HTML independiente a ella.
- **Pros:** Es el estándar web para proyecciones secundarias. El dispositivo móvil puede actuar como "control remoto" mientras envía comandos a la pantalla de presentación.
- **Contras:** El soporte varía según el navegador y el sistema operativo. Funciona bien en Chrome (Android) proyectando a pantallas inalámbricas, pero el soporte para cables HDMI directos en tablets (como un iPad) con Safari puede tener limitaciones y requeriría pruebas específicas.

### 2. Sincronización en la Nube / Local (Arquitectura Cliente-Servidor)
Crear una vista especial (ej. `midominio.com/pantalla`) y abrirla en un navegador dentro de una computadora, Smart TV o dispositivo conectado al monitor, mientras el teléfono se usa solo como controlador.
- **Cómo funciona:** La tablet envía las actualizaciones de la planilla a la base de datos (Firebase/Supabase o WebSockets) y la pantalla del monitor simplemente "escucha" y se actualiza en tiempo real.
- **Pros:** Compatibilidad del 100% en cualquier dispositivo. No depende de cables ni de APIs experimentales del navegador.
- **Contras:** Requiere conexión a internet (o red local) y adaptar la lógica para que los dispositivos se comuniquen entre sí, en lugar de ser una aplicación puramente offline.

### 3. Window Management API (Multi-Screen Window Placement)
Permite a una aplicación web detectar monitores conectados (por cable) y abrir ventanas emergentes directamente en esa segunda pantalla.
- **Pros:** Permite mostrar contenido diferente en cada pantalla cuando están conectadas por cable.
- **Contras:** Está pensado principalmente para navegadores de escritorio (PC/Mac). En dispositivos móviles o tablets iOS/Android, el soporte de ventanas emergentes posicionadas en una pantalla externa suele estar bloqueado o no soportado por el navegador móvil.

## Recomendación Preliminar

Si el objetivo es usar estrictamente el teléfono/tablet conectado por **cable** al monitor, la web tradicional tiene barreras en dispositivos móviles, ya que iOS/Android forzarán el modo "espejo". 

**La solución más robusta y profesional** (si hay internet o red local) es la **Opción 2**: tener una URL dedicada para el "Monitor" y que la aplicación del teléfono sincronice los datos en tiempo real (por ejemplo, vía WebSockets o Firebase). De esta forma, el monitor muestra una interfaz simplificada (solo resultados, turnos, puntajes) y el teléfono tiene toda la botonera de control.

---
## Conclusión y Siguiente Paso (Decisión de Arquitectura)

Tras analizar las limitaciones del entorno móvil para gestionar monitores externos por cable, la decisión estratégica es **bifurcar los casos de uso en dos aplicaciones distintas**:

1. **Anotador Hobbyista (Web/Móvil):** 
   La aplicación actual (`Anotador-Pulltech`) se mantiene como una versión ligera, portátil y offline pensada para uso personal en teléfonos. Su alcance se limitará a la pantalla del dispositivo móvil.
2. **Software Profesional / Robusto (Escritorio):** 
   Se desarrollará una nueva aplicación orientada a PC/Notebook (por ejemplo, con un ejecutable usando tecnologías como **Electron**, **Tauri**, o un **servidor web local** en Python/Node.js). 
   - Esta arquitectura permitirá usar la **Window Management API** o manejar múltiples ventanas nativas del sistema operativo.
   - El club usaría una computadora que puede fácilmente conectarse a una TV/Monitor por HDMI y mostrar una vista de 'Público/Tiradores' en el monitor secundario, mientras el operador usa la pantalla principal de la PC para manejar la planilla.

Esta separación asegura que la versión de celular siga siendo fácil de usar, mientras que la versión de escritorio pueda escalar en funcionalidades avanzadas (dual-screen, torneos, base de datos local).
