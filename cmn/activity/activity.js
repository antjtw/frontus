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
            type: '@'
        },
        templateUrl: '/cmn/activity/activity.html',
        controller: ['$scope', function($scope) {
        }]
    }
});

/* Filter to select the activity icon for document status */
active.filter('icon', function() {
    return function(activity) {
        if (activity == "sent") return "doc-share";
        else if (activity == "received") return "doc-share";
        else if (activity == "viewed") return "doc-view";
        else if (activity == "reminder") return "icon-redo";
        else if (activity == "edited") return "doc-edit";
        else if (activity == "signed") return "doc-sign";
        else if (activity == "uploaded") return "doc-upload";
        else if (activity == "transcoded") return "doc-upload";
        else if (activity == "rejected") return "doc-rejected";
        // Need to get this from Alison
        else if (activity == "countersigned") return "doc-countersign";
        else if (activity == "finalized") return "doc-final";
        else return "hunh?";
    }
});

/* Filter to format the activity description on document status */
active.filter('description', function() {
    return function(ac, which) {
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
                var url = '/documents/company-view?doc=' + ac.docid;
                if (activity == "sent") return "";
                else if (activity == "viewed") {
                    return "<a href=" + url + ">" + caplength(document, 35) + "</a>" + " viewed by "+person;
                }
                else if (activity == "reminder") return "Reminded "+person + " about " + "<a href=" + url + ">" + caplength(document, 35) + "</a>";
                else if (activity == "edited") return "<a href=" + url + ">" + caplength(document, 35) + "</a>" + " edited by "+person;
                else if (activity == "signed") return "<a href=" + url + ">" + caplength(document, 35) + "</a>" + " signed by "+person;
                else if (activity == "uploaded") return "<a href=" + url + ">" + caplength(document, 35) + "</a>" + " uploaded by "+person;
                else if (activity == "transcoded") return "<a href=" + url + ">" + caplength(document, 35) + "</a>" + " uploaded by "+person;
                else if (activity == "received") return "<a href=" + url + ">" + caplength(document, 35) + "</a>" + " sent to "+person;
                else if (activity == "rejected") return "Signature on " +"<a href=" + url + ">" + caplength(document, 35) + "</a>" + " rejected by "+person;
                else if (activity == "countersigned") return "<a href=" + url + ">" + caplength(document, 35) + "</a>" + " countersigned by "+person;
                else if (activity == "finalized") return "<a href=" + url + ">" + caplength(document, 35) + "</a>" + " approved by " + person;
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
                if (activity == "received") return "You received " + caplength(document, 35) + " from " + company;
                else if (activity == "viewed") return "You viewed " + caplength(document, 35);
                else if (activity == "reminder") return "You were reminded about" +caplength(document, 35);
                else if (activity == "signed") return "You signed "+caplength(document, 35);
                else if (activity == "rejected") return person + " rejected your signature on " +caplength(document, 35);
                else if (activity == "countersigned") return person + " countersigned "+caplength(document, 35);
                else if (activity == "finalized") return "You approved " + caplength(document, 35);
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
            else if (activity == "viewed") return person + " viewed Document";
            else if (activity == "reminder") return "reminded Document";
            else if (activity == "edited") return person + " edited Document";
            else if (activity == "signed") return person + " signed Document";
            else if (activity == "uploaded") return person + " uploaded Document";
            else if (activity == "transcoded") return person + " uploaded Document";
            else if (activity == "received") return person + " received Document";
            else if (activity == "rejected") return person + " rejected Document";
            else if (activity == "countersigned") return person + " countersigned Document";
            else if (activity == "finalized") return person + " approved Document";
            else return activity + "ed Document";
        }
    }
});