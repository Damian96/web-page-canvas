/* globals chrome */

var library,
	background = chrome.extension.getBackgroundPage();

/**
 * @class The library plugin page class
 * @prop {Array} snapshots The snapshots saved
 * @constant {string} STORAGEAREAKEY The unique chrome's storage array key
 * @prop
 */
class Library {

	/**
	 * @constructor
	 */
	constructor() {
		this.snapshots = [];
		this.storageKeys = {
			snapshots: 'webPageCanvas_snapshots',
			options: 'webPageCanvas_options'
		};
		this.elements = {
			slideshow: document.getElementById('slideshow'),
			slideImage: document.getElementById('slide-image')
		};

		background.unseenSnapshots = 0;

		if (window.location.search.includes('save=1') && window.location.search.includes('tabID=')) {
			let offset = window.location.search.indexOf('tabID=') + 6;
			let tabID = window.location.search.substr(offset, window.location.search.length - offset);
			this.save(tabID);
		} else {
			this.refreshSnapshots()
			.then(function() {
				this.refreshSlideshow();
			}.bind(this));
		}
		this.checkMemoryLimit();
		this.attachHandlers();
	}

	/**
	 * @method void Attaches all the handlers to the document
	 */
	attachHandlers() {
		for (let element of document.querySelectorAll('#slideshow > .screenshot-actions > div')) { // screenshot actions
			element.addEventListener('click', this.screenshotActionClickHandler.bind(this, element));
		}

		for (let element of document.querySelectorAll('#slideshow > .screenshot-navigation > i')) { // screenshot navigation
			element.addEventListener('click', this.screenshotNavigationClickHandler.bind(this, element));
		}

		document.querySelector("#memory-limit > i.fa-exclamation-circle").addEventListener('click', function () {
			window.open(chrome.extension.getURL('/web-resources/html/options.html'));
		});
	}

	/**
	 * @method Promise
	 * @returns {string}
	 */
	getStorageMBytes() {
		return new Promise(function (resolve) {
			chrome.storage.local.getBytesInUse(null, function(bytes) {
				resolve(parseFloat(bytes / 1000000).toFixed(1));
			});
		});
	}

	/**
	 * @method void
	 * @returns {null}
	 */
	checkMemoryLimit() {
		this.getStorageMBytes()
			.then(function(mb) {
				document.querySelector("#total-memory").innerText = mb;
				this.getMaxStorageOption()
					.then(function (max) {
						if (mb > max) {
							document.querySelector("#memory-limit").dataset.warning = "1";
						}
					})
					.catch((error) => {
						console.log(error);
					});
			}.bind(this));
	}

	/**
	 * @method Promise Retrieves the options from chrome's storage area
	 * @returns {number}
	 */
	getMaxStorageOption() {
		return new Promise(function (resolve, reject) {
			chrome.storage.local.get(this.storageKeys.options, function (items) {
				if ((typeof items[this.storageKeys.options]) !== 'string')
					reject("Error while retrieving plug-in options");
				else {
					let options = JSON.parse(items[this.storageKeys.options]);
					resolve(parseInt(options.maxStorage));
				}
			}.bind(this));
		}.bind(this));
	}

	/**
	 * Retrieves the library slides from the chrome's storage area.
	 * @returns {Promise} Resolving the slides if they exist, else rejecting.
	 */
	getStorageSnapshots() {
		return new Promise(function (resolve, reject) {
			chrome.storage.local.get(this.storageKeys.snapshots, function(items) {
				if (items[this.storageKeys.snapshots].constructor === Array)
					resolve(items[this.storageKeys.snapshots]);
				else
					reject();
			}.bind(this));
		}.bind(this));
	}

	/**
	 * @method Promise Retrieves the chrome's storage area snapshots and stores them in the object.
	 */
	refreshSnapshots() {
		return new Promise(function (resolve) {
			this.getStorageSnapshots()
				.then(function(snapshots) {
					this.snapshots = snapshots;
					resolve();
				}.bind(this))
				.catch((error) => {
					console.log(error);
				});
		}.bind(this));
	}

	/**
	 * @method Promise the local snapshots in chrome's local storage.
	 */
	setSnapshots(snapshots) {
		return new Promise(function (resolve) {
			chrome.storage.local.set({
				[this.storageKeys.snapshots]: snapshots
			}, function() {
				this.snapshots = snapshots;
				resolve();
			}.bind(this));
		}.bind(this));
	}

