/* globals chrome */

var background = chrome.extension.getBackgroundPage(),
    webPageCanvas;

/**
 * @class
 * @classdesc The main popup plugin class.
 * @prop {boolean} overlayOpen A flag of whether the webpage canvas is open.
 * @prop {Object.<string, number>} toolsOptions The object with all the information of all available tools.
 * @prop {Object.<string, number>} activeTool The object with all the information about the currently active tool.
 * @prop {number} tabID The chrome ID of the current tab.
 * @prop {boolean} isProperPage If the current webpage is proper for opening the extension.
 */
class webPageCanvasPopup {

    /**
     * @constructor
     */
    constructor() {
        this.overlayOpen = false;
        this.activePanel = {
            id: 'library',
            htmlID: 'library'
        };
        this.localSnapshots = [];
        this.isProperPage = true;
        this.scriptInserted = false;
        this.STORAGEAREAKEY = 'webPageCanvas_screenshots_array';
    }

    init() {

        this.attachHandlers();
        this.tabClickHandler.call(this, document.querySelector(".tab-title[data-panel-id='library']"));
        this.updateSlideshow();

        if(!this.isProperPage) {
            document.querySelector('#switcher button.on').disabled = true;
        }
    }

    reload(attributes) {
        for(let key in attributes) {
            this[key] = attributes[key];
        }
        this.attachHandlers();
        this.reloadValues();
        this.updateSlideshow();
    }

    reloadValues() {

        let switcher = document.getElementById('switcher');

        if(this.activePanel.id == 'library')
            this.tabClickHandler.call(this, document.querySelector(".tab-title.panel[data-panel-id='library']"));
        else if(this.activePanel.id == 'options')
            this.tabClickHandler.call(this, document.querySelector(".tab-title.panel[data-panel-id='options']"));

        if(this.overlayOpen) {

            switcher.classList.remove('off');
            switcher.classList.add('on');
            document.getElementById('save').disabled = false;

            if(this.lastCanvas != null)
                document.getElementById('restore').disabled = false;
        } else {

            switcher.classList.remove('on');
            switcher.classList.add('off');
            document.getElementById('save').disabled = true;

        }

    }

    updateSlideshow() {

        chrome.storage.local.get(this.STORAGEAREAKEY, function(items) {

            if(items[this.STORAGEAREAKEY] != null && items[this.STORAGEAREAKEY].length > this.localSnapshots.length) {

                this.localSnapshots =  items[this.STORAGEAREAKEY];
                this.reloadSlideshowWithLocalSnapshots();

            } else if(this.localSnapshots.length > 0) {
                this.reloadSlideshowWithLocalSnapshots();
                chrome.storage.local.set({[this.STORAGEAREAKEY]: this.localSnapshots});
            } else {
                this.clearSlideshow();
            }

            if(this.localSnapshots.length == null)
                document.getElementById('clear-screenshots').disabled = true;
            else
                document.getElementById('clear-screenshots').disabled = false;

        }.bind(this));

    }

    reloadSlideshowWithLocalSnapshots() {

        let slideshow = document.getElementById('slideshow'),
            slideImage = document.getElementById('slide-image'),
            currentScreenshotNumber = document.getElementById('current-screenshot-number'),
            totalScreenshotNumber = document.getElementById('total-screenshot-number');

        slideshow.className = '';
        slideImage.src = this.b64ToBlobURL(this.localSnapshots[this.localSnapshots.length - 1]);
        slideImage.dataset.storageIndex = this.localSnapshots.length - 1;
        currentScreenshotNumber.innerText = (this.localSnapshots.length - 1) == 0 ? 1 : this.localSnapshots.length;
        totalScreenshotNumber.innerText = this.localSnapshots.length;

    }

    clearSlideshow() {

        let slideshow = document.getElementById('slideshow'),
            slideImage = document.getElementById('slide-image'),
            currentScreenshotNumber = document.getElementById('current-screenshot-number'),
            totalScreenshotNumber = document.getElementById('total-screenshot-number');

        slideshow.className = 'empty';
        slideImage.src = slideImage.dataset.storageIndex = currentScreenshotNumber.innerText = totalScreenshotNumber.innerText = '';
        this.localSnapshots = {};

    }

