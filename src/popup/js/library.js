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
        this.STORAGEAREAKEY = 'webPageCanvas_snapshots';
        this.elements = {
            slideshow: document.getElementById('slideshow'),
            slideImage: document.getElementById('slide-image')
        };

        background.unseenSnapshots = 0;

        this.refreshSnapshots()
            .then(function() {
                this.refreshSlideshow();
            }.bind(this));
        this.attachHandlers();
        this.checkMemoryLimit();
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
    }

    /**
     * @method
     */
    checkMemoryLimit() {
        chrome.storage.local.get(background.memoryLimitExceededKey, function (items) {
            if (typeof items[background.memoryLimitExceededKey] !== 'undefined' && items[background.memoryLimitExceededKey]) {
                
            }
        });
    }

    /**
     * Retrieves the library slides from the chrome's storage area.
     * @returns {Promise} Resolving the slides if they exist, else rejecting.
     */
    getStorageSnapshots() {
        return new Promise(function (resolve, reject) {
            chrome.storage.local.get(this.STORAGEAREAKEY, function(items) {
                if (items[this.STORAGEAREAKEY] != null)
                    resolve(items[this.STORAGEAREAKEY]);
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
                }.bind(this));
        }.bind(this));
    }

    /**
     * @method Promise the local snapshots in chrome's local storage.
     */
    setSnapshots(snapshots) {
        return new Promise(function (resolve) {
            chrome.storage.local.set({
                [this.STORAGEAREAKEY]: snapshots
            }, function() {
                resolve();
            });
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
            this.elements.slideImage.src = this.b64ToBlobURL(this.snapshots[this.snapshots.length - 1]);
            this.elements.slideImage.dataset.storageIndex = this.snapshots.length - 1;
            currentScreenshotNumber.innerText = (this.snapshots.length - 1) == 0 ? 1 : this.snapshots.length;
            totalScreenshotNumber.innerText = this.snapshots.length;
        } else {
            this.elements.slideshow.className = 'empty';
            this.elements.slideImage.src = this.elements.slideImage.dataset.storageIndex = currentScreenshotNumber.innerText = totalScreenshotNumber.innerText = '';
            this.snapshots = [];
        }
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
     * @param {string} snapshotSrc 
     */
    addSnapshot(snapshotSrc) {
        return new Promise(function (resolve) {
            this.getStorageSnapshots()
                .then(function(snapshots) {
                    this.snapshots = snapshots.concat([snapshotSrc]);
                }.bind(this))
                .catch(function() {
                    this.snapshots = new Array(snapshotSrc);
                }.bind(this))
                .finally(function() {
                    this.setSnapshots(this.snapshots)
                        .then(function() {
                            this.refreshSlideshow();
                            resolve();
                        }.bind(this));
                }.bind(this));
        }.bind(this));
    }

    /**
     * Inserts a download, with the specified url as a target
     * @param {string} file The url of the file to be downloaded
     */
    insertDownload(file) {
        let date = new Date();

        chrome.downloads.download({
            url: file,
            filename: ('Web-Page-Drawing_' + date.getTime() + '.png'),
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
        slideImage.src = this.b64ToBlobURL(this.snapshots[newImageIndex]);
    }

    /**
     * @method string Converts an b64 uri to blob
     * @param {string} dataURL The original string.
     */
    b64ToBlobURL(dataURL) {
        // Decode the dataURL
        let binary = atob(dataURL.split(',')[1]);
        // Create 8-bit unsigned array
        let array = [];
        for (var i = 0; i < binary.length; i++) {
            array.push(binary.charCodeAt(i));
        }
        // Return our Blob object
        let blob = new Blob([new Uint8Array(array)], { type: 'image/png' });

        return URL.createObjectURL(blob);
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