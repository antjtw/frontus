
/* App Module */
var docviews = angular.module('documentviews', ['documents', 'ui.bootstrap', 'brijj']);

docviews.config(function ($routeProvider, $locationProvider) {
  $locationProvider.html5Mode(true).hashPrefix('');

  $routeProvider.
      when('/', {templateUrl: 'list.html', controller: InvestorDocumentListController}).
      when('/view', {templateUrl: 'viewer.html', controller: InvestorDocumentViewController}).
      otherwise({redirectTo: '/'});
});

docviews.filter('fromNow', function () {
  return function (date) {
    var d = moment(date);
    if (d) return d.fromNow();
    return "unknown";
  }
});

/* Controllers */
function InvestorDocumentListController($scope, SWBrijj, $routeParams, $rootScope) {
    SWBrijj.tblmm("document.my_investor_library", "company", company).then(function (data) {
    $scope.documents = data;
  });

  $scope.docOrder = 'docname';

  $scope.setOrder = function (field) {
    $scope.docOrder = $scope.docOrder == field ? '-' + field : field;
  };

  $scope.searchFilter = function (obj) {
    var re = new RegExp($scope.query, 'i');
    return !$scope.query || re.test(obj.docname);
  };

  $scope.time = function (doc) {
    return doc.when_signed || doc.signature_deadline;
  };
}

function InvestorDocumentViewController($scope, $routeParams, $compile, SWBrijj) {
  $scope.docId = parseInt($routeParams.doc);
  $scope.library = "document.my_investor_library";
  $scope.pages = "document.my_investor_codex";

  $scope.init = function () {
    $scope.invq = true;

    SWBrijj.tblm("document.my_investor_library", "doc_id", $scope.docId).then(function (data) {
      $scope.document = data;
    });

  };

  $scope.confirmModalClose = function() {
    $scope.confirmModal = false;
  };
  $scope.pageQueryString = function () {
    return  "id=" + $scope.docId + "&investor=true";
  };
}
