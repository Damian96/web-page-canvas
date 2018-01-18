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
	canvasFrame.width = getMaxWidth();
	canvasFrame.height = getMaxHeight();
	canvasFrame.style.cssText = 'border: none; position: absolute; z-index: 123400000; top: 0; left: 0; min-width: 100%; min-height: 100%;';
	document.body.style.overflowX = 'hidden';
	canvasFrame.onload = window.onresize = function() {
		canvasFrame.contentWindow.postMessage({message: 'set-window-height', data: window.innerHeight}, canvasFrame.src);
	};
	window.onscroll = function() {
		canvasFrame.contentWindow.postMessage({message: 'set-window-scroll', data: window.scrollY}, canvasFrame.src);
	};
	canvasFrame.src = chrome.runtime.getURL('/web-resources/html/web-page-canvas.html');
	document.body.appendChild(canvasFrame);
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