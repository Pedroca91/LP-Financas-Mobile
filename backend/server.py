from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET')
if not JWT_SECRET:
    JWT_SECRET = 'dev_secret_key_change_in_production'  # Only for development
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 30  # 30 days for mobile app persistence

# Create the main app
app = FastAPI(
    title="CarFinanças API",
    redirect_slashes=False  # Disable automatic slash redirects
)
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# ==================== MODELS ====================

class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    role: str = "user"  # user, admin
    status: str = "pending"  # pending, approved, blocked
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    status: str
    is_active: bool = True
    created_at: Optional[str] = None

class AdminCreateUser(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "user"

class AdminUpdateUser(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    role: Optional[str] = None
    status: Optional[str] = None

class CategoryBase(BaseModel):
    name: str
    type: str  # income, expense, investment

class Category(CategoryBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    is_default: bool = False

class IncomeBase(BaseModel):
    category_id: str
    description: Optional[str] = ""
    value: float
    date: str
    payment_date: Optional[str] = None
    status: str = "pending"  # pending, received
    month: int
    year: int

class Income(IncomeBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ExpenseBase(BaseModel):
    category_id: str
    description: Optional[str] = ""
    value: float
    date: str
    payment_method: str = "cash"  # cash, debit, credit
    credit_card_id: Optional[str] = None
    installments: int = 1
    current_installment: int = 1
    due_date: Optional[str] = None
    payment_date: Optional[str] = None
    status: str = "pending"  # pending, paid
    month: int
    year: int

class Expense(ExpenseBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CreditCardBase(BaseModel):
    name: str
    limit: float
    closing_day: int
    due_day: int

class CreditCard(CreditCardBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str

class InvestmentBase(BaseModel):
    category_id: str
    description: Optional[str] = ""
    initial_balance: float = 0
    contribution: float = 0
    dividends: float = 0
    withdrawal: float = 0
    month: int
    year: int

class Investment(InvestmentBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class BudgetBase(BaseModel):
    category_id: str
    planned_value: float
    month: int
    year: int
    type: str  # income, expense

class Budget(BudgetBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str

# ==================== BENEFIT (VR/VA) MODELS ====================

class BenefitCreditBase(BaseModel):
    benefit_type: str  # vr, va
    value: float
    date: str
    description: Optional[str] = ""
    month: int
    year: int

class BenefitCredit(BenefitCreditBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class BenefitExpenseBase(BaseModel):
    benefit_type: str  # vr, va
    category: str  # restaurante, mercado, padaria, acougue, lanchonete, outros
    description: str
    value: float
    date: str
    establishment: Optional[str] = ""  # nome do estabelecimento
    month: int
    year: int

class BenefitExpense(BenefitExpenseBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ==================== RECURRING TRANSACTIONS MODELS ====================

class RecurringTransactionBase(BaseModel):
    type: str  # income, expense
    category_id: str
    description: str
    value: float
    frequency: str  # monthly, weekly, yearly
    start_date: str
    end_date: Optional[str] = None
    day_of_month: Optional[int] = None  # dia do mês para lançamento
    is_active: bool = True
    payment_method: Optional[str] = None  # para despesas
    credit_card_id: Optional[str] = None

class RecurringTransaction(RecurringTransactionBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    last_generated: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ==================== GOALS (METAS) MODELS ====================

class GoalBase(BaseModel):
    name: str
    description: Optional[str] = None
    target_value: float
    current_value: float = 0
    deadline: Optional[str] = None
    category: str = "general"  # general, travel, emergency, car, house, education, other
    color: str = "#3B82F6"
    icon: str = "target"

class Goal(GoalBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    is_completed: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    completed_at: Optional[str] = None

class GoalContribution(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    goal_id: str
    user_id: str
    value: float
    date: str
    note: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ==================== CHAT (ASSISTENTE) MODELS ====================

class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    session_id: str
    role: str  # user, assistant
    content: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    session_id: str

# ==================== GOOGLE AUTH MODELS ====================

class GoogleAuthSession(BaseModel):
    session_id: str

class GoogleSessionData(BaseModel):
    id: str
    email: str
    name: str
    picture: Optional[str] = None
    session_token: str

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    payload = decode_token(credentials.credentials)
    user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user["status"] != "approved":
        raise HTTPException(status_code=403, detail="Account not approved")
    return user

async def get_admin_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    user = await get_current_user(credentials)
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ==================== STARTUP ====================

@app.on_event("startup")
async def startup():
    # Create default admin if not exists
    admin_email = os.environ.get('ADMIN_EMAIL', 'admin@lpfinancas.com')
    admin_password = os.environ.get('ADMIN_PASSWORD', 'AdminLP@2024')
    existing_admin = await db.users.find_one({"email": admin_email})
    if not existing_admin:
        admin_user = User(
            email=admin_email,
            name="Administrador",
            role="admin",
            status="approved"
        )
        admin_dict = admin_user.model_dump()
        admin_dict["password"] = hash_password(admin_password)
        await db.users.insert_one(admin_dict)
        logging.info(f"Admin user created: {admin_email}")
        
        # Create default categories for admin
        await create_default_categories(admin_user.id)

async def create_default_categories(user_id: str):
    default_categories = [
        # Income
        {"name": "Salário João", "type": "income"},
        {"name": "Salário Maria", "type": "income"},
        # Expenses
        {"name": "Contas de casa", "type": "expense"},
        {"name": "Transportes", "type": "expense"},
        {"name": "Mercado", "type": "expense"},
        {"name": "Lazer", "type": "expense"},
        {"name": "Diversão", "type": "expense"},
        {"name": "Pessoais", "type": "expense"},
        {"name": "Pet", "type": "expense"},
        {"name": "Carro", "type": "expense"},
        # Investments
        {"name": "XP Investimentos", "type": "investment"},
        {"name": "Caixinha Nubank 1", "type": "investment"},
        {"name": "Caixinha Nubank 2", "type": "investment"},
    ]
    
    for cat_data in default_categories:
        category = Category(
            name=cat_data["name"],
            type=cat_data["type"],
            user_id=user_id,
            is_default=True
        )
        await db.categories.insert_one(category.model_dump())

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=dict)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        email=user_data.email,
        name=user_data.name,
        role="user",
        status="pending"
    )
    user_dict = user.model_dump()
    user_dict["password"] = hash_password(user_data.password)
    await db.users.insert_one(user_dict)
    
    # Create default categories for new user
    await create_default_categories(user.id)
    
    return {"message": "Registration successful. Waiting for admin approval.", "user_id": user.id}

@api_router.post("/auth/login", response_model=dict)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if user["status"] == "pending":
        raise HTTPException(status_code=403, detail="Account pending approval")
    if user["status"] == "blocked":
        raise HTTPException(status_code=403, detail="Account blocked")
    
    token = create_token(user["id"], user["role"])
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
            "status": user["status"]
        }
    }

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return user

# ==================== GOOGLE AUTH ROUTES ====================

@api_router.post("/auth/google/session")
async def google_auth_session(data: GoogleAuthSession, response: Response):
    """Process Google OAuth session_id from Emergent Auth"""
    try:
        # Call Emergent Auth to get session data
        async with httpx.AsyncClient() as client:
            result = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": data.session_id},
                timeout=30.0
            )
            
            if result.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session")
            
            session_data = result.json()
        
        # Check if user already exists
        existing_user = await db.users.find_one({"email": session_data["email"]})
        
        if existing_user:
            # Update existing user with Google data
            await db.users.update_one(
                {"email": session_data["email"]},
                {"$set": {
                    "name": session_data.get("name", existing_user["name"]),
                    "picture": session_data.get("picture"),
                    "google_id": session_data.get("id")
                }}
            )
            user_id = existing_user["id"]
            role = existing_user["role"]
            status = existing_user["status"]
        else:
            # Create new user
            user_id = str(uuid.uuid4())
            new_user = {
                "id": user_id,
                "email": session_data["email"],
                "name": session_data.get("name", session_data["email"].split("@")[0]),
                "picture": session_data.get("picture"),
                "google_id": session_data.get("id"),
                "role": "user",
                "status": "approved",  # Auto-approve Google users
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(new_user)
            
            # Create default categories for new user
            await create_default_categories(user_id)
            
            role = "user"
            status = "approved"
        
        # Check if blocked
        if status == "blocked":
            raise HTTPException(status_code=403, detail="Account blocked")
        
        # Create JWT token
        token = create_token(user_id, role)
        
        # Store session
        session_token = session_data.get("session_token", str(uuid.uuid4()))
        await db.user_sessions.update_one(
            {"user_id": user_id},
            {"$set": {
                "user_id": user_id,
                "session_token": session_token,
                "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
                "created_at": datetime.now(timezone.utc)
            }},
            upsert=True
        )
        
        # Set httpOnly cookie
        response.set_cookie(
            key="session_token",
            value=token,
            httponly=True,
            secure=True,
            samesite="none",
            max_age=7 * 24 * 60 * 60,  # 7 days
            path="/"
        )
        
        # Get updated user data
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        
        return {
            "token": token,
            "user": {
                "id": user["id"],
                "email": user["email"],
                "name": user["name"],
                "role": user["role"],
                "status": user["status"],
                "picture": user.get("picture")
            }
        }
        
    except httpx.RequestError as e:
        logging.error(f"Google auth error: {e}")
        raise HTTPException(status_code=500, detail="Authentication service unavailable")

@api_router.post("/auth/logout")
async def logout(response: Response, user: dict = Depends(get_current_user)):
    """Logout user and clear session"""
    await db.user_sessions.delete_one({"user_id": user["id"]})
    response.delete_cookie("session_token", path="/")
    return {"message": "Logged out successfully"}

# ==================== ADMIN ROUTES ====================

@api_router.get("/admin/users", response_model=List[UserResponse])
async def list_all_users(admin: dict = Depends(get_admin_user)):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    # Garantir que is_active existe
    for user in users:
        if 'is_active' not in user:
            user['is_active'] = True
    return users

@api_router.post("/admin/users", response_model=UserResponse)
async def admin_create_user(data: AdminCreateUser, admin: dict = Depends(get_admin_user)):
    # Verificar se email já existe
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    # Hash da senha
    hashed_password = bcrypt.hashpw(data.password.encode('utf-8'), bcrypt.gensalt())
    
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": data.email,
        "name": data.name,
        "password": hashed_password.decode('utf-8'),
        "role": data.role,
        "status": "approved",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user)
    
    # Criar categorias padrão para o novo usuário
    default_categories = [
        {"name": "Salário", "type": "income", "user_id": user_id, "id": str(uuid.uuid4()), "is_default": True},
        {"name": "Freelance", "type": "income", "user_id": user_id, "id": str(uuid.uuid4()), "is_default": True},
        {"name": "Alimentação", "type": "expense", "user_id": user_id, "id": str(uuid.uuid4()), "is_default": True},
        {"name": "Transporte", "type": "expense", "user_id": user_id, "id": str(uuid.uuid4()), "is_default": True},
        {"name": "Moradia", "type": "expense", "user_id": user_id, "id": str(uuid.uuid4()), "is_default": True},
        {"name": "Lazer", "type": "expense", "user_id": user_id, "id": str(uuid.uuid4()), "is_default": True},
        {"name": "Saúde", "type": "expense", "user_id": user_id, "id": str(uuid.uuid4()), "is_default": True},
        {"name": "Educação", "type": "expense", "user_id": user_id, "id": str(uuid.uuid4()), "is_default": True},
        {"name": "Renda Fixa", "type": "investment", "user_id": user_id, "id": str(uuid.uuid4()), "is_default": True},
        {"name": "Ações", "type": "investment", "user_id": user_id, "id": str(uuid.uuid4()), "is_default": True},
    ]
    if default_categories:
        await db.categories.insert_many(default_categories)
    
    return {
        "id": user_id,
        "email": data.email,
        "name": data.name,
        "role": data.role,
        "status": "approved",
        "is_active": True,
        "created_at": user["created_at"]
    }

@api_router.put("/admin/users/{user_id}", response_model=dict)
async def admin_update_user(user_id: str, data: AdminUpdateUser, admin: dict = Depends(get_admin_user)):
    update_data = {}
    if data.name is not None:
        update_data["name"] = data.name
    if data.email is not None:
        # Verificar se email já existe em outro usuário
        existing = await db.users.find_one({"email": data.email, "id": {"$ne": user_id}})
        if existing:
            raise HTTPException(status_code=400, detail="Email já está em uso")
        update_data["email"] = data.email
    if data.password is not None:
        update_data["password"] = hash_password(data.password)
    if data.is_active is not None:
        update_data["is_active"] = data.is_active
    if data.role is not None:
        update_data["role"] = data.role
    if data.status is not None:
        update_data["status"] = data.status
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhum dado para atualizar")
    
    result = await db.users.update_one({"id": user_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return {"message": "Usuário atualizado com sucesso"}

@api_router.patch("/admin/users/{user_id}/approve")
async def approve_user(user_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.users.update_one({"id": user_id}, {"$set": {"status": "approved"}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User approved"}

@api_router.patch("/admin/users/{user_id}/block")
async def block_user(user_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.users.update_one({"id": user_id}, {"$set": {"status": "blocked"}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User blocked"}

@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    # Delete user data
    await db.categories.delete_many({"user_id": user_id})
    await db.incomes.delete_many({"user_id": user_id})
    await db.expenses.delete_many({"user_id": user_id})
    await db.investments.delete_many({"user_id": user_id})
    await db.budgets.delete_many({"user_id": user_id})
    await db.credit_cards.delete_many({"user_id": user_id})
    await db.benefit_credits.delete_many({"user_id": user_id})
    await db.benefit_expenses.delete_many({"user_id": user_id})
    await db.recurring_transactions.delete_many({"user_id": user_id})
    return {"message": "User and all data deleted"}

# ==================== CATEGORIES ROUTES ====================

@api_router.get("/categories", response_model=List[Category])
async def get_categories(user: dict = Depends(get_current_user)):
    categories = await db.categories.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    return categories

@api_router.post("/categories", response_model=Category)
async def create_category(data: CategoryBase, user: dict = Depends(get_current_user)):
    category = Category(**data.model_dump(), user_id=user["id"])
    await db.categories.insert_one(category.model_dump())
    return category

@api_router.put("/categories/{category_id}", response_model=Category)
async def update_category(category_id: str, data: CategoryBase, user: dict = Depends(get_current_user)):
    result = await db.categories.update_one(
        {"id": category_id, "user_id": user["id"]},
        {"$set": data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return await db.categories.find_one({"id": category_id}, {"_id": 0})

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str, user: dict = Depends(get_current_user)):
    result = await db.categories.delete_one({"id": category_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted"}

# ==================== INCOME ROUTES ====================

@api_router.get("/incomes", response_model=List[Income])
async def get_incomes(month: Optional[int] = None, year: Optional[int] = None, user: dict = Depends(get_current_user)):
    query = {"user_id": user["id"]}
    if month:
        query["month"] = month
    if year:
        query["year"] = year
    incomes = await db.incomes.find(query, {"_id": 0}).to_list(1000)
    return incomes

@api_router.post("/incomes", response_model=Income)
async def create_income(data: IncomeBase, user: dict = Depends(get_current_user)):
    income = Income(**data.model_dump(), user_id=user["id"])
    await db.incomes.insert_one(income.model_dump())
    return income

@api_router.put("/incomes/{income_id}", response_model=Income)
async def update_income(income_id: str, data: IncomeBase, user: dict = Depends(get_current_user)):
    result = await db.incomes.update_one(
        {"id": income_id, "user_id": user["id"]},
        {"$set": data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Income not found")
    return await db.incomes.find_one({"id": income_id}, {"_id": 0})

@api_router.delete("/incomes/{income_id}")
async def delete_income(income_id: str, user: dict = Depends(get_current_user)):
    result = await db.incomes.delete_one({"id": income_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Income not found")
    return {"message": "Income deleted"}

# ==================== EXPENSE ROUTES ====================

@api_router.get("/expenses", response_model=List[Expense])
async def get_expenses(month: Optional[int] = None, year: Optional[int] = None, user: dict = Depends(get_current_user)):
    query = {"user_id": user["id"]}
    if month:
        query["month"] = month
    if year:
        query["year"] = year
    expenses = await db.expenses.find(query, {"_id": 0}).to_list(1000)
    return expenses

@api_router.post("/expenses", response_model=Expense)
async def create_expense(data: ExpenseBase, user: dict = Depends(get_current_user)):
    expense = Expense(**data.model_dump(), user_id=user["id"])
    await db.expenses.insert_one(expense.model_dump())
    return expense

@api_router.put("/expenses/{expense_id}", response_model=Expense)
async def update_expense(expense_id: str, data: ExpenseBase, user: dict = Depends(get_current_user)):
    result = await db.expenses.update_one(
        {"id": expense_id, "user_id": user["id"]},
        {"$set": data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    return await db.expenses.find_one({"id": expense_id}, {"_id": 0})

@api_router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str, user: dict = Depends(get_current_user)):
    result = await db.expenses.delete_one({"id": expense_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    return {"message": "Expense deleted"}

# ==================== CREDIT CARD ROUTES ====================

@api_router.get("/credit-cards", response_model=List[CreditCard])
async def get_credit_cards(user: dict = Depends(get_current_user)):
    cards = await db.credit_cards.find({"user_id": user["id"]}, {"_id": 0}).to_list(50)
    return cards

@api_router.post("/credit-cards", response_model=CreditCard)
async def create_credit_card(data: CreditCardBase, user: dict = Depends(get_current_user)):
    card = CreditCard(**data.model_dump(), user_id=user["id"])
    await db.credit_cards.insert_one(card.model_dump())
    return card

@api_router.put("/credit-cards/{card_id}", response_model=CreditCard)
async def update_credit_card(card_id: str, data: CreditCardBase, user: dict = Depends(get_current_user)):
    result = await db.credit_cards.update_one(
        {"id": card_id, "user_id": user["id"]},
        {"$set": data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Credit card not found")
    return await db.credit_cards.find_one({"id": card_id}, {"_id": 0})

@api_router.delete("/credit-cards/{card_id}")
async def delete_credit_card(card_id: str, user: dict = Depends(get_current_user)):
    result = await db.credit_cards.delete_one({"id": card_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Credit card not found")
    return {"message": "Credit card deleted"}

# ==================== INVESTMENT ROUTES ====================

@api_router.get("/investments", response_model=List[Investment])
async def get_investments(month: Optional[int] = None, year: Optional[int] = None, user: dict = Depends(get_current_user)):
    query = {"user_id": user["id"]}
    if month:
        query["month"] = month
    if year:
        query["year"] = year
    investments = await db.investments.find(query, {"_id": 0}).to_list(1000)
    return investments

@api_router.post("/investments", response_model=Investment)
async def create_investment(data: InvestmentBase, user: dict = Depends(get_current_user)):
    investment = Investment(**data.model_dump(), user_id=user["id"])
    await db.investments.insert_one(investment.model_dump())
    return investment

@api_router.put("/investments/{investment_id}", response_model=Investment)
async def update_investment(investment_id: str, data: InvestmentBase, user: dict = Depends(get_current_user)):
    result = await db.investments.update_one(
        {"id": investment_id, "user_id": user["id"]},
        {"$set": data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Investment not found")
    return await db.investments.find_one({"id": investment_id}, {"_id": 0})

@api_router.delete("/investments/{investment_id}")
async def delete_investment(investment_id: str, user: dict = Depends(get_current_user)):
    result = await db.investments.delete_one({"id": investment_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Investment not found")
    return {"message": "Investment deleted"}

# ==================== BUDGET ROUTES ====================

@api_router.get("/budgets", response_model=List[Budget])
async def get_budgets(month: Optional[int] = None, year: Optional[int] = None, user: dict = Depends(get_current_user)):
    query = {"user_id": user["id"]}
    if month:
        query["month"] = month
    if year:
        query["year"] = year
    budgets = await db.budgets.find(query, {"_id": 0}).to_list(1000)
    return budgets

@api_router.post("/budgets", response_model=Budget)
async def create_budget(data: BudgetBase, user: dict = Depends(get_current_user)):
    # Check if budget already exists for this category/month/year
    existing = await db.budgets.find_one({
        "user_id": user["id"],
        "category_id": data.category_id,
        "month": data.month,
        "year": data.year
    })
    if existing:
        # Update existing
        await db.budgets.update_one(
            {"id": existing["id"]},
            {"$set": {"planned_value": data.planned_value}}
        )
        return await db.budgets.find_one({"id": existing["id"]}, {"_id": 0})
    
    budget = Budget(**data.model_dump(), user_id=user["id"])
    await db.budgets.insert_one(budget.model_dump())
    return budget

@api_router.delete("/budgets/{budget_id}")
async def delete_budget(budget_id: str, user: dict = Depends(get_current_user)):
    result = await db.budgets.delete_one({"id": budget_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Budget not found")
    return {"message": "Budget deleted"}

# ==================== BENEFIT (VR/VA) ROUTES ====================

# Benefit Credits (Recebimentos)
@api_router.get("/benefits/credits", response_model=List[BenefitCredit])
async def get_benefit_credits(
    month: Optional[int] = None, 
    year: Optional[int] = None, 
    benefit_type: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {"user_id": user["id"]}
    if month:
        query["month"] = month
    if year:
        query["year"] = year
    if benefit_type:
        query["benefit_type"] = benefit_type
    credits = await db.benefit_credits.find(query, {"_id": 0}).to_list(1000)
    return credits

@api_router.post("/benefits/credits", response_model=BenefitCredit)
async def create_benefit_credit(data: BenefitCreditBase, user: dict = Depends(get_current_user)):
    credit = BenefitCredit(**data.model_dump(), user_id=user["id"])
    await db.benefit_credits.insert_one(credit.model_dump())
    return credit

@api_router.put("/benefits/credits/{credit_id}", response_model=BenefitCredit)
async def update_benefit_credit(credit_id: str, data: BenefitCreditBase, user: dict = Depends(get_current_user)):
    result = await db.benefit_credits.update_one(
        {"id": credit_id, "user_id": user["id"]},
        {"$set": data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Benefit credit not found")
    return await db.benefit_credits.find_one({"id": credit_id}, {"_id": 0})

@api_router.delete("/benefits/credits/{credit_id}")
async def delete_benefit_credit(credit_id: str, user: dict = Depends(get_current_user)):
    result = await db.benefit_credits.delete_one({"id": credit_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Benefit credit not found")
    return {"message": "Benefit credit deleted"}

# Benefit Expenses (Gastos)
@api_router.get("/benefits/expenses", response_model=List[BenefitExpense])
async def get_benefit_expenses(
    month: Optional[int] = None, 
    year: Optional[int] = None, 
    benefit_type: Optional[str] = None,
    category: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {"user_id": user["id"]}
    if month:
        query["month"] = month
    if year:
        query["year"] = year
    if benefit_type:
        query["benefit_type"] = benefit_type
    if category:
        query["category"] = category
    expenses = await db.benefit_expenses.find(query, {"_id": 0}).to_list(1000)
    return expenses

@api_router.post("/benefits/expenses", response_model=BenefitExpense)
async def create_benefit_expense(data: BenefitExpenseBase, user: dict = Depends(get_current_user)):
    expense = BenefitExpense(**data.model_dump(), user_id=user["id"])
    await db.benefit_expenses.insert_one(expense.model_dump())
    return expense

@api_router.put("/benefits/expenses/{expense_id}", response_model=BenefitExpense)
async def update_benefit_expense(expense_id: str, data: BenefitExpenseBase, user: dict = Depends(get_current_user)):
    result = await db.benefit_expenses.update_one(
        {"id": expense_id, "user_id": user["id"]},
        {"$set": data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Benefit expense not found")
    return await db.benefit_expenses.find_one({"id": expense_id}, {"_id": 0})

@api_router.delete("/benefits/expenses/{expense_id}")
async def delete_benefit_expense(expense_id: str, user: dict = Depends(get_current_user)):
    result = await db.benefit_expenses.delete_one({"id": expense_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Benefit expense not found")
    return {"message": "Benefit expense deleted"}

# Benefit Summary (Resumo)
@api_router.get("/benefits/summary")
async def get_benefits_summary(month: int, year: int, user: dict = Depends(get_current_user)):
    # Get all credits and expenses for the month
    credits = await db.benefit_credits.find(
        {"user_id": user["id"], "month": month, "year": year}, {"_id": 0}
    ).to_list(1000)
    expenses = await db.benefit_expenses.find(
        {"user_id": user["id"], "month": month, "year": year}, {"_id": 0}
    ).to_list(1000)
    
    # Calculate VR totals
    vr_credits = sum(c["value"] for c in credits if c["benefit_type"] == "vr")
    vr_expenses = sum(e["value"] for e in expenses if e["benefit_type"] == "vr")
    vr_balance = vr_credits - vr_expenses
    
    # Calculate VA totals
    va_credits = sum(c["value"] for c in credits if c["benefit_type"] == "va")
    va_expenses = sum(e["value"] for e in expenses if e["benefit_type"] == "va")
    va_balance = va_credits - va_expenses
    
    # Group expenses by category
    vr_by_category = {}
    va_by_category = {}
    for e in expenses:
        cat = e["category"]
        if e["benefit_type"] == "vr":
            vr_by_category[cat] = vr_by_category.get(cat, 0) + e["value"]
        else:
            va_by_category[cat] = va_by_category.get(cat, 0) + e["value"]
    
    return {
        "month": month,
        "year": year,
        "vr": {
            "credits": vr_credits,
            "expenses": vr_expenses,
            "balance": vr_balance,
            "by_category": vr_by_category
        },
        "va": {
            "credits": va_credits,
            "expenses": va_expenses,
            "balance": va_balance,
            "by_category": va_by_category
        },
        "total_credits": vr_credits + va_credits,
        "total_expenses": vr_expenses + va_expenses,
        "total_balance": vr_balance + va_balance
    }

# Benefit Yearly Summary (para gráficos)
@api_router.get("/benefits/yearly")
async def get_benefits_yearly(year: int, user: dict = Depends(get_current_user)):
    monthly_data = []
    for month in range(1, 13):
        credits = await db.benefit_credits.find(
            {"user_id": user["id"], "month": month, "year": year}, {"_id": 0}
        ).to_list(1000)
        expenses = await db.benefit_expenses.find(
            {"user_id": user["id"], "month": month, "year": year}, {"_id": 0}
        ).to_list(1000)
        
        vr_credits = sum(c["value"] for c in credits if c["benefit_type"] == "vr")
        vr_expenses = sum(e["value"] for e in expenses if e["benefit_type"] == "vr")
        va_credits = sum(c["value"] for c in credits if c["benefit_type"] == "va")
        va_expenses = sum(e["value"] for e in expenses if e["benefit_type"] == "va")
        
        monthly_data.append({
            "month": month,
            "vr_credits": vr_credits,
            "vr_expenses": vr_expenses,
            "vr_balance": vr_credits - vr_expenses,
            "va_credits": va_credits,
            "va_expenses": va_expenses,
            "va_balance": va_credits - va_expenses
        })
    
    return monthly_data

# ==================== RECURRING TRANSACTIONS ROUTES ====================

@api_router.get("/recurring", response_model=List[RecurringTransaction])
async def get_recurring_transactions(user: dict = Depends(get_current_user)):
    transactions = await db.recurring_transactions.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    return transactions

@api_router.post("/recurring", response_model=RecurringTransaction)
async def create_recurring_transaction(data: RecurringTransactionBase, user: dict = Depends(get_current_user)):
    transaction = RecurringTransaction(**data.model_dump(), user_id=user["id"])
    await db.recurring_transactions.insert_one(transaction.model_dump())
    return transaction

@api_router.put("/recurring/{transaction_id}", response_model=RecurringTransaction)
async def update_recurring_transaction(transaction_id: str, data: RecurringTransactionBase, user: dict = Depends(get_current_user)):
    result = await db.recurring_transactions.update_one(
        {"id": transaction_id, "user_id": user["id"]},
        {"$set": data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Recurring transaction not found")
    return await db.recurring_transactions.find_one({"id": transaction_id}, {"_id": 0})

@api_router.delete("/recurring/{transaction_id}")
async def delete_recurring_transaction(transaction_id: str, user: dict = Depends(get_current_user)):
    result = await db.recurring_transactions.delete_one({"id": transaction_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Recurring transaction not found")
    return {"message": "Recurring transaction deleted"}

@api_router.post("/recurring/generate")
async def generate_recurring_transactions(month: int, year: int, user: dict = Depends(get_current_user)):
    """Gera lançamentos do mês baseado nas transações recorrentes"""
    recurring = await db.recurring_transactions.find(
        {"user_id": user["id"], "is_active": True}, {"_id": 0}
    ).to_list(100)
    
    generated = []
    for rec in recurring:
        # Verificar se já foi gerado para este mês
        if rec["type"] == "expense":
            existing = await db.expenses.find_one({
                "user_id": user["id"],
                "month": month,
                "year": year,
                "description": rec["description"],
                "category_id": rec["category_id"]
            })
        else:
            existing = await db.incomes.find_one({
                "user_id": user["id"],
                "month": month,
                "year": year,
                "description": rec["description"],
                "category_id": rec["category_id"]
            })
        
        if existing:
            continue
        
        day = rec.get("day_of_month") or 1
        date_str = f"{year}-{month:02d}-{day:02d}"
        
        if rec["type"] == "expense":
            expense = Expense(
                category_id=rec["category_id"],
                description=rec["description"],
                value=rec["value"],
                date=date_str,
                payment_method=rec.get("payment_method", "cash"),
                credit_card_id=rec.get("credit_card_id"),
                installments=1,
                current_installment=1,
                due_date=date_str,
                status="pending",
                month=month,
                year=year,
                user_id=user["id"]
            )
            await db.expenses.insert_one(expense.model_dump())
            generated.append({"type": "expense", "description": rec["description"], "value": rec["value"]})
        else:
            income = Income(
                category_id=rec["category_id"],
                description=rec["description"],
                value=rec["value"],
                date=date_str,
                status="pending",
                month=month,
                year=year,
                user_id=user["id"]
            )
            await db.incomes.insert_one(income.model_dump())
            generated.append({"type": "income", "description": rec["description"], "value": rec["value"]})
    
    return {"generated": generated, "count": len(generated)}

# ==================== ALERTS & BUDGET ANALYSIS ====================

@api_router.get("/alerts/budget")
async def get_budget_alerts(month: int, year: int, user: dict = Depends(get_current_user)):
    """Retorna alertas de orçamento (80% e 100%)"""
    budgets = await db.budgets.find(
        {"user_id": user["id"], "month": month, "year": year}, {"_id": 0}
    ).to_list(100)
    
    categories = await db.categories.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    cat_map = {c["id"]: c for c in categories}
    
    expenses = await db.expenses.find(
        {"user_id": user["id"], "month": month, "year": year}, {"_id": 0}
    ).to_list(1000)
    
    incomes = await db.incomes.find(
        {"user_id": user["id"], "month": month, "year": year}, {"_id": 0}
    ).to_list(1000)
    
    alerts = []
    
    for budget in budgets:
        cat = cat_map.get(budget["category_id"], {})
        cat_name = cat.get("name", "Categoria")
        
        if budget["type"] == "expense":
            spent = sum(e["value"] for e in expenses if e["category_id"] == budget["category_id"])
        else:
            spent = sum(i["value"] for i in incomes if i["category_id"] == budget["category_id"])
        
        planned = budget["planned_value"]
        if planned > 0:
            percentage = (spent / planned) * 100
            
            if percentage >= 100:
                alerts.append({
                    "type": "exceeded",
                    "level": "danger",
                    "category_id": budget["category_id"],
                    "category_name": cat_name,
                    "budget_type": budget["type"],
                    "planned": planned,
                    "spent": spent,
                    "percentage": percentage,
                    "message": f"Orçamento de {cat_name} foi ultrapassado! ({percentage:.0f}%)"
                })
            elif percentage >= 80:
                alerts.append({
                    "type": "warning",
                    "level": "warning",
                    "category_id": budget["category_id"],
                    "category_name": cat_name,
                    "budget_type": budget["type"],
                    "planned": planned,
                    "spent": spent,
                    "percentage": percentage,
                    "message": f"Orçamento de {cat_name} atingiu {percentage:.0f}%"
                })
    
    return alerts

@api_router.get("/alerts/due-dates")
async def get_due_date_alerts(user: dict = Depends(get_current_user)):
    """Retorna contas próximas do vencimento (próximos 7 dias)"""
    today = datetime.now(timezone.utc).date()
    week_from_now = today + timedelta(days=7)
    
    # Buscar despesas pendentes
    expenses = await db.expenses.find(
        {"user_id": user["id"], "status": "pending"}, {"_id": 0}
    ).to_list(1000)
    
    alerts = []
    categories = await db.categories.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    cat_map = {c["id"]: c for c in categories}
    
    for expense in expenses:
        due_date_str = expense.get("due_date") or expense.get("date")
        if not due_date_str:
            continue
        
        try:
            due_date = datetime.strptime(due_date_str, "%Y-%m-%d").date()
        except:
            continue
        
        if due_date < today:
            # Vencido
            days_overdue = (today - due_date).days
            cat = cat_map.get(expense["category_id"], {})
            alerts.append({
                "type": "overdue",
                "level": "danger",
                "expense_id": expense["id"],
                "description": expense["description"],
                "category_name": cat.get("name", ""),
                "value": expense["value"],
                "due_date": due_date_str,
                "days": days_overdue,
                "message": f"{expense['description']} venceu há {days_overdue} dias!"
            })
        elif due_date <= week_from_now:
            # Próximo do vencimento
            days_until = (due_date - today).days
            cat = cat_map.get(expense["category_id"], {})
            alerts.append({
                "type": "upcoming",
                "level": "warning" if days_until <= 3 else "info",
                "expense_id": expense["id"],
                "description": expense["description"],
                "category_name": cat.get("name", ""),
                "value": expense["value"],
                "due_date": due_date_str,
                "days": days_until,
                "message": f"{expense['description']} vence em {days_until} dias"
            })
    
    # Ordenar por urgência
    alerts.sort(key=lambda x: (0 if x["type"] == "overdue" else 1, x["days"] if x["type"] == "upcoming" else -x["days"]))
    
    return alerts

# ==================== TRENDS & ANALYSIS ====================

@api_router.get("/analysis/trends")
async def get_trends_analysis(month: int, year: int, user: dict = Depends(get_current_user)):
    """Comparativo do mês atual vs meses anteriores"""
    
    # Dados dos últimos 6 meses
    months_data = []
    for i in range(5, -1, -1):
        m = month - i
        y = year
        while m <= 0:
            m += 12
            y -= 1
        
        incomes = await db.incomes.find(
            {"user_id": user["id"], "month": m, "year": y}, {"_id": 0}
        ).to_list(1000)
        expenses = await db.expenses.find(
            {"user_id": user["id"], "month": m, "year": y}, {"_id": 0}
        ).to_list(1000)
        
        total_income = sum(i["value"] for i in incomes if i["status"] == "received")
        total_expense = sum(e["value"] for e in expenses if e["status"] == "paid")
        
        months_data.append({
            "month": m,
            "year": y,
            "income": total_income,
            "expense": total_expense,
            "balance": total_income - total_expense
        })
    
    # Calcular médias
    avg_income = sum(d["income"] for d in months_data[:-1]) / max(len(months_data) - 1, 1)
    avg_expense = sum(d["expense"] for d in months_data[:-1]) / max(len(months_data) - 1, 1)
    
    current = months_data[-1]
    
    # Variação percentual
    income_variation = ((current["income"] - avg_income) / avg_income * 100) if avg_income > 0 else 0
    expense_variation = ((current["expense"] - avg_expense) / avg_expense * 100) if avg_expense > 0 else 0
    
    # Gastos por categoria no mês atual vs média
    categories = await db.categories.find({"user_id": user["id"], "type": "expense"}, {"_id": 0}).to_list(100)
    current_expenses = await db.expenses.find(
        {"user_id": user["id"], "month": month, "year": year}, {"_id": 0}
    ).to_list(1000)
    
    # Otimização: Buscar todas as despesas dos últimos 5 meses de uma vez
    months_to_fetch = []
    for i in range(5, 0, -1):
        m = month - i
        y = year
        while m <= 0:
            m += 12
            y -= 1
        months_to_fetch.append({"month": m, "year": y})
    
    # Busca única para todos os meses anteriores
    prev_expenses_query = {
        "user_id": user["id"],
        "$or": months_to_fetch
    }
    all_prev_expenses = await db.expenses.find(prev_expenses_query, {"_id": 0}).to_list(10000)
    
    category_trends = []
    for cat in categories:
        current_total = sum(e["value"] for e in current_expenses if e["category_id"] == cat["id"])
        
        # Calcular média dos últimos 5 meses usando dados já carregados
        cat_totals = []
        for month_info in months_to_fetch:
            m_total = sum(
                e["value"] for e in all_prev_expenses 
                if e["category_id"] == cat["id"] and e["month"] == month_info["month"] and e["year"] == month_info["year"]
            )
            cat_totals.append(m_total)
        
        avg_cat = sum(cat_totals) / max(len(cat_totals), 1)
        variation = ((current_total - avg_cat) / avg_cat * 100) if avg_cat > 0 else 0
        
        if current_total > 0 or avg_cat > 0:
            category_trends.append({
                "category_id": cat["id"],
                "category_name": cat["name"],
                "current": current_total,
                "average": avg_cat,
                "variation": variation,
                "trend": "up" if variation > 10 else "down" if variation < -10 else "stable"
            })
    
    return {
        "monthly_data": months_data,
        "current_month": {
            "month": month,
            "year": year,
            "income": current["income"],
            "expense": current["expense"],
            "balance": current["balance"]
        },
        "averages": {
            "income": avg_income,
            "expense": avg_expense
        },
        "variations": {
            "income_percentage": income_variation,
            "expense_percentage": expense_variation,
            "income_trend": "up" if income_variation > 5 else "down" if income_variation < -5 else "stable",
            "expense_trend": "up" if expense_variation > 5 else "down" if expense_variation < -5 else "stable"
        },
        "category_trends": category_trends
    }

# ==================== CREDIT CARD ADVANCED ====================

@api_router.get("/credit-cards/{card_id}/statement")
async def get_card_statement(card_id: str, month: int, year: int, user: dict = Depends(get_current_user)):
    """Fatura detalhada do cartão"""
    card = await db.credit_cards.find_one({"id": card_id, "user_id": user["id"]}, {"_id": 0})
    if not card:
        raise HTTPException(status_code=404, detail="Credit card not found")
    
    # Buscar todas as despesas do cartão no mês
    expenses = await db.expenses.find({
        "user_id": user["id"],
        "credit_card_id": card_id,
        "month": month,
        "year": year
    }, {"_id": 0}).to_list(1000)
    
    categories = await db.categories.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    cat_map = {c["id"]: c for c in categories}
    
    # Organizar por categoria
    by_category = {}
    total = 0
    for exp in expenses:
        cat = cat_map.get(exp["category_id"], {})
        cat_name = cat.get("name", "Outros")
        if cat_name not in by_category:
            by_category[cat_name] = {"items": [], "subtotal": 0}
        by_category[cat_name]["items"].append({
            "id": exp["id"],
            "description": exp["description"],
            "value": exp["value"],
            "date": exp["date"],
            "installment": f"{exp.get('current_installment', 1)}/{exp.get('installments', 1)}" if exp.get('installments', 1) > 1 else None
        })
        by_category[cat_name]["subtotal"] += exp["value"]
        total += exp["value"]
    
    return {
        "card": card,
        "month": month,
        "year": year,
        "total": total,
        "by_category": by_category,
        "expenses": expenses
    }

@api_router.get("/credit-cards/{card_id}/installments")
async def get_card_installments(card_id: str, user: dict = Depends(get_current_user)):
    """Parcelas futuras do cartão"""
    card = await db.credit_cards.find_one({"id": card_id, "user_id": user["id"]}, {"_id": 0})
    if not card:
        raise HTTPException(status_code=404, detail="Credit card not found")
    
    # Buscar todas as despesas parceladas do cartão
    expenses = await db.expenses.find({
        "user_id": user["id"],
        "credit_card_id": card_id,
        "installments": {"$gt": 1}
    }, {"_id": 0}).to_list(1000)
    
    # Calcular parcelas futuras
    today = datetime.now(timezone.utc)
    current_month = today.month
    current_year = today.year
    
    future_installments = []
    monthly_totals = {}
    
    for exp in expenses:
        total_installments = exp.get("installments", 1)
        current_installment = exp.get("current_installment", 1)
        value_per_installment = exp["value"]
        
        # Data inicial
        try:
            start_date = datetime.strptime(exp["date"], "%Y-%m-%d")
        except:
            continue
        
        # Calcular parcelas restantes
        for i in range(current_installment, total_installments + 1):
            inst_month = start_date.month + (i - 1)
            inst_year = start_date.year
            while inst_month > 12:
                inst_month -= 12
                inst_year += 1
            
            # Só mostrar parcelas futuras ou do mês atual
            if (inst_year > current_year) or (inst_year == current_year and inst_month >= current_month):
                key = f"{inst_year}-{inst_month:02d}"
                if key not in monthly_totals:
                    monthly_totals[key] = 0
                monthly_totals[key] += value_per_installment
                
                future_installments.append({
                    "expense_id": exp["id"],
                    "description": exp["description"],
                    "installment": i,
                    "total_installments": total_installments,
                    "value": value_per_installment,
                    "month": inst_month,
                    "year": inst_year
                })
    
    # Ordenar por data
    future_installments.sort(key=lambda x: (x["year"], x["month"]))
    
    return {
        "card": card,
        "installments": future_installments,
        "monthly_totals": monthly_totals,
        "total_committed": sum(monthly_totals.values())
    }

@api_router.get("/credit-cards/{card_id}/available")
async def get_card_available_limit(card_id: str, month: int, year: int, user: dict = Depends(get_current_user)):
    """Limite disponível do cartão"""
    card = await db.credit_cards.find_one({"id": card_id, "user_id": user["id"]}, {"_id": 0})
    if not card:
        raise HTTPException(status_code=404, detail="Credit card not found")
    
    # Calcular gastos do mês atual
    expenses = await db.expenses.find({
        "user_id": user["id"],
        "credit_card_id": card_id,
        "month": month,
        "year": year
    }, {"_id": 0}).to_list(1000)
    
    total_spent = sum(e["value"] for e in expenses)
    limit = card.get("limit", 0)
    available = limit - total_spent
    usage_percentage = (total_spent / limit * 100) if limit > 0 else 0
    
    return {
        "card": card,
        "limit": limit,
        "spent": total_spent,
        "available": available,
        "usage_percentage": usage_percentage,
        "month": month,
        "year": year
    }

@api_router.get("/credit-cards/summary")
async def get_all_cards_summary(month: int, year: int, user: dict = Depends(get_current_user)):
    """Resumo de todos os cartões"""
    cards = await db.credit_cards.find({"user_id": user["id"]}, {"_id": 0}).to_list(50)
    
    if not cards:
        return []
    
    # Otimização: Buscar todas as despesas de uma vez para todos os cartões
    card_ids = [card["id"] for card in cards]
    
    # Busca única para despesas do mês
    all_month_expenses = await db.expenses.find({
        "user_id": user["id"],
        "credit_card_id": {"$in": card_ids},
        "month": month,
        "year": year
    }, {"_id": 0}).to_list(10000)
    
    # Busca única para despesas parceladas
    all_installment_expenses = await db.expenses.find({
        "user_id": user["id"],
        "credit_card_id": {"$in": card_ids},
        "installments": {"$gt": 1}
    }, {"_id": 0}).to_list(5000)
    
    summary = []
    for card in cards:
        # Filtrar despesas do cartão usando dados já carregados
        card_expenses = [e for e in all_month_expenses if e.get("credit_card_id") == card["id"]]
        total_spent = sum(e["value"] for e in card_expenses)
        
        limit = card.get("limit", 0)
        available = limit - total_spent
        
        # Calcular parcelas futuras usando dados já carregados
        card_installments = [e for e in all_installment_expenses if e.get("credit_card_id") == card["id"]]
        future_committed = 0
        for exp in card_installments:
            remaining = exp.get("installments", 1) - exp.get("current_installment", 1)
            future_committed += exp["value"] * remaining
        
        summary.append({
            "card": card,
            "spent": total_spent,
            "available": available,
            "limit": limit,
            "usage_percentage": (total_spent / limit * 100) if limit > 0 else 0,
            "future_committed": future_committed
        })
    
    return summary

# ==================== DASHBOARD/REPORTS ====================

@api_router.get("/dashboard/summary")
async def get_dashboard_summary(month: int, year: int, user: dict = Depends(get_current_user)):
    # Get totals
    incomes = await db.incomes.find({"user_id": user["id"], "month": month, "year": year}, {"_id": 0}).to_list(1000)
    expenses = await db.expenses.find({"user_id": user["id"], "month": month, "year": year}, {"_id": 0}).to_list(1000)
    investments = await db.investments.find({"user_id": user["id"], "month": month, "year": year}, {"_id": 0}).to_list(1000)
    budgets = await db.budgets.find({"user_id": user["id"], "month": month, "year": year}, {"_id": 0}).to_list(1000)
    
    total_income = sum(i["value"] for i in incomes if i["status"] == "received")
    total_income_pending = sum(i["value"] for i in incomes if i["status"] == "pending")
    total_expense = sum(e["value"] for e in expenses if e["status"] == "paid")
    total_expense_pending = sum(e["value"] for e in expenses if e["status"] == "pending")
    total_contributions = sum(inv["contribution"] for inv in investments)
    total_dividends = sum(inv["dividends"] for inv in investments)
    
    planned_income = sum(b["planned_value"] for b in budgets if b["type"] == "income")
    planned_expense = sum(b["planned_value"] for b in budgets if b["type"] == "expense")
    
    balance = total_income - total_expense
    
    return {
        "month": month,
        "year": year,
        "total_income": total_income,
        "total_income_pending": total_income_pending,
        "total_expense": total_expense,
        "total_expense_pending": total_expense_pending,
        "total_contributions": total_contributions,
        "total_dividends": total_dividends,
        "planned_income": planned_income,
        "planned_expense": planned_expense,
        "balance": balance
    }

@api_router.get("/dashboard/yearly")
async def get_yearly_summary(year: int, user: dict = Depends(get_current_user)):
    monthly_data = []
    for month in range(1, 13):
        incomes = await db.incomes.find({"user_id": user["id"], "month": month, "year": year}, {"_id": 0}).to_list(1000)
        expenses = await db.expenses.find({"user_id": user["id"], "month": month, "year": year}, {"_id": 0}).to_list(1000)
        
        total_income = sum(i["value"] for i in incomes if i["status"] == "received")
        total_expense = sum(e["value"] for e in expenses if e["status"] == "paid")
        
        monthly_data.append({
            "month": month,
            "income": total_income,
            "expense": total_expense,
            "balance": total_income - total_expense
        })
    
    return monthly_data

# ==================== ADVANCED ANALYTICS ====================

@api_router.get("/analytics/comparison")
async def analytics_comparison(
    month: int,
    year: int,
    user: dict = Depends(get_current_user)
):
    """Compare current month with previous month and year"""
    user_id = user["id"]
    
    # Current month
    current_incomes = await db.incomes.find({
        "user_id": user_id,
        "month": month,
        "year": year,
        "status": "received"
    }).to_list(1000)
    
    current_expenses = await db.expenses.find({
        "user_id": user_id,
        "month": month,
        "year": year,
        "status": "paid"
    }).to_list(1000)
    
    current_income_total = sum(i["value"] for i in current_incomes)
    current_expense_total = sum(e["value"] for e in current_expenses)
    current_balance = current_income_total - current_expense_total
    
    # Previous month
    prev_month = month - 1 if month > 1 else 12
    prev_year = year if month > 1 else year - 1
    
    prev_incomes = await db.incomes.find({
        "user_id": user_id,
        "month": prev_month,
        "year": prev_year,
        "status": "received"
    }).to_list(1000)
    
    prev_expenses = await db.expenses.find({
        "user_id": user_id,
        "month": prev_month,
        "year": prev_year,
        "status": "paid"
    }).to_list(1000)
    
    prev_income_total = sum(i["value"] for i in prev_incomes)
    prev_expense_total = sum(e["value"] for e in prev_expenses)
    prev_balance = prev_income_total - prev_expense_total
    
    # Same month last year
    last_year_incomes = await db.incomes.find({
        "user_id": user_id,
        "month": month,
        "year": year - 1,
        "status": "received"
    }).to_list(1000)
    
    last_year_expenses = await db.expenses.find({
        "user_id": user_id,
        "month": month,
        "year": year - 1,
        "status": "paid"
    }).to_list(1000)
    
    last_year_income_total = sum(i["value"] for i in last_year_incomes)
    last_year_expense_total = sum(e["value"] for e in last_year_expenses)
    last_year_balance = last_year_income_total - last_year_expense_total
    
    # Calculate variations
    income_variation = ((current_income_total - prev_income_total) / prev_income_total * 100) if prev_income_total > 0 else 0
    expense_variation = ((current_expense_total - prev_expense_total) / prev_expense_total * 100) if prev_expense_total > 0 else 0
    balance_variation = ((current_balance - prev_balance) / abs(prev_balance) * 100) if prev_balance != 0 else 0
    
    income_year_variation = ((current_income_total - last_year_income_total) / last_year_income_total * 100) if last_year_income_total > 0 else 0
    expense_year_variation = ((current_expense_total - last_year_expense_total) / last_year_expense_total * 100) if last_year_expense_total > 0 else 0
    
    return {
        "current": {
            "income": current_income_total,
            "expense": current_expense_total,
            "balance": current_balance
        },
        "previous_month": {
            "income": prev_income_total,
            "expense": prev_expense_total,
            "balance": prev_balance
        },
        "last_year": {
            "income": last_year_income_total,
            "expense": last_year_expense_total,
            "balance": last_year_balance
        },
        "variations": {
            "income_vs_previous": income_variation,
            "expense_vs_previous": expense_variation,
            "balance_vs_previous": balance_variation,
            "income_vs_last_year": income_year_variation,
            "expense_vs_last_year": expense_year_variation
        }
    }

@api_router.get("/analytics/forecast")
async def analytics_forecast(
    month: int,
    year: int,
    user: dict = Depends(get_current_user)
):
    """Forecast balance for next months based on average"""
    user_id = user["id"]
    
    # Get last 3 months data
    months_data = []
    for i in range(3):
        m = month - i
        y = year
        if m <= 0:
            m += 12
            y -= 1
        
        incomes = await db.incomes.find({
            "user_id": user_id,
            "month": m,
            "year": y,
            "status": "received"
        }).to_list(1000)
        
        expenses = await db.expenses.find({
            "user_id": user_id,
            "month": m,
            "year": y,
            "status": "paid"
        }).to_list(1000)
        
        income_total = sum(inc["value"] for inc in incomes)
        expense_total = sum(exp["value"] for exp in expenses)
        
        months_data.append({
            "month": m,
            "year": y,
            "income": income_total,
            "expense": expense_total,
            "balance": income_total - expense_total
        })
    
    # Calculate averages
    avg_income = sum(m["income"] for m in months_data) / len(months_data) if months_data else 0
    avg_expense = sum(m["expense"] for m in months_data) / len(months_data) if months_data else 0
    avg_balance = avg_income - avg_expense
    
    # Get pending income and expenses for current month
    pending_income = await db.incomes.find({
        "user_id": user_id,
        "month": month,
        "year": year,
        "status": "pending"
    }).to_list(1000)
    
    pending_expense = await db.expenses.find({
        "user_id": user_id,
        "month": month,
        "year": year,
        "status": "pending"
    }).to_list(1000)
    
    pending_income_total = sum(i["value"] for i in pending_income)
    pending_expense_total = sum(e["value"] for e in pending_expense)
    
    # Current balance
    current_incomes = await db.incomes.find({
        "user_id": user_id,
        "month": month,
        "year": year,
        "status": "received"
    }).to_list(1000)
    
    current_expenses = await db.expenses.find({
        "user_id": user_id,
        "month": month,
        "year": year,
        "status": "paid"
    }).to_list(1000)
    
    current_balance = sum(i["value"] for i in current_incomes) - sum(e["value"] for e in current_expenses)
    
    # Forecast for end of current month
    forecast_current = current_balance + pending_income_total - pending_expense_total
    
    # Forecast for next 3 months
    forecast_months = []
    balance_accumulator = forecast_current
    
    for i in range(1, 4):
        future_month = month + i
        future_year = year
        if future_month > 12:
            future_month -= 12
            future_year += 1
        
        balance_accumulator += avg_balance
        
        forecast_months.append({
            "month": future_month,
            "year": future_year,
            "forecasted_balance": balance_accumulator,
            "avg_income": avg_income,
            "avg_expense": avg_expense
        })
    
    return {
        "current_balance": current_balance,
        "pending_income": pending_income_total,
        "pending_expense": pending_expense_total,
        "forecast_current_month": forecast_current,
        "average_monthly_balance": avg_balance,
        "forecast_next_months": forecast_months,
        "historical_data": months_data[::-1]
    }

@api_router.get("/analytics/highlights")
async def analytics_highlights(
    month: int,
    year: int,
    user: dict = Depends(get_current_user)
):
    """Get largest income and expense for the month"""
    user_id = user["id"]
    
    # Get all incomes and expenses
    incomes = await db.incomes.find({
        "user_id": user_id,
        "month": month,
        "year": year
    }).to_list(1000)
    
    expenses = await db.expenses.find({
        "user_id": user_id,
        "month": month,
        "year": year
    }).to_list(1000)
    
    # Find largest
    largest_expense = max(expenses, key=lambda x: x["value"]) if expenses else None
    largest_income = max(incomes, key=lambda x: x["value"]) if incomes else None
    
    # Get category names
    largest_expense_data = None
    largest_income_data = None
    
    if largest_expense:
        cat = await db.categories.find_one({"id": largest_expense["category_id"]})
        largest_expense_data = {
            "value": largest_expense["value"],
            "description": largest_expense["description"],
            "category": cat["name"] if cat else "N/A",
            "date": largest_expense.get("date", ""),
            "status": largest_expense["status"]
        }
    
    if largest_income:
        cat = await db.categories.find_one({"id": largest_income["category_id"]})
        largest_income_data = {
            "value": largest_income["value"],
            "description": largest_income["description"],
            "category": cat["name"] if cat else "N/A",
            "date": largest_income.get("date", ""),
            "status": largest_income["status"]
        }
    
    return {
        "largest_expense": largest_expense_data,
        "largest_income": largest_income_data
    }

@api_router.get("/reports/by-category")
async def get_report_by_category(month: int, year: int, type: str, user: dict = Depends(get_current_user)):
    categories = await db.categories.find({"user_id": user["id"], "type": type}, {"_id": 0}).to_list(100)
    budgets = await db.budgets.find({"user_id": user["id"], "month": month, "year": year, "type": type}, {"_id": 0}).to_list(100)
    
    if type == "income":
        records = await db.incomes.find({"user_id": user["id"], "month": month, "year": year}, {"_id": 0}).to_list(1000)
    else:
        records = await db.expenses.find({"user_id": user["id"], "month": month, "year": year}, {"_id": 0}).to_list(1000)
    
    result = []
    for cat in categories:
        cat_records = [r for r in records if r["category_id"] == cat["id"]]
        realized = sum(r["value"] for r in cat_records if r["status"] in ["received", "paid"])
        budget = next((b for b in budgets if b["category_id"] == cat["id"]), None)
        planned = budget["planned_value"] if budget else 0
        
        result.append({
            "category_id": cat["id"],
            "category_name": cat["name"],
            "planned": planned,
            "realized": realized,
            "percentage": (realized / planned * 100) if planned > 0 else 0
        })
    
    return result

# ==================== GOALS (METAS) ROUTES ====================

@api_router.get("/goals")
async def get_goals(user: dict = Depends(get_current_user)):
    """Get all goals for current user"""
    goals = await db.goals.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    return goals

@api_router.post("/goals")
async def create_goal(data: GoalBase, user: dict = Depends(get_current_user)):
    """Create a new financial goal"""
    goal = Goal(
        **data.model_dump(),
        user_id=user["id"]
    )
    await db.goals.insert_one(goal.model_dump())
    return goal.model_dump()

@api_router.get("/goals/{goal_id}")
async def get_goal(goal_id: str, user: dict = Depends(get_current_user)):
    """Get a specific goal"""
    goal = await db.goals.find_one({"id": goal_id, "user_id": user["id"]}, {"_id": 0})
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    return goal

@api_router.put("/goals/{goal_id}")
async def update_goal(goal_id: str, data: GoalBase, user: dict = Depends(get_current_user)):
    """Update a goal"""
    result = await db.goals.update_one(
        {"id": goal_id, "user_id": user["id"]},
        {"$set": data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    updated = await db.goals.find_one({"id": goal_id}, {"_id": 0})
    return updated

@api_router.delete("/goals/{goal_id}")
async def delete_goal(goal_id: str, user: dict = Depends(get_current_user)):
    """Delete a goal"""
    result = await db.goals.delete_one({"id": goal_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    # Also delete contributions
    await db.goal_contributions.delete_many({"goal_id": goal_id})
    return {"message": "Goal deleted successfully"}

@api_router.post("/goals/{goal_id}/contribute")
async def add_goal_contribution(goal_id: str, value: float, note: Optional[str] = None, user: dict = Depends(get_current_user)):
    """Add a contribution to a goal"""
    goal = await db.goals.find_one({"id": goal_id, "user_id": user["id"]})
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    contribution = GoalContribution(
        goal_id=goal_id,
        user_id=user["id"],
        value=value,
        date=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        note=note
    )
    await db.goal_contributions.insert_one(contribution.model_dump())
    
    # Update goal current value
    new_value = goal["current_value"] + value
    is_completed = new_value >= goal["target_value"]
    
    update_data = {"current_value": new_value}
    if is_completed and not goal.get("is_completed"):
        update_data["is_completed"] = True
        update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.goals.update_one({"id": goal_id}, {"$set": update_data})
    
    return {"message": "Contribution added", "new_value": new_value, "is_completed": is_completed}

@api_router.get("/goals/{goal_id}/contributions")
async def get_goal_contributions(goal_id: str, user: dict = Depends(get_current_user)):
    """Get all contributions for a goal"""
    goal = await db.goals.find_one({"id": goal_id, "user_id": user["id"]})
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    contributions = await db.goal_contributions.find(
        {"goal_id": goal_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return contributions

# ==================== CHAT ASSISTANT ROUTES ====================

@api_router.post("/chat", response_model=ChatResponse)
async def chat_with_assistant(data: ChatRequest, user: dict = Depends(get_current_user)):
    """Chat with the AI financial assistant"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    session_id = data.session_id or str(uuid.uuid4())
    
    # Get user's financial context
    current_date = datetime.now(timezone.utc)
    month = current_date.month
    year = current_date.year
    
    # Get financial summary for context
    incomes = await db.incomes.find({"user_id": user["id"], "month": month, "year": year}).to_list(100)
    expenses = await db.expenses.find({"user_id": user["id"], "month": month, "year": year}).to_list(100)
    goals = await db.goals.find({"user_id": user["id"], "is_completed": False}).to_list(10)
    
    total_income = sum(i.get("value", 0) for i in incomes)
    total_expenses = sum(e.get("value", 0) for e in expenses)
    balance = total_income - total_expenses
    
    # Build context
    financial_context = f"""
Contexto Financeiro do Usuário ({user['name']}):
- Mês atual: {month}/{year}
- Total de Receitas: R$ {total_income:.2f}
- Total de Despesas: R$ {total_expenses:.2f}
- Saldo: R$ {balance:.2f}
- Metas ativas: {len(goals)}
"""
    
    if goals:
        financial_context += "\nMetas em andamento:\n"
        for g in goals[:5]:
            progress = (g.get("current_value", 0) / g.get("target_value", 1)) * 100
            financial_context += f"  - {g['name']}: {progress:.1f}% (R$ {g.get('current_value', 0):.2f} / R$ {g.get('target_value', 0):.2f})\n"
    
    # Get previous messages for context
    previous_messages = await db.chat_messages.find(
        {"user_id": user["id"], "session_id": session_id}
    ).sort("created_at", 1).to_list(20)
    
    # Build conversation history as text
    conversation_history = ""
    for msg in previous_messages[-10:]:
        role_label = "Usuário" if msg["role"] == "user" else "Assistente"
        conversation_history += f"{role_label}: {msg['content']}\n\n"
    
    system_message = f"""Você é um assistente financeiro inteligente chamado 'LP Finanças AI'. 
Você ajuda os usuários a gerenciar suas finanças pessoais, responder dúvidas sobre gastos, 
dar dicas de economia e planejamento financeiro.

{financial_context}

Regras:
1. Seja sempre amigável e profissional
2. Responda em português brasileiro
3. Dê dicas práticas e personalizadas baseadas nos dados do usuário
4. Se não souber algo específico, seja honesto
5. Formate valores monetários como R$ X.XXX,XX
6. Mantenha respostas concisas mas úteis

{f"Histórico da conversa:{chr(10)}{conversation_history}" if conversation_history else ""}
"""
    
    try:
        # Initialize chat
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="AI service not configured")
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"{user['id']}_{session_id}",
            system_message=system_message
        ).with_model("openai", "gpt-4.1")
        
        # Send new message
        user_message = UserMessage(text=data.message)
        response = await chat.send_message(user_message)
        
        # Save messages to database
        user_msg = ChatMessage(
            user_id=user["id"],
            session_id=session_id,
            role="user",
            content=data.message
        )
        assistant_msg = ChatMessage(
            user_id=user["id"],
            session_id=session_id,
            role="assistant",
            content=response
        )
        
        await db.chat_messages.insert_many([user_msg.model_dump(), assistant_msg.model_dump()])
        
        return ChatResponse(response=response, session_id=session_id)
        
    except Exception as e:
        logging.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing chat: {str(e)}")

@api_router.get("/chat/history")
async def get_chat_history(session_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    """Get chat history for user"""
    query = {"user_id": user["id"]}
    if session_id:
        query["session_id"] = session_id
    
    messages = await db.chat_messages.find(query, {"_id": 0}).sort("created_at", 1).to_list(100)
    return messages

@api_router.get("/chat/sessions")
async def get_chat_sessions(user: dict = Depends(get_current_user)):
    """Get list of chat sessions for user"""
    pipeline = [
        {"$match": {"user_id": user["id"]}},
        {"$group": {
            "_id": "$session_id",
            "last_message": {"$last": "$content"},
            "message_count": {"$sum": 1},
            "created_at": {"$first": "$created_at"},
            "updated_at": {"$last": "$created_at"}
        }},
        {"$sort": {"updated_at": -1}},
        {"$limit": 20}
    ]
    sessions = await db.chat_messages.aggregate(pipeline).to_list(20)
    return [{"session_id": s["_id"], **{k: v for k, v in s.items() if k != "_id"}} for s in sessions]

@api_router.delete("/chat/sessions/{session_id}")
async def delete_chat_session(session_id: str, user: dict = Depends(get_current_user)):
    """Delete a chat session"""
    result = await db.chat_messages.delete_many({"session_id": session_id, "user_id": user["id"]})
    return {"deleted": result.deleted_count}

# ==================== PERSONALIZED TIPS ROUTES ====================

@api_router.get("/tips/personalized")
async def get_personalized_tips(user: dict = Depends(get_current_user)):
    """Get personalized financial tips based on user's data"""
    current_date = datetime.now(timezone.utc)
    month = current_date.month
    year = current_date.year
    
    tips = []
    
    # Get current month data
    expenses = await db.expenses.find({"user_id": user["id"], "month": month, "year": year}).to_list(500)
    incomes = await db.incomes.find({"user_id": user["id"], "month": month, "year": year}).to_list(100)
    
    # Get last month data for comparison
    last_month = month - 1 if month > 1 else 12
    last_year = year if month > 1 else year - 1
    last_month_expenses = await db.expenses.find({"user_id": user["id"], "month": last_month, "year": last_year}).to_list(500)
    
    total_income = sum(i.get("value", 0) for i in incomes if i.get("status") == "received")
    total_expenses = sum(e.get("value", 0) for e in expenses if e.get("status") == "paid")
    total_last_month = sum(e.get("value", 0) for e in last_month_expenses if e.get("status") == "paid")
    
    # Tip 1: Spending comparison
    if total_last_month > 0:
        change_percent = ((total_expenses - total_last_month) / total_last_month) * 100
        if change_percent > 20:
            tips.append({
                "type": "warning",
                "icon": "trending-up",
                "title": "Gastos aumentaram",
                "message": f"Seus gastos aumentaram {change_percent:.1f}% em relação ao mês passado. Considere revisar suas despesas.",
                "priority": "high"
            })
        elif change_percent < -10:
            tips.append({
                "type": "success",
                "icon": "trending-down",
                "title": "Parabéns! Gastos reduziram",
                "message": f"Você reduziu seus gastos em {abs(change_percent):.1f}% em relação ao mês passado. Continue assim!",
                "priority": "low"
            })
    
    # Tip 2: Savings rate
    if total_income > 0:
        savings_rate = ((total_income - total_expenses) / total_income) * 100
        if savings_rate < 10:
            tips.append({
                "type": "warning",
                "icon": "piggy-bank",
                "title": "Taxa de poupança baixa",
                "message": f"Você está economizando apenas {savings_rate:.1f}% da sua renda. Especialistas recomendam poupar pelo menos 20%.",
                "priority": "high"
            })
        elif savings_rate >= 20:
            tips.append({
                "type": "success",
                "icon": "piggy-bank",
                "title": "Excelente taxa de poupança!",
                "message": f"Você está economizando {savings_rate:.1f}% da sua renda. Parabéns pela disciplina financeira!",
                "priority": "low"
            })
    
    # Tip 3: Category analysis
    category_totals = {}
    for exp in expenses:
        cat_id = exp.get("category_id", "other")
        category_totals[cat_id] = category_totals.get(cat_id, 0) + exp.get("value", 0)
    
    if category_totals:
        top_category_id = max(category_totals, key=category_totals.get)
        top_category = await db.categories.find_one({"id": top_category_id})
        top_category_name = top_category.get("name", "Outros") if top_category else "Outros"
        top_category_value = category_totals[top_category_id]
        top_category_percent = (top_category_value / total_expenses * 100) if total_expenses > 0 else 0
        
        if top_category_percent > 40:
            tips.append({
                "type": "info",
                "icon": "pie-chart",
                "title": f"Concentração em {top_category_name}",
                "message": f"{top_category_percent:.1f}% dos seus gastos estão em '{top_category_name}'. Considere diversificar ou reduzir gastos nessa categoria.",
                "priority": "medium"
            })
    
    # Tip 4: Pending bills
    pending_expenses = [e for e in expenses if e.get("status") == "pending"]
    total_pending = sum(e.get("value", 0) for e in pending_expenses)
    if total_pending > 0:
        tips.append({
            "type": "info",
            "icon": "clock",
            "title": "Contas pendentes",
            "message": f"Você tem R$ {total_pending:.2f} em contas pendentes este mês. Não esqueça de pagá-las!",
            "priority": "medium"
        })
    
    # Tip 5: Goals progress
    goals = await db.goals.find({"user_id": user["id"], "is_completed": False}).to_list(10)
    for goal in goals:
        progress = (goal.get("current_value", 0) / goal.get("target_value", 1)) * 100
        if progress >= 90 and progress < 100:
            tips.append({
                "type": "success",
                "icon": "target",
                "title": f"Meta '{goal['name']}' quase lá!",
                "message": f"Faltam apenas R$ {goal['target_value'] - goal['current_value']:.2f} para completar sua meta. Continue!",
                "priority": "medium"
            })
    
    # Tip 6: Credit card usage
    credit_expenses = [e for e in expenses if e.get("payment_method") == "credit"]
    credit_total = sum(e.get("value", 0) for e in credit_expenses)
    if total_expenses > 0 and credit_total / total_expenses > 0.5:
        tips.append({
            "type": "warning",
            "icon": "credit-card",
            "title": "Alto uso de cartão de crédito",
            "message": f"Mais de 50% dos seus gastos são no cartão de crédito. Cuidado com os juros!",
            "priority": "high"
        })
    
    # Sort by priority
    priority_order = {"high": 0, "medium": 1, "low": 2}
    tips.sort(key=lambda x: priority_order.get(x["priority"], 1))
    
    return tips[:6]  # Return max 6 tips

# ==================== HEALTH CHECK ====================

# ==================== BANK STATEMENT IMPORT ROUTES ====================

class ImportedTransaction(BaseModel):
    date: str
    description: str
    value: float
    type: str  # income or expense

class BankStatementImport(BaseModel):
    transactions: List[ImportedTransaction]
    default_category_id: Optional[str] = None

@api_router.post("/import/bank-statement")
async def import_bank_statement(data: BankStatementImport, user: dict = Depends(get_current_user)):
    """Import transactions from bank statement"""
    imported_incomes = 0
    imported_expenses = 0
    errors = []
    
    # Get categories for user
    categories = await db.categories.find({"user_id": user["id"]}).to_list(100)
    default_income_cat = next((c for c in categories if c["type"] == "income" and c.get("is_default")), None)
    default_expense_cat = next((c for c in categories if c["type"] == "expense" and c.get("is_default")), None)
    
    # If no default, get first available
    if not default_income_cat:
        default_income_cat = next((c for c in categories if c["type"] == "income"), None)
    if not default_expense_cat:
        default_expense_cat = next((c for c in categories if c["type"] == "expense"), None)
    
    for i, trans in enumerate(data.transactions):
        try:
            # Parse date
            try:
                trans_date = datetime.strptime(trans.date, "%Y-%m-%d")
            except:
                try:
                    trans_date = datetime.strptime(trans.date, "%d/%m/%Y")
                except:
                    trans_date = datetime.now()
            
            month = trans_date.month
            year = trans_date.year
            
            if trans.type == "income" and trans.value > 0:
                if not default_income_cat:
                    errors.append(f"Linha {i+1}: Sem categoria de receita disponível")
                    continue
                
                income = Income(
                    user_id=user["id"],
                    category_id=data.default_category_id if data.default_category_id else default_income_cat["id"],
                    description=trans.description[:200],
                    value=abs(trans.value),
                    date=trans_date.strftime("%Y-%m-%d"),
                    status="received",
                    month=month,
                    year=year
                )
                await db.incomes.insert_one(income.model_dump())
                imported_incomes += 1
                
            elif trans.type == "expense" or trans.value < 0:
                if not default_expense_cat:
                    errors.append(f"Linha {i+1}: Sem categoria de despesa disponível")
                    continue
                
                expense = Expense(
                    user_id=user["id"],
                    category_id=data.default_category_id if data.default_category_id else default_expense_cat["id"],
                    description=trans.description[:200],
                    value=abs(trans.value),
                    date=trans_date.strftime("%Y-%m-%d"),
                    status="paid",
                    month=month,
                    year=year
                )
                await db.expenses.insert_one(expense.model_dump())
                imported_expenses += 1
                
        except Exception as e:
            errors.append(f"Linha {i+1}: {str(e)}")
    
    return {
        "success": True,
        "imported_incomes": imported_incomes,
        "imported_expenses": imported_expenses,
        "total_imported": imported_incomes + imported_expenses,
        "errors": errors[:10] if errors else []  # Return max 10 errors
    }

@api_router.post("/import/parse-csv")
async def parse_csv_content(request: Request, user: dict = Depends(get_current_user)):
    """Parse CSV content and return structured data for review"""
    import io
    import csv
    
    body = await request.body()
    content = body.decode('utf-8')
    
    # Try to detect delimiter
    sample = content[:2000]
    delimiter = ';' if sample.count(';') > sample.count(',') else ','
    
    reader = csv.reader(io.StringIO(content), delimiter=delimiter)
    rows = list(reader)
    
    if len(rows) < 2:
        raise HTTPException(status_code=400, detail="CSV vazio ou inválido")
    
    headers = rows[0]
    data_rows = rows[1:100]  # Max 100 rows for preview
    
    # Try to auto-detect columns
    date_col = None
    desc_col = None
    value_col = None
    
    for i, header in enumerate(headers):
        h_lower = header.lower().strip()
        if any(x in h_lower for x in ['data', 'date', 'dia']):
            date_col = i
        elif any(x in h_lower for x in ['descri', 'hist', 'memo', 'observ']):
            desc_col = i
        elif any(x in h_lower for x in ['valor', 'value', 'amount', 'quantia', 'vl']):
            value_col = i
    
    return {
        "headers": headers,
        "sample_data": data_rows[:10],
        "total_rows": len(data_rows),
        "detected_columns": {
            "date": date_col,
            "description": desc_col,
            "value": value_col
        },
        "delimiter": delimiter
    }

# ==================== PUSH NOTIFICATIONS ROUTES ====================

class NotificationToken(BaseModel):
    token: str

@api_router.post("/notifications/token")
async def save_notification_token(data: NotificationToken, user: dict = Depends(get_current_user)):
    """Save FCM token for push notifications"""
    await db.notification_tokens.update_one(
        {"user_id": user["id"]},
        {
            "$set": {
                "user_id": user["id"],
                "token": data.token,
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$setOnInsert": {
                "id": str(uuid.uuid4()),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    return {"success": True}

@api_router.get("/notifications/status")
async def get_notification_status(user: dict = Depends(get_current_user)):
    """Get notification status for user"""
    token_doc = await db.notification_tokens.find_one({"user_id": user["id"]})
    return {
        "enabled": token_doc is not None,
        "updated_at": token_doc.get("updated_at") if token_doc else None
    }

@api_router.delete("/notifications/token")
async def remove_notification_token(user: dict = Depends(get_current_user)):
    """Remove FCM token to disable notifications"""
    await db.notification_tokens.delete_one({"user_id": user["id"]})
    return {"success": True}

# ==================== ROOT ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "CarFinanças API is running", "version": "1.0.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Root health check for Kubernetes (without /api prefix)
@app.get("/health")
async def root_health():
    """Health check endpoint for Kubernetes liveness/readiness probes"""
    return {"status": "healthy", "service": "carfinancas"}

# Include router and middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
