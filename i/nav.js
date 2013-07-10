function NavCtrl($scope, SWBrijj) {
	window.SWBrijj = SWBrijj;
	$scope.companies = [];
	SWBrijj.procm('account.nav_companies').then(function(x) {
		for (var i = 0; i < x.length; i++) {
			$scope.companies.push({company: x[i]['company'], name: x[i]['name']});
		}
		$scope.selected = $scope.companies[0].name;
		console.log($scope.companies);
	});
}