---
name: MusicShare Acorde Editorial
description: Sistema visual cálido, editorial y táctil para el banco comunitario de instrumentos MusicShare.
colors:
  pool-blue: "#b9e5ec"
  pool-blue-deep: "#3b656b"
  dark-cocoa: "#3d231e"
  solar-yellow: "#ffd33d"
  solar-yellow-hover: "#edc22b"
  canvas: "#fbf9f5"
  surface: "#ffffff"
  surface-muted: "#f5f3ef"
  surface-subtle: "#eae8e4"
  ink: "#3d231e"
  ink-muted: "#404849"
  danger: "#ba1a1a"
  danger-soft: "#ffdad6"
  danger-ink: "#93000a"
  warning-soft: "#ffd3ca"
  warning-ink: "#775650"
typography:
  display:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "3rem"
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "2.25rem"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "-0.01em"
  body:
    fontFamily: "\"Source Sans 3\", system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "\"Source Sans 3\", system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.01em"
rounded:
  control: "0.5rem"
  card: "1rem"
  modal: "1.5rem"
  full: "9999px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2.5rem"
components:
  button-primary:
    backgroundColor: "{colors.solar-yellow}"
    textColor: "{colors.dark-cocoa}"
    rounded: "{rounded.control}"
    padding: "0.625rem 1.25rem"
  button-primary-hover:
    backgroundColor: "{colors.solar-yellow-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.dark-cocoa}"
    rounded: "{rounded.control}"
    padding: "0.625rem 1.25rem"
  card-instrument:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.dark-cocoa}"
    rounded: "{rounded.card}"
    padding: "1.25rem"
  chip-category:
    backgroundColor: "{colors.pool-blue}"
    textColor: "{colors.dark-cocoa}"
    rounded: "{rounded.full}"
    padding: "0.25rem 0.75rem"
  input-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.dark-cocoa}"
    rounded: "{rounded.control}"
    height: "2.75rem"
---

# Design System: MusicShare Acorde Editorial

## Overview

**Creative North Star: "El Estudio Luminoso de Madera y Papel"**

MusicShare combina la calidez de una revista cultural de música con la precisión operativa de una herramienta de préstamo comunitario. El lienzo cálido de papel editorial (`#FBF9F5`) deja respirar la fotografía real de los instrumentos, mientras Dark Cocoa (`#3D231E`) aporta anclaje tipográfico y estructural en lugar del negro puro.

El sistema opera en dos registros complementarios: una portada **Persuade** en el Hero de inicio —donde la fotografía a sangre completa envuelve también la barra de navegación superior transparente— y pantallas **Operate** limpias, escaneables y sin ruido visual en catálogo, ficha de detalle, publicación, préstamos y alertas.

**Key Characteristics:**
- Paleta clara y cálida basada en tres polos obligatorios: Pool Blue (`#B9E5EC`), Dark Cocoa (`#3D231E`) y Solar Yellow (`#FFD33D`).
- Cero ornamentación redundante: sin kickers sobre encabezados, sin barras laterales de un solo lado, sin tarjetas de métricas ficticias.
- Contraste WCAG AAA en la tipografía principal y acciones primarias.

## Colors

La paleta parte de un modo claro orgánico donde cada color cumple una función semántica inequívoca.

### Primary
- **Pool Blue (`#b9e5ec`):** Color principal de identidad suave. Se usa en insignias de categoría, chips activos, anillos de enfoque exterior (`focus-visible`) y realces sutiles de estado disponible o informativo. Siempre acompañado de texto en Dark Cocoa (`10.62:1` AAA).
- **Deep Pool Teal (`#3b656b`):** Variante oscura accesible de Pool Blue para iconos activos, enlaces y texto de estado `disponible` sobre fondos claros (`6.13:1` sobre `#FBF9F5`, `6.44:1` sobre `#FFFFFF`).

### Secondary
- **Dark Cocoa (`#3d231e`):** Ancla visual del sistema. Se utiliza en toda la tipografía principal, bordes estructurales (`1px` al 12%–20% de opacidad), pie de página y en el doble scrim degradado del Hero (`13.70:1` sobre `#FBF9F5`).

### Tertiary
- **Solar Yellow (`#ffd33d`):** Reservado exclusivamente para llamadas a la acción principales (`Explorar catálogo`, `Solicitar préstamo`, `Guardar instrumento`, `Publicar`). Su variante hover es Amber Solar (`#edc22b`). **Siempre** lleva texto e iconos en Dark Cocoa (`10.04:1` AAA).

