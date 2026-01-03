import secrets
import string


def generate_share_code(length: int = 8) -> str:
    """
    Generate a random share code
    """
    alphabet = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))

