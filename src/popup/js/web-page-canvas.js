/* globals chrome, InvalidPageError */

var background = chrome.extension.getBackgroundPage(),
    patterns = {
        fileOrChrome: /^(file:\/\/|chrome:\/\/|chrome-extension:\/\/).+$/igm,
        validPage: /\.(?:html|htm|php|asp)$/igm,
    },
    webPageCanvas;

/**
 * @class The main popup plugin class.
 * @prop {boolean} overlayOpen A flag of whether the webpage canvas is open.
 * @prop {Object.<string, number>} toolsOptions The object with all the information of all available tools.
 * @prop {Object.<string, number>} activeTool The object with all the information about the currently active tool.
 * @prop {Tab} tab The chrome's Tab object of the current tab.
 * @prop {boolean} isProperPage If the current webpage is proper for opening the extension.
 */
class webPageCanvasPopup {

    /**
     * @constructor
     */
    constructor(tab) {
        this.overlayOpen = false;
        this.activePanel = {
            id: 'library',
            htmlID: 'library'
        };
        this.tab = tab;
        this.localSnapshots = [];
        this.isProperPage = true;
        this.STORAGEAREAKEY = 'webPageCanvas_screenshots_array';

        if (patterns.validPage.test(this.tab.url) && !patterns.fileOrChrome.test(this.tab.url)) {
            this.attachHandlers();
            this.tabClickHandler.call(this, document.querySelector(".tab-title[data-panel-id='" + this.activePanel.htmlID + "']"));
        } else {
            webPageCanvas.isProperPage = false;
            webPageCanvas.disableMenu();
            throw new InvalidPageError('Cannot execute plug-in here');
        }
    }

    refresh(attributes) {
        for (let key in attributes) {
            this[key] = attributes[key];
        }
        this.attachHandlers();
        this.refreshPopup();
        this.getStorageSnapshots()
            .then(function() {
                this.refreshSlideshow();
            }.bind(this));
    }

    refreshPopup() {
        let switcher = document.getElementById('switcher');

        if (!this.activePanel.id.localeCompare('library'))
            this.tabClickHandler.call(this, document.querySelector(".tab-title.panel[data-panel-id='library']"));
        else if (!this.activePanel.id.localeCompare('options'))
            this.tabClickHandler.call(this, document.querySelector(".tab-title.panel[data-panel-id='options']"));

        if (this.overlayOpen) {

            switcher.classList.remove('off');
            switcher.classList.add('on');
            document.getElementById('save').disabled = false;

            if (this.lastCanvas != null)
                document.getElementById('restore').disabled = false;
        } else {

            switcher.classList.remove('on');
            switcher.classList.add('off');
            document.getElementById('save').disabled = true;

        }
    }

    /**
     * @method void
     */
    storePopupObject() {
        background.popupObjects[webPageCanvas.tabID] = this;
    }

    /**
     * Retrieves the library slides from the chrome's storage area.
     * @returns {Promise} Resolving the slides if they exist, else rejecting.
     */
    getStorageSnapshots() {
        return new Promise((resolve, reject) => function() {
            chrome.storage.local.get(this.STORAGEAREAKEY, function(items) {
                if (items[this.STORAGEAREAKEY] != null)
                    resolve(items[this.STORAGEAREAKEY]);
                else
                    reject();
            }.bind(this));
        });
    }

    /**
     * @method Promise Retrieves the chrome's storage area snapshots and stores them in the object.
     */
    refreshSnapshots() {
        return new Promise((resolve) => function() {
            this.getStorageSnapshots()
                .then(function(snapshots) {
                    this.localSnapshots = snapshots;
                    resolve();
                });
        });
    }

    /**
     * @method Promise the local snapshots in chrome's local storage.
     */
    setSnapshots(snapshots) {
        return new Promise((resolve) => function() {
            chrome.storage.local.set({
                [this.STORAGEAREAKEY]: snapshots
            }, function() {
                resolve();
            });
        });
    }

    /**
     * @method void Refreshes the snapshots slideshow
     */
    refreshSlideshow() {
        let slideshow = document.getElementById('slideshow'),
            slideImage = document.getElementById('slide-image'),
            currentScreenshotNumber = document.getElementById('current-screenshot-number'),
            totalScreenshotNumber = document.getElementById('total-screenshot-number');

        if (this.localSnapshots.length > 0) {
            slideshow.className = '';
            slideImage.src = this.b64ToBlobURL(this.localSnapshots[this.localSnapshots.length - 1]);
            slideImage.dataset.storageIndex = this.localSnapshots.length - 1;
            currentScreenshotNumber.innerText = (this.localSnapshots.length - 1) == 0 ? 1 : this.localSnapshots.length;
            totalScreenshotNumber.innerText = this.localSnapshots.length;
        } else {
            slideshow.className = 'empty';
            slideImage.src = slideImage.dataset.storageIndex = currentScreenshotNumber.innerText = totalScreenshotNumber.innerText = '';
            this.localSnapshots = {};
        }
    }

    /**
     * @method void Deletes the snapshot, with the specified index
     * @param {number} index The index
     */
    deleteSnapshot(index) {
        this.localSnapshots.splice(index, 1);
    }

