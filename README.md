# seriesCatalogacion_7A

CRUD de **plataformas**, **series** (nombre + plataforma) y **valoraciones** (plataforma, serie, puntaje 1-10 y observacion).
Express + Postgres (Neon), preparado para Vercel.

## Publicar en Vercel
1. Entrar a vercel.com con la cuenta de GitHub → **Add New → Project**.
2. **Import** el repositorio `seriesCatalogacion_7A`.
3. En *Optional Integrations* tocar **Add** en **Neon (Serverless Postgres)** → plan Free → Continue.
   Esto crea la variable `DATABASE_URL` sola.
4. **Deploy**. Las tablas se crean solas la primera vez que se abre la pagina.

## Probar en la compu
```bash
npm install
DATABASE_URL="postgres://usuario:clave@host/db" npm start
```
Abrir http://localhost:3000
