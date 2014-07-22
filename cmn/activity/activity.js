'use strict';
var active = angular.module('activityDirective', ['ngSanitize']);

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
            type: '@',
            user: '=',
            view: '=',
            filter: '=',
            filterVal: '=',
            height: '='
        },
        templateUrl: '/cmn/activity/activity.html',
        controller: ['$scope', 'SWBrijj', function($scope, SWBrijj) {

            $scope.iteration = 0;
            $scope.loading = false;
            $scope.activity = [];
            var quantity = 10; // number of items to load
            function processFeed(feed) {
                $scope.activitystarted = true;
                //Generate the groups for the activity feed
                angular.forEach(feed, function(event) {
                    event.when = moment(event.time).from(event.timenow);
                    $scope.activity.push(event);
                });
                if (feed.length >= quantity) {
                    // only fetch the next page if the last one was complete
                    $scope.iteration = $scope.iteration + 1;
                    $scope.loading = false;
                }
            }
            $scope.load = function() {
                $scope.loading = true;
                if ($scope.filter == null) {
                    SWBrijj.tblmlimit($scope.view, quantity, $scope.iteration * quantity).then(processFeed);
                } else {
                    SWBrijj.tblmmlimit($scope.view, $scope.filter, $scope.filterVal, quantity, $scope.iteration * quantity).then(processFeed);
                }
            };

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
            else if (activity == "reminder") return "reminder";
            else if (activity == "edited") return "doc-edit";
            else if (activity == "signed") return "doc-sign";
            else if (activity == "uploaded") return "doc-upload";
            else if (activity == "transcoded") return "doc-upload";
            else if (activity == "rejected") return "doc-rejected";
            else if (activity == "countersigned") return "doc-countersign";
            else if (activity == "finalized") return "doc-final";
            else if (activity == "retracted") return "doc-retract";
            else if (activity == "deleted") return "doc-delete";
            else if (activity == "void requested") return "doc-void-request";
            else if (activity == "void rejected") return "doc-void-reject";
            else if (activity == "void accepted") return "doc-void-accept";
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
                if (activity == "received") return "Cap table sent to " + person;
                else if (activity == "viewed") return "Cap table viewed by "+person;
                else return "Something with Capitalization Table";
            }
            else {
                var document = ac.docname;
                var url = '/app/documents/company-view?doc=' + ac.docid + "&page=1";
                var urlperson = '';
                if (ac.email != user) {
                    urlperson = '&investor=' + ac.email;
                }
                // Only link to undeleted documents
                var doclink = "";
                var doclinkperson = "";
                if (!ac.deleted) {
                    doclink = "<a href=" + url + ">" + caplength(document, 30) + "</a>";
                    doclinkperson = "<a href=" + url + urlperson + ">" + caplength(document, 30) + "</a>";
                } else {
                    doclink = caplength(document, 30);
                    doclinkperson = caplength(document, 30);
                }
                if (activity == "sent") return "";
                else if (activity == "viewed") {
                    return doclinkperson + " viewed by "+person;
                }
                else if (activity == "reminder") return "Reminded "+person + " about " + doclink;
                else if (activity == "edited") return doclink + " edited by "+person;
                else if (activity == "signed") return doclinkperson + " signed by "+person;
                else if (activity == "uploaded") return doclink + " uploaded by "+person;
                else if (activity == "transcoded") return doclink + " uploaded by "+person;
                else if (activity == "received") return doclinkperson + " sent to "+person;
                else if (activity == "rejected") return "Signature on " + doclinkperson + " rejected by "+person;
                else if (activity == "countersigned") return doclink + " countersigned by "+person;
                else if (activity == "finalized") return doclinkperson + " approved by " + person;
                else if (activity == "retracted") return "Retracted " + caplength(document, 35) + " from " + person;
                else if (activity == "deleted") return person + " deleted " + doclink;
                else if (activity == "void requested") return " Void requested on " + person + "'s " + doclinkperson;
                else if (activity == "void rejected") return " Void rejected by " + person + " on " + doclinkperson;
                else if (activity == "void accepted") return " Void accepted by " + person + " on " + doclinkperson;
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
                var url = '/app/documents/investor-view?doc=' + ac.docid + "&page=1";
                if (activity == "received") return "You received <a href=" + url + ">" + caplength(document, 30) + "</a>" + " from " + company;
                else if (activity == "viewed") return "You viewed <a href=" + url + ">" + + caplength(document, 30) + "</a>";
                else if (activity == "reminder") return "You were reminded about <a href=" + url + ">" + caplength(document, 30) + "</a>";
                else if (activity == "signed") return "You signed <a href=" + url + ">" +caplength(document, 30) + "</a>";
                else if (activity == "rejected") return person + " rejected your signature on <a href=" + url + ">" + caplength(document, 30) + "</a>";
                else if (activity == "countersigned") return person + " countersigned <a href=" + url + ">" +caplength(document, 30) + "</a>";
                else if (activity == "void requested") return person + " requested voiding <a href=" + url + ">" +caplength(document, 30) + "</a>";
                else if (activity == "void rejected") return "You rejected the voiding of <a href=" + url + ">" +caplength(document, 30) + "</a>";
                else if (activity == "void accepted") return "You accepted the voiding of <a href=" + url + ">" +caplength(document, 30) + "</a>";
                else if (activity == "finalized") return person + " approved <a href=" + url + ">" +caplength(document, 30) + "</a>";
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
            if ((person === "")||(person == null)) {
                person = ac.person;
            }
            if (activity == "sent") return "";
            else if (activity == "viewed") return "Viewed by " + person;
            else if (activity == "reminder") return "Reminded " + person;
            else if (activity == "edited") return "Edited by " +person;
            else if (activity == "signed") return "Signed by " +person;
            else if (activity == "uploaded") return "Uploaded by " + person;
            else if (activity == "transcoded") return "Uploaded by " + person;
            else if (activity == "received") return "Received by " +person;
            else if (activity == "deleted") return "Deleted by " +person;
            else if (activity == "rejected") return "Signature rejected by " +person;
            else if (activity == "countersigned") return "Countersigned by " + person;
            else if (activity == "finalized") return "Approved by " + person;
            else if (activity == "retracted") return "Retracted by " + person;
            else if (activity == "void requested") return "Void request sent to " +person;
            else if (activity == "void accepted") return "Void accepted by " + person;
            else if (activity == "void rejected") return "Void rejected by " + person;
            else return activity + " Document";
        }
    }
});
