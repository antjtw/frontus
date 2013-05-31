var page = require('webpage').create();
page.open('http://localhost:9876/__karma/', function () {
	console.log("Done");
    page.render('pic.png');
    phantom.exit();
});