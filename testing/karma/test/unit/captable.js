

'use strict';

/* jasmine specs for controllers go here */
describe('Login app', function() {

  describe('LoginApp', function(){

    it('should create find page', function() {
      browser().navigateTo("/login");

      expect(scope.showError).toBe(true);
    });
  });
});
