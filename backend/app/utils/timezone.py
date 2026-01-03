from datetime import datetime, timedelta
import pytz

# Philippines timezone (UTC+8)
PH_TIMEZONE = pytz.timezone("Asia/Manila")
UTC_TIMEZONE = pytz.UTC


def get_ph_time() -> datetime:
    """Get current time in Philippines timezone"""
    return datetime.now(PH_TIMEZONE)


def get_ph_time_utc() -> datetime:
    """Get current time in Philippines timezone, converted to UTC for database storage"""
    ph_time = get_ph_time()
    # Convert to UTC (database stores in UTC)
    return ph_time.astimezone(UTC_TIMEZONE).replace(tzinfo=None)


def ph_time_to_utc(dt: datetime) -> datetime:
    """Convert a Philippines timezone datetime to UTC (for database storage)"""
    if dt.tzinfo is None:
        # Assume it's already in PH timezone if no timezone info
        dt = PH_TIMEZONE.localize(dt)
    return dt.astimezone(UTC_TIMEZONE).replace(tzinfo=None)


def utc_to_ph_time(dt: datetime) -> datetime:
    """Convert a UTC datetime (from database) to Philippines timezone"""
    if dt.tzinfo is None:
        # Assume it's UTC if no timezone info
        dt = UTC_TIMEZONE.localize(dt)
    return dt.astimezone(PH_TIMEZONE)

