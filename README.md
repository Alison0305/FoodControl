# FoodControl

Sistema web local para organizar ventas familiares de comida. Permitirá registrar jornadas de venta, platos, bebidas, reservas, pedidos, pagos en efectivo o QR, preparación, entrega e historial de ventas. La moneda del sistema será bolivianos (Bs).

## Tecnologías

- Frontend: React 19, React Router, Vite, Tailwind CSS 4 y Lucide React (JavaScript).
- Backend: Django 5.2 y Django REST Framework.
- Base de datos: SQLite.
- Autenticación: sesiones de Django, Django REST Framework y CSRF.

## Identidad visual

FoodControl utiliza una identidad visual verde salvia y beige, aplicada mediante tokens de diseño compatibles con Tailwind CSS 4:

- Verde oscuro: `#354F45`.
- Verde salvia: `#779B89`.
- Salvia claro: `#CDDCD0`.
- Beige: `#F5F1E8`.
- Blanco: `#FFFFFF`.
- Verde carbón: `#26352E`.

El beige se utiliza como fondo general, el blanco para tarjetas y formularios, y el verde oscuro para la navegación lateral y los botones principales. Los estados funcionales mantienen colores semánticos independientes: amarillo para espera, azul para preparación, verde para entregado y rojo para cancelación o errores.

## Estructura

```text
FoodControl/
|-- backend/       # API Django y base de datos SQLite local
|-- frontend/      # Interfaz React/Vite: componentes, layouts, páginas y contexto
|-- .env.example   # Variables locales de ejemplo
`-- AGENTS.md      # Guía permanente de desarrollo
```

## Modelo de datos

Los modelos de negocio se encuentran en `backend/core/` y usan el usuario incorporado de Django.

- `Jornada`: nombre, fecha, estado (`abierta` o `cerrada`), usuario creador y fecha de creación.
- `Producto`: pertenece a una jornada; tiene nombre, tipo (`plato` o `bebida`), precio decimal, estado activo y fecha de creación.
- `Pedido`: pertenece a una jornada; registra cliente, tipo (`reserva` o `venta_directa`), estado de preparación, observaciones, usuario registrador y fechas de creación y entrega.
- `DetallePedido`: relaciona un pedido con un producto y conserva cantidad y precio unitario histórico.
- `Pago`: pertenece a un pedido y registra monto decimal, método (`efectivo` o `qr`), usuario registrador y fecha de pago.

Relaciones principales:

- Una `Jornada` tiene múltiples `Producto` y `Pedido`.
- Un `Pedido` tiene múltiples `DetallePedido` y `Pago`.
- Un `Producto` puede aparecer en múltiples `DetallePedido`.
- Un usuario puede registrar múltiples jornadas, pedidos y pagos.

Restricciones implementadas:

- Las relaciones históricas se protegen contra eliminaciones accidentales mediante `PROTECT`.
- Los precios no aceptan valores negativos; las cantidades y los pagos deben ser mayores que cero, mediante validadores y restricciones SQL.
- Un `DetallePedido` valida explícitamente que su producto y pedido pertenezcan a la misma jornada; las futuras operaciones de creación deben invocar `full_clean()` antes de guardar cuando no usen formularios de Django.
- No se guardan subtotales, totales, saldos ni estados de pago calculables.
- Un pedido puede tener múltiples pagos y el precio unitario se guarda en cada detalle para preservar el historial.


## Requisitos

- Windows 10/11
- Python 3.13 o compatible
- Node.js 24 y npm 11 o compatibles

## Instalación local en Windows

1. Cree el archivo local de configuración y defina una clave secreta única. El archivo `.env` no se versiona:

```powershell
Copy-Item .env.example .env
```

Edite `DJANGO_SECRET_KEY` en `.env` antes de iniciar Django. También puede definir estas variables en la sesión de PowerShell.

2. En una terminal de PowerShell, prepare el backend:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

3. En otra terminal de PowerShell, prepare e inicie el frontend:

```powershell
cd frontend
npm install
npm run dev
```

Abra la dirección mostrada por Vite, normalmente `http://localhost:5173`. El frontend consume la API mediante el proxy local de Vite, que conserva las cookies de sesión y CSRF durante el desarrollo.

