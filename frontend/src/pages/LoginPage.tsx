import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, LogIn } from 'lucide-react';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Button } from '../components/ui/Button';
import { useToast } from '../context/ToastContext';
import { useUser } from '../context/UserContext';
import {
  ApiError,
  DEMO_USER_PASSWORD,
  musicShareService,
} from '../services/index';
import type { UserRole } from '../types/models';
import { extractZodFieldErrors, loginFormSchema } from '../utils/validators';

const DEMO_ACCOUNTS: Array<{
  role: UserRole;
  label: string;
  fallbackEmail: string;
}> = [
  { role: 'musician', label: 'Músico', fallbackEmail: 'mateo.rios@musicshare.org' },
  { role: 'owner', label: 'Propietario', fallbackEmail: 'clara.mendoza@musicshare.org' },
  { role: 'admin', label: 'Academia', fallbackEmail: 'admin@musicshare.org' },
];

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const { users, login } = useUser();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const redirectTo =
    (location.state as { from?: string } | null)?.from || '/';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = loginFormSchema.safeParse({ email, password });
    if (!parsed.success) {
      setFieldErrors(extractZodFieldErrors(parsed.error));
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    try {
      const user = await login(parsed.data);
      showToast(`Bienvenido, ${user.name}.`, 'success');
      navigate(redirectTo, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError('No pudimos iniciar sesión. Intenta nuevamente.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  function fillDemoAccount(role: UserRole, fallbackEmail: string) {
    const match = users.find((u) => u.role === role);
    setEmail(match?.email ?? fallbackEmail);
    setPassword(DEMO_USER_PASSWORD);
    setFieldErrors({});
    setFormError(null);
  }

  return (
    <AuthLayout
      title="Iniciar sesión"
      subtitle="Accede a tu cuenta para explorar instrumentos o gestionar tus préstamos activos."
    >
      <form
        noValidate
        onSubmit={(e) => void handleSubmit(e)}
        className="flex flex-col gap-5"
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
            htmlFor="login-email"
            className="font-sans text-sm font-semibold text-dark-cocoa"
          >
            Correo electrónico
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="tu@correo.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) {
                setFieldErrors((prev) => ({ ...prev, email: '' }));
              }
            }}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
            className={`input-editorial text-sm ${
              fieldErrors.email ? 'border-danger' : ''
            }`}
          />
          {fieldErrors.email ? (
            <p id="login-email-error" className="font-sans text-xs font-medium text-danger-ink">
              {fieldErrors.email}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="login-password"
            className="font-sans text-sm font-semibold text-dark-cocoa"
          >
            Contraseña
          </label>
          <div className="relative">
            <input
              id="login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) {
                  setFieldErrors((prev) => ({ ...prev, password: '' }));
                }
              }}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={
                fieldErrors.password ? 'login-password-error' : undefined
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
            <p id="login-password-error" className="font-sans text-xs font-medium text-danger-ink">
              {fieldErrors.password}
            </p>
          ) : null}
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={submitting}
          leftIcon={<LogIn className="h-4 w-4" />}
          className="mt-1 w-full"
        >
          Iniciar sesión
        </Button>

        <p className="text-center font-sans text-sm text-ink-muted">
          ¿No tienes cuenta?{' '}
          <Link
            to="/register"
            className="font-semibold text-pool-blue-deep hover:underline"
          >
            Crear cuenta
          </Link>
        </p>

        {musicShareService.mode === 'mock' ? (
          <div className="mt-2 border-t border-dark-cocoa/12 pt-5">
            <p className="mb-3 font-sans text-xs font-semibold text-ink-muted">
              Cuentas de prueba
            </p>
            <div className="grid grid-cols-3 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => fillDemoAccount(acc.role, acc.fallbackEmail)}
                  className="min-h-[40px] rounded-[var(--radius-control)] border border-dark-cocoa/18 bg-surface px-3 py-2 font-sans text-xs font-semibold text-dark-cocoa transition-colors hover:bg-pool-blue/40 cursor-pointer"
                >
                  {acc.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </form>
    </AuthLayout>
  );
}
