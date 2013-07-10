<script src="/i/nav.js"></script>
<div id="navBar">
  <div class="container" ng-controller="NavCtrl">
    <div class="row-fluid">
      <section id="bannerBar">
        <div class="navbar navbar-inner dropdown">
          <a class="brand menu_dropdown dropdown-toggle" href="#" ng-bind="selected.name">Company</a>
          <ul class="dropdown-menu">
            <li ng-repeat="company in companies">
              <a ng-click="select('{{company.company}}')">{{company.name}}</a>
            </li>
          </ul>
          <ul class="nav">
            <li ng-show="ownership.visible"><a class="menuHeaderText button" href="{{ownership.link}}">Ownership</a></li>
            <li ng-show="documents.visible"><a class="menuHeaderText button" href="{{documents.link}}">Documents</a></li>
            <li ng-show="people.visible"><a class="menuHeaderText button" href="{{people.link}}">People</a></li>
          </ul>
          <ul class="nav pull-right">
            <li class="pull-right"><a class="menuHeaderText button" href="/investor/profile">Profile</a></li>
            <li><a class="menuHeaderText button" href="/login/logout">Logout</a></li>
          </ul>
        </div>
      </section>
    </div>
  </div>
</div>
