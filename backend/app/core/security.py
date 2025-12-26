"""
Security utilities for authentication and encryption
"""

from datetime import datetime, timedelta
from typing import Any, Union, Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import secrets
import base64
import os
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

# Password hashing with secure algorithm
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


class CredentialVault:
    """
    Secure credential storage with AES-256-GCM encryption.
    
    Uses authenticated encryption with associated data (AEAD) to:
    - Encrypt credentials with AES-256-GCM
    - Bind credentials to specific asset IDs
    - Detect tampering through authentication tags
    """
    
    def __init__(self, master_key: bytes):
        if len(master_key) != 32:
            raise ValueError("Master key must be exactly 32 bytes")
        self._master_key = master_key
        self._aesgcm = AESGCM(master_key)
    
    @classmethod
    def derive_key(cls, password: str, salt: bytes, iterations: int = 100000) -> bytes:
        """
        Derive a 32-byte encryption key from password using PBKDF2.
        
        Args:
            password: The password to derive key from
            salt: Random salt (should be at least 16 bytes)
            iterations: PBKDF2 iterations (higher = more secure, slower)
        
        Returns:
            32-byte derived key
        """
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=iterations,
        )
        return kdf.derive(password.encode())
    
    def encrypt(self, plaintext: str, asset_id: str) -> bytes:
        """
        Encrypt credential with AES-256-GCM.
        
        Args:
            plaintext: The credential to encrypt
            asset_id: Asset ID to bind the credential to (prevents swapping attacks)
        
        Returns:
            nonce (12 bytes) + ciphertext + auth tag
        """
        nonce = os.urandom(12)  # 96-bit nonce as recommended for GCM
        aad = asset_id.encode()  # Additional authenticated data
        ciphertext = self._aesgcm.encrypt(nonce, plaintext.encode(), aad)
        return nonce + ciphertext
    
    def decrypt(self, encrypted: bytes, asset_id: str) -> str:
        """
        Decrypt credential.
        
        Args:
            encrypted: The encrypted data (nonce + ciphertext + tag)
            asset_id: Asset ID that was used during encryption
        
        Returns:
            Decrypted credential
        
        Raises:
            ValueError: If decryption fails (wrong key or tampering detected)
        """
        if len(encrypted) < 12:
            raise ValueError("Invalid encrypted data: too short")
        
        nonce = encrypted[:12]
        ciphertext = encrypted[12:]
        aad = asset_id.encode()
        
        try:
            plaintext = self._aesgcm.decrypt(nonce, ciphertext, aad)
            return plaintext.decode()
        except Exception as e:
            logger.warning(f"Credential decryption failed for asset {asset_id}: {e}")
            raise ValueError("Decryption failed: invalid key or data corrupted")


# Global vault instance (lazy initialization)
_vault_instance: Optional[CredentialVault] = None


def get_credential_vault() -> CredentialVault:
    """
    Get or create the credential vault instance.
    
    Uses MASTER_ENCRYPTION_KEY from environment, or derives one from SECRET_KEY
    as a fallback (not recommended for production).
    """
    global _vault_instance
    
    if _vault_instance is None:
        master_key_hex = os.environ.get("MASTER_ENCRYPTION_KEY")
        
        if master_key_hex and len(master_key_hex) == 64:
            # Use provided master key (64 hex chars = 32 bytes)
            master_key = bytes.fromhex(master_key_hex)
        else:
            # Fallback: derive from SECRET_KEY (less secure, for development only)
            logger.warning(
                "MASTER_ENCRYPTION_KEY not set or invalid. "
                "Deriving key from SECRET_KEY (not recommended for production)."
            )
            salt = b"nop_credential_vault_salt_v1"  # Static salt for development
            master_key = CredentialVault.derive_key(settings.SECRET_KEY, salt)
        
        _vault_instance = CredentialVault(master_key)
    
    return _vault_instance


# Legacy encryption functions (wrapper around new vault)
def encrypt_data(data: str, asset_id: str = "default") -> str:
    """Encrypt sensitive data using the credential vault"""
    vault = get_credential_vault()
    encrypted = vault.encrypt(data, asset_id)
    return base64.urlsafe_b64encode(encrypted).decode()


def decrypt_data(encrypted_data: str, asset_id: str = "default") -> str:
    """Decrypt sensitive data using the credential vault"""
    vault = get_credential_vault()
    encrypted = base64.urlsafe_b64decode(encrypted_data.encode())
    return vault.decrypt(encrypted, asset_id)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)


def create_access_token(
    data: dict, expires_delta: Optional[timedelta] = None
) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "exp": expire,
        "type": "access",
        "iat": datetime.utcnow(),
        "jti": secrets.token_hex(16)  # Unique token ID
    })
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict) -> str:
    """Create JWT refresh token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({
        "exp": expire,
        "type": "refresh",
        "iat": datetime.utcnow(),
        "jti": secrets.token_hex(16)
    })
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> dict:
    """Decode and verify JWT token"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError as e:
        raise ValueError(f"Invalid token: {e}")


def generate_api_key() -> str:
    """Generate a secure API key"""
    return secrets.token_urlsafe(32)


def validate_secret_key(key: str) -> bool:
    """Validate that secret key meets minimum security requirements"""
    if key == "your-secret-key-change-this":
        return False
    if key == "your-secret-key-change-this-to-random-string-at-least-32-chars":
        return False
    if len(key) < 32:
        return False
    return True