    attachHandlers() {

        let switcher = document.getElementById('switcher'),
            clearScreenshots = document.getElementById('clear-screenshots'),
            restore = document.getElementById('restore');

        document.getElementById('save').addEventListener('click', this.saveClickHandler.bind(this));
        switcher.addEventListener('click', this.switcherClickHandler.bind(this, switcher));
        clearScreenshots.addEventListener('click', this.clearScreenshotsClickHandler.bind(this, clearScreenshots));
        restore.addEventListener('click', this.restoreClickHandler.bind(this, restore));

        for(let element of document.querySelectorAll('.tab-title')) {
            element.addEventListener('click', this.tabClickHandler.bind(this, element));
        }

        for(let element of document.querySelectorAll('.tab-content .color')) {
            element.addEventListener('click', this.colorClickHandler.bind(this, element));
        }

        for(let element of document.querySelectorAll('#slideshow > .screenshot-actions > div')) {
            element.addEventListener('click', this.screenshotActionClickHandler.bind(this, element));
        }

        for(let element of document.querySelectorAll('#slideshow > .screenshot-navigation > i')) {
            element.addEventListener('click', this.screenshotNavigationClickHandler.bind(this, element));
        }
    }

    disableMenu() {
        for(let element of document.querySelectorAll('#switcher button')) {
            element.disabled = true;
        }
    }

    insertDownload(file) {
        let date = new Date();

        chrome.downloads.download({
            url: file,
            filename: ('Web-Page-Drawing_' + date.getTime() + '.png'),
            saveAs: true
        });

    }

    switcherClickHandler(element, sendMessageToTab = true) {

        if(element.classList.contains('off')) {

            this.overlayOpen = true;

            chrome.tabs.sendMessage(this.tabID, {message: 'init-canvas'});

            element.classList.remove('off');
            element.classList.add('on');
            document.getElementById('save').disabled = false;

            if(this.lastCanvas != null)
                document.getElementById('restore').disabled = false;

        } else if(element.classList.contains('on')) {

            this.overlayOpen = false;

            if(sendMessageToTab) {

                chrome.tabs.sendMessage(this.tabID, { message: 'close-canvas' }, function(response) {

                    if(response != null && response.hasOwnProperty('data') != null)
                        this.lastCanvas = response.data;

                }.bind(this));

            }

            element.classList.remove('on');
            element.classList.add('off');
            document.getElementById('save').disabled = true;
            document.getElementById('restore').disabled = true;

        }


    }

    restoreClickHandler(element) {
        if(this.lastCanvas != null)
            chrome.tabs.sendMessage(this.tabID, {message: 'restore-canvas', data: this.lastCanvas});
            element.disabled = true;
    }

    clearClickHandler() {
        if(this.overlayOpen) {
            chrome.tabs.sendMessage(this.tabID, {message: 'clear-canvas'});
        }
    }

    screenshotActionClickHandler(element) {

        let slideshow = document.getElementById('slideshow'),
            slideImage = document.getElementById('slide-image');

        if(slideshow.className == '' && slideImage.src != null) {
            if(element.classList.contains('download-screenshot'))
                this.insertDownload(slideImage.src);
            else if(element.classList.contains('delete-screenshot')) {
                chrome.storage.local.get(this.STORAGEAREAKEY, function(slideImage, slideshow, items) {

                    let data = items[this.STORAGEAREAKEY];

                    if(typeof data == 'object' && data.length > 0) {

                        data.splice(slideImage.dataset.storageIndex, 1);

                        if(data.length > 0) {

                            this.localSnapshots = data;
                            this.reloadSlideshowWithLocalSnapshots();

                        } else {

                            this.clearSlideshow();

                        }

                        chrome.storage.local.set({ [this.STORAGEAREAKEY]: data });

                    }

                }.bind(this, slideImage, slideshow));
            }
        }

    }

