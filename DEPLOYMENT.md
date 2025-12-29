# PhysioHelper React - Deployment Guide

## Deploy to Vercel with PostgreSQL

### 1. Set Up Database (Choose One)

#### Option A: Vercel Postgres (Easiest)
1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Create new project from your GitHub repo
3. Go to Storage tab → Create Database → Postgres
4. Vercel automatically adds `DATABASE_URL` to environment variables

#### Option B: Neon (More Generous Free Tier)
1. Go to [neon.tech](https://neon.tech) and create free account
2. Create new project
3. Copy the connection string
4. In Vercel project settings → Environment Variables:
   - Add `DATABASE_URL` = `your-neon-connection-string`

#### Option C: Supabase (Alternative)
1. Go to [supabase.com](https://supabase.com) and create project
2. Get connection string from Settings → Database → Connection string (Transaction mode)
3. Add to Vercel environment variables

### 2. Push Code to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

### 3. Deploy to Vercel
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Vercel auto-detects Next.js
4. Add environment variable `DATABASE_URL` (if not using Vercel Postgres)
5. Click Deploy

### 4. Run Database Migration
After first deployment:
1. Go to Vercel project → Settings → Environment Variables
2. Ensure `DATABASE_URL` is set
3. Vercel will automatically run migrations on next deployment

Alternatively, run manually from your terminal:
```bash
# Install Vercel CLI
npm i -g vercel

# Link to your project
vercel link

# Run migration
vercel env pull .env.production
DATABASE_URL="your-production-url" npx prisma migrate deploy
```

### 5. Create Initial Exercises
After deployment, visit your site and create exercises through the UI, or use Prisma Studio:
```bash
npx prisma studio --schema=./prisma/schema.prisma
```

## Local Development with PostgreSQL

If you want to test with PostgreSQL locally:

1. Install PostgreSQL or use Docker:
```bash
docker run --name physio-postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres
```

2. Update `.env`:
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/physiohelper?schema=public"
```

3. Run migration:
```bash
npx prisma migrate dev --name init
```

## Switching Back to SQLite (Local Dev)

Update `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

Update `.env`:
```
DATABASE_URL="file:./dev.db"
```

Run:
```bash
npx prisma db push
```
