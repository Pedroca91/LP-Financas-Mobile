#!/usr/bin/env python3
import requests
import sys
from datetime import datetime
import json

class AdditionalCarFinancasTests:
    def __init__(self, base_url="https://finance-offline-4.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.admin_email = "Pedrohcarvalho1997@gmail.com"
        self.admin_password = "S@muka91"

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            response = None
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "response": response.text[:200]
                })
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                "test": name,
                "error": str(e)
            })
            return False, {}

    def login_admin(self):
        """Login as admin"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": self.admin_email, "password": self.admin_password}
        )
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            return True
        return False

    def test_parameter_filtering(self):
        """Test parameter filtering for incomes, expenses, and investments"""
        print("\n=== PARAMETER FILTERING TESTS ===")
        
        # Test incomes with month/year filtering
        success1, _ = self.run_test("Get Incomes - Month Filter", "GET", "incomes?month=1", 200)
        success2, _ = self.run_test("Get Incomes - Year Filter", "GET", "incomes?year=2024", 200)
        success3, _ = self.run_test("Get Incomes - Month+Year Filter", "GET", "incomes?month=1&year=2024", 200)
        
        # Test expenses with month/year filtering
        success4, _ = self.run_test("Get Expenses - Month Filter", "GET", "expenses?month=1", 200)
        success5, _ = self.run_test("Get Expenses - Year Filter", "GET", "expenses?year=2024", 200)
        success6, _ = self.run_test("Get Expenses - Month+Year Filter", "GET", "expenses?month=1&year=2024", 200)
        
        # Test investments with month/year filtering
        success7, _ = self.run_test("Get Investments - Month Filter", "GET", "investments?month=1", 200)
        success8, _ = self.run_test("Get Investments - Year Filter", "GET", "investments?year=2024", 200)
        success9, _ = self.run_test("Get Investments - Month+Year Filter", "GET", "investments?month=1&year=2024", 200)
        
        return all([success1, success2, success3, success4, success5, success6, success7, success8, success9])

    def test_error_handling(self):
        """Test error handling for invalid requests"""
        print("\n=== ERROR HANDLING TESTS ===")
        
        # Test invalid login
        success1, _ = self.run_test("Invalid Login", "POST", "auth/login", 401, 
                                  {"email": "invalid@email.com", "password": "wrongpassword"})
        
        # Test accessing protected endpoint without token
        old_token = self.token
        self.token = None
        success2, _ = self.run_test("No Auth Token", "GET", "categories", 401)
        self.token = old_token
        
        # Test invalid token
        old_token = self.token
        self.token = "invalid_token"
        success3, _ = self.run_test("Invalid Auth Token", "GET", "categories", 401)
        self.token = old_token
        
        # Test non-existent resource
        success4, _ = self.run_test("Non-existent Category", "GET", "categories/non-existent-id", 404)
        success5, _ = self.run_test("Non-existent Income", "DELETE", "incomes/non-existent-id", 404)
        
        return all([success1, success2, success3, success4, success5])

    def test_data_validation(self):
        """Test data validation"""
        print("\n=== DATA VALIDATION TESTS ===")
        
        # Test invalid email format
        success1, _ = self.run_test("Invalid Email Format", "POST", "auth/register", 422,
                                  {"email": "invalid-email", "name": "Test", "password": "password"})
        
        # Test missing required fields for category
        success2, _ = self.run_test("Missing Category Fields", "POST", "categories", 422,
                                  {"name": "Test Category"})  # Missing type
        
        # Test invalid category type
        success3, _ = self.run_test("Invalid Category Type", "POST", "categories", 200,
                                  {"name": "Test Category", "type": "invalid_type"})
        
        return success1 and success2

    def test_admin_block_functionality(self):
        """Test admin block user functionality"""
        print("\n=== ADMIN BLOCK FUNCTIONALITY TESTS ===")
        
        # Create a test user
        test_user = {
            "email": "blocktest@example.com",
            "name": "Block Test User",
            "password": "TestPassword123!"
        }
        success1, response = self.run_test("Create User for Block Test", "POST", "auth/register", 200, test_user)
        
        if not success1 or 'user_id' not in response:
            return False
            
        user_id = response['user_id']
        
        # Approve the user first
        success2, _ = self.run_test("Approve User for Block Test", "PATCH", f"admin/users/{user_id}/approve", 200)
        
        # User should be able to login
        success3, _ = self.run_test("Login Before Block", "POST", "auth/login", 200,
                                  {"email": test_user["email"], "password": test_user["password"]})
        
        # Block the user
        success4, _ = self.run_test("Block User", "PATCH", f"admin/users/{user_id}/block", 200)
        
        # User should not be able to login
        success5, _ = self.run_test("Login After Block", "POST", "auth/login", 403,
                                  {"email": test_user["email"], "password": test_user["password"]})
        
        # Clean up
        success6, _ = self.run_test("Delete Blocked User", "DELETE", f"admin/users/{user_id}", 200)
        
        return all([success1, success2, success3, success4, success5, success6])

    def test_dashboard_with_data(self):
        """Test dashboard with actual data"""
        print("\n=== DASHBOARD WITH DATA TESTS ===")
        
        # Get categories first
        _, categories = self.run_test("Get Categories for Dashboard Test", "GET", "categories", 200)
        income_categories = [c for c in categories if c.get('type') == 'income']
        expense_categories = [c for c in categories if c.get('type') == 'expense']
        
        if not income_categories or not expense_categories:
            print("❌ No categories found for dashboard test")
            return False
        
        # Create some test data
        test_income = {
            "category_id": income_categories[0]['id'],
            "description": "Dashboard Test Income",
            "value": 2000.0,
            "date": "2026-01-15",
            "status": "received",
            "month": 1,
            "year": 2026
        }
        success1, income_response = self.run_test("Create Income for Dashboard", "POST", "incomes", 200, test_income)
        
        test_expense = {
            "category_id": expense_categories[0]['id'],
            "description": "Dashboard Test Expense",
            "value": 800.0,
            "date": "2026-01-15",
            "payment_method": "cash",
            "installments": 1,
            "current_installment": 1,
            "status": "paid",
            "month": 1,
            "year": 2026
        }
        success2, expense_response = self.run_test("Create Expense for Dashboard", "POST", "expenses", 200, test_expense)
        
        # Test dashboard with data
        success3, dashboard = self.run_test("Dashboard Summary with Data", "GET", "dashboard/summary?month=1&year=2026", 200)
        
        if success3:
            print(f"   Balance: {dashboard.get('balance', 0)}")
            print(f"   Total Income: {dashboard.get('total_income', 0)}")
            print(f"   Total Expense: {dashboard.get('total_expense', 0)}")
            
            # Verify calculations
            expected_balance = 2000.0 - 800.0
            actual_balance = dashboard.get('balance', 0)
            if abs(actual_balance - expected_balance) < 0.01:
                print("✅ Dashboard calculations are correct")
            else:
                print(f"❌ Dashboard calculation error: expected {expected_balance}, got {actual_balance}")
        
        # Clean up test data
        if success1 and 'id' in income_response:
            self.run_test("Delete Test Income", "DELETE", f"incomes/{income_response['id']}", 200)
        if success2 and 'id' in expense_response:
            self.run_test("Delete Test Expense", "DELETE", f"expenses/{expense_response['id']}", 200)
        
        return success1 and success2 and success3

    def run_all_tests(self):
        """Run all additional tests"""
        print("🚀 Starting Additional CarFinanças API Tests")
        print(f"Backend URL: {self.base_url}")
        print("=" * 50)
        
        # Login first
        if not self.login_admin():
            print("❌ Admin login failed, stopping tests")
            return False
        
        # Run additional tests
        self.test_parameter_filtering()
        self.test_error_handling()
        self.test_data_validation()
        self.test_admin_block_functionality()
        self.test_dashboard_with_data()
        
        # Print results
        print("\n" + "=" * 50)
        print(f"📊 Additional Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for failure in self.failed_tests:
                print(f"   - {failure.get('test', 'Unknown')}: {failure}")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"Success Rate: {success_rate:.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = AdditionalCarFinancasTests()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())