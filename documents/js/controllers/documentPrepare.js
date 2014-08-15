'use strict';

app.controller('DocumentPrepareController',
    ['$scope', '$routeParams', 'Documents', 'SWBrijj', 'Investor', 'ShareDocs', 'navState', '$window', '$location', '$rootScope',
    function($scope, $routeParams, Documents, SWBrijj, Investor, ShareDocs, navState, $window, $location, $rootScope) {
        $scope.doc_arr = [];
        ShareDocs.documents.forEach(function(sharedoc) {
            var doc = Documents.getOriginal(sharedoc.doc_id);
            doc.getPreparedFor(ShareDocs.emails); // fetch preparation information (if needed)
            $scope.doc_arr.push(doc);
        });

        // give view access to services
        $scope.ShareDocs = ShareDocs;
        $scope.Investor = Investor;

        $scope.state = {};
        if ($routeParams.bulk) {
            $scope.state.bulkPrep = true;
        } else {
            $scope.state.bulkPrep = false;
        }
        $scope.$watch('state.bulkPrep', function(bulkPrep, old_bulkPrep) {
            if (bulkPrep != old_bulkPrep) { // only on change, not initial
                if (bulkPrep) {
                    $location.search('bulk', true).replace();
                } else {
                    saveOverrides();
                    $location.search('bulk', null).replace();
                }
            }
        });

        $scope.bulkPrepable = function(annotation) {
            if (!annotation.forRole(navState.role) || annotation.whattype == "ImgSignature" || annotation.type == "highlight") {
                return false;
            } else {
                return true;
            }
        };

        $scope.requiredField = function(annot) {
            return annot.required && !annot.filled(navState.role);
        };

        $scope.overrideFilled = function(annot, override) {
            return annot.wouldBeValid(navState.role, override) ||
                   (((override === undefined) || (override == "")) &&
                    annot.filled(navState.role));
        };

        $scope.encodeURIComponent = encodeURIComponent;

        /* Save the overrides when navigating away */
        function saveOverrides() {
            if ($routeParams.bulk) { // don't save if we aren't in bulkPrep mode
                // TODO: this could get really slow, optimize the calls
                $scope.doc_arr.forEach(function(doc) {
                    ShareDocs.emails.forEach(function(investor) {
                        doc.savePreparation(investor);
                    });
                });
            }
        }
        $window.addEventListener('beforeunload', function(event) {
            saveOverrides();
        });
        $scope.$on('$locationChangeStart', function(event, newUrl, oldUrl) {
            if (newUrl.match(/login([?]|$)/)) {
                // don't save note data if I'm being redirected to log in
                return;
            }
            if (newUrl.substring(0, newUrl.indexOf('?')) == oldUrl.substring(0, oldUrl.indexOf('?'))) {
                // don't save if it's just a change in search
                return;
            }
            saveOverrides();
        });
    }]
);