    screenshotNavigationClickHandler(element) {

        let currentImageIndex = parseInt(document.getElementById('slide-image').dataset.storageIndex),
            slideImage = document.getElementById('slide-image'),
            currentScreenshotNumber = document.getElementById('current-screenshot-number'),
            newImageIndex;

        if(element.title == 'Previous') {
            if((currentImageIndex - 1) < 0)
                newImageIndex = this.localSnapshots.length - 1;
            else
                newImageIndex = currentImageIndex - 1;

        } else {

            if((currentImageIndex + 1) >= this.localSnapshots.length)
                newImageIndex = 0;
            else
                newImageIndex = currentImageIndex + 1;

        }

        slideImage.dataset.storageIndex = newImageIndex;
        currentScreenshotNumber.innerText = newImageIndex + 1;
        slideImage.src = this.b64ToBlobURL(this.localSnapshots[newImageIndex]);
    }

    saveClickHandler() {

        this.tabClickHandler.call(this, document.querySelector(".tab-title[data-panel-id='library'"));

        chrome.tabs.sendMessage(this.tabID, {message: 'save-canvas'}, function(response) {

            if(response != null && response.hasOwnProperty('message') && response.hasOwnProperty('data') && (response.message == 'saved')) {

                this.insertImage(response.data).then(function() {

                    this.updateSlideshow();

                }.bind(this));

            }

        }.bind(this));

    }

    tabClickHandler(element) {

        if(!element.classList.contains('active')) {

            document.querySelector('.tab-title.active').classList.remove('active');
            document.querySelector('.tab-content.active').classList.remove('active');

            element.classList.add('active');

            let id = element.dataset.panelId;

            document.querySelector(".tab-content[data-panel-id='" + id + "']").classList.add('active');

            if(id == 'library') {

                if(this.localSnapshots.length > 0)
                    this.reloadSlideshowWithLocalSnapshots();
                else
                    this.clearSlideshow();

            }

            this.activePanel.id = id;
            this.activePanel.htmlId = id;
        }

    }

    clearScreenshotsClickHandler() {

        if(this.localSnapshots.length > 0) {

            chrome.storage.local.set({[this.STORAGEAREAKEY]: null});
            this.localSnapshots = {};
            this.reloadSlideshowWithLocalSnapshots();

        }

    }

    changeActiveTool(newId) {
        let id = this.changeToCamelCase(newId);
        this.activeTool = {
            id: id,
            htmlId: id == 'paintBrush' ? 'paint-brush' : id,
            options: this.toolsOptions[id]
        };
        this.updatePageActiveTool();
    }

    updatePageActiveTool() {
        chrome.tabs.sendMessage(this.tabID, {
            message: 'update-info',
            data: {
                tool: this.activeTool,
                tabID: this.tabID
            }
        });
    }

    colorClickHandler(element) {

        if(element.classList.contains('color') && !element.classList.contains('active')) {

            let tabContent = element.parentElement.parentElement,
                toolId = tabContent.dataset.toolId,
                colorName = element.title.toLowerCase();

            this.disableAllColors(toolId);
            element.classList.add('active');

            if(toolId == 'paint-brush') {
                this.toolsOptions.paintBrush.color = element.dataset.colorCode;
            }

            tabContent.dataset.toolColor = colorName;
            document.querySelector(".tab-title[data-tool-id='" + toolId + "']").dataset.toolColor = colorName;
            this.changeActiveTool(toolId);

        }

    }

    sizeHandler(element) {
        let toolId = element.dataset.toolId,
            value = parseFloat(element.value);
        element.nextElementSibling.innerHTML = value + 'px';
        if(toolId == 'paint-brush')
            this.toolsOptions.paintBrush.size = value;
        else if(toolId == 'eraser')
            this.toolsOptions.eraser.size = value;
        this.changeActiveTool(toolId);
    }

