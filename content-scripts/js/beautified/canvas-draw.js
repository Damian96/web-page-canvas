/* globals chrome */

var object;

/**
 * The main frontend plugin class.
 * Used for creating the Highlighting Mode layout.
 * Implements the drawing function code. 
 */
class CanvasDraw {
    constructor(toolData) {
        this.activeToolInfo = toolData;
        this.canvas = {
            clickX: [],
            clickY: [],
            clickDrag: [],
            clickTool: [],
            clickColor: [],
            clickSize: [],
            clickOpacity: [],
            isDrawing: false,
            drawEnabled: false,
            element: null,
            context: null
        };
        this.htmlInserted = false;
    }

    init() {
        this.attachHandlers();
        this.initCanvas();
    }

    updateToolInfo(toolInfo) {
        this.activeToolInfo = toolInfo;
    }

    insertHTML() {
        var code = "<canvas id='canvas' class='highlighter'></canvas>";
        code += "<div id='canvas-overlay' class='highlighter'>";
        code += "<span id='close-overlay' class='highlighter' title='Close'>&#10006;</span>";
        code += "<p id='overlay-message' class='highlighter'>";
        code += "Use the tools to your top to begin annotating the page.";
        code += "<br/><button id='confirm-message' class='highlighter' title='Close'>";
        code += "&#10003;&nbsp;OK</button></p></div>";
        document.body.innerHTML += code;
        document.querySelector('#canvas.highlighter').height = this.getMaxHeight();
        Array.from(document.querySelectorAll('#close-overlay, #confirm-message')).forEach(function(element) {
            element.addEventListener('click', function() {
                document.querySelector('#canvas-overlay.highlighter').remove();
            });
        }, this);
    }

    getMaxHeight() {
        return Math.max([document.body.height, document.body.offsetHeight, document.body.scrollTop]);
    }

    removeHTML() {
        document.querySelector('#canvas.highlighter').remove();
        document.querySelector('#canvas-overlay.highlighter').remove();
    }

    initCanvas() {
        // assign proper variables
        this.canvas.element = document.querySelector('#canvas.highlighter');
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
            if(this.canvas.drawEnabled && this.canvas.isDrawing && (this.activeIcon.id === 'paint-brush')) {
                var x = e.pageX - this.canvas.element.offsetLeft;
                var y = e.pageY - this.canvas.element.offsetTop;
                if(this.activeToolInfo.id === 'paint-brush') {
                    this.addClick(x, y, true, this.activeToolInfo.size, this.activeToolInfo.color, this.activeToolInfo.opacity);
                } else if(this.activeToolInfo.id === 'eraser') {
                    this.addClick(x, y, true, this.activeToolInfo.size);
                }
                this.draw();
            }
        }.bind(this);
        this.canvas.element.onmousedown = function(e) {
            if(this.activeIcon.id === 'paint-brush') {
                var x = e.pageX - this.canvas.element.offsetLeft;
                var y = e.pageY - this.canvas.element.offsetTop;
                this.canvas.isDrawing = true;
                this.addClick(x, y, false);            
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

    addClick(x, y, dragging, size, color = false, opacity = false) {
        this.canvas.clickX.push(x);
        this.canvas.clickY.push(y);
        this.canvas.clickDrag.push(dragging);
        this.canvas.clickSize.push(size);
        if(color) {
            this.canvas.clickColor.push(this.activeToolInfo.color);
        }
        if(opacity) {
            this.canvas.clickOpacity.push(this.activeToolInfo.opacity);
        }
    }

    draw() {
        this.canvas.context.lineJoin = "round";
        this.canvas.context.lineWidth = this.canvas.clickSize[i];
        for(var i=0; i < this.canvas.clickX.length; i++) {
            this.canvas.context.beginPath();
            this.canvas.context.globalAlpha = this.canvas.clickOpacity[i];
            if(this.canvas.clickDrag[i] && i){
                this.canvas.context.moveTo(this.canvas.clickX[i - 1], this.canvas.clickY[i - 1]);
            } else {
                this.canvas.context.moveTo(this.canvas.clickX[i] - 1, this.canvas.clickY[i]);
            }
            this.canvas.context.lineTo(this.canvas.clickX[i], this.canvas.clickY[i]);
            this.canvas.context.closePath();
            if(this.canvas.clickTool[i] === 'paint-brush') {
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
}

function insertCanvasDrawContent() {
    // chrome.runtime.sendMessage({message: 'get-tool-info'}, function(response) {
    //     if((response != null) && (response.data != null)) {
    //         object = new CanvasDraw(response.data);
    //     }
    // });
}

function removeCanvasDrawContent() {
    if(object != null) {
        object.removeHTML();
    }
}

window.onload = function() {
    console.log('ok');
    insertCanvasDrawContent();
};