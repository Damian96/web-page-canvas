/* globals chrome */

var object;

/**
 * The main frontend plugin class.
 * Used for creating the Drawing Mode layout.
 * Implements the drawing function code. 
 */
class CanvasDraw {
    constructor(data) {
        this.activeToolInfo = data.tool;
        this.tabId = data.tabId;
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
        this.htmlInserted = false;
    }

    init() {
        this.insertHTML();
        this.initCanvas();
    }

    updateToolInfo(data) {
        this.activeToolInfo = data.tool;
        this.tabId = data.tabId;
    }

    insertHTML() {
        let code = "<canvas id='canvas' class='canvas-drawer'></canvas>";
        code += "<div id='canvas-overlay' class='canvas-drawer'>";
        code += "<span id='close-overlay' class='canvas-drawer' title='Close'>&#10006;</span>";
        code += "<p id='overlay-message' class='canvas-drawer'>";
        code += "Use the tools to your top to begin annotating the page.";
        code += "<br/><button id='confirm-message' class='canvas-drawer' title='Close'>";
        code += "&#10003;&nbsp;OK</button></p></div>";
        document.body.innerHTML += code;
        this.htmlInserted = true;
        for(let element of document.querySelectorAll('#close-overlay, #confirm-message')) {
            element.addEventListener('click', function() {
                document.querySelector('#canvas-overlay.canvas-drawer').remove();
            });
        }
    }

    getMaxHeight() {
        return Math.max(window.innerHeight, document.body.offsetHeight, document.body.scrollTop);
    }

    getMaxWidth() {
        return Math.max(window.innerWidth, document.body.offsetWidth, document.body.scrollLeft);
    }
    
    removeHTML() {
        for(let element of document.querySelectorAll('#canvas.canvas-drawer, #canvas-overlay.canvas-drawer, img.canvas-drawer-created')) {
            if(element != null) {
                element.remove();
            }
        }
        this.htmlInserted = false;
    }

    removeGenImages() {
        for(let element of document.querySelectorAll('img.canvas-drawer-created')) {
            element.remove();
        }
    }

    initCanvas() {
        // assign proper variables
        this.canvas.element = document.querySelector('#canvas.canvas-drawer');
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
            let x = e.pageX - this.canvas.element.offsetLeft,
                y = e.pageY - this.canvas.element.offsetTop;
            if(this.canvas.isDrawing && (this.activeToolInfo.id === 'paintBrush')) {
                this.addClick(x, y, true,
                    this.activeToolInfo.id,
                    this.activeToolInfo.options.size,
                    this.activeToolInfo.options.color);
                this.draw();
            } else if(this.activeToolInfo.id === 'eraser') {
                this.addClick(x, y, true,
                    this.activeToolInfo.id, this.activeToolInfo.options.size, false, false);
            }
        }.bind(this);
        this.canvas.element.onmousedown = function(e) {
            if(this.activeToolInfo.id === 'paintBrush') {
                this.canvas.isDrawing = true;
                let x = e.pageX - this.canvas.element.offsetLeft,
                    y = e.pageY - this.canvas.element.offsetTop;
                this.addClick(x, y, false, this.activeToolInfo.id,
                    this.activeToolInfo.options.size,
                    this.activeToolInfo.options.color);            
                this.draw();
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
        for(let i = 0; i < this.canvas.clickX.length; i++) {
            this.canvas.context.beginPath();
            this.canvas.context.lineJoin = "round";
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
    
    clearCanvas() {
        this.canvas.clickX = [];
        this.canvas.clickY = [];
        this.canvas.clickDrag = [];
        this.canvas.context.clearRect(0, 0, this.canvas.element.width, this.canvas.element.height);
    }

    saveCanvas() {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({
                message: 'take-snapshot',
                data: {
                    tabId: this.tabId,
                    windowHeight: window.innerHeight,
                    pageHeight: this.getMaxHeight()
                }
            }, function(response) {
                console.log(response);
                return;
                resolve(response.data);
            });
        });
    }

    insertDownload(url) {
        let a = document.createElement('a'),
            date = new Date();
        a.href = url;
        a.download = window.location.hostname + '_Canvas-Drawing_' + date.getTime() + '.png';
        a.classList.add('canvas-drawer-download');
        document.body.appendChild(a);
        a.click();
    }
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log(request);
    if((request.message === 'init-canvas') && (request.data != null)) {
        object = new CanvasDraw(request.data);
        object.init();
    } else if((request.message === 'update-info') && (request.data != null) && (object != null)) {
        object.updateToolInfo(request.data);
    } else if((request.message === 'save-canvas') && (object != null) && object.htmlInserted) {
        object.saveCanvas().then(function(snapshots) {
            console.log(snapshots);
        });
    } else if(request.message === 'close-canvas') {
        object.removeHTML();   
    }
});