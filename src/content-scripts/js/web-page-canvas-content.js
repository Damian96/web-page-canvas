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