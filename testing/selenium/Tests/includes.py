chromedriver = "/Users/ericzhaing/Dropbox/Work/Sharewave/git/sharewave/frontus/testing/selenium/Tests/chromedriver"

sleep = 2

baseURL = "http://localhost:4040"

issuerUsername = "inkywave+ceo@gmail.com"
issuerPassword = "pacmanwave"
issuerName = "Phantom CEO"
file1 = "Georgia Odyssey (2nd Edition)"
file2 = "Syllabus"

investorUsername = "inkywave+investor@gmail.com"
investorPassword = "pacmanwave"

emailUsername = "inkywave@gmail.com"
emailPassword = "pacmanwave"

import selenium.webdriver as webdriver
import selenium.webdriver.support.ui as ui
import time
def login(driver, username, password):
	driver.get(baseURL + "/login")
	# wait = ui.WebDriverWait(driver, 10)
	# wait.until(lambda driver: driver.find_element_by_name("name"))
	driver.find_element_by_name("username").send_keys(username)
	driver.find_element_by_name("password").send_keys(password)
	driver.find_element_by_xpath("//button[@type='submit']").click()
	time.sleep(sleep)

def logout(driver):
	time.sleep(sleep)
	driver.get(baseURL + "/login/logout")

import imaplib
def check_email(username, password):
	try:
		mail = imaplib.IMAP4_SSL('imap.gmail.com')
		mail.login(username, password)
		mail.list()
		# Out: list of "folders" aka labels in gmail.
		mail.select("inbox") # connect to inbox.

		result, data = mail.search(None, "ALL")
		 
		ids = data[0] # data is a list.
		id_list = ids.split() # ids is a space separated string
		latest_email_id = id_list[-1] # get the latest
		 
		result, data = mail.fetch(latest_email_id, "(RFC822)") # fetch the email body (RFC822) for the given ID
		 
		raw_email = data[0][1] # here's the body, which is raw text of the whole email
		# including headers and alternate payloads
		return raw_email
	except Exception:
		return "Unable to check email"

check_email(issuerUsername, issuerPassword)
