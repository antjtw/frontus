SWBrijjTest = TestCase("SWBrijjTest")

SWBrijjTest.prototype.test = function() {

	var result = SWBrijj.login("dexter+1@sharewave.com", "never-");
	
	result.then(function(x) {
		jstestdriver.console.log("Result", x);
	});

	jstestdriver.console.log();

}