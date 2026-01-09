#!/usr/bin/env python3
"""
Script para restaurar os dados do sistema CarFinanças
"""
import os
from pymongo import MongoClient
from datetime import datetime
import uuid

# Conectar ao MongoDB
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')

client = MongoClient(MONGO_URL)
db = client[DB_NAME]

# ID do usuário admin
USER_ID = "49abed68-cee9-4755-ac3c-119942e0e2c0"

print("🚀 Iniciando restauração de dados...")

# 1. CRIAR CATEGORIAS ADICIONAIS
print("\n📁 Criando categorias adicionais...")

categorias_adicionais = [
    {"name": "Renda extra Pedro", "type": "income", "is_default": False},
    {"name": "Renda Extra Liz", "type": "income", "is_default": False},
    {"name": "Dinheiro extra não recorrente", "type": "income", "is_default": False},
    {"name": "Outros", "type": "expense", "is_default": False},
    {"name": "Saúde", "type": "expense", "is_default": False},
]

for cat in categorias_adicionais:
    existing = db.categories.find_one({"name": cat["name"], "user_id": USER_ID})
    if not existing:
        cat_data = {
            "id": str(uuid.uuid4()),
            "name": cat["name"],
            "type": cat["type"],
            "user_id": USER_ID,
            "is_default": cat["is_default"]
        }
        db.categories.insert_one(cat_data)
        print(f"  ✅ Categoria criada: {cat['name']}")
    else:
        print(f"  ⏭️  Categoria já existe: {cat['name']}")

# Buscar IDs das categorias
def get_category_id(name):
    cat = db.categories.find_one({"name": name, "user_id": USER_ID})
    return cat["id"] if cat else None

# 2. INSERIR ENTRADAS (RECEITAS)
print("\n💰 Inserindo entradas (receitas)...")

entradas = [
    {
        "category": "Salário Pedro",
        "description": "-",
        "amount": 2500.00,
        "expected_date": "2026-01-09",
        "received_date": "2026-01-08",
        "status": "received"
    },
    {
        "category": "Renda extra Pedro",
        "description": "Aluguel Salão",
        "amount": 1200.00,
        "expected_date": "2026-01-26",
        "received_date": None,
        "status": "pending"
    },
    {
        "category": "Salário Liz",
        "description": "-",
        "amount": 3234.78,
        "expected_date": "2026-01-05",
        "received_date": "2026-01-06",
        "status": "received"
    },
    {
        "category": "Renda Extra Liz",
        "description": "Vale transporte vendido",
        "amount": 780.00,
        "expected_date": "2026-01-05",
        "received_date": "2026-01-06",
        "status": "received"
    },
    {
        "category": "Renda Extra Liz",
        "description": "Salario DR",
        "amount": 500.00,
        "expected_date": "2026-01-04",
        "received_date": "2026-01-03",
        "status": "received"
    },
    {
        "category": "Dinheiro extra não recorrente",
        "description": "-",
        "amount": 2000.00,
        "expected_date": "2026-01-04",
        "received_date": "2026-01-03",
        "status": "received"
    },
]

# Limpar entradas existentes de janeiro 2026
db.entries.delete_many({"user_id": USER_ID, "month": 1, "year": 2026})

for entrada in entradas:
    cat_id = get_category_id(entrada["category"])
    if not cat_id:
        print(f"  ❌ Categoria não encontrada: {entrada['category']}")
        continue
    
    entry_data = {
        "id": str(uuid.uuid4()),
        "user_id": USER_ID,
        "category_id": cat_id,
        "description": entrada["description"],
        "amount": entrada["amount"],
        "expected_date": entrada["expected_date"],
        "received_date": entrada["received_date"],
        "status": entrada["status"],
        "month": 1,
        "year": 2026,
        "created_at": datetime.now().isoformat()
    }
    db.entries.insert_one(entry_data)
    print(f"  ✅ Entrada criada: {entrada['category']} - R$ {entrada['amount']:.2f}")

