/* globals chrome, html2canvas */

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
                size: 5
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
            context: null
        };
        this.hasDrawings = false;
    }

    init() {
        this.initCanvas();
        window.onresize = this.adjustCanvas.bind(this);
        this.attachHandlers();
        this.adjustCanvas();
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
        document.querySelector(".option-container[title='Clear All']").addEventListener('click', this.canvas.context.clearAll.bind(this));
        document.getElementById("close-toolbar").addEventListener('click', this.destroy.bind(this));
    }

    onToolClickHandler(tool, event) {

        if(tool.dataset.hasDropdown) {
            Array.from(tool.children).forEach(function(child) {

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

            }.bind(this));
        } else {
            let activeDropdown = document.querySelector('.dropdown:not(.hidden)');
            if(activeDropdown != null) {
                activeDropdown.classList.add('hidden');
            }
        }

        if(tool.classList.contains('tool-container') && !tool.classList.contains('active')) {

            let activeTool = document.querySelector('.tool-container.active');
            if(activeTool != null) {
                activeTool.classList.remove('active');
            }

            tool.classList.add('active');

            if(tool.title == "Paint Brush") {

                let selector = ".tool-container[title='Paint Brush']";

                this.activeToolInfo.id = 'paintBrush';
                this.activeToolInfo.htmlID = 'paint-brush';
                this.sizeChangeHandler.call(this, document.querySelector("input[type='range'][data-tool='paint-brush']"));
                this.activeToolInfo.options.color = document.querySelector(selector + " span.color.active").dataset.colorCode;

            } else if(tool.title == 'Eraser') {


                let selector = ".tool-container[title='Eraser']";

                this.activeToolInfo.id = this.activeToolInfo.htmlID = 'eraser';
                this.sizeChangeHandler.call(this, document.querySelector("input[type='range'][data-tool='eraser']"));

            }

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

        } else if(element.dataset.tool == 'eraser') {

            element.nextElementSibling.innerText = element.value;

        }

        this.activeToolInfo.options.size = parseInt(element.value);

    }

    colorClickHandler(element) {

        if(!element.classList.contains('active')) {
            document.querySelector('span.color.active[data-color-code]').classList.remove('active');
            element.classList.add('active');

            let paintBrush = document.querySelector(".icon-paint-brush");
            let color = element.dataset.colorCode;

            if(color) {
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

            this.activeToolInfo.options.color = color;

        }

    }

    destroy() {
        if(this.hasDrawings) {
            chrome.runtime.sendMessage({message: 'close-canvas', data: this.canvas.element.toDataURL()});
        } else {
            chrome.runtime.sendMessage({message: 'close-canvas'});
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

        this.canvas.element.onmousemove = function(e) {
            if(this.canvas.isDrawing) {
                if(this.activeToolInfo.id === 'paintBrush') {
                    this.addClick(e.offsetX, e.offsetY, true,
                        this.activeToolInfo.id,
                        this.activeToolInfo.options.size,
                        this.activeToolInfo.options.color);
                    this.draw();
                } else if(this.activeToolInfo.id === 'eraser') {
                    this.addClick(e.offsetX, e.offsetY, true,
                        this.activeToolInfo.id, this.activeToolInfo.options.size, false, false);
                    this.erase();
                }
            }
        }.bind(this);
        this.canvas.element.onmousedown = function(e) {
            this.canvas.isDrawing = true;
            if(this.activeToolInfo.id === 'paintBrush') {
                this.addClick(e.offsetX, e.offsetY, true, this.activeToolInfo.id, this.activeToolInfo.options.size, this.activeToolInfo.options.color);
            } else if(this.activeToolInfo.id === 'eraser') {
                this.addClick(e.offsetX, e.offsetY, true, this.activeToolInfo.id, this.activeToolInfo.options.size, false);
            }
        }.bind(this);
        this.canvas.element.onmouseup = function() {
            this.canvas.isDrawing = false;
            this.canvas.clickX = [];
            this.canvas.clickY = [];
            this.canvas.clickDrag = [];
            this.canvas.clickSize = [];
            this.canvas.clickColor = [];
            this.canvas.clickTool = [];
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
        if(!this.hasDrawings) {
            this.hasDrawings = true;
        }
        for(var i = 0; i < this.canvas.clickX.length; i++) {
            this.canvas.context.globalCompositeOperation = 'source-over';
            this.canvas.context.lineJoin = 'round';
            this.canvas.context.beginPath();

            if(this.canvas.clickDrag[i] && i) {
                this.canvas.context.moveTo(this.canvas.clickX[i - 1], this.canvas.clickY[i - 1]);
            } else {
                this.canvas.context.moveTo(this.canvas.clickX[i] - 1, this.canvas.clickY[i]);
            }
            this.canvas.context.lineTo(this.canvas.clickX[i], this.canvas.clickY[i]);
            this.canvas.context.closePath();
            this.canvas.context.lineWidth = this.canvas.clickSize[i];
            if(this.canvas.clickTool[i] === 'paintBrush' && this.canvas.clickColor[i]) {
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
}

document.addEventListener('DOMContentLoaded', function() {
    webPageCanvas = new WebPageCanvas();
    webPageCanvas.init();
}, {once: true});


chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {

    if(request != null && request.hasOwnProperty('message') && !request.hasOwnProperty('data')) {

        if(request.message == 'close-canvas') {
            if(webPageCanvas.hasDrawings) {
                sendResponse({data: webPageCanvas.canvas.element.toDataURL()});
            } else {
                sendResponse(null);
            }
        } else if(request.message == 'save-canvas') {
            document.getElementById('toolbar').classList.add('hidden');
        } else if(request.message == 'resize-canvas') {
            webPageCanvas.adjustCanvas();
        }

    } else if(request != null && request.hasOwnProperty('message') && request.hasOwnProperty('data')) {

        if(request.message == 'restore-canvas') {
            webPageCanvas.restoreCanvas(request.data);
        }

    }

    return true;

});

window.onmessage = function(event) {
    if(event.data == 'reset-toolbar') {
        document.getElementById('toolbar').classList.remove('hidden');
    }
};

window.onkeydown = function(event) {
    if(event.keyCode == 27) {
        webPageCanvas.destroy();
    }
};