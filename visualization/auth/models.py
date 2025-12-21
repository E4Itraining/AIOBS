"""
Authentication Models
User, Token, and Role definitions
"""

from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field


class UserRole(str, Enum):
    """User roles for RBAC"""
    ADMIN = "admin"
    ML_ENGINEER = "ml_engineer"
    DEVOPS = "devops"
    DATA_SCIENTIST = "data_scientist"
    PRODUCT_OWNER = "product_owner"
    EXECUTIVE = "executive"
    SECURITY_ANALYST = "security_analyst"
    COMPLIANCE_OFFICER = "compliance_officer"
    ESG_MANAGER = "esg_manager"
    DPO = "dpo"
    LEGAL = "legal"
    VIEWER = "viewer"


class UserBase(BaseModel):
    """Base user model"""
    email: EmailStr
    full_name: str = ""
    roles: List[UserRole] = Field(default_factory=lambda: [UserRole.VIEWER])
    is_active: bool = True


class UserCreate(UserBase):
    """User creation model"""
    password: str = Field(min_length=8)


class User(UserBase):
    """Full user model"""
    id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None
    provider: str = "local"  # local, google, azure, keycloak

    class Config:
        from_attributes = True


class UserInDB(User):
    """User model with hashed password (internal use only)"""
    hashed_password: str


class Token(BaseModel):
    """OAuth2 token response"""
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    expires_in: int  # seconds


class TokenData(BaseModel):
    """JWT token payload data"""
    sub: str  # user_id
    email: str
    roles: List[str] = Field(default_factory=list)
    exp: Optional[datetime] = None
    iat: Optional[datetime] = None
    jti: Optional[str] = None  # JWT ID for revocation


class LoginRequest(BaseModel):
    """Login request body"""
    email: EmailStr
    password: str


class RefreshTokenRequest(BaseModel):
    """Refresh token request"""
    refresh_token: str


class OAuth2AuthorizeResponse(BaseModel):
    """OAuth2 authorization redirect response"""
    authorization_url: str
    state: str


class PasswordChangeRequest(BaseModel):
    """Password change request"""
    current_password: str
    new_password: str = Field(min_length=8)


# Demo users for development (passwords are hashed in jwt_handler)
DEMO_USERS = {
    "admin@aiobs.io": {
        "id": "user-admin-001",
        "email": "admin@aiobs.io",
        "full_name": "AIOBS Admin",
        "roles": [UserRole.ADMIN],
        "password": "admin123456",  # Will be hashed
    },
    "engineer@aiobs.io": {
        "id": "user-eng-001",
        "email": "engineer@aiobs.io",
        "full_name": "ML Engineer",
        "roles": [UserRole.ML_ENGINEER, UserRole.DATA_SCIENTIST],
        "password": "engineer123",
    },
    "executive@aiobs.io": {
        "id": "user-exec-001",
        "email": "executive@aiobs.io",
        "full_name": "Executive User",
        "roles": [UserRole.EXECUTIVE, UserRole.VIEWER],
        "password": "executive123",
    },
    "compliance@aiobs.io": {
        "id": "user-compliance-001",
        "email": "compliance@aiobs.io",
        "full_name": "Compliance Officer",
        "roles": [UserRole.COMPLIANCE_OFFICER, UserRole.DPO],
        "password": "compliance123",
    },
    "demo@aiobs.io": {
        "id": "user-demo-001",
        "email": "demo@aiobs.io",
        "full_name": "Demo User",
        "roles": [UserRole.VIEWER],
        "password": "demo123456",
    },
}
