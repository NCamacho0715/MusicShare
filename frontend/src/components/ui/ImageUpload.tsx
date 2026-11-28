import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { ImagePlus, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { musicShareService } from '../../services/index';
import type { UploadedImageResult } from '../../types/models';
import { Button } from './Button';

export interface ImageUploadProps {
  value?: string;
  onUploaded: (result: UploadedImageResult) => void;
  onClear?: () => void;
  error?: string;
  disabled?: boolean;
}

const ACCEPTED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export function ImageUpload({
  value,
  onUploaded,
  onClear,
  error,
  disabled = false,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const displayedError = error || localError;

  async function processFile(file: File) {
    setLocalError(null);

    if (!ACCEPTED_MIME_TYPES.has(file.type)) {
      setLocalError('Formato no soportado. Usa una imagen JPG, PNG o WebP.');
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setLocalError('La imagen supera el límite de 10 MB.');
      return;
    }

    setUploading(true);
    try {
      const result = await musicShareService.uploadInstrumentImage(file);
      onUploaded(result);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No pudimos procesar la fotografía. Intenta de nuevo.';
      setLocalError(message);
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) {
      void processFile(file);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (disabled || uploading) return;
    const file = event.dataTransfer.files?.[0];
    if (file) {
      void processFile(file);
    }
  }

  function openPicker() {
    if (disabled || uploading) return;
    inputRef.current?.click();
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={disabled || uploading}
        onChange={handleFileChange}
        className="sr-only"
        aria-label="Subir fotografía del instrumento"
      />

      {value ? (
        <div className="flex flex-col gap-3">
          <div
            className={`relative aspect-[4/3] w-full overflow-hidden rounded-[var(--radius-control)] bg-surface-muted ${
              displayedError ? 'ring-2 ring-danger' : ''
            }`}
          >
            <img
              src={value}
              alt="Vista previa del instrumento"
              className="h-full w-full object-cover"
            />
            {uploading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-dark-cocoa/45 text-canvas backdrop-blur-xs">
                <div className="flex items-center gap-2 rounded-full bg-dark-cocoa px-4 py-2 text-sm font-semibold">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Optimizando imagen...</span>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-sans text-xs font-medium text-ink-muted">
              Fotografía principal lista
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={disabled || uploading}
                onClick={openPicker}
                leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
              >
                Cambiar foto
              </Button>
              {onClear ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={disabled || uploading}
                  onClick={() => {
                    setLocalError(null);
                    onClear();
                  }}
                  leftIcon={<Trash2 className="h-3.5 w-3.5 text-danger" />}
                  className="text-danger hover:bg-danger-soft/50"
                >
                  Quitar
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={disabled || uploading ? -1 : 0}
          onClick={openPicker}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openPicker();
            }
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            if (!disabled && !uploading) setIsDragging(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled && !uploading) setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          onDrop={handleDrop}
          aria-disabled={disabled || uploading}
          className={`flex cursor-pointer flex-col items-center justify-center border-y border-dashed px-4 py-8 text-center transition-colors ${
            isDragging
              ? 'border-dark-cocoa bg-pool-blue/25'
              : displayedError
                ? 'border-danger bg-danger-soft/15'
                : 'border-dark-cocoa/25 bg-surface-muted/40 hover:bg-surface-muted/75'
          } ${disabled || uploading ? 'cursor-not-allowed opacity-60' : ''}`}
        >
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-pool-blue text-dark-cocoa">
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
            ) : (
              <ImagePlus className="h-6 w-6" aria-hidden="true" />
            )}
          </div>
          <p className="font-sans text-sm font-semibold text-dark-cocoa">
            {uploading
              ? 'Subiendo fotografía...'
              : 'Arrastra una fotografía o haz clic para seleccionarla'}
          </p>
          <p className="mt-1 font-sans text-xs text-ink-muted">
            JPG, PNG o WebP hasta 10 MB. Recomendado formato horizontal (4:3).
          </p>
        </div>
      )}

      {displayedError ? (
        <p role="alert" className="font-sans text-xs font-medium text-danger-ink">
          {displayedError}
        </p>
      ) : null}
    </div>
  );
}
