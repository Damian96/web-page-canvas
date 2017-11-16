/* globals chrome */

var background = chrome.extension.getBackgroundPage(),
    webPageAnnotator;

/**
 * @class
 * @classdesc The main popup plugin class.
 * @prop {boolean} overlayOpen A flag of whether the webpage canvas is open.
 * @prop {Object.<string, number>} toolsOptions The object with all the information of all available tools.
 * @prop {Object.<string, number>} activeTool The object with all the information about the currently active tool.
 * @prop {number} tabID The chrome ID of the current tab.
 */
class WebPageAnotatorPopup {

    /**
     * @constructor
     */
    constructor() {
        this.overlayOpen = false;
        this.toolsOptions = {
            paintBrush: {
                color: '#FFFF00',
                defaultColor: '#FFFF00',
                size: 5
            },
            eraser: {
                size: 5
            }
        };
        this.activeTool = {
            id: 'paintBrush',
            htmlId: 'paint-brush',
            options: this.toolsOptions.paintBrush
        };
        this.activePanel = {
            id: 'none',
            htmlId: 'none'
        };
        this.localSnapshots = [];
        this.STORAGEAREAKEY = 'canvasdrawer_screenshots_array';
    }

    init() {
        this.attachHandlers();
    }

    reload(attributes) {
        for(let key in attributes) {
            this[key] = attributes[key];
        }
        this.attachHandlers();
        this.reloadValues();
    }

    reloadValues() {
        let switcher = document.getElementById('switcher'),
            dataSelector = "[data-tool-id='" + this.activeTool.htmlId + "']",
            toolElement = document.querySelector(".tab-title" + dataSelector);
        if(this.overlayOpen) {
            switcher.classList.remove('off');
            switcher.classList.add('on');
            document.getElementById('save').disabled = false;
        } else {
            switcher.classList.remove('on');
            switcher.classList.add('off');
            document.getElementById('save').disabled = true;
        }
        this.tabClickHanndler(toolElement);
        if(this.activeTool.id == 'paintBrush' && this.activePanel.id == 'none') {
            let colorElement = document.querySelector(".tab-content" + dataSelector + " .color[data-color-code='" + this.toolsOptions.paintBrush.color + "']"),
                sizeElement = document.querySelector(".tab-content" + dataSelector + " .size-range");

            sizeElement.value = this.toolsOptions.paintBrush.size;
            this.colorClickHandler(colorElement);
            this.sizeHandler(sizeElement);
        } else if(this.activeTool.id == 'eraser') {
            let sizeElement = document.querySelector(".tab-content" + dataSelector + " .size-range");

            sizeElement.value = this.toolsOptions.eraser.size;
        }
        if(this.activePanel.id == 'library') {
            this.tabClickHanndler.call(this, document.querySelector(".tab-title.panel[data-panel-id='library']"));
        }
    }

    reloadSlideshow() {
        let slideshow = document.getElementById('slideshow'),
            slideImage = document.getElementById('slide-image');

        if(this.localSnapshots.length > 0) {
            slideshow.className = '';
            slideImage.src = this.b64ToBlobURL(this.localSnapshots[this.localSnapshots.length - 1]);
        } else {
            chrome.storage.local.get(this.STORAGEAREAKEY, function(items) {
                if(typeof items[this.STORAGEAREAKEY] == 'object' && items[this.STORAGEAREAKEY].length > 0) {
                    this.localSnapshots =  items[this.STORAGEAREAKEY];
                    slideshow.className = '';
                    slideImage.src = this.b64ToBlobURL(this.localSnapshots[this.localSnapshots.length - 1]);
                }
            }.bind(this));
        }
    }

    attachHandlers() {
        let save = document.getElementById('save'),
            switcher = document.getElementById('switcher');
        save.addEventListener('click', this.saveClickHandler.bind(this, save));
        switcher.addEventListener('click', this.switcherClickHandler.bind(this, switcher));
        for(let element of document.querySelectorAll('.tab-title')) {
            element.addEventListener('click', this.tabClickHanndler.bind(this, element));
        }
        for(let element of document.querySelectorAll('.tab-content .color')) {
            element.addEventListener('click', this.colorClickHandler.bind(this, element));
        }
        for(let element of document.querySelectorAll('.tab-content input.size-range')) {
            element.addEventListener('change', this.sizeHandler.bind(this, element));
        }
        // document.querySelector('#slideshow > .screenshot-navigation > i').addEventListener('click', )
        for(let element of document.querySelectorAll('#slideshow > .screenshot-actions > div')) {
            element.addEventListener('click', this.screenshotActionClickHandler.bind(this, element));
        }
    }

    switcherClickHandler(element) {
        if(element.classList.contains('off')) {
            this.overlayOpen = true;
            chrome.tabs.sendMessage(this.tabID, {
                message: 'init-canvas',
                data: {
                    tool: this.activeTool,
                    tabID: this.tabID
                }
            });
            element.classList.remove('off');
            element.classList.add('on');
            document.getElementById('save').disabled = false;
        } else if(element.classList.contains('on')) {
            this.overlayOpen = false;
            chrome.tabs.sendMessage(this.tabID, { message: 'close-canvas' });
            element.classList.remove('on');
            element.classList.add('off');
            document.getElementById('save').disabled = true;
        }
    }

