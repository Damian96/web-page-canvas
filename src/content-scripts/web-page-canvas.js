/* globals chrome */

var webPageCanvas;

/**
 * @class
 * @classdesc The main frontend plugin class. Used for creating the Drawing Mode layout. Implements the drawing function code.
 * @prop {Object.<string, Object>} activeTool The object with all the information about the currently active tool.
 * @prop {Object} tabID The chrome ID of the current tab.
 * @prop {Object.<string, number>} snapshots Contains the generated snapshots and their position on the final image.
 */
class WebPageCanvas {

    constructor() {
        this.activeTool = {
            id: 'paintBrush',
            htmlID: 'paint-brush',
            options: {
                color: '#FFFF00',
                size: 5,
                opacity: null,
                assist: false
            }
        };
        this.canvas = {
            clickX: [],
            clickY: [],
            clickDrag: [],
            clickTool: [],
            clickColor: [],
            clickSize: [],
            isDrawing: false,
            element: null,
            context: null,
            startingClickY: false
        };
        this.hasDrawings = false;
        this.finalCanvas = {
            element: document.createElement('CANVAS'),
            context: null
        };
        this.finalCanvas.context = this.finalCanvas.element.getContext('2d');
        this.contentDocument = null;
    }

    attachHandlers() {
        // Tool, option
        for (let element of document.querySelectorAll(".tool-container, .option-container")) {
            element.addEventListener('click', this.onToolClickHandler.bind(this));
        }
        // Color picker
        document.querySelector("#toolbar.web-page-canvas input[type='color']").addEventListener('change', this.colorChangeHandler.bind(this));
        for (let element of document.querySelectorAll(".dropdown input[type='range']")) {
            element.addEventListener('change', this.sizeChangeHandler.bind(this));
        }
        // Close Toolbar
        document.getElementById("close-toolbar").addEventListener('click', this.destroy.bind(this));

        document.querySelector("input[type='checkbox'][data-tool='highlighter']").addEventListener('change', this.onToolOptionChangeHandler.bind(this));
    }

    resetFinalCanvas() {
        this.canvasImages = [];
        this.imagesLoaded = 0;
        this.finalCanvas.element.width = this.getMaxWidth();
        this.finalCanvas.element.height = this.getMaxHeight();
        this.finalCanvas.context.clearRect(0, 0, this.finalCanvas.element.width, this.finalCanvas.element.height);
    }

    destroy() {
        webPageCanvas.handleElements(false);
        chrome.runtime.sendMessage({
            message: 'manually-closed-canvas'
        });
    }

    handleElements(add) {

        if (add) {
            this.injectCSS()
                .then(function() {
                    this.injectHTML()
                        .then(function() {
                            webPageCanvas.attachHandlers();
                            webPageCanvas.initCanvas();
                            webPageCanvas.adjustCanvas();
                            window.onresize = webPageCanvas.adjustCanvas.bind(webPageCanvas);
                        });
                });
        } else {
            for(let element of document.querySelectorAll('.web-page-canvas')) {
                element.remove();
            }
        }

    }

    saveCanvas() {

        this.resetFinalCanvas();
        window.scrollTo(0, 0);
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                message: 'take-snapshot',
                data: {
                    windowHeight: window.innerHeight,
                    pageHeight: this.getMaxHeight()
                }
            }, function(response) {
                if (response != null && response.hasOwnProperty('data')) {
                    if (response.hasOwnProperty('error')) {
                        reject(response.error);
                    } else {
                        resolve(response.data);
                    }
                } else {
                    reject();
                }
            });
        });

    }

    /**
     * 
     * @param {Object} snapshots 
     */
    loadImages(snapshots) {

        this.snapshots = snapshots;

        return new Promise((resolve) => {

            var onImgLoad = function (img, x, y) {
                this.finalCanvas.context.drawImage(img, x, y);
                if (++this.imagesLoaded == this.snapshots.length)
                    resolve(this.finalCanvas.element.toDataURL('image/png'));
            };

            for (let snapshot of this.snapshots) {
                let img = new Image();

                img.onload = onImgLoad.bind(this, img, snapshot.x, snapshot.y);

                img.src = snapshot.src;
                this.canvasImages.push(img);
            }
        });
    }

    onToolClickHandler(event) {

        if (event.currentTarget.dataset.hasDropdown) { // Toolbar option has dropdown menu
            for (let child of event.currentTarget.children) {

                // Is dropdown menu and is hidden
                if (child.classList.contains('dropdown') && child.classList.contains('hidden')) {

                    let activeDropdown = document.querySelector('.dropdown:not(.hidden)');
                    if (activeDropdown != null) {
                        activeDropdown.classList.add('hidden');
                    }

                    child.classList.remove('hidden');
                    this.canvas.element.addEventListener('click', function() {

                        child.classList.add('hidden');

                    }.bind(this, child), { once: true });

                    break;

                } else if (child.classList.contains('dropdown') && !child.classList.contains('hidden')) { // Is dropdown, is not hidden

                    if (event.path.indexOf(event.currentTarget) <= 1) // Toolbar option is clicked
                        child.classList.add('hidden');
                    else if (!event.currentTarget.id.localeCompare('toolbar-alignment') && child.firstElementChild.classList.contains('dropdown-item')) { // Alignment option clicked
                        for (var i = 0; i < event.path.length - 4; i++) {
                            if (event.path[i].classList.contains('dropdown-item')) {
                                var toolbar = document.getElementById('toolbar');
                                if (event.path[i].classList.contains('top')) {
                                    toolbar.className = 'web-page-canvas aligned-top';
                                } else if (event.path[i].classList.contains('bottom')) {
                                    toolbar.className = 'web-page-canvas aligned-bottom';
                                }
                                break;
                            }
                        }
                    }
                    break;

                }

            }
        } else { // Tool is button
            let activeDropdown = document.querySelector('.dropdown:not(.hidden)');
            if (activeDropdown != null) {
                activeDropdown.classList.add('hidden'); // hide active dropdown
            }
        }

        this.resetCanvasTools();

        if (event.currentTarget.classList.contains('tool-container') && !event.currentTarget.classList.contains('active')) {

            let activeTool = document.querySelector('.tool-container.active');
            if (activeTool != null) {
                activeTool.classList.remove('active');
            }

            event.currentTarget.classList.add('active');

            let selector = ".tool-container[title='" + event.currentTarget.title + "']";

            if (!event.currentTarget.title.localeCompare("Paint Brush")) {

                this.activeTool.id = 'paintBrush';
                this.activeTool.htmlID = 'paint-brush';

            } else if (!event.currentTarget.title.localeCompare('Eraser')) {

                this.activeTool.id = 'eraser';
                this.activeTool.htmlID = 'eraser';

            } else if (!event.currentTarget.title.localeCompare('Highlighter')) {

                this.activeTool.id = 'highlighter';
                this.activeTool.htmlID = 'highlighter';
                var value = document.querySelector(selector + " input[type='range'][data-option='transparency']").value;
                this.activeTool.options.opacity = (100 - value) / 100;

            }

        }

    }

    onToolOptionChangeHandler(event) {

        if (!this.activeTool.id.localeCompare('highlighter') && !event.target.dataset.tool.localeCompare('highlighter') && !event.target.dataset.option.localeCompare('highlighting-assist')) {

            if (event.target.checked)
                this.activeTool.options.assist = true;
            else
                this.activeTool.options.assist = this.canvas.startingClickY = false;

        }

    }

    sizeChangeHandler(event) {
        if (!event.target.dataset.tool.localeCompare('highlighter') && !event.target.dataset.option.localeCompare('transparency')) {
            this.activeTool.options.opacity = (100 - parseInt(event.target.value)) / 100;
            event.target.nextElementSibling.innerText = event.target.value + '%';
        } else {
            event.target.nextElementSibling.innerText = event.target.value;
            this.activeTool.options.size = parseInt(event.target.value);
        }
    }

    // colorClickHandler(event) {

    //     let toolTitle = element.parentElement.parentElement.parentElement.title;
    //     let toolSelector = ".tool-container[title='" + toolTitle + "']";

    //     if (!element.classList.contains('active')) {
    //         document.querySelector(toolSelector + ' span.color.active[data-color-code]').classList.remove('active');
    //         element.classList.add('active');

    //         let icon,
    //             color = element.dataset.colorCode;

    //         if (!toolTitle.localeCompare('Paint Brush'))
    //             icon = document.querySelector(".icon-paint-brush");
    //         else if (!toolTitle.localeCompare('Highlighter'))
    //             icon = document.querySelector(".icon-highlighter");
    //         else if (toolTitle.localeCompare('Paint Brush') != 0 && toolTitle.localeCompare('Highlighter') != 0 || !color) {
    //             return;
    //         }

    //         if (!element.title.localeCompare('Black')) {
    //             icon.classList.add('black');
    //             icon.classList.remove('green');
    //             icon.classList.remove('purple');
    //             icon.classList.remove('brown');
    //         } else if (!element.title.localeCompare('Green')) {
    //             icon.classList.add('green');
    //             icon.classList.remove('black');
    //             icon.classList.remove('purple');
    //             icon.classList.remove('brown');
    //         } else if (!element.title.localeCompare('Purple')) {
    //             icon.classList.add('purple');
    //             icon.classList.remove('black');
    //             icon.classList.remove('green');
    //             icon.classList.remove('brown');
    //         } else if (!element.title.localeCompare('Brown')) {
    //             icon.classList.add('brown');
    //             icon.classList.remove('black');
    //             icon.classList.remove('green');
    //             icon.classList.remove('purple');
    //         } else {
    //             icon.style.color = element.dataset.colorCode;
    //             icon.classList.remove('black');
    //             icon.classList.remove('green');
    //             icon.classList.remove('purple');
    //             icon.classList.remove('brown');
    //         }

    //         this.activeTool.options.color = color;

    //     }

    colorChangeHandler(event) {
        if (this.activeTool.id !== 'eraser')
            this.activeTool.options.color = event.target.value;
    }

    initCanvas() {
        this.canvas.element = document.querySelector('canvas.web-page-canvas');
        this.canvas.context = this.canvas.element.getContext('2d');

        this.canvas.context.fillCircle = function(x, y, radius, fillColor) {
            this.fillStyle = fillColor;
            this.beginPath();
            this.moveTo(x, y);
            this.arc(x, y, radius, 0, Math.PI * 2, false);
            this.fill();
        };
        this.canvas.context.clearAll = function() {
            this.hasDrawings = false;
            this.canvas.context.clearRect(0, 0, this.canvas.element.width, this.canvas.element.height);
        }.bind(this);
        document.querySelector(".option-container[title='Clear All']").addEventListener('click', this.canvas.context.clearAll.bind(this));

        this.canvas.element.onmousemove = function(e) {

            if (this.canvas.isDrawing) {

                this.addClick(e.offsetX, e.offsetY, true, this.activeTool.id, this.activeTool.options.size, !this.activeTool.id.localeCompare('eraser') ? false : this.activeTool.options.color);

                if (!this.activeTool.id.localeCompare('eraser'))
                    this.erase();
                else
                    this.draw();

            }

        }.bind(this);

        this.canvas.element.onmousedown = function(e) {

            this.canvas.isDrawing = true;
            this.addClick(e.offsetX, e.offsetY, true, this.activeTool.id, this.activeTool.options.size, !this.activeTool.id.localeCompare('eraser') ? false : this.activeTool.options.color);

            if (!this.activeTool.id.localeCompare('highlighter') && this.activeTool.options.assist)
                this.canvas.startingClickY = e.offsetY;

        }.bind(this);
        this.canvas.element.onmouseup = function() {
            this.canvas.isDrawing = false;
            this.resetCanvasTools();
        }.bind(this);
        this.canvas.element.onmouseleave = function() {
            this.canvas.isDrawing = false;
            this.resetCanvasTools();
        }.bind(this);
    }

    resetCanvasTools() {
        this.canvas.clickX = [];
        this.canvas.clickY = [];
        this.canvas.clickDrag = [];
        this.canvas.clickSize = [];
        this.canvas.clickColor = [];
        this.canvas.clickTool = [];
    }

    addClick(x, y, dragging, toolId, size, color) {
        this.canvas.clickX.push(x);
        this.canvas.clickY.push(y);
        this.canvas.clickDrag.push(dragging);
        this.canvas.clickTool.push(toolId);
        this.canvas.clickSize.push(size);
        if (color) {
            this.canvas.clickColor.push(color);
        }
    }

    draw() {

        if (!this.hasDrawings) this.hasDrawings = true;
        this.canvas.context.globalCompositeOperation = 'source-over';

        for (let i = 0; i < this.canvas.clickX.length; i++) {

            if (!this.canvas.clickTool[i].localeCompare('highlighter')) {
                this.canvas.context.lineJoin = 'mitter';
                this.canvas.context.globalAlpha = this.activeTool.options.opacity;
            } else {
                this.canvas.context.lineJoin = 'round';
                this.canvas.context.globalAlpha = 1;
            }

            this.canvas.context.beginPath();

            if ((this.canvas.clickX.indexOf(this.canvas.clickX[i - 1]) == this.canvas.clickY.indexOf(this.canvas.clickY[i - 1]) && this.canvas.clickX.indexOf(this.canvas.clickX[i - 1]) == (i - 1)) || (this.canvas.clickX.indexOf(this.canvas.clickX[i]) == this.canvas.clickY.indexOf(this.canvas.clickY[i]) && this.canvas.clickX.indexOf(this.canvas.clickX[i]) == i)) {

                if (this.canvas.clickDrag[i] && i) {

                    this.canvas.context.moveTo(this.canvas.clickX[i - 1], !this.canvas.startingClickY ? this.canvas.clickY[i - 1] : this.canvas.startingClickY);
                    this.canvas.clickX.splice(i - 1, 1);
                    this.canvas.clickY.splice(i - 1, 1);

                } else {

                    this.canvas.context.moveTo(this.canvas.clickX[i] - 1, !this.canvas.startingClickY ? this.canvas.clickY[i] : this.canvas.startingClickY);
                    this.canvas.clickX.splice(i, 1);
                    this.canvas.clickY.splice(i, 1);

                }

            }

            this.canvas.context.lineTo(this.canvas.clickX[i], !this.canvas.startingClickY ? this.canvas.clickY[i] : this.canvas.startingClickY);
            this.canvas.context.closePath();
            this.canvas.context.lineWidth = this.canvas.clickSize[i];

            if (this.canvas.clickColor[i] && (this.canvas.context.strokeStyle = this.canvas.clickColor[i])) {
                this.canvas.context.stroke();
            }
        }

    }

    erase() {
        this.canvas.context.globalCompositeOperation = 'destination-out';
        for (var i = 0; i < this.canvas.clickX.length; i++) {
            this.canvas.context.beginPath();
            this.canvas.context.lineJoin = 'round';
            this.canvas.context.lineWidth = this.canvas.clickSize[i];
            if (this.canvas.clickDrag[i] && i) {
                this.canvas.context.moveTo(this.canvas.clickX[i - 1], this.canvas.clickY[i - 1]);
                this.canvas.clickX.splice(i - 1, 1);
                this.canvas.clickY.splice(i - 1, 1);
            } else {
                this.canvas.context.moveTo(this.canvas.clickX[i] - 1, this.canvas.clickY[i]);
                this.canvas.clickX.splice(i, 1);
                this.canvas.clickY.splice(i, 1);
            }
            this.canvas.context.lineTo(this.canvas.clickX[i], this.canvas.clickY[i]);
            this.canvas.context.closePath();
            this.canvas.context.stroke();
        }
    }

    getContentDocument() {
        return new Promise((resolve) => {

            let request = new XMLHttpRequest();

            request.onload = function() {
                 if (request.readyState == 4 && request.status == 200 && !request.responseType.localeCompare('document'))
                    this.contentDocument = request.responseXML;
                resolve();
            }.bind(this);

            request.open('GET', chrome.runtime.getURL('/web-resources/html/web-page-canvas.html'));
            request.responseType = 'document';
            request.send();

        });
    }

    /**
     * Injects all stylsheets on the document
     * @returns {Promise} when all the stylesheets are loaded
     */
    injectCSS() {
        if (this.contentDocument == null) {
            return false;
        }

        return new Promise((resolve) => {

            var styles = this.contentDocument.querySelectorAll("head > link[rel='stylesheet']");
            var styleLoaded = 0;
            var styleOnLoad = function () {
                if (++styleLoaded == styles.length)
                    resolve();
            };

            for (let styleSheet of styles) {

                let href = styleSheet.getAttribute('href');
                let sheet = styleSheet.cloneNode(true);
                styleSheet.className = 'web-page-canvas';
                styleSheet.onload = styleOnLoad;
                styleSheet.setAttribute('href', chrome.runtime.getURL(href));
                document.head.appendChild(styleSheet);

            }

        });
    }

    /**
     * Injects the HTML on the document.
     */
    injectHTML() {
        document.body.innerHTML += this.contentDocument.body.innerHTML;
        setTimeout(this.animateToolbar, 500);
    }

    animateToolbar() {
        document.getElementById('toolbar').addEventListener('transitionend', function(event) {
            event.target.classList.remove('animated');
        }, {once: true});
        document.getElementById('toolbar').classList.remove('closed');
        document.getElementById('toolbar').classList.add('animated');
    }

    /**
     * Retrieves the maximum height of the current window
     * @returns {number} The maximum height
     */
    getMaxHeight() {
        return Math.max(window.innerHeight, document.body.offsetHeight, document.body.scrollHeight, document.body.clientHeight, document.documentElement.offsetHeight, document.documentElement.clientHeight);
    }

    /**
     * Retrieves the maximum width of the current window
     * @returns {number} The maximum width
     */
    getMaxWidth() {
        return window.innerWidth - 17;
    }

    /**
     * Adjusts the canvas to the current window
     * @returns {void}
     */
    adjustCanvas() {
        if (this.canvas.hasOwnProperty('element') && this.canvas.element != null) {
            this.canvas.element.width = this.getMaxWidth();
            this.canvas.element.height = this.getMaxHeight();
        }
    }

    restoreCanvas(dataURL) {

        var image = document.createElement('img');

        image.style.width = this.canvas.element.width + 'px';
        image.style.height = this.canvas.element.height + 'px';
        image.onload = function() {
            this.canvas.context.clearAll();
            this.canvas.context.drawImage(image, 0, 0, this.canvas.element.width, this.canvas.element.height);
        }.bind(this);

        image.src = dataURL;

    }

    /**
     * Scrolls the page to the top.
     * @param {number} delay - The delay of the scroll in milliseconds.
     */
    scrollToTop(delay) {
        setTimeout(function() {
            window.scrollTo(0, 0);
        }, delay);
    }
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {

    if (request != null && request.hasOwnProperty('message') && !request.hasOwnProperty('data')) {

        if (!request.message.localeCompare('init-canvas')) {

            if (webPageCanvas == null) {

                webPageCanvas = new WebPageCanvas();
                webPageCanvas.getContentDocument()
                    .then(function() {
                        webPageCanvas.injectCSS()
                            .then(function() {
                                webPageCanvas.injectHTML();
                                webPageCanvas.attachHandlers();
                                webPageCanvas.initCanvas();
                                webPageCanvas.adjustCanvas();
                                window.onresize = webPageCanvas.adjustCanvas.bind(webPageCanvas);
                            });                      
                    });

            } else if (webPageCanvas != null)
                webPageCanvas.handleElements(true);

        } else if (!request.message.localeCompare('close-canvas')) {

            webPageCanvas.handleElements(false);

            if (webPageCanvas.hasDrawings)
                sendResponse({ data: webPageCanvas.canvas.element.toDataURL() });
            else
                sendResponse(null);

        } else if (!request.message.localeCompare('save-canvas')) {

            document.getElementById('toolbar').classList.add('hidden');
            webPageCanvas.scrollToTop(0);
            webPageCanvas.saveCanvas().then(function(snapshots) {
                if (!(typeof snapshots).localeCompare('object')) {
                    webPageCanvas.loadImages(snapshots).then(function(finalImage) {

                        document.getElementById('toolbar').classList.remove('hidden');
                        sendResponse({ message: 'saved', data: finalImage });

                    });
                }

                webPageCanvas.scrollToTop(500);

            }).catch(function() {
                webPageCanvas.scrollToTop(0);
            });

        } else if (!request.message.localeCompare('resize-canvas'))
            webPageCanvas.adjustCanvas();
        else if (!request.message.localeCompare('scroll-top')) {

            window.scrollTo(0, window.scrollY + window.innerHeight);
            sendResponse({ message: 'Scrolled' });

        }

    } else if (request != null && request.hasOwnProperty('message') && request.hasOwnProperty('data')) {

        if (!request.message.localeCompare('restore-canvas')) {
            webPageCanvas.restoreCanvas(request.data);
        }

    }
    return true;

});