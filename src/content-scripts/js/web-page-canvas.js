/* globals chrome, html2canvas */

var webPageCanvas;
    // insertDownload = function(url) {
    //     let a = document.createElement('a'),
    //         date = new Date();
    //     a.href = url;
    //     a.download = window.location.hostname + '_Canvas-Drawing_' + date.getTime() + '.png';
    //     a.classList.add('web-page-annotator-download');
    //     document.body.appendChild(a);
    //     a.click();
    // };

/**
 * @class
 * @classdesc The main frontend plugin class. Used for creating the Drawing Mode layout. Implements the drawing function code.
 * @prop {Object} activeToolInfo The object with all the information about the currently active tool.
 * @prop {Object} tabID The chrome ID of the current tab.
 * @prop {boolean} htmlInserted Whether the HTML of the plugin has been inserted.
 * @prop {Object.<string, number>} snapshots Contains the generated snapshots and their position on the final image.
 * @prop {HTMLElement[]} fixedElems Contains the fixed elements fo the current page in order to supress / reset them.
 * @prop {string} CAPTURED_IMAGE_EXTENSION Contains the final image's extension.
 * @prop {number} imagesLoaded The number of the images loaded on the virtually generated canvas each moment.
 * @prop {string[]} canvasImages The Image elements that are going to be loaded to the virtual canvas.
 */
class WebPageCanvas {

    /**
     * @constructor
     * @param {Object} data The popup data which are loaded into the constructed object.
     */
    constructor(data) {
        this.activeToolInfo = data.tool;
        this.tabID = data.tabID;
        this.canvas = {
            clickX: [],
            clickY: [],
            clickDrag: [],
            clickTool: [],
            clickColor: [],
            clickSize: [],
            isDrawing: false,
            element: null,
            context: null
        };
        this.snapshots = {};
        this.imagesLoaded = 0;
        this.canvasImages = [];
        this.fixedElems = [];
        this.finalCanvas = {
            element:  document.createElement('CANVAS')
        };
        this.finalCanvas.context = this.finalCanvas.element.getContext('2d');
        this.CAPTURED_IMAGE_EXTENSION = 'png';
    }

    init() {
        this.insertHTML();
        this.initCanvas();
    }

    resetFinalCanvas() {
        this.finalCanvas.element = document.createElement('CANVAS');
        this.finalCanvas.context = this.finalCanvas.element.getContext('2d');
    }

    updateToolInfo(data) {
        this.activeToolInfo = data.tool;
        this.tabID = data.tabID;
        this.canvas.clickColor = [];
        this.canvas.clickDrag = [];
        this.canvas.clickSize = [];
        this.canvas.clickTool = [];
        this.canvas.clickX = [];
        this.canvas.clickY = [];
    }

    insertHTML() {
        var code = "<canvas id='canvas' class='web-page-annotator'></canvas>" +
            "<div id='canvas-close-message' class='web-page-annotator' " +
            "style='display: none;'>Press <u>ESC</u> to close.</div>" +
            "<div id='canvas-overlay' class='web-page-annotator'>" +
            "<span id='close-overlay' class='web-page-annotator' title='Close'>&#10006;</span>" +
            "<p id='overlay-message' class='web-page-annotator'>" +
            "Use the tools on the plugin popup window to annotate the page. Have fun!" +
            "<br/><button id='confirm-message' class='web-page-annotator' title='Close'>" +
            "&#10003;&nbsp;OK</button></p></div>";
        document.body.innerHTML += code;
        for(var element of document.querySelectorAll('#close-overlay, #confirm-message')) {
            element.addEventListener('click', this.closeIntroMessage.bind(this));
        }
        this.handleFixedElements(false);
        window.onresize = this.adjustCanvas.bind(this);
        document.body.style.userSelect = 'none';
        this.htmlInserted = true;
    }

    closeIntroMessage() {
        document.querySelector('#canvas-overlay.web-page-annotator').remove();
        document.querySelector("#canvas-close-message.web-page-annotator").style.display = 'inline-block';
        window.onkeydown = function(event) {
            if(event.keyCode == 27) { // if event keycode is the Escape keycode
                this.removeHTML();
                chrome.runtime.sendMessage({message: 'manually-disabled-canvas'});
            }
        }.bind(this);
    }

    getMaxHeight() {
        return Math.max(window.innerHeight, document.body.offsetHeight,
            document.body.scrollHeight, document.body.clientHeight,
            document.documentElement.offsetHeight, document.documentElement.clientHeight,
            document.documentElement.scrollHeight);
    }

    getMaxWidth() {
        return Math.max(window.innerWidth, document.body.offsetWidth, document.body.scrollLeft);
    }

