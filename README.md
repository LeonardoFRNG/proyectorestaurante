# 🍽️ El Rincón de Pradomar

Sistema web de gestión para el restaurante El Rincón de Pradomar: carta, ventas, materia prima, créditos, dashboard y cierre de fin de semana.

**Stack:** HTML + Tailwind (CDN) + JavaScript · Supabase (PostgreSQL + Auth + RLS) · GitHub Pages
**Costo:** $0 con los planes gratuitos.

---

## Estructura

```
el-rincon-de-pradomar/
├── index.html        Login
├── app.html          Toda la aplicación (secciones en una sola página)
├── js/
│   ├── config.js     URL y anon key de Supabase  ← único archivo que editas
│   ├── ui.js         Moneda, fechas, toasts, modales, CSV
│   ├── data.js       Todas las consultas a Supabase
│   └── app.js        Navegación y render de cada sección
├── sql/schema.sql    Base de datos completa
└── README.md
```

---

## Puesta en marcha (20 minutos)

### 1. Crear el proyecto en Supabase
1. Entra a supabase.com → **Start your project** → crea cuenta con GitHub.
2. **New project**. Nombre: `pradomar`. Región: **East US** (la más cercana a Colombia). Guarda la contraseña de la base de datos en un lugar seguro.
3. Espera ~2 minutos a que termine de crearse.

### 2. Crear las tablas
1. Menú izquierdo → **SQL Editor** → **New query**.
2. Copia **todo** el contenido de `sql/schema.sql`, pégalo y pulsa **Run**.
3. Debe decir *Success*. En **Table Editor** verás las 6 tablas y el período #1 ya creado.

### 3. Crear el usuario y cerrar el registro público
1. **Authentication → Users → Add user → Create new user**. Correo y contraseña del restaurante. Marca *Auto Confirm User*.
2. **Authentication → Sign In / Providers → Email**: desactiva **Allow new users to sign up**.
   Esto es importante: si queda activo, cualquiera podría registrarse y entrar.

### 4. Conectar el frontend
1. **Project Settings → API**. Copia *Project URL* y la clave **anon public**.
2. Pégalas en `js/config.js`.
   Nunca uses la `service_role key` aquí: esa clave salta el RLS.

### 5. Probar
Abre `index.html` con un servidor local (por ejemplo la extensión *Live Server* de VS Code, o `python3 -m http.server`) e inicia sesión.

---

## Publicar en internet (GitHub Pages)

```bash
git init
git add .
git commit -m "Sistema El Rincón de Pradomar"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/el-rincon-de-pradomar.git
git push -u origin main
```

Luego: repositorio → **Settings → Pages** → *Source*: `Deploy from a branch` → rama `main`, carpeta `/ (root)` → **Save**.
En 1–2 minutos queda en `https://TU-USUARIO.github.io/el-rincon-de-pradomar/`.

El repositorio puede ser público: la anon key está diseñada para ser visible y los datos quedan protegidos por RLS + login.

### Dominio propio (opcional, más adelante)
Compra el dominio, apunta un registro CNAME a `TU-USUARIO.github.io` y escríbelo en Settings → Pages → *Custom domain*.

---

## Respaldos

- **Automático:** Supabase guarda copias diarias de los últimos 7 días en el plan gratuito.
- **Manual (recomendado, una vez al mes):** Table Editor → cada tabla → menú `...` → **Download as CSV**.
- Desde la app también puedes exportar ventas y gastos a CSV.

## Límites del plan gratuito que importan aquí

| Límite | Valor | ¿Preocupa? |
|---|---|---|
| Base de datos | 500 MB | No. Son años de ventas. |
| Transferencia | 5 GB/mes | No. |
| Pausa por inactividad | ~7 días sin uso | **Sí.** Si pasan más de 7 días sin abrir el sistema, el proyecto se pausa y hay que reactivarlo desde el panel (2 minutos). |

---

## Decisiones de diseño

- **Los créditos son ventas**, no una tabla aparte: así el dinero nunca se registra dos veces.
- **`sale_items` guarda nombre y precio del momento**: las ventas antiguas conservan su precio aunque el producto cambie.
- **La venta se guarda con una función en PostgreSQL** (`registrar_venta`): o se guarda completa o no se guarda nada, aunque se caiga la conexión a mitad.
- **Los productos con ventas no se borran**, se desactivan, para no romper el historial.
- **Cerrar el fin de semana no borra nada**: congela el resumen y abre el período siguiente.

## Mejoras futuras

Inventario de ingredientes · proveedores · costos por receta · usuarios y roles · pagos parciales de crédito · PWA con modo offline.
