
function readCookie(name) {
  var nameEQ = name + "=";
  var ca = document.cookie.split(';');
  for(var i=0;i < ca.length;i++) {
    var c = ca[i];
    while (c.charAt(0)==' ') c = c.substring(1,c.length);
    if (c.indexOf(nameEQ) == 0) return decodeURIComponent(c.substring(nameEQ.length,c.length));
  }
  return null;
}


function NavCtrl($scope, $route, $rootScope, $routeParams, SWBrijj) {
	window.SWBrijj = SWBrijj;
	$scope.companies = [];
	$rootScope.selected = [];

	$scope.nav = 'navBarLoggedOut';
	var singleBarPages = ["/", "/team/", "/careers/", "/press/", "/privacy/", "/?logout=1"];
	$scope.showBothBars = false;
	$rootScope.isLoggedIn = false;
	$rootScope.path = document.location.href.substring(document.location.href.indexOf(document.location.host)).replace(document.location.host, "");
    console.log($rootScope.path);

	$scope.isCollapsed = true;
	$rootScope.loaded = true; // ngShow on loaded to prevent login box from flashing on page load

	$scope.people = {visible: false, adminlink: '/company/profile/people', investorlink: '/investor/profile', link: ''};

  $scope.switch = function(nc) {
      $rootScope.path = document.location.href.substring(document.location.href.indexOf(document.location.host)).replace(document.location.host, "");
      SWBrijj.switch_company(nc.company, nc.role).then( function(data) {
        $scope.companies = data;
        $scope.initCompany(true);
    });
  }
	$scope.initCompany = function(switching) {
    var cmps = $scope.companies;
    var thiscmp = cmps[0]; // pick the first one in case none are marked selected
	  for (var i = 0; i < cmps.length; i++) {
  		if (cmps[i].current) {
        thiscmp = cmps[i];
        break;
      }
    }
    $rootScope.selected = thiscmp;

    if (!thiscmp.current) {
      /* I was unable to set the current company to the first in the list */
      if (switching) { document.location.href = '/login'; return; }
      $scope.switch(thiscmp);
    }
    if (thiscmp.role == 'issuer') {
					$scope.people.link = $scope.people.adminlink;
					$scope.people.visible = true;
		} else {
					$scope.people.link = $scope.people.investorlink;
					$scope.people.visible = false;
		}


    if (singleBarPages.indexOf($rootScope.path) > -1) {
      $scope.nav = 'navBarLoggedOut';
      $scope.showBothBars = false;
    } else {
      $scope.nav = 'navBar';
      $scope.showBothBars = true;
    }
    if ($rootScope.isLoggedIn) {
      if (thiscmp.role == 'issuer') { // If user does not belong in a company, the link will be the default homepage URL
        $scope.logoLink = '/home/company';
      } else {
        $scope.logoLink = '/home';
      }
    }

    if (switching) {
        if (($rootScope.path.indexOf('ownership') > -1) && (($rootScope.path.indexOf('grants') > -1) || ($rootScope.path.indexOf('status') > -1))) {
            document.location.href = '/ownership'; return;
        }
    }
    $route.reload();
  }

  $rootScope.userid = readCookie("userid");
  $rootScope.isLoggedIn = true;

	SWBrijj.tblm('global.my_companies').then(function(x) {
    $scope.companies = x;
    $scope.initCompany(false);
	}).except(function(ignore) {
		$scope.nav = 'navBarLoggedOut';
		console.log('Not logged in');
		$rootScope.showLogin = true;
        $rootScope.isLoggedIn = false;
	});

    // Notification code
	$rootScope.notification = {visible: false};

	$rootScope.notification.show = function (color, message, callback) {
		$rootScope.notification.color = color;
        $rootScope.notification.message = message;
        $rootScope.notification.style = "notification " + color;
        $rootScope.notification.visible = true;
		setTimeout(function() { 
			$rootScope.notification.visible = false;
			$rootScope.$apply();
			if (callback) { callback(); }
		}, 3000);
	};

    // Returns true (disabling the login button) until the fields are filled out
	$scope.fieldCheck = function() {
    return ! ($scope.username && $scope.password);
  };

    // Login Function
  $scope.doLogin = function() {
    SWBrijj.login($scope.username.toLowerCase(), $scope.password).then(function(x) {
      if (x) {
        document.location.href = x;
        console.log("redirecting to: " + x);
      } else {
        document.location.href="/login/?error=" + $scope.username;
      }
    }).except(function(x) {
      console.log('Login error');
    });
  }
}
