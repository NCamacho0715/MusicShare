import {
  AlertCircle,
  ArrowLeft,
  MapPin,
  Music2,
  Pencil,
  Trash2,
  User as UserIcon,
} from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Badge, type BadgeVariant } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { ImageUpload } from '../components/ui/ImageUpload';
import { InstrumentImage } from '../components/ui/InstrumentImage';
import { Modal } from '../components/ui/Modal';
import { ListSkeleton, Skeleton } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';
import { useUser } from '../context/UserContext';
import { ApiError, musicShareService } from '../services/index';
import {
  INSTRUMENT_CATEGORIES,
  INSTRUMENT_CONDITIONS,
  INSTRUMENT_STATUSES,
  type Instrument,
  type InstrumentCategory,
  type InstrumentCondition,
  type InstrumentStatus,
  type UploadedImageResult,
} from '../types/models';
import {
  getCategoryLabel,
  getConditionLabel,
  getInstrumentStatusLabel,
} from '../utils/formatters';
import {
  extractZodFieldErrors,
  instrumentFormSchema,
} from '../utils/validators';

interface FormState {
  name: string;
  category: InstrumentCategory;
  brand: string;
  model: string;
  location: string;
  condition: InstrumentCondition;
  status: InstrumentStatus;
  description: string;
  imageUrl: string;
  imageKey: string;
  imageFile: File | null;
}

const INITIAL_FORM_STATE: FormState = {
  name: '',
  category: 'cuerdas',
  brand: '',
  model: '',
  location: '',
  condition: 'bueno',
  status: 'disponible',
  description: '',
  imageUrl: '',
  imageKey: '',
  imageFile: null,
};

function getStatusBadgeVariant(status: InstrumentStatus): BadgeVariant {
  switch (status) {
    case 'disponible':
      return 'available';
    case 'prestado':
      return 'loaned';
    case 'mantenimiento':
      return 'maintenance';
    case 'retirado':
    default:
      return 'neutral';
  }
}

