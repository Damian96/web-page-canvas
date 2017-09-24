/* globals chrome, EXTENSIONPATH */

/**
 * The main frontend plugin class.
 * Used for creating the Highlighting Mode layout.
 * Implements the drawing function code. 
 */
class Highlightor {
    constructor() {
        this.activeIcon = {
            id: 'highlighter'
        };
        this.canvas = {
            isDrawing: false,
            drawEnabled: false,
            element: null,
            context: null
        };
        this.htmlInserted = false;
    }

    attachHandlers() {
        var closeIcon = document.querySelector("#close-overlay.highlighter"),
            confirmBtn = document.querySelector("#confirm-message.highlighter");
        closeIcon.addEventListener("click", function() {
            closeIcon.parentElement.style.display = "none";
            this.canvas.drawEnabled = true;
        }.bind(this, closeIcon));
        confirmBtn.addEventListener('click', function() {
            confirmBtn.parentNode.parentElement.style.display = "none";
            this.canvas.drawEnabled = true;
        }.bind(this, confirmBtn));
        Array.from(document.querySelectorAll("#toolbar.highlighter .tool-container:not([title='Clear All'])")).forEach(function(element) {
            element.addEventListener('click', this.iconClickHandler.bind(this, element));
        }.bind(this));
    }

    insertOverlay() {
        'use strict';
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
        document.querySelector('#canvas.highlighter').remove();
        document.querySelector('#canvas-overlay.highlighter').remove();
        document.querySelector('#toolbar.highlighter').remove();
    }

    initCanvas() {
        // assign proper variables
        this.canvas.element = document.querySelector('#highlighter-overlay #canvas-drawing');
        this.canvas.element.width = window.innerWidth;
        this.canvas.element.height = document.documentElement.offsetHeight;
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

    iconClickHandler(element) {
        var isActive = element.classList.contains('active');
        this.disableAllIcons();
        if(!isActive) {
            element.classList.add('active');
            var icon = element.firstElementChild;
            this.activeIcon.id = icon.id;                    
        } else {
            this.activeIcon.id = null;
        }
    }

    disableAllIcons() {
        this.activeIcon.id = null;
        // document.querySelector('#highlighter-overlay canvas').style.cursor = "default";
        Array.from(document.querySelectorAll('#toolbar.highlighter .tool-container.active')).forEach(function(element) {
            element.classList.remove('active');
        });
    }
}

function insertHighlighterContent() {
    var obj = new Highlightor();
    obj.insertOverlay();
    setTimeout(function() {
        obj.attachHandlers();
        // obj.initCanvas();
    }, 750);
}

function removeHighlighterContent() {
    var object = new Highlightor();
    object.closeOverlay();
}

function handleContent(message) {
    if(message.handleOverlay && (document.querySelector('#canvas.highlighter') == null)) {
        insertHighlighterContent();
    } else {
        removeHighlighterContent();
    }
}

chrome.runtime.onMessage.addListener(handleContent);

insertHighlighterContent();