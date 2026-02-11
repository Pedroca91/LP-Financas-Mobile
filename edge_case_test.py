#!/usr/bin/env python3
"""
Edge case testing for the new endpoints
"""

import requests
import json

BASE_URL = "https://finance-offline-4.preview.emergentagent.com/api"
TEST_EMAIL = "Pedrohcarvalho1997@gmail.com"
TEST_PASSWORD = "S@muka91"

def authenticate():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    return response.json()["token"] if response.status_code == 200 else None

def test_edge_cases():
    """Test edge cases and error conditions"""
    token = authenticate()
    headers = {"Authorization": f"Bearer {token}"}
    
    print("🧪 Testing edge cases...")
    
    # Test 1: Invalid CSV content
    print("\n1. Testing invalid CSV content...")
    response = requests.post(
        f"{BASE_URL}/import/parse-csv",
        data="",  # Empty content
        headers={"Content-Type": "text/plain", **headers}
    )
    
    if response.status_code != 200:
        print("✅ Correctly rejected empty CSV")
    else:
        print("❌ Should have rejected empty CSV")
    
    # Test 2: Invalid JSON for bank statement import
    print("\n2. Testing invalid transaction data...")
    invalid_data = {
        "transactions": [
            {
                "date": "invalid-date",  # Invalid date format
                "description": "Test",
                "value": "not-a-number",  # Invalid value
                "type": "income"
            }
        ]
    }
    
    response = requests.post(
        f"{BASE_URL}/import/bank-statement",
        json=invalid_data,
        headers={"Content-Type": "application/json", **headers}
    )
    
    # Should still process but may have errors in the response
    if response.status_code == 200:
        result = response.json()
        if result.get("errors") or result.get("total_imported", 0) == 0:
            print("✅ Correctly handled invalid transaction data")
        else:
            print("❌ Should have reported errors for invalid data")
    else:
        print(f"✅ Correctly rejected with status: {response.status_code}")
    
    # Test 3: Notification token without authentication
    print("\n3. Testing notification endpoints without authentication...")
    response = requests.post(
        f"{BASE_URL}/notifications/token",
        json={"token": "test"}
    )
    
    if response.status_code == 401 or response.status_code == 403:
        print("✅ Correctly rejected unauthenticated notification request")
    else:
        print(f"❌ Should have rejected unauthenticated request, got: {response.status_code}")
    
    # Test 4: Very long CSV content
    print("\n4. Testing large CSV content...")
    large_csv = "Data;Descrição;Valor\n" + "\n".join([f"2025-01-{i+1:02d};Transação {i+1};{i*10}" for i in range(200)])
    
    response = requests.post(
        f"{BASE_URL}/import/parse-csv",
        data=large_csv,
        headers={"Content-Type": "text/plain", **headers}
    )
    
    if response.status_code == 200:
        result = response.json()
        if "sample_data" in result and len(result["sample_data"]) <= 10:
            print("✅ Correctly limited sample data size")
        else:
            print("❌ Should limit sample data size")
    else:
        print(f"❌ Failed to process large CSV: {response.status_code}")

if __name__ == "__main__":
    test_edge_cases()