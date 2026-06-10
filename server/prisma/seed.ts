import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const EXERCISES = [
  // Push
  { name: 'Press de banca plano', primaryMuscle: 'Pecho', secondary: '["Hombros","Tríceps"]', chain: 'push' },
  { name: 'Press de banca inclinado', primaryMuscle: 'Pecho', secondary: '["Hombros","Tríceps"]', chain: 'push' },
  { name: 'Press de banca declinado', primaryMuscle: 'Pecho', secondary: '["Tríceps"]', chain: 'push' },
  { name: 'Press con mancuernas inclinado', primaryMuscle: 'Pecho', secondary: '["Hombros","Tríceps"]', chain: 'push' },
  { name: 'Aperturas con mancuernas', primaryMuscle: 'Pecho', secondary: '["Hombros"]', chain: 'push' },
  { name: 'Cruce de poleas', primaryMuscle: 'Pecho', secondary: '["Hombros"]', chain: 'push' },
  { name: 'Press militar con barra', primaryMuscle: 'Hombros', secondary: '["Tríceps","Trapecios"]', chain: 'push' },
  { name: 'Press Arnold', primaryMuscle: 'Hombros', secondary: '["Tríceps"]', chain: 'push' },
  { name: 'Elevaciones laterales', primaryMuscle: 'Hombros', secondary: '[]', chain: 'push' },
  { name: 'Elevaciones frontales', primaryMuscle: 'Hombros', secondary: '["Pecho"]', chain: 'push' },
  { name: 'Extensión de tríceps en polea', primaryMuscle: 'Tríceps', secondary: '[]', chain: 'push' },
  { name: 'Extensión de tríceps sobre la cabeza', primaryMuscle: 'Tríceps', secondary: '[]', chain: 'push' },
  { name: 'Press de banca agarre cerrado', primaryMuscle: 'Tríceps', secondary: '["Pecho","Hombros"]', chain: 'push' },
  { name: 'Fondos en paralelas', primaryMuscle: 'Tríceps', secondary: '["Pecho","Hombros"]', chain: 'push' },
  { name: 'Flexiones diamante', primaryMuscle: 'Tríceps', secondary: '["Pecho"]', chain: 'push' },
  // Pull
  { name: 'Peso muerto', primaryMuscle: 'Espalda baja', secondary: '["Glúteos","Isquios","Trapecios"]', chain: 'pull' },
  { name: 'Dominadas', primaryMuscle: 'Dorsal', secondary: '["Bíceps"]', chain: 'pull' },
  { name: 'Jalón al pecho', primaryMuscle: 'Dorsal', secondary: '["Bíceps"]', chain: 'pull' },
  { name: 'Remo con barra', primaryMuscle: 'Espalda', secondary: '["Bíceps","Romboides"]', chain: 'pull' },
  { name: 'Remo con mancuerna', primaryMuscle: 'Espalda', secondary: '["Bíceps"]', chain: 'pull' },
  { name: 'Remo en polea baja', primaryMuscle: 'Espalda', secondary: '["Bíceps","Romboides"]', chain: 'pull' },
  { name: 'Face pull', primaryMuscle: 'Trapecios', secondary: '["Hombros","Romboides"]', chain: 'pull' },
  { name: 'Curl de bíceps con barra', primaryMuscle: 'Bíceps', secondary: '["Antebrazos"]', chain: 'pull' },
  { name: 'Curl martillo', primaryMuscle: 'Bíceps', secondary: '["Antebrazos"]', chain: 'pull' },
  { name: 'Curl predicador', primaryMuscle: 'Bíceps', secondary: '[]', chain: 'pull' },
  { name: 'Curl inclinado con mancuernas', primaryMuscle: 'Bíceps', secondary: '[]', chain: 'pull' },
  // Legs
  { name: 'Sentadilla con barra', primaryMuscle: 'Cuádriceps', secondary: '["Glúteos","Isquios"]', chain: 'legs' },
  { name: 'Sentadilla frontal', primaryMuscle: 'Cuádriceps', secondary: '["Glúteos"]', chain: 'legs' },
  { name: 'Prensa de piernas', primaryMuscle: 'Cuádriceps', secondary: '["Glúteos","Isquios"]', chain: 'legs' },
  { name: 'Lunges con mancuernas', primaryMuscle: 'Cuádriceps', secondary: '["Glúteos","Isquios"]', chain: 'legs' },
  { name: 'Sentadilla búlgara', primaryMuscle: 'Cuádriceps', secondary: '["Glúteos"]', chain: 'legs' },
  { name: 'Extensión de piernas', primaryMuscle: 'Cuádriceps', secondary: '[]', chain: 'legs' },
  { name: 'Peso muerto rumano', primaryMuscle: 'Isquios', secondary: '["Glúteos","Espalda baja"]', chain: 'legs' },
  { name: 'Curl femoral tumbado', primaryMuscle: 'Isquios', secondary: '[]', chain: 'legs' },
  { name: 'Hip thrust con barra', primaryMuscle: 'Glúteos', secondary: '["Isquios"]', chain: 'legs' },
  { name: 'Patada de glúteo en polea', primaryMuscle: 'Glúteos', secondary: '[]', chain: 'legs' },
  { name: 'Elevación de talones de pie', primaryMuscle: 'Gemelos', secondary: '["Sóleos"]', chain: 'legs' },
  { name: 'Elevación de talones sentado', primaryMuscle: 'Sóleos', secondary: '["Gemelos"]', chain: 'legs' },
  // Core
  { name: 'Plancha', primaryMuscle: 'Abdominales', secondary: '["Oblicuos","Espalda baja"]', chain: 'core' },
  { name: 'Crunch abdominal', primaryMuscle: 'Abdominales', secondary: '["Oblicuos"]', chain: 'core' },
  { name: 'Russian twist', primaryMuscle: 'Oblicuos', secondary: '["Abdominales"]', chain: 'core' },
  { name: 'Elevación de piernas colgado', primaryMuscle: 'Abdominales', secondary: '["Flexores de cadera"]', chain: 'core' },
]

