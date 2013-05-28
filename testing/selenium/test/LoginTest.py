from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.support.ui import WebDriverWait # available since 2.4.0
from selenium.webdriver.support import expected_conditions as EC # available since 2.26.0

driver = webdriver.Firefox()

driver.get("http://localhost:4040/login/")

loginPageTitle = driver.title
print loginPageTitle

usernameInput = driver.find_element_by_name("username")
passwordInput = driver.find_element_by_name("password")

usernameInput.send_keys("dexter+1@sharewave.com")
passwordInput.send_keys("never-")

passwordInput.send_keys("\n") #Log in using enter key
#driver.find_element_by_css_selector("[type=submit]").click() #Types of submit

loggedInTitle = driver.title
print loggedInTitle

assert loggedInTitle != loginPageTitle

driver.quit()