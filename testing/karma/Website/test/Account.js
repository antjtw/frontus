
var usernameIssuer = "phantom+ceo@sharewave.com";
var passwordIssuer = "never-";
var secondsToSleep = 1; //At least 1 recommended
var usernameInvestor = "eric+1@sharewave.com";
var documentName = "Sample PDF Document";
var numberOfDocuments = 2;

describe("Login tests", function() {

	afterEach(function() {
		sleep(2);
	});

	// it("Should display homepage", function(){
	// 	browser().navigateTo("/");
	// 	expect(element(".button").count()).toBe(0);
	// });

	// it("Should not log in", function() {
	// 	browser().navigateTo("/login/");
	// 	input('username').enter(usernameIssuer);
	// 	input('password').enter("invalid password");
	// 	element('[type=submit]').click();
	// 	expect(input('username').val()).toBe(usernameIssuer); //Still on same page
	// });

	it("Should log in", function() {
		browser().navigateTo("/login/");
		input('username').enter(usernameIssuer);
		input('password').enter(passwordIssuer);
		element('[type=submit]').click();
		sleep(secondsToSleep);
		browser().navigateTo("/investor/profile/contact");
		sleep(secondsToSleep);
		expect(input('name').val()).toMatch("CEO");
		// expect(element('title').text()).toBe("Edit Investor Profile | ShareWave");
	});
});

// describe("Profile tests", function() {

// 	afterEach(function() {
// 		sleep(1);
// 	});

// 	it("Should change the profile", function() {
// 		browser().navigateTo("/investor/profile/contact");
// 		input('name').enter("Gaston Leroux");
// 		input('street').enter("123 Street Ave");
// 		input('city').enter("New York");
// 		select('state').option("New York");
// 		input('postalcode');
// 		element('.saveButton.button').click();
// 		browser().navigateTo("/investor/profile/contact");
// 		expect(input('name').val()).toBe("Gaston Leroux");
// 		//TODO: Check others and switch back
// 	});
// });

// describe("Document tests", function() {

// 	afterEach(function() {
// 		sleep(1);
// 	});

// 	//TODO upload document via brijj.js

// 	it("Should display the correct number of documents", function() {
// 		browser().navigateTo("/company/documents/");
// 		expect(element('a.ng-binding').count()).toBe(numberOfDocuments);
// 	});

// 	it("Should filter documents", function() {
// 		browser().navigateTo("/company/documents/");
// 		input('query').enter(documentName.substring(2, documentName.length-1));
// 		expect(element('a.ng-binding').count()).toBe(1);
// 		input('query').enter(documentName + " 1 2  3   4     5      ");
// 		expect(element('a.ng-binding').count()).toBe(0);
// 	});

// 	it("Should open the upload modal", function() {
// 		browser().navigateTo("/company/documents/");
// 		expect(element('.modalHeader').count()).toBe(0);
// 		element('.button.subText.blueButton').click();
// 		sleep(secondsToSleep);
// 		expect(element('.modalHeader').count()).toBe(1);
// 	});

// 	it("Should open a document", function() {
// 		browser().navigateTo("/company/documents/");
// 		input('query').enter(documentName);
// 		sleep(secondsToSleep);
// 		element('a.ng-binding').click();
// 		expect(browser().location().url()).toMatch('view.doc.[0-9]*');
// 	});
// });