    removeHTML() {
        for(var element of document.querySelectorAll('#canvas.web-page-annotator,' +
            '#canvas-overlay.web-page-annotator, ' +
            '#canvas-close-message.web-page-annotator, ' +
            'a.web-page-annotator-download')) {
                element.remove();
        }
        document.body.style.userSelect = 'initial';
        this.handleFixedElements(true);
        this.htmlInserted = false;
    }

    removeGenImages() {
        for(var element of document.querySelectorAll('img.web-page-annotator-created')) {
            element.remove();
        }
    }

    initCanvas() {
        // assign proper variables
        this.canvas.element = document.querySelector('#canvas.web-page-annotator');
        this.canvas.element.width = window.innerWidth;
        this.canvas.element.height = this.getMaxHeight();
        this.canvas.context = this.canvas.element.getContext('2d');

        this.canvas.context.fillCircle = function(x, y, radius, fillColor) {
            this.fillStyle = fillColor;
            this.beginPath();
            this.moveTo(x, y);
            this.arc(x, y, radius, 0, Math.PI * 2, false);
            this.fill();
        };
        this.canvas.context.clearAll = function() {
            this.canvas.context.clearRect(0, 0, this.canvas.element.width, this.canvas.element.height);
        }.bind(this);

        this.canvas.element.onmousemove = function(e) {
            var x = e.pageX - this.canvas.element.offsetLeft,
                y = e.pageY - this.canvas.element.offsetTop;
            if(this.canvas.isDrawing) {
                if(this.activeToolInfo.id === 'paintBrush') {
                    this.addClick(x, y, true,
                        this.activeToolInfo.id,
                        this.activeToolInfo.options.size,
                        this.activeToolInfo.options.color);
                    this.draw();
                } else if(this.activeToolInfo.id === 'eraser') {
                    this.addClick(x, y, true,
                        this.activeToolInfo.id, this.activeToolInfo.options.size, false, false);
                    this.erase();
                }
            }
        }.bind(this);
        this.canvas.element.onmousedown = function(e) {
            this.canvas.isDrawing = true;
            if(this.activeToolInfo.id === 'paintBrush') {
                var x = e.pageX - this.canvas.element.offsetLeft,
                    y = e.pageY - this.canvas.element.offsetTop;
                this.addClick(x, y, false, this.activeToolInfo.id,
                    this.activeToolInfo.options.size,
                    this.activeToolInfo.options.color);
                this.draw();
            } else if(this.activeToolInfo.id === 'eraser') {
                this.erase();
            }
        }.bind(this);
        this.canvas.element.onmouseup = function() {
            this.canvas.isDrawing = false;
        }.bind(this);
        this.canvas.element.onmouseleave = function() {
            this.canvas.isDrawing = false;
        }.bind(this);
    }

    addClick(x, y, dragging, toolId, size, color) {
        this.canvas.clickX.push(x);
        this.canvas.clickY.push(y);
        this.canvas.clickDrag.push(dragging);
        this.canvas.clickTool.push(toolId);
        this.canvas.clickSize.push(size);
        if((toolId === 'paintBrush') && color) {
            this.canvas.clickColor.push(color);
        }
    }

    draw() {
        for(var i = 0; i < this.canvas.clickX.length; i++) {
            this.canvas.context.globalCompositeOperation = 'source-over';
            this.canvas.context.beginPath();
            this.canvas.context.lineJoin = 'round';
            this.canvas.context.lineWidth = this.canvas.clickSize[i];
            if(this.canvas.clickDrag[i] && i){
                this.canvas.context.moveTo(this.canvas.clickX[i - 1], this.canvas.clickY[i - 1]);
            } else {
                this.canvas.context.moveTo(this.canvas.clickX[i] - 1, this.canvas.clickY[i]);
            }
            this.canvas.context.lineTo(this.canvas.clickX[i], this.canvas.clickY[i]);
            this.canvas.context.closePath();
            if(this.canvas.clickTool[i] === 'paintBrush') {
                this.canvas.context.strokeStyle = this.canvas.clickColor[i];
                this.canvas.context.stroke();
            }
        }
    }

    erase() {
        for(var i = 0; i < this.canvas.clickX.length; i++) {
            this.canvas.context.globalCompositeOperation = 'destination-out';
            this.canvas.context.beginPath();
            this.canvas.context.lineJoin = 'round';
            this.canvas.context.lineWidth = this.canvas.clickSize[i];
            if(this.canvas.clickDrag[i] && i){
                this.canvas.context.moveTo(this.canvas.clickX[i - 1], this.canvas.clickY[i - 1]);
            } else {
                this.canvas.context.moveTo(this.canvas.clickX[i] - 1, this.canvas.clickY[i]);
            }
            this.canvas.context.lineTo(this.canvas.clickX[i], this.canvas.clickY[i]);
            this.canvas.context.closePath();
            this.canvas.context.stroke();
        }
    }

    clearCanvas() {
        this.canvas.clickX = [];
        this.canvas.clickY = [];
        this.canvas.clickDrag = [];
        this.canvas.context.clearRect(0, 0, this.canvas.element.width, this.canvas.element.height);
    }

    saveCanvas() {
        this.resetFinalCanvas();
        window.scrollTo(0, 0);
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                message: 'take-snapshot',
                data: {
                    tabID: this.tabID,
                    windowHeight: window.innerHeight,
                    pageHeight: this.getMaxHeight()
                }
            }, function(response) {
                if(response != null && response.hasOwnProperty('data')) {
                    if(response.hasOwnProperty('error')) {
                        reject(response.error);
                    } else {
                        resolve(response.data);
                    }
                } else {
                    reject('something went wrong while saving the canvas');
                }
            });
        });
    }

    loadImages(snapshots) {
        this.canvasImages = [];
        this.imagesLoaded = 0;

        return new Promise((resolve) => {
            this.snapshots = snapshots;

            for(var snapshot of this.snapshots) {
                var img = new Image();

                this.finalCanvas.element.width = this.getMaxWidth();
                this.finalCanvas.element.height = this.getMaxHeight();
                img.dataset.x = snapshot.x;
                img.dataset.y = snapshot.y;
                img.onload = function(img) {

                    this.finalCanvas.context.drawImage(img, parseInt(img.dataset.x), parseInt(img.dataset.y));
                    if(++this.imagesLoaded == this.snapshots.length) {
                        resolve(this.finalCanvas.element.toDataURL('image/png'));
                    }

                }.bind(this, img);

                img.src = snapshot.src;
                this.canvasImages.push(img);
            }
        });
    }

    adjustCanvas() {
        if(this.canvas.hasOwnProperty('element')) {
            this.canvas.element.width = this.getMaxWidth();
            this.canvas.element.height = this.getMaxHeight();
        }
    }

    /**
     * Unsets / sets all fixed elements of document for better page capturing.
     * @param {boolean} handler
     */
    handleFixedElements(handler) {
        if(handler) {
            for(var element of this.fixedElems) {
                element.style.position = 'fixed';
            }

            this.fixedElems = [];
        } else {
            for(var element of document.querySelectorAll('div, nav, section, header')) {
                var computedStyle = window.getComputedStyle(element, null).getPropertyValue('position');

                if(!element.classList.contains('web-page-annotator') && (element.style.position == 'fixed' || computedStyle == 'fixed')) {
                    element.style.position = 'absolute';
                    this.fixedElems.push(element);
                }
            }
        }
    }

    /**
     *
     * @param {number} delayMiliseconds The milliseconds to wait before scrolling to the top of the page.
     */
    scrollToTop(delayMiliseconds) {
        setTimeout(function() {
            window.scrollTo(0, 0);
        }, delayMiliseconds);
    }
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {

    if(request.hasOwnProperty('message')) {

        if(request.hasOwnProperty('data')) {

            if(request.message == 'init-canvas') {

                webPageCanvas = new WebPageCanvas(request.data);
                webPageCanvas.init();
                webPageCanvas.handleFixedElements(false);

            }

            if(webPageCanvas != null && request.message == 'update-info') {

                webPageCanvas.updateToolInfo(request.data);

            }

        }

        if(request.message == 'close-canvas') {

            webPageCanvas.removeHTML();
            webPageCanvas.handleFixedElements(true);

        } else if(request.message == 'scrollTop') {

            window.scrollTo(0, window.scrollY + window.innerHeight);
            sendResponse({message: 'Scrolled'});

        }

        if(webPageCanvas != null && webPageCanvas.htmlInserted) {

            if(request.message == 'resize-canvas') {

                webPageCanvas.adjustCanvas.call(webPageCanvas);

            } else if(request.message == 'save-canvas') {

                if(!document.body.classList.contains('web-page-annotator')) {
                    document.body.classList.add('web-page-annotator');
                }

                if(document.getElementById('canvas-close-message').length > 0) {
                    document.getElementById('canvas-close-message').remove();
                }

                webPageCanvas.scrollToTop(0);
                webPageCanvas.saveCanvas().then(function(snapshots) {
                        if(typeof snapshots == 'object') {

                            this.loadImages(snapshots).then(function(finalImage) {

                                document.body.classList.remove('web-page-annotator');
                                sendResponse({message: 'saved', data: finalImage});

                            });

                        }

                        document.body.classList.remove('web-page-annotator');
                        this.scrollToTop(1000);

                    }.bind(webPageCanvas)).catch(function(error) {

                        webPageCanvas.removeHTML();
                        this.scrollToTop(1000);
                        this.handleFixedElements(true);
                        this.removeHTML();

                    }.bind(webPageCanvas));

            }

        }
    }
    return true;
});