const ROUTINE = {
  name: 'Push Pull Piernas (4 días)',
  days: [
    {
      dayNumber: 1,
      label: 'Push — Pecho · Hombros · Tríceps',
      items: [
        { exercise: 'Press de banca plano', sets: 4, reps: '8-12', restSeconds: 120 },
        { exercise: 'Press con mancuernas inclinado', sets: 3, reps: '10-12', restSeconds: 90 },
        { exercise: 'Press militar con barra', sets: 4, reps: '8-12', restSeconds: 120 },
        { exercise: 'Elevaciones laterales', sets: 3, reps: '15', restSeconds: 60 },
        { exercise: 'Extensión de tríceps en polea', sets: 3, reps: '12-15', restSeconds: 60 },
        { exercise: 'Fondos en paralelas', sets: 3, reps: '10-15', restSeconds: 90 },
      ],
    },
    {
      dayNumber: 2,
      label: 'Pull — Espalda · Bíceps',
      items: [
        { exercise: 'Peso muerto', sets: 4, reps: '5-8', restSeconds: 180 },
        { exercise: 'Jalón al pecho', sets: 4, reps: '8-12', restSeconds: 90 },
        { exercise: 'Remo con barra', sets: 4, reps: '8-12', restSeconds: 120 },
        { exercise: 'Remo en polea baja', sets: 3, reps: '10-12', restSeconds: 90 },
        { exercise: 'Curl de bíceps con barra', sets: 3, reps: '10-12', restSeconds: 60 },
        { exercise: 'Curl martillo', sets: 3, reps: '12-15', restSeconds: 60 },
      ],
    },
    {
      dayNumber: 3,
      label: 'Piernas A — Cuádriceps',
      items: [
        { exercise: 'Sentadilla con barra', sets: 4, reps: '6-10', restSeconds: 180 },
        { exercise: 'Prensa de piernas', sets: 3, reps: '10-15', restSeconds: 120 },
        { exercise: 'Sentadilla búlgara', sets: 3, reps: '10-12', restSeconds: 90 },
        { exercise: 'Extensión de piernas', sets: 3, reps: '12-15', restSeconds: 60 },
        { exercise: 'Elevación de talones de pie', sets: 4, reps: '15-20', restSeconds: 60 },
      ],
    },
    {
      dayNumber: 4,
      label: 'Piernas B — Isquios · Glúteos',
      items: [
        { exercise: 'Peso muerto rumano', sets: 4, reps: '8-12', restSeconds: 120 },
        { exercise: 'Hip thrust con barra', sets: 4, reps: '10-15', restSeconds: 90 },
        { exercise: 'Curl femoral tumbado', sets: 3, reps: '12-15', restSeconds: 90 },
        { exercise: 'Lunges con mancuernas', sets: 3, reps: '10-12', restSeconds: 90 },
        { exercise: 'Elevación de talones sentado', sets: 3, reps: '15-20', restSeconds: 60 },
      ],
    },
  ],
}

async function main() {
  console.log('Seeding exercises...')
  const exerciseMap = new Map<string, string>()

  for (const ex of EXERCISES) {
    const record = await prisma.exercise.upsert({
      where: { name: ex.name },
      update: { primaryMuscle: ex.primaryMuscle, secondary: ex.secondary, chain: ex.chain },
      create: ex,
    })
    exerciseMap.set(record.name, record.id)
  }
  console.log(`  ${EXERCISES.length} exercises seeded.`)

  console.log('Seeding demo user...')
  const password = await bcrypt.hash('demo1234', 10)
  const user = await prisma.user.upsert({
    where: { email: 'demo@fitai.app' },
    update: {
      onboardingDone: true,
      daysPerWeek: 4,
      goal: 'Hipertrofia',
      priorities: '["Pecho","Espalda","Piernas"]',
    },
    create: {
      name: 'Emanuel',
      email: 'demo@fitai.app',
      password,
      onboardingDone: true,
      daysPerWeek: 4,
      goal: 'Hipertrofia',
      priorities: '["Pecho","Espalda","Piernas"]',
    },
  })
  console.log(`  User: ${user.email}`)

  const existing = await prisma.routine.findFirst({
    where: { userId: user.id, name: ROUTINE.name },
  })
  if (existing) {
    console.log('  Routine already exists, skipping.')
    return
  }

  console.log('Seeding routine...')
  await prisma.routine.create({
    data: {
      name: ROUTINE.name,
      userId: user.id,
      days: {
        create: ROUTINE.days.map((day) => ({
          dayNumber: day.dayNumber,
          label: day.label,
          items: {
            create: day.items.map((item, idx) => ({
              exerciseId: exerciseMap.get(item.exercise)!,
              sets: item.sets,
              reps: item.reps,
              restSeconds: item.restSeconds,
              order: idx + 1,
            })),
          },
        })),
      },
    },
  })
  console.log('  Routine created.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