    disableAllColors(toolId) {
        for(let element of document.querySelectorAll(".tab-content[data-tool-id='" + toolId + "']" + " .color.active")) {
            element.classList.remove('active');
        }
    }

    /**
     * @param {string} string
     * @description Changes the given string to a camel case string by removing the hyphens between.
     */
    changeToCamelCase(string) {
        let hyphenIndex = string.includes('-');
        if(hyphenIndex) {
            let strParts = string.split('-');
            return strParts[0] + strParts[1].charAt(0).toUpperCase() + strParts[1].substr(1, strParts[1].length);
        }
        return string;
    }

    /**
     * @param {number} targetW The target width percentage at which to animate the loader.
     */
    animateLoader(targetW) {

        let slideshow = document.getElementById('slideshow'),
            loader = document.getElementById('passed-bar'),
            percent = document.getElementById('loader-percent');

        if(!slideshow.classList.contains('loading')) {

            slideshow.className = 'loading';

        }
        if(targetW >= 100) {

            loader.style.width = '100%';
            percent.innerHTML = '100';

        } else {

            loader.style.width = targetW + '%';
            percent.innerHTML = parseInt(targetW);

        }

    }

    insertImage(newImageSrc) {
        return new Promise((resolve) => {
            chrome.storage.local.get(this.STORAGEAREAKEY, function(newImageSrc, items) {
                if(items[this.STORAGEAREAKEY] != null) {
                    this.localSnapshots = items[this.STORAGEAREAKEY].concat([newImageSrc]);
                } else {
                    this.localSnapshots = new Array(newImageSrc);
                }
                let imageBlobURL = this.b64ToBlobURL(newImageSrc);

                chrome.storage.local.set({ [this.STORAGEAREAKEY]:  this.localSnapshots }, function(imageBlobURL) {

                    let slideImage = document.getElementById('slide-image'),
                        currentScreenshotNumber = document.getElementById('current-screenshot-number'),
                        totalScreenshotNumber = document.getElementById('total-screenshot-number');

                    slideImage.src = imageBlobURL;
                    slideImage.dataset.storageIndex = this.localSnapshots.length - 1;
                    currentScreenshotNumber.innerText = (this.localSnapshots.length - 1) == 0 ? 1 : this.localSnapshots.length;
                    totalScreenshotNumber.innerText = this.localSnapshots.length;

                    resolve('success');
                }.bind(this, imageBlobURL));

            }.bind(this, newImageSrc));
        });
    }

    /**
     * Converts an b64 uri to blob
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

webPageCanvas = new webPageCanvasPopup();

window.onunload = function() {
    background.popupObjects[webPageCanvas.tabID] = webPageCanvas;
};

window.onload = function() {

    chrome.tabs.getSelected(null, function(tab) {
        webPageCanvas.tabID = tab.id;

        if(tab.url.includes('file:///') || tab.url.includes('chrome://') || tab.url.includes('chrome-extension://') || tab.url.includes('.pdf')) {
            webPageCanvas.isProperPage = false;
            webPageCanvas.disableMenu();
            webPageCanvas.init();
        } else {
            chrome.runtime.sendMessage({
                message: 'init-object',
                tabID: webPageCanvas.tabID
            }, function(response) {

                if(response != null && response.hasOwnProperty('message')) {

                    if(response.message == 'do-it-yourself') {

                        webPageCanvas.init();

                    } else if(response.message == 'sending-popup-object-data' && response.hasOwnProperty('data')) {

                        webPageCanvas.reload(response.data);

                    }
                }

            });
        }

    });

};

chrome.runtime.onMessage.addListener(function(request) {

    if(request == null) {
        return;
    }

    if(request.hasOwnProperty('message') && request.hasOwnProperty('data')) {

        if(request.message == 'update-snapshot-process')
            webPageCanvas.animateLoader(request.data);

    } else if(request.hasOwnProperty('message') && request.message == 'manually-closed-canvas') {
        webPageCanvas.switcherClickHandler.call(webPageCanvas, document.getElementById('switcher'));
    }


});