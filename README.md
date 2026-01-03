# Catalog Project

A full-stack application with Next.js frontend and FastAPI backend.

## Project Structure

```
catalog/
├── frontend/          # Next.js application with shadcn UI and Tailwind CSS
│   ├── app/          # Next.js app directory
│   ├── components/   # React components
│   └── lib/          # Utility functions
│
└── backend/          # FastAPI application with Prisma ORM
    ├── prisma/       # Prisma schema and migrations
    └── main.py       # FastAPI application entry point
```

## Getting Started

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

The frontend will be available at `http://localhost:3000`

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # Windows
   venv\Scripts\activate
   # Linux/Mac
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up your database:
   - Create a `.env` file from `.env.example`
   - Update the `DATABASE_URL` with your database credentials
   - Run migrations: `prisma migrate dev`
   - Generate Prisma client: `prisma generate`

5. Run the server:
   ```bash
   uvicorn main:app --reload
   ```

The backend API will be available at `http://localhost:8000`
API documentation: `http://localhost:8000/docs`

## Tech Stack

### Frontend
- **Next.js** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn UI** - UI component library

### Backend
- **FastAPI** - Python web framework
- **Prisma** - ORM for database management
- **Uvicorn** - ASGI server
- **PostgreSQL** - Database (configure in `.env`)

