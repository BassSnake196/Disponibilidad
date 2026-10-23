# Con Branko Grill House — Sitio Web Accesible

Sitio web estático para el restaurante y taquería de asador **Con Branko Grill House** (Colima, México), diseñado y auditado bajo los estándares de accesibilidad **WCAG 2.1 / 2.2 Nivel AA y AAA** con un puntaje de **100 / 100** en Google Lighthouse y cero observaciones en Silktide.

---

## Características Principales

* **Pantalla de carga animada** con logotipo y barra de progreso.
* **Video Hero Cinematográfico** con reproducción automática en loop, efecto de parallax con movimiento del ratón/giroscopio y congelamiento en frame clave (`FREEZE_AT`).
* **Regiones Semánticas (Landmarks HTML5):**
  * `<header role="banner">`
  * `<nav role="navigation">`
  * `<main id="main-content" role="main">`
  * `<footer role="contentinfo">`
  * Enlace de salto (`.skip-link`) para accesibilidad por teclado.

---

## Casos de Uso Implementados

### Caso de Uso 1: Consulta y Comparativa del Menú
* Galería de platillos con imágenes descriptivas de alta resolución ([Taco Branko](assets/taco-branko.jpg), [Arrachera al Carbón](assets/arrachera-asador.jpg), [Terraza San Fernando](assets/terraza-restaurante.jpg)).
* Enlaces directos a cartas digitales completas.
* **Tabla con datos tabulares accesible** con `<caption>`, `<thead>`, `<tbody>`, `<tfoot>`, encabezados `<th scope="col">` y `<th scope="row">`, y contenedor con scroll accesible para teclado.

### Caso de Uso 2: Reservación de Mesa y Pedidos en Línea
* **Formulario corto accesible** estructurado con `<fieldset>` y `<legend>`.
* Etiquetas explícitas `<label for="...">`, autocompletado estándar (`autocomplete`), campos requeridos accesibles, textos de ayuda y aviso en vivo para lectores de pantalla (`role="status"`, `aria-live="polite"`).

---

## Páginas del Sitio

* `index.html` — Página principal con video hero, los dos casos de uso, sucursales y reseñas.
* `menu-san-fernando.html` — Carta completa de la sucursal Terraza San Fernando.
* `menu-carranza.html` — Carta completa de la sucursal Venustiano Carranza.
* `fotos.html` — Galería fotográfica en formato masonry.
* `resenas.html` — Reseñas y opiniones de clientes en Google.
* `contacto.html` — Información de contacto, teléfonos y pedidos a domicilio.

---

## Ejecución Local

Para levantar el servidor web local:

```bash
# Con npx serve
npx serve -l 3456 .

# O con cualquier servidor estático (e.g. Python)
python -m http.server 3456
```

Abrir en el navegador: [http://localhost:3456](http://localhost:3456)
