/* globals chrome, InvalidPageError */

var background = chrome.extension.getBackgroundPage(),
    patterns = {
        fileOrChrome: /^(?:file:\/\/|chrome:\/\/|chrome-extension:\/\/).+$/igm
    },
    popup;

/**
 * @class The main popup plugin class.
 * @prop {boolean} isCanvasOpen A flag of whether the webpage canvas is open.
 * @prop {Tab} tab The chrome's Tab object of the current tab.
 * @prop {boolean} isValidpage If the current webpage is proper for opening the extension.
 */
class Popup {

    /**
     * @constructor
     */
    constructor(tab) {
        this.isCanvasOpen = background.isCanvasOpen.hasOwnProperty(tab.id);
        this.tab = tab;

        this.checkNewSnapshots();
        if (!patterns.fileOrChrome.test(this.tab.url)) {
            this.isValidpage = true;
            this.attachHandlers();
        } else {
            this.isValidPage = false;
            this.disableMenu();
            throw new InvalidPageError('Cannot execute plug-in here');
        }
    }

    refreshPage() {
        this.attachHandlers();

        let switcher = document.querySelector("div.title:first-of-type");

        if (this.overlayOpen || background.isCanvasOpen[this.tab.id]) {
            switcher.setAttribute('data-action-id', 'close');
        } else {
            switcher.setAttribute('data-action-id', 'open');
        }
    }

    /**
     * @method void Attaches the popup event handlers
     */
    attachHandlers() {
        let switcher = document.querySelector("div.title:first-of-type");
        switcher.addEventListener('click', this.switcherClickHandler.bind(this, switcher));
    }

    /**
     * @method void
     */
    storePopupObject() {
        background.isCanvasOpen[this.tab.id] = this.overlayOpen;
    }

    /**
     * @method void Disables all the popup's menu buttons
     */
    disableMenu() {
        document.querySelector("div.title:first-of-type").setAttribute('data-action-id', 'disabled');
    }

    /**
     * @method
     */
    checkNewSnapshots() {
        if (background.unseenSnapshots > 0) {
            document.querySelector(".title[data-action-id='library']").setAttribute('data-new-snapshots', background.unseenSnapshots);
            document.querySelector(".title[data-action-id='library'] .fa-layers-counter").innerText = background.unseenSnapshots;
        }
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
     * @method Promise Inserts the content script in the current tab
     */
    insertContentScript() {
        return new Promise(function(resolve) {
            chrome.tabs.executeScript(this.tab.id, {file: 'content-scripts/web-page-canvas.js'}, function(result) {
                this.overlayOpen = true;
                this.storePopupObject();
                resolve(result);
            }.bind(this));
        }.bind(this));
    }

    /**
     * @method void
     * @param {HTMLElement} element 
     */
    restoreClickHandler(element) {
        if (this.lastCanvas != null)
            chrome.tabs.sendMessage(this.tab.id, { message: 'restore-canvas', data: this.lastCanvas });
        element.disabled = true;
    }

    /**
     * @method void
     */
    clearClickHandler() {
        if (this.overlayOpen) {
            chrome.tabs.sendMessage(this.tab.id, { message: 'clear-canvas' });
        }
    }

    /**
     * @method void
     * @param {HTMLElement} element 
     */
    screenshotActionClickHandler(element) {
        let slideshow = document.getElementById('slideshow'),
            slideImage = document.getElementById('slide-image');

        if (!slideshow.className && slideImage.src != null) {
            if (element.classList.contains('download-screenshot')) // download snapshot btn is clicked
                this.insertDownload(slideImage.src);
            else if (element.classList.contains('delete-screenshot')) { // delete snapshot btn is clicked
                this.deleteSnapshot(slideImage.dataset.storageIndex);
                this.refreshSnapshots()
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
        let currentImageIndex = parseInt(document.getElementById('slide-image')         .dataset.storageIndex),
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
     * @method void
     * @param {HTMLElement} element The tab container element
     */
    tabClickHandler(element) {
        if (!element.classList.contains('active')) {
            let id = element.dataset.panelId;

            document.querySelector('.tab-title.active').classList.remove('active');
            document.querySelector('.tab-content.active').classList.remove('active');

            element.classList.add('active');

            document.querySelector(".tab-content[data-panel-id='" + id + "']").classList.add('active');

            if (!id.localeCompare('library')) {
                this.refreshSnapshots()
                    .then(function() {
                        this.refreshSlideshow();
                    }.bind(this));
            }
                
            this.activePanel.id = id;
            this.activePanel.htmlId = id;
        }

        this.storePopupObject();
    }

    /**
     * @method void
     */
    clearScreenshotsClickHandler() {
        this.setSnapshots(null);
        this.snapshots = [];
        this.refreshSlideshow();

        this.storePopupObject();
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
    chrome.tabs.getSelected(null, function(tab) {
        try {
            popup = new Popup(tab);
            if (!background.isCanvasOpen[popup.tab.id] || background.isCanvasOpen[popup.tab.id] == null)
                popup.insertContentScript();
        } catch(error) {
            console.error(error);
        }
    });
};

chrome.runtime.onMessage.addListener(function(request) {
    if (request.hasOwnProperty('message') && request.hasOwnProperty('data')) {
        if (!request.message.localeCompare('manually-closed-canvas')) {
            popup.switcherClickHandler.call(popup, document.getElementById('switcher'));
            popup.lastCanvas = request.data;
        }
    }
});