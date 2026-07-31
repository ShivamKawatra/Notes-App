# Notes App

A Full Stack Notes Management Web Application with user authentication, personal dashboards, profile management, and persistent MongoDB storage via Mongoose.

## Features

- **Authentication** — Signup & Login with session-based auth (express-session + MongoStore)
- **Password Validation** — Min 8 characters, 1 uppercase letter, 1 number (live feedback on signup)
- **User Dashboard** — Each user sees only their own notes
- **CRUD Notes** — Create, Read, Update, Delete notes
- **Search** — Real-time full-text search by title or content
- **Categories** — Filter notes by category (General, Work, Personal, Ideas, Todo)
- **Persistent Storage** — Notes, users, and sessions stored in MongoDB via Mongoose
- **Profile Page** — Shows avatar, user info, total notes, category breakdown, recent activity
- **Avatar Upload** — Upload PNG/JPG profile picture (stored as base64, max 2MB)
- **Account Settings** — Edit display name and change password (bcrypt verified) on a dedicated page
- **Responsive UI** — Mobile-friendly dark theme with Inter font, navbar & footer on every page

## Tech Stack

- **Frontend** — HTML5, CSS3 (Inter font, CSS variables), Vanilla JavaScript
- **Backend** — Node.js, Express.js
- **Database** — MongoDB with Mongoose ODM
- **Auth** — bcryptjs (password hashing), express-session + connect-mongo (session management)
- **File Upload** — multer (memory storage, base64 encoding)

## Project Structure

```
Notes Management Webpage/
├── server.js              # Express server, REST API, Mongoose models
├── package.json
├── vercel.json            # Vercel deployment config
├── .env.example           # Environment variable reference
└── public/
    ├── index.html         # Landing page (public)
    ├── login.html         # Login page
    ├── signup.html        # Signup page with live password validation
    ├── dashboard.html     # Notes dashboard (protected)
    ├── profile.html       # User profile & stats (protected)
    ├── settings.html      # Edit name & change password (protected)
    ├── style.css          # Shared styles
    └── app.js             # Frontend JS (CRUD, auth, search, filter)
```

## Installation & Setup

```bash
npm install
```

Create a `.env` file:
```env
MONGO_URI=mongodb://localhost:27017/notes
SESSION_SECRET=your_secret_key_here
```

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000)

## Deployment (Vercel)

Add these in Vercel → Settings → Environment Variables:
- `MONGO_URI` — MongoDB Atlas connection string
- `SESSION_SECRET` — any random secret string
- `VERCEL` — `true`

## Pages

| Page             | Route            | Access    |
|------------------|------------------|-----------|
| Landing          | /                | Public    |
| Login            | /login.html      | Public    |
| Signup           | /signup.html     | Public    |
| Dashboard        | /dashboard       | Auth only |
| Profile          | /profile.html    | Auth only |
| Account Settings | /settings.html   | Auth only |

## API Endpoints

### Auth
| Method | Route              | Description                    |
|--------|--------------------|--------------------------------|
| POST   | /api/signup        | Register new user              |
| POST   | /api/login         | Login, starts session          |
| POST   | /api/logout        | Destroy session                |
| GET    | /api/me            | Get current user info          |
| GET    | /api/me/stats      | Get notes stats for user       |
| PUT    | /api/me/name       | Update display name            |
| PUT    | /api/me/password   | Change password (bcrypt verify)|
| POST   | /api/me/avatar     | Upload profile picture         |

### Notes (requires login)
| Method | Route           | Description                      |
|--------|-----------------|----------------------------------|
| GET    | /api/notes      | Get user's notes (search/filter) |
| GET    | /api/notes/:id  | Get single note                  |
| POST   | /api/notes      | Create note                      |
| PUT    | /api/notes/:id  | Update note                      |
| DELETE | /api/notes/:id  | Delete note                      |
| GET    | /api/categories | Get user's distinct categories   |

## Password Rules

- Minimum 8 characters
- At least 1 uppercase letter (A-Z)
- At least 1 number (0-9)
- Live feedback shown during signup
- Current password required to change password

## MongoDB Schema

```js
// User
{
  name:       String (required),
  email:      String (required, unique),
  password:   String (required, bcrypt hashed),
  avatar:     String (base64 image, optional),
  created_at: Date
}

// Note
{
  userId:     ObjectId (ref: User, required),
  title:      String (required),
  content:    String (required),
  category:   String (default: 'General'),
  created_at: Date (auto),
  updated_at: Date (auto)
}
```

## Author

**Shivam Kawatra**
- GitHub: [@ShivamKawatra](https://github.com/ShivamKawatra)
