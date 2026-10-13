# Trakway

| Folder | App | Stack | Dev URL |
| --- | --- | --- | --- |
| `api` | Backend API | Node + Express 5 + PostgreSQL | http://localhost:5000 |
| `admin` | Admin panel | Angular 21 | http://localhost:4200 |
| `web` | Public website | Next.js 16 | http://localhost:3000 |

## Prerequisites

- Node.js 22 (`nvm use` reads `.nvmrc`)
- PostgreSQL running locally (default `localhost:5432`)

## First-time setup

```bash
# 1. Install dependencies for root + all three apps
npm install
npm run install:all

# 2. Environment files
cp api/.env.example api/.env              # fill in DB_PASSWORD, JWT_SECRET
cp web/.env.local.example web/.env.local

# 3. Database
createdb trakway          # or create it in pgAdmin
npm run db:migrate
npm run db:seed           # creates the first admin user
```

## Running

```bash
npm run dev               # api + admin + web together
npm run dev:api           # or one at a time
npm run dev:admin
npm run dev:web
```

## VS Code

Open `trakway.code-workspace` (**File → Open Workspace from File**). It gives you:

- one folder per app, each with its own TypeScript/ESLint context
- tasks (**Terminal → Run Task**): `dev: all` (also `Ctrl+Shift+B`), `dev: api`, `dev: admin`, `dev: web`, `db: migrate`, `db: seed admin`, `install: all`
- debug configs: `api: debug`, `web: debug server`, `admin: open in Chrome`
- recommended extensions
