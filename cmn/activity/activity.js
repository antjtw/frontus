var active = angular.module('activityDirective', []);

function caplength(word, length) {
    if (word) {
        if (word.length > length) {
            return word.substring(0, (length-1)) + "...";
        }
        else {
            return word;
        }
    }
}

active.directive('activityFeed', function() {
    return {
        restrict: 'A',
        require: '^activity',
        scope: {
            activity: '=',
            type: '@',
            user: '='
        },
        templateUrl: '/cmn/activity/activity.html',
        controller: ['$scope', function($scope) {

        }]
    }
});

/* Filter to select the activity icon for document status */
active.filter('icon', function() {
    return function(event) {
        var activity = event.activity;
        if (event.type == "ownership") {
            if (activity == "sent") return "received";
            else if (activity == "received") return "received";
            else if (activity == "viewed") return "view";
        }
        else {
            if (activity == "sent") return "doc-share";
            else if (activity == "received") return "doc-share";
            else if (activity == "viewed") return "doc-view";
            else if (activity == "reminder") return "icon-redo";
            else if (activity == "edited") return "doc-edit";
            else if (activity == "signed") return "doc-sign";
            else if (activity == "uploaded") return "doc-upload";
            else if (activity == "transcoded") return "doc-upload";
            else if (activity == "rejected") return "doc-rejected";
            else if (activity == "countersigned") return "doc-countersign";
            else if (activity == "finalized") return "doc-final";
            else if (activity == "retracted") return "doc-retract";
            else return "hunh?";
        }
    };
});

/* Filter to format the activity description on document status */
active.filter('description', function() {
    return function(ac, args) {
        var which = args[0];
        var user = args[1];
        if (which == "iss") {
            var activity = ac.activity;
            var person;
            if (ac.name) {
                person = ac.name;
            }
            else {
                person = ac.email;
            }
            var type = ac.type;
            if (type == "ownership") {
                if (activity == "received") return "Capitalization Table sent to " + person;
                else if (activity == "viewed") return "Capitalization Table viewed by "+person;
                else return "Something with Capitalization Table";
            }
            else {
                var document = ac.docname;
                var url = '/documents/company-view?doc=' + ac.docid + "&page=1";
                var urlperson = '';
                if (ac.email != user) {
                    urlperson = '&investor=' + ac.email;
                }
                if (activity == "sent") return "";
                else if (activity == "viewed") {
                    return "<a href=" + url + urlperson + ">" + caplength(document, 35) + "</a>" + " viewed by "+person;
                }
                else if (activity == "reminder") return "Reminded "+person + " about " + "<a href=" + url + ">" + caplength(document, 35) + "</a>";
                else if (activity == "edited") return "<a href=" + url + ">" + caplength(document, 35) + "</a>" + " edited by "+person;
                else if (activity == "signed") return "<a href=" + url + urlperson + ">" + caplength(document, 35) + "</a>" + " signed by "+person;
                else if (activity == "uploaded") return "<a href=" + url + ">" + caplength(document, 35) + "</a>" + " uploaded by "+person;
                else if (activity == "transcoded") return "<a href=" + url + ">" + caplength(document, 35) + "</a>" + " uploaded by "+person;
                else if (activity == "received") return "<a href=" + url + urlperson + ">" + caplength(document, 35) + "</a>" + " sent to "+person;
                else if (activity == "rejected") return "Signature on " +"<a href=" + url + urlperson + ">" + caplength(document, 35) + "</a>" + " rejected by "+person;
                else if (activity == "countersigned") return "<a href=" + url + ">" + caplength(document, 35) + "</a>" + " countersigned by "+person;
                else if (activity == "finalized") return "<a href=" + url + urlperson + ">" + caplength(document, 35) + "</a>" + " approved by " + person;
                else if (activity == "retracted") return "Retracted " + caplength(document, 35) + " from " + person;
                else return activity + " by "+person;
            }
        }
        else if (which == "inv") {
            var activity = ac.activity;
            var company = ac.company_name;
            if (company == null) {
                company = ac.company;
            }
            var person;
            if (ac.name) {
                person = ac.name;
            }
            else {
                person = ac.email;
            }
            var type = ac.type;
            if (type == "ownership") {
                if (activity == "received") return "You received " + company + "'s cap table";
                else if (activity == "viewed") return "You viewed " + company + "'s cap table";
                else return "Something happened with "+company +"'s cap table";
            }
            else if (type == "document") {
                var document = ac.docname;
                var url = '/documents/investor-view?doc=' + ac.docid + "&page=1";
                if (activity == "received") return "You received <a href=" + url + ">" + caplength(document, 35) + "</a>" + " from " + company;
                else if (activity == "viewed") return "You viewed <a href=" + url + ">" + + caplength(document, 35) + "</a>";
                else if (activity == "reminder") return "You were reminded about <a href=" + url + ">" + caplength(document, 35) + "</a>";
                else if (activity == "signed") return "You signed <a href=" + url + ">" +caplength(document, 35) + "</a>";
                else if (activity == "rejected") return person + " rejected your signature on <a href=" + url + ">" + caplength(document, 35) + "</a>";
                else if (activity == "countersigned") return person + " countersigned <a href=" + url + ">" +caplength(document, 35) + "</a>";
                else if (activity == "finalized") return "You approved <a href=" + url + ">" + caplength(document, 35) + "</a>";
                else  {
                    return activity + " by "+person;
                }
            }
            else {
                return "";
            }
        }
        else if (which == "issdoc") {
            var activity = ac.activity;
            var person = ac.name;
            if (person === "") {
                person = ac.person;
            }
            if (activity == "sent") return "";
            else if (activity == "viewed") return "Viewed by " + person;
            else if (activity == "reminder") return "reminded Document";
            else if (activity == "edited") return "Edited by " +person;
            else if (activity == "signed") return "Signed by " +person;
            else if (activity == "uploaded") return "Uploaded by " + person;
            else if (activity == "transcoded") return "Uploaded by " + person;
            else if (activity == "received") return "Received by " +person;
            else if (activity == "rejected") return "Signature rejected by " +person;
            else if (activity == "countersigned") return "Countersigned by " + person;
            else if (activity == "finalized") return "Approved by " + person;
            else return activity + "ed Document";
        }
    }
});
