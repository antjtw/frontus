/* Load this script using conditional IE comments if you need to support IE 7 and IE 6. */

window.onload = function() {
	function addIcon(el, entity) {
		var html = el.innerHTML;
		el.innerHTML = '<span style="font-family: \'sharewave\'">' + entity + '</span>' + html;
	}
	var icons = {
			'icon-warning' : '&#xe000;',
			'icon-view' : '&#xe001;',
			'icon-arrow-down' : '&#xe002;',
			'icon-arrow-up' : '&#xe003;',
			'icon-arrow-right' : '&#xe004;',
			'icon-arrow-left' : '&#xe005;',
			'icon-doc2' : '&#xe006;',
			'icon-doc-download' : '&#xe007;',
			'icon-doc-upload' : '&#xe008;',
			'icon-doc' : '&#xe009;',
			'icon-profile' : '&#xe00a;',
			'icon-profile-pic' : '&#xe00b;',
			'icon-delete' : '&#xe00c;',
			'icon-pen' : '&#xe00d;',
			'icon-pencil' : '&#xe00e;',
			'icon-delete2' : '&#xe00f;',
			'icon-delete3' : '&#xe010;',
			'icon-cog' : '&#xe011;',
			'icon-pie' : '&#xe012;',
			'icon-circle-down' : '&#xe013;',
			'icon-circle-up' : '&#xe014;',
			'icon-circle-time' : '&#xe015;',
			'icon-circle-right' : '&#xe016;',
			'icon-circle-plus' : '&#xe017;',
			'icon-circle-left' : '&#xe018;',
			'icon-circle-download' : '&#xe019;',
			'icon-circle-upload' : '&#xe01a;',
			'icon-circle-delete' : '&#xe01b;',
			'icon-cicle-minus' : '&#xe01c;',
			'icon-untitled' : '&#xe01d;',
			'icon-magnify' : '&#xe01e;',
			'icon-lightening' : '&#xe01f;',
			'icon-star' : '&#xe020;',
			'icon-graph2' : '&#xe021;',
			'icon-graph1' : '&#xe022;',
			'icon-check' : '&#xe023;',
			'icon-email' : '&#xe024;',
			'icon-calendar' : '&#xe025;',
			'icon-key' : '&#xe026;',
			'icon-redo' : '&#xe027;',
			'icon-chat' : '&#xe028;',
			'icon-linkedin' : '&#xe029;',
			'icon-tweeter' : '&#xe02a;',
			'icon-giter' : '&#xe02b;',
			'icon-lock' : '&#xe02c;',
			'icon-unlocked' : '&#xe02d;'
		},
		els = document.getElementsByTagName('*'),
		i, attr, html, c, el;
	for (i = 0; ; i += 1) {
		el = els[i];
		if(!el) {
			break;
		}
		attr = el.getAttribute('data-icon');
		if (attr) {
			addIcon(el, attr);
		}
		c = el.className;
		c = c.match(/icon-[^\s'"]+/);
		if (c && icons[c[0]]) {
			addIcon(el, icons[c[0]]);
		}
	}
};