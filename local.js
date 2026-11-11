// Para probar en la compu:  DATABASE_URL="postgres://..." npm start
const express = require('express');
const path = require('path');
const api = require('./api/index');
const app = express();
app.use(express.static(path.join(__dirname, "public")));
app.use(api);
app.listen(3000, () => console.log('Series en http://localhost:3000'));
