const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const session = require('cookie-session');
const Datastore = require('nedb-promises');

const app = express();
const DB_DIR = process.env.VERCEL ? '/tmp' : path.join(__dirname, 'data');

// Ensure data dir exists locally
if (!process.env.VERCEL) {
  const fs = require('fs');
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR);
}

const usersDB = Datastore.create({ filename: path.join(DB_DIR, 'users.db'), autoload: true });
const notesDB = Datastore.create({ filename: path.join(DB_DIR, 'notes.db'), autoload: true });

// Ensure unique index on email
usersDB.ensureIndex({ fieldName: 'email', unique: true });

app.use(cors());
app.use(express.json());
app.use(session({
  name: 'notesapp',
  secret: 'notesapp_secret_key_2025',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  secure: !!process.env.VERCEL,
  httpOnly: true,
  sameSite: 'lax'
}));

// ── Static & Page Routes ─────────────────────────
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.get('/dashboard', (req, res) => {
  if (!req.session.userId) return res.redirect('/login.html');
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/profile.html', (req, res) => {
  if (!req.session.userId) return res.redirect('/login.html');
  res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

app.use(express.static(path.join(__dirname, 'public')));

// ── Auth Middleware ──────────────────────────────
function auth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// ── Auth Routes ──────────────────────────────────
app.post('/api/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name?.trim() || !email?.trim() || !password)
      return res.status(400).json({ error: 'All fields are required' });

    const hash = await bcrypt.hash(password, 10);
    const user = await usersDB.insert({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hash,
      created_at: new Date().toISOString()
    });

    req.session.userId = user._id;
    req.session.userName = user.name;
    res.status(201).json({ id: user._id, name: user.name, email: user.email });
  } catch (e) {
    if (e.errorType === 'uniqueViolated')
      return res.status(409).json({ error: 'Email already registered' });
    res.status(500).json({ error: 'Signup failed' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email?.trim() || !password)
      return res.status(400).json({ error: 'Email and password are required' });

    const user = await usersDB.findOne({ email: email.trim().toLowerCase() });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ error: 'Invalid email or password' });

    req.session.userId = user._id;
    req.session.userName = user.name;
    res.json({ id: user._id, name: user.name, email: user.email });
  } catch (e) {
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session = null;
  res.json({ message: 'Logged out' });
});

app.get('/api/me', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' });
  const user = await usersDB.findOne({ _id: req.session.userId });
  if (!user) return res.status(401).json({ error: 'Not logged in' });
  res.json({ id: user._id, name: user.name, email: user.email });
});

// ── Notes Routes ─────────────────────────────────
app.get('/api/notes', auth, async (req, res) => {
  try {
    const { search, category } = req.query;
    let query = { userId: req.session.userId };

    if (category && category !== 'All') query.category = category;

    let notes = await notesDB.find(query).sort({ updated_at: -1 });

    if (search) {
      const s = search.toLowerCase();
      notes = notes.filter(n =>
        n.title.toLowerCase().includes(s) || n.content.toLowerCase().includes(s)
      );
    }
    res.json(notes);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

app.get('/api/notes/:id', auth, async (req, res) => {
  const note = await notesDB.findOne({ _id: req.params.id, userId: req.session.userId });
  if (!note) return res.status(404).json({ error: 'Note not found' });
  res.json(note);
});

app.post('/api/notes', auth, async (req, res) => {
  try {
    const { title, content, category } = req.body;
    if (!title?.trim() || !content?.trim())
      return res.status(400).json({ error: 'Title and content are required' });

    const now = new Date().toISOString();
    const note = await notesDB.insert({
      userId: req.session.userId,
      title: title.trim(),
      content: content.trim(),
      category: category?.trim() || 'General',
      created_at: now,
      updated_at: now
    });
    res.status(201).json(note);
  } catch (e) {
    res.status(500).json({ error: 'Failed to create note' });
  }
});

app.put('/api/notes/:id', auth, async (req, res) => {
  try {
    const { title, content, category } = req.body;
    if (!title?.trim() || !content?.trim())
      return res.status(400).json({ error: 'Title and content are required' });

    const existing = await notesDB.findOne({ _id: req.params.id, userId: req.session.userId });
    if (!existing) return res.status(404).json({ error: 'Note not found' });

    await notesDB.update(
      { _id: req.params.id, userId: req.session.userId },
      { $set: { title: title.trim(), content: content.trim(), category: category?.trim() || 'General', updated_at: new Date().toISOString() } }
    );
    res.json(await notesDB.findOne({ _id: req.params.id }));
  } catch (e) {
    res.status(500).json({ error: 'Failed to update note' });
  }
});

app.delete('/api/notes/:id', auth, async (req, res) => {
  try {
    const existing = await notesDB.findOne({ _id: req.params.id, userId: req.session.userId });
    if (!existing) return res.status(404).json({ error: 'Note not found' });
    await notesDB.remove({ _id: req.params.id, userId: req.session.userId });
    res.json({ message: 'Note deleted' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

app.get('/api/categories', auth, async (req, res) => {
  try {
    const notes = await notesDB.find({ userId: req.session.userId });
    const cats = [...new Set(notes.map(n => n.category))].sort();
    res.json(cats);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// ── Start ────────────────────────────────────────
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
}

module.exports = app;
