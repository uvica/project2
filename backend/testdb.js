const db = require('./db');

(async () => {
  try {
    const [rows] = await db.query('SELECT * FROM admins');
    console.log('Admins:', rows);
  } catch (err) {
    console.error('DB error:', err);
  }
})();
