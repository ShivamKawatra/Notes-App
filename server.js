const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const session = require('cookie-session');
const mongoose = require('mongoose');

const app = express();

// ── MongoDB Connection ───────────────────────────
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/notes';

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// ── Schemas & Models ─────────────────────────────
const userSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  email:      { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:   { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});

const noteSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:    { type: String, required: true, trim: true },
  content:  { type: String, required: true, trim: true },
  category: { type: String, default: 'General', trim: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const User = mongoose.model('User', userSchema);
const Note = mongoose.model('Note', noteSchema);

// ── Middleware ───────────────────────────────────
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());
app.use(session({
  name: 'notesapp',
  secret: process.env.SESSION_SECRET || 'notesapp_secret_key_2025',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  secure: !!process.env.VERCEL,
  httpOnly: true,
  sameSite: 'none'
}));

// ── Page Routes ──────────────────────────────────
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

    const exists = await User.findOne({ email: email.trim().toLowerCase() });
    if (exists) return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name: name.trim(), email: email.trim().toLowerCase(), password: hash });

    req.session.userId = user._id.toString();
    req.session.userName = user.name;
    res.status(201).json({ id: user._id, name: user.name, email: user.email });
  } catch (e) {
    res.status(500).json({ error: 'Signup failed' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email?.trim() || !password)
      return res.status(400).json({ error: 'Email and password are required' });

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ error: 'Invalid email or password' });

    req.session.userId = user._id.toString();
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
  try {
    const user = await User.findById(req.session.userId).select('-password');
    if (!user) return res.status(401).json({ error: 'Not logged in' });
    res.json({ id: user._id, name: user.name, email: user.email, created_at: user.created_at });
  } catch (e) {
    res.status(401).json({ error: 'Not logged in' });
  }
});

app.get('/api/me/stats', auth, async (req, res) => {
  try {
    const total = await Note.countDocuments({ userId: req.session.userId });
    const cats  = await Note.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.session.userId) } },
      { $group: { _id: '$category', c: { $sum: 1 } } },
      { $sort: { c: -1 } },
      { $project: { category: '$_id', c: 1, _id: 0 } }
    ]);
    const recent = await Note.find({ userId: req.session.userId })
      .sort({ updated_at: -1 }).limit(5).select('title updated_at');
    res.json({ total, categories: cats, recent });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ── Notes Routes ─────────────────────────────────
app.get('/api/notes', auth, async (req, res) => {
  try {
    const { search, category } = req.query;
    const query = { userId: req.session.userId };

    if (category && category !== 'All') query.category = category;
    if (search) query.$or = [
      { title:   { $regex: search, $options: 'i' } },
      { content: { $regex: search, $options: 'i' } }
    ];

    const notes = await Note.find(query).sort({ updated_at: -1 });
    res.json(notes);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

app.get('/api/notes/:id', auth, async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, userId: req.session.userId });
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json(note);
  } catch (e) {
    res.status(404).json({ error: 'Note not found' });
  }
});

app.post('/api/notes', auth, async (req, res) => {
  try {
    const { title, content, category } = req.body;
    if (!title?.trim() || !content?.trim())
      return res.status(400).json({ error: 'Title and content are required' });

    const note = await Note.create({
      userId: req.session.userId,
      title: title.trim(),
      content: content.trim(),
      category: category?.trim() || 'General'
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

    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, userId: req.session.userId },
      { title: title.trim(), content: content.trim(), category: category?.trim() || 'General' },
      { new: true, runValidators: true }
    );
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json(note);
  } catch (e) {
    res.status(500).json({ error: 'Failed to update note' });
  }
});

app.delete('/api/notes/:id', auth, async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({ _id: req.params.id, userId: req.session.userId });
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json({ message: 'Note deleted' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

app.get('/api/categories', auth, async (req, res) => {
  try {
    const cats = await Note.distinct('category', { userId: req.session.userId });
    res.json(cats.sort());
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
