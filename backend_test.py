#!/usr/bin/env python3
import requests
import sys
from datetime import datetime
import json

class CarFinancasAPITester:
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

    def test_recurring_transactions(self):
        """Test recurring transactions endpoints"""
        print("\n=== RECURRING TRANSACTIONS TESTS ===")
        
        # Get categories first
        _, categories = self.run_test("Get Categories for Recurring", "GET", "categories", 200)
        expense_categories = [c for c in categories if c.get('type') == 'expense']
        
        if not expense_categories:
            print("❌ No expense categories found, skipping recurring tests")
            return False
            
        category_id = expense_categories[0]['id']
        
        # Get recurring transactions
        success1, _ = self.run_test("Get Recurring Transactions", "GET", "recurring", 200)
        
        # Create recurring transaction
        test_recurring = {
            "type": "expense",
            "category_id": category_id,
            "description": "Aluguel Mensal",
            "value": 1200.0,
            "frequency": "monthly",
            "start_date": "2024-01-01",
            "day_of_month": 5,
            "is_active": True,
            "payment_method": "debit"
        }
        success2, created_recurring = self.run_test("Create Recurring Transaction", "POST", "recurring", 200, test_recurring)
        
        recurring_id = None
        if success2 and 'id' in created_recurring:
            recurring_id = created_recurring['id']
            
            # Update recurring transaction
            updated_data = {**test_recurring, "value": 1300.0, "description": "Aluguel Mensal Atualizado"}
            success3, _ = self.run_test("Update Recurring Transaction", "PUT", f"recurring/{recurring_id}", 200, updated_data)
            
            # Generate transactions for a month
            success4, generated = self.run_test("Generate Recurring Transactions", "POST", "recurring/generate?month=1&year=2026", 200)
            if success4:
                print(f"   Generated {generated.get('count', 0)} transactions")
            
            # Delete recurring transaction
            success5, _ = self.run_test("Delete Recurring Transaction", "DELETE", f"recurring/{recurring_id}", 200)
            
            return success1 and success2 and success3 and success4 and success5
        
        return success1 and success2

    def test_budget_alerts(self):
        """Test budget alerts endpoints"""
        print("\n=== BUDGET ALERTS TESTS ===")
        
        # Get categories first
        _, categories = self.run_test("Get Categories for Budget", "GET", "categories", 200)
        expense_categories = [c for c in categories if c.get('type') == 'expense']
        
        if not expense_categories:
            print("❌ No expense categories found, skipping budget alerts tests")
            return False
            
        category_id = expense_categories[0]['id']
        
        # Create a budget first
        test_budget = {
            "category_id": category_id,
            "planned_value": 1000.0,
            "month": 1,
            "year": 2026,
            "type": "expense"
        }
        budget_success, _ = self.run_test("Create Budget for Alert Test", "POST", "budgets", 200, test_budget)
        
        # Create an expense to trigger alert
        test_expense = {
            "category_id": category_id,
            "description": "Gasto para Teste de Alerta",
            "value": 850.0,  # 85% of budget
            "date": "2026-01-15",
            "payment_method": "cash",
            "installments": 1,
            "current_installment": 1,
            "status": "paid",
            "month": 1,
            "year": 2026
        }
        expense_success, created_expense = self.run_test("Create Expense for Alert Test", "POST", "expenses", 200, test_expense)
        
        # Test budget alerts
        success1, alerts = self.run_test("Get Budget Alerts", "GET", "alerts/budget?month=1&year=2026", 200)
        if success1:
            print(f"   Found {len(alerts)} budget alerts")
            for alert in alerts:
                print(f"   - {alert.get('type', 'unknown')}: {alert.get('message', 'no message')}")
        
        # Clean up
        if expense_success and 'id' in created_expense:
            self.run_test("Delete Test Expense", "DELETE", f"expenses/{created_expense['id']}", 200)
        
        return success1

    def test_due_date_alerts(self):
        """Test due date alerts endpoints"""
        print("\n=== DUE DATE ALERTS TESTS ===")
        
        # Get categories first
        _, categories = self.run_test("Get Categories for Due Date", "GET", "categories", 200)
        expense_categories = [c for c in categories if c.get('type') == 'expense']
        
        if not expense_categories:
            print("❌ No expense categories found, skipping due date alerts tests")
            return False
            
        category_id = expense_categories[0]['id']
        
        # Create an expense with due date in the future
        from datetime import datetime, timedelta
        future_date = (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d")
        
        test_expense = {
            "category_id": category_id,
            "description": "Conta com Vencimento Próximo",
            "value": 300.0,
            "date": future_date,
            "due_date": future_date,
            "payment_method": "cash",
            "installments": 1,
            "current_installment": 1,
            "status": "pending",
            "month": datetime.now().month,
            "year": datetime.now().year
        }
        expense_success, created_expense = self.run_test("Create Expense with Due Date", "POST", "expenses", 200, test_expense)
        
        # Test due date alerts
        success1, alerts = self.run_test("Get Due Date Alerts", "GET", "alerts/due-dates", 200)
        if success1:
            print(f"   Found {len(alerts)} due date alerts")
            for alert in alerts:
                print(f"   - {alert.get('type', 'unknown')}: {alert.get('message', 'no message')}")
        
        # Clean up
        if expense_success and 'id' in created_expense:
            self.run_test("Delete Test Expense", "DELETE", f"expenses/{created_expense['id']}", 200)
        
        return success1

    def test_trends_analysis(self):
        """Test trends analysis endpoints"""
        print("\n=== TRENDS ANALYSIS TESTS ===")
        
        # Test trends analysis
        success1, trends = self.run_test("Get Trends Analysis", "GET", "analysis/trends?month=1&year=2026", 200)
        if success1:
            print(f"   Monthly data points: {len(trends.get('monthly_data', []))}")
            current = trends.get('current_month', {})
            print(f"   Current month income: {current.get('income', 0)}")
            print(f"   Current month expense: {current.get('expense', 0)}")
            print(f"   Current month balance: {current.get('balance', 0)}")
            
            variations = trends.get('variations', {})
            print(f"   Income trend: {variations.get('income_trend', 'unknown')}")
            print(f"   Expense trend: {variations.get('expense_trend', 'unknown')}")
            
            category_trends = trends.get('category_trends', [])
            print(f"   Category trends: {len(category_trends)} categories analyzed")
        
        return success1

    def test_advanced_credit_cards(self):
        """Test advanced credit card endpoints"""
        print("\n=== ADVANCED CREDIT CARDS TESTS ===")
        
        # Get categories first
        _, categories = self.run_test("Get Categories for Credit Card", "GET", "categories", 200)
        expense_categories = [c for c in categories if c.get('type') == 'expense']
        
        if not expense_categories:
            print("❌ No expense categories found, skipping credit card tests")
            return False
            
        category_id = expense_categories[0]['id']
        
        # Create a credit card first
        test_card = {
            "name": "Cartão Teste Avançado",
            "limit": 5000.0,
            "closing_day": 15,
            "due_day": 10
        }
        card_success, created_card = self.run_test("Create Credit Card for Advanced Tests", "POST", "credit-cards", 200, test_card)
        
        if not card_success or 'id' not in created_card:
            print("❌ Failed to create credit card, skipping advanced tests")
            return False
        
        card_id = created_card['id']
        
        # Create some expenses for the card
        test_expense = {
            "category_id": category_id,
            "description": "Compra no Cartão",
            "value": 500.0,
            "date": "2026-01-15",
            "payment_method": "credit",
            "credit_card_id": card_id,
            "installments": 3,
            "current_installment": 1,
            "status": "pending",
            "month": 1,
            "year": 2026
        }
        expense_success, created_expense = self.run_test("Create Credit Card Expense", "POST", "expenses", 200, test_expense)
        
        # Test credit card summary
        success1, summary = self.run_test("Get Credit Cards Summary", "GET", "credit-cards/summary?month=1&year=2026", 200)
        if success1:
            print(f"   Found {len(summary)} cards in summary")
            for card_summary in summary:
                card_info = card_summary.get('card', {})
                print(f"   - {card_info.get('name', 'Unknown')}: Spent {card_summary.get('spent', 0)}, Available {card_summary.get('available', 0)}")
        
        # Test card statement
        success2, statement = self.run_test("Get Card Statement", "GET", f"credit-cards/{card_id}/statement?month=1&year=2026", 200)
        if success2:
            print(f"   Statement total: {statement.get('total', 0)}")
            by_category = statement.get('by_category', {})
            print(f"   Categories in statement: {len(by_category)}")
        
        # Test card installments
        success3, installments = self.run_test("Get Card Installments", "GET", f"credit-cards/{card_id}/installments", 200)
        if success3:
            future_installments = installments.get('installments', [])
            print(f"   Future installments: {len(future_installments)}")
            print(f"   Total committed: {installments.get('total_committed', 0)}")
        
        # Test card available limit
        success4, available = self.run_test("Get Card Available Limit", "GET", f"credit-cards/{card_id}/available?month=1&year=2026", 200)
        if success4:
            print(f"   Limit: {available.get('limit', 0)}")
            print(f"   Spent: {available.get('spent', 0)}")
            print(f"   Available: {available.get('available', 0)}")
            print(f"   Usage: {available.get('usage_percentage', 0):.1f}%")
        
        # Clean up
        if expense_success and 'id' in created_expense:
            self.run_test("Delete Test Credit Card Expense", "DELETE", f"expenses/{created_expense['id']}", 200)
        
        self.run_test("Delete Test Credit Card", "DELETE", f"credit-cards/{card_id}", 200)
        
        return success1 and success2 and success3 and success4

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
        self.test_investments()
        self.test_credit_cards()
        self.test_dashboard()
        self.test_reports()
        self.test_admin_endpoints()
        self.test_user_registration()
        
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