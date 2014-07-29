'use strict';

function DocumentPrepareController($scope, $routeParams, Documents, SWBrijj) {
    $scope.doc = Documents.getDoc(parseInt($routeParams.doc, 10));
    $scope.doc.getPreparedFor(); // fetch preparation information (if needed)

    // TODO: move to investor service
    var investors = [];
    SWBrijj.tblm('global.investor_list', ['email', 'name']).then(function(data) {
        for (var i = 0; i < data.length; i++) {
            var inv = {id: data[i].email};
            if (data[i].name) {
                inv.text = data[i].name + "  (" + data[i].email +")";
            } else {
                inv.text = data[i].email;
            }
            investors.push(inv);
        }
    });

    $scope.newInvestor = "";
    $scope.select2Options = {
        allowClear: true,
        data: investors, // TODO: only show investors not already in doc.preparedFor
        placeholder: 'Add Investor',
        createSearchChoice: function(text) {
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
}
DocumentPrepareController.$inject = ['$scope', '$routeParams', 'Documents', 'SWBrijj'];
