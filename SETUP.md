# Catalog Website - Setup Instructions

## ✅ What's Been Built

### Backend (FastAPI)
- ✅ Prisma schema with User, Catalog, Item, ShareCode models
- ✅ FastAPI routes for authentication, catalogs, items, and share codes
- ✅ Supabase authentication integration
- ✅ Database connection with Prisma
- ✅ Share code generation and validation
- ✅ Image upload support (ready for Supabase Storage)

### Frontend (Next.js)
- ✅ Next.js 16 with App Router
- ✅ Tailwind CSS and shadcn UI components
- ✅ TanStack React Query for data fetching
- ✅ Supabase client setup
- ✅ Login page
- ✅ Dashboard
- ✅ Catalog management pages
- ✅ Share code generation page
- ✅ Public catalog view page (with code)
- ✅ Image upload functionality

## 🚀 Next Steps

### 1. Set Up Supabase Storage Bucket

1. Go to your Supabase dashboard
2. Navigate to Storage
3. Create a new bucket named `catalog-images`
4. Set it to **Public** (or configure RLS policies as needed)

### 2. Run Database Migrations

```bash
cd backend
source venv/Scripts/activate  # Windows
# or
source venv/bin/activate  # Linux/Mac

# Run migrations
prisma migrate dev --name init

# Generate Prisma client
prisma generate
```

### 3. Create a User in Supabase

Since there's no public registration:
1. Go to Supabase Dashboard → Authentication → Users
2. Create a new user manually
3. Note the email and password for login

### 4. Start the Backend

```bash
cd backend
source venv/Scripts/activate  # Windows
uvicorn main:app --reload
```

Backend will run at `http://localhost:8000`
API docs at `http://localhost:8000/docs`

### 5. Start the Frontend

```bash
cd frontend
npm run dev
```

Frontend will run at `http://localhost:3000`

## 📁 Project Structure

```
catalog/
├── frontend/
│   ├── app/
│   │   ├── (auth)/login/      # Login page
│   │   ├── dashboard/         # Owner dashboard
│   │   │   ├── catalogs/      # Catalog management
│   │   │   └── share/         # Share code management
│   │   └── view/[code]/       # Public catalog view
│   ├── components/ui/         # shadcn UI components
│   ├── lib/
│   │   ├── api.ts             # API client
│   │   ├── supabase.ts        # Supabase client
│   │   └── storage.ts         # Image upload
│   └── .env.local             # Frontend env vars
│
└── backend/
    ├── app/
    │   ├── api/               # API routes
    │   ├── core/              # Config, security, DB
    │   ├── models/            # Pydantic schemas
    │   └── utils/             # Utilities
    ├── prisma/
    │   └── schema.prisma      # Database schema
    └── .env                   # Backend env vars
```

## 🔑 Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Backend (.env)
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DATABASE_URL=your_database_url
DIRECT_URL=your_direct_url
```

## 🎯 Features

### Owner Features
- ✅ Login with Supabase Auth
- ✅ Create catalogs
- ✅ Add items to catalogs
- ✅ Upload product images
- ✅ Generate share codes
- ✅ Delete catalogs
- ✅ View all catalogs

### Viewer Features
- ✅ Enter share code to view catalog
- ✅ View catalog items with images
- ✅ See product prices

## 🔒 Security

- ✅ No public catalog access
- ✅ Share code validation
- ✅ Owner-only mutations
- ✅ JWT token authentication
- ✅ CORS configured for frontend

## 📝 API Endpoints

### Auth
- `POST /auth/login` - Login with email/password

### Catalogs (Owner only)
- `POST /catalog` - Create catalog
- `GET /catalog/my` - Get my catalogs
- `DELETE /catalog/{id}` - Delete catalog
- `POST /catalog/{id}/items` - Add item to catalog
- `GET /catalog/view/{code}` - View catalog by code (public)

### Share Codes
- `POST /share/catalog/{id}` - Generate share code
- `GET /share/validate/{code}` - Validate share code

## 🐛 Troubleshooting

### Database Connection Issues
- Check your `.env` file has correct `DATABASE_URL` and `DIRECT_URL`
- Ensure Supabase database is running
- Run `prisma generate` after schema changes

### Image Upload Issues
- Ensure `catalog-images` bucket exists in Supabase Storage
- Check bucket is set to Public or has proper RLS policies
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set

### Authentication Issues
- Verify Supabase credentials in `.env` files
- Check user exists in Supabase Auth
- Ensure JWT token is being stored in localStorage

## 🎨 UI Components Used

- Button
- Card
- Input
- Dialog
- Table
- Sonner (toast notifications)
- Dropdown Menu

All components from shadcn/ui are ready to use!

