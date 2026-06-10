export interface GoalDefaults {
  sets: number
  reps: string
  restSeconds: number
}

export const GOAL_DEFAULTS: Record<string, GoalDefaults> = {
  'Fuerza':          { sets: 5, reps: '3-6',   restSeconds: 180 },
  'Hipertrofia':     { sets: 4, reps: '8-12',  restSeconds: 90  },
  'Resistencia':     { sets: 3, reps: '15-20', restSeconds: 45  },
  'Pérdida de peso': { sets: 3, reps: '12-15', restSeconds: 60  },
}

export const FALLBACK_DEFAULTS: GoalDefaults = { sets: 3, reps: '10-12', restSeconds: 90 }

export function getGoalDefaults(goal: string | null | undefined): GoalDefaults {
  return GOAL_DEFAULTS[goal ?? ''] ?? FALLBACK_DEFAULTS
}
