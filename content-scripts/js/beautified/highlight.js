/* globals EXTENSIONPATH, document */

/**
 * The main frontend plugin class.
 * Used for creating the Highlighting Mode layout.
 * Implements the drawing function code. 
 */
class Highlightor {
    constructor() {
        this.activeIcon = {
            id: null,
            element: null
        };
        this.canvas = {
            isDrawing: false,
            drawEnabled: false,
            element: null,
            context: null
        };
        this.htmlInserted = false;
    }

    iconClickHandler(element, event) {
        var icon = element.firstElementChild;
        if(icon.id === "highlighter") {
            if(!element.classList.contains('active')) {
                this.disableAllIcons();
                this.activeIcon = {
                    id: "highlighter",
                    object: icon
                };
                element.classList.add('active');
                icon.src = EXTENSIONPATH + 'images/highlighter-32_yellow.png';
                document.querySelector('#highlighter-overlay canvas').style.cursor = "url(" + EXTENSIONPATH + "icons/highlighter-cursor-16.png), pointer";
            } else {
                icon.src = EXTENSIONPATH + 'images/highlighter-32.png';
                element.classList.remove('active');
                this.activeIcon = {};
            }
        } else if(icon.id === "eraser") {
            if(!element.classList.contains('active')) {
                this.activeIcon = {
                    id: "eraser",
                    object: icon
                };
                this.disableAllIcons();
                element.classList.add('active');
                icon.src = EXTENSIONPATH + 'images/eraser-32_red.png';
                document.querySelector('#highlighter-overlay canvas').style.cursor = "url(" + EXTENSIONPATH + "icons/eraser-cursor-16.png), pointer";
            } else {
                element.classList.remove('active');
                icon.src = EXTENSIONPATH + 'images/eraser-32.png';
                this.activeIcon = {};
            }
        }
        return true;
    }

    insertIcons() {
        document.querySelector('#highlighter-overlay img#highlighter.highlighter-icon').src = EXTENSIONPATH + "images/highlighter-32.png";
        document.querySelector('#highlighter-overlay img#eraser.highlighter-icon').src = EXTENSIONPATH + "images/eraser-32.png";
    }

    attachHandlers() {        
        Array.from(document.querySelectorAll('#highlighter-overlay .icon-container')).forEach(function(element) {
            element.addEventListener('click', this.iconClickHandler.bind(this, element));
        }, this);
        var closeIcon = document.querySelector("#highlighter-overlay #close-overlay");
        closeIcon.addEventListener("click", function() {
            closeIcon.parentElement.style.display = "none";
            document.querySelector('#highlighter-overlay #canvas-container').className = 'expanded';
            this.canvas.drawEnabled = true;
        }.bind(this, closeIcon));
        var confirm = document.querySelector("#highlighter-overlay #confirm-overlay");
        confirm.addEventListener('click', function() {
            confirm.parentNode.parentElement.style.display = "none";
            document.querySelector('#highlighter-overlay #canvas-container').className = 'expanded';
            this.canvas.drawEnabled = true;
        }.bind(this, confirm), false);
    }

    insertOverlay() {
        var request = new XMLHttpRequest();
        request.open('GET', EXTENSIONPATH + "content-scripts/html/highlight.html", true);
        request.overrideMimeType("text/plain; charset=utf-8");
        request.send();
        request.onreadystatechange = function() {
            if((request.readyState === 4) && (request.status == 200) || ((request.status == 0))) {
                document.body.innerHTML += request.responseText;
                this.htmlInserted = true;
            }
        }.bind(this);
    }

    closeOverlay() {
        document.getElementById('highlighter-overlay').remove();
    }

    disableAllIcons() {
        this.activeIcon = {};
        document.querySelector('#highlighter-overlay canvas').style.cursor = "default";
        Array.from(document.querySelectorAll('#highlighter-overlay #controls .icon-container.active')).forEach(function(element) {
            element.classList.remove('active');
            element.firstElementChild.src = EXTENSIONPATH + 'images/' + element.firstElementChild.id + '-32.png';
        });
    }

    initCanvas() {
        // assign proper variables
        this.canvas.element = document.querySelector('#highlighter-overlay #canvas-drawing');
        this.canvas.context = this.canvas.element.getContext('2d');
        this.canvas.context.fillCircle = function(x, y, radius, fillColor) {
            console.log('drawing', x, y, radius, fillColor);
            this.fillStyle = fillColor;
            this.beginPath();
            this.moveTo(x, y);
            this.arc(x, y, radius, 0, Math.PI * 2, false);
            this.fill();
        };
        this.canvas.context.clearAll = function() {
            this.canvas.context.clearRect(0, 0, this.canvas.element.width, this.canvas.element.height);
        }.bind(this);
    
        // bind mouse events
        this.canvas.element.onmousemove = function(e) {
            if(!this.canvas.drawEnabled || !this.canvas.isDrawing) {
                return;
            }
            var radius = 3;
            var fillColor = '#ff0000';
            this.canvas.context.fillCircle(e.pageX - this.canvas.element.offsetLeft * 2, e.pageY - this.canvas.element.offsetTop, radius, fillColor);
        }.bind(this);
        this.canvas.element.onmousedown = function() {
            this.canvas.isDrawing = true;
        }.bind(this);
        this.canvas.element.onmouseup = function() {
            this.canvas.isDrawing = false;
        }.bind(this);
    }
}

var highlightorObj = new Highlightor();

function insertHighlighterContent() {
    highlightorObj.insertOverlay();
    var checkCodeExists = setInterval(function() {
        if(highlightorObj.htmlInserted) {
            highlightorObj.insertIcons();
            highlightorObj.attachHandlers();    
            highlightorObj.initCanvas();
            clearInterval(checkCodeExists);
        }
    }, 500);
}

function removeHighlighterContent() {
    highlightorObj.closeOverlay();
}

function handleContent(message) {
    if(message.handleOverlay) {
        if(document.getElementById('highlighter-overlay') == null) {
            insertHighlighterContent();
        }
    } else {
        if((typeof document.getElementById('highlighter-overlay') !== 'undefined') && (document.getElementById('highlighter-overlay') != null)) {
            removeHighlighterContent();
        }
    }
}

browser.runtime.onMessage.addListener(handleContent);

insertHighlighterContent();