// --- Upload env data ---
require('dotenv').config();

// --- Lib import ---
// // Web-server
const express = require('express');
// // File upload
const multer = require('multer');
// // MinIO
const Minio = require('minio');
// // Database
const db = require('./db');
// // JWT
const jwt = require('jsonwebtoken');
// // File system
const fs = require('fs');
// // Server port
const process.env.PORT || 3000;
// // Auth, login, authorize
const { loginRoute, authenticate, authorize } = require('./auth');

const app = express();

const upload = multer({ storage: multer.memoryStorage() });


const minioClient = new Minio.Client({
	endPoint: process.env.MINIO_HOST || 'localhost',
	port: process.env.MINIO_PORT || 9000,
	useSSL: false,
	accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
	secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin'
});

const bucketName = 'mybucket';

(async () => {
  const exists = await minioClient.bucketExists(bucketName);
  if (!exists) {
    await minioClient.makeBucket(bucketName, 'us-east-1');
    console.log(`Bucket "${bucketName}" created.`);
  } else {
    console.log(`Bucket "${bucketName}" already exists.`);
  }
})();

function resequenceIds() {
  db.serialize(() => {
    db.all(`SELECT id FROM files ORDER BY id`, [], (err, rows) => {
      if (err) return console.error(err);
      rows.forEach((row, index) => {
        const newId = index + 1;
        if (row.id !== newId) {
          db.run(`UPDATE files SET id = ? WHERE id = ?`, [newId, row.id]);
        }
      });
      // reset sqlite_sequence
      db.run(`UPDATE sqlite_sequence SET seq = (SELECT MAX(id) FROM files) WHERE name = 'files'`);
    });
  });
}


app.use(express.json());

loginRoute(app);

app.get('/ekzo-test', authenticate, authorize('admin', 'guest'), (req, res) => {
  db.all(`SELECT * FROM files ORDER BY id`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});


app.get('/ekzo-test/files/:name', authenticate, authorize('admin', 'guest'), (req, res) => {
  const filename = req.params.name;
  db.get(`SELECT * FROM files WHERE filename = ?`, [filename], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Not found' });
    minioClient.getObject(bucketName, filename, (err, stream) => {
      if (err) return res.status(404).json({ error: err.message });
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      stream.on('error', e => res.status(500).json({ error: e.message }));
      stream.pipe(res);
    });
  });
});


app.post('/ekzo-test/upload', authenticate, authorize('admin'), upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const buffer = req.file.buffer;
  const filename = req.file.originalname;
  const meta = { 'Content-Type': req.file.mimetype };
  minioClient.putObject(bucketName, filename, buffer, meta, err => {
    if (err) return res.status(500).json({ error: err.message });
    const url = `${process.env.MINIO_URL}/${bucketName}/${filename}`;
    db.run(`INSERT INTO files(filename, status, url) VALUES (?, ?, ?)`,
      [filename, req.body.status, url], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, filename, url });
      }
    );
  });
});


app.put('/ekzo-test/files/:name', authenticate, authorize('admin'), upload.single('file'), (req, res) => {
  const oldName = req.params.name;
  const newStatus = req.body.status;
  const newFile = req.file;
  db.get(`SELECT * FROM files WHERE filename = ?`, [oldName], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Not found' });
    // if new file provided, replace in MinIO and update filename/url
    const filename = newFile ? newFile.originalname : oldName;
    const url = `${process.env.MINIO_URL}/${bucketName}/${filename}`;
    const next = () => {
      db.run(`UPDATE files SET filename = ?, status = ?, url = ? WHERE filename = ?`,
        [filename, newStatus || row.status, url, oldName], err => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ message: 'Updated', filename, status: newStatus });
        }
      );
    };
    if (newFile) {
      minioClient.removeObject(bucketName, oldName, err => {
        if (err) console.error(err);
        minioClient.putObject(bucketName, filename, newFile.buffer, { 'Content-Type': newFile.mimetype }, err => {
          if (err) return res.status(500).json({ error: err.message });
          next();
        });
      });
    } else next();
  });
});

// Delete
app.delete('/ekzo-test/files/:name', authenticate, authorize('admin'), (req, res) => {
  const filename = req.params.name;
  db.get(`SELECT id FROM files WHERE filename = ?`, [filename], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Not found' });
    minioClient.removeObject(bucketName, filename, err => {
      if (err) console.error(err);
      db.run(`DELETE FROM files WHERE filename = ?`, [filename], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        resequenceIds();
        res.json({ message: 'Deleted' });
      });
    });
  });
});


 app.listen(PORT, '0.0.0.0', () => {
   console.log(`Server running on localhost:${PORT}`);
 });












































