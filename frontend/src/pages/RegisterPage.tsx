import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, UserPlus } from 'lucide-react';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Button } from '../components/ui/Button';
import { useToast } from '../context/ToastContext';
import { useUser } from '../context/UserContext';
import { ApiError } from '../services/index';
import type { UserRole } from '../types/models';
import {
  extractZodFieldErrors,
  registerFormSchema,
} from '../utils/validators';

const ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: 'student', label: 'Estudiante' },
  { value: 'musician', label: 'Músico' },
  { value: 'owner', label: 'Propietario' },
  { value: 'admin', label: 'Administrador' },
];

export function RegisterPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { register } = useUser();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('musician');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = registerFormSchema.safeParse({
      name,
      email,
      role,
      phone,
      password,
      confirmPassword,
    });

    if (!parsed.success) {
      setFieldErrors(extractZodFieldErrors(parsed.error));
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    try {
      const created = await register({
        name: parsed.data.name,
        email: parsed.data.email,
        role: parsed.data.role,
        phone: parsed.data.phone || undefined,
        password: parsed.data.password,
      });
      showToast(`Cuenta creada. Bienvenido, ${created.name}.`, 'success');
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError('No pudimos crear tu cuenta. Intenta nuevamente.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  function clearError(field: string) {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: '' }));
    }
  }

  return (
    <AuthLayout
      title="Crear cuenta"
      subtitle="Únete al banco comunitario para solicitar o compartir instrumentos musicales."
    >
      <form
        noValidate
        onSubmit={(e) => void handleSubmit(e)}
        className="flex flex-col gap-4"
      >
        {formError ? (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-[var(--radius-control)] bg-danger-soft px-4 py-3 text-sm font-medium text-danger-ink"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{formError}</span>
          </div>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="register-name"
            className="font-sans text-sm font-semibold text-dark-cocoa"
          >
            Nombre completo
          </label>
          <input
            id="register-name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Ej. Lucía Fernández"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              clearError('name');
            }}
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? 'register-name-error' : undefined}
            className={`input-editorial text-sm ${
              fieldErrors.name ? 'border-danger' : ''
            }`}
          />
          {fieldErrors.name ? (
            <p id="register-name-error" className="font-sans text-xs font-medium text-danger-ink">
              {fieldErrors.name}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="register-email"
            className="font-sans text-sm font-semibold text-dark-cocoa"
          >
            Correo electrónico
          </label>
          <input
            id="register-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="tu@correo.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearError('email');
            }}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? 'register-email-error' : undefined}
            className={`input-editorial text-sm ${
              fieldErrors.email ? 'border-danger' : ''
            }`}
          />
          {fieldErrors.email ? (
            <p id="register-email-error" className="font-sans text-xs font-medium text-danger-ink">
              {fieldErrors.email}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <span
            id="register-role-label"
            className="font-sans text-sm font-semibold text-dark-cocoa"
          >
            Tipo de perfil
          </span>
          <div
            role="radiogroup"
            aria-labelledby="register-role-label"
            className="grid grid-cols-2 gap-2 sm:grid-cols-4"
          >
            {ROLE_OPTIONS.map((option) => {
              const selected = role === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => {
                    setRole(option.value);
                    clearError('role');
                  }}
                  className={`min-h-[44px] rounded-[var(--radius-control)] border px-3 py-2 font-sans text-xs font-semibold transition-colors cursor-pointer ${
                    selected
                      ? 'border-dark-cocoa bg-pool-blue text-dark-cocoa'
                      : 'border-dark-cocoa/20 bg-surface text-ink-muted hover:bg-surface-muted hover:text-dark-cocoa'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          {fieldErrors.role ? (
            <p className="font-sans text-xs font-medium text-danger-ink">
              {fieldErrors.role}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="register-phone"
            className="font-sans text-sm font-semibold text-dark-cocoa"
          >
            Teléfono <span className="font-normal text-ink-muted">(opcional)</span>
          </label>
          <input
            id="register-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+57 310 555 0100"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              clearError('phone');
            }}
            aria-invalid={Boolean(fieldErrors.phone)}
            aria-describedby={fieldErrors.phone ? 'register-phone-error' : undefined}
            className={`input-editorial text-sm ${
              fieldErrors.phone ? 'border-danger' : ''
            }`}
          />
          {fieldErrors.phone ? (
            <p id="register-phone-error" className="font-sans text-xs font-medium text-danger-ink">
              {fieldErrors.phone}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="register-password"
              className="font-sans text-sm font-semibold text-dark-cocoa"
            >
              Contraseña
            </label>
            <div className="relative">
              <input
                id="register-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Mín. 6 caracteres"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearError('password');
                }}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={
                  fieldErrors.password ? 'register-password-error' : undefined
                }
                className={`input-editorial pr-11 text-sm ${
                  fieldErrors.password ? 'border-danger' : ''
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={
                  showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                }
                className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-muted hover:text-dark-cocoa cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
            {fieldErrors.password ? (
              <p id="register-password-error" className="font-sans text-xs font-medium text-danger-ink">
                {fieldErrors.password}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="register-confirm-password"
              className="font-sans text-sm font-semibold text-dark-cocoa"
            >
              Confirmar contraseña
            </label>
            <div className="relative">
              <input
                id="register-confirm-password"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Repite tu contraseña"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  clearError('confirmPassword');
                }}
                aria-invalid={Boolean(fieldErrors.confirmPassword)}
                aria-describedby={
                  fieldErrors.confirmPassword
                    ? 'register-confirm-password-error'
                    : undefined
                }
                className={`input-editorial pr-11 text-sm ${
                  fieldErrors.confirmPassword ? 'border-danger' : ''
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={
                  showConfirmPassword
                    ? 'Ocultar confirmación de contraseña'
                    : 'Mostrar confirmación de contraseña'
                }
                className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-muted hover:text-dark-cocoa cursor-pointer"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
            {fieldErrors.confirmPassword ? (
              <p
                id="register-confirm-password-error"
                className="font-sans text-xs font-medium text-danger-ink"
              >
                {fieldErrors.confirmPassword}
              </p>
            ) : null}
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={submitting}
          leftIcon={<UserPlus className="h-4 w-4" />}
          className="mt-2 w-full"
        >
          Crear cuenta
        </Button>

        <p className="text-center font-sans text-sm text-ink-muted">
          ¿Ya tienes cuenta?{' '}
          <Link
            to="/login"
            className="font-semibold text-pool-blue-deep hover:underline"
          >
            Inicia sesión
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
