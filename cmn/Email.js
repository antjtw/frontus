var email = angular.module('email', ['ui.bootstrap','ui.utils', 'brijj'], function() {} );


email.directive('backImg', function(){
  return {
    restrict: 'A',
    link: function(scope, element, attrs){
      attrs.$observe('backImg', function(url) {
        element.css({
          'background-image': 'url(' + url +')',
          'background-size' : 'cover'
        });
      });
    }
  }
});

email.directive('ngOnBlur', function($parse){
  return function(scope, elm, attrs){
    var onBlurFunction = $parse(attrs['ngOnBlur']);
    elm.bind("blur", function(event) {
      scope.$apply(function() {
        onBlurFunction(scope, { $event: event });
      })});
  };
});

/* this seems to be required in order to move the edited content into the right scope */
email.directive('replace', function() {
   return {
    restrict: 'A',
    link: function(scope, elm, attrs, ctrl) {
      void(ctrl);
      scope.replacex = function () {
        scope.recipients[parseInt(attrs.index)] = elm.text();
      };
      elm.on('blur', function(event) {
        void(event);
        scope.replacex();
        scope.$apply();
      });
      elm.on('keypress', function(event) {
        if (event.keyCode == 13) {
          scope.replacex();
          scope.$apply();
        }
      })
    }
  }
});

email.directive("emailTo", function() {
  return {
    restrict: 'E',
    link: function(scope, elm, attrs, ctrl) {
      void(attrs);
      void(elm);
      void(ctrl);
      // console.log(scope);
    },
    scope: false,
    template: '<div class="multiEmail"><span>To: </span><span ng-repeat="recip in recipients">'+
        '<span data-index="{{$index}}" data-replace data-ui-keypress="{enter: \'replacex()\'}" contenteditable data-readonly>{{ recip }}</span>'+
        '<span ng-click="remove({{$index}})" class="email-close" data-icon="&#xe00f" aria-hidden="true"></span>'+
        ', </span>'+
        '<input ng-model="nextRecip" data-ng-on-blur="addRecip(nextRecip)" data-ui-keypress="{enter: \'addRecip(nextRecip)\'}" type="text" data-typeahead="investor for investor in vInvestors | filter:$viewValue" data-typeahead-min-length="0"/></span></div>',
    controller: ["$scope","$element", function($scope) {
    $scope.remove = function (x) {
      // slice doesn't seem to work here
      // $scope.recipients.slice(x,1);
      for (var i = x; i < $scope.recipients.length; i++) {
        $scope.recipients[i] = $scope.recipients[i + 1];
      }
      $scope.recipients.length = $scope.recipients.length - 1;
    };
    $scope.addRecip = function(nr) {
      if (nr) {
        for(var i=0;i<$scope.recipients.length;i++) {
          if ($scope.recipients[i] == nr) {
            // the email address in question was a duplicate
            $scope.nextRecip = "";
            return;
          }
        }
        $scope.recipients.push($scope.nextRecip);
        $scope.nextRecip = "";
      }
    };

} ]}});