	/**
	 * @method void Refreshes the snapshots slideshow
	 */
	refreshSlideshow() {
		let currentScreenshotNumber = document.getElementById('current-screenshot-number'),
			totalScreenshotNumber = document.getElementById('total-screenshot-number');

		if (this.snapshots.length > 0) {
			this.elements.slideshow.className = '';
			this.setSlideImage(this.snapshots.length - 1);
			this.elements.slideImage.dataset.storageIndex = this.snapshots.length - 1;
			currentScreenshotNumber.innerText = (this.snapshots.length - 1) == 0 ? 1 : this.snapshots.length;
			totalScreenshotNumber.innerText = this.snapshots.length;
		} else {
			this.elements.slideshow.className = 'empty';
			this.elements.slideImage.src = this.elements.slideImage.dataset.storageIndex = currentScreenshotNumber.innerText = totalScreenshotNumber.innerText = '';
			this.snapshots = [];
		}
	}
	
	setSlideImage(index) {
		if (this.snapshots[index] == null) {
			return;
		}
		this.elements.slideImage.src = this.snapshots[index];
	}

	/**
	 * @method void Deletes the snapshot, with the specified index
	 * @param {number} index The index
	 */
	deleteSnapshot(index) {
		return new Promise(function(resolve) {
			this.snapshots.splice(index, 1);
			this.setSnapshots(this.snapshots)
				.then(function() {
					resolve();
				});
		}.bind(this));
	}
	
	/**
	 * @method void
	 * @param {HTMLCanvasElement} snapshot 
	 */
	addSnapshot(snapshot) {
		return new Promise(function (resolve) {
			this.getStorageSnapshots()
				.then(function(snapshots) {
					this.setSnapshots(snapshots.concat([snapshot]))
						.then(function() {
							this.refreshSlideshow();
							resolve();
						}.bind(this));
				}.bind(this))
				.catch(function() {
					this.setSnapshots([snapshot])
						.then(function() {
							this.refreshSlideshow();
							resolve();
						}.bind(this));
				}.bind(this));
		}.bind(this));
	}

	/**
	 * @method void Inserts a download, with the specified url as a target
	 * @param {string} file The url of the file to be downloaded
	 */
	insertDownload(file) {
		let date = new Date();

		chrome.downloads.download({
			url: file,
			filename: ('Web-Page-Drawing_' + date.getTime() + '.webp'),
			saveAs: true
		});
	}

	/**
	 * @method void
	 * @param {HTMLElement} element 
	 */
	screenshotActionClickHandler(element) {

		if (!this.elements.slideshow.className && this.elements.slideImage.src != null) {
			if (element.classList.contains('download-screenshot')) // download snapshot btn is clicked
				this.insertDownload(this.elements.slideImage.src);
			else if (element.classList.contains('delete-screenshot')) { // delete snapshot btn is clicked
				this.deleteSnapshot(this.elements.slideImage.dataset.storageIndex)
					.then(function() {
						this.refreshSlideshow();
					}.bind(this));
			}
		}
	}

	/**
	 * @method void
	 * @param {HTMLElement} element 
	 */
	screenshotNavigationClickHandler(element) {
		let currentImageIndex = parseInt(document.getElementById('slide-image')             .dataset.storageIndex),
			slideImage = document.getElementById('slide-image'),
			currentScreenshotNumber = document.getElementById('current-screenshot-number'),
			newImageIndex;

		if (!element.title.localeCompare('Previous')) {
			if ((currentImageIndex - 1) < 0)
				newImageIndex = this.snapshots.length - 1;
			else
				newImageIndex = currentImageIndex - 1;
		} else {
			if ((currentImageIndex + 1) >= this.snapshots.length)
				newImageIndex = 0;
			else
				newImageIndex = currentImageIndex + 1;
		}

		slideImage.dataset.storageIndex = newImageIndex;
		currentScreenshotNumber.innerText = newImageIndex + 1;
		slideImage.src = this.setSlideImage(newImageIndex);
	}

	/**
	 * @method void
	 * @param {number} tabID
	 */
	save(tabID) {
		document.getElementById('slideshow').className = 'loading';
		chrome.tabs.sendMessage(parseInt(tabID), {message: 'save-canvas'}, null, function (response) {
			if (response != null && response.hasOwnProperty('message') && response.message === 'saved') {
				this.addSnapshot(response.data);
			}
			return true;
		}.bind(this));
	}

	/**
	 * @method void
	 * @param {number} targetW The target width percentage at which to animate the loader.
	 */
	animateLoader(targetW) {
		let slideshow = document.getElementById('slideshow'),
			loader = document.getElementById('passed-bar'),
			percent = document.getElementById('loader-percent');

		if (!slideshow.classList.contains('loading')) {
			slideshow.className = 'loading';
		}
		if (targetW >= 100) {
			loader.style.width = '100%';
			percent.innerHTML = '100';
		} else {
			loader.style.width = targetW + '%';
			percent.innerHTML = parseInt(targetW);
		}
	}
}

window.onload = function() {
	library = new Library();
};

chrome.runtime.onMessage.addListener(function(request) {
	if (request.hasOwnProperty('message') && request.hasOwnProperty('data')) {
		if (!request.message.localeCompare('update-snapshot-process'))
			library.animateLoader(request.data);
	}
});