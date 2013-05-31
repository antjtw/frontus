from selenium import webdriver
from selenium.webdriver.support.ui import WebDriverWait # available since 2.4.0
from selenium.webdriver.support import expected_conditions as EC # available since 2.26.0
import unittest
import time
from datetime import datetime
from includes import *

class LoginTests(unittest.TestCase):

	@classmethod
	def setUpClass(self):
		self.driver = webdriver.Firefox()
		# self.driver = webdriver.Chrome(chromedriver)
		self.driver.implicitly_wait(10)

	@classmethod
	def tearDownClass(self):
		self.driver.quit()

	def setUp(self):
		login(self.driver, issuerUsername, issuerPassword)
		self.driver.get(baseURL + "/company/documents/")

	def tearDown(self):
		logout(self.driver)

	def test_displayDocuments(self):
		print 'test_displayDocuments'
		driver = self.driver
		tbody = driver.find_element_by_css_selector('tbody').text
		self.assertIn(file1, tbody)
		self.assertIn(file2, tbody)

	def test_searchDocuments(self):
		print 'test_searchDocuments'
		driver = self.driver
		searchBox = driver.find_element_by_css_selector('[ng-model=query]')

		searchBox.send_keys(file1[1:4]) #Search for file1
		time.sleep(sleep)
		self.assertIn(file1, driver.find_element_by_css_selector('tbody').text)

		searchBox.clear()
		searchBox.send_keys(file1+file2 + "search") #Search random string, should not display results
		time.sleep(sleep)
		self.assertNotIn(file1, driver.find_element_by_css_selector('tbody').text)
		self.assertNotIn(file2, driver.find_element_by_css_selector('tbody').text)

		searchBox.clear()
		searchBox.send_keys(file2) # Search for file2 by exact name
		time.sleep(sleep)
		self.assertIn(file2, driver.find_element_by_css_selector('tbody').text)

	def test_openDocument(self):
		print 'test_openDocument'
		driver = self.driver
		openDocument(driver)
		self.assertIn("Company Document Viewer", driver.title)

	def test_shareDocument(self):
		print 'test_shareDocument'
		driver = self.driver
		openDocument(driver)
		driver.find_element_by_css_selector('BUTTON.button.subText.blueButton').click()
		time.sleep(sleep)
		driver.find_element_by_css_selector('[ng_model=sendeeEmail]').send_keys(investorUsername)
		driver.find_element_by_css_selector('button.button.subText.greenButton').click()
		time.sleep(5)
		emailMsg = check_email(emailUsername, emailPassword)
		self.assertIn("has been shared with you", emailMsg)
		self.assertIn() #TODO CHECK EMAIL FOR DATE

def openDocument(driver):
	driver.find_element_by_css_selector('a.ng-binding').click()

if __name__ == '__main__':
	unittest.main()