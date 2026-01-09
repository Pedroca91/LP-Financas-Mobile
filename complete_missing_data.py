#!/usr/bin/env python3
"""
Script para completar dados faltantes (Salários)
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

USER_ID = "49abed68-cee9-4755-ac3c-119942e0e2c0"

print("🚀 Completando dados faltantes...")

# Buscar IDs das categorias
def get_category_id(name):
    cat = db.categories.find_one({"name": name, "user_id": USER_ID})
    return cat["id"] if cat else None

# Inserir os salários que faltaram
salarios = [
    {
        "category": "Salário Pedro",
        "description": "-",
        "amount": 2500.00,
        "expected_date": "2026-01-09",
        "received_date": "2026-01-08",
        "status": "received"
    },
    {
        "category": "Salário Liz",
        "description": "-",
        "amount": 3234.78,
        "expected_date": "2026-01-05",
        "received_date": "2026-01-06",
        "status": "received"
    },
]

print("\n💰 Inserindo salários faltantes...")
for salario in salarios:
    cat_id = get_category_id(salario["category"])
    if not cat_id:
        print(f"  ❌ Categoria não encontrada: {salario['category']}")
        continue
    
    # Verificar se já existe
    existing = db.entries.find_one({
        "user_id": USER_ID,
        "category_id": cat_id,
        "amount": salario["amount"],
        "month": 1,
        "year": 2026
    })
    
    if existing:
        print(f"  ⏭️  Entrada já existe: {salario['category']} - R$ {salario['amount']:.2f}")
        continue
    
    entry_data = {
        "id": str(uuid.uuid4()),
        "user_id": USER_ID,
        "category_id": cat_id,
        "description": salario["description"],
        "amount": salario["amount"],
        "expected_date": salario["expected_date"],
        "received_date": salario["received_date"],
        "status": salario["status"],
        "month": 1,
        "year": 2026,
        "created_at": datetime.now().isoformat()
    }
    db.entries.insert_one(entry_data)
    print(f"  ✅ Entrada criada: {salario['category']} - R$ {salario['amount']:.2f}")

# Verificação final
print("\n📊 Verificação final dos dados:")
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

# Separar valores
entradas_recebidas = sum([e["amount"] for e in db.entries.find({"user_id": USER_ID, "month": 1, "year": 2026, "status": "received"})])
entradas_pendentes = sum([e["amount"] for e in db.entries.find({"user_id": USER_ID, "month": 1, "year": 2026, "status": "pending"})])
saidas_pagas = sum([e["amount"] for e in db.expenses.find({"user_id": USER_ID, "month": 1, "year": 2026, "status": "paid"})])
saidas_pendentes = sum([e["amount"] for e in db.expenses.find({"user_id": USER_ID, "month": 1, "year": 2026, "status": "pending"})])

print(f"\n💵 Detalhamento:")
print(f"  💰 Receitas Recebidas: R$ {entradas_recebidas:,.2f}")
print(f"  ⏳ Receitas Pendentes: R$ {entradas_pendentes:,.2f}")
print(f"  💸 Despesas Pagas: R$ {saidas_pagas:,.2f}")
print(f"  ⏳ Despesas Pendentes: R$ {saidas_pendentes:,.2f}")

print("\n✅ Dados completados com sucesso!")
