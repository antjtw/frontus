jQuery(function(){

	var dropbox = jQuery('#dropbox'),
		message = jQuery('.message', dropbox);
		dragTarget = null;

	dropbox.filedrop( {
		dragEnter: function(e) {
			console.log(e.type);
			console.log(e.target);
			dragTarget = e.target;
			var il = e.dataTransfer.items.length;
			message.text("Files to be uploaded: "+il);
		},
		dragLeave: function(e) {
			console.log(e.type);
			console.log(e.target);
			if (e.target == dragTarget) {
				message.text("Drop files to be uploaded here...");
			}
		},
	    uploadFinished: function(file, i, response) {
			jQuery.data(file).addClass('done');
			jQuery.data(file).find(".uploaded").text(response);
			// response is the JSON object that post_file.php returns
			message.text("Upload complete.<br>Drop files to be uploaded here...");
		},
		progressUpdated: function( file, i, progress) {
			jQuery.data(file).find('.progress').width(progress);
		},
		url: '/fileUpload/',
	// beforeEach can get called with each file, and returns false to abort
	    uploadStarted : (function(file, i) {
		    createImage(file); // this creates the mapping for jQuery.data
	        jQuery.data(file).find(".uploaded").text("starting upload for "+file.name+"; expecting "+file.size+" bytes");
        })
	}  );

	// this can be zapped
	function createImage(file){
		var template=jQuery("#dropbox>div.preview");
		message.text("Uploading....");
		var preview = template.clone();
		preview.appendTo(dropbox);
		preview.show();

		// Associating a preview container
		// with the file, using jQuery's $.data():

		jQuery.data(file,preview);
	}

	function showMessage(msg){
		message.html(msg);
	}

});