# Deployment Guide

This guide covers deploying the Catalog application with:
- **Frontend** → Vercel
- **Backend** → Render.com

## Frontend Deployment (Vercel)

### Step 1: Connect Repository
1. Go to [Vercel](https://vercel.com) and sign in
2. Click "Add New Project"
3. Import your GitHub repository: `Kyle-Pantig/catalog`

### Step 2: Configure Project Settings
**Important:** Set the **Root Directory** to `frontend`

In Vercel project settings:
- **Root Directory**: `frontend`
- **Framework Preset**: Next.js (auto-detected)
- **Build Command**: `npm run build` (default)
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install` (default)

### Step 3: Environment Variables
Add these environment variables in Vercel:

```
NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com
```

Replace `your-backend-url.onrender.com` with your actual Render.com backend URL.

### Step 4: Deploy
Click "Deploy" and Vercel will build and deploy your frontend.

---

## Backend Deployment (Railway)

### Step 1: Connect Repository
1. Go to [Railway](https://railway.app) and sign in
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository: `Kyle-Pantig/catalog`

### Step 2: Configure Service
Railway will automatically detect the Dockerfile in the `backend` directory.

**Important Settings:**
- **Root Directory**: Set to `backend` in the service settings
- Railway will automatically use the `Dockerfile` for building

### Step 3: Add PostgreSQL Database
1. In your Railway project, click "New" → "Database" → "Add PostgreSQL"
2. Railway will automatically create a PostgreSQL database
3. The `DATABASE_URL` environment variable will be automatically set

### Step 4: Environment Variables
Add these environment variables in Railway (Settings → Variables):

```
JWT_SECRET=your_jwt_secret_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_STORAGE_BUCKET=your_bucket_name
CORS_ORIGINS=https://your-vercel-app.vercel.app,http://localhost:3000
```

**Note:** 
- `DATABASE_URL` is automatically provided by Railway's PostgreSQL service
- Replace `your-vercel-app.vercel.app` with your actual Vercel frontend URL
- You can add multiple origins separated by commas
- Generate a secure `JWT_SECRET` (random string)
- Get Supabase credentials from your Supabase project

### Step 5: Run Database Migrations
After the first deployment, you need to run Prisma migrations:

**Option 1: Automatic on Startup (Recommended)**
1. In Railway, go to your service → Variables
2. Add a new variable: `RUN_MIGRATIONS=true`
3. Redeploy the service
4. Migrations will run automatically on startup

**Option 2: Using Railway CLI**
```bash
railway login
railway link
railway run prisma migrate deploy
```

**Option 3: One-time via Railway Dashboard**
1. Go to your service → Deployments
2. Click on a deployment → View Logs
3. Use the shell/terminal feature to run: `prisma migrate deploy`

**Note:** After the first migration, you can remove `RUN_MIGRATIONS=true` or set it to `false` to skip migrations on subsequent deployments.

### Step 6: Deploy
Railway will automatically:
1. Detect the Dockerfile
2. Build the Docker image
3. Deploy the container
4. Expose the service on a public URL

Your backend will be available at: `https://your-service-name.up.railway.app`

---

## Post-Deployment Checklist

### Frontend (Vercel)
- [ ] Verify `NEXT_PUBLIC_API_URL` points to your Render backend URL
- [ ] Test login functionality
- [ ] Test catalog creation
- [ ] Test share code generation and viewing

### Backend (Railway)
- [ ] Verify all environment variables are set
- [ ] Check database connection (DATABASE_URL is auto-set by Railway)
- [ ] Verify Prisma migrations ran successfully
- [ ] Test API endpoints
- [ ] Verify CORS settings allow requests from Vercel domain

### CORS Configuration
CORS is now configured via the `CORS_ORIGINS` environment variable. Make sure to set it in Render with your Vercel domain:

```
CORS_ORIGINS=https://your-vercel-app.vercel.app,http://localhost:3000
```

The backend will automatically allow requests from all origins listed in this variable (comma-separated).

---

## URLs After Deployment

- **Frontend**: `https://your-app.vercel.app`
- **Backend**: `https://your-service-name.up.railway.app`

Update the frontend's `NEXT_PUBLIC_API_URL` to match your Railway backend URL.

---

## Troubleshooting

### Frontend Issues
- **Build fails**: Check that Root Directory is set to `frontend`
- **API calls fail**: Verify `NEXT_PUBLIC_API_URL` is correct
- **Environment variables not working**: Ensure they start with `NEXT_PUBLIC_` for client-side access

### Backend Issues
- **Database connection fails**: Railway automatically sets `DATABASE_URL`, but verify it's connected
- **Prisma errors**: 
  - Run `prisma generate` (already in Dockerfile)
  - Run `prisma migrate deploy` via Railway CLI or add to Dockerfile
- **CORS errors**: Update `CORS_ORIGINS` environment variable to include your Vercel domain
- **Docker build fails**: Check that Root Directory is set to `backend` in Railway settings

---

## Local Development

For local development, create a `.env.local` file in the `frontend` directory:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

And a `.env` file in the `backend` directory with your local environment variables.

