import {
  AlertCircle,
  Mail,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users as UsersIcon,
} from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { Badge, type BadgeVariant } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { ListSkeleton } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';
import { useUser } from '../context/UserContext';
import { ApiError, musicShareService } from '../services/index';
import type { User, UserRole } from '../types/models';
import { formatDate, getRoleLabel, getUserInitials } from '../utils/formatters';
import { extractZodFieldErrors, userCrudSchema } from '../utils/validators';

interface UserFormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: UserRole;
  status: 'activo' | 'inactivo';
}

const EMPTY_FORM: UserFormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  role: 'musician',
  status: 'activo',
};

const ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: 'student', label: 'Estudiante' },
  { value: 'musician', label: 'Músico' },
  { value: 'owner', label: 'Propietario' },
  { value: 'admin', label: 'Administrador' },
];

function getRoleBadgeVariant(role: UserRole): BadgeVariant {
  switch (role) {
    case 'admin':
      return 'warning';
    case 'owner':
      return 'available';
    case 'student':
    case 'musician':
    default:
      return 'loaned';
  }
}

function splitNameParts(user: User): { firstName: string; lastName: string } {
  if (user.firstName && user.lastName) {
    return { firstName: user.firstName, lastName: user.lastName };
  }
  const parts = user.name.trim().split(/\s+/);
  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' ') || 'MusicShare',
  };
}

