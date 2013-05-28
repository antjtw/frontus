MyTest = TestCase("MyTest")

MyTest.prototype.test = function() {
	assertEquals("Hello", "Hello");
	var result = foo();
	assertEquals("bar", result);
}