
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

	$scope.ownership = {visible: false, adminlink: '/company/ownership/', investorlink: '/investor/ownership/', link: ''};
	$scope.people = {visible: false, adminlink: '/company/profile/people', investorlink: '/investor/profile', link: ''};

  $scope.switch = function(nc) {
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
					$scope.ownership.link = $scope.ownership.adminlink;
					$scope.people.link = $scope.people.adminlink;
					$scope.ownership.visible = true;
					$scope.people.visible = true;
		} else {
					$scope.ownership.link = $scope.ownership.investorlink;
					$scope.people.link = $scope.people.investorlink;
					$scope.ownership.visible = true;
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
      if ($rootScope.selected.isAdmin) { // If user does not belong in a company, the link will be the default homepage URL
        $scope.logoLink = '/home/company';
      } else {
        $scope.logoLink = '/home';
      }
    }

    $route.reload();

    /*
		changeNav();


    if (!company.isAdmin && ($rootScope.path.indexOf('/company/profile/people') > -1)) {
      document.location.href=$rootScope.path.replace("/company/profile/people", "/home/");
    }
    if (!company.isAdmin && ($rootScope.path.indexOf('/company/profile/') > -1)) {
      document.location.href=$rootScope.path.replace("/company/profile/", "/home/");
    }
    if ($rootScope.path.indexOf('/home/') > -1) {
      console.log("here")
      if (!company.isAdmin && ($rootScope.path.indexOf('/company') > -1)) {
        console.log("burrowing in")
        document.location.href=$rootScope.path.replace("/company", "");
      }
      else if (company.isAdmin && ($rootScope.path.indexOf('/company') == -1)) {
        document.location.href=$rootScope.path.replace("/home/", "/home/company/");
      }
    }
    if ($rootScope.path.indexOf('/ownership') + $rootScope.path.indexOf('/documents') > -2) { // Refresh page if user is on ownership or documents
      console.log($rootScope.path.indexOf('/company/'));
      if (company.isAdmin && ($rootScope.path.indexOf('/investor/') > -1)) {
        console.log("admin on investor page")
        document.location.href=$rootScope.path.replace("/investor/", "/company/");
      }
      else if (!company.isAdmin && ($rootScope.path.indexOf('/company/') > -1)) {
        console.log("non-admin on investor page")
        document.location.href=$rootScope.path.replace("/company/", "/investor/");
      }
      else {
        $route.reload();
      }
      */

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