# 3. INSERIR SAÍDAS (DESPESAS)
print("\n💸 Inserindo saídas (despesas)...")

saidas = [
    {
        "category": "Outros",
        "description": "Cartão Janeiro",
        "amount": 6011.02,
        "payment_method": "credit",
        "credit_card_id": None,
        "installments": None,
        "due_date": "2026-01-09",
        "status": "paid"
    },
    {
        "category": "Contas de casa",
        "description": "Luz",
        "amount": 242.72,
        "payment_method": "cash",
        "credit_card_id": None,
        "installments": None,
        "due_date": "2026-01-14",
        "status": "paid"
    },
    {
        "category": "Contas de casa",
        "description": "Internet Casa",
        "amount": 120.00,
        "payment_method": "cash",
        "credit_card_id": None,
        "installments": None,
        "due_date": "2026-01-09",
        "status": "paid"
    },
    {
        "category": "Contas de casa",
        "description": "Agua",
        "amount": 76.30,
        "payment_method": "cash",
        "credit_card_id": None,
        "installments": None,
        "due_date": "2026-01-14",
        "status": "paid"
    },
    {
        "category": "Pessoais",
        "description": "Net celular Pedro",
        "amount": 169.95,
        "payment_method": "cash",
        "credit_card_id": None,
        "installments": None,
        "due_date": "2026-01-10",
        "status": "paid"
    },
    {
        "category": "Pessoais",
        "description": "Net celular Liz",
        "amount": 89.99,
        "payment_method": "cash",
        "credit_card_id": None,
        "installments": None,
        "due_date": "2026-01-10",
        "status": "paid"
    },
    {
        "category": "Pessoais",
        "description": "Terapia Liz",
        "amount": 120.00,
        "payment_method": "cash",
        "credit_card_id": None,
        "installments": None,
        "due_date": "2026-01-05",
        "status": "paid"
    },
    {
        "category": "Pessoais",
        "description": "Acordo Salão",
        "amount": 200.00,
        "payment_method": "cash",
        "credit_card_id": None,
        "installments": None,
        "due_date": "2026-01-10",
        "status": "paid"
    },
    {
        "category": "Outros",
        "description": "empréstimo Nubank ultima parcela",
        "amount": 685.00,
        "payment_method": "cash",
        "credit_card_id": None,
        "installments": None,
        "due_date": "2026-01-10",
        "status": "paid"
    },
    {
        "category": "Outros",
        "description": "Emprestimo Mercado pago",
        "amount": 553.60,
        "payment_method": "cash",
        "credit_card_id": None,
        "installments": None,
        "due_date": "2026-01-10",
        "status": "pending"
    },
    {
        "category": "Outros",
        "description": "Vários",
        "amount": 128.17,
        "payment_method": "cash",
        "credit_card_id": None,
        "installments": None,
        "due_date": "2026-01-05",
        "status": "paid"
    },
    {
        "category": "Lazer",
        "description": "lanche ifood",
        "amount": 37.85,
        "payment_method": "cash",
        "credit_card_id": None,
        "installments": None,
        "due_date": "2026-01-06",
        "status": "paid"
    },
    {
        "category": "Contas de casa",
        "description": "tintas da casa",
        "amount": 500.00,
        "payment_method": "cash",
        "credit_card_id": None,
        "installments": None,
        "due_date": "2026-01-09",
        "status": "paid"
    },
    {
        "category": "Contas de casa",
        "description": "Pano de",
        "amount": 35.00,
        "payment_method": "cash",
        "credit_card_id": None,
        "installments": None,
        "due_date": "2026-01-06",
        "status": "paid"
    },
]

# Limpar saídas existentes de janeiro 2026
db.expenses.delete_many({"user_id": USER_ID, "month": 1, "year": 2026})

