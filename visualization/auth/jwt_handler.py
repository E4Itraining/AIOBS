"""
JWT Token Handler
Create and verify JWT tokens using PyJWT
"""

import logging
import hashlib
import hmac
import json
import base64
from datetime import datetime, timedelta
from typing import Optional
from uuid import uuid4

# Pure Python token handling (no external JWT library needed)
# This provides basic token functionality for development/demo
# In production, use PyJWT with proper cryptography support
HAVE_JWT = False

from .config import get_auth_settings
from .models import TokenData, User, UserInDB, UserRole, DEMO_USERS

logger = logging.getLogger("aiobs.auth")

# In-memory user store (replace with database in production)
_users_db: dict[str, UserInDB] = {}


def _init_demo_users():
    """Initialize demo users with hashed passwords"""
    global _users_db
    if _users_db:
        return

    for email, user_data in DEMO_USERS.items():
        hashed = get_password_hash(user_data["password"])
        _users_db[email] = UserInDB(
            id=user_data["id"],
            email=user_data["email"],
            full_name=user_data["full_name"],
            roles=user_data["roles"],
            hashed_password=hashed,
            provider="local",
        )
    logger.info(f"Initialized {len(_users_db)} demo users")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return hashed_password == hashlib.sha256(plain_password.encode()).hexdigest()


def get_password_hash(password: str) -> str:
    """Hash a password using SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()


def get_user_by_email(email: str) -> Optional[UserInDB]:
    """Get user by email from database"""
    _init_demo_users()
    return _users_db.get(email)


def authenticate_user(email: str, password: str) -> Optional[User]:
    """Authenticate user with email and password"""
    user = get_user_by_email(email)
    if not user:
        logger.warning(f"Authentication failed: user not found - {email}")
        return None
    if not verify_password(password, user.hashed_password):
        logger.warning(f"Authentication failed: invalid password - {email}")
        return None
    logger.info(f"User authenticated successfully: {email}")
    return User(**user.model_dump(exclude={"hashed_password"}))


def create_access_token(
    user: User,
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create JWT access token"""
    settings = get_auth_settings()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)

    payload = {
        "sub": user.id,
        "email": user.email,
        "roles": [r.value if isinstance(r, UserRole) else r for r in user.roles],
        "exp": expire,
        "iat": datetime.utcnow(),
        "jti": str(uuid4()),
    }

    # Simple token encoding (for dev/demo - use proper JWT library in production)
    payload["exp"] = expire.isoformat()
    payload["iat"] = datetime.utcnow().isoformat()
    payload_str = json.dumps(payload)
    # Add HMAC signature for basic security
    secret = settings.jwt_secret.get_secret_value()
    signature = hmac.new(secret.encode(), payload_str.encode(), hashlib.sha256).hexdigest()[:16]
    encoded_jwt = base64.urlsafe_b64encode(f"{payload_str}|{signature}".encode()).decode()

    return encoded_jwt


def create_refresh_token(user: User) -> str:
    """Create JWT refresh token"""
    settings = get_auth_settings()
    expire = datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days)

    payload = {
        "sub": user.id,
        "email": user.email,
        "type": "refresh",
        "exp": expire,
        "iat": datetime.utcnow(),
        "jti": str(uuid4()),
    }

    # Simple token encoding
    payload["exp"] = expire.isoformat()
    payload["iat"] = datetime.utcnow().isoformat()
    payload_str = json.dumps(payload)
    secret = settings.jwt_secret.get_secret_value()
    signature = hmac.new(secret.encode(), payload_str.encode(), hashlib.sha256).hexdigest()[:16]
    encoded_jwt = base64.urlsafe_b64encode(f"{payload_str}|{signature}".encode()).decode()

    return encoded_jwt


def verify_token(token: str) -> Optional[TokenData]:
    """Verify and decode JWT token"""
    settings = get_auth_settings()

    try:
        # Decode and verify token
        decoded = base64.urlsafe_b64decode(token.encode()).decode()
        if "|" in decoded:
            payload_str, signature = decoded.rsplit("|", 1)
            # Verify signature
            secret = settings.jwt_secret.get_secret_value()
            expected_sig = hmac.new(secret.encode(), payload_str.encode(), hashlib.sha256).hexdigest()[:16]
            if not hmac.compare_digest(signature, expected_sig):
                logger.warning("Token verification failed: invalid signature")
                return None
            payload = json.loads(payload_str)
        else:
            payload = json.loads(decoded)

        token_data = TokenData(
            sub=payload.get("sub", ""),
            email=payload.get("email", ""),
            roles=payload.get("roles", []),
            exp=payload.get("exp"),
            iat=payload.get("iat"),
            jti=payload.get("jti"),
        )

        if not token_data.sub:
            logger.warning("Token verification failed: missing subject")
            return None

        return token_data

    except Exception as e:
        logger.warning(f"Token verification failed: {e}")
        return None


def get_user_from_token(token_data: TokenData) -> Optional[User]:
    """Get user from token data"""
    user_db = get_user_by_email(token_data.email)
    if user_db:
        return User(**user_db.model_dump(exclude={"hashed_password"}))

    # For OAuth2 users not in local DB, create user object from token
    return User(
        id=token_data.sub,
        email=token_data.email,
        roles=[UserRole(r) for r in token_data.roles if r in [e.value for e in UserRole]],
        provider="oauth2",
    )


# Token revocation (in-memory, use Redis in production)
_revoked_tokens: set[str] = set()


def revoke_token(jti: str) -> None:
    """Revoke a token by its JTI"""
    _revoked_tokens.add(jti)
    logger.info(f"Token revoked: {jti}")


def is_token_revoked(jti: str) -> bool:
    """Check if a token is revoked"""
    return jti in _revoked_tokens
