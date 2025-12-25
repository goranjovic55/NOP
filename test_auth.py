from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

password = "admin123"
hashed = get_password_hash(password)
print(f"Password: {password}")
print(f"Hashed: {hashed}")
print(f"Verify: {verify_password(password, hashed)}")
