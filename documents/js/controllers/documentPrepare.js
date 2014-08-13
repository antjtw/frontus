'use strict';

app.controller('DocumentPrepareController',
    ['$scope', '$routeParams', 'Documents', 'SWBrijj', 'Investor', 'ShareDocs', 'Annotations', 'navState', '$window', '$location',
    function($scope, $routeParams, Documents, SWBrijj, Investor, ShareDocs, Annotations, navState, $window, $location) {
        $scope.doc = Documents.getDoc(parseInt($routeParams.doc, 10));
        $scope.doc.getPreparedFor(ShareDocs.emails); // fetch preparation information (if needed)

        $scope.newInvestor = "";

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

        $scope.investors = Investor.investors;
        function filterInvestors(investorList, docPreparedFor) {
            return investorList.filter(function(val, idx, arr) {
                return (Object.keys(docPreparedFor).indexOf(val.id) === -1)
            });
        }
        $scope.select2Options = {
            allowClear: true,
            data: function() {
                return {
                    'results': filterInvestors(Investor.investors, $scope.doc.preparedFor)
                };
            },
            placeholder: 'Add recipient',
            createSearchChoice: function(text) {
                // if text was a legit user, would already be in the list, so don't check Investor service
                return {id: text, text: text};
            }
        };

        $scope.addInvestor = function() {
            if ($scope.newInvestor) {
                $scope.doc.addPreparedFor($scope.newInvestor);
                $scope.newInvestor = "";
            }
        };

        $scope.updateInvestor = function(investor_data) {
            if (typeof(investor_data.display) == "string") {
                // bad input, ignore and wait for good input
                return;
            }
            if (investor_data.display === null) {
                // user deleted the row
                $scope.doc.deletePreparedFor(investor_data.investor);
            } else if (investor_data.investor != investor_data.display.id) {
                // there's been a bona fide change in user
                $scope.doc.updatePreparedFor(investor_data.investor, investor_data.display.id);
            }
        };

        $scope.bulkPrepable = function(annotation) {
            if (!annotation.forRole(navState.role) || annotation.whattype == "ImgSignature") {
                return false;
            } else {
                return true;
            }
        };

        $scope.requiredField = function(annot) {
            return annot.required && !annot.filled(true, navState.role);
        }

        $scope.overrideFilled = function(annot, override) {
            return annot.wouldBeValid(navState.role, override) ||
                   (((override === undefined) || (override == "")) &&
                    annot.filled(true, navState.role));
        }

        $scope.annots = Annotations.getDocAnnotations($scope.doc);

        $scope.encodeURIComponent = encodeURIComponent;

        /* Save the overrides when navigating away */
        function saveOverrides() {
            if ($routeParams.bulk) { // don't save if we aren't in bulkPrep mode
                for (var investor in $scope.doc.preparedFor) {
                    $scope.doc.savePreparation(investor);
                }
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
