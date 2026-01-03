import asyncio
from datetime import timedelta
from app.core.database import prisma
from app.utils.timezone import get_ph_time_utc
import logging

logger = logging.getLogger(__name__)

# Grace period: Delete expired codes 7 days after expiration
GRACE_PERIOD_DAYS = 7


async def deactivate_expired_share_codes():
    """Deactivate share codes that have expired (as a safety measure)"""
    try:
        current_time = get_ph_time_utc()
        
        # Find all active share codes that have expired
        all_codes = await prisma.sharecode.find_many(
            where={
                "isActive": True,
                "expiresAt": {
                    "not": None
                }
            }
        )
        
        # Filter and deactivate expired codes
        deactivated_count = 0
        for code in all_codes:
            if code.expiresAt:
                expires_at = code.expiresAt
                # Ensure naive datetime for comparison
                if expires_at.tzinfo is not None:
                    expires_at = expires_at.replace(tzinfo=None)
                
                # If expired, deactivate it
                if expires_at < current_time:
                    try:
                        await prisma.sharecode.update(
                            where={"id": code.id},
                            data={"isActive": False}
                        )
                        deactivated_count += 1
                    except Exception as e:
                        logger.warning(f"Failed to deactivate share code {code.id}: {str(e)}")
        
        if deactivated_count > 0:
            logger.info(f"Deactivated {deactivated_count} expired share codes")
        
        return deactivated_count
    except Exception as e:
        logger.error(f"Error deactivating expired share codes: {str(e)}")
        return 0


async def cleanup_expired_share_codes():
    """Delete share codes that expired more than GRACE_PERIOD_DAYS ago"""
    try:
        # Calculate the cutoff date: codes expired before this date should be deleted
        cutoff_date = get_ph_time_utc() - timedelta(days=GRACE_PERIOD_DAYS)
        
        # Find all expired share codes that are older than the grace period
        # Note: Prisma Python may need the date comparison differently
        # We'll fetch all codes with expiresAt and filter in Python
        all_codes = await prisma.sharecode.find_many(
            where={
                "expiresAt": {
                    "not": None
                }
            }
        )
        
        # Filter codes that expired before cutoff_date
        expired_codes = []
        for code in all_codes:
            if code.expiresAt:
                expires_at = code.expiresAt
                # Ensure naive datetime for comparison
                if expires_at.tzinfo is not None:
                    expires_at = expires_at.replace(tzinfo=None)
                if expires_at < cutoff_date:
                    expired_codes.append(code)
        
        if expired_codes:
            # Delete expired codes one by one (Prisma Python doesn't support complex where in delete_many)
            deleted_count = 0
            for code in expired_codes:
                try:
                    await prisma.sharecode.delete(where={"id": code.id})
                    deleted_count += 1
                except Exception as e:
                    logger.warning(f"Failed to delete share code {code.id}: {str(e)}")
            
            logger.info(f"Cleaned up {deleted_count} expired share codes (expired before {cutoff_date})")
            return deleted_count
        else:
            logger.debug("No expired share codes to clean up")
            return 0
    except Exception as e:
        logger.error(f"Error cleaning up expired share codes: {str(e)}")
        return 0


async def run_periodic_cleanup():
    """Run cleanup task periodically (every 1 hour)"""
    while True:
        try:
            await asyncio.sleep(60 * 60)  # Wait 1 hour
            # First deactivate expired codes, then delete old ones
            await deactivate_expired_share_codes()
            await cleanup_expired_share_codes()
        except Exception as e:
            logger.error(f"Error in periodic cleanup task: {str(e)}")
            await asyncio.sleep(60)  # Wait 1 minute before retrying

