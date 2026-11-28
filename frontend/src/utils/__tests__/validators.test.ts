import { describe, expect, it } from 'vitest';
import {
  extractZodFieldErrors,
  instrumentFormSchema,
  loanRequestSchema,
  loginFormSchema,
  registerFormSchema,
  returnLoanSchema,
} from '../validators';

describe('Zod form validators', () => {
  it('validates instrumentFormSchema correctly', () => {
    const valid = instrumentFormSchema.safeParse({
      name: 'Guitarra Clásica',
      category: 'cuerdas',
      brand: 'Alhambra 1C',
      condition: 'excelente',
      location: 'Sala Norte',
      description: 'Tapa de cedro macizo con estuche rígido incluido.',
      imageUrl: './images/guitarra-acustica.jpg',
    });
    expect(valid.success).toBe(true);

    const invalid = instrumentFormSchema.safeParse({
      name: 'AB',
      category: 'cuerdas',
      condition: 'excelente',
      description: 'Corta',
      imageUrl: 'not-a-valid-url',
    });
    expect(invalid.success).toBe(false);
    if (!invalid.success) {
      const errors = extractZodFieldErrors(invalid.error);
      expect(errors.name).toBeTruthy();
      expect(errors.description).toBeTruthy();
      expect(errors.imageUrl).toBeTruthy();
    }
  });

  it('enforces dueDate >= startDate in loanRequestSchema', () => {
    const valid = loanRequestSchema.safeParse({
      instrumentId: 'inst-1',
      startDate: '2026-11-20',
      dueDate: '2026-11-27',
    });
    expect(valid.success).toBe(true);

    const invalid = loanRequestSchema.safeParse({
      instrumentId: 'inst-1',
      startDate: '2026-11-20',
      dueDate: '2026-11-18',
    });
    expect(invalid.success).toBe(false);
    if (!invalid.success) {
      const errors = extractZodFieldErrors(invalid.error);
      expect(errors.dueDate).toMatch(/posterior/i);
    }
  });

  it('requires damageNotes when returnLoanSchema status is dañado', () => {
    const goodReturn = returnLoanSchema.safeParse({
      status: 'devuelto',
    });
    expect(goodReturn.success).toBe(true);

    const missingNotes = returnLoanSchema.safeParse({
      status: 'dañado',
      damageNotes: 'Corto',
    });
    expect(missingNotes.success).toBe(false);
    if (!missingNotes.success) {
      const errors = extractZodFieldErrors(missingNotes.error);
      expect(errors.damageNotes).toBeTruthy();
    }

    const validDamage = returnLoanSchema.safeParse({
      status: 'dañado',
      damageNotes: 'Puente despegado levemente tras el concierto.',
    });
    expect(validDamage.success).toBe(true);
  });

  it('validates loginFormSchema correctly', () => {
    const valid = loginFormSchema.safeParse({
      email: 'mateo.rios@musicshare.org',
      password: 'music123',
    });
    expect(valid.success).toBe(true);

    const invalid = loginFormSchema.safeParse({
      email: 'correo-invalido',
      password: '123',
    });
    expect(invalid.success).toBe(false);
    if (!invalid.success) {
      const errors = extractZodFieldErrors(invalid.error);
      expect(errors.email).toBeTruthy();
      expect(errors.password).toBeTruthy();
    }
  });

  it('validates registerFormSchema and matching confirmPassword', () => {
    const valid = registerFormSchema.safeParse({
      name: 'Lucía Vargas',
      email: 'lucia@musicshare.org',
      role: 'musician',
      phone: '+57 300 123 4567',
      password: 'password123',
      confirmPassword: 'password123',
    });
    expect(valid.success).toBe(true);

    const mismatch = registerFormSchema.safeParse({
      name: 'L',
      email: 'bad-email',
      role: 'owner',
      password: 'password123',
      confirmPassword: 'different456',
    });
    expect(mismatch.success).toBe(false);
    if (!mismatch.success) {
      const errors = extractZodFieldErrors(mismatch.error);
      expect(errors.name).toBeTruthy();
      expect(errors.email).toBeTruthy();
      expect(errors.confirmPassword).toMatch(/coinciden/i);
    }
  });
});
