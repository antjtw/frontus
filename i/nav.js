function NavCtrl($scope, $route, $rootScope, $routeParams, SWBrijj) {
	window.SWBrijj = SWBrijj;
	$scope.companies = [];
	$rootScope.selected = [];

	$scope.nav = 'navBarLoggedOut';
	var singleBarPages = ["/", "/team/", "/careers/", "/press/", "/privacy/", "/?logout=1"];
	$scope.showBothBars = false;
	$rootScope.isLoggedIn = false;
	$rootScope.path = document.location.href.substring(document.location.href.indexOf(document.location.host)).replace(document.location.host, "");

	function changeNav(){
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
	}

	$scope.isCollapsed = true;
	$rootScope.loaded = true; // ngShow on loaded to prevent login box from flashing on page load

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

	$scope.ownership = {visible: false, adminlink: '/company/ownership/', investorlink: '/investor/ownership/', link: ''};
	$scope.documents = {visible: false, adminlink: '/company/documents', investorlink: '/investor/documents', link: ''};
	$scope.people = {visible: false, adminlink: '/company/profile/people', investorlink: '/investor/profile', link: ''};

	$rootScope.select = function(companyURL) {
		document.cookie = "selectedCompany="+companyURL + "; path=/";
		for (var i = 0; i < $scope.companies.length; i++) {
			if ($scope.companies[i].company == companyURL) {
				$rootScope.selected = $scope.companies[i];
				if (!$rootScope.selected.name) {
					$rootScope.selected.name = $rootScope.selected.company;
				}
				if ($scope.companies[i].isAdmin) {
					$scope.ownership.link = $scope.ownership.adminlink;
					$scope.documents.link = $scope.documents.adminlink;
					$scope.people.link = $scope.people.adminlink;
					$scope.ownership.visible = true;
					$scope.documents.visible = true;
					$scope.people.visible = true;
				} else {
					$scope.ownership.link = $scope.ownership.investorlink;
					$scope.documents.link = $scope.documents.investorlink;
					$scope.people.link = $scope.people.investorlink;
					$scope.ownership.visible = false;
					$scope.documents.visible = false;
					$scope.people.visible = false;
					SWBrijj.tblm('ownership.my_company_audit', ['company', 'activity']).then(function(x) {
						for (var i = 0; i < x.length; i++) {
							if (x[i].company == $rootScope.selected.company && x[i].activity == "shared") {
								$scope.ownership.visible = true;
								break;
							}
						}
					});
					SWBrijj.tblm('document.my_investor_library', ['company']).then(function(x) {
						for (var i = 0; i < x.length; i++) {
							if (x[i].company == $rootScope.selected.company) {
								$scope.documents.visible = true;
								break;
							}
						}
					});
				}
			}
		}
		changeNav();
	}

	$rootScope.switch = function(companyURL) {
		$rootScope.select(companyURL);
		if ($rootScope.path.indexOf('/ownership') + $rootScope.path.indexOf('/documents') > -2) // Refresh page if user is on ownership or documents
			$route.reload();
	}

	function isAdmin(companyObj) {
		if (companyObj.email == "")
			return true;
		return false;
	}

	var cookie = readCookie("selectedCompany");
	if (cookie != null) {
		$rootScope.isLoggedIn = true;
		$rootScope.select(cookie);
	}

	SWBrijj.procm('account.nav_companies').then(function(x) {
		$rootScope.isLoggedIn = true;
		for (var i = 0; i < x.length; i++) {
			$scope.companies.push({company: x[i]['company'], name: x[i]['name'], isAdmin: isAdmin(x[i])});
		}

		if (x.length > 0) {
			var cookie = readCookie("selectedCompany");
			if (cookie != null) {
				$rootScope.select(cookie);
			} else {
				$rootScope.select($scope.companies[0]['company']);	
			}
		}
		
	}).except(function(ignore) {
		$scope.nav = 'navBarLoggedOut';
		console.log('Not logged in');
		$rootScope.showLogin = true;
	});

	function readCookie(name) {
		var nameEQ = name + "=";
		var ca = document.cookie.split(';');
		for(var i=0;i < ca.length;i++) {
			var c = ca[i];
			while (c.charAt(0)==' ') c = c.substring(1,c.length);
			if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
		}
		return null;
	}

	$rootScope.notification = {};
	$rootScope.notification.visible = false;

	$rootScope.notification.show = function (color, message, callback) {
		$rootScope.notification.visible = true;
		$rootScope.notification.color = color;
		$rootScope.notification.style = "notification " + $rootScope.notification.color;
		$rootScope.notification.message = message;
		$rootScope.$apply();
		setTimeout(function() { 
			$rootScope.notification.visible = false; 
			$rootScope.$apply();
			if (callback) { callback(); }
		}, 3000);
	};

	$scope.fieldCheck = function() {
      if ($scope.username && $scope.password) {
        return false;
      }
      else {
        return true;
      }
    };
}
