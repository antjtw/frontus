//Setup environment:
// - Must be able to log in
// - Must be able to upload and view documents
// - Must have at least 1 document already uploaded

var username = "dexter+1@sharewave.com";
var password = "never-";
var secondsToSleep = 4; //At least 3 recommended
var secondAccount = "eric+1@sharewave.com";

describe("Login tests", function() {

	afterEach(function() {
		sleep(2);
	});

	it("Should not log in", function() {
		var result = SWBrijj.login("invalid@login.com", "foobar");
		result.then(function(x) {
			console.log("Should not log in result", x);
			expect({value: x.length}).toBe(0);
		});
	});
	
	it("Should log in", function() {
		var result = SWBrijj.login(username, password);
		result.then(function(x) {
			console.log("Should log in result", x);
			expect({value: x.length}).toBeGreaterThan(0);
		});
	});
});

describe("Document view/upload/delete tests", function() {
	var numberOfDocuments = 0;

	beforeEach(function() {
		sleep(1);
	});

	it("Should display company documents", function() {
		var result = SWBrijj.procm("document.get_companydocs");
		result.then(function(x) {
			numberOfDocuments = x.length;
			console.log("Number of Documents", numberOfDocuments);
			expect({value: numberOfDocuments}).toBeGreaterThan(0);
		});
	});

	it("Should upload exactly 1 company document", function() {
		var fd = new FormData();
		fd.append("uploadedFile", new Blob(["Hello world!"], { type: "text/plain" }));
		var result = SWBrijj.uploadFile(fd);
		sleep(secondsToSleep);
		result.then(function(x) {
			console.log("Upload file result", x);
			expect({value: x}).toBe(1);
		}).except(function(x) {
			 fail("Error in SWBrijj upload");
		});
	});

	it("Should upload exactly 3 company documents", function() {
		var fd = new FormData();
		fd.append("uploadedFile", new Blob(["Hello world!"], { type: "text/plain" }));
		fd.append("uploadedFile", new Blob(["foo"], { type: "text/plain" }));
		fd.append("uploadedFile", new Blob(["bar"], { type: "text/plain" }));
		var result = SWBrijj.uploadFile(fd);
		sleep(secondsToSleep * 3);
		result.then(function(x) {
			console.log("Upload file result", x);
			expect({value: x}).toBe(3);
		}).except(function(x) {
			 fail("Error in SWBrijj upload");
		});
	});	

	it("Should display the correct number of documents after 4 new uploads", function() {
		var result = SWBrijj.procm("document.get_companydocs");
		result.then(function(x) {
			console.log("Number of Documents after 4 uploads", x.length);
			expect({value: x.length}).toBe(numberOfDocuments + 4);
		});
	});

	//May need updating after delete fix
	it("Should delete the files created", function() {
		var result = SWBrijj.procm("document.delete_document", "blob");
		sleep(secondsToSleep);
		result.then(function(x) {
			console.log("Delete", x);
		}).except(function(x) {
			fail("Error deleting files");
		});
	});

	it("Should display the correct number of documents after the file deletes", function() {
		var result = SWBrijj.procm("document.get_companydocs");
		result.then(function(x) {
			console.log("Number of Documents after deletions", x.length);
			expect({value: x.length}).toBe(numberOfDocuments);
		});
	});

});

describe("Document sharing tests", function() {
	var docId = 0;

	afterEach(function() {
		sleep(1);
	});

	it("Should upload a document to use for testing", function() {
		var fd = new FormData();
		fd.append("uploadedFile", new Blob(["Hello world!"], { type: "text/plain" }));
		var result = SWBrijj.uploadFile(fd);
		sleep(secondsToSleep);
		result.then(function(x) {
			console.log("Upload file result", x);
			expect({value: x}).toBe(1);
		}).except(function(x) {
			 fail("Error in creating document");
		});
		sleep(secondsToSleep);
	});

	it("Should get docId", function() {
		var result = SWBrijj.procm("document.get_companydocs");
		result.then(function(x) {
			console.log("Documents", x);
			docId = getDocId("blob", x);
			console.log("docId", docId);
		}).except(function(x) {
			fail("Error getting docId");
		});
	});

	it("Should verify the docId corresponds to the correct document", function() {
		var result = SWBrijj.procm("document.get_docmeta", docId);
		result.then(function(x) {
			console.log("Document metadata", x);
			expect({value: x[0]["docname"]}).toBe("blob");
		});
	});

	it("Should share a document with another person", function() {
		var result = SWBrijj.procm("document.share_document", docId, secondAccount, "Sharing");
		result.then(function(x) {
			console.log("Share", x);
		}).except(function() {
			fail("Sharing failed");
		});
	});

	it("Should verify that the document has been shared correctly", function(){
		var result = SWBrijj.procm("document.document_status", docId);
		result.then(function(x) {
			console.log("Shared status", x[0]["event"]);
			console.log("Shared with", x[0]["sent_to"]);
			expect({value: x[0]["event"]}).toBe("shared");
			expect({value: x[0]["sent_to"]}).toBe(secondAccount);
		});
	});

	it("Should send a reminder", function() {
		var result = SWBrijj.procm("document.remind_document", docId, secondAccount, "Reminder");
		result.then(function(x) {
			console.log("Remind", x);
		}).except(function() {
			fail("Remind failed");
		});
	});
	
	it("Should verify that the reminder has been sent correctly", function(){
		var result = SWBrijj.procm("document.document_status", docId);
		result.then(function(x) {
			console.log("Shared status", x[0]["event"]);
			console.log("Shared with", x[0]["sent_to"]);
			expect({value: x[0]["event"]}).toBe("reminder");
			expect({value: x[0]["sent_to"]}).toBe(secondAccount);
		});
	});

 	it("Should revoke access a document", function() {
		var result = SWBrijj.procm("document.document_revoke", docId, secondAccount);
		result.then(function(x) {
			console.log("Revoke", x);
		}).except(function() {
			fail("Revoke failed"); //Should fail right now, broken
		});
	});

	//TODO: Share with someone, revoke, and then re-share

});


//Connect to the server and see if files exist
function checkFiles(documentToCheck, x, count) {
	var counter = 0;
	for (var i = 0; i < x.length; i++) { //iterate through documents
		var doc = x[i]["docname"];
		if (doc == documentToCheck) {
			counter = counter + 1;
		}
	}
	return Boolean(count == counter);
};

//Gets the docId from the doc name
function getDocId(docname, x) {
	console.log("getDocId", "Getting id for " + docname);
	for (var i = 0; i < x.length; i++) {
		var doc = x[i]["docname"];
		if (doc == docname) {
			return x[i]["doc_id"];
		}
	}
};

//function to manually fail
function fail(msg) {
	console.error("Fail", msg);
	expect({value: false}).toBe(true);
};