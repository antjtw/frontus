
var usernameIssuer = "phantom+ceo@sharewave.com";
var passwordIssuer = "never-";
var secondsToSleep = 2; //At least 2 recommended
var usernameInvestor = "eric+1@sharewave.com";

describe("Login tests", function() {

	afterEach(function() {
		sleep(2);
	});

	it("Should not log in", function() {
		var result = SWBrijj.login("invalid@login.com", "foobar");
		result.then(function(x) {
			console.log("Should not log in result", x);
			expect({value: x.length}).toBe(0);
		}).except(function(x) {
			 fail("Log in 1", x);
		});
	});
	
	it("Should log in", function() {
		var result = SWBrijj.login(usernameIssuer, passwordIssuer);
		result.then(function(x) {
			console.log("Should log in result", x);
			expect({value: x.length}).toBeGreaterThan(0);
		}).except(function(x) {
			 fail("Log in 2", x);
		});
	});
});

describe("Document view/upload/delete tests", function() {
	var numberOfDocuments = 0;
	var files;

	beforeEach(function() {
		sleep(2);
	});

	it("Should display company documents", function() {
		var result = SWBrijj.tblm("document.docinfo");
		result.then(function(x) {
			numberOfDocuments = x.length;
			console.log("Number of Documents", numberOfDocuments);
			expect({value: numberOfDocuments}).toBeGreaterThan(0);
		}).except(function(x) {
			fail("Getting company docs", x);
		});
	});

	it("Should upload exactly 1 company document", function() {
		var fd = new FormData();
		var blob = pdfBlob;
		fd.append("uploadedFile", blob, "file1.pdf");
		var result = SWBrijj.uploadFile(fd);
		sleep(secondsToSleep);
		result.then(function(x) {
			console.log("Upload file result", x);
			expect({value: x}).toBe(1);
		}).except(function(x) {
			 fail("SWBrijj upload 1", x);
		});
	});

	it("Should upload exactly 3 company documents", function() {
		var fd = new FormData();
		var blob = pdfBlob;
		fd.append("uploadedFile", blob, "File 2.pdf");
		fd.append("uploadedFile", blob, "File 3.pdf");
		fd.append("uploadedFile", blob, "File 4.pdf");
		var result = SWBrijj.uploadFile(fd);
		sleep(secondsToSleep * 3);
		result.then(function(x) {
			console.log("Upload file result", x);
			expect({value: x}).toBe(3);
		}).except(function(x) {
			 fail("SWBrijj upload 3", x);
		});
	});	

	it("Should display the correct number of documents after 4 new uploads", function() {
		var result = SWBrijj.tblm("document.docinfo");
		result.then(function(x) {
			console.log("Number of Documents after 4 uploads", x.length);
			expect({value: x.length}).toBe(numberOfDocuments + 4);
			files = [getDocId("file1", x), getDocId("File 2", x), getDocId("File 3", x), getDocId("File 4", x)];
			console.log("File id's", files);
		}).except(function(x) {
			 fail("Verifying correct number of documents", x);
		});
	});

	it("Should delete the files created", function() {
		for (var i = 0; i < 4; i++) {
			var result = SWBrijj.procm("document.delete_document", files[i]);
			sleep(secondsToSleep);
			result.then(function(x) {
				console.log("Delete", x);
			}).except(function(x) {
				fail("Deleting files", x);
			});
		};
	});

	it("Should display the correct number of documents after the file deletes", function() {
		var result = SWBrijj.tblm("document.docinfo");
		result.then(function(x) {
			console.log("Number of Documents after deletions", x.length);
			expect({value: x.length}).toBe(numberOfDocuments);
		}).except(function(x) {
			fail("Verifying deletes");
		});
	});

});

