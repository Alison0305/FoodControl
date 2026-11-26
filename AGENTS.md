# Guía de desarrollo de FoodControl

## Arquitectura

- `frontend/` contiene la interfaz React con Vite y Tailwind CSS.
- `backend/` contiene la API Django y Django REST Framework.
- SQLite se usa solo como base de datos local durante el MVP.
- La API usa el prefijo `/api/`. El frontend la consume mediante el proxy de Vite durante el desarrollo.
- La autenticación futura usará sesiones de Django y CSRF; no se debe añadir JWT ni proveedores externos sin una issue aprobada.

## Convenciones

- La interfaz, textos para usuarios, mensajes de API y documentación se escriben en español.
- La moneda se muestra como `Bs` y los importes monetarios futuros usarán `Decimal`, nunca `float`.
- Las aplicaciones Django agrupan responsabilidades de negocio. Las vistas, rutas, serializadores y pruebas permanecen dentro de su aplicación correspondiente.
- Mantener dependencias mínimas, código modular y configuraciones explícitas.
- Toda variable sensible o variable por entorno se documenta en `.env.example`; nunca se versionan archivos `.env`.

## Identidad visual

- La interfaz usa la paleta oficial de FoodControl: verde oscuro `#354F45`, verde salvia `#779B89`, salvia claro `#CDDCD0`, beige `#F5F1E8`, blanco `#FFFFFF` y verde carbón `#26352E`.
- Los tokens de esta paleta se definen en `frontend/src/index.css` y los componentes deben reutilizar las utilidades de Tailwind generadas a partir de ellos; no introducir colores de marca arbitrarios.
- Los colores semánticos se mantienen independientes de la marca: amarillo para espera, azul para preparación, verde para entregado y rojo para cancelación o errores.

## Tipografía

- El tamaño base de la interfaz es `16px`; no usar textos menores a `14px`.
- Los tokens tipográficos se definen en `frontend/src/index.css` y se reutilizan mediante las utilidades de Tailwind: título principal `34px`, subtítulo `22px`, texto general `19px`, etiquetas, campos, botones y descripciones `18px`, e indicadores de estado `16px`.
- La barra lateral de escritorio mide `310px`. Las dimensiones deben priorizar legibilidad para usuarios adultos, con botones de al menos `50px` y campos de al menos `52px` de alto, sin usar `zoom` ni `transform: scale()` para ampliar la interfaz.
- Los formularios de fecha deben reutilizar `frontend/src/components/DatePicker.jsx`, conservar fechas en formato `YYYY-MM-DD` para la API y usar la zona horaria `America/La_Paz`.

## MVP

El MVP cubrirá jornadas de venta, catálogo de platos y bebidas, reservas, pedidos, cantidades, precios, pagos en efectivo o QR, preparación, entrega e historial de ventas. No incluye pagos integrados, inteligencia artificial, Docker, PostgreSQL, microservicios, despliegue ni infraestructura externa.

## Metodología por issues

- Implementar exclusivamente el alcance de la issue activa.
- Revisar el estado actual antes de editar y no revertir trabajo ajeno.
- Añadir o actualizar pruebas cuando cambie comportamiento del backend.
- Ejecutar `python manage.py test`, `python manage.py check` y el build del frontend para cambios relevantes.
- No crear commits, push, merges ni cerrar issues sin autorización explícita.
