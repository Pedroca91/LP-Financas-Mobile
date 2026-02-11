#!/usr/bin/env python3
"""
Additional validation tests for imported data
"""

import requests
import json
from datetime import datetime

BASE_URL = "https://finance-offline-4.preview.emergentagent.com/api"
TEST_EMAIL = "Pedrohcarvalho1997@gmail.com"
TEST_PASSWORD = "S@muka91"

def authenticate():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
        headers={"Content-Type": "application/json"}
    )
    
    if response.status_code == 200:
        return response.json()["token"]
    return None

def verify_imported_transactions():
    """Verify that the imported transactions were actually saved"""
    token = authenticate()
    if not token:
        print("❌ Authentication failed")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Check incomes for February 2025
    print("🔍 Checking imported incomes...")
    response = requests.get(f"{BASE_URL}/incomes?month=2&year=2025", headers=headers)
    
    if response.status_code == 200:
        incomes = response.json()
        test_income = next((i for i in incomes if "Teste Receita" in i["description"]), None)
        
        if test_income:
            print("✅ Test income found in database:")
            print(f"   Description: {test_income['description']}")
            print(f"   Value: {test_income['value']}")
            print(f"   Date: {test_income['date']}")
        else:
            print("❌ Test income NOT found in database")
    else:
        print(f"❌ Failed to fetch incomes: {response.status_code}")
    
    # Check expenses for February 2025
    print("\n🔍 Checking imported expenses...")
    response = requests.get(f"{BASE_URL}/expenses?month=2&year=2025", headers=headers)
    
    if response.status_code == 200:
        expenses = response.json()
        test_expense = next((e for e in expenses if "Teste Despesa" in e["description"]), None)
        
        if test_expense:
            print("✅ Test expense found in database:")
            print(f"   Description: {test_expense['description']}")
            print(f"   Value: {test_expense['value']}")
            print(f"   Date: {test_expense['date']}")
        else:
            print("❌ Test expense NOT found in database")
    else:
        print(f"❌ Failed to fetch expenses: {response.status_code}")

if __name__ == "__main__":
    verify_imported_transactions()