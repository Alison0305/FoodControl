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

Las secciones de negocio muestran estados provisionales claramente identificados. No presentan estadísticas ni datos ficticios y no incluyen operaciones CRUD todavía.

La API exige autenticación por defecto. Solo `/api/health/`, `/api/auth/csrf/` y `/api/auth/login/` permanecen públicos de forma explícita; las solicitudes que cambian estado conservan protección CSRF.

## Verificaciones

```powershell
cd backend
.\.venv\Scripts\python.exe manage.py test
.\.venv\Scripts\python.exe manage.py check

cd ..\frontend
npm run build
```

## Alcance actual

El esquema de datos, la autenticación por sesiones y la interfaz principal navegable están implementados. Aún no incluye endpoints CRUD ni operaciones de jornadas, menú, pedidos, pagos o historial, dashboard estadístico, cálculo de totales ni transiciones de estado; esos módulos se implementarán en sus issues correspondientes.
