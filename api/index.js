// API de series, plataformas y valoraciones (Express sobre Vercel + Postgres)
const express = require('express');
const { Pool } = require('pg');

const conexion = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const db = new Pool({ connectionString: conexion, ssl: conexion && !conexion.includes('localhost') ? { rejectUnauthorized: false } : false });

// Crea las tablas la primera vez
let listo = null;
function iniciar() {
  listo = listo || db.query(`
    CREATE TABLE IF NOT EXISTS plataformas (
      pla_id      SERIAL PRIMARY KEY,
      pla_nombre  VARCHAR(50) NOT NULL UNIQUE
    );
    CREATE TABLE IF NOT EXISTS series (
      ser_id      SERIAL PRIMARY KEY,
      ser_nombre  VARCHAR(100) NOT NULL,
      pla_id      INTEGER NOT NULL REFERENCES plataformas(pla_id)
    );
    CREATE TABLE IF NOT EXISTS valoraciones (
      val_id          SERIAL PRIMARY KEY,
      pla_id          INTEGER NOT NULL REFERENCES plataformas(pla_id),
      ser_id          INTEGER NOT NULL REFERENCES series(ser_id),
      val_puntaje     INTEGER NOT NULL CHECK (val_puntaje BETWEEN 1 AND 10),
      val_observacion TEXT
    );`).catch(e => { listo = null; throw e; });
  return listo;
}

const app = express();
app.use(express.json());
app.use(async (req, res, next) => {
  if (!conexion) return res.status(500).json({ error: 'Falta la variable DATABASE_URL (conecta una base Postgres en Vercel)' });
  try { await iniciar(); next(); } catch (e) { res.status(500).json({ error: e.message }); }
});

const err = (res, e, code = 400) => {
  const m = e.message || e;
  res.status(code).json({ error: m.includes('foreign key') ? 'No se puede borrar: tiene datos relacionados' : m });
};
const q = (sql, p) => db.query(sql, p).then(r => r);

// ---------- Plataformas ----------
app.get('/api/plataformas', async (req, res) => {
  try { res.json((await q('SELECT * FROM plataformas ORDER BY pla_nombre')).rows); } catch (e) { err(res, e, 500); }
});
app.post('/api/plataformas', async (req, res) => {
  if (!req.body.pla_nombre) return err(res, 'Falta el nombre');
  try { res.status(201).json((await q('INSERT INTO plataformas (pla_nombre) VALUES ($1) RETURNING *', [req.body.pla_nombre])).rows[0]); }
  catch (e) { err(res, e); }
});
app.put('/api/plataformas/:id', async (req, res) => {
  try {
    const r = await q('UPDATE plataformas SET pla_nombre=$1 WHERE pla_id=$2 RETURNING *', [req.body.pla_nombre, req.params.id]);
    r.rowCount ? res.json(r.rows[0]) : err(res, 'No existe', 404);
  } catch (e) { err(res, e); }
});
app.delete('/api/plataformas/:id', async (req, res) => {
  try { const r = await q('DELETE FROM plataformas WHERE pla_id=$1', [req.params.id]); r.rowCount ? res.json({ ok: true }) : err(res, 'No existe', 404); }
  catch (e) { err(res, e); }
});

// ---------- Series ----------
app.get('/api/series', async (req, res) => {
  try {
    res.json((await q(`SELECT s.*, p.pla_nombre FROM series s
      INNER JOIN plataformas p ON p.pla_id = s.pla_id ORDER BY s.ser_nombre`)).rows);
  } catch (e) { err(res, e, 500); }
});
app.post('/api/series', async (req, res) => {
  const { ser_nombre, pla_id } = req.body;
  if (!ser_nombre || !pla_id) return err(res, 'Faltan el nombre o la plataforma');
  try { res.status(201).json((await q('INSERT INTO series (ser_nombre, pla_id) VALUES ($1,$2) RETURNING *', [ser_nombre, pla_id])).rows[0]); }
  catch (e) { err(res, e); }
});
app.put('/api/series/:id', async (req, res) => {
  try {
    const r = await q('UPDATE series SET ser_nombre=$1, pla_id=$2 WHERE ser_id=$3 RETURNING *', [req.body.ser_nombre, req.body.pla_id, req.params.id]);
    r.rowCount ? res.json(r.rows[0]) : err(res, 'No existe', 404);
  } catch (e) { err(res, e); }
});
app.delete('/api/series/:id', async (req, res) => {
  try { const r = await q('DELETE FROM series WHERE ser_id=$1', [req.params.id]); r.rowCount ? res.json({ ok: true }) : err(res, 'No existe', 404); }
  catch (e) { err(res, e); }
});

// ---------- Valoraciones ----------
app.get('/api/valoraciones', async (req, res) => {
  try {
    res.json((await q(`SELECT v.*, s.ser_nombre, p.pla_nombre FROM valoraciones v
      INNER JOIN series s ON s.ser_id = v.ser_id
      INNER JOIN plataformas p ON p.pla_id = v.pla_id ORDER BY v.val_id DESC`)).rows);
  } catch (e) { err(res, e, 500); }
});
app.post('/api/valoraciones', async (req, res) => {
  const { pla_id, ser_id, val_puntaje, val_observacion } = req.body;
  if (!pla_id || !ser_id || !val_puntaje) return err(res, 'Faltan datos');
  try {
    res.status(201).json((await q(`INSERT INTO valoraciones (pla_id, ser_id, val_puntaje, val_observacion)
      VALUES ($1,$2,$3,$4) RETURNING *`, [pla_id, ser_id, val_puntaje, val_observacion || null])).rows[0]);
  } catch (e) { err(res, e); }
});
app.put('/api/valoraciones/:id', async (req, res) => {
  const { pla_id, ser_id, val_puntaje, val_observacion } = req.body;
  try {
    const r = await q(`UPDATE valoraciones SET pla_id=$1, ser_id=$2, val_puntaje=$3, val_observacion=$4
      WHERE val_id=$5 RETURNING *`, [pla_id, ser_id, val_puntaje, val_observacion || null, req.params.id]);
    r.rowCount ? res.json(r.rows[0]) : err(res, 'No existe', 404);
  } catch (e) { err(res, e); }
});
app.delete('/api/valoraciones/:id', async (req, res) => {
  try { const r = await q('DELETE FROM valoraciones WHERE val_id=$1', [req.params.id]); r.rowCount ? res.json({ ok: true }) : err(res, 'No existe', 404); }
  catch (e) { err(res, e); }
});

module.exports = app;
