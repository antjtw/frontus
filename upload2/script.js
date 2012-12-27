jQuery(function(){
	
	var dropbox = jQuery('#dropbox'),
		message = jQuery('.message', dropbox);
	
	dropbox.filedrop( {
	    uploadFinished: function(file, i, response) {
			jQuery.data(file).addClass('done');
			jQuery.data(file).find(".uploaded").text(response);
			// response is the JSON object that post_file.php returns
		},
		progressUpdated: function( file, i, progress) {
			jQuery.data(file).find('.progress').width(progress);
		},
		url: '/fileUpload',
	// beforeEach can get called with each file, and returns false to abort
	    uploadStarted : (function(file, i) {
		    createImage(file); // this creates the mapping for jQuery.data
	        jQuery.data(file).find(".uploaded").text("starting upload for "+file.name+"; expecting "+file.size+" bytes");
        })
	}  );
	
	var template = '<div class="preview">'+
						'<span class="imageHolder">'+
							'<img />'+
							'<span class="uploaded"></span>'+
						'</span>'+
						'<div class="progressHolder">'+
							'<div class="progress"></div>'+
						'</div>'+
					'</div>'; 
	
	
	// this can be zapped
	function createImage(file){

		var preview = jQuery(template), 
			image = jQuery('img', preview);
			
		/*var reader = new FileReader();
		
		image.width = 100;
		image.height = 100;
		
		reader.onload = function(e){
			
			// e.target.result holds the DataURL which
			// can be used as a source of the image:
			
			image.attr('src',e.target.result);
		};
		
		// Reading the file as a DataURL. When finished,
		// this will trigger the onload function above:
		reader.readAsDataURL(file);
		*/
		
		message.hide();
		preview.appendTo(dropbox);
		
		// Associating a preview container
		// with the file, using jQuery's $.data():
		
		jQuery.data(file,preview);
	}

	function showMessage(msg){
		message.html(msg);
	}

});