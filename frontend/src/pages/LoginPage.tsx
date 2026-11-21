import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, Info, LogIn, UserCheck } from 'lucide-react';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Button } from '../components/ui/Button';
import { useToast } from '../context/ToastContext';
import { useUser } from '../context/UserContext';
import {
  ApiError,
  DEMO_USER_PASSWORD,
} from '../services/index';
import type { User } from '../types/models';
import { getRoleLabel, getUserInitials } from '../utils/formatters';
import { extractZodFieldErrors, loginFormSchema } from '../utils/validators';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const { users, login } = useUser();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(DEMO_USER_PASSWORD);
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

  async function quickLoginWithUser(targetUser: User) {
    setEmail(targetUser.email);
    setPassword(DEMO_USER_PASSWORD);
    setFieldErrors({});
    setFormError(null);
    setSubmitting(true);
    try {
      const user = await login({
        email: targetUser.email,
        password: DEMO_USER_PASSWORD,
      });
      showToast(`Bienvenido, ${user.name}.`, 'success');
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar sesión';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
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
        {/* Banner explicativo del MVP y autenticación por headers */}
        <div className="flex items-start gap-2.5 rounded-[var(--radius-control)] border border-pool-blue-deep/20 bg-pool-blue/20 p-3.5 text-xs text-dark-cocoa">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-pool-blue-deep" aria-hidden="true" />
          <div className="leading-relaxed">
            <span className="font-semibold">Autenticación Serverless (MVP):</span> La plataforma opera mediante <em>headers simulados</em> (<code className="font-mono text-[11px] bg-canvas/60 px-1 py-0.5 rounded">X-User-Id</code> y <code className="font-mono text-[11px] bg-canvas/60 px-1 py-0.5 rounded">X-User-Role</code>). En DynamoDB no se almacenan contraseñas; puedes usar cualquier contraseña (ej. <code className="font-mono">password123</code>) o hacer clic directo sobre cualquiera de los usuarios de la lista inferior.
          </div>
        </div>

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
              placeholder="Cualquier contraseña (ej. password123)"
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

        {/* Sección de Selección Directa de Usuarios (DynamoDB / Seed) */}
        <div className="mt-2 border-t border-dark-cocoa/12 pt-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-sans text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Usuarios disponibles en el sistema ({users.length})
            </p>
            <span className="text-[11px] text-ink-muted/80">Acceso con 1 clic</span>
          </div>

          <div className="flex flex-col gap-2">
            {users.map((u) => {
              const initials = getUserInitials(u.name);
              const isSelected = email.toLowerCase() === u.email.toLowerCase();

              return (
                <button
                  key={u.id}
                  type="button"
                  disabled={submitting}
                  onClick={() => void quickLoginWithUser(u)}
                  className={`flex items-center justify-between rounded-[var(--radius-control)] border p-2.5 text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-pool-blue-deep bg-pool-blue/20 ring-2 ring-pool-blue-deep/30'
                      : 'border-dark-cocoa/12 bg-surface hover:border-dark-cocoa/30 hover:bg-surface-muted'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      aria-hidden="true"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pool-blue font-sans text-xs font-bold text-dark-cocoa shadow-cocoa-sm"
                    >
                      {initials}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-sans text-xs font-semibold text-dark-cocoa">
                        {u.name}
                      </p>
                      <p className="truncate font-mono text-[11px] text-ink-muted">
                        {u.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="rounded-full bg-dark-cocoa/8 px-2 py-0.5 font-sans text-[10px] font-semibold text-dark-cocoa">
                      {getRoleLabel(u.role)}
                    </span>
                    <UserCheck className="h-4 w-4 text-pool-blue-deep opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </form>
    </AuthLayout>
  );
}
