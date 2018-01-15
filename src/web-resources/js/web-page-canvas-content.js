var canvasFrame = document.createElement('iframe');

var tabID, canvasImages = [], imagesLoaded = 0, snapshots = {};

var finalCanvas = {
	element: document.createElement('CANVAS')
};

finalCanvas.context = finalCanvas.element.getContext('2d')

var resetFinalCanvas = function() {
	finalCanvas.element = document.createElement('CANVAS');
	finalCanvas.context = finalCanvas.element.getContext('2d');
}
var getMaxHeight = function () {
	return Math.max(window.innerHeight, document.body.offsetHeight, document.body.scrollHeight, document.body.clientHeight, document.documentElement.offsetHeight, document.documentElement.clientHeight, document.documentElement.scrollHeight);
};

var getMaxWidth = function () {
	return Math.max(window.innerWidth, document.body.offsetWidth, document.body.scrollLeft)
};

var scrollToTop = function(delayMiliseconds) {
	setTimeout(function() {
		window.scrollTo(0, 0);
	}, delayMiliseconds);
};

var insertCanvas = function() {
	let htmlURL = chrome.runtime.getURL('/web-resources/html/web-page-canvas.html'),
		cssURL = chrome.runtime.getURL('/web-resources/css/web-page-canvas.css'),
		iconsURL = chrome.runtime.getURL('/icons/icons.css'),
		jsURL = chrome.runtime.getURL('/web-resources/js/web-page-canvas.js');

	let request = new XMLHttpRequest();

	request.onload = function() {
		switch(this.responseURL) {
			case htmlURL:
				document.body.innerHTML += this.responseText;
				break;
			case cssURL:
				let style = document.createElement('style');
				style.innerText = this.responseText;
				style.type = 'text/css';
				style.className = 'web-page-canvas';
				document.body.appendChild(style);
				break;
			case iconsURL:
				let iconsStyle = document.createElement('style');
				iconsStyle.innerText = this.responseText;
				iconsStyle.type = 'text/css';
				iconsStyle.className = 'web-page-canvas';
				document.body.appendChild(iconsStyle);
				break;
			case jsURL:
				let script = document.createElement('script');
				script.innerText = this.responseText;
				script.type = 'text/javascript';
				script.async = true;
				script.className = 'web-page-canvas';
				document.body.appendChild(script);
				break;
		}
	};

	request.open('GET', htmlURL);
	request.open('GET', cssURL);
	request.open('GET', iconsURL);
	request.open('GET', jsURL);
	request.send();

};

var saveCanvas = function() {

	resetFinalCanvas();
	window.scrollTo(0, 0);
	return new Promise((resolve, reject) => {
		chrome.runtime.sendMessage({
			message: 'take-snapshot',
			data: {
				windowHeight: window.innerHeight,
				pageHeight: getMaxHeight()
			}
		}, function(response) {
			if(response != null && response.hasOwnProperty('data')) {
				if(response.hasOwnProperty('error')) {
					reject(response.error);
				} else {
					resolve(response.data);
				}
			} else {
				reject();
			}
		});
	});

};

var loadImages = function(snapshots) {

	canvasImages = [];
	imagesLoaded = 0;

	return new Promise((resolve) => {
		snapshots = snapshots;

		for(let snapshot of snapshots) {
			let img = new Image();

			finalCanvas.element.width = getMaxWidth();
			finalCanvas.element.height = getMaxHeight();
			img.dataset.x = snapshot.x;
			img.dataset.y = snapshot.y;
			img.onload = function(img) {

				finalCanvas.context.drawImage(img, parseInt(img.dataset.x), parseInt(img.dataset.y));
				if(++imagesLoaded == snapshots.length) {
					resolve(finalCanvas.element.toDataURL('image/png'));
				}

			}.bind(null, img);

			img.src = snapshot.src;
			canvasImages.push(img);
		}
	});
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {

	if(request != null && request.hasOwnProperty('message')) {

		if(request.message == 'close-canvas') {
			canvasFrame.remove();
		} else if(request.message == 'save-canvas') {
			scrollToTop(0);
			saveCanvas().then(function(snapshots) {
				if(typeof snapshots == 'object') {
					loadImages(snapshots).then(function(finalImage) {

						canvasFrame.contentWindow.postMessage('reset-toolbar', canvasFrame.src);

						sendResponse({message: 'saved', data: finalImage});

					});
				}

				scrollToTop(1000);

			}).catch(function(error) {

				scrollToTop(1000);

			});
		} else if(request.message == 'scroll-top') {

			window.scrollTo(0, window.scrollY + window.innerHeight);
            sendResponse({message: 'Scrolled'});

		}

	} else if((request != null) && request.hasOwnProperty('message') && request.hasOwnProperty('data')) {

		if(request.message == 'highlight-selection') {



		}

	}

	return true;

});

insertCanvas();