## Autenticación

FoodControl usa sesiones de Django y cookies HTTP, sin JWT ni almacenamiento de contraseñas, tokens o identificadores de sesión en `localStorage`.

| Método | Endpoint | Descripción |
| --- | --- | --- |
| `GET` | `/api/auth/csrf/` | Entrega y configura el token CSRF requerido para las solicitudes que cambian estado. |
| `POST` | `/api/auth/login/` | Inicia sesión con `username` y `password`; requiere el encabezado `X-CSRFToken`. |
| `POST` | `/api/auth/logout/` | Cierra la sesión actual; requiere autenticación y `X-CSRFToken`. |
| `GET` | `/api/auth/me/` | Devuelve el usuario autenticado; requiere sesión válida. |

Para crear un usuario autorizado localmente:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python manage.py createsuperuser
```

Inicie backend y frontend, abra `http://localhost:5173` e ingrese las credenciales creadas. Tras iniciar sesión se mostrará una pantalla privada provisional. Use **Cerrar sesión** para invalidar la sesión y volver al formulario de acceso.

## Interfaz principal

La interfaz autenticada cuenta con una barra lateral en computadoras, un menú desplegable en celulares y una barra superior con la sección actual y el usuario autenticado. Usa componentes reutilizables para botones, tarjetas, encabezados, indicadores de estado, campos, estados vacíos, carga y errores.

Rutas privadas disponibles:

| Ruta | Sección |
| --- | --- |
| `/` | Inicio y accesos rápidos. |
| `/jornadas` | Jornadas de venta. |
| `/menu` | Platos y bebidas. |
| `/pedidos` | Pedidos y reservas. |
| `/pagos` | Gestión de pagos. |
| `/historial` | Historial de ventas. |

Las secciones de pagos e historial muestran estados provisionales claramente identificados. No presentan estadísticas ni datos ficticios.

La API exige autenticación por defecto. Solo `/api/health/`, `/api/auth/csrf/` y `/api/auth/login/` permanecen públicos de forma explícita; las solicitudes que cambian estado conservan protección CSRF.

## Jornadas de venta

El módulo de jornadas permite crear y organizar eventos de venta independientes. Una jornada nueva siempre comienza abierta y se asigna automáticamente al usuario autenticado.

| Método | Endpoint | Descripción |
| --- | --- | --- |
| `GET` | `/api/jornadas/` | Lista las jornadas por fecha descendente. |
| `POST` | `/api/jornadas/` | Crea una jornada con nombre y fecha. |
| `GET` | `/api/jornadas/{id}/` | Consulta una jornada. |
| `PATCH` | `/api/jornadas/{id}/` | Edita nombre y fecha de una jornada abierta. |
| `DELETE` | `/api/jornadas/{id}/` | Elimina la jornada y sus registros asociados. |
| `POST` | `/api/jornadas/{id}/cerrar/` | Cierra una jornada. |
| `POST` | `/api/jornadas/{id}/abrir/` | Reabre una jornada cerrada. |

Reglas del módulo:

- Todas las rutas requieren sesión autenticada y las operaciones de escritura requieren CSRF.
- El nombre y la fecha son obligatorios; el nombre no admite solo espacios.
- Se permiten fechas futuras y varias jornadas abiertas simultáneamente.
- No se puede editar una jornada cerrada ni cambiar su estado mediante `PATCH`; debe reabrirse primero.
- Una eliminación confirmada borra atómicamente los productos, pedidos, detalles y pagos asociados solo a esa jornada, sin afectar otras jornadas ni usuarios.
- La interfaz permite seleccionar una jornada abierta. Solo su identificador se guarda localmente, asociado al usuario actual, y se valida contra la API al recargar o cerrar la sesión.

Para usar el módulo, inicie sesión, abra **Jornadas**, cree una jornada con **Nueva jornada** y selecciónela mediante **Seleccionar**. La página de inicio mostrará la jornada activa. Antes de cerrar, reabrir o eliminar una jornada, la interfaz solicita confirmación mediante un diálogo accesible. La eliminación es permanente y también elimina los datos asociados a esa jornada.

## Platos y bebidas

