# Informe Técnico — Reps

> Bitácora de la experiencia de desarrollo con herramientas de IA

---

## Arsenal de herramientas

### Claude Code (Anthropic) — terminal

La herramienta principal del desarrollo. Claude Code corre directamente en la terminal con acceso al filesystem y ejecución de comandos, lo que permite delegar tareas de código sin salir del flujo de trabajo.

El proceso fue: usar el **modo plan con Claude Opus 4.8** para pensar la arquitectura y la estructura del proyecto, leer el plan generado, ajustar lo que no convencía, y luego ejecutar los prompts de implementación con **Claude Sonnet 4.6** para generar el código real. Sonnet resultó ideal para la generación de código: más rápido y preciso en tareas concretas.

### Claude Cowork (Anthropic) — desktop

Usado para tareas de planificación, generación de documentación y apoyo en decisiones de diseño desde la interfaz de escritorio. Complementó a Claude Code para el trabajo que no requería acceso directo al codebase.

### Groq + Llama 3.3 (`llama-3.3-70b-versatile`)

Integrado como feature dentro del producto. El endpoint `/api/optimize` recibe el historial de entrenamiento del usuario, calcula métricas de volumen y balance muscular, y las envía a Llama 3.3 vía Groq con un prompt estructurado que instruye al modelo a responder en JSON con hasta 5 sugerencias de swap de ejercicios. Se eligió Groq por su API compatible con OpenAI SDK y la baja latencia de su infraestructura de inferencia.

---

## Sinergia con la IA

El flujo de trabajo fue iterativo: la IA generaba, yo probaba, detectaba problemas o cosas que no me gustaban, y volvía con un prompt más específico. El debugging fue compartido — algunos errores los resolvía yo directamente, y cuando no sabía qué estaba pasando lo debuggeaba con la IA.

**Lo que funcionó mejor:**

El **modo plan de Claude Opus 4.8** fue muy valioso al inicio. Leer el plan completo antes de empezar a generar código permitió detectar decisiones que no me convencían (estructura de carpetas, elección de librerías, complejidad innecesaria) y ajustarlas antes de que estuvieran implementadas. Corregir un plan es mucho más barato que corregir código.

La **generación de estructura** fue casi impecable. La arquitectura full-stack con Express, Prisma, React y TypeScript quedó bien armada desde el principio con poca intervención.

---

### Dónde falló o requirió corrección

**La interfaz inicial era simple e incómoda.** La primera versión de la UI funcionaba técnicamente pero tenía poco sentido desde la perspectiva del usuario — flujos confusos, componentes mal organizados. Fue necesario usarla, detectar los problemas concretos y pedir mejoras específicas para llegar a algo usable.

---

## Lecciones aprendidas

**La estructura la arma bien, casi impecable.** La IA es muy buena para scaffoldear proyectos, definir esquemas de base de datos, armar rutas y componentes con la arquitectura correcta. Esa parte requirió poca corrección.

**Hay que probar lo que construye.** El código generado compila y tiene buena estructura, pero la experiencia de uso real revela problemas que no son evidentes leyendo el código. El ciclo de construir → probar → pedir ajustes es fundamental.

**Hay que ser muy específico.** Cuanto más vago el prompt, más genérico y menos útil el resultado. Describir exactamente qué comportamiento se quiere, qué archivo tocar, qué datos maneja el componente y qué casos edge existen produce resultados usables en el primer intento. Un ejemplo real que funcionó bien:

```
Mejorá la página de sesión activa (client/src/pages/ActiveSession.tsx) de mi app de gym:
1. Timer de descanso: al registrar un set, arrancar countdown con el restSeconds del ejercicio.
   Mostrarlo como barra fija inferior (sticky) con tiempo restante grande, botones +15s / -15s / saltar.
   Vibración (navigator.vibrate) y sonido suave opcional al terminar.
   Si registrás otro set antes de que termine, se reinicia.
2. Detección de PR: si el peso registrado supera el máximo histórico de ese ejercicio
   (calcularlo en el backend al crear el log y devolver isPR en la respuesta del POST /api/items/:id/logs),
   mostrar celebración: toast destacado "¡Nuevo récord! X kg" con ícono de trofeo.
3. Mejoras de usabilidad durante el entreno:
   - Inputs de peso/reps con inputMode="decimal"/"numeric" y botones +/- de incremento rápido (peso: ±2.5, reps: ±1).
   - Pre-cargar los inputs con los valores del último set registrado en esta sesión (o del lastLog si es el primer set).
   - Duración total de la sesión visible en el header (arranca al registrar el primer set).
4. En el resumen final (showSummary) agregar: duración, volumen total (suma peso×reps), sets totales y PRs conseguidos.
Usar el design system y el sistema de toasts existentes. Verificá con npm run build.
```

Este nivel de detalle — archivo específico, comportamiento exacto, endpoints afectados, casos edge — produjo el resultado correcto en el primer intento.

---

## Pipeline de CI/CD

El repo tiene cuatro workflows en `.github/workflows/`:

**`ci.yml`** — corre en cada push y PR. Hace type-check, build y lint en paralelo para server y client. Es el gate que bloquea merges rotos.

**`cd.yml`** — corre solo en push a `main`. Ejecuta `prisma migrate deploy` contra la base de datos de producción y despliega el server a Railway y el client a Vercel de forma secuencial (primero el backend, después el frontend).

**`security.yml`** — corre todos los lunes a las 9am UTC y también en cada push a `main`. Ejecuta `npm audit --audit-level=high` en server y client en paralelo. Falla el pipeline si encuentra vulnerabilidades de severidad alta o crítica en las dependencias. Útil para detectar CVEs nuevos que aparecen después de que el proyecto está publicado, sin tener que revisarlo manualmente.

**`pr-check.yml`** — corre en cada PR hacia `main`. Tiene dos jobs:
- **Size check**: cuenta archivos y líneas cambiadas. Avisa (⚠️) si el PR supera 15 archivos o 400 líneas, y falla (❌) si supera 30 archivos u 800 líneas. El reporte queda visible en el resumen del workflow en GitHub. El objetivo es mantener los PRs enfocados y fáciles de revisar.
- **Conventional commits**: verifica que todos los commits del PR sigan el formato `tipo(scope): descripción` (feat, fix, docs, refactor, etc.). Esto mantiene el historial legible y permite generar changelogs automáticos en el futuro.

---

## Checklist de entrega

- [x] Repo público en GitHub
- [x] Pipeline de CI/CD configurado (GitHub Actions — `ci.yml` + `cd.yml` + `security.yml` + `pr-check.yml`)
- [x] Informe de herramientas (este documento)
- [x] Demo funcional: [https://reps-client.vercel.app](https://reps-client.vercel.app)
