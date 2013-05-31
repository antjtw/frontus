'use strict';

/* App Module */

var owner = angular.module('companyownership', ['ui.bootstrap', 'ui.event']);

owner.config(function($routeProvider, $locationProvider) {
  $locationProvider.html5Mode(true).hashPrefix('');
    
  $routeProvider.
      when('/', {templateUrl: 'captable.html',   controller: captableController}).
      otherwise({redirectTo: '/'});
});

var captableController = function($scope, $parse) {

    $scope.columnheader = ['Ownership', 'Shareholder', 'Common'];
    $scope.columns = []
    for(var i=0; i<$scope.columnheader.length; i++) {
    			if ($scope.columnheader[i] == "Shareholder") {
    				$scope.columns.push($scope.columnheader[i]+'1')
    			}
    			else {
				$scope.columns.push($scope.columnheader[i]+'1')
				$scope.columns.push($scope.columnheader[i]+'2')
				}
			};
    $scope.rows = [1, 2, 3, 4];
    $scope.cells = {};
    $scope.activeInvestor = {name:""}


    $scope.filteredHeaders = function(headers) {
    	var result = [];
        angular.forEach(headers, function(value) {
            if (value != "Ownership" && value != "Shareholder") {
            	result.push(value);
            }
        });
        return result;
    };

    $scope.filteredColumns = function(headers) {
    	var result = [];
    	i = 0
        angular.forEach(headers, function(value) {
            if (i >= 2) {
            	result.push(value);
            }
            i = i + 1
        });
        return result;
    };

    $scope.total = function(){
      var x = 0;
      for(var i=1; i<=$scope.rows.length; i++) {
      	if ($scope.cells["Ownership1" + i] != null) {
      			x = x + parseInt($scope.cells["Ownership1" + i]);
            if (i == $scope.rows.length) {
              $scope.rows.push((i+1))
              return x
            }
      	}
      }
      return x;
    };

    $scope.percentage = function(x){
      var y = 0;
      for(var i=1; i<=$scope.rows.length; i++) {
      	if ($scope.cells["Ownership1" + i] != null) {
      			y = y + parseInt($scope.cells["Ownership1" + i]);
      	}
      }
      var percent = (x / y) * 100;
      return percent;
    };

    $scope.getActive = function(row) {
        $scope.activeInvestor = row
    };

};