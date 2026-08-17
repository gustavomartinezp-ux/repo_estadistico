# DAS Dashboard — Producción Estadística APS

Dashboard de estadísticas de producción para la Dirección de Administración de
Salud (DAS) de Talcahuano, cubriendo la red APS: CESFAM Los Cerros, CESFAM
Paulina Avendaño, CESFAM San Vicente, CESFAM Leocán Portus y sus CECOSF/postas
dependientes.

## Arquitectura

- **Next.js 16 (App Router)**, todo en TypeScript.
- Los informes Excel crudos (con datos de pacientes) se procesan **solo en el
  servidor**: se leen, se agregan por día/estamento/profesional/prestación/
  estado (sin PII) y el archivo original se descarta. El navegador nunca
  recibe una fila cruda, solo conteos agregados.
- **Almacenamiento del agregado**: en producción vive en [Vercel
  Blob](https://vercel.com/docs/storage/vercel-blob) (`BLOB_READ_WRITE_TOKEN`);
  en desarrollo local, si esa variable no está seteada, cae automáticamente a
  archivos locales en `data/` — no hace falta configurar nada para levantar
  el proyecto localmente.
- **Autenticación**: un único perfil admin (contraseña en `ADMIN_PASSWORD`)
  puede cargar informes en `/cargar`. El resto de la app (dashboard, reportes,
  exportación) es de lectura abierta, sin login.

## Desarrollo local

```bash
npm install
cp .env.local.example .env.local   # completa ADMIN_PASSWORD y SESSION_SECRET
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Variables de entorno

Ver [`.env.local.example`](.env.local.example) para la lista completa y cómo
generar cada valor. En Vercel se configuran en **Project Settings → Environment
Variables**; `BLOB_READ_WRITE_TOKEN` se agrega solo si conectas un Blob Store
al proyecto (Storage → Create Database → Blob).

## Despliegue

Conectado a Vercel vía GitHub: cada push a `main` se despliega solo. Antes del
primer despliegue, asegúrate de tener seteadas en Vercel: `ADMIN_PASSWORD`,
`SESSION_SECRET` y el Blob Store conectado (que agrega `BLOB_READ_WRITE_TOKEN`
automáticamente).