for saida in saidas:
    cat_id = get_category_id(saida["category"])
    if not cat_id:
        print(f"  ❌ Categoria não encontrada: {saida['category']}")
        continue
    
    expense_data = {
        "id": str(uuid.uuid4()),
        "user_id": USER_ID,
        "category_id": cat_id,
        "description": saida["description"],
        "amount": saida["amount"],
        "payment_method": saida["payment_method"],
        "credit_card_id": saida["credit_card_id"],
        "installments": saida["installments"],
        "due_date": saida["due_date"],
        "status": saida["status"],
        "month": 1,
        "year": 2026,
        "created_at": datetime.now().isoformat()
    }
    db.expenses.insert_one(expense_data)
    print(f"  ✅ Saída criada: {saida['category']} - R$ {saida['amount']:.2f}")

# 4. INSERIR BENEFÍCIOS (VR/VA)
print("\n🎫 Inserindo benefícios (VR/VA)...")

# Nota: VR/VA parece ser gerenciado pela mesma estrutura de "entries" ou uma collection separada
# Vou criar entradas para esses valores com categorias apropriadas

# Verificar se precisa criar categoria para VR/VA
vrva_categories = ["Vale Refeição", "Vale Alimentação"]
for vr_cat in vrva_categories:
    existing = db.categories.find_one({"name": vr_cat, "user_id": USER_ID})
    if not existing:
        cat_data = {
            "id": str(uuid.uuid4()),
            "name": vr_cat,
            "type": "income",
            "user_id": USER_ID,
            "is_default": False
        }
        db.categories.insert_one(cat_data)
        print(f"  ✅ Categoria criada: {vr_cat}")

# Inserir os recebimentos de VR/VA
beneficios = [
    {
        "category": "Vale Alimentação",
        "description": "VA Pedro",
        "amount": 800.00,
        "expected_date": "2026-01-10",
        "received_date": "2026-01-10",
        "status": "received"
    },
    {
        "category": "Vale Refeição",
        "description": "VR Liz",
        "amount": 575.00,
        "expected_date": "2026-01-06",
        "received_date": "2026-01-06",
        "status": "received"
    },
    {
        "category": "Vale Alimentação",
        "description": "VA Liz",
        "amount": 260.00,
        "expected_date": "2026-01-06",
        "received_date": "2026-01-06",
        "status": "received"
    },
]

for beneficio in beneficios:
    cat_id = get_category_id(beneficio["category"])
    if not cat_id:
        print(f"  ❌ Categoria não encontrada: {beneficio['category']}")
        continue
    
    entry_data = {
        "id": str(uuid.uuid4()),
        "user_id": USER_ID,
        "category_id": cat_id,
        "description": beneficio["description"],
        "amount": beneficio["amount"],
        "expected_date": beneficio["expected_date"],
        "received_date": beneficio["received_date"],
        "status": beneficio["status"],
        "month": 1,
        "year": 2026,
        "created_at": datetime.now().isoformat()
    }
    db.entries.insert_one(entry_data)
    print(f"  ✅ Benefício criado: {beneficio['category']} - R$ {beneficio['amount']:.2f}")

# 5. VERIFICAÇÃO FINAL
print("\n📊 Verificação final dos dados:")
print(f"  📝 Categorias: {db.categories.count_documents({'user_id': USER_ID})}")
print(f"  💰 Entradas (Janeiro 2026): {db.entries.count_documents({'user_id': USER_ID, 'month': 1, 'year': 2026})}")
print(f"  💸 Saídas (Janeiro 2026): {db.expenses.count_documents({'user_id': USER_ID, 'month': 1, 'year': 2026})}")

# Calcular totais
total_entradas = sum([e["amount"] for e in db.entries.find({"user_id": USER_ID, "month": 1, "year": 2026})])
total_saidas = sum([e["amount"] for e in db.expenses.find({"user_id": USER_ID, "month": 1, "year": 2026})])
saldo = total_entradas - total_saidas

print(f"\n💵 Totais calculados:")
print(f"  💰 Total Entradas: R$ {total_entradas:,.2f}")
print(f"  💸 Total Saídas: R$ {total_saidas:,.2f}")
print(f"  📊 Saldo: R$ {saldo:,.2f}")

print("\n✅ Restauração de dados concluída com sucesso!")