export function InstrumentFormPage() {
  const { id } = useParams<{ id?: string }>();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const { currentUser } = useUser();
  const { showToast } = useToast();

  const [form, setForm] = useState<FormState>(INITIAL_FORM_STATE);
  const [editingInstrument, setEditingInstrument] = useState<Instrument | null>(
    null,
  );
  const [loadingInitial, setLoadingInitial] = useState(isEditMode);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [myInstruments, setMyInstruments] = useState<Instrument[]>([]);
  const [loadingMyList, setLoadingMyList] = useState(true);
  const [instrumentToDelete, setInstrumentToDelete] =
    useState<Instrument | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadOwnedInstruments = useCallback(async () => {
    if (!currentUser) {
      setMyInstruments([]);
      setLoadingMyList(false);
      return;
    }

    setLoadingMyList(true);
    try {
      const list = await musicShareService.listInstruments(
        currentUser.role === 'admin'
          ? { status: 'all' }
          : { ownerId: currentUser.id, status: 'all' },
      );
      setMyInstruments(list);
    } catch {
      setMyInstruments([]);
    } finally {
      setLoadingMyList(false);
    }
  }, [currentUser]);

  useEffect(() => {
    void loadOwnedInstruments();
  }, [loadOwnedInstruments]);

  useEffect(() => {
    if (!id) {
      setEditingInstrument(null);
      setForm(INITIAL_FORM_STATE);
      setFieldErrors({});
      setSubmitError(null);
      setLoadError(null);
      setLoadingInitial(false);
      return;
    }

    let cancelled = false;
    const fetchInstrument = async () => {
      setLoadingInitial(true);
      setLoadError(null);
      try {
        const inst = await musicShareService.getInstrument(id);
        if (cancelled) return;
        setEditingInstrument(inst);
        setForm({
          name: inst.name,
          category: inst.category,
          brand: inst.brand ?? '',
          model: inst.model ?? '',
          location: inst.location ?? '',
          condition: inst.condition,
          status: inst.status,
          description: inst.description,
          imageUrl: inst.imageUrl,
          imageKey: inst.imageKey ?? '',
          imageFile: null,
        });
        setFieldErrors({});
        setSubmitError(null);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof ApiError
            ? err.message
            : 'No pudimos cargar los datos del instrumento.';
        setLoadError(message);
      } finally {
        if (!cancelled) setLoadingInitial(false);
      }
    };

    void fetchInstrument();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const clearFieldError = (field: keyof FormState) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleImageUploaded = (result: UploadedImageResult) => {
    setForm((prev) => ({
      ...prev,
      imageUrl: result.imageUrl,
      imageKey: result.imageKey ?? '',
      imageFile: result.file ?? null,
    }));
    clearFieldError('imageUrl');
  };

  const handleImageClear = () => {
    setForm((prev) => ({ ...prev, imageUrl: '', imageKey: '', imageFile: null }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError(null);

    const parsed = instrumentFormSchema.safeParse({
      name: form.name,
      category: form.category,
      brand: form.brand,
      model: form.model,
      location: form.location,
      condition: form.condition,
      description: form.description,
      imageUrl: form.imageUrl,
      imageKey: form.imageKey || undefined,
    });

    if (!parsed.success) {
      setFieldErrors(extractZodFieldErrors(parsed.error));
      showToast('Revisa los campos marcados antes de continuar.', 'warning');
      return;
    }

    setFieldErrors({});
    setSubmitting(true);

    try {
      let saved: Instrument;
      if (isEditMode && id) {
        const clearedExistingImage = form.imageUrl.trim() === '' && !form.imageFile;
        saved = await musicShareService.updateInstrument(id, {
          name: parsed.data.name,
          category: parsed.data.category,
          brand: parsed.data.brand || undefined,
          model: parsed.data.model || undefined,
          location: parsed.data.location || undefined,
          condition: parsed.data.condition,
          status: form.status,
          description: parsed.data.description,
          imageUrl: parsed.data.imageUrl,
          imageKey: clearedExistingImage ? '' : parsed.data.imageKey || undefined,
          imageFile: form.imageFile ?? undefined,
        });
        showToast(`Cambios guardados en "${saved.name}".`, 'success');
      } else {
        saved = await musicShareService.createInstrument({
          name: parsed.data.name,
          category: parsed.data.category,
          brand: parsed.data.brand || undefined,
          model: parsed.data.model || undefined,
          location: parsed.data.location || undefined,
          condition: parsed.data.condition,
          description: parsed.data.description,
          imageUrl: parsed.data.imageUrl,
          imageKey: parsed.data.imageKey,
          imageFile: form.imageFile ?? undefined,
        });
        showToast(`"${saved.name}" ya está publicado en el catálogo.`, 'success');
      }

      await loadOwnedInstruments();
      navigate(`/instruments/${saved.id}`);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'No pudimos guardar el instrumento. Intenta nuevamente.';
      setSubmitError(message);
      showToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDeleteFromList = async () => {
    if (!instrumentToDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await musicShareService.deleteInstrument(instrumentToDelete.id);
      showToast(
        `"${instrumentToDelete.name}" fue eliminado del catálogo.`,
        'success',
      );
      const deletedId = instrumentToDelete.id;
      setInstrumentToDelete(null);
      await loadOwnedInstruments();
      if (isEditMode && id === deletedId) {
        navigate('/instruments/new');
      }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'No se pudo eliminar el instrumento.';
      setDeleteError(message);
      showToast(message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const canEditTarget =
    !isEditMode ||
    !editingInstrument ||
    (currentUser !== null &&
      (currentUser.id === editingInstrument.ownerId ||
        currentUser.role === 'admin'));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:px-8 md:py-10">
      <div className="mb-6">
        <Link
          to={isEditMode && id ? `/instruments/${id}` : '/'}
          className="inline-flex items-center gap-2 rounded-lg py-1 text-sm font-semibold text-ink-muted transition-colors hover:text-dark-cocoa"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>
            {isEditMode ? 'Volver a la ficha' : 'Volver al catálogo'}
          </span>
        </Link>

        <h1 className="mt-3 font-serif text-3xl font-medium tracking-[-0.015em] text-dark-cocoa sm:text-4xl">
          {isEditMode ? 'Editar instrumento' : 'Publicar instrumento'}
        </h1>
        <p className="mt-1.5 max-w-2xl text-pretty text-sm leading-relaxed text-ink-muted sm:text-base">
          {isEditMode
            ? 'Actualiza la fotografía, descripción o disponibilidad actual de este\u00A0instrumento.'
            : 'Comparte un instrumento con músicos y estudiantes de la comunidad indicando su estado y lugar de\u00A0entrega.'}
        </p>
      </div>

      {loadingInitial ? (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <Skeleton className="h-[520px] w-full rounded-2xl" />
          </div>
          <div className="lg:col-span-4">
            <Skeleton className="h-80 w-full rounded-2xl" />
          </div>
        </div>
      ) : loadError ? (
        <div
          role="alert"
          className="flex flex-col items-start gap-4 rounded-2xl border border-danger/30 bg-danger-soft/50 p-6 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <AlertCircle
              className="mt-0.5 h-5 w-5 shrink-0 text-danger-ink"
              aria-hidden="true"
            />
            <div>
              <h2 className="font-serif text-lg font-semibold text-danger-ink">
                No pudimos cargar el instrumento
              </h2>
              <p className="mt-0.5 text-sm text-danger-ink/90">{loadError}</p>
            </div>
          </div>
          <Link to="/" className="btn-secondary text-sm">
            Ir al catálogo
          </Link>
        </div>
      ) : !canEditTarget && editingInstrument ? (
        <EmptyState
          icon={<AlertCircle className="h-7 w-7" aria-hidden="true" />}
          title="No tienes permisos para editar esta ficha"
          description={`Este instrumento pertenece a ${editingInstrument.ownerName || 'otro usuario'}. Cambia al propietario o administrador en el selector superior si estás probando el flujo.`}
          action={
            <Link
              to={`/instruments/${editingInstrument.id}`}
              className="btn-primary text-sm"
            >
              Volver a la ficha
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
          {/* Formulario principal */}
          <form
            onSubmit={handleSubmit}
            noValidate
            className="card-editorial space-y-6 p-6 sm:p-8 lg:col-span-8"
          >
            <div>
              <label className="mb-2 block text-sm font-semibold text-dark-cocoa">
                Fotografía principal
              </label>
              <ImageUpload
                value={form.imageUrl}
                onUploaded={handleImageUploaded}
                onClear={handleImageClear}
                error={fieldErrors.imageUrl}
                disabled={submitting}
              />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label
                  htmlFor="inst-name"
                  className="mb-1.5 block text-sm font-semibold text-dark-cocoa"
                >
                  Nombre del instrumento
                </label>
                <input
                  id="inst-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, name: e.target.value }));
                    clearFieldError('name');
                  }}
                  placeholder="Ej. Guitarra Acústica Dreadnought"
                  disabled={submitting}
                  aria-invalid={Boolean(fieldErrors.name)}
                  className={`input-editorial ${
                    fieldErrors.name ? 'border-danger' : ''
                  }`}
                />
                {fieldErrors.name && (
                  <p className="mt-1.5 text-xs font-medium text-danger-ink">
                    {fieldErrors.name}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-dark-cocoa">
                  Categoría
                </span>
                <div
                  className="flex flex-wrap gap-2"
                  role="group"
                  aria-label="Categoría del instrumento"
                >
                  {INSTRUMENT_CATEGORIES.map((categoryOption) => {
                    const selected = form.category === categoryOption;
                    return (
                      <button
                        key={categoryOption}
                        type="button"
                        aria-pressed={selected}
                        disabled={submitting}
                        onClick={() => {
                          setForm((prev) => ({
                            ...prev,
                            category: categoryOption,
                          }));
                          clearFieldError('category');
                        }}
                        className={`min-h-[40px] rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
                          selected
                            ? 'border-dark-cocoa/30 bg-pool-blue text-dark-cocoa shadow-cocoa-sm'
                            : 'border-dark-cocoa/15 bg-surface text-ink-muted hover:bg-surface-muted hover:text-dark-cocoa'
                        }`}
                      >
                        {getCategoryLabel(categoryOption)}
                      </button>
                    );
                  })}
                </div>
                {fieldErrors.category && (
                  <p className="mt-1.5 text-xs font-medium text-danger-ink">
                    {fieldErrors.category}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="inst-brand"
                  className="mb-1.5 block text-sm font-semibold text-dark-cocoa"
                >
                  Marca{' '}
                  <span className="font-normal text-ink-muted">(opcional)</span>
                </label>
                <input
                  id="inst-brand"
                  type="text"
                  value={form.brand}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, brand: e.target.value }));
                    clearFieldError('brand');
                  }}
                  placeholder="Ej. Yamaha"
                  disabled={submitting}
                  aria-invalid={Boolean(fieldErrors.brand)}
                  className={`input-editorial ${
                    fieldErrors.brand ? 'border-danger' : ''
                  }`}
                />
                {fieldErrors.brand && (
                  <p className="mt-1.5 text-xs font-medium text-danger-ink">
                    {fieldErrors.brand}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="inst-model"
                  className="mb-1.5 block text-sm font-semibold text-dark-cocoa"
                >
                  Modelo{' '}
                  <span className="font-normal text-ink-muted">(opcional)</span>
                </label>
                <input
                  id="inst-model"
                  type="text"
                  value={form.model}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, model: e.target.value }));
                    clearFieldError('model');
                  }}
                  placeholder="Ej. FG800"
                  disabled={submitting}
                  aria-invalid={Boolean(fieldErrors.model)}
                  className={`input-editorial ${
                    fieldErrors.model ? 'border-danger' : ''
                  }`}
                />
                {fieldErrors.model && (
                  <p className="mt-1.5 text-xs font-medium text-danger-ink">
                    {fieldErrors.model}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="inst-location"
                  className="mb-1.5 block text-sm font-semibold text-dark-cocoa"
                >
                  Ubicación de entrega{' '}
                  <span className="font-normal text-ink-muted">(opcional)</span>
                </label>
                <input
                  id="inst-location"
                  type="text"
                  value={form.location}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, location: e.target.value }));
                    clearFieldError('location');
                  }}
                  placeholder="Ej. Sala Comunitaria Norte"
                  disabled={submitting}
                  aria-invalid={Boolean(fieldErrors.location)}
                  className={`input-editorial ${
                    fieldErrors.location ? 'border-danger' : ''
                  }`}
                />
                {fieldErrors.location && (
                  <p className="mt-1.5 text-xs font-medium text-danger-ink">
                    {fieldErrors.location}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="inst-condition"
                  className="mb-1.5 block text-sm font-semibold text-dark-cocoa"
                >
                  Estado de conservación
                </label>
                <select
                  id="inst-condition"
                  value={form.condition}
                  onChange={(e) => {
                    setForm((prev) => ({
                      ...prev,
                      condition: e.target.value as InstrumentCondition,
                    }));
                    clearFieldError('condition');
                  }}
                  disabled={submitting}
                  className="input-editorial"
                >
                  {INSTRUMENT_CONDITIONS.map((cond) => (
                    <option key={cond} value={cond}>
                      {getConditionLabel(cond)}
                    </option>
                  ))}
                </select>
                {fieldErrors.condition && (
                  <p className="mt-1.5 text-xs font-medium text-danger-ink">
                    {fieldErrors.condition}
                  </p>
                )}
              </div>

              {isEditMode && (
                <div>
                  <label
                    htmlFor="inst-status"
                    className="mb-1.5 block text-sm font-semibold text-dark-cocoa"
                  >
                    Disponibilidad en catálogo
                  </label>
                  <select
                    id="inst-status"
                    value={form.status}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        status: e.target.value as InstrumentStatus,
                      }))
                    }
                    disabled={submitting}
                    className="input-editorial"
                  >
                    {INSTRUMENT_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {getInstrumentStatusLabel(st)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="sm:col-span-2">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <label
                    htmlFor="inst-description"
                    className="text-sm font-semibold text-dark-cocoa"
                  >
                    Descripción y notas de cuidado
                  </label>
                  <span className="text-xs text-ink-muted tabular-data">
                    {form.description.trim().length} / 600
                  </span>
                </div>
                <textarea
                  id="inst-description"
                  rows={4}
                  value={form.description}
                  onChange={(e) => {
                    setForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }));
                    clearFieldError('description');
                  }}
                  placeholder="Incluye qué accesorios trae (estuche, arco, pedal, cables) y recomendaciones básicas de cuidado."
                  disabled={submitting}
                  aria-invalid={Boolean(fieldErrors.description)}
                  className={`input-editorial min-h-[120px] resize-y py-3 ${
                    fieldErrors.description ? 'border-danger' : ''
                  }`}
                />
                {fieldErrors.description && (
                  <p className="mt-1.5 text-xs font-medium text-danger-ink">
                    {fieldErrors.description}
                  </p>
                )}
              </div>
            </div>

            {submitError && (
              <div
                role="alert"
                className="rounded-lg border border-danger/30 bg-danger-soft/70 px-4 py-3 text-sm font-medium text-danger-ink"
              >
                {submitError}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-dark-cocoa/10 pt-5">
              <Button
                type="button"
                variant="secondary"
                disabled={submitting}
                onClick={() =>
                  navigate(isEditMode && id ? `/instruments/${id}` : '/')
                }
              >
                Cancelar
              </Button>
              <Button type="submit" variant="primary" loading={submitting}>
                {isEditMode ? 'Guardar cambios' : 'Publicar instrumento'}
              </Button>
            </div>
          </form>

          {/* Vista previa compacta en vivo */}
          <aside className="hidden lg:sticky lg:top-28 lg:col-span-4 lg:block">
            <p className="mb-3 text-sm font-semibold text-ink-muted">
              Vista previa en catálogo
            </p>
            <div className="card-editorial overflow-hidden">
              <InstrumentImage
                src={form.imageUrl}
                alt={form.name || 'Vista previa del instrumento'}
                category={form.category}
                aspectClass="aspect-[4/3]"
              />
              <div className="space-y-3 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="category">
                    {getCategoryLabel(form.category)}
                  </Badge>
                  <Badge
                    variant={getStatusBadgeVariant(
                      isEditMode ? form.status : 'disponible',
                    )}
                  >
                    {getInstrumentStatusLabel(
                      isEditMode ? form.status : 'disponible',
                    )}
                  </Badge>
                </div>

                <div>
                  <h2 className="font-serif text-xl font-semibold leading-snug text-dark-cocoa">
                    {form.name.trim() || 'Nombre del instrumento'}
                  </h2>
                  {(form.brand.trim() || form.model.trim()) && (
                    <p className="mt-0.5 text-sm font-medium text-ink-muted">
                      {[form.brand.trim(), form.model.trim()].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>

                <p className="line-clamp-2 text-pretty text-sm leading-relaxed text-ink-muted">
                  {form.description.trim() ||
                    'Aquí aparecerá la descripción breve y las notas de\u00A0cuidado.'}
                </p>

                <div className="space-y-1 border-t border-dark-cocoa/10 pt-3 text-xs text-ink-muted">
                  <p className="flex items-center gap-1.5">
                    <UserIcon
                      className="h-3.5 w-3.5 text-dark-cocoa/70"
                      aria-hidden="true"
                    />
                    <span>
                      {editingInstrument?.ownerName ||
                        currentUser?.name ||
                        'Propietario'}
                    </span>
                  </p>
                  {form.location.trim() && (
                    <p className="flex items-center gap-1.5">
                      <MapPin
                        className="h-3.5 w-3.5 text-dark-cocoa/70"
                        aria-hidden="true"
                      />
                      <span>{form.location.trim()}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Sección inferior: Mis instrumentos publicados */}
      <section
        aria-labelledby="my-instruments-heading"
        className="mt-14 border-t border-dark-cocoa/12 pt-10"
      >
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2
              id="my-instruments-heading"
              className="font-serif text-2xl font-medium tracking-[-0.015em] text-dark-cocoa sm:text-3xl"
            >
              {currentUser?.role === 'admin'
                ? 'Instrumentos bajo administración'
                : 'Mis instrumentos publicados'}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Gestiona directamente los instrumentos asociados a{' '}
              <strong className="text-dark-cocoa">
                {currentUser?.name ?? 'tu cuenta'}
              </strong>
              .
            </p>
          </div>
          <span className="text-sm font-semibold text-ink-muted tabular-data">
            {myInstruments.length}{' '}
            {myInstruments.length === 1 ? 'registro' : 'registros'}
          </span>
        </div>

        {loadingMyList ? (
          <ListSkeleton count={2} />
        ) : myInstruments.length === 0 ? (
          <EmptyState
            icon={<Music2 className="h-7 w-7" aria-hidden="true" />}
            title="Aún no has publicado instrumentos"
            description={
              'Usa el formulario superior para registrar tu primer instrumento en el banco\u00A0comunitario.'
            }
          />
        ) : (
          <div className="space-y-3">
            {myInstruments.map((inst) => (
              <div
                key={inst.id}
                className="card-editorial flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="h-20 w-24 shrink-0 overflow-hidden rounded-xl">
                    <InstrumentImage
                      src={inst.imageUrl}
                      alt={inst.name}
                      category={inst.category}
                      aspectClass="h-full w-full"
                    />
                  </div>
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="category">
                        {getCategoryLabel(inst.category)}
                      </Badge>
                      <Badge variant={getStatusBadgeVariant(inst.status)}>
                        {getInstrumentStatusLabel(inst.status)}
                      </Badge>
                    </div>
                    <h3 className="truncate font-serif text-lg font-semibold text-dark-cocoa">
                      <Link
                        to={`/instruments/${inst.id}`}
                        className="decoration-dark-cocoa/40 underline-offset-4 hover:underline"
                      >
                        {inst.name}
                      </Link>
                    </h3>
                    <p className="text-xs text-ink-muted">
                      Conservación: {getConditionLabel(inst.condition)}
                      {inst.location ? ` · ${inst.location}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    leftIcon={<Pencil className="h-3.5 w-3.5" aria-hidden="true" />}
                    onClick={() => {
                      navigate(`/instruments/${inst.id}/edit`);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    leftIcon={<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
                    onClick={() => {
                      setDeleteError(null);
                      setInstrumentToDelete(inst);
                    }}
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Modal
        open={Boolean(instrumentToDelete)}
        onClose={() => !deleting && setInstrumentToDelete(null)}
        title="Eliminar instrumento"
        description="Esta acción retirará el instrumento del catálogo comunitario."
        maxWidthClass="max-w-md"
      >
        {instrumentToDelete && (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-ink-muted">
              ¿Confirmas que deseas eliminar{' '}
              <strong className="text-dark-cocoa">
                {instrumentToDelete.name}
              </strong>
              ?
            </p>

            {deleteError && (
              <div
                role="alert"
                className="rounded-lg border border-danger/30 bg-danger-soft/70 px-3.5 py-2.5 text-sm font-medium text-danger-ink"
              >
                {deleteError}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-dark-cocoa/10 pt-4">
              <Button
                type="button"
                variant="secondary"
                disabled={deleting}
                onClick={() => setInstrumentToDelete(null)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="danger"
                loading={deleting}
                onClick={() => void handleConfirmDeleteFromList()}
              >
                Confirmar eliminación
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