### Neutral & Semantic
- **Warm Paper Canvas (`#fbf9f5`):** Fondo global de la aplicación.
- **Pure White Surface (`#ffffff`):** Superficie de tarjetas, modales y campos de entrada.
- **Muted Cream (`#f5f3ef`) & Subtle Stone (`#eae8e4`):** Capas tonales para cabeceras de tabla, botones secundarios y controles en reposo.
- **Editorial Slate (`#404849`):** Texto secundario y metadatos (`8.91:1` sobre `#FBF9F5`). Nunca usar `#71787A` para texto corriente.
- **Crimson Alert (`#ba1a1a`) / Soft Rose (`#ffdad6`) / Deep Crimson (`#93000a`):** Estados de error, préstamo vencido y acciones destructivas (`7.24:1` AAA entre `#93000a` y `#ffdad6`).
- **Warm Ochre (`#775650`) / Peach Tint (`#ffd3ca`):** Avisos de mantenimiento o daño reportado.

### Named Rules
**The Cocoa-On-Yellow Rule.** Solar Yellow (`#FFD33D`) jamás lleva texto blanco ni `#765E00` (4.34:1, insuficiente); solo Dark Cocoa (`#3D231E`, 10.04:1).
**The Restrained Accent Rule.** Solar Yellow se limita al botón de acción principal de cada pantalla o tarjeta; los controles secundarios usan fondo blanco/crema con borde Dark Cocoa sutil.

## Typography

**Display Font:** `Newsreader` (con fallback `Georgia, serif`)
**Body & UI Font:** `Source Sans 3` (con fallback `system-ui, -apple-system, sans-serif`)

**Character:** `Newsreader` aporta presencia editorial en títulos de página y nombres de instrumentos; `Source Sans 3` sostiene toda la interfaz operativa (controles, formularios, filtros, tablas y badges) con legibilidad inmediata y cifras tabulares (`tabular-nums`) en fechas y contadores.

### Hierarchy
- **Display (`500`, `48px` / `3rem` desktop, `32px` mobile, line-height `1.15`, tracking `-0.02em`):** Exclusivo para el titular `h1` del Hero.
- **Headline (`500`, `36px` / `2.25rem` desktop, `28px` mobile, line-height `1.2`, tracking `-0.015em`):** Encabezados principales de vista y sección.
- **Title (`600`, `20px` / `1.25rem`, line-height `1.35`):** Nombres de instrumentos en tarjetas y cabeceras de modal/drawer.
- **Body (`400`, `16px` / `1rem`, line-height `1.5`, medida máxima `65ch–75ch` en descripciones):** Texto de lectura, notas de conservación y mensajes de alerta.
- **Label (`600`, `14px` / `0.875rem` y `12px` / `0.75rem`, line-height `1.4`):** Botones, etiquetas de formulario, tabs, badges y metadata.

### Named Rules
**The Operate Sans Rule.** Ningún botón, input, etiqueta de formulario o celda de tabla usa la fuente serif; `Source Sans 3` gobierna todo control operativo.
**The No-Kicker Rule.** Los encabezados hablan por sí mismos: no colocar etiquetas eyebrow/kicker encima de `h1` o `h2`.

## Layout

- **Contenedor:** Máximo `1280px` (`max-w-7xl`) centrado, con padding lateral `1rem` en móvil (`< 768px`) y `2rem` (`px-8`) en tablet/desktop.
- **Grillas:**
  - Catálogo: `1` columna en móvil, `2` en tablet (`md`), `3` en desktop (`lg`) con separación de `1.5rem` (`gap-6`).
  - Detalle y Formularios: `12` columnas en desktop (`7 + 5` en detalle; columna principal centrada o `8 + 4` en publicación).
- **Hero Full-Bleed y Navbar Transparente (`#/`):**
  - El Hero ocupa `min-h-[76vh]` (hasta `80vh`) desde `top: 0` sin `padding-top` previo en `#/`, de modo que **la fotografía del Hero cubre también el área detrás de la Navbar fija superior (`h-16`)**.
  - En `#/` con `scrollY <= 24`, la Navbar es transparente sobre el scrim superior Dark Cocoa con logotipo, enlaces y selector en `#FBF9F5` legibles. Al superar `24px` de scroll o en cualquier ruta interna (`#/instruments/*`, `#/loans`, `#/alerts`), la Navbar adopta fondo `#FBF9F5/95` con `backdrop-blur-md`, texto `#3D231E` y borde inferior `1px solid rgba(61,35,30,0.1)`.
- **Ritmo espacial:** Más aire encima de cada encabezado de sección que debajo; separación uniforme basada en múltiplos de `0.5rem`.

## Elevation & Depth

El sistema combina **capas tonales** (`#FBF9F5` lienzo vs. `#FFFFFF` tarjetas) y **bordes definidos de bajo contraste** (`1px solid rgba(61,35,30,0.12)`).

