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

Esta inicialización no incluye modelos de negocio, autenticación, pedidos, reservas ni pagos. Esos módulos se implementarán en sus issues correspondientes.
