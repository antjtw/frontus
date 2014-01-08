var active = angular.module('activityDirective', []);

app.directive('activityFeed', function() {
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
app.filter('icon', function() {
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
        else if (activity == "countersigned") return "icon-countersign";
        else if (activity == "finalized") return "doc-final";
        else return "hunh?";
    }
});

/* Filter to format the activity description on document status */
app.filter('description', function() {
    return function(ac) {
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
                return "<a href=" + url + ">" + document + "</a>" + " viewed by "+person;
            }
            else if (activity == "reminder") return "Reminded "+person + " about " + "<a href=" + url + ">" + document + "</a>";
            else if (activity == "edited") return "<a href=" + url + ">" + document + "</a>" + " edited by "+person;
            else if (activity == "signed") return "<a href=" + url + ">" + document + "</a>" + " signed by "+person;
            else if (activity == "uploaded") return "<a href=" + url + ">" + document + "</a>" + " uploaded by "+person;
            else if (activity == "transcoded") return "<a href=" + url + ">" + document + "</a>" + " uploaded by "+person;
            else if (activity == "received") return "<a href=" + url + ">" + document + "</a>" + " sent to "+person;
            else if (activity == "rejected") return "Signature on " +"<a href=" + url + ">" + document + "</a>" + " rejected by "+person;
            else if (activity == "countersigned") return "<a href=" + url + ">" + document + "</a>" + " countersigned by "+person;
            else if (activity == "finalized") return "<a href=" + url + ">" + document + "</a>" + " approved by " + person;
            else return activity + " by "+person;
        }
    }
});

/* Filter to format the activity description on document status */
angular.module('HomeApp').filter('investordescription', function() {
    return function(ac) {
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
            if (activity == "received") return "You received " + document + " from " + company;
            else if (activity == "viewed") return "You viewed " + document;
            else if (activity == "reminder") return "You were reminded about" +document;
            else if (activity == "signed") return "You signed "+document;
            else if (activity == "rejected") return person + " rejected your signature on " +document;
            else if (activity == "countersigned") return person + " countersigned "+document;
            else if (activity == "finalized") return "You approved " + document;
            else  {
                return activity + " by "+person;
            }
        }
        else {
            return "";
        }
    }
});