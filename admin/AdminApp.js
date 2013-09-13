var app = angular.module('AdminApp', ['ngResource', 'ui.bootstrap', 'nav', 'brijj'], function($routeProvider, $locationProvider){
//this is used to assign the correct template and controller for each URL path
  $locationProvider.html5Mode(true).hashPrefix('');
  // $locationProvider.html5Mode(false).hashPrefix('!');

  $routeProvider.
      when('/add_company', {controller:'AdminCtrl', templateUrl:'add_company.html'}).
      when('/google', {controller:'AdminCtrl', templateUrl:'google.html'}).
      when('/dropbox', {controller:'AdminCtrl', templateUrl: 'dropbox.html'}).
      when('/linkedin', {controller: 'AdminCtrl', templateUrl: 'linkedin.html'}).
      when('/twitter', {controller: 'AdminCtrl', templateUrl: 'twitter.html'}).
      when('/upload', {controller: 'AdminCtrl', templateUrl: 'upload.html'}).
      when('/sql', {controller: 'AdminCtrl', templateUrl: 'sql.html'}).
      when('/other', {controller:'AdminCtrl', templateUrl: 'other.html'}).
      when('/contacts', {controller: 'ContactsCtrl', templateUrl: 'contacts.html'}).
      when('/signups', {controller: 'SignupsCtrl', templateUrl: 'signups.html'}).
      otherwise({redirectTo:'/other'});
});

app.directive('ngModelOnblur', function() {
  return {
    restrict: 'A',
    require: 'ngModel',
    link: function(scope, elm, attr, ngModelCtrl) {
      if (attr.type === 'radio' || attr.type === 'checkbox') return;

      elm.unbind('input').unbind('keydown').unbind('change');
      elm.bind('blur', function() {
        scope.$apply(function() {
          ngModelCtrl.$setViewValue(elm.val());
        });
      });
      elm.bind("keydown keypress", function(event) {
        if (event.which === 13) {
          scope.$apply(function() {
            ngModelCtrl.$setViewValue(elm.val());
          });
        }
      });
    }
  };
});

