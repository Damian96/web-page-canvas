/**
 * The main frontend plugin class.
 * Used for creating the Highlighting Mode layout.
 * Implements the drawing function code. 
 * @constructor
 * @param {HTMLElement} lastElem - The last element of the document
 */
class Highlightor {
    constructor() {
        this.activeIcon = {};
        this.canvas = {
            isDrawing: false,
            drawEnabled: false,
            element: null,
            context: null
        };
        this.htmlInserted = false;
    }

    iconClickHandler(element, scope) {
        var icon = element.firstElementChild;
        if(icon.id === "highlighter") {
            if(!element.classList.contains('active')) {
                disableAllIcons();
                scope.activeIcon = {
                    id: "highlighter",
                    object: icon
                };
                element.classList.add('active');
                icon.src = EXTENSIONPATH + 'icons/highlighter-32_yellow.png';
                document.querySelector('#highlighter-overlay canvas').style.cursor = "url(" + EXTENSIONPATH + "icons/highlighter-cursor-16.png), pointer";
            } else {
                icon.src = EXTENSIONPATH + 'icons/highlighter-32.png';
                element.classList.remove('active');
                scope.activeIcon = {};
            }
        } else if(icon.id === "eraser") {
            if(!element.classList.contains('active')) {
                scope.activeIcon = {
                    id: "eraser",
                    object: icon
                };
                disableAllIcons();
                element.classList.add('active');
                icon.src = EXTENSIONPATH + 'icons/eraser-32_red.png';
                document.querySelector('#highlighter-overlay canvas').style.cursor = "url(" + EXTENSIONPATH + "icons/eraser-cursor-16.png), pointer";
            } else {
                element.classList.remove('active');
                icon.src = EXTENSIONPATH + 'icons/eraser-32.png';
                scope.activeIcon = {};
            }
        }
        return true;
    }

    insertIcons() {
        document.querySelector('#highlighter-overlay img#highlighter.highlighter-icon').src = EXTENSIONPATH + "icons/highlighter-32.png";
        document.querySelector('#highlighter-overlay img#eraser.highlighter-icon').src = EXTENSIONPATH + "icons/eraser-32.png";
    }

    attachHandlers() {        
        Array.from(document.querySelectorAll('#highlighter-overlay .icon-container')).forEach(function(element) {
            element.addEventListener('click', this.iconClickHandler.bind(element, this));
        }, this);
        var closeIcon = document.querySelector("#highlighter-overlay #close-overlay");
        closeIcon.addEventListener("click", function(element, scope) {
            element.parentElement.style.display = "none";
            document.querySelector('#highlighter-overlay #canvas-container').className = 'expanded';
            scope.canvas.drawEnabled = true;
        }.bind(closeIcon, this));
        var confirm = document.querySelector("#highlighter-overlay #confirm-overlay");
        confirm.addEventListener('click', function(element, scope) {
            element.parentNode.parentElement.style.display = "none";
            document.querySelector('#highlighter-overlay #canvas-container').className = 'expanded';
            scope.canvas.drawEnabled = true;
        }.bind(confirm, this), false);
    }

    attachIconHandlers(element) {
        element.addEventListener('click', )
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
            element.firstElementChild.src = EXTENSIONPATH + 'icons/' + element.firstElementChild.id + '-32.png';
        });
    }

    initCanvas() {
        // assign proper variables
        this.canvas.element = document.querySelector('#highlighter-overlay #canvas-drawing');
        this.canvas.context = this.canvas.element.getContext('2d');
        this.canvas.context.fillCircle = function(x, y, radius, fillColor) {
            this.fillStyle = fillColor;
            this.beginPath();
            this.moveTo(x, y);
            this.arc(x, y, radius, 0, Math.PI * 2, false);
            this.fill();
        };
        this.canvas.context.clearAll = function(canvas) {
            canvas.context.clearRect(0, 0, canvas.element.width, canvas.element.height);
        }.bind(this.canvas);
    
        // bind mouse events
        this.canvas.onmousemove = function(e) {
            if(!this.drawEnabled || !this.isDrawing) {
                return;
            }
            var radius = 3;
            var fillColor = '#ff0000';
            this.context.fillCircle(e.pageX - this.offsetLeft, e.pageY - this.offsetTop, radius, fillColor);
        };
        this.canvas.onmousedown = function() {
            this.isDrawing = true;
        };
        this.canvas.onmouseup = function() {
            this.isDrawing = false;
        };
    }
}

function insertHighlighterContent() {
    var highlightorObj = new Highlightor();
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
