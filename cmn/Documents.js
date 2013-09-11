
function getIntProperty(se, z) {
  var lh = getComputed(se, z);
  lh = parseFloat(lh.replace("px", ""));
  return lh;
}

function getComputed(se, z) {
  return se.currentStyle ? se.currentStyle[z] : document.defaultView.getComputedStyle(se, null).getPropertyValue(z);
}

function getOffset(ev) {
  var offx, offy;
  if (ev.offsetX === undefined) { // Firefox code
    // offx = ev.pageX - ev.target.offsetLeft;
    // offy = ev.pageY - ev.target.offsetTop;

    offx = ev.originalEvent.layerX;
    offy = ev.originalEvent.layerY;

  } else {
    offx = ev.offsetX;
    offy = ev.offsetY;
  }
  return [offx, offy];
}
function getNoteBounds(nx) {
  var dp = document.querySelector('.docPanel');
  var dpo = [ dp.offsetLeft, dp.offsetTop];
  var bds = [ getIntProperty(nx,'left'), getIntProperty(nx, 'top'),0,0];
  var ntyp = nx.notetype;
  var z, ibds;
  if (ntyp == 'text') {
    var t = nx.querySelector('textarea');
    z = t.offset;
    ibds = [z[0], z[1], z[2], z[3]];
    ibds[0] += t.offsetLeft; // + getIntProperty(t,'padding-left');
    ibds[1] += t.offsetTop; // + getIntProperty(t,'padding-top');
  } else if (ntyp == 'canvas') {
    var c = nx.querySelector('canvas');
    z = c.offset;
    ibds = [z[0], z[1], z[2], z[3]];
    ibds[0] += c.offsetLeft; // + getIntProperty(t,'padding-left');
    ibds[1] += c.offsetTop; // + getIntProperty(t,'padding-top');
  } else if (ntyp == 'check') {
    ibds = [12, 27, 14, 14];
//    ibds[0]+= t.offsetLeft + getIntProperty(t,'padding-left');
//    ibds[1]+= t.offsetTop + getIntProperty(t,'padding-top');
  }
  ibds[0]-=dpo[0];
  ibds[1]-=dpo[1];

  return [bds,ibds];
}

function countCRs(str) {
  var z = str;
  var cnt = 0;
  while(true) {
    var a = z.indexOf('\n');
    if (a < 0) return cnt;
    cnt++;
    z = z.substring(a+1);
  }
}