    /**
     * @method void Attaches all the handlers to the document
     */
    attachHandlers() {
        let switcher = document.getElementById('switcher'),
            clearScreenshots = document.getElementById('clear-screenshots'),
            restore = document.getElementById('restore');

        document.getElementById('save').addEventListener('click', this.saveClickHandler.bind(this));
        switcher.addEventListener('click', this.switcherClickHandler.bind(this, switcher));
        clearScreenshots.addEventListener('click', this.clearScreenshotsClickHandler.bind(this, clearScreenshots));
        restore.addEventListener('click', this.restoreClickHandler.bind(this, restore));

        document.getElementById('about').onclick = function() {
            chrome.tabs.create({url: chrome.extension.getURL('about/about.html')});
        };

        for (let element of document.querySelectorAll('.tab-title')) {
            element.addEventListener('click', this.tabClickHandler.bind(this, element));
        }

        for (let element of document.querySelectorAll('.tab-content .color')) {
            element.addEventListener('click', this.colorClickHandler.bind(this, element));
        }

        for (let element of document.querySelectorAll('#slideshow > .screenshot-actions > div')) {
            element.addEventListener('click', this.screenshotActionClickHandler.bind(this, element));
        }

        for (let element of document.querySelectorAll('#slideshow > .screenshot-navigation > i')) {
            element.addEventListener('click', this.screenshotNavigationClickHandler.bind(this, element));
        }

        this.storePopupObject();
    }

    /**
     * @method void Disables all the popup's menu buttons
     */
    disableMenu() {
        for (let element of document.querySelectorAll('#switcher button')) {
            element.disabled = true;
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
     * @method void Handles all clicks to the switcher buttons
     * @param {HTMLElement} element 
     * @param {boolean} sendMessageToTab 
     */
    switcherClickHandler(element, sendMessageToTab = true) {

        if (element.classList.contains('off')) {

            this.overlayOpen = true;

            chrome.tabs.sendMessage(this.tabID, { message: 'init-canvas' });

            chrome.tabs.executeScript()

            element.classList.remove('off');
            element.classList.add('on');
            document.getElementById('save').disabled = false;

            if (this.lastCanvas != null)
                document.getElementById('restore').disabled = false;

        } else if (element.classList.contains('on')) {

            this.overlayOpen = false;

            if (sendMessageToTab) {

                chrome.tabs.sendMessage(this.tabID, { message: 'close-canvas' }, function(response) {

                    if (response != null && response.hasOwnProperty('data') != null)
                        this.lastCanvas = response.data;

                }.bind(this));

            }

            element.classList.remove('on');
            element.classList.add('off');
            document.getElementById('save').disabled = true;
            document.getElementById('restore').disabled = true;

        }

        this.storePopupObject();
    }

    /**
     * @method void
     * @param {HTMLElement} element 
     */
    restoreClickHandler(element) {
        if (this.lastCanvas != null)
            chrome.tabs.sendMessage(this.tabID, { message: 'restore-canvas', data: this.lastCanvas });
        element.disabled = true;
    }

    /**
     * @method void
     */
    clearClickHandler() {
        if (this.overlayOpen) {
            chrome.tabs.sendMessage(this.tabID, { message: 'clear-canvas' });
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
                newImageIndex = this.localSnapshots.length - 1;
            else
                newImageIndex = currentImageIndex - 1;
        } else {
            if ((currentImageIndex + 1) >= this.localSnapshots.length)
                newImageIndex = 0;
            else
                newImageIndex = currentImageIndex + 1;
        }

        slideImage.dataset.storageIndex = newImageIndex;
        currentScreenshotNumber.innerText = newImageIndex + 1;
        slideImage.src = this.b64ToBlobURL(this.localSnapshots[newImageIndex]);
    }


    /**
     * @method void
     */
    saveClickHandler() {
        this.tabClickHandler.call(this, document.querySelector(".tab-title[data-panel-id='library'"));

        chrome.tabs.sendMessage(this.tabID, { message: 'save-canvas' }, function(response) {

            if (response != null && response.hasOwnProperty('message') && response.hasOwnProperty('data') && !response.message.localeCompare('saved')) {
                this.addSnapshot(response.data);
            }

        }.bind(this));
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
        this.localSnapshots = {};
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
     * @method void
     * @param {string} snapshotSrc 
     */
    addSnapshot(snapshotSrc) {
        return new Promise((resolve) => {
            this.getStorageSnapshots()
                .then(function(snapshots) {
                    this.localSnapshots = snapshots.concat([snapshotSrc]);
                })
                .catch(function() {
                    this.localSnapshots = new Array(snapshotSrc);
                })
                .finally(function() {
                    this.setSnapshots(this.localSnapshots)
                        .then(function() {
                            this.refreshSlideshow();
                            resolve();
                        }.bind(this));
                });
        });
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
        if (background.popupObjects[tab.id] != null) { // popup object exists
            webPageCanvas = background.popupObjects[tab.id];
        } else { // popup object does not exist
            try {
                webPageCanvas = new webPageCanvasPopup(tab);
            } catch(error) {
                console.error(error);
            }
        }
    });
};

chrome.runtime.onMessage.addListener(function(request) {
    if (request == null) {
        return;
    }

    if (request.hasOwnProperty('message') && request.hasOwnProperty('data')) {

        if (!request.message.localeCompare('update-snapshot-process'))
            webPageCanvas.animateLoader(request.data);

    } else if (request.hasOwnProperty('message') && !request.message.localeCompare('manually-closed-canvas')) {
        webPageCanvas.switcherClickHandler.call(webPageCanvas, document.getElementById('switcher'));
    }
});