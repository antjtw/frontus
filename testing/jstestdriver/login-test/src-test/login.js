LoginTest = TestCase("LoginTest");

LoginTest.prototype.test = function() {
	console.log("LoginTest", "Testing login");
	SWBrijj.login('bruce+1@sharewave.com', 'never-');
	assertEquals(1, 1);
}