    screenshotActionClickHandler(element) {
        let slideshow = document.getElementById('slideshow'),
            slideImage = document.getElementById('slide-image');
        if(slideshow.className == '' && slideImage.src != null) {
            if(element.classList.contains('save-screenshot')) {
                chrome.tabs.sendMessage(this.tabID, {
                    message: 'insert-snapshot-download',
                    data: slideImage.src
                });
            } else if(element.classList.contains('delete-screenshot')) {
                chrome.storage.local.get(this.STORAGEAREAKEY, function(slideImage, slideshow, items) {
                    let data = items[this.STORAGEAREAKEY];
                    if(typeof data == 'object' && data.length > 0) {
                        data.splice(slideImage.dataset.storageIndex, 1);
                        if(data.length > 0) {
                            slideImage.src = this.b64ToBlobURL(data[data.length - 1]);
                            slideImage.dataset.storageIndex = data.length - 1;
                        } else {
                            slideshow.className = 'empty';
                            slideImage.src = '';
                            slideImage.dataset.storageIndex = '-1';
                        }
                        chrome.storage.local.set({ [this.STORAGEAREAKEY]: data });
                    }
                }.bind(this, slideImage, slideshow))
            }
        }
    }

    saveClickHandler(element) {
        this.tabClickHanndler.call(this, document.querySelector(".tab-title[data-panel-id='library'"));
        chrome.tabs.sendMessage(this.tabID, {message: 'save-canvas'}, function(response) {
            if(response != null && response.hasOwnProperty('message') && (response.message == 'saved')) {
                this.switcherClickHandler.call(this, document.getElementById('switcher'));
            }
        }.bind(this));
    }

    tabClickHanndler(element) {
        if(!element.classList.contains('active')) {
            this.disableAllTabs();
            element.classList.add('active');
            if(element.dataset.toolId) {
                let id = element.dataset.toolId;

                document.querySelector(".tab-content[data-tool-id='" + id + "']").classList.add('active');
                this.activePanel.id = 'none';
                this.activePanel.htmlId = 'none';
                this.changeActiveTool(id);
            } else {
                let id = element.dataset.panelId;

                document.querySelector(".tab-content[data-panel-id='" + id + "']").classList.add('active');

                if(id == 'library') {
                    this.reloadSlideshow();
                }
                this.activePanel.id = id;
                this.activePanel.htmlId = id;
                this.activeTool.id = 'paintBrush';
                this.activeTool.htmlId = 'paint-brush';
            }
        }
    }

    changeActiveTool(newId) {
        let id = this.changeToCamelCase(newId);
        this.activeTool = {
            id: id,
            htmlId: (id === 'paintBrush') ? 'paint-brush' : id,
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
        if(!element.classList.contains('active')) {
            let tabContent = element.parentElement.parentElement,
                toolId = tabContent.dataset.toolId,
                colorName = element.title.toLowerCase();
            this.disableAllColors(toolId);
            element.classList.add('active');
            if(toolId === 'paint-brush') {
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
        if(toolId === 'paint-brush') {
            this.toolsOptions.paintBrush.size = value;
        } else if(toolId === 'eraser') {
            this.toolsOptions.eraser.size = value;
        }
        this.changeActiveTool(toolId);
    }

    disableAllTabs() {
        for(let element of document.querySelectorAll('.tab-title.active, .tab-content.active')) {
            element.classList.remove('active');
        }
    }

    disableAllColors(toolId) {
        let contentSelector = ".tab-content[data-tool-id='" + toolId + "']";
        for(let element of document.querySelectorAll(contentSelector + " .color.active")) {
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
            percent = document.getElementById('loader-percent'),
            animation;
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
        chrome.storage.local.get(this.STORAGEAREAKEY, function(newImageSrc, items) {
            if(typeof items[this.STORAGEAREAKEY] == 'object') {
                this.localSnapshots = items[this.STORAGEAREAKEY].concat([newImageSrc]);
            } else {
                this.localSnapshots = new Array(newImageSrc);
            }

            if(this.localSnapshots.length > 0) {
                let imageBlobURL = this.b64ToBlobURL(newImageSrc);

                chrome.storage.local.set({ [this.STORAGEAREAKEY]:  this.localSnapshots }, function(imageBlobURL) {
                    let slideshow = document.getElementById('slideshow'),
                        slideImage = document.getElementById('slide-image');
                    slideshow.className = '';
                    slideImage.src = imageBlobURL;
                    slideImage.dataset.storageIndex = this.localSnapshots.length - 1;
                }.bind(this, imageBlobURL));
            }
        }.bind(this, newImageSrc));
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

webPageAnnotator = new WebPageAnotatorPopup();

window.onunload = function() {
    background.popupObjects[webPageAnnotator.tabID] = webPageAnnotator;
};

window.onload = function() {
    chrome.tabs.query({active: true}, function(tabArray) {
        webPageAnnotator.tabID = tabArray[0].id;

        chrome.runtime.sendMessage({
            message: 'init-object',
            tabID: webPageAnnotator.tabID
        }, function(response) {
            if(response.hasOwnProperty('message')) {
                if(response.message == 'do-it-yourself') {
                    webPageAnnotator.init();
                } else if(response.message == 'sending-popup-object-data' && response.hasOwnProperty('data')) {
                    webPageAnnotator.reload(response.data);
                }
            }
        });

        webPageAnnotator.reloadSlideshow();
    });
};

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if(request.hasOwnProperty('message') && request.hasOwnProperty('data') && (request.message == 'snapshot-is-ready')) {
        webPageAnnotator.animateLoader(100);
        webPageAnnotator.insertImage(request.data);
    } else if(request.hasOwnProperty('message') && request.hasOwnProperty('data') && (request.message == 'update-snapshot-process')) {
        webPageAnnotator.animateLoader(request.data);
    }
});