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

## MVP

El MVP cubrirá jornadas de venta, catálogo de platos y bebidas, reservas, pedidos, cantidades, precios, pagos en efectivo o QR, preparación, entrega e historial de ventas. No incluye pagos integrados, inteligencia artificial, Docker, PostgreSQL, microservicios, despliegue ni infraestructura externa.

## Metodología por issues

- Implementar exclusivamente el alcance de la issue activa.
- Revisar el estado actual antes de editar y no revertir trabajo ajeno.
- Añadir o actualizar pruebas cuando cambie comportamiento del backend.
- Ejecutar `python manage.py test`, `python manage.py check` y el build del frontend para cambios relevantes.
- No crear commits, push, merges ni cerrar issues sin autorización explícita.
