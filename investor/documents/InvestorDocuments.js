'use strict';

/* App Module */
var docviews = angular.module('documentviews', ['documents','ui.bootstrap','brijj']);

docviews.config(function($routeProvider, $locationProvider) {
  $locationProvider.html5Mode(true).hashPrefix('');
    
  $routeProvider.
      when('/', {templateUrl: 'list.html',   controller: InvestorDocumentListController}).
      when('/:id', {templateUrl: 'viewer.html', controller: InvestorDocumentViewController}).
      otherwise({redirectTo: '/:company'});
});

/*docviews.directive('draggable', function() {
  return {
    restrict: 'A',
    link: function(scope, elm, attrs) {
      var options = scope.$eval(attrs.draggable); //allow options to be passed in
      $(elm).draggable(options);
    }
  };
});
*/

docviews.filter('fromNow', function() {
  return function(date) {
    var d = moment(date);
    if (d) return d.fromNow();
  }
});


/* Controllers */

function InvestorDocumentListController($scope, SWBrijj, $routeParams, $rootScope) {

  var company = $rootScope.selected.company;
  if ($rootScope.selected.isAdmin) document.location.href="/company/documents";
  $scope.currentCompany = company;

	SWBrijj.tblmm("document.my_investor_library", "company", company).then(function(data) {
    $scope.documents = data;
	});
	
	$scope.docOrder = 'docname';
	
	$scope.setOrder = function(field) {
	  $scope.docOrder = $scope.docOrder == field ? '-' + field : field;
	};

	$scope.searchFilter = function (obj) {
     var re = new RegExp($scope.query, 'i');
     return !$scope.query || re.test(obj.docname);
  };

  $scope.time = function(doc) {
    return doc.when_signed || doc.signature_deadline;
  }
							 		
}

function InvestorDocumentViewController($scope, $routeParams, $compile, SWBrijj) {
  $scope.docId = parseInt($routeParams.id);
  $scope.library = "document.my_investor_library";
  $scope.pages = "document.my_investor_codex";

  $scope.init = function () {
    $scope.invq = true;
    SWBrijj.procm("document.get_investor_document", parseInt($scope.docId)).then(function(data) {
      $scope.document=data;
      if ($scope.document[0].signature_deadline != null && $scope.document[0].when_signed == null) {
        $scope.needsign = true;
      }
      else {
        $scope.needsign = false;
      }
    });

  };
}