export function UsersPage() {
  const { users, currentUser, loadingUsers, refreshUsers } = useUser();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserFormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (q) {
        const hay = `${u.name} ${u.email} ${u.phone ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [users, searchQuery, roleFilter]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshUsers();
      showToast('Lista de participantes actualizada.', 'info');
    } finally {
      setRefreshing(false);
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setSubmitError(null);
    setModalOpen(true);
  };

  const openEditModal = (user: User) => {
    const { firstName, lastName } = splitNameParts(user);
    setEditingUser(user);
    setForm({
      firstName,
      lastName,
      email: user.email,
      phone: user.phone ?? '',
      role: user.role,
      status: user.status ?? 'activo',
    });
    setFieldErrors({});
    setSubmitError(null);
    setModalOpen(true);
  };

  const clearFieldError = (field: keyof UserFormState) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError(null);

    const parsed = userCrudSchema.safeParse(form);
    if (!parsed.success) {
      setFieldErrors(extractZodFieldErrors(parsed.error));
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    try {
      if (editingUser) {
        const updated = await musicShareService.updateUser(editingUser.id, {
          firstName: parsed.data.firstName,
          lastName: parsed.data.lastName,
          email: parsed.data.email,
          phone: parsed.data.phone || undefined,
          role: parsed.data.role,
          status: parsed.data.status,
        });
        await refreshUsers();
        showToast(`Participante "${updated.name}" actualizado.`, 'success');
      } else {
        const created = await musicShareService.createUser({
          firstName: parsed.data.firstName,
          lastName: parsed.data.lastName,
          email: parsed.data.email,
          phone: parsed.data.phone || undefined,
          role: parsed.data.role,
          status: parsed.data.status,
        });
        await refreshUsers();
        showToast(`Participante "${created.name}" registrado.`, 'success');
      }
      setModalOpen(false);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'No se pudo guardar el usuario. Intenta nuevamente.';
      setSubmitError(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await musicShareService.deleteUser(userToDelete.id);
      await refreshUsers();
      showToast(`"${userToDelete.name}" fue eliminado.`, 'success');
      setUserToDelete(null);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'No se pudo eliminar el participante.';
      setDeleteError(msg);
      showToast(msg, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <section className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-8 sm:py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <h1 className="font-serif text-3xl font-medium tracking-tight text-dark-cocoa sm:text-4xl">
            Participantes y notificaciones
          </h1>
          <p className="max-w-[65ch] text-base text-ink-muted">
            Administra los músicos, estudiantes, propietarios y correos electrónicos usados para notificaciones de préstamos, vencimientos y mantenimiento.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            type="button"
            variant="secondary"
            loading={refreshing}
            leftIcon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
            onClick={() => void handleRefresh()}
          >
            Actualizar
          </Button>
          <Button
            type="button"
            variant="primary"
            leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
            onClick={openCreateModal}
          >
            Nuevo participante
          </Button>
        </div>
      </header>

      <div className="card-editorial flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-md">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-ink-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, correo o teléfono..."
            aria-label="Buscar participantes"
            className="input-editorial pl-11 text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setRoleFilter('all')}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
              roleFilter === 'all'
                ? 'border-dark-cocoa/30 bg-pool-blue text-dark-cocoa'
                : 'border-dark-cocoa/15 bg-surface text-ink-muted hover:bg-surface-muted'
            }`}
          >
            Todos ({users.length})
          </button>
          {ROLE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setRoleFilter(opt.value)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                roleFilter === opt.value
                  ? 'border-dark-cocoa/30 bg-pool-blue text-dark-cocoa'
                  : 'border-dark-cocoa/15 bg-surface text-ink-muted hover:bg-surface-muted'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loadingUsers ? (
        <ListSkeleton count={3} />
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          icon={<UsersIcon className="h-7 w-7" aria-hidden="true" />}
          title="No hay participantes para mostrar"
          description={
            users.length === 0
              ? 'Crea el primer usuario o verifica que el backend en Floci esté encendido.'
              : 'Prueba ajustando el texto de búsqueda o el filtro de rol.'
          }
          action={
            <Button type="button" variant="primary" onClick={openCreateModal}>
              Registrar participante
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((user) => {
            const isSelf = currentUser?.id === user.id;
            const canEdit = isAdmin || isSelf;
            const canDelete = isAdmin && !isSelf && users.length > 1;
            const isInactive = user.status === 'inactivo';

            return (
              <article
                key={user.id}
                className="card-editorial flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
              >
                <div className="flex min-w-0 items-start gap-4">
                  <span
                    aria-hidden="true"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pool-blue font-sans text-sm font-bold text-dark-cocoa shadow-cocoa-sm"
                  >
                    {getUserInitials(user.name)}
                  </span>

                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-serif text-lg font-semibold text-dark-cocoa">
                        {user.name}
                      </h2>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {getRoleLabel(user.role)}
                      </Badge>
                      <Badge variant={isInactive ? 'neutral' : 'available'}>
                        {isInactive ? 'Inactivo' : 'Activo'}
                      </Badge>
                      {isSelf ? (
                        <span className="rounded-full bg-solar-yellow px-2.5 py-0.5 text-[11px] font-bold text-dark-cocoa">
                          Sesión actual
                        </span>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted">
                      <span className="inline-flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-pool-blue-deep" aria-hidden="true" />
                        <span>{user.email}</span>
                      </span>
                      {user.phone ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-pool-blue-deep" aria-hidden="true" />
                          <span>{user.phone}</span>
                        </span>
                      ) : null}
                      <span className="text-xs tabular-data">
                        Registrado el {formatDate(user.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {(canEdit || canDelete) ? (
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {canEdit ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        leftIcon={<Pencil className="h-3.5 w-3.5" aria-hidden="true" />}
                        onClick={() => openEditModal(user)}
                      >
                        Editar
                      </Button>
                    ) : null}
                    {canDelete ? (
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        leftIcon={<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
                        onClick={() => {
                          setDeleteError(null);
                          setUserToDelete(user);
                        }}
                      >
                        Eliminar
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      {/* Modal Crear / Editar Usuario */}
      <Modal
        open={modalOpen}
        onClose={() => !submitting && setModalOpen(false)}
        title={editingUser ? 'Editar participante' : 'Registrar participante'}
        description="Gestiona los datos de contacto y rol para préstamos y alertas SNS."
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {submitError ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger-soft/70 px-3.5 py-2.5 text-sm font-medium text-danger-ink"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{submitError}</span>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="user-first-name"
                className="mb-1.5 block text-sm font-semibold text-dark-cocoa"
              >
                Nombre
              </label>
              <input
                id="user-first-name"
                type="text"
                value={form.firstName}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, firstName: e.target.value }));
                  clearFieldError('firstName');
                }}
                disabled={submitting}
                placeholder="Ej. Laura"
                className={`input-editorial text-sm ${fieldErrors.firstName ? 'border-danger' : ''}`}
              />
              {fieldErrors.firstName ? (
                <p className="mt-1 text-xs font-medium text-danger-ink">{fieldErrors.firstName}</p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="user-last-name"
                className="mb-1.5 block text-sm font-semibold text-dark-cocoa"
              >
                Apellido
              </label>
              <input
                id="user-last-name"
                type="text"
                value={form.lastName}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, lastName: e.target.value }));
                  clearFieldError('lastName');
                }}
                disabled={submitting}
                placeholder="Ej. Martínez"
                className={`input-editorial text-sm ${fieldErrors.lastName ? 'border-danger' : ''}`}
              />
              {fieldErrors.lastName ? (
                <p className="mt-1 text-xs font-medium text-danger-ink">{fieldErrors.lastName}</p>
              ) : null}
            </div>
          </div>

          <div>
            <label
              htmlFor="user-email"
              className="mb-1.5 block text-sm font-semibold text-dark-cocoa"
            >
              Correo de notificaciones
            </label>
            <input
              id="user-email"
              type="email"
              value={form.email}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, email: e.target.value }));
                clearFieldError('email');
              }}
              disabled={submitting}
              placeholder="nombre@correo.com"
              className={`input-editorial text-sm ${fieldErrors.email ? 'border-danger' : ''}`}
            />
            {fieldErrors.email ? (
              <p className="mt-1 text-xs font-medium text-danger-ink">{fieldErrors.email}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="user-phone"
                className="mb-1.5 block text-sm font-semibold text-dark-cocoa"
              >
                Teléfono <span className="font-normal text-ink-muted">(opcional)</span>
              </label>
              <input
                id="user-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, phone: e.target.value }));
                  clearFieldError('phone');
                }}
                disabled={submitting}
                placeholder="+573001234567"
                className={`input-editorial text-sm ${fieldErrors.phone ? 'border-danger' : ''}`}
              />
              {fieldErrors.phone ? (
                <p className="mt-1 text-xs font-medium text-danger-ink">{fieldErrors.phone}</p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="user-role"
                className="mb-1.5 block text-sm font-semibold text-dark-cocoa"
              >
                Rol
              </label>
              <select
                id="user-role"
                value={form.role}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, role: e.target.value as UserRole }));
                  clearFieldError('role');
                }}
                disabled={submitting}
                className="input-editorial text-sm"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {editingUser ? (
            <div>
              <label
                htmlFor="user-status"
                className="mb-1.5 block text-sm font-semibold text-dark-cocoa"
              >
                Estado
              </label>
              <select
                id="user-status"
                value={form.status}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    status: e.target.value as 'activo' | 'inactivo',
                  }))
                }
                disabled={submitting}
                className="input-editorial text-sm"
              >
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-dark-cocoa/10 pt-4">
            <Button
              type="button"
              variant="secondary"
              disabled={submitting}
              onClick={() => setModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              {editingUser ? 'Guardar cambios' : 'Crear participante'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Confirmación de Eliminación */}
      <Modal
        open={Boolean(userToDelete)}
        onClose={() => !deleting && setUserToDelete(null)}
        title="Eliminar participante"
        description="Esta acción eliminará el registro del usuario en DynamoDB."
        maxWidthClass="max-w-md"
      >
        {userToDelete ? (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-ink-muted">
              ¿Seguro que deseas eliminar a{' '}
              <strong className="text-dark-cocoa">{userToDelete.name}</strong> ({userToDelete.email})?
              Si tiene préstamos activos o instrumentos prestados, el sistema impedirá eliminarlo.
            </p>

            {deleteError ? (
              <div
                role="alert"
                className="rounded-lg border border-danger/30 bg-danger-soft/70 px-3.5 py-2.5 text-sm font-medium text-danger-ink"
              >
                {deleteError}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-dark-cocoa/10 pt-4">
              <Button
                type="button"
                variant="secondary"
                disabled={deleting}
                onClick={() => setUserToDelete(null)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="danger"
                loading={deleting}
                onClick={() => void handleConfirmDelete()}
              >
                Confirmar eliminación
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
