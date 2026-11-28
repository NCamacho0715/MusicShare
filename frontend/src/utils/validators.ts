import { z } from 'zod';
import {
  INSTRUMENT_CATEGORIES,
  INSTRUMENT_CONDITIONS,
} from '../types/models';

export const instrumentFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(80, 'El nombre no puede superar 80 caracteres'),
  category: z.enum(INSTRUMENT_CATEGORIES, {
    errorMap: () => ({ message: 'Selecciona una categoría válida' }),
  }),
  brand: z
    .string()
    .trim()
    .max(60, 'La marca no puede superar 60 caracteres')
    .optional()
    .or(z.literal('')),
  model: z
    .string()
    .trim()
    .max(60, 'El modelo no puede superar 60 caracteres')
    .optional()
    .or(z.literal('')),
  condition: z.enum(INSTRUMENT_CONDITIONS, {
    errorMap: () => ({ message: 'Selecciona el estado de conservación' }),
  }),
  location: z
    .string()
    .trim()
    .max(80, 'La ubicación no puede superar 80 caracteres')
    .optional()
    .or(z.literal('')),
  description: z
    .string()
    .trim()
    .min(10, 'Describe brevemente el instrumento y su estado (mín. 10 caracteres)')
    .max(600, 'La descripción no puede superar 600 caracteres'),
  imageUrl: z
    .string()
    .trim()
    .refine(
      (value) =>
        value === '' ||
        value.startsWith('./') ||
        value.startsWith('/') ||
        value.startsWith('data:image/') ||
        value.startsWith('blob:') ||
        /^https?:\/\//i.test(value),
      'La URL o imagen seleccionada no es válida',
    )
    .optional()
    .default(''),
  imageKey: z.string().trim().optional(),
});

export type InstrumentFormValues = z.infer<typeof instrumentFormSchema>;

export const loanRequestSchema = z
  .object({
    instrumentId: z.string().trim().min(1, 'Instrumento requerido'),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Selecciona una fecha de inicio válida'),
    dueDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Selecciona una fecha de devolución válida'),
  })
  .refine((data) => data.dueDate >= data.startDate, {
    message: 'La fecha de devolución debe ser igual o posterior al inicio',
    path: ['dueDate'],
  });

export type LoanRequestValues = z.infer<typeof loanRequestSchema>;

export const returnLoanSchema = z
  .object({
    status: z.enum(['devuelto', 'dañado']),
    damageNotes: z
      .string()
      .trim()
      .max(500, 'El reporte no puede superar 500 caracteres')
      .optional(),
  })
  .refine(
    (data) =>
      data.status !== 'dañado' ||
      (typeof data.damageNotes === 'string' && data.damageNotes.trim().length >= 8),
    {
      message:
        'Describe el daño encontrado (mín. 8 caracteres) para notificar mantenimiento',
      path: ['damageNotes'],
    },
  );

export type ReturnLoanValues = z.infer<typeof returnLoanSchema>;

export const loginFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Ingresa tu correo electrónico')
    .email('Ingresa un correo electrónico válido'),
  password: z
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;

export const registerFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'El nombre debe tener al menos 2 caracteres')
      .max(80, 'El nombre no puede superar 80 caracteres'),
    email: z
      .string()
      .trim()
      .min(1, 'Ingresa tu correo electrónico')
      .email('Ingresa un correo electrónico válido'),
    role: z.enum(['student', 'musician', 'owner', 'admin'], {
      errorMap: () => ({ message: 'Selecciona un tipo de perfil válido' }),
    }),
    phone: z
      .string()
      .trim()
      .max(30, 'El teléfono no puede superar 30 caracteres')
      .optional()
      .or(z.literal('')),
    password: z
      .string()
      .min(6, 'La contraseña debe tener al menos 6 caracteres'),
    confirmPassword: z
      .string()
      .min(6, 'Confirma tu contraseña'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export type RegisterFormValues = z.infer<typeof registerFormSchema>;

export const userCrudSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, 'Ingresa el nombre')
    .max(100, 'El nombre no puede superar 100 caracteres'),
  lastName: z
    .string()
    .trim()
    .min(1, 'Ingresa el apellido')
    .max(100, 'El apellido no puede superar 100 caracteres'),
  email: z
    .string()
    .trim()
    .min(1, 'Ingresa el correo electrónico')
    .email('Ingresa un correo electrónico válido'),
  role: z.enum(['student', 'musician', 'owner', 'admin'], {
    errorMap: () => ({ message: 'Selecciona un rol válido' }),
  }),
  phone: z
    .string()
    .trim()
    .max(20, 'El teléfono no puede superar 20 caracteres')
    .optional()
    .or(z.literal('')),
  status: z.enum(['activo', 'inactivo']).default('activo'),
});

export type UserCrudValues = z.infer<typeof userCrudSchema>;

export function extractZodFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && !fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}