app.controller('AdminCtrl',['$scope','$rootScope', 'SWBrijj',function($scope, $rootScope, SWBrijj) {

    /** @name SWBrijj#proc
     * @function
     * @param {string}
     * @param {...} */

  /** @name SWBrijj#procm
   * @type {function(string, *)} */

    /** @name Object#except
     * @type {function( function(!Object) )} */

  // var dropbox = $scope.$element.querySelector(".dropbox"); // $element seems to be an array of elements
    $scope.dropText = 'Drop files here...';
    $scope.files = [];

  $scope.$on('event:loginRequired', function() { document.location.href='/login'; });
  $scope.$on('event:brijjError', function(event, msg) {
    console.log(msg);
    $scope.errorMessage = msg; });

  $scope.createCompany = function() {
    if (!$scope.domain) {
      $scope.domain = '';
    }
    /** @name SWBrijj#procm
     * @function
     * @param {string}
     * @param {...}
     */
    SWBrijj.procm('account.create_company', $scope.email.toLowerCase(), $scope.name, $scope.domain, $scope.companyName).then( function(x) {
      void(x);
      $rootScope.notification.show("success", "Company created");
      $scope.email = $scope.name = $scope.domain = $scope.companyName = "";
    }).except(function(x) {
          $rootScope.notification.show("fail", "Error " + x.message);
        });
  };
    $scope.fmtFileSize = function (file) {
        if (file.size > 1024 * 1024 * 1024) return parseFloat(file.size / 1024 / 1024 / 1024).toFixed(2) + " GB";
        else if (file.size > 1024 * 1024) return parseFloat(file.size / 1024 / 1024).toFixed(2) + " MB";
        else if (file.size > 1024) return parseFloat(file.size / 1024).toFixed(2) + " kB";
        else return file.size + " bytes";
    };

    // init event handlers
    function dragEnterLeave(evt) {
        evt.stopPropagation();
        evt.preventDefault();
        $scope.dropText = "Drop files here...";
        $scope.dropClass = "";
        $scope.$apply();
    }

    function dragOver(evt) {
      /** @name evt
       * @type { Event } */

      /** @name Event#dataTransfer
       *  @type { DataTransfer } */

      /** @name DataTransfer */

      /** @name DataTransfer#types
       * @type { [string] } */

        evt.stopPropagation();
        evt.preventDefault();
      console.log(evt.dataTransfer.types);
        var ok = evt.dataTransfer && evt.dataTransfer.types && evt.dataTransfer.types.some( function(x) { return x == 'Files'; } );
        $scope.dropText = ok ? 'Drop files here...' : 'Only files are allowed!';
        $scope.dropClass = ok ? 'over' : 'not-available';
        $scope.$apply();
    }

    function drop(evt) {
        // console.log('drop evt:', JSON.parse(JSON.stringify(evt.dataTransfer)))
        evt.stopPropagation();
        evt.preventDefault();
        $scope.dropText = 'Drop more files here...';
        $scope.dropClass = '';
        $scope.$apply();
        var files = evt.dataTransfer.files;
        if (files.length > 0) {
            for (var i = 0; i < files.length; i++) {
                $scope.files.push(files[i])
            }
        }
        $scope.$apply();

      // might as well go ahead and upload ( no point in getting a click
      $scope.uploadFile();
    }

    $scope.setFiles = function (element) {
        $scope.files = [];
        for (var i = 0; i < element.files.length; i++) {
            $scope.files.push(element.files[i]);
        }
        $scope.progressVisible = false;
    };

    $scope.uploadDropbox = function () {
      /** @name Dropbox
       * @type { class } */
      /** @name Dropbox#choose
       * @function
       * @param { map } */

      /** @name SWBrijj#uploadLink
       * @function
       */
       Dropbox.choose({ linkType: 'direct', multiselect: true, success: function (files) {
        SWBrijj.uploadLink.apply(null, files).then(function (x) {
          console.log(x);
        });
      }, cancel: function () {
        console.log('canceled');
      }
      });
    };
    $scope.uploadFile = function () {
        var fd = new FormData();
        $scope.progressVisible = true;
        for (var i=0; i<$scope.files.length; i++) fd.append("uploadedFile", $scope.files[i]);
        SWBrijj.uploadFile(fd).then(function (x) {
            console.log(x);
        }).except(function (x) {
            alert(x.message);
        });
    };

  $scope.googleList = function () {
      SWBrijj.procm("oauth.get_google_list", $scope.mimeType).then(function (x) { $scope.gfiles = x; $scope.$apply(); });
  };


  $scope.contactSave = function () {
      SWBrijj.proc("contact_update", $scope.name, $scope.street, $scope.city, $scope.state, $scope.postalcode, $scope.country)
        .then(function (x) { alert("saved: "+x);
      });
  };
  //noinspection JSUnresolvedVariable
    // SWBrijj.tbl('account.profile').then(function(x) { initPage($scope, x) }).except(initFail);

  $scope.twitter= $scope.linkedin = $scope.google = $scope.dropbox = $scope.facebook = "";
  $scope.contactSave = function () {
    SWBrijj.proc("social_update", $scope.twitter, $scope.linkedin, $scope.google, $scope.dropbox, $scope.facebook).
        then(function (x) {
          alert("done: " + x);
        });
  };

  $scope.authTwitter = function () {
    SWBrijj.proc("oauth.twitter_authorize").then(function (x) {
      document.location.href = x[1][0];
    });
  };
  $scope.authLinkedin = function () {
    SWBrijj.proc("oauth.linkedin_authorize").then(function (x) {
      document.location.href = x[1][0];
    });
  };
  $scope.authDropbox = function () {
    SWBrijj.proc("oauth.dropbox_authorize").then(function (x) {
      document.location.href = x[1][0];
    });
  };
  $scope.authGoogle = function () {
    SWBrijj.proc("oauth.google_authorize").then(function (x) {
      document.location.href = x[1][0];
    });
  };
  $scope.authFacebook = function () {
    SWBrijj.proc("oauth.facebook_authorize").then(function (x) {
      document.location.href = x[1][0];
    });
  };


  $scope.dropbox_init = function() {
    // SWBrijj.tbl('account.profile').then(function(x) { initPage($scope, x) }).except(initFail);
    SWBrijj.procm('oauth.dropbox_list','')
      .then(function(x)  { $scope.dropboxFiles=x; $scope.$apply(); })
      .except( function(x) {} );
    var dropbox = angular.element(".dropbox")[0];

    dropbox.addEventListener('dragenter', dragEnterLeave, false);
    dropbox.addEventListener('dragleave', dragEnterLeave, false);
    dropbox.addEventListener('dragover', dragOver, false);
    dropbox.addEventListener('drop', drop, false);

  };

    $scope.currentPassword="";
    $scope.newPassword="";
    $scope.passwordConfirm="";
    
    $scope.validPasswordNot = function() { 
        return !($scope.currentPassword && !($scope.passwordMatchesNot() || $scope.regexPassword())); };
    
    $scope.regexPassword = function() {
        var newP = $scope.newPassword;
    	if (newP.match(/(?=.*?[a-z])(?=.*?[A-Z])(?=.*?[0-9]).{8,}/)) return "";
    	else if (newP.match(/(?=.*?[a-z])(?=.*?[A-Z]).{8,}/)) return "Missing a digit";
    	else if (newP.match(/(?=.*?[a-z])(?=.*?[0-9]).{8,}/)) return "Missing an uppercase letter";
    	else if (newP.match(/(?=.*?[0-9])(?=.*?[A-Z]).{8,}/)) return "Missing a lowercase letter";
    	else if (newP.length < 8) return "Must be at least eight characters";
    	else return "Must contain at least one lowercase letter, one uppercase letter, and one digit";
    };
    
    $scope.passwordMatchesNot = function() {
        return $scope.passwordConfirm != $scope.newPassword ; 
    };
    
    $scope.changePassword = function() {
        SWBrijj.proc("change_password", $scope.currentPassword, $scope.newPassword).then(function(x) {
            if (x[1][0]) alert("changed successfully");
            else alert("Oops.  Change failed");
        }).except(function(x) {alert("Oops.  Change failed: "+x); });
    };

  $scope.doSelect = function(x) {
    /** @name SWBrijj#view
     * @function
     * @param {string}
     * @param {...}
     */

    SWBrijj.view(x || $scope.sql).then(function(x) {
      $scope.columns = x[0];
      $scope.data = x.slice(1);
    });
  };


  $scope.authorize = function() {
    SWBrijj.proc("get_google_access").then(function(x) {
      var ru = x[1][0];
      document.cookie="rux="+encodeURIComponent(ru)+";path=/";
      document.location.href=ru;
    });
  };

  $scope.download = function() {
    /** @name SWBrijj#getSignups
     *  @function */
    SWBrijj.getSignups().then(function(x) {
      document.location.href=x;
    });
  }


}]);