angular.module('draggable', [], function() {}).
    directive('draggable', ['$document' , function($document) {
      return {
        restrict: 'EA',
        replace: true,
        transclude: true,
        scope: true,
        template: '<div class="sticky">' +
            '<ul>'+
            '<li ng-click="dragMe($event)"><span data-icon="&#xe043;"</span></li>'+
            '<li ng-show="growable" ng-click="biggerMe($event)"><span data-icon="&#xe041;" aria-hidden="true"/></li>'+
            '<li ng-show="growable" ng-click="smallerMe($event)"><span data-icon="&#xe040;" aria-hidden="true"/></li>' +
            '<li></li>' +
            '<li ng-click="closeMe($event)"><span data-icon="&#xe01b;"></span></li></ul>'+
            '<span ng-transclude></span>' +
            '</div>',
        link: function(scope, elm, attrs) {
          // the elm[0] is to unwrap the angular element
          void(attrs);
          document.querySelector('.docPanel').appendChild(elm[0]);
          scope.page = scope.restoredPage || scope.currentPage;
          elm[0].page = scope.page;
          scope.$parent.notes.push(elm);
          elm.css({position: 'absolute'});
        },

           controller: ["$scope", "$element", function($scope, $element) {

    /*           $transclude(function(clone, scope) {
                 $scope.annotation = scope;
                 // $element.prepend(clone);
               });
      */
               var dragicon = $element.find("ul>li:first-child");

               /* This is the drag - code -- its been moved to work on the drag widget */
               $scope.mousedown = function ($event) {
                   $scope.initdrag($event);
                   return false;
               };

               dragicon.bind('mousedown', $scope.mousedown);

               $scope.mousemove = function ($event) {
                 var dx = $event.clientX - $scope.initialMouseX;
                 var dy = $event.clientY - $scope.initialMouseY;
                 $element.css({
                   top: (Math.max(0, $scope.startY + dy) ) + 'px',
                   left: (Math.max(0, $scope.startX + dx) ) + 'px'
                 });
                 return false;
               };

               $scope.mouseup = function () {
                 $document.unbind('mousemove', $scope.mousemove);
                 $document.unbind('mouseup', $scope.mouseup);
                 return false;
               };

               $scope.initdrag = function(ev) {

                 var dp = document.querySelector(".docPanel");
                 var dpr = dp.getBoundingClientRect();
                 var dprl = dpr.left - dp.offsetLeft;
                 var dprt =  dpr.top - dp.offsetTop;

                 // Do I need to add in document.scrollTop ?
                 var offs = getOffset(ev);
                 $scope.startX = ev.clientX-dprl - offs[0];
                 $scope.startY = ev.clientY-dprt - offs[1];
                 $scope.initialMouseX = ev.clientX;
                 $scope.initialMouseY = ev.clientY;
                 $scope.mousemove(ev);
                 $document.bind('mousemove', $scope.mousemove);
                 $document.bind('mouseup', $scope.mouseup);
               };

               $scope.biggerMe = function (ev) {
                 void(ev);
                 var elem = $element.find('textarea');
                 var fs = elem.css('font-size');
                 elem.css( 'font-size', parseInt(fs.substr(0, fs.length-2)) + 2);
                 $scope.fixBox(elem[0]);
               };

               $scope.smallerMe = function (ev) {
                 void(ev);
                 var elem = $element.find('textarea');
                 var fs = elem.css('font-size');
                 elem.css( 'font-size', parseInt(fs.substr(0, fs.length-2)) - 2);
                 $scope.fixBox(elem[0]);
               };


             }]
      };
    }])
    /*.directive('checkbox', function() {
      return {
        restrict: 'A',
        template: '<i class="button icon-ok icon-2x" background-color:white"></i>'
      }}) */;



var docs = angular.module('documents', ['ui.bootstrap','brijj','draggable'], function() {});

docs.directive('backImg', function(){
  return {
    restrict: 'A',
    link: function(scope, element, attrs){
      attrs.$observe('backImg', function(url) {
        element.css({
          'background-image': 'url(' + url +')',
          'background-size' : 'cover'
        });
      });
    }
  }
});

docs.directive('docViewer', function() {
  return {
    restrict: 'EA',
    scope: { docId: '=docId', invq:'=invq', pageQueryString: '=pageQueryString'},
    templateUrl: '/cmn/docViewer.html',
    controller: 'DocumentViewController'
  }
});

docs.filter('fromNow', function() {
  return function(date) {
    return moment(date).fromNow();
  }
});

docs.directive('icon', function() {
  return {
    restrict: 'E',
    template: '<button><span data-icon="&#xe00d;" aria-hidden="true"></span></button>'
  }
});