El módulo **Platos y bebidas** trabaja exclusivamente con la jornada abierta seleccionada. Permite registrar platos y bebidas, editar nombre, tipo o precio, filtrar por tipo y disponibilidad, y activar, desactivar o eliminar productos.

| Método | Endpoint | Descripción |
| --- | --- | --- |
| `GET` | `/api/jornadas/{id}/productos/` | Lista los productos de una jornada; admite `tipo=plato|bebida` y `activo=true|false`. |
| `POST` | `/api/jornadas/{id}/productos/` | Crea un producto activo en una jornada abierta. |
| `GET` | `/api/productos/{id}/` | Consulta un producto. |
| `PATCH` | `/api/productos/{id}/` | Edita nombre, tipo o precio de un producto en una jornada abierta. |
| `DELETE` | `/api/productos/{id}/` | Elimina un producto sin pedidos asociados y de una jornada abierta. |
| `POST` | `/api/productos/{id}/activar/` | Activa un producto de una jornada abierta. |
| `POST` | `/api/productos/{id}/desactivar/` | Desactiva un producto de una jornada abierta. |

Reglas del módulo:

- Todas las rutas requieren sesión autenticada y CSRF para sus operaciones de escritura.
- El nombre, tipo y precio son obligatorios. El precio usa dos decimales, no admite valores negativos y `Bs 0.00` es válido.
- Los productos se aíslan por jornada y no pueden reasignarse a otra jornada.
- Una jornada cerrada puede consultarse, pero no admite altas, ediciones, activaciones, desactivaciones ni eliminaciones de productos.
- Un producto con detalles de pedido conserva su historial y no puede eliminarse; debe desactivarse para dejar de ofrecerse en pedidos nuevos.
- Cambiar el precio de un producto no altera los precios unitarios ya guardados en los detalles de pedidos.

## Pedidos y reservas

El módulo **Pedidos y reservas** registra reservas y ventas directas dentro de la jornada seleccionada, con varios productos y cantidades por pedido.

| Método | Endpoint | Descripción |
| --- | --- | --- |
| `GET` | `/api/jornadas/{id}/pedidos/` | Lista los pedidos de una jornada. |
| `POST` | `/api/jornadas/{id}/pedidos/` | Registra un pedido o reserva con sus detalles. |
| `GET` | `/api/pedidos/{id}/` | Consulta un pedido y sus precios históricos. |
| `PATCH` | `/api/pedidos/{id}/` | Edita un pedido pendiente de una jornada abierta. |

Reglas del módulo:

- El identificador automático del pedido es único y su estado inicial es `en_espera`.
- Cada pedido requiere cliente, tipo y al menos un producto sin duplicados; las cantidades son enteros mayores que cero.
- El backend asigna el precio vigente para productos nuevos y conserva el precio histórico de líneas existentes.
- Solo se pueden agregar productos activos de la misma jornada. Las líneas históricas pueden conservar productos que luego se desactiven.
- No se puede cambiar la jornada, estado, usuario registrador ni fecha de creación directamente.
- Las escrituras son transaccionales y se bloquean en jornadas cerradas, pedidos entregados o cancelados, o cambios de líneas cuando ya existen pagos.
- Cada detalle devuelve `subtotal`; cada pedido devuelve `cantidad_total` y `total`. Son campos calculados, no se almacenan ni se aceptan desde el cliente.
- El subtotal es `cantidad × precio_unitario` histórico, y el total es la suma de subtotales. Por ejemplo, 3 platos de `Bs 25.00` y 2 bebidas de `Bs 5.00` generan subtotales de `Bs 75.00` y `Bs 10.00`, con total `Bs 85.00` y 5 unidades.
- Los importes de la API se representan como cadenas decimales con dos posiciones, incluso para productos gratuitos.

## Verificaciones

```powershell
cd backend
.\.venv\Scripts\python.exe manage.py test
.\.venv\Scripts\python.exe manage.py check

cd ..\frontend
npm run build
npm run test:money
```

## Alcance actual

El esquema de datos, la autenticación por sesiones, la interfaz principal, jornadas, catálogo, pedidos y sus importes calculados están implementados. Aún no incluye pagos, historial, dashboard estadístico ni transiciones de estado de pedidos; esos módulos se implementarán en sus issues correspondientes.
