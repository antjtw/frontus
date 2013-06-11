from selenium import webdriver
import unittest
from includes import *

class LoginTests(unittest.TestCase):

	@classmethod
	def setUpClass(self):
		self.driver = webdriver.Firefox()
		# self.driver = webdriver.Chrome(chromedriver)

	@classmethod
	def tearDownClass(self):
		self.driver.quit()

	def test_nologin(self):
		driver = self.driver
		login(driver, "user@example.com", "password")
		self.assertIn("Login", driver.title)
		self.assertIn("Please try again", driver.find_element_by_css_selector('[ng-show=showError]').text)
		logout()

	def test_login(self):
		driver = self.driver
		login(driver, issuerUsername, issuerPassword)
		self.assertEqual("Phantom CEO", driver.find_element_by_name("name").get_attribute("value"))
		logout()

if __name__ == '__main__':
	unittest.main()