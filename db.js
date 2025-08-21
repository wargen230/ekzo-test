const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./files.db', (err) => {
	if (err) {
		console.err(err.message);
	}
	else{
		console.log('Sucsess connect to SQLite');
	}
});

db.run(`CREATE TABLE IF NOT EXISTS files (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	filename TEXT NOT NULL,
	status TEXT NOT NULL,
	url TEXT NOT NULL
	)`);

db.run(`CREATE TABLE IF NOT EXISTS users (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	login TEXT NOT NULL,
	password TEXT NOT NULL,
	role TEXT NOT NULL
	)`);

module.exports = db;
