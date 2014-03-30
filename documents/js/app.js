//'use strict';

var docviews = angular.module('documentviews',
        ['documents', 'upload', 'nav', 'ui.bootstrap', '$strap.directives',
         'brijj', 'ui.bootstrap.progressbar', 'ui.select2', 'email',
         'commonServices', 'activityDirective', 'docServices'],
function($routeProvider, $locationProvider) {
    $locationProvider.html5Mode(true).hashPrefix('');
    $routeProvider.
    when('/company-list', {
        templateUrl: 'partials/companyList.html',
        controller: 'CompanyDocumentListController',
        reloadOnSearch: false
    }).
    when('/company-view', {
        templateUrl: 'partials/companyViewer.html',
        controller: 'CompanyDocumentViewController',
        reloadOnSearch: false
    }).
    when('/company-status', {
        templateUrl: 'partials/companyStatus.html',
        controller: 'CompanyDocumentStatusController'
    }).
    when('/investor-list', {
        templateUrl: 'partials/investorList.html',
        controller: 'InvestorDocumentListController'
    }).
    when('/investor-view', {
        templateUrl: 'partials/investorViewer.html',
        controller: 'InvestorDocumentViewController',
        reloadOnSearch: false
    }).
    otherwise({
        redirectTo: '/investor-list'
    });
});

docviews.run(function($rootScope, $document) {
    $document.on('click', function(event) {
        void(event);
        delete $rootScope.errorMessage;
    });

    $rootScope.$on('$routeChangeError', function(x, y) {
        console.log(x);
        console.log(y);
    });
});
