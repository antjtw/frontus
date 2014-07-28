'use strict';

function DocumentPrepareController($scope, $routeParams, Documents, SWBrijj) {
    $scope.doc = Documents.getDoc(parseInt($routeParams.doc, 10));

    // TODO: not this
    $scope.doc.preparedFor = [];

    // TODO: move to investor service
    var investors = [];
    SWBrijj.tblm('global.investor_list', ['email', 'name']).then(function(data) {
        for (var i = 0; i < data.length; i++) {
            var inv = {id: data[i].email};
            if (data[i].name) {
                inv.text = data[i].name + "  (" + data[i].email +")";
            } else {
                inv.text = "(" +data[i].email+")";
            }
            investors.push(inv);
        }
    });

    $scope.newInvestor = "";
    $scope.select2Options = {
        allowClear: true,
        data: investors,
        placeholder: 'Add Investor',
        createSearchChoice: function(text) {
            return {id: text, text: text};
        }
    };

    $scope.addInvestor = function() {
        if ($scope.newInvestor) {
            $scope.doc.preparedFor.push({text: $scope.newInvestor, investor: $scope.newInvestor});
            $scope.newInvestor = "";
        }
    };
}
DocumentPrepareController.$inject = ['$scope', '$routeParams', 'Documents', 'SWBrijj'];