### Shadow Vocabulary
- **Cocoa Subtle (`0 2px 10px rgba(61, 35, 30, 0.06)`):** Estado de reposo para barras sticky o tarjetas elevadas.
- **Cocoa Lift (`0 10px 24px rgba(61, 35, 30, 0.08)`):** Estado hover en tarjetas clicables de catálogo.
- **Cocoa Overlay (`0 20px 40px rgba(61, 35, 30, 0.14)`):** Modales (`LoanRequestModal`, `ReturnLoanModal`) y menús flotantes.

### Named Rules
**The Flat-By-Default Rule.** Las tarjetas descansan planas con borde sutil de `1px`; la sombra aparece en interacción o en overlays.
**The Tinted-Shadow Rule.** Toda sombra se tiñe con Dark Cocoa (`rgba(61, 35, 30, ...)`), nunca negro puro ni sombras duras sin desenfoque.

## Shapes

- **Controles e Insignias (`0.5rem` / `8px`):** Botones, inputs, selects y alertas internas.
- **Pills de Filtro y Badges (`9999px`):** Filtros de categoría y etiquetas de estado.
- **Tarjetas y Contenedores (`1rem` / `16px`):** Tarjetas de instrumento, préstamo y alerta.
- **Modales y Drawers (`1.5rem` / `24px`):** Diálogos centrados con `<dialog>` o overlay `fixed`.

## Components

### Buttons
- **Shape:** Bordes redondeados suaves (`0.5rem`), altura mínima `44px` en acciones principales y formularios, transición de `150ms–200ms`.
- **Primary:** Fondo Solar Yellow (`#FFD33D`), texto Dark Cocoa (`#3D231E`), peso `600`. Hover en `#EDC22B`.
- **Secondary:** Fondo blanco (`#FFFFFF`), borde `1px` en Dark Cocoa al 20%, texto Dark Cocoa. Hover en Muted Cream (`#F5F3EF`).
- **Ghost / Danger:** Texto `#3D231E` o `#BA1A1A` con hover en tint suave; estado `disabled` al 50% de opacidad con cursor `not-allowed`.

### Chips
- **Category Chip:** Fondo Pool Blue (`#B9E5EC`), texto Dark Cocoa (`#3D231E`), radio `9999px`.
- **Status Badge:** `disponible` en Pool Blue + punto `#3B656B`; `prestado` / `activo` en Muted Cream con borde Dark Cocoa; `vencido` en `#FFDAD6` + `#93000A`; `mantenimiento` / `dañado` en `#FFD3CA` + `#775650`.

### Cards
- **Corner Style:** `1rem` (`16px`).
- **Background:** `#FFFFFF` sobre lienzo `#FBF9F5`.
- **Border:** `1px solid rgba(61, 35, 30, 0.12)` en todo el perímetro.
- **Image Ratio:** `4:3` en catálogo y `16:10` o `4:3` en detalle, con fallback SVG editorial en `#B9E5EC`/`#3D231E`.

### Inputs / Fields
- **Style:** Fondo `#FFFFFF`, borde `1px solid rgba(61, 35, 30, 0.2)`, altura mínima `44px`, radio `0.5rem`.
- **Focus:** Borde sólido `#3D231E` y anillo exterior `0 0 0 3px #B9E5EC`.
- **Error:** Borde `#BA1A1A` y mensaje claro en `#93000A` debajo del campo.

### Navigation
- **Navbar:** Altura fija `64px` (`h-16`), transparente con texto `#FBF9F5` sobre el scrim del Hero en `#/` sin scroll; sólida en `#FBF9F5/95` con texto `#3D231E` al hacer scroll o en páginas internas. Incluye campana con contador de alertas no leídas y selector compacto de usuario Mock con iniciales tipográficas (`#B9E5EC` / `#3D231E`).

## Do's and Don'ts

### Do:
- **Do** usar Dark Cocoa (`#3D231E`) sobre Solar Yellow (`#FFD33D`) y Pool Blue (`#B9E5EC`) en todos los botones y badges.
- **Do** cubrir también el área detrás de la Navbar en `#/` con la imagen del Hero y su scrim superior Dark Cocoa.
- **Do** usar skeletons en carga, estados vacíos accionables y `tabular-nums` en fechas y contadores.
- **Do** usar `lucide-react` para toda la iconografía en un trazo uniforme.

### Don't:
- **Don't** usar kickers/eyebrows encima de títulos ni números de sección decorativos (`01`, `02`).
- **Don't** usar barras de color de un solo lado (`border-left` grueso o franjas laterales/inferiores) en tarjetas de préstamo o KPIs.
- **Don't** usar tarjetas métricas tipo KPI con anillos de progreso SVG ni texto con degradado.
- **Don't** referenciar URLs externas efímeras (`lh3.googleusercontent.com/aida-public/...`); usar solo assets locales `./images/...` y fallbacks SVG.
