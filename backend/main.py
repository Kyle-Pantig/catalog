from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
import logging
from app.core.database import connect_db, disconnect_db
from app.api import auth, catalog, share
from app.services.cleanup import cleanup_expired_share_codes, deactivate_expired_share_codes, run_periodic_cleanup

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Connect to database
    await connect_db()
    
    # Run initial cleanup on startup
    logger.info("Running initial cleanup of expired share codes...")
    await deactivate_expired_share_codes()
    await cleanup_expired_share_codes()
    
    # Start background task for periodic cleanup
    cleanup_task = asyncio.create_task(run_periodic_cleanup())
    logger.info("Started periodic cleanup task (runs every 1 hour)")
    
    yield
    
    # Shutdown: Cancel cleanup task and disconnect from database
    cleanup_task.cancel()
    try:
        await cleanup_task
    except asyncio.CancelledError:
        pass
    await disconnect_db()

app = FastAPI(
    title="Catalog API",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(catalog.router)
app.include_router(share.router)

@app.get("/")
async def root():
    return {"message": "Welcome to Catalog API"}

@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

