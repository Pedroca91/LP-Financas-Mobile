#!/usr/bin/env python3
"""
Backend API Test Suite for CarFinanças
Testing Push Notifications and Bank Statement Import endpoints
"""

import requests
import json
import time
import sys
from typing import Dict, Any

# Configuration
BASE_URL = "https://app-view-expo.preview.emergentagent.com/api"
TEST_EMAIL = "Pedrohcarvalho1997@gmail.com"
TEST_PASSWORD = "S@muka91"

class APITester:
    def __init__(self):
        self.session = requests.Session()
        self.token = None
        self.user_data = None
        
    def log(self, message: str, level: str = "INFO"):
        """Log messages with timestamp"""
        timestamp = time.strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
        
    def authenticate(self) -> bool:
        """Login and get authentication token"""
        self.log("🔐 Authenticating user...")
        
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/login",
                json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                self.token = data["token"]
                self.user_data = data["user"]
                self.session.headers.update({"Authorization": f"Bearer {self.token}"})
                self.log(f"✅ Authentication successful for user: {self.user_data['name']}")
                return True
            else:
                self.log(f"❌ Authentication failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Authentication error: {str(e)}", "ERROR")
            return False
    
    def test_push_notifications_endpoints(self) -> Dict[str, Any]:
        """Test all push notifications endpoints"""
        self.log("🔔 Testing Push Notifications endpoints...")
        results = {}
        
        # Test 1: Save FCM Token
        self.log("Testing POST /api/notifications/token...")
        try:
            test_token = "fake_fcm_token_123_for_testing_purposes"
            response = self.session.post(
                f"{BASE_URL}/notifications/token",
                json={"token": test_token},
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log("✅ FCM token saved successfully")
                    results["save_token"] = {"status": "pass", "response": data}
                else:
                    self.log("❌ FCM token save failed - no success flag")
                    results["save_token"] = {"status": "fail", "response": data}
            else:
                self.log(f"❌ FCM token save failed: {response.status_code} - {response.text}")
                results["save_token"] = {"status": "fail", "error": response.text}
                
        except Exception as e:
            self.log(f"❌ FCM token save error: {str(e)}")
            results["save_token"] = {"status": "error", "error": str(e)}
        
        # Test 2: Get Notification Status
        self.log("Testing GET /api/notifications/status...")
        try:
            response = self.session.get(f"{BASE_URL}/notifications/status")
            
            if response.status_code == 200:
                data = response.json()
                if "enabled" in data:
                    self.log(f"✅ Notification status retrieved: enabled={data['enabled']}")
                    results["get_status"] = {"status": "pass", "response": data}
                else:
                    self.log("❌ Invalid notification status response structure")
                    results["get_status"] = {"status": "fail", "response": data}
            else:
                self.log(f"❌ Notification status failed: {response.status_code} - {response.text}")
                results["get_status"] = {"status": "fail", "error": response.text}
                
        except Exception as e:
            self.log(f"❌ Notification status error: {str(e)}")
            results["get_status"] = {"status": "error", "error": str(e)}
        
        # Test 3: Remove FCM Token
        self.log("Testing DELETE /api/notifications/token...")
        try:
            response = self.session.delete(f"{BASE_URL}/notifications/token")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log("✅ FCM token removed successfully")
                    results["remove_token"] = {"status": "pass", "response": data}
                else:
                    self.log("❌ FCM token removal failed - no success flag")
                    results["remove_token"] = {"status": "fail", "response": data}
            else:
                self.log(f"❌ FCM token removal failed: {response.status_code} - {response.text}")
                results["remove_token"] = {"status": "fail", "error": response.text}
                
        except Exception as e:
            self.log(f"❌ FCM token removal error: {str(e)}")
            results["remove_token"] = {"status": "error", "error": str(e)}
        
        return results
    
    def test_csv_parsing_endpoint(self) -> Dict[str, Any]:
        """Test CSV parsing endpoint"""
        self.log("📄 Testing CSV parsing endpoint...")
        
        # Test CSV content as specified in the requirements
        csv_content = """Data;Descrição;Valor
2025-02-01;Salário;5000.00
2025-02-05;Mercado;-150.50"""
        
        try:
            response = self.session.post(
                f"{BASE_URL}/import/parse-csv",
                data=csv_content,
                headers={"Content-Type": "text/plain"}
            )
            
            if response.status_code == 200:
                data = response.json()
                expected_keys = ["headers", "sample_data", "total_rows", "detected_columns"]
                
                if all(key in data for key in expected_keys):
                    self.log("✅ CSV parsing successful")
                    self.log(f"   Headers: {data['headers']}")
                    self.log(f"   Total rows: {data['total_rows']}")
                    self.log(f"   Detected columns: {data['detected_columns']}")
                    return {"status": "pass", "response": data}
                else:
                    self.log(f"❌ CSV parsing incomplete response: {data}")
                    return {"status": "fail", "response": data}
            else:
                self.log(f"❌ CSV parsing failed: {response.status_code} - {response.text}")
                return {"status": "fail", "error": response.text}
                
        except Exception as e:
            self.log(f"❌ CSV parsing error: {str(e)}")
            return {"status": "error", "error": str(e)}
    
    def test_bank_statement_import(self) -> Dict[str, Any]:
        """Test bank statement import endpoint"""
        self.log("💰 Testing bank statement import endpoint...")
        
        # Test data as specified in requirements
        import_data = {
            "transactions": [
                {
                    "date": "2025-02-01",
                    "description": "Teste Receita",
                    "value": 100.0,
                    "type": "income"
                },
                {
                    "date": "2025-02-02",
                    "description": "Teste Despesa",
                    "value": -50.0,
                    "type": "expense"
                }
            ]
        }
        
        try:
            response = self.session.post(
                f"{BASE_URL}/import/bank-statement",
                json=import_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                expected_keys = ["success", "imported_incomes", "imported_expenses", "total_imported"]
                
                if all(key in data for key in expected_keys) and data.get("success"):
                    self.log("✅ Bank statement import successful")
                    self.log(f"   Imported incomes: {data['imported_incomes']}")
                    self.log(f"   Imported expenses: {data['imported_expenses']}")
                    self.log(f"   Total imported: {data['total_imported']}")
                    
                    if data.get("errors"):
                        self.log(f"   Errors: {data['errors']}")
                        
                    return {"status": "pass", "response": data}
                else:
                    self.log(f"❌ Bank statement import failed: {data}")
                    return {"status": "fail", "response": data}
            else:
                self.log(f"❌ Bank statement import failed: {response.status_code} - {response.text}")
                return {"status": "fail", "error": response.text}
                
        except Exception as e:
            self.log(f"❌ Bank statement import error: {str(e)}")
            return {"status": "error", "error": str(e)}
    
    def run_all_tests(self) -> Dict[str, Any]:
        """Run all tests and return results"""
        self.log("🚀 Starting backend API tests...")
        
        # Authenticate first
        if not self.authenticate():
            return {"error": "Authentication failed - cannot proceed with tests"}
        
        results = {
            "authentication": {"status": "pass"},
            "push_notifications": self.test_push_notifications_endpoints(),
            "csv_parsing": self.test_csv_parsing_endpoint(),
            "bank_statement_import": self.test_bank_statement_import()
        }
        
        # Summary
        self.log("\n" + "="*50)
        self.log("📊 TEST RESULTS SUMMARY")
        self.log("="*50)
        
        total_tests = 0
        passed_tests = 0
        failed_tests = 0
        
        for category, result in results.items():
            if category == "authentication":
                total_tests += 1
                if result["status"] == "pass":
                    passed_tests += 1
                    self.log(f"✅ {category.upper()}: PASSED")
                else:
                    failed_tests += 1
                    self.log(f"❌ {category.upper()}: FAILED")
            elif isinstance(result, dict) and "status" in result:
                total_tests += 1
                if result["status"] == "pass":
                    passed_tests += 1
                    self.log(f"✅ {category.upper()}: PASSED")
                else:
                    failed_tests += 1
                    self.log(f"❌ {category.upper()}: FAILED")
            elif isinstance(result, dict):
                # Handle nested results (like push_notifications)
                for test_name, test_result in result.items():
                    if isinstance(test_result, dict) and "status" in test_result:
                        total_tests += 1
                        if test_result["status"] == "pass":
                            passed_tests += 1
                            self.log(f"✅ {category.upper()} - {test_name}: PASSED")
                        else:
                            failed_tests += 1
                            self.log(f"❌ {category.upper()} - {test_name}: FAILED")
        
        self.log(f"\n📈 TOTAL: {total_tests} tests | ✅ {passed_tests} passed | ❌ {failed_tests} failed")
        
        if failed_tests == 0:
            self.log("🎉 All tests PASSED!")
        else:
            self.log(f"⚠️  {failed_tests} tests FAILED")
        
        return results

def main():
    """Main test execution"""
    tester = APITester()
    results = tester.run_all_tests()
    
    # Exit with appropriate code
    failed_count = 0
    for category, result in results.items():
        if isinstance(result, dict) and "status" in result and result["status"] != "pass":
            failed_count += 1
        elif isinstance(result, dict):
            for test_result in result.values():
                if isinstance(test_result, dict) and "status" in test_result and test_result["status"] != "pass":
                    failed_count += 1
    
    sys.exit(1 if failed_count > 0 else 0)

if __name__ == "__main__":
    main()