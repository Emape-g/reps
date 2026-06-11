# Reps — AI-Powered Workout Tracker

[![CI](https://github.com/Emape-g/reps/actions/workflows/ci.yml/badge.svg)](https://github.com/Emape-g/reps/actions/workflows/ci.yml)
[![CD](https://github.com/Emape-g/reps/actions/workflows/cd.yml/badge.svg)](https://github.com/Emape-g/reps/actions/workflows/cd.yml)
[![Deploy](https://img.shields.io/badge/demo-live-brightgreen)](https://reps-henna.vercel.app)

> Built with [Claude Code](https://claude.ai/code) · Powered by Groq + Llama 3.3

---

¿Cuántas veces anotaste tu rutina en un papel que perdiste, o usaste una app que no entendía cómo entrenás? **Reps** es un tracker de entrenamiento full-stack que no solo registra tus series — sino que las *entiende*. Gracias a Groq y Llama 3.3, analiza tu volumen semanal, el equilibrio entre cadenas musculares y la cobertura de grupos prioritarios, y te sugiere hasta 5 cambios concretos para mejorar tu rutina con un solo toque.

---

## Features

- **Creador de rutinas** — armá rutinas multi-día con reordenamiento drag-and-drop
- **Catálogo de ejercicios** — filtrable por grupo muscular y cadena (push / pull / legs)
- **Sesión activa** — logueá peso y reps set a set con referencia de la última sesión y resumen de completitud
- **Seguimiento de progreso** — gráfico de peso máximo por ejercicio a lo largo del tiempo + tabla de historial completo
- **Optimización con IA** — Llama 3.3 analiza tu rutina y te sugiere mejoras aplicables en un tap

---

## Tech Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, Recharts |
| Routing | React Router v6 |
| Drag & Drop | @dnd-kit |
| Backend | Node.js, Express, TypeScript |
| ORM | Prisma 5 |
| Base de datos | PostgreSQL (Railway) |
| Auth | JWT (jsonwebtoken) |
| IA | Groq (`groq-sdk`) · Llama 3.3 70B Versatile |
| CI/CD | GitHub Actions |
| Despliegue | Vercel (frontend) · Railway (backend + DB) |
| Construido con | [Claude Code](https://claude.ai/code) |

---

## IA utilizada en el desarrollo

Este proyecto fue construido en colaboración con herramientas de IA:

- **[Claude Code](https://claude.ai/code)** — herramienta principal de desarrollo. Se usó el modo plan con Claude Opus 4.8 para diseñar la arquitectura y luego Claude Sonnet 4.6 para la generación de código: componentes React, rutas Express, esquemas Prisma, auth JWT, CI/CD y debugging.
- **[Claude Cowork](https://claude.ai)** — planificación, documentación y decisiones de diseño desde el escritorio.
- **[Groq](https://console.groq.com)** (`llama-3.3-70b-versatile`) — integrado en el producto: analiza la rutina del usuario en tiempo real y genera sugerencias de optimización basadas en volumen y balance muscular.

Ver [INFORME.md](./INFORME.md) para la bitácora completa de la experiencia.

---

## Demo en vivo

🔗 **[https://reps-henna.vercel.app](https://reps-henna.vercel.app)**

> Credenciales de demo impresas al correr el seed (`npm run db:seed`).

---

## Setup local

### Requisitos

- Node.js 20+
- PostgreSQL corriendo localmente (o una instancia gratuita en Railway)

### 1. Clonar e instalar

```bash
git clone https://github.com/Emape-g/reps.git
cd reps

# Instalar dependencias de servidor
cd server && npm install

# Instalar dependencias de cliente
cd ../client && npm install
```

### 2. Variables de entorno

**Server** — copiá y editá:

```bash
cp server/.env.example server/.env
```

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Connection string de PostgreSQL |
| `JWT_SECRET` | String hex aleatorio de 32 bytes |
| `GROQ_API_KEY` | API key desde [Groq Console](https://console.groq.com) |
| `GROQ_MODEL` | Nombre del modelo (default: `llama-3.3-70b-versatile`) |
| `CLIENT_URL` | Origen del frontend para CORS (default: `http://localhost:5173`) |
| `PORT` | Puerto del servidor (default: `3001`) |

**Client** — copiá y editá:

```bash
cp client/.env.example client/.env
```

| Variable | Descripción |
|---|---|
| `VITE_API_URL` | Dejalo vacío en dev local (el proxy de Vite maneja `/api`) |

### 3. Migraciones y seed

```bash
cd server
npx prisma migrate deploy
npx tsx prisma/seed.ts
```

### 4. Levantar los servidores

```bash
# Desde la raíz — levanta ambos con concurrently
npm run dev

# O por separado:
# Terminal 1 — backend
cd server && npm run dev

# Terminal 2 — frontend
cd client && npm run dev
```

Abrí [http://localhost:5173](http://localhost:5173).

---

## CI/CD con GitHub Actions

El repo tiene dos workflows en `.github/workflows/`:

| Workflow | Trigger | Qué hace |
|---|---|---|
| `ci.yml` | Cualquier push / PR a main | Type-check, build y lint de client y server en paralelo |
| `cd.yml` | Push a `main` | Corre `prisma migrate deploy` + deploy a Railway (server) y Vercel (client) |

Para habilitar el CD, agregá los siguientes secrets en tu repo de GitHub:

| Secret | Descripción |
|---|---|
| `RAILWAY_TOKEN` | Token de Railway (`railway login` → Settings) |
| `RAILWAY_SERVICE_ID` | ID del servicio en Railway |
| `DATABASE_URL` | Connection string de producción (para migrations) |
| `VERCEL_TOKEN` | Token de Vercel (Settings → Tokens) |
| `VERCEL_ORG_ID` | ID de tu organización en Vercel |
| `VERCEL_PROJECT_ID` | ID del proyecto en Vercel |

> **Nota:** Si usás el deploy automático de Vercel + Railway desde GitHub (sin el workflow de CD), solo necesitás el `ci.yml`.

---

## Despliegue manual

### Backend → Railway

1. Creá un proyecto en Railway y añadí un plugin **PostgreSQL**.
2. Agregá el servicio apuntando a este repo con root directory en `server/`.
3. Railway setea `DATABASE_URL` automáticamente. Agregá `JWT_SECRET`, `GROQ_API_KEY`, `GROQ_MODEL` y `CLIENT_URL` (tu URL de Vercel) en la pestaña Variables.
4. El `railway.toml` configura los comandos de build y start automáticamente.

### Frontend → Vercel

1. Importá el repo en Vercel y seteá el **Root Directory** en `client`.
2. Agregá `VITE_API_URL` apuntando a tu backend de Railway (ej: `https://reps-production.up.railway.app`).
3. El `vercel.json` maneja los rewrites para SPA routing.

---

## Estructura del proyecto

```
reps/
├── .github/
│   └── workflows/
│       ├── ci.yml          # CI: type-check + build + lint
│       └── cd.yml          # CD: migrate + deploy a Railway y Vercel
├── client/                 # React + Vite frontend
│   ├── src/
│   │   ├── components/     # OptimizePanel, ExerciseSearchModal, ProtectedRoute
│   │   ├── context/        # AuthContext
│   │   ├── lib/            # apiFetch
│   │   └── pages/          # Home, RoutineEditor, ActiveSession, ExerciseProgress...
│   └── vercel.json
└── server/                 # Express + Prisma backend
    ├── src/
    │   ├── routes/         # routines, days, items, exercises, optimize, auth
    │   └── lib/            # schemas (Zod), prisma client
    ├── prisma/
    │   ├── schema.prisma
    │   └── migrations/
    └── railway.toml
```

---

## Informe técnico

Ver [INFORME.md](./INFORME.md) — bitácora de la experiencia: herramientas usadas, prompts que funcionaron, dónde falló la IA y lecciones aprendidas.
