#!/usr/bin/env python3
import requests
import sys

def test_budget_endpoints():
    """Test budget endpoints specifically"""
    base_url = "https://mobile-migration-11.preview.emergentagent.com/api"
    admin_email = "Pedrohcarvalho1997@gmail.com"
    admin_password = "S@muka91"
    
    # Login first
    login_response = requests.post(f"{base_url}/auth/login", 
                                 json={"email": admin_email, "password": admin_password})
    if login_response.status_code != 200:
        print("❌ Login failed")
        return False
    
    token = login_response.json()['token']
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    
    print("🔍 Testing Budget Endpoints...")
    
    # Get categories first
    categories_response = requests.get(f"{base_url}/categories", headers=headers)
    if categories_response.status_code != 200:
        print("❌ Failed to get categories")
        return False
    
    categories = categories_response.json()
    income_categories = [c for c in categories if c.get('type') == 'income']
    expense_categories = [c for c in categories if c.get('type') == 'expense']
    
    if not income_categories or not expense_categories:
        print("❌ No categories found")
        return False
    
    # Test budget endpoints
    tests_passed = 0
    total_tests = 0
    
    # Get budgets
    total_tests += 1
    response = requests.get(f"{base_url}/budgets", headers=headers)
    if response.status_code == 200:
        tests_passed += 1
        print("✅ Get Budgets - Passed")
    else:
        print(f"❌ Get Budgets - Failed: {response.status_code}")
    
    # Get budgets with filters
    total_tests += 1
    response = requests.get(f"{base_url}/budgets?month=1&year=2024", headers=headers)
    if response.status_code == 200:
        tests_passed += 1
        print("✅ Get Budgets with Filters - Passed")
    else:
        print(f"❌ Get Budgets with Filters - Failed: {response.status_code}")
    
    # Create income budget
    total_tests += 1
    budget_data = {
        "category_id": income_categories[0]['id'],
        "planned_value": 3000.0,
        "month": 1,
        "year": 2024,
        "type": "income"
    }
    response = requests.post(f"{base_url}/budgets", json=budget_data, headers=headers)
    if response.status_code == 200:
        tests_passed += 1
        print("✅ Create Income Budget - Passed")
        budget_id = response.json().get('id')
    else:
        print(f"❌ Create Income Budget - Failed: {response.status_code}")
        budget_id = None
    
    # Create expense budget
    total_tests += 1
    expense_budget_data = {
        "category_id": expense_categories[0]['id'],
        "planned_value": 1500.0,
        "month": 1,
        "year": 2024,
        "type": "expense"
    }
    response = requests.post(f"{base_url}/budgets", json=expense_budget_data, headers=headers)
    if response.status_code == 200:
        tests_passed += 1
        print("✅ Create Expense Budget - Passed")
        expense_budget_id = response.json().get('id')
    else:
        print(f"❌ Create Expense Budget - Failed: {response.status_code}")
        expense_budget_id = None
    
    # Test duplicate budget (should update existing)
    total_tests += 1
    duplicate_budget = {
        "category_id": income_categories[0]['id'],
        "planned_value": 3500.0,
        "month": 1,
        "year": 2024,
        "type": "income"
    }
    response = requests.post(f"{base_url}/budgets", json=duplicate_budget, headers=headers)
    if response.status_code == 200:
        tests_passed += 1
        print("✅ Update Existing Budget - Passed")
    else:
        print(f"❌ Update Existing Budget - Failed: {response.status_code}")
    
    # Delete budgets
    if budget_id:
        total_tests += 1
        response = requests.delete(f"{base_url}/budgets/{budget_id}", headers=headers)
        if response.status_code == 200:
            tests_passed += 1
            print("✅ Delete Income Budget - Passed")
        else:
            print(f"❌ Delete Income Budget - Failed: {response.status_code}")
    
    if expense_budget_id:
        total_tests += 1
        response = requests.delete(f"{base_url}/budgets/{expense_budget_id}", headers=headers)
        if response.status_code == 200:
            tests_passed += 1
            print("✅ Delete Expense Budget - Passed")
        else:
            print(f"❌ Delete Expense Budget - Failed: {response.status_code}")
    
    print(f"\n📊 Budget Tests: {tests_passed}/{total_tests} passed")
    return tests_passed == total_tests

if __name__ == "__main__":
    success = test_budget_endpoints()
    sys.exit(0 if success else 1)