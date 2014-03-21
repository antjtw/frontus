var m = angular.module('commonDirectives', []);

m.directive('composeMessage', function() {
    return {
        scope: false,
        replace: true,
        restrict: 'E',
        templateUrl: '/cmn/partials/composeMessage.html',
        controller: ['$scope', function($scope) {
            console.log($scope);
            $scope.composeopts = {
                backdropFade: true,
                dialogFade: true,
                dialogClass: 'compose-modal wideModal modal'
            };
            $scope.select2Options = {
                'multiple': true,
                'simple_tags': true,
                'tags': $scope.vInvestors,
                'tokenSeparators': [",", " "],
                'placeholder': 'Enter email address & press enter'
            };
            $scope.composeModalOpen = function() {
                $scope.composeModal = true;
            };
            $scope.composeModalClose = function() {
                $scope.composeModal = false;
            };
        }]
    };
});
