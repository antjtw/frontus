describe("LoginApp", function() {

	it("Should log into Sharewave", function() {
		browser().navigateTo("http://localhost:4040/login/");
		input('username').enter('dexter+1@sharewave.com');
		input('password').enter('never-');
		expect(input('username').val()).toEqual('dexter+1@sharewave.com'); //Expect email address to be entered in the login box
		element(":button").click(); //Click the submit button
		sleep(2);
		//pause();
		browser().reload();
		//browser().navigateTo("/investor/profile/contact");
		//pause();
		expect(input('username').val()).toEqual('dexter+1@sharewave.com'); //Expect email address to be in the profile page after logging in
	});
});