from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'carfinancas_secret_key_2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Create the main app
app = FastAPI(title="CarFinanças API")
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
    created_at: str

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
    admin_email = "Pedrohcarvalho1997@gmail.com"
    existing_admin = await db.users.find_one({"email": admin_email})
    if not existing_admin:
        admin_user = User(
            email=admin_email,
            name="Administrador",
            role="admin",
            status="approved"
        )
        admin_dict = admin_user.model_dump()
        admin_dict["password"] = hash_password("S@muka91")
        await db.users.insert_one(admin_dict)
        logging.info("Admin user created")
        
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

# ==================== ADMIN ROUTES ====================

@api_router.get("/admin/users", response_model=List[UserResponse])
async def list_all_users(admin: dict = Depends(get_admin_user)):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return users

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

# ==================== HEALTH CHECK ====================

@api_router.get("/")
async def root():
    return {"message": "CarFinanças API is running", "version": "1.0.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

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
