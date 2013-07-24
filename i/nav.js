function NavCtrl($scope, $rootScope, $route, SWBrijj) {
	window.SWBrijj = SWBrijj;
	$scope.companies = [];
	$rootScope.selected = ['Company', 'example.com'];

	$scope.ownership = {visible: false, adminlink: '/company/ownership/', investorlink: '/investor/ownership/', link: ''};
	$scope.documents = {visible: false, adminlink: '/company/documents', investorlink: '/investor/documents', link: ''};
	$scope.people = {visible: false, adminlink: '/company/profile/people', investorlink: '/investor/profile', link: ''};

	$scope.select = function(companyURL) {
		document.cookie = "selectedCompany="+companyURL + ";";
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
	}

	function isAdmin(companyObj) {
		if (companyObj.email == "")
			return true;
		return false;
	}

	SWBrijj.procm('account.nav_companies').then(function(x) {
		for (var i = 0; i < x.length; i++) {
			$scope.companies.push({company: x[i]['company'], name: x[i]['name'], isAdmin: isAdmin(x[i])});
		}
		var cookie = readCookie("selectedCompany");
		if (cookie != null) {
			$scope.select(cookie);
		} else {
			$scope.select($scope.companies[0]['company']);	
		}
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
	$rootScope.notification.color = "success";
	$rootScope.notification.style = "notification " + $rootScope.notification.color;
	$rootScope.notification.visible = false;
	$rootScope.notification.message = "Notification Message";

	$rootScope.notification.show = function (color, message) {
		$rootScope.notification.visible = true;
		$rootScope.notification.color = color;
		$rootScope.notification.message = message;
		setTimeout(function() { $rootScope.notification.visible = false; $rootScope.$apply(); }, 5000);
	};
}