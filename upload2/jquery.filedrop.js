
(function($){
	$.event.props.push("dataTransfer");
	var doc_leave_timer,
	    files,
	    stop_loop = false,
	    $$ = {
		    maxfiles: 5,
		    refresh: 1000,
		    url: "aaa",
	        progressUpdated: function(file, index, progress) {},
	        uploadFinished: function(file, index, response, duration) {},
	        beforeEach: function(file) {return true;},
	        afterAll: function() { return true; },
	        uploadStarted: function(file, index) {},
            error: function(s) { alert(s); }
        };

	$.fn.filedrop = function(options) {
	    $.extend($$, options);
		this.bind('drop', xDrop).bind('dragenter', xDragEnter).bind('dragover', xDragOver).bind('dragleave', xDragLeave);
		$(document).bind('drop', xDocDrop).bind('dragenter', xDocEnter).bind('dragover', xDocOver).bind('dragleave', xDocLeave);
	};

	function xDrop(e) {
		files = e.dataTransfer.files;
		if (files === null || files === undefined) { $$.error("there are no files!"); return false; }
		upload();
		e.preventDefault();
		return false;
	}

	function progress(e) {
		if (e.lengthComputable) {
			var percentage = Math.round((e.loaded * 100) / e.total);
			if (this.currentProgress != percentage) {

				this.currentProgress = percentage;
				$$.progressUpdated(this.file, this.index, this.currentProgress);

				var elapsed = new Date().getTime();
				var diffTime = elapsed - this.currentStart;
				if (diffTime >= $$.refresh) {
					var diffData = e.loaded - this.startData;
					var speed = diffData / diffTime; // KB per second
					// currently I do nothing with speed
					this.startData = e.loaded;
					this.currentStart = elapsed;
				}
			}
		}
	}

	function upload() {
		stop_loop = false;
		if (!files) {
			$$.error('there are no files!');
			return false;
		}
		var filesDone = 0,
			filesRejected = 0;

		if (files.length > $$.maxfiles) {
		    $$.error('too many files, no more than '+$$.maxfiles+' at a time');
		    return false;
		}

		for (var i=0; i<files.length; i++) {
			if (stop_loop) return false;
			try {
				if ($$.beforeEach(files[i]) != false) {
					send(files[i], i);
				} else {
				    console.log("file rejected: "+ files[i].name);
					filesRejected++;
				}
			} catch(err) {
				$$.error("*** "+err);
				return false;
			}
		}

		function send(file, index) {
			// Sometimes the index is not attached to the
			// event object. Find it by size. Hack for sure.

			var xhr = new XMLHttpRequest(),
				upload = xhr.upload,
				start_time = new Date().getTime(),
				boundary = '------multipartformboundary' + start_time
				;

			upload.file = file;
			upload.downloadStartTime = start_time;
			upload.currentStart = start_time;
			upload.currentProgress = 0;
			upload.startData = 0;
			upload.addEventListener("progress", progress, false);

			xhr.open("POST", $$.url, true);
			// xhr.setRequestHeader('content-type', 'multipart/form-data; boundary=' + boundary);

			// xhr.sendAsBinary(builder);
			xhr.setRequestHeader('X-Filename',file.name);
			xhr.setRequestHeader('Accept','application/json');
			xhr.send(file);

			$$.uploadStarted(file, index);

			xhr.onload = function() {
			    if (xhr.responseText) {
				var now = new Date().getTime(),
				    timeDiff = now - start_time,
				    rsp = eval(xhr.responseText),
				    result = $$.uploadFinished(file, index, rsp, timeDiff);
					filesDone++;
					if (filesDone == files.length - filesRejected) {
						$$.afterAll();
					}
			    if (result === false) stop_loop = true;
			    }
			};
		}
	}

	function xDragEnter(e) {
		clearTimeout(doc_leave_timer);
		e.preventDefault();
		if (typeof $$.dragEnter == 'function') $$.dragEnter(e);
	}

	function xDragOver(e) {
		clearTimeout(doc_leave_timer);
		e.preventDefault();
		if (typeof docOver == 'function') docOver(e);
		if (typeof $$.dragOver == 'function') $$.dragOver(e);
	}

	function xDragLeave(e) {
		clearTimeout(doc_leave_timer);
		if (typeof $$.dragLeave == 'function') $$.dragLeave(e);
		e.stopPropagation();
	}

	function xDocDrop(e) {
		e.preventDefault();
		if (typeof $$.docLeave == 'function') $$.docLeave(e);
		return false;
	}

	function xDocEnter(e) {
		clearTimeout(doc_leave_timer);
		e.preventDefault();
		if (typeof $$.docEnter == 'function') $$.docEnter(e);
		return false;
	}

	function xDocOver(e) {
		clearTimeout(doc_leave_timer);
		e.preventDefault();
		if (typeof $$.docOver == 'function') $$.docOver(e);
		return false;
	}
	function xDocLeave(e) {
		clearTimeout(doc_leave_timer);
		e.preventDefault();
		if (typeof $$.docLeave == 'function') $$.docLeave(e);
		return false;
	}

})(jQuery);