docs.controller('DocumentViewController', ['$scope','$compile','$location','$routeParams', '$window','SWBrijj',
  function($scope, $compile, $location, $routeParams, $window, SWBrijj) {
    $scope.features = { annotations: false};

  if ($scope.features.annotations) {
    $window.addEventListener('beforeunload', function(event) {
      void(event);
      var ndx = $scope.getNoteData();
      /** @name $scope#lib#annotations
       * @type {[Object]}
       */
      if ( (!$scope.lib) || ndx == $scope.lib.annotations) return; // no changes

      /** @name SWBrijj#_sync
       * @function
       * @param {string}
       * @param {string}
       * @param {string}
       * @param {...}
       */
        // This is a synchronous save
      console.log("saving note data (228): "+ndx);
      /** @name $scope#lib#original
       * @type {int} */
      var res = SWBrijj._sync('SWBrijj','saveNoteData',[$scope.docId, $scope.invq, !$scope.lib.original, ndx]);
      // I expect this returns true (meaning updated).  If not, the data is lost
      if (!res) alert('failed to save annotations');
    });

  /* Save the notes when navigating away */
  // There seems to be a race condition with using $locationChangeStart or Success
  $scope.$on('$locationChangeStart', function(event, newUrl, oldUrl) {
    void(oldUrl);
    // don't save note data if I'm being redirected to log in
    if (newUrl.match(/login([?]|$)/)) return;
    console.log("saving note data (240) due to $locationChangeStart");
    $scope.saveNoteData();
  });
  }


  $scope.showPages = function() {
    return $scope.range($scope.pageScroll+1, Math.min($scope.pageScroll+$scope.pageBarSize, $scope.docLength+1));
  };

  $scope.morePages = function() {
    return $scope.docLength > $scope.pageScroll+$scope.pageBarSize;
  };

  $scope.pageBarRight = function() {
    $scope.pageScroll = Math.min($scope.docLength-$scope.pageBarSize+1, $scope.pageScroll+($scope.pageBarSize-1));
  };

  $scope.pageBarLeft = function() {
    $scope.pageScroll = Math.max(0, $scope.pageScroll - ($scope.pageBarSize - 1));
  };

  $scope.unsaved = function (page) {
    var nn = $scope.notes;
    for (var i = 0; i < nn.length; i++) {
      if (nn[i].scope().page == page) return true;
    }
    return false;
  };
  $scope.isAnnotated = function (page) {
    return $scope.unsaved(page) || $scope.annotated[page - 1];
  };

  $scope.removeAllNotes = function() {
    for (var i = 0; i < $scope.notes.length; i++) {
      document.querySelector('.docPanel').removeChild($scope.notes[i][0]);
    }
    $scope.notes = [];
  };
  $scope.annotable = function () {
    if (true) return false;
    // FIXME: annotations disabled
    if ($scope.lib == undefined) return true;
    return ($scope.invq && (!$scope.lib.when_signed && $scope.lib.signature_deadline))
        || (!$scope.invq && (!$scope.lib.original || ($scope.lib.when_signed && !$scope.lib.when_confirmed)));
  };
  $scope.init = function () {
    $scope.notes=[];
    $scope.pageScroll = 0;
    $scope.pageBarSize = 9;
    $scope.showPageBar = true;

    if ($routeParams.page) $scope.currentPage = parseInt($routeParams.page);
    else if (!$scope.currentPage) $scope.currentPage = 1;
    if (!$scope.docId) return;

    /** @name SWBrijj#tblmm
     * @function
     * @param {string}
     * @param {...}
     */
    SWBrijj.tblmm($scope.$parent.pages, 'annotated,page'.split(','), "doc_id", $scope.docId).then(function(data) {
      $scope.docLength = data.length;
      // does scaling happen here?

      $scope.annotated = new Array(data.length);
      for(var i=0;i<data.length;i++) {
        $scope.annotated[data[i].page-1] = data[i].annotated;
      }
    });

    /** @name SWBrijj#tblm
     * @function
     * @param {string}
     * @param {...}
     */
      // This gets called twice because init gets called twice.
    // That doubles up the notes, so -- until I figure out why init gets called twice,
    // need to delete all the notes that init created the first time around
    SWBrijj.tblm($scope.$parent.library, "doc_id", $scope.docId).then(function(data) {
      $scope.lib = data;
      // if there were notes left over, delete them
      $scope.removeAllNotes();

      var aa = data['annotations'];
      if (aa) {
        // restoreNotes
        var annots = eval(aa);
        var sticky;
        for(var i = 0;i<annots.length;i++) {
          var annot = annots[i];
          if (annot[1] == 'check') {
            sticky = $scope.newCheckX(annot[0][0]);
          } else if (annot[1] == 'text') {
            sticky = $scope.newBoxX(annot[0][0],annot[2][0], annot[3]);
          } else if (annot[1] == 'canvas') {
            sticky = $scope.newPadX(annot[0][0], annot[2][0]);
          }
          // the notes were pushed in the newXXX function
          sticky.css({
            top:  Math.max(0, annot[0][1][1]),
            left: Math.max(0, annot[0][1][0])
          });

        }
      } // json struct



    });
  };

  $scope.$watch("docId", $scope.init);

  $scope.closeMe = function (ev) {
    var z = ev.currentTarget;
    while (z.attributes.draggable === undefined) z = z.parentElement;
    z.parentElement.removeChild(z);
    for (var i = 0; i < $scope.notes.length; i++) {
      if ($scope.notes[i][0] === z) {
        $scope.notes.splice(i, 1);
        return;
      }
    }
  };

  $scope.setPage = function (n) {
    $scope.currentPage = n;
    var s = $location.search();
    s.page = n;
    $location.search(s);
  };
  $scope.nextPage = function(value) { 
    if ($scope.currentPage < $scope.docLength) {
      $scope.setPage(value+1);
    }
  };
  $scope.previousPage = function(value) { 
    if ($scope.currentPage > 1) {
      $scope.setPage(value-1);
    }
  };
  
  $scope.jumpPage = function(value) {
    $scope.setPage(value); };

  $scope.range = function(start, stop, step){
    if (typeof stop=='undefined'){ stop = start; start = 0; }
    if (typeof step=='undefined'){ step = 1; }
    if ((step>0 && start>=stop) || (step<0 && start<=stop)) return [];
    var result = [];
    for (var i=start; step>0 ? i<stop : i>stop; i+=step) result.push(i);
    return result;
  };
  $scope.newBox = function (event) {
    var aa = $scope.newBoxX($scope.currentPage, '', null);
    aa.scope().initdrag(event);
  };

  $scope.fixBox = function (bb) {
    var pad;
    bb.style.width = '30px';
    bb.style.height = '20px';
    var crs = countCRs(bb.value);
    if (bb.clientHeight < bb.scrollHeight) {
      pad = getIntProperty(bb, 'padding-top') + getIntProperty(bb, 'padding-bottom');
      bb.style.height = (bb.scrollHeight - pad) + "px";
    }
    if (bb.clientWidth < bb.scrollWidth) {
      // pad = getIntProperty(bb, 'padding-left') + getIntProperty(bb, 'padding-right');
      bb.style.width = (bb.scrollWidth + 10) + "px";
    }
    bb.fontSize = getIntProperty(bb, 'font-size');
    bb.lineHeight = Math.floor(bb.fontSize * 1.4);
    bb.style.lineHeight = 1.4;
    bb.rows = crs + 2;
    bb.style.height = "auto";
    bb.offset = [bb.offsetLeft, bb.offsetTop, bb.offsetWidth, bb.offsetHeight];
  };

  $scope.newBoxX = function(page, val, style) {
    $scope.restoredPage = page;
    var aa = $compile('<div draggable ng-show="currentPage=='+page+'"	 class="row-fluid draggable" >'+
        '<fieldset><div><textarea wrap="off" ng-model="annotext" class="row-fluid"/></div></fieldset></div>')($scope);
    aa.scope().ntype='text';
    aa[0].notetype='text';
    aa.scope().growable = true; // for the growable icons
    var bb = aa[0].querySelector("textarea");
    bb.addEventListener('input', function(e) { void(e); $scope.fixBox(bb);
    });
    var ta = aa.find('textarea');
    ta.scope().annotext = val;
    ta.width( ta.width() );
    if (style) {
      aa.find('textarea').css('fontSize',style[0]);
    }
    bb.value = val;
    $scope.fixBox(bb);
    window.setTimeout( function() {
      if (bb.offsetWidth) $scope.fixBox(bb); }, 850);

    return aa;
  };

  $scope.newCheck = function(event) {
    var aa = $scope.newCheckX($scope.currentPage);
    aa.scope().initdrag(event);
  };
  $scope.newCheckX = function (page) {
    $scope.restoredPage = page;
    var aa = $compile('<div draggable ng-show="currentPage==' + page + '"	 class="row-fluid draggable">' +
        '<span class="check-annotation" data-icon="&#xe023;"></i>' +
        '</div>')($scope);
    aa.scope().ntype = 'check';
    aa[0].notetype='check';
    return aa;
  };
  $scope.newDate = function(event) {
    var d = new Date();
    var fmtdat = (d.getMonth() + 1) + "/" + d.getDate() + "/" + d.getFullYear();
    var aa = $scope.newBoxX($scope.currentPage, fmtdat);
    aa.scope().initdrag(event);
    return aa;
  };

  $scope.newPad = function (event) {
    var aa = $scope.newPadX($scope.currentPage, []);
    aa.scope().initdrag(event);
  };

  $scope.fixPad = function (aa) {
    var z = aa.find('canvas')[0];
    z.width = ( aa.width() - 8);
    z.height = (aa.height() - 27);
    z.offset = [getComputed(z, 'offsetTop'), getComputed(z, 'offsetLeft'), z.offsetWidth, z.offsetHeight];
    var strokes = z.strokes;
    var ctx = z.getContext('2d');
    ctx.lineCap = 'round';
    ctx.color = 'blue';
    ctx.lineWidth = 2;
    // ctx.setAlpha(0.5);
    for (var i = 0; i < strokes.length; i++) {
      var line = strokes[i];

       ctx.beginPath();
       ctx.moveTo(line[1], line[2]);
       ctx.lineTo(line[3], line[4]);
       ctx.strokeStyle = line[0];
       ctx.stroke();
    }
  };

  $scope.newPadX = function(page,lines) {
    $scope.restoredPage = page;
    var aa = $compile('<div draggable ng-show="currentPage=='+page+'"	 class="row-fluid draggable">'+
        '<canvas style="background-color:white"></canvas></div>')($scope);
    aa.scope().ntype='canvas';
    aa[0].notetype='canvas';

    aa.css({resize: 'both',overflow:'hidden'});

    aa[0].addEventListener('mouseup', function(e) {
      void(e);
      $scope.fixPad(aa); $scope.resizeDown = false;  });
    aa[0].addEventListener('mousemove', function(e) {
      if (e.which != 0)
      $scope.fixPad(aa); });
    // I don't, in fact, get the mousedown event

    var canvas = aa[0].querySelector('canvas');
    var ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.color = 'blue';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'white';
    // ctx.setAlpha(0);
    ctx.fillRect(0,0,200,200);
    // ctx.setAlpha(0.5);

    canvas.addEventListener('mousedown', function(e) {
      canvas.down = true;
      var offs = getOffset(e);
      canvas.X = offs[0];
      canvas.Y = offs[1];
    }, false);
    canvas.addEventListener('mouseover', function(e) { void(e); canvas.down = false; });
    canvas.addEventListener('mouseout', function(e) { void(e); canvas.down = false; });
    canvas.addEventListener('mouseup', function(e) { void(e); canvas.down = false; });
    canvas.strokes = [];
    canvas.addEventListener('mousemove', function(e) {
      if(canvas.down) {
        ctx.beginPath();
        ctx.moveTo(canvas.X, canvas.Y);
        var offs = getOffset(e);
        ctx.lineTo(offs[0] , offs[1] );
        ctx.strokeStyle = this.color;
        canvas.strokes.push([canvas.color, canvas.X, canvas.Y, offs[0], offs[1]]);
        ctx.stroke();
        canvas.X = offs[0] ;
        canvas.Y = offs[1] ;
      }
    }, true); // cancel bubble
    canvas.strokes = lines;
    $scope.fixPad(aa);
    return aa;
  };

  $scope.showPageBar = function(evt) {

  };

  $scope.acceptSign = function (sig) {
    void(sig);
    SWBrijj.procm("document.countersign", $scope.docId).then(function (data) {
      void(data);
      // should this be: ??
      // $route.reload();
      window.location.reload();
    });
  };

  $scope.clearNotes = function(event) {
    void(event);
    SWBrijj.procm( $scope.invq ? "document.delete_investor_page" : "document.delete_counterparty_page",
            $scope.docId, $scope.currentPage).then(function(x) {
          void(x);
    var docpanel = document.querySelector(".docPanel");
          var imgurl;
          imgurl = docpanel.style.backgroundImage;
    docpanel.style.backgroundImage = imgurl;
    });
  };

  $scope.clearAllNotes = function (event) {
    void(event);
    for (var i = 1; i <= $scope.docLength; i++) {
      var z = i;
      /** @name SWBrijj#deletePage
       * @function
       * @param {int}
       */
      SWBrijj.deletePage($scope.docId, i).then(function (x) {
        void(x);
        if (z = $scope.currentPage) {
          var docpanel = document.querySelector(".docPanel");
          var imgurl;
          imgurl = docpanel.style.backgroundImage;
          docpanel.style.backgroundImage = imgurl;
        }
      });
    }
  };

  $scope.getNoteData = function () {
    var noteData = [];
    var dp = document.querySelector(".docPanel");
    for (var i = 0; i < $scope.notes.length; i++) {
      var n = $scope.notes[i];
      var nx = n[0];
      var bnds = getNoteBounds(nx);
      var pos = [nx.page, bnds[0], bnds[1], dp.clientWidth, dp.clientHeight ];
      var typ = nx.notetype;
      var val = [];
      var style = [];
      var ndx = [pos, typ, val, style];
      var se, lh;

      if (typ == 'text')  {
        se = nx.querySelector("textarea");
        lh = getIntProperty(se,'line-height');
        val.push(se.value);
        style.push( getIntProperty(se,'font-size') );

        // var lho = Math.floor( (1/1.4) * lh);
        // ndx[0][2][1]+=lho;

        ndx[0][2][0]+=3;
        ndx[0][2][1]-=5;

      } else if (typ == 'check') {
        se = nx.querySelector("span.check-annotation");
        lh =  getIntProperty(se,'line-height');
        style.push(getIntProperty(se,'font-size') );
        ndx[0][2][1]+=Math.floor((1 / 1.4) * lh);

        // ndx[0][2][0]+=2;
        ndx[0][2][1]-=4;

      } else if (typ == 'canvas') {
        se = nx.querySelector("canvas");
        val.push(se.strokes);
      }
      noteData.push(ndx);
    }

  /*
    notData.sort(function(x,y) { if (x[0][0] == y[0][0]) {

    } else return x[0][0] < y[0][0] });
  */
    return JSON.stringify(noteData);
  };

  $scope.saveNoteData = function () {
    var nd = $scope.getNoteData();
    if ($scope.lib == undefined) return;
    // This happens when the "saveNoteData" is called by $locationChange event on the target doc -- which is the wrong one
    if (nd == $scope.lib.annotations) return;
    /** @name SWBrijj#saveNoteData
     * @function
     * @param {int}
     * @param {boolean}
     * @param {boolean}
     * @param {json}
     */
    console.log('saving note data (640): '+ nd);

    SWBrijj.saveNoteData($scope.docId, $scope.invq, !$scope.lib.original, nd).then(function (data) {
      void(data);
      var docpanel = document.querySelector(".docPanel");
      if (docpanel) {
        var imgurl;
        imgurl = docpanel.style.backgroundImage;
        docpanel.style.backgroundImage = imgurl;
      }
    });
  };
}]);

/* Looking for a way to detect if I need to reload the page because the user has been logged out
*/
/* For images, the "login redirect" should return an image that says "Please login again"
 */
/*
 $('<img/>').attr('src', 'http://picture.de/image.png').load(function() {
 $(this).remove(); // prevent memory leaks as @benweet suggested
 $('body').css('background-image', 'url(http://picture.de/image.png)');
 });
    */