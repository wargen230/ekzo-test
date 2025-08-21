require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('./db');

function loginRoute(app) {
  app.post('/login', (req, res) => {
    const { login, password } = req.body;
    if (!login || !password) 
      return res.status(400).json({ error: 'Username and password are required' });

    db.get(`SELECT id, login, password, role FROM users WHERE login = ?`,
      [login],
      (err, user) => {
        if (err)   return res.status(500).json({ error: err.message });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        bcrypt.compare(password, user.password, (err, match) => {
          if (err)   return res.status(500).json({ error: err.message });
          if (!match) return res.status(401).json({ error: 'Invalid credentials' });

          const payload = { sub: user.id, login: user.login, role: user.role };
          const token   = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
          res.json({ token });
        });
      });
  });
}

function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer '))
    return res.status(401).json({ error: 'Token not provided' });
  const token = auth.slice(7);
  jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = payload;
    next();
  });
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role))
      return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}

module.exports = { loginRoute, authenticate, authorize }
