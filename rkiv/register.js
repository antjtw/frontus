
var mailcheck = {
    threshold: 3,

    domains: ["yahoo.com", "google.com", "hotmail.com", "gmail.com", "me.com", "aol.com", "mac.com",
      "live.com", "comcast.net", "googlemail.com", "msn.com", "hotmail.co.uk", "yahoo.co.uk",
      "facebook.com", "verizon.net", "sbcglobal.net", "att.net", "gmx.com", "mail.com"],

    topLevelDomains: ["com", "net", "org", "info", "edu", "gov", "mil"],

    run: function(email) {
      return mailcheck.suggest(encodeURI(email) );
    },

    suggest: function(email) {
      email = email.toLowerCase();

      var emailParts = this.splitEmail(email);

      var closestDomain = this.findClosestDomain(emailParts.domain, this.domains);

      if (closestDomain) {
        if (closestDomain != emailParts.domain) {
          // The email address closely matches one of the supplied domains; return a suggestion
          return { address: emailParts.address, domain: closestDomain, full: emailParts.address + "@" + closestDomain };
        }
      } else {
        // The email address does not closely match one of the supplied domains
        var closestTopLevelDomain = this.findClosestDomain(emailParts.topLevelDomain, this.topLevelDomains);
        if (emailParts.domain && closestTopLevelDomain && closestTopLevelDomain != emailParts.topLevelDomain) {
          // The email address may have a mispelled top-level domain; return a suggestion
          var domain = emailParts.domain;
          closestDomain = domain.substring(0, domain.lastIndexOf(emailParts.topLevelDomain)) + closestTopLevelDomain;
          return { address: emailParts.address, domain: closestDomain, full: emailParts.address + "@" + closestDomain };
        }
      }
      /* The email address exactly matches one of the supplied domains, does not closely
       * match any domain and does not appear to simply have a mispelled top-level domain,
       * or is an invalid email address; do not return a suggestion.
       */
      return false;
    },

    findClosestDomain: function(domain, domains) {
      var minDist = 99;
      var closestDomain = null;

      if (!domain || !domains) return false;

      for (var i = 0; i < domains.length; i++) {
        if (domain === domains[i]) return domain;
        var dist = this.sift3Distance(domain, domains[i]);
        if (dist < minDist) {
          minDist = dist;
          closestDomain = domains[i];
        }
      }
      return (minDist <= this.threshold && closestDomain !== null) ? closestDomain : false;
    },

    sift3Distance: function(s1, s2) {
      // sift3: http://siderite.blogspot.com/2007/04/super-fast-and-accurate-string-distance.html
      if (s1 == null || s1.length === 0) return (s2 == null || s2.length === 0) ? 0 : s2.length;
      if (s2 == null || s2.length === 0) return s1.length;

      var c = 0;
      var offset1 = 0;
      var offset2 = 0;
      var lcs = 0;
      var maxOffset = 5;

      while ((c + offset1 < s1.length) && (c + offset2 < s2.length)) {
        if (s1.charAt(c + offset1) == s2.charAt(c + offset2)) lcs++;
        else {
          offset1 = offset2 = 0;
          for (var i = 0; i < maxOffset; i++) {
            if ((c + i < s1.length) && (s1.charAt(c + i) == s2.charAt(c))) {
              offset1 = i;
              break;
            }
            if ((c + i < s2.length) && (s1.charAt(c) == s2.charAt(c + i))) {
              offset2 = i;
              break;
            }
          }
        }
        c++;
      }
      return (s1.length + s2.length) /2 - lcs;
    },

    splitEmail: function(email) {
      var parts = email.split('@');
      if (parts.length < 2) return false;

      for (var i = 0; i < parts.length; i++) {
        if (parts[i] === '') return false;
      }

      var domain = parts.pop();
      var domainParts = domain.split('.');
      var tld = '';

      if (domainParts.length == 0) return false; // The address does not have a top-level domain
      else if (domainParts.length == 1) tld = domainParts[0]; // The address has only a top-level domain (valid under RFC)
      else { // The address has a domain and a top-level domain
        for (var i = 1; i < domainParts.length; i++) { tld += domainParts[i] + '.'; }
        if (domainParts.length >= 2) tld = tld.substring(0, tld.length - 1);
      }
      return { topLevelDomain: tld, domain: domain, address: parts.join('@') }
    }
};

 function register() {
   var ds = document.querySelector("div.suggestion");
   var ni = document.querySelector("[name=username]");
   var n;
   // If the submission has changed since the last time I looked ...
   if ( (!ds.innerHTML.trim()) && (n = mailcheck.run( ni.value ))) {
     ds.innerHTML="Did you mean <span>"+n.full+"</span>?";
     return false;
   }
   SWBrijj.registration(ni.value, Recaptcha.get_challenge(), Recaptcha.get_response(), regResponse); 
	return false;
 }
  
 function regResponse(data) {
   console.log(data);
 }

 function showRecaptcha() {
   Recaptcha.create("6LfPJdkSAAAAAJkXnWv5N01JYX3FkmlCw8W00nOT", 'captchadiv', {
       tabindex: 1,
       theme: "red",
       callback: Recaptcha.focus_response_field
   });
 }
 showRecaptcha();
