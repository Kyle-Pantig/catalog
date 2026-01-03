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

## Backend Deployment (Render.com)

### Step 1: Connect Repository
1. Go to [Render.com](https://render.com) and sign in
2. Click "New +" → "Web Service"
3. Connect your GitHub repository: `Kyle-Pantig/catalog`

### Step 2: Configure Service Settings
- **Name**: `catalog-backend` (or your preferred name)
- **Root Directory**: `backend`
- **Environment**: `Python 3`
- **Build Command**: 
  ```bash
  pip install -r requirements.txt && prisma generate
  ```
- **Start Command**: 
  ```bash
  uvicorn main:app --host 0.0.0.0 --port $PORT
  ```

### Step 3: Environment Variables
Add these environment variables in Render:

```
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_jwt_secret_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_STORAGE_BUCKET=your_bucket_name
CORS_ORIGINS=https://your-vercel-app.vercel.app,http://localhost:3000
```

**Note:** Replace `your-vercel-app.vercel.app` with your actual Vercel frontend URL. You can add multiple origins separated by commas.

**Important Notes:**
- Get `DATABASE_URL` from Render's PostgreSQL database (or your own)
- Generate a secure `JWT_SECRET` (random string)
- Get Supabase credentials from your Supabase project

### Step 4: Database Setup
1. In Render, create a PostgreSQL database
2. Copy the connection string to `DATABASE_URL`
3. Run migrations:
   ```bash
   cd backend
   prisma migrate deploy
   ```

### Step 5: Deploy
Click "Create Web Service" and Render will deploy your backend.

---

## Post-Deployment Checklist

### Frontend (Vercel)
- [ ] Verify `NEXT_PUBLIC_API_URL` points to your Render backend URL
- [ ] Test login functionality
- [ ] Test catalog creation
- [ ] Test share code generation and viewing

### Backend (Render.com)
- [ ] Verify all environment variables are set
- [ ] Check database connection
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
- **Backend**: `https://your-backend.onrender.com`

Update the frontend's `NEXT_PUBLIC_API_URL` to match your backend URL.

---

## Troubleshooting

### Frontend Issues
- **Build fails**: Check that Root Directory is set to `frontend`
- **API calls fail**: Verify `NEXT_PUBLIC_API_URL` is correct
- **Environment variables not working**: Ensure they start with `NEXT_PUBLIC_` for client-side access

### Backend Issues
- **Database connection fails**: Verify `DATABASE_URL` is correct
- **Prisma errors**: Run `prisma generate` and `prisma migrate deploy`
- **CORS errors**: Update CORS settings to include your Vercel domain

---

## Local Development

For local development, create a `.env.local` file in the `frontend` directory:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

And a `.env` file in the `backend` directory with your local environment variables.

