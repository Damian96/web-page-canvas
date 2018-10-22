(function() {
	'use strict';

	function getMaxHeight() {
		return Math.max(document.documentElement.clientHeight, document.body.scrollHeight, document.documentElement.scrollHeight, document.body.offsetHeight, document.documentElement.offsetHeight);
	}

	function getMaxWidth() {
		return Math.max(document.documentElement.clientWidth, document.body.scrollWidth, document.documentElement.scrollWidth, document.body.offsetWidth, document.documentElement.offsetWidth);
	}

	let frame		= document.createElement('IFRAME');
	frame.src   	= chrome.extension.getURL('/web-resources/html/web-page-canvas.html');
	frame.width 	= getMaxWidth();
	frame.height 	= getMaxHeight();
	document.body.appendChild(frame);
}());