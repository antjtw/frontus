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

	$scope.ownership = {visible: false, adminlink: '/company/ownership/', investorlink: '/investor/ownership/', link: ''};
	$scope.documents = {visible: false, adminlink: '/company/documents', investorlink: '/investor/documents', link: ''};
	$scope.people = {visible: false, adminlink: '/company/profile/people', investorlink: '/investor/profile', link: ''};

	$rootScope.select = function(companyURL) {
        console.log(companyURL);
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
					}).except();
					SWBrijj.tblm('document.my_investor_library', ['company']).then(function(x) {
						for (var i = 0; i < x.length; i++) {
							if (x[i].company == $rootScope.selected.company) {
								$scope.documents.visible = true;
								break;
							}
						}
					}).except();
				}
			}
		}
		changeNav();
	}

	function isAdmin(companyObj) {
		if (companyObj.email == "")
			return true;
		return false;
	}

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

	var cookie = readCookie("selectedCompany");
  $rootScope.userid = readCookie("userid");
	if (cookie != null  && cookie != "undefined") {
		$rootScope.isLoggedIn = true;
		$rootScope.select(cookie);
	}

/*    sharedData.getCompanies()*/
	SWBrijj.tblm('global.my_companies').then(function(x) {

    $rootScope.isLoggedIn = true;


		for (var i = 0; i < x.length; i++) {
			$scope.companies.push({company: x[i].company, name: x[i].name, isAdmin: x[i].role == 'issuer'});
		}

		if (x.length > 0) {
			var cookie = readCookie("selectedCompany");
			if (cookie != null && cookie != "undefined") {
                console.log("we're using cookies");
                console.log(cookie);
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

    // Switches the page when you select a new company
    $rootScope.switch = function(company) {
        $rootScope.select(company.company);
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
        }
    };

    // Notification code
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

    // Returns true (disabling the login button) until the fields are filled out
	$scope.fieldCheck = function() {
      if ($scope.username && $scope.password) {
        return false;
      }
      else {
        return true;
      }
    };

    // Filters out the current company from the selectable list
    $scope.otherCompanies = function (companies, current) {
         var othercomps = [];
         angular.forEach(companies, function(company) {
              if (company.name != current) {
                  othercomps.push(company);
              };
         });
        return othercomps
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
