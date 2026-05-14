# Notes Management Webpage

A full stack notes management web application with user authentication, personal dashboards, and persistent SQL storage.

## Features

- **Authentication** — Signup & Login with session-based auth
- **Password Validation** — Min 8 characters, 1 uppercase letter, 1 number (live feedback)
- **User Dashboard** — Each user sees only their own notes
- **CRUD Notes** — Create, Read, Update, Delete notes
- **Search** — Real-time search by title or content
- **Categories** — Filter notes by category (General, Work, Personal, Ideas, Todo)
- **Persistent Storage** — Notes stored per user in SQLite database
- **Responsive UI** — Dark theme with Inter font, navbar & footer on every page

## Tech Stack

- **Frontend** — HTML5, CSS3 (Inter font, CSS variables), Vanilla JavaScript
- **Backend** — Node.js, Express.js
- **Database** — SQLite via sql.js (pure JavaScript, no native build tools needed)
- **Auth** — bcryptjs (password hashing), cookie-session (session management)

## Project Structure

```
Notes Management Webpage/
├── server.js              # Express server, REST API, auth routes
├── package.json
├── vercel.json            # Vercel deployment config
├── notes.db               # SQLite database (auto-created on first run)
└── public/
    ├── index.html         # Landing page (public)
    ├── login.html         # Login page
    ├── signup.html        # Signup page with live password validation
    ├── dashboard.html     # Notes dashboard (protected, requires login)
    ├── style.css          # Shared styles (dark theme, auth forms, layout)
    └── app.js             # Frontend JS (CRUD, auth check, search, filter)
```

## Installation & Setup

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000)

## Deployment (Vercel)

- Add `VERCEL=true` in Vercel Environment Variables
- Push to GitHub — Vercel auto-deploys via `vercel.json`

## Pages

| Page       | Route            | Access    |
|------------|------------------|-----------|
| Landing    | /                | Public    |
| Login      | /login.html      | Public    |
| Signup     | /signup.html     | Public    |
| Dashboard  | /dashboard       | Auth only |

Unauthenticated users are automatically redirected to `/login.html`.

## API Endpoints

### Auth
| Method | Route          | Description               |
|--------|----------------|---------------------------|
| POST   | /api/signup    | Register new user         |
| POST   | /api/login     | Login, starts session     |
| POST   | /api/logout    | Destroy session           |
| GET    | /api/me        | Get current session user  |

### Notes (requires login)
| Method | Route           | Description                      |
|--------|-----------------|----------------------------------|
| GET    | /api/notes      | Get user's notes (search/filter) |
| GET    | /api/notes/:id  | Get single note                  |
| POST   | /api/notes      | Create note                      |
| PUT    | /api/notes/:id  | Update note                      |
| DELETE | /api/notes/:id  | Delete note                      |
| GET    | /api/categories | Get user's categories            |

## Password Rules

- Minimum 8 characters
- At least 1 uppercase letter (A-Z)
- At least 1 number (0-9)
- Live feedback shown during signup

## Database Schema

```sql
CREATE TABLE users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  email      TEXT UNIQUE NOT NULL,
  password   TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE notes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL,
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  category   TEXT DEFAULT 'General',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(user_id) REFERENCES users(id)
);
```

## Author

**Shivam Kawatra**
- GitHub: [@ShivamKawatra](https://github.com/ShivamKawatra)
