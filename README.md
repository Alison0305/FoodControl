# FoodControl

Sistema web local para organizar ventas familiares de comida. Permitirá registrar jornadas de venta, platos, bebidas, reservas, pedidos, pagos en efectivo o QR, preparación, entrega e historial de ventas. La moneda del sistema será bolivianos (Bs).

## Tecnologías

- Frontend: React 19, Vite y Tailwind CSS 4 (JavaScript).
- Backend: Django 5.2 y Django REST Framework.
- Base de datos: SQLite.
- Autenticación futura: sesiones de Django y CSRF.

## Estructura

```text
FoodControl/
|-- backend/       # API Django y base de datos SQLite local
|-- frontend/      # Interfaz React/Vite
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

1. Revise `.env.example` si necesita definir variables del backend en la sesión de PowerShell. La configuración predeterminada sirve para el desarrollo local.
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

Abra la dirección mostrada por Vite, normalmente `http://localhost:5173`. La pantalla inicial consulta `GET /api/health/` mediante el proxy local de Vite y confirma la comunicación con Django.

## Verificaciones

```powershell
cd backend
.\.venv\Scripts\python.exe manage.py test
.\.venv\Scripts\python.exe manage.py check

cd ..\frontend
npm run build
```

## Alcance actual

El esquema de datos para jornadas, productos, pedidos, detalles y pagos está implementado. Aún no incluye autenticación funcional, endpoints CRUD, interfaz de gestión, operaciones de cobro, cálculo de totales ni transiciones de estado; esos módulos se implementarán en sus issues correspondientes.
