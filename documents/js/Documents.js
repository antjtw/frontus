'use strict';
//Adds line breaks to the text areas

var docs = angular.module('documents', ['ui.bootstrap', 'brijj'], function() {});

docs.directive('backImg', function() {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            attrs.$observe('backImg', function(url) {
                element.css({
                    'background-image': 'url(' + url + ')',
                    'background-size': 'cover'
                });
            });
        }
    };
});

docs.directive('docViewer', function() {
    return {
        restrict: 'EA',
        scope: true,
        templateUrl: '/documents/partials/docViewer.html',
        controller: 'DocumentViewController'
    };
});

docs.directive('templateViewer', function($compile) {
    return {
        restrict: 'EA',
        scope: {
            html: '='
        },
        templateUrl: '/documents/partials/template.html',
        controller: 'TemplateViewController',
        link: function (scope, iElement, iAttrs) {

            scope.$watch("html", function(newVals, oldVals) {
                return scope.add(newVals);
            }, true);

            scope.add = function(raw_html) {
                var html = angular.element($compile(raw_html)(scope));
                iElement.append(html);

            };

        }
    };
});

docs.controller('TemplateViewController', ['$scope', '$rootScope', '$compile', '$location', '$routeParams', '$window', 'SWBrijj',
    function($scope, $rootScope, $compile, $location, $routeParams, $window, SWBrijj) {
    }
]);

docs.filter('fromNow', function() {
    return function(date, servertime) {
        return moment(date).from(servertime);
    };
});

docs.directive('icon', function() {
    return {
        restrict: 'E',
        template: '<button><span data-icon="&#xe00d;" aria-hidden="true"></span></button>'
    };
});

docs.filter('uniqueandorder', function() {
    return function(pages) {
        var output = [];
        angular.forEach(pages, function(page) {
            if(output.indexOf(page) === -1) {
                output.push(page);
            }
        });
        output.sort(function(a,b){return a-b;});
        return output;
    };
});

/* Looking for a way to detect if I need to reload the page because the user has been logged out
 */
/* For images, the "login redirect" should return an image that says "Please login again"
 */
/*
 $('<img/>').attr('src', 'http://picture.de/image.png').load(function() {
 $(this).remove(); // prevent memory leaks as @benweet suggested
 $('body').css('background-image', 'url(http://picture.de/image.png)');
 });
    */