describe("Document status tests", function() {
	var docId = 0;
	var filename = "testFile"; //Name of file

	it("Should upload one document for sharing testing", function() {
		var fd = new FormData();
		var blob = pdfBlob;
		fd.append("uploadedFile", blob, filename + ".pdf");
		var result = SWBrijj.uploadFile(fd);
		sleep(secondsToSleep);
		result.then(function(x) {
			console.log("Upload file result", x);
			expect({value: x}).toBe(1);
		}).except(function(x) {
			 fail("Error uploading", x);
		});
	});

	afterEach(function() {
		sleep(3);
	});

	it("Should get docId", function() {
		var result = SWBrijj.tblm("document.docinfo");
		sleep(secondsToSleep);
		result.then(function(x) {
			docId = getDocId(filename, x);
			console.log("Document ID", docId);
		}).except(function(x) {
			fail("Getting docId", x);
		});
	});

	it("Should verify the docId corresponds to the correct document", function() {
		var result = SWBrijj.procm("document.get_docdetail", docId);
		result.then(function(x) {
			console.log("Document detail", x);
			expect({value: x[0]["docname"]}).toBe(filename);
		}).except(function(x) {
			fail("Getting doc detail", x);
		});
	});

	it("Should share a document with another person", function() {
		var result = SWBrijj.procm("document.share_document", docId, usernameInvestor, "Sharing test");
		result.then(function(x) {
			console.log("Share", x);
		}).except(function(x) {
			fail("Sharing", x);
		});
	});

	it("Should verify that the document has been shared correctly", function(){
		var result = SWBrijj.procm("document.document_status", docId);
		result.then(function(x) {
			console.log("Status", x[0]["event"]);
			console.log("User", x[0]["sent_to"]);
			expect({value: x[0]["event"]}).toBe("shared");
			expect({value: x[0]["sent_to"]}).toBe(usernameInvestor);
		}).except(function(x){ 
			fail("Verifying document sharing", x);
		});
	});

	it("Should send a reminder", function() {
		var result = SWBrijj.procm("document.remind_document", docId, usernameInvestor, "Reminder");
		result.then(function(x) {
			console.log("Remind", x);
		}).except(function(x) {
			fail("Remind", x);
		});
	});
	
	it("Should verify that the reminder has been sent correctly", function(){
		var result = SWBrijj.procm("document.document_status", docId);
		result.then(function(x) {
			console.log("Status", x[0]["event"]);
			console.log("User", x[0]["sent_to"]);
			expect({value: x[0]["event"]}).toBe("reminder");
			expect({value: x[0]["sent_to"]}).toBe(usernameInvestor);
		}).except(function(x){ 
			fail("Verifying document reminder", x);
		});
	});

 	it("Should revoke access a document", function() {
		var result = SWBrijj.procm("document.document_revoke", docId, usernameInvestor);
		result.then(function(x) {
			console.log("Revoke", x);
		}).except(function(x) {
			fail("Revoke", x);
		});
	});

	it("Should verify that the document has been revoked correctly", function(){
		var result = SWBrijj.procm("document.document_status", docId);
		result.then(function(x) {
			console.log("Status", x[0]["event"]);
			console.log("User", x[0]["sent_to"]);
			expect({value: x[0]["event"]}).toBe("revoked");
			expect({value: x[0]["sent_to"]}).toBe(usernameInvestor);
		}).except(function(x){ 
			fail("Verifying document reminder", x);
		});
	});

	it("Should rename the uploaded file", function() {
		var result = SWBrijj.procm("document.title_change", docId, "File Renamed");
		result.then(function(x) {
			console.log("File rename", x);
		}).except(function(x) {
			fail("Renaming", x)
		});
	});

	it("Should verify the file has been renamed", function() {
		var result = SWBrijj.procm("document.get_docdetail", docId);
		result.then(function(x) {
			console.log("Document detail", x);
			expect({value: x[0]["docname"]}).toBe("File Renamed");
		}).except(function(x) {
			fail("Verifying rename", x);
		});
	});

	it("Should delete the files created", function() {
		var result = SWBrijj.procm("document.delete_document", docId);
		sleep(secondsToSleep);
		result.then(function(x) {
			console.log("Delete", x);
		}).except(function(x) {
			fail("Deleting shared/revoked file", x);
		});
	});

	//TODO: Check activity feed, currently broken. Check document information
	//TODO: Share with someone, revoke, and then re-share
	//TODO: Renaming test
});