import { z } from 'zod'

export const CreateRoutineSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
})

export const UpdateRoutineSchema = z.object({
  name: z.string().min(1).max(100),
})

export const CreateDaySchema = z.object({
  dayNumber: z.number().int().min(1).max(7),
  label: z.string().min(1).max(120),
})

export const UpdateDaySchema = z.object({
  label: z.string().min(1).max(120).optional(),
  dayNumber: z.number().int().min(1).max(7).optional(),
})

export const CreateItemSchema = z.object({
  exerciseId: z.string().min(1),
  sets: z.number().int().min(1).max(20),
  reps: z.string().min(1).max(20),
  restSeconds: z.number().int().min(0).max(600),
})

export const UpdateItemSchema = z.object({
  exerciseId:  z.string().min(1).optional(),
  sets:        z.number().int().min(1).max(20).optional(),
  reps:        z.string().min(1).max(20).optional(),
  restSeconds: z.number().int().min(0).max(600).optional(),
})

export const ReorderItemsSchema = z.object({
  itemIds: z.array(z.string().min(1)).min(1),
})