app.controller('ContactsCtrl',['$scope', 'SWBrijj', function($scope, SWBrijj) {
  SWBrijj.procm('profile').then(function(x) {
    console.log(x);
    $scope.items = x;
    $scope.$apply();
  });
}]);

app.controller('SignupsCtrl',['$scope', 'SWBrijj', function($scope, SWBrijj) {
  SWBrijj.proc('get_signupcnt_all').then(function(x) {
    $scope.signupcnt_all = x[1][0];
    $scope.$apply();
  });

  SWBrijj.proc('get_signupcnt_today').then(function(x) {
    $scope.signupcnt_today = x[1][0];
    $scope.$apply();
  });

  SWBrijj.proc('get_signupcnt_yesterday').then(function(x) {
    $scope.signupcnt_yesterday = x[1][0];
    $scope.$apply();
  });





  $scope.downloadExcel = function() {

    // GET CURRENT DATE
    var date = new Date();

    // GET YYYY, MM AND DD FROM THE DATE OBJECT
    var yyyy = date.getFullYear().toString();
    var mm = (date.getMonth()+1).toString();
    var dd  = date.getDate().toString();

    // CONVERT mm AND dd INTO chars
    var mmChars = mm.split('');
    var ddChars = dd.split('');

    // CONCAT THE STRINGS IN YYYY-MM-DD FORMAT
    var datestring = yyyy + '-' + (mmChars[1]?mm:"0"+mmChars[0]) + '-' + (ddChars[1]?dd:"0"+ddChars[0]);
    var downloadname = "signup-report-" + datestring + ".xlsx";

    /** @name SWBrijj#procd
     * @function
     * @param {string} name
     * @param {string} procedure
     * @param {string} mimetype
     * @param {Date} timestamp
     */
    SWBrijj.procd(downloadname, "get_signups", "application/ms-excel", new Date()).then( function(x) { document.location.href=x; });
  };
}]);





/* Filter to format the activity time */
angular.module('AdminApp').filter('fromNow', function() {
  return function(date) {
    if (date == null) return '';
    if ( date.constructor === Date) return moment(date).fromNow();
    return date.toString();
  }
});
