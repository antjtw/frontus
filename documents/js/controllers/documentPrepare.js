'use strict';

app.controller('DocumentPrepareController',
    ['$scope', '$routeParams', 'Documents', 'SWBrijj', 'Investor',
    function($scope, $routeParams, Documents, SWBrijj, Investor) {
        $scope.doc = Documents.getDoc(parseInt($routeParams.doc, 10));
        $scope.doc.getPreparedFor(); // fetch preparation information (if needed)

        $scope.newInvestor = "";

        $scope.investors = Investor.investors;
        function filterInvestors(investorList, docPreparedFor) {
            return investorList.filter(function(val, idx, arr) {
                return ! docPreparedFor.some(function(pval, pidx, parr) {
                    return val.id == pval.investor;
                });
            });
        }
        $scope.select2Options = {
            allowClear: true,
            data: function() {
                return {
                    'results': filterInvestors(Investor.investors, $scope.doc.preparedFor)
                };
            },
            placeholder: 'Add Investor',
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
    }]
);
