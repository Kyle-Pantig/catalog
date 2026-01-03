# Catalog Backend

FastAPI backend with Prisma ORM.

## Setup

1. Create a virtual environment (if not already created):
   ```bash
   python -m venv venv
   ```

2. Activate the virtual environment:
   - Windows: `venv\Scripts\activate`
   - Linux/Mac: `source venv/bin/activate`

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up your database:
   - Update the `DATABASE_URL` in `.env` file (create it from `.env.example`)
   - Run migrations: `prisma migrate dev`
   - Generate Prisma client: `prisma generate`

5. Run the server:
   ```bash
   uvicorn main:app --reload
   ```

The API will be available at `http://localhost:8000`

## API Documentation

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

