#!/usr/bin/env python3
import requests
import sys
from datetime import datetime
import json

class CarFinancasAPITester:
    def __init__(self, base_url="https://check-sistema.preview.emergentagent.com/api"):
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
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

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

    def test_health_check(self):
        """Test basic health endpoints"""
        print("\n=== HEALTH CHECK TESTS ===")
        success1, _ = self.run_test("API Root", "GET", "", 200)
        success2, _ = self.run_test("Health Check", "GET", "health", 200)
        return success1 and success2

    def test_admin_login(self):
        """Test admin login"""
        print("\n=== AUTHENTICATION TESTS ===")
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
            print(f"   Token obtained: {self.token[:20]}...")
            print(f"   User ID: {self.user_id}")
            return True
        return False

    def test_auth_me(self):
        """Test getting current user info"""
        success, response = self.run_test("Get Current User", "GET", "auth/me", 200)
        if success:
            print(f"   User: {response.get('name')} ({response.get('email')})")
            print(f"   Role: {response.get('role')}")
        return success

    def test_categories(self):
        """Test categories endpoints"""
        print("\n=== CATEGORIES TESTS ===")
        
        # Get categories
        success1, categories = self.run_test("Get Categories", "GET", "categories", 200)
        
        # Create a test category
        test_category = {
            "name": "Test Category",
            "type": "expense"
        }
        success2, created_cat = self.run_test("Create Category", "POST", "categories", 200, test_category)
        
        category_id = None
        if success2 and 'id' in created_cat:
            category_id = created_cat['id']
            
            # Update category
            updated_data = {"name": "Updated Test Category", "type": "expense"}
            success3, _ = self.run_test("Update Category", "PUT", f"categories/{category_id}", 200, updated_data)
            
            # Delete category
            success4, _ = self.run_test("Delete Category", "DELETE", f"categories/{category_id}", 200)
            
            return success1 and success2 and success3 and success4
        
        return success1 and success2

    def test_incomes(self):
        """Test income endpoints"""
        print("\n=== INCOMES TESTS ===")
        
        # Get categories first to use in income creation
        _, categories = self.run_test("Get Categories for Income", "GET", "categories", 200)
        income_categories = [c for c in categories if c.get('type') == 'income']
        
        if not income_categories:
            print("❌ No income categories found, skipping income tests")
            return False
            
        category_id = income_categories[0]['id']
        
        # Get incomes
        success1, _ = self.run_test("Get Incomes", "GET", "incomes", 200)
        
        # Create income
        test_income = {
            "category_id": category_id,
            "description": "Test Income",
            "value": 1000.0,
            "date": "2024-01-15",
            "status": "pending",
            "month": 1,
            "year": 2024
        }
        success2, created_income = self.run_test("Create Income", "POST", "incomes", 200, test_income)
        
        income_id = None
        if success2 and 'id' in created_income:
            income_id = created_income['id']
            
            # Update income
            updated_data = {**test_income, "value": 1500.0, "status": "received"}
            success3, _ = self.run_test("Update Income", "PUT", f"incomes/{income_id}", 200, updated_data)
            
            # Delete income
            success4, _ = self.run_test("Delete Income", "DELETE", f"incomes/{income_id}", 200)
            
            return success1 and success2 and success3 and success4
        
        return success1 and success2

    def test_expenses(self):
        """Test expense endpoints"""
        print("\n=== EXPENSES TESTS ===")
        
        # Get categories first
        _, categories = self.run_test("Get Categories for Expense", "GET", "categories", 200)
        expense_categories = [c for c in categories if c.get('type') == 'expense']
        
        if not expense_categories:
            print("❌ No expense categories found, skipping expense tests")
            return False
            
        category_id = expense_categories[0]['id']
        
        # Get expenses
        success1, _ = self.run_test("Get Expenses", "GET", "expenses", 200)
        
        # Create expense
        test_expense = {
            "category_id": category_id,
            "description": "Test Expense",
            "value": 500.0,
            "date": "2024-01-15",
            "payment_method": "cash",
            "installments": 1,
            "current_installment": 1,
            "status": "pending",
            "month": 1,
            "year": 2024
        }
        success2, created_expense = self.run_test("Create Expense", "POST", "expenses", 200, test_expense)
        
        expense_id = None
        if success2 and 'id' in created_expense:
            expense_id = created_expense['id']
            
            # Update expense
            updated_data = {**test_expense, "value": 750.0, "status": "paid"}
            success3, _ = self.run_test("Update Expense", "PUT", f"expenses/{expense_id}", 200, updated_data)
            
            # Delete expense
            success4, _ = self.run_test("Delete Expense", "DELETE", f"expenses/{expense_id}", 200)
            
            return success1 and success2 and success3 and success4
        
        return success1 and success2

    def test_dashboard(self):
        """Test dashboard endpoints"""
        print("\n=== DASHBOARD TESTS ===")
        
        # Test dashboard summary
        success1, summary = self.run_test("Dashboard Summary", "GET", "dashboard/summary?month=1&year=2024", 200)
        if success1:
            print(f"   Balance: {summary.get('balance', 0)}")
            print(f"   Total Income: {summary.get('total_income', 0)}")
            print(f"   Total Expense: {summary.get('total_expense', 0)}")
        
        # Test yearly data
        success2, yearly = self.run_test("Yearly Summary", "GET", "dashboard/yearly?year=2024", 200)
        
        return success1 and success2

    def test_investments(self):
        """Test investment endpoints"""
        print("\n=== INVESTMENTS TESTS ===")
        
        # Get categories first
        _, categories = self.run_test("Get Categories for Investment", "GET", "categories", 200)
        investment_categories = [c for c in categories if c.get('type') == 'investment']
        
        if not investment_categories:
            print("❌ No investment categories found, skipping investment tests")
            return False
            
        category_id = investment_categories[0]['id']
        
        # Get investments
        success1, _ = self.run_test("Get Investments", "GET", "investments", 200)
        
        # Create investment
        test_investment = {
            "category_id": category_id,
            "description": "Test Investment",
            "initial_balance": 1000.0,
            "contribution": 200.0,
            "dividends": 50.0,
            "withdrawal": 0.0,
            "month": 1,
            "year": 2024
        }
        success2, created_investment = self.run_test("Create Investment", "POST", "investments", 200, test_investment)
        
        investment_id = None
        if success2 and 'id' in created_investment:
            investment_id = created_investment['id']
            
            # Update investment
            updated_data = {**test_investment, "contribution": 300.0, "dividends": 75.0}
            success3, _ = self.run_test("Update Investment", "PUT", f"investments/{investment_id}", 200, updated_data)
            
            # Delete investment
            success4, _ = self.run_test("Delete Investment", "DELETE", f"investments/{investment_id}", 200)
            
            return success1 and success2 and success3 and success4
        
        return success1 and success2

    def test_credit_cards(self):
        """Test credit card endpoints"""
        print("\n=== CREDIT CARDS TESTS ===")
        
        # Get credit cards
        success1, _ = self.run_test("Get Credit Cards", "GET", "credit-cards", 200)
        
        # Create credit card
        test_card = {
            "name": "Test Credit Card",
            "limit": 5000.0,
            "closing_day": 15,
            "due_day": 10
        }
        success2, created_card = self.run_test("Create Credit Card", "POST", "credit-cards", 200, test_card)
        
        card_id = None
        if success2 and 'id' in created_card:
            card_id = created_card['id']
            
            # Update credit card
            updated_data = {**test_card, "limit": 7500.0, "name": "Updated Test Card"}
            success3, _ = self.run_test("Update Credit Card", "PUT", f"credit-cards/{card_id}", 200, updated_data)
            
            # Delete credit card
            success4, _ = self.run_test("Delete Credit Card", "DELETE", f"credit-cards/{card_id}", 200)
            
            return success1 and success2 and success3 and success4
        
        return success1 and success2

    def test_user_registration(self):
        """Test user registration"""
        print("\n=== USER REGISTRATION TESTS ===")
        
        # Test user registration
        test_user = {
            "email": "testuser@example.com",
            "name": "Test User",
            "password": "TestPassword123!"
        }
        success1, response = self.run_test("User Registration", "POST", "auth/register", 200, test_user)
        
        if success1 and 'user_id' in response:
            user_id = response['user_id']
            print(f"   New user created with ID: {user_id}")
            
            # Try to login with new user (should fail - pending approval)
            success2, _ = self.run_test("Login Pending User", "POST", "auth/login", 403, 
                                      {"email": test_user["email"], "password": test_user["password"]})
            
            # Admin approve the user
            success3, _ = self.run_test("Approve User", "PATCH", f"admin/users/{user_id}/approve", 200)
            
            # Now login should work
            success4, login_response = self.run_test("Login Approved User", "POST", "auth/login", 200,
                                                   {"email": test_user["email"], "password": test_user["password"]})
            
            # Clean up - delete the test user
            success5, _ = self.run_test("Delete Test User", "DELETE", f"admin/users/{user_id}", 200)
            
            return success1 and success2 and success3 and success4 and success5
        
        return success1

    def test_reports(self):
        """Test report endpoints"""
        print("\n=== REPORTS TESTS ===")
        
        # Test income report by category
        success1, _ = self.run_test("Income Report by Category", "GET", 
                                  "reports/by-category?month=1&year=2024&type=income", 200)
        
        # Test expense report by category
        success2, _ = self.run_test("Expense Report by Category", "GET", 
                                  "reports/by-category?month=1&year=2024&type=expense", 200)
        
        return success1 and success2

    def test_admin_endpoints(self):
        """Test admin-specific endpoints"""
        print("\n=== ADMIN TESTS ===")
        
        # List all users
        success1, users = self.run_test("List All Users", "GET", "admin/users", 200)
        if success1:
            print(f"   Found {len(users)} users")
        
        return success1

    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting CarFinanças API Tests")
        print(f"Backend URL: {self.base_url}")
        print("=" * 50)
        
        # Health check first
        if not self.test_health_check():
            print("❌ Health check failed, stopping tests")
            return False
        
        # Authentication
        if not self.test_admin_login():
            print("❌ Admin login failed, stopping tests")
            return False
        
        if not self.test_auth_me():
            print("❌ Auth me failed")
        
        # Core functionality tests
        self.test_categories()
        self.test_incomes()
        self.test_expenses()
        self.test_dashboard()
        self.test_admin_endpoints()
        
        # Print results
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for failure in self.failed_tests:
                print(f"   - {failure.get('test', 'Unknown')}: {failure}")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"Success Rate: {success_rate:.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = CarFinancasAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())