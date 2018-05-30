/* globals browser */

var webPageCanvas;

/**
 * @class
 * @classdesc The main frontend plugin class. Used for creating the Drawing Mode layout. Implements the drawing function code.
 * @prop {Object} activeToolInfo The object with all the information about the currently active tool.
 * @prop {Object} tabID The chrome ID of the current tab.
 * @prop {Object.<string, number>} snapshots Contains the generated snapshots and their position on the final image.
 */
class WebPageCanvas {

    constructor() {
        this.activeToolInfo = {
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
        this.insertedStyleSheets = false;
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
        document.getElementById("close-toolbar").addEventListener('click', this.destroy.bind(this));
        document.querySelector("input[type='checkbox'][data-tool='highlighter']").addEventListener('change', this.onToolOptionChangeHandler.bind(this, document.querySelector("input[type='checkbox'][data-tool='highlighter']")));
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
        browser.runtime.sendMessage({
            message: 'manually-closed-canvas'
        });
    }

    handleElements(show) {

        for(let element of document.getElementsByClassName('web-page-canvas')) {
            if(show) {
                element.classList.remove('hidden');
            } else {
                element.classList.add('hidden');
            }
        }

    }

    saveCanvas() {

        this.resetFinalCanvas();
        window.scrollTo(0, 0);
        return new Promise((resolve, reject) => {
            browser.runtime.sendMessage({
                message: 'take-snapshot',
                data: {
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
                    reject();
                }
            });
        });

    }

    loadImages(snapshots) {

        this.snapshots = snapshots;

        return new Promise((resolve) => {

            for(let snapshot of this.snapshots) {
                let img = new Image();

                img.onload = function(img, x, y) {
                    this.finalCanvas.context.drawImage(img, x, y);
                    if(++this.imagesLoaded == this.snapshots.length)
                        resolve(this.finalCanvas.element.toDataURL('image/png'));
                }.bind(this, img, snapshot.x, snapshot.y);

                img.src = snapshot.src;
                this.canvasImages.push(img);
            }
        });
    }

    onToolClickHandler(tool, event) {

        if(tool.dataset.hasDropdown) {
            for(let child of tool.children) {

                if(child.classList.contains('dropdown') && child.classList.contains('hidden')) {

                    let activeDropdown = document.querySelector('.dropdown:not(.hidden)');
                    if(activeDropdown != null) {
                        activeDropdown.classList.add('hidden');
                    }

                    child.classList.remove('hidden');
                    this.canvas.element.addEventListener('click', function() {

                        child.classList.add('hidden');

                    }.bind(this, child), {once: true});

                } else if(child.classList.contains('dropdown') && !child.classList.contains('hidden') && (event.path.indexOf(tool) == 0 || event.path.indexOf(tool) == 1)) {

                    child.classList.add('hidden');

                }

            }
        } else {
            let activeDropdown = document.querySelector('.dropdown:not(.hidden)');
            if(activeDropdown != null) {
                activeDropdown.classList.add('hidden');
            }
        }

        this.resetCanvasTools();

        if(tool.classList.contains('tool-container') && !tool.classList.contains('active')) {

            let activeTool = document.querySelector('.tool-container.active');
            if(activeTool != null) {
                activeTool.classList.remove('active');
            }

            tool.classList.add('active');

            let selector = ".tool-container[title='" + tool.title + "']";

            if(tool.title == "Paint Brush") {

                this.activeToolInfo.id = 'paintBrush';
                this.activeToolInfo.htmlID = 'paint-brush';
                this.sizeChangeHandler.call(this, document.querySelector(selector + " input[type='range']"));
                this.activeToolInfo.options.color = document.querySelector(selector + " span.color.active").dataset.colorCode;

            } else if(tool.title == 'Eraser') {

                this.activeToolInfo.id = this.activeToolInfo.htmlID = 'eraser';
                this.sizeChangeHandler.call(this, document.querySelector(selector + " input[type='range']"));

            } else if(tool.title == 'Highlighter') {

                this.activeToolInfo.id = this.activeToolInfo.htmlID = 'highlighter';
                this.sizeChangeHandler.call(this, document.querySelector(selector + " input[type='range'][data-option='size']"));
                this.sizeChangeHandler.call(this, document.querySelector(selector + " input[type='range'][data-option='transparency']"));
                this.activeToolInfo.options.color = document.querySelector(selector + " span.color.active").dataset.colorCode;

            }

        }

    }

    onToolOptionChangeHandler(element) {

        if((this.activeToolInfo.id  == 'highlighter') && (element.dataset.tool == 'highlighter') && (element.dataset.option == 'highlighting-assist')) {

            if(element.checked)
                this.activeToolInfo.options.assist = true;
            else {
                this.activeToolInfo.options.assist = this.canvas.startingClickY = false;
            }


        }

    }

    alignClickHandler(element) {

        let toolbar = document.getElementById('toolbar');

        if(element.classList.contains('top')) {
            toolbar.classList.add('aligned-top');
            toolbar.classList.remove('aligned-bottom');
        } else if(element.classList.contains('bottom')) {
            toolbar.classList.add('aligned-bottom');
            toolbar.classList.remove('aligned-top');
        }

    }

    sizeChangeHandler(element) {
        if(element.dataset.tool == 'highlighter' && element.dataset.option == 'transparency') {
            this.activeToolInfo.options.opacity = (100 - parseInt(element.value)) / 100;
            element.nextElementSibling.innerText = element.value + '%';
        } else {
            element.nextElementSibling.innerText = element.value;
            this.activeToolInfo.options.size = parseInt(element.value);
        }
    }

    colorClickHandler(element) {

        let toolTitle = element.parentElement.parentElement.parentElement.title;
        let toolSelector = ".tool-container[title='" + toolTitle + "']";

        if(!element.classList.contains('active')) {
            document.querySelector(toolSelector + ' span.color.active[data-color-code]').classList.remove('active');
            element.classList.add('active');

            let icon,
                color = element.dataset.colorCode;

            if(toolTitle == 'Paint Brush')
                icon = document.querySelector(".icon-paint-brush");
            else if(toolTitle == 'Highlighter')
                icon = document.querySelector(".icon-highlighter");
            else if((toolTitle != 'Paint Brush' && toolTitle != 'Highlighter') || !color) {
                return;
            }

            if(element.title == 'Black') {
                icon.classList.add('black');
                icon.classList.remove('green');
                icon.classList.remove('purple');
                icon.classList.remove('brown');
            } else if(element.title == 'Green') {
                icon.classList.add('green');
                icon.classList.remove('black');
                icon.classList.remove('purple');
                icon.classList.remove('brown');
            } else if(element.title == 'Purple') {
                icon.classList.add('purple');
                icon.classList.remove('black');
                icon.classList.remove('green');
                icon.classList.remove('brown');
            } else if(element.title == 'Brown') {
                icon.classList.add('brown');
                icon.classList.remove('black');
                icon.classList.remove('green');
                icon.classList.remove('purple');
            } else {
                icon.style.color = element.dataset.colorCode;
                icon.classList.remove('black');
                icon.classList.remove('green');
                icon.classList.remove('purple');
                icon.classList.remove('brown');
            }

            this.activeToolInfo.options.color = color;

        }

    }

    initCanvas() {
        this.canvas.element = document.querySelector('canvas');
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

            if(this.canvas.isDrawing) {

                this.addClick(e.offsetX, e.offsetY, true, this.activeToolInfo.id, this.activeToolInfo.options.size, this.activeToolInfo.id == 'eraser' ? false : this.activeToolInfo.options.color);

                this.activeToolInfo.id == ('eraser' ? this.erase() : this.draw());

            }

        }.bind(this);

        this.canvas.element.onmousedown = function(e) {

            this.canvas.isDrawing = true;
            this.addClick(e.offsetX, e.offsetY, true, this.activeToolInfo.id, this.activeToolInfo.options.size, this.activeToolInfo.id == 'eraser' ? false : this.activeToolInfo.options.color);

            if(this.activeToolInfo.id == 'highlighter' && this.activeToolInfo.options.assist)
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
        if(color) {
            this.canvas.clickColor.push(color);
        }
    }

    draw() {

        if(!this.hasDrawings) this.hasDrawings = true;
        this.canvas.context.globalCompositeOperation = 'source-over';

        for(let i = 0; i < this.canvas.clickX.length; i++) {

            if(this.canvas.clickTool[i] == 'highlighter') {
                this.canvas.context.lineJoin = 'mitter';
                this.canvas.context.globalAlpha = this.activeToolInfo.options.opacity;
            } else {
                this.canvas.context.lineJoin = 'round';
                this.canvas.context.globalAlpha = 1;
            }

            this.canvas.context.beginPath();

            if((this.canvas.clickX.indexOf(this.canvas.clickX[i - 1]) == this.canvas.clickY.indexOf(this.canvas.clickY[i - 1]) && this.canvas.clickX.indexOf(this.canvas.clickX[i - 1]) == (i - 1)) || (this.canvas.clickX.indexOf(this.canvas.clickX[i]) == this.canvas.clickY.indexOf(this.canvas.clickY[i]) && this.canvas.clickX.indexOf(this.canvas.clickX[i]) == i)) {

                if(this.canvas.clickDrag[i] && i) {

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

            if(this.canvas.clickColor[i] && (this.canvas.context.strokeStyle = this.canvas.clickColor[i])) {
                this.canvas.context.stroke();
            }
        }

    }

    erase() {
        this.canvas.context.globalCompositeOperation = 'destination-out';
        for(var i = 0; i < this.canvas.clickX.length; i++) {
            this.canvas.context.beginPath();
            this.canvas.context.lineJoin = 'round';
            this.canvas.context.lineWidth = this.canvas.clickSize[i];
            if(this.canvas.clickDrag[i] && i){
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
                if(request.responseType == 'document')
                    this.contentDocument = request.responseXML;
                    resolve('success');
            }.bind(this);

            request.open('GET', browser.runtime.getURL('/web-resources/html/web-page-canvas.html'));
            request.responseType = 'document';
            request.send();

        });
    }

    /**
     * Inserts all of the retrieved HTML in the current document.
     */
    insertHTML() {
        if(this.contentDocument != null) {
            this.insertedStyleSheets = true;
            for(let styleSheet of this.contentDocument.querySelectorAll(("head > link"))) {

                if(styleSheet.href.indexOf('http') == -1) {
                    let href = styleSheet.getAttribute('href');
                    styleSheet.setAttribute('href', browser.runtime.getURL(href));
                }

                document.head.appendChild(styleSheet);

            }

            document.body.innerHTML += this.contentDocument.body.innerHTML;

        }
    }

    getMaxHeight() {
        return Math.max(window.innerHeight, document.body.offsetHeight, document.body.scrollHeight, document.body.clientHeight, document.documentElement.offsetHeight, document.documentElement.clientHeight, document.documentElement.scrollHeight);
    }

    getMaxWidth() {
        return Math.max(window.innerWidth, document.body.offsetWidth, document.body.scrollLeft);
    }

    adjustCanvas() {
        if(this.canvas.hasOwnProperty('element')) {
            this.canvas.element.width = document.body.offsetWidth;
            this.canvas.element.height = document.documentElement.scrollHeight;
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

browser.runtime.onMessage.addListener(function(request, sender, sendResponse) {

    if(request != null && request.hasOwnProperty('message') && !request.hasOwnProperty('data')) {

        if(request.message == 'init-canvas') {

            if(webPageCanvas == null) {

                webPageCanvas = new WebPageCanvas();
                webPageCanvas.getContentDocument()
                    .then(function() {
                        webPageCanvas.insertHTML();
                        webPageCanvas.attachHandlers();
                        webPageCanvas.initCanvas();
                        window.onresize = webPageCanvas.adjustCanvas();
                    });

            } else if(webPageCanvas != null) {

                webPageCanvas.handleElements(true);

            }

        } else if(request.message == 'close-canvas') {

            webPageCanvas.handleElements(false);

            if(webPageCanvas.hasDrawings) {
                sendResponse({data: webPageCanvas.canvas.element.toDataURL()});
            } else {
                sendResponse(null);
            }

        } else if(request.message == 'save-canvas') {

            document.getElementById('toolbar').classList.add('hidden');
            webPageCanvas.scrollToTop(0);
			webPageCanvas.saveCanvas().then(function(snapshots) {
				if(typeof snapshots == 'object') {
					webPageCanvas.loadImages(snapshots).then(function(finalImage) {

                        document.getElementById('toolbar').classList.remove('hidden');
						sendResponse({message: 'saved', data: finalImage});

					});
				}

				webPageCanvas.scrollToTop(500);

			}).catch(function() {
				webPageCanvas.scrollToTop(0);
			});

        } else if(request.message == 'resize-canvas')
            webPageCanvas.adjustCanvas();
        else if(request.message == 'scroll-top') {

			window.scrollTo(0, window.scrollY + window.innerHeight);
            sendResponse({message: 'Scrolled'});

		}

    } else if(request != null && request.hasOwnProperty('message') && request.hasOwnProperty('data')) {

        if(request.message == 'restore-canvas') {
            webPageCanvas.restoreCanvas(request.data);
        }

    }
    return true;

});