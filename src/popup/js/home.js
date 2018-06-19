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
        document.querySelector(".title[data-action-id='open']").setAttribute('data-action-id', 'disabled');
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
     * @method void Handles all clicks to the switcher buttons
     * @param {HTMLElement} element 
     * @param {boolean} sendMessageToTab 
     */
    switcherClickHandler(element) {
        if (element.getAttribute('data-action-id') === 'open') {
            this.overlayOpen = true;
            this.insertContentScript();
        } else if (element.getAttribute('data-action-id') === 'close') {
            this.overlayOpen = false;
        
            // chrome.tabs.sendMessage(this.tab.id, { message: 'close-canvas' }, function(response) {

            //     if (response != null && response.hasOwnProperty('data') != null)
            //         this.lastCanvas = response.data;

            // }.bind(this));
        }
    
        this.storePopupObject();
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
        } catch(error) {
            console.error(error);
        }
        if (!background.isCanvasOpen[popup.tab.id] || background.isCanvasOpen[popup.tab.id] == null)
            popup.insertContentScript();
    });
};

chrome.runtime.onMessage.addListener(function(request) {
    if (request.hasOwnProperty('message') && request.hasOwnProperty('data')) {
        if (!request.message.localeCompare('update-snapshot-process'))
            popup.animateLoader(request.data);
        else if (!request.message.localeCompare('manually-closed-canvas')) {
            popup.switcherClickHandler.call(popup, document.getElementById('switcher'));
            popup.lastCanvas = request.data;
        }
    }
});