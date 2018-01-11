/* globals chrome, html2canvas */

var webPageCanvas;

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
    // constructor(data) {
    //     this.activeToolInfo = data.tool;
    //     this.tabID = data.tabID;
    //     this.canvas = {
    //         clickX: [],
    //         clickY: [],
    //         clickDrag: [],
    //         clickTool: [],
    //         clickColor: [],
    //         clickSize: [],
    //         isDrawing: false,
    //         element: null,
    //         context: null
    //     };
    //     this.snapshots = {};
    //     this.imagesLoaded = 0;
    //     this.canvasImages = [];
    //     this.fixedElems = [];
    //     this.finalCanvas = {
    //         element:  document.createElement('CANVAS')
    //     };
    //     this.hasDrawings = false;
    //     this.finalCanvas.context = this.finalCanvas.element.getContext('2d');
    //     this.CAPTURED_IMAGE_EXTENSION = 'png';
    // }

    constructor() {
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
    }

    init() {
        this.initCanvas();
        this.attachHandlers();
    }

    attachHandlers() {
        for(let element of document.querySelectorAll(".tool-container, .option-container")) {
            element.addEventListener('click', this.onToolClickHandler.bind(this, element));
        }
        for(let element of document.querySelectorAll('span.color[data-color-code]')) {
            element.addEventListener('click', this.colorClickHandler.bind(this, element));
        }
        for(let element of document.querySelectorAll('#toolbar-alignment .dropdown-item')) {
            element.addEventListener('click', this.alignClickHandler.bind(this, element));
        }
        for(let element of document.querySelectorAll(".dropdown input[type='range']")) {
            element.addEventListener('change', this.sizeChangeHandler.bind(this, element));
        }
    }

    onToolClickHandler(tool, event) {

        if(tool.dataset.hasDropdown) {
            Array.from(tool.children).forEach(function(child) {

                if(child.classList.contains('dropdown') && child.classList.contains('hidden')) {

                    this.hideAllDropdowns();
                    child.classList.remove('hidden');
                    this.canvas.element.addEventListener('click', function() {

                        child.classList.add('hidden');

                    }.bind(this, child), {once: true});

                } else if(child.classList.contains('dropdown') && !child.classList.contains('hidden') && (event.path.indexOf(tool) == 0 || event.path.indexOf(tool) == 1)) {

                    child.classList.add('hidden');

                }

            }.bind(this));
        } else {
            this.hideAllDropdowns();
        }

    }

    alignClickHandler(element) {

        let toolbar = document.getElementById('toolbar');

        if(element.classList.contains('top') && !toolbar.classList.contains('aligned-top')) {
            toolbar.classList.remove('aligned-bottom');
            toolbar.classList.add('aligned-top');
        } else if(element.classList.contains('bottom') && !toolbar.classList.contains('aligned-bottom')) {
            toolbar.classList.remove('aligned-top');
            toolbar.classList.add('aligned-bottom');
        }

    }

    sizeChangeHandler(element) {

        if(element.dataset.tool == 'paint-brush') {

            element.nextElementSibling.innerText = element.value;

        }

    }

    colorClickHandler(element) {

        if(!element.classList.contains('active')) {
            document.querySelector('span.color.active[data-color-code]').classList.remove('active');
            element.classList.add('active');

            let paintBrush = document.querySelector(".icon-paint-brush");

            if(element.dataset.colorCode) {
                if(element.title == 'Black') {
                    paintBrush.classList.add('black');
                    paintBrush.classList.remove('green');
                    paintBrush.classList.remove('purple');
                    paintBrush.classList.remove('brown');
                } else if(element.title == 'Green') {
                    paintBrush.classList.add('green');
                    paintBrush.classList.remove('black');
                    paintBrush.classList.remove('purple');
                    paintBrush.classList.remove('brown');
                } else if(element.title == 'Purple') {
                    paintBrush.classList.add('purple');
                    paintBrush.classList.remove('black');
                    paintBrush.classList.remove('green');
                    paintBrush.classList.remove('brown');
                } else if(element.title == 'Brown') {
                    paintBrush.classList.add('brown');
                    paintBrush.classList.remove('black');
                    paintBrush.classList.remove('green');
                    paintBrush.classList.remove('purple');
                } else {
                    paintBrush.style.color = element.dataset.colorCode;
                    paintBrush.classList.remove('black');
                    paintBrush.classList.remove('green');
                    paintBrush.classList.remove('purple');
                    paintBrush.classList.remove('brown');
                }
            }

        }

    }

    hideAllDropdowns() {
        for(let element of document.querySelectorAll('.dropdown:not(.hidden)')) {
            element.classList.add('hidden');
        }
    }

    destroy() {
        webPageCanvas.saveLastCanvas();
        webPageCanvas.removeHTML();
        webPageCanvas.handleFixedElements(true);
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
        for(var element of document.querySelectorAll('#close-overlay, #confirm-message')) {
            element.addEventListener('click', this.closeIntroMessage.bind(this));
        }
        this.handleFixedElements(false);
        window.onresize = this.adjustCanvas.bind(this);
    }

    // getMaxHeight() {
    //     return Math.max(window.innerHeight, document.body.offsetHeight,
    //         document.body.scrollHeight, document.body.clientHeight,
    //         document.documentElement.offsetHeight, document.documentElement.clientHeight,
    //         document.documentElement.scrollHeight);
    // }

    // getMaxWidth() {
    //     return Math.max(window.innerWidth, document.body.offsetWidth, document.body.scrollLeft);
    // }

    initCanvas() {
        // assign proper variables
        this.canvas.element = document.querySelector('canvas');
        // this.canvas.element.width = window.innerWidth;
        // this.canvas.element.height = this.getMaxHeight();
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

        // this.canvas.element.onmousemove = function(e) {
        //     var x = e.pageX - this.canvas.element.offsetLeft,
        //         y = e.pageY - this.canvas.element.offsetTop;
        //     if(this.canvas.isDrawing) {
        //         if(this.activeToolInfo.id === 'paintBrush') {
        //             this.addClick(x, y, true,
        //                 this.activeToolInfo.id,
        //                 this.activeToolInfo.options.size,
        //                 this.activeToolInfo.options.color);
        //             this.draw();
        //         } else if(this.activeToolInfo.id === 'eraser') {
        //             this.addClick(x, y, true,
        //                 this.activeToolInfo.id, this.activeToolInfo.options.size, false, false);
        //             this.erase();
        //         }
        //     }
        // }.bind(this);
        // this.canvas.element.onmousedown = function(e) {
        //     this.canvas.isDrawing = true;
        //     if(this.activeToolInfo.id === 'paintBrush') {
        //         var x = e.pageX - this.canvas.element.offsetLeft,
        //             y = e.pageY - this.canvas.element.offsetTop;
        //         this.addClick(x, y, false, this.activeToolInfo.id,
        //             this.activeToolInfo.options.size,
        //             this.activeToolInfo.options.color);
        //         this.draw();
        //     } else if(this.activeToolInfo.id === 'eraser') {
        //         this.erase();
        //     }
        // }.bind(this);
        // this.canvas.element.onmouseup = function() {
        //     this.canvas.isDrawing = false;
        // }.bind(this);
        // this.canvas.element.onmouseleave = function() {
        //     this.canvas.isDrawing = false;
        // }.bind(this);
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
        if(!this.hasDrawings) {
            this.hasDrawings = true;
        }
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
        this.hasDrawings = false;
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

    restoreCanvas(dataURL) {

        var image = document.createElement('img');

        image.style.width = this.canvas.element.width + 'px';
        image.style.height = this.canvas.element.height + 'px';
        image.onload = function() {
            this.canvas.context.drawImage(image, 0, 0, this.canvas.element.width, this.canvas.element.height);
        }.bind(this);

        image.src = dataURL;

    }

    saveLastCanvas() {
        if(this.hasDrawings) {
            var canvas = document.querySelector('canvas').toDataURL();
            chrome.runtime.sendMessage({
                message: 'save-last-canvas',
                data: canvas
            });
        }
    }

    /**
     * Unsets / sets all fixed elements of document for better page capturing.
     * @param {boolean} handler
     */
    // handleFixedElements(handler) {
    //     if(handler) {
    //         for(var element of this.fixedElems) {
    //             element.style.position = 'fixed';
    //         }

    //         this.fixedElems = [];
    //     } else {
    //         for(var element of document.querySelectorAll('div, nav, section, header')) {
    //             var computedStyle = window.getComputedStyle(element, null).getPropertyValue('position');

    //             if(!element.classList.contains('web-page-canvas') && (element.style.position == 'fixed' || computedStyle == 'fixed')) {
    //                 element.style.position = 'absolute';
    //                 this.fixedElems.push(element);
    //             }
    //         }
    //     }
    // }

    /**
     *
     * @param {number} delayMiliseconds The milliseconds to wait before scrolling to the top of the page.
     */
    // scrollToTop(delayMiliseconds) {
    //     setTimeout(function() {
    //         window.scrollTo(0, 0);
    //     }, delayMiliseconds);
    // }
}

document.addEventListener('DOMContentLoaded', function() {
    webPageCanvas = new WebPageCanvas();
    webPageCanvas.init();
}, {once: true});

// chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {

//     if(request != null && request.hasOwnProperty('message')) {

//         if(request.hasOwnProperty('data')) {

//             if(request.message == 'init-canvas') {

//                 webPageCanvas = new WebPageCanvas(request.data);
//                 webPageCanvas.init();
//                 webPageCanvas.handleFixedElements(false);

//             }

//             if(webPageCanvas != null && request.message == 'update-info')
//                 webPageCanvas.updateToolInfo(request.data);
//             else if(webPageCanvas != null && (request.message == 'restore-canvas') && request.hasOwnProperty('data')) {
//                 webPageCanvas.restoreCanvas(request.data);
//             }

//         }

//         if(request.message == 'close-canvas')
//             webPageCanvas.destroy();
//         else if(request.message == 'scrollTop') {

//             window.scrollTo(0, window.scrollY + window.innerHeight);
//             sendResponse({message: 'Scrolled'});

//         } else if(request.message == 'clear-canvas')
//             webPageCanvas.clearCanvas();

//         if(webPageCanvas != null && webPageCanvas.htmlInserted) {

//             if(request.message == 'resize-canvas') {

//                 webPageCanvas.adjustCanvas.call(webPageCanvas);

//             } else if(request.message == 'save-canvas') {

//                 if(!document.body.classList.contains('web-page-canvas')) {
//                     document.body.classList.add('web-page-canvas');
//                 }

//                 if(document.getElementById('canvas-close-message').length > 0) {
//                     document.getElementById('canvas-close-message').remove();
//                 }

//                 webPageCanvas.scrollToTop(0);
//                 webPageCanvas.saveCanvas().then(function(snapshots) {
//                         if(typeof snapshots == 'object') {

//                             this.loadImages(snapshots).then(function(finalImage) {

//                                 document.body.classList.remove('web-page-canvas');
//                                 sendResponse({message: 'saved', data: finalImage});

//                             });

//                         }

//                         document.body.classList.remove('web-page-canvas');
//                         this.scrollToTop(1000);

//                     }.bind(webPageCanvas)).catch(function(error) {

//                         this.scrollToTop(1000);
//                         this.destroy();

//                     }.bind(webPageCanvas));

//             }

//         }
//     }
//     return true;
// });