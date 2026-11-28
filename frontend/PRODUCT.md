# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React 19 + TypeScript + Vite 6 + Tailwind CSS v4 (`@tailwindcss/vite`), enrutamiento con `HashRouter` (`react-router-dom`) y rutas relativas (`base: './'`) para despliegue estático en Amazon S3 / Floci. Capa de servicios dual con adaptador Mock persistente en `localStorage` (`VITE_USE_MOCKS=true`) y cliente REST preparado para backend serverless en Python 3.12 (API Gateway, DynamoDB, S3 `imginstrumentos`, EventBridge, SQS y SNS).

## Users

1. **Músico / Estudiante (`musician`):** Busca instrumentos disponibles por categoría, consulta su estado y solicita préstamos temporales por rango de fechas, devolviéndolos a tiempo o reportando incidencias al entregar.
2. **Propietario / Custodio (`owner`):** Publica, edita y retira sus instrumentos con fotografía, descripción y condición física; monitorea el estado de préstamo y recibe alertas de mantenimiento o vencimiento.
3. **Administrador / Academia (`admin`):** Supervisa el catálogo comunitario completo, los préstamos activos/históricos y las alertas automáticas del sistema.

*Nota de autenticación MVP:* Sin login ni registro complejo; el usuario activo y su rol se alternan desde un **Mock User Switcher** en la barra de navegación, inyectando headers (`X-User-Id`, `X-User-Role`, `X-User-Name`, `X-User-Email`) en cada petición.

## Product Purpose

**MusicShare** es un banco comunitario de instrumentos musicales que conecta a propietarios y academias con músicos y estudiantes para préstamos temporales sin costo de alquiler, garantizando trazabilidad del estado de cada instrumento y alertas automáticas de devolución y mantenimiento.

## Positioning

A diferencia de los marketplaces de alquiler comercial, MusicShare elimina fianzas financieras, pasarelas de pago y fricción burocrática: el catálogo se centra en la disponibilidad real, el historial directo de préstamos (`activo`, `devuelto`, `dañado`) y el aviso automatizado por vencimiento o daño reportado.

## Operating Context

- **Superficie Persuade (solo Hero de `#/`):** El visitante comprende de inmediato el propósito comunitario del banco de instrumentos y puede saltar directo al catálogo o publicar un instrumento.
- **Superficies Operate (Catálogo, Detalle `#/instruments/:id`, Publicar/Editar `#/instruments/new` y `#/instruments/:id/edit`, Préstamos `#/loans` y Alertas `#/alerts`):** Flujos de tarea directa con escaneo rápido, formularios claros, feedback inmediato y estados completos (`loading`, `empty`, `error`, `disabled`).

## Capabilities and Constraints

**Alcance MVP incluido:**
- **Catálogo comunitario (`#/`):** Búsqueda por texto, filtro por categoría (atributo del instrumento: `cuerdas`, `viento`, `percusion`, `teclados`, `amplificacion`, `otros`) y filtro por estado (`disponible`, `prestado`, `mantenimiento`, `retirado`).
- **Detalle y solicitud (`#/instruments/:id`):** Ficha técnica esencial, estado actual, datos del propietario, modal/flujo de solicitud de préstamo con fecha de inicio y devolución prevista, y acciones de edición/retiro para el dueño o admin.
- **CRUD de instrumentos (`#/instruments/new`, `#/instruments/:id/edit`):** Alta, edición y retiro con subida de una fotografía principal (Presigned URL a S3 `imginstrumentos` o data URL comprimida en modo Mock).
- **Gestión de préstamos y devoluciones (`#/loans`):** Listado de préstamos activos e historial, indicador derivado de vencimiento cuando un préstamo `activo` supera su fecha límite, y modal de devolución con selección obligatoria entre `devuelto` (buen estado -> instrumento vuelve a `disponible`) o `dañado` + notas de daño (instrumento pasa a `mantenimiento` y dispara alerta `damage_maintenance`).
- **Panel de alertas (`#/alerts`):** Feed de notificaciones automáticas de vencimientos (`due_soon`, `overdue` estilo EventBridge + SNS) y mantenimiento por daño (`damage_maintenance` estilo SQS + SNS), marcar como leída y disparador manual de chequeo de vencimientos en modo demo.

**Exclusiones estrictas fuera del MVP (no implementar):**
- CRUD independiente de categorías o subcategorías.
- Login con OAuth/JWT, perfiles públicos con reseñas/estrellas o índice de reputación gamificado.
- Pasarelas de pago, fianzas económicas o seguros legales externos.
- Chat en tiempo real, agendas de citas presenciales, borradores autoguardados en servidor, certificados PDF de donación o galerías multifoto complejas.
- Alertas climáticas o toggles ficticios de WhatsApp/SMS con números reales.

## Brand Commitments

- **Paleta obligatoria:** Principal Pool Blue (`#B9E5EC`), Secundario Dark Cocoa (`#3D231E`), Acento / CTAs principales Solar Yellow (`#FFD33D`).
- **Hero + Navbar:** En `#/`, Hero full-bleed sobre fotografía cálida de instrumentos musicales con doble scrim en Dark Cocoa (lateral para el titular y superior sutil para la Navbar transparente fija que pasa a sólida al hacer scroll o en vistas internas).
- **Idioma:** Interfaz 100% en español natural y claro.

## Evidence on Hand

- Mockups de referencia temporal en `stitch_musicshare_instrument_lending_platform/` (solo guía visual depurada; excluidos del build final).
- Assets locales previstos en `public/images/` (`hero-studio.png` y 6 fotografías de instrumentos semilla) referenciados mediante rutas relativas (`./images/...`).

## Product Principles

1. **Claridad sobre decoración:** Cada pantalla muestra únicamente los datos y acciones respaldados por el modelo de datos MVP.
2. **Estado siempre visible:** La disponibilidad del instrumento y la urgencia de devolución deben distinguirse al instante sin ambigüedad.
3. **Resiliencia en modo demo y producción:** Toda vista funciona offline con datos semilla en `localStorage` y de forma idéntica contra la API Python + S3.
4. **Accesibilidad verificada:** Todo texto e icono interactivo cumple contraste WCAG AA/AAA usando Dark Cocoa (`#3D231E`) sobre Pool Blue (`#B9E5EC`), Solar Yellow (`#FFD33D`) y lienzos claros (`#FBF9F5`/`#FFFFFF`).
