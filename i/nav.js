function NavCtrl($scope, SWBrijj) {
	window.SWBrijj = SWBrijj;
	$scope.companies = [];
	$scope.selected = ['Company', 'example.com'];

	$scope.ownership = {visible: true, adminlink: '/company/ownership/', investorlink: '/investor/ownership', link: ''};
	$scope.documents = {visible: true, adminlink: '/company/documents', investorlink: '/investor/documents', link: ''};
	$scope.people = {visible: true, adminlink: '/company/profile/people', investorlink: '/investor/profile', link: ''};

	$scope.select = function(companyURL) {
		if (companyURL == $scope.selected.company) {
			document.location.href = '/company/profile';
		}
		for (var i = 0; i < $scope.companies.length; i++) {
			if ($scope.companies[i].company == companyURL) {
				$scope.selected = $scope.companies[i];
				if (!$scope.selected.name) {
					$scope.selected.name = $scope.selected.company;
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
					// SWBrijj.tblm('ownership.my_company_audit', ['email']).then(function(x) {
						//TODO
					// });
					SWBrijj.tblm('document.my_investor_shares', ['sent_to']).then(function(x) {
						for (var i = 0; i < x.length; i++) {
							if (x[i]['sent_to'] == $scope.selected.email) {
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
		$scope.select($scope.companies[0]['company']);
	});

}