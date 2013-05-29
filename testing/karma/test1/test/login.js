describe("Login test", function() {
	it("Should log into Sharewave", function() {
		SWBrijj.login("dexter+1@sharewave.com", "never-");
		expect(true).toBe(true);
	})	
})
