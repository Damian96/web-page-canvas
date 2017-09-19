var drawEnabled = false;
var activeIcon = {};
var canvas = {};

/**
 * The main frontend plugin class.
 * Used for creating the Highlighting Mode layout.
 * Implements the drawing function code. 
 * @constructor
 * @param {HTMLElement} lastElem - The last element of the document
 */
class Highlightor {
    constructor() {}

    insertIcons() {
        document.querySelector('img#highlighter.highlighter-icon').src = EXTENSIONPATH + "icons/highlighter-32.png";
        document.querySelector('img#eraser.highlighter-icon').src = EXTENSIONPATH + "icons/eraser-32.png";
    }

    attachHandlers() {        
        Array.from(document.querySelectorAll('#highlighter-overlay .icon-container')).forEach(function(element) {
            element.addEventListener('click', iconClickHandler);
        });
        document.querySelector("#highlighter-overlay #close-overlay").addEventListener("click", function() {
            this.parentElement.style.display = "none";
            document.querySelector('#highlighter-overlay #canvas-container').className = 'expanded';
            drawEnabled = true;
        });
        document.querySelector("#highlighter-overlay #confirm-overlay").addEventListener('click', function() {
            this.parentNode.parentElement.style.display = "none";
            document.querySelector('#highlighter-overlay #canvas-container').className = 'expanded';
            drawEnabled = true;
        });
    }

    insertOverlay() {
        var request = new XMLHttpRequest();
        request.open('GET', EXTENSIONPATH + "content-scripts/html/highlight.html", true);
        request.overrideMimeType("text/plain; charset=utf-8");
        request.send();
        request.onreadystatechange = function() {
            if((request.readyState === 4) && (request.status == 200) || ((request.status == 0))) {
                document.body.innerHTML += request.responseText;
            }
        };
    }

    closeOverlay() {
        document.getElementById('highlighter-overlay').remove();
    }
}

function iconClickHandler() {
    var icon = this.firstElementChild;
    if(icon.id === "highlighter") {
        if(!this.classList.contains('active')) {
            disableAllIcons();
            activeIcon = {
                id: "highlighter",
                object: icon
            };
            this.classList.add('active');
            icon.src = EXTENSIONPATH + 'icons/highlighter-32_yellow.png';
            document.querySelector('#highlighter-overlay canvas').style.cursor = "url(" + EXTENSIONPATH + "icons/highlighter-cursor-16.png), pointer";
        } else {
            icon.src = EXTENSIONPATH + 'icons/highlighter-32.png';
            this.classList.remove('active');
            activeIcon = {};
        }
    } else if(icon.id === "eraser") {
        if(!this.classList.contains('active')) {
            activeIcon = {
                id: "eraser",
                object: icon
            };
            disableAllIcons();
            this.classList.add('active');
            icon.src = EXTENSIONPATH + 'icons/eraser-32_red.png';
            document.querySelector('#highlighter-overlay canvas').style.cursor = "url(" + EXTENSIONPATH + "icons/eraser-cursor-16.png), pointer";
        } else {
            this.classList.remove('active');
            icon.src = EXTENSIONPATH + 'icons/eraser-32.png';
            activeIcon = {};
        }
    }
    return true;
}

function drawHighlighter(event) {
    if(drawEnabled && (activeIcon.id == "highlighter")) {
        canvas.context.beginPath();
        canvas.context.arc(event.clientX - canvas.posX, event.clientY, 5, 0, 2 * Math.PI, false);
        canvas.context.fillStyle = '#ff0000';
        canvas.context.fill();
    }
}

function disableAllIcons() {
    activeIcon = {};
    document.querySelector('#highlighter-overlay canvas').style.cursor = "default";
    Array.from(document.querySelectorAll('#highlighter-overlay #controls .icon-container.active')).forEach(function(element) {
        element.classList.remove('active');
        element.firstElementChild.src = EXTENSIONPATH + 'icons/' + element.firstElementChild.id + '-32.png';
    });
}

var highlightorObj = new Highlightor();

function insertHighlighterContent() {
    highlightorObj.insertOverlay();
    setTimeout(function() {
        highlightorObj.insertIcons();
        highlightorObj.attachHandlers();

        canvas.element = document.querySelector('#highlighter-overlay #canvas-drawing');
        canvas.context = canvas.element.getContext('2d');
        canvas.posX = parseInt(canvas.element.offsetLeft, 10);
        canvas.posY = parseInt(canvas.element.offsetTop, 10);

        canvas.element.addEventListener('mousedown', drawHighlighter);
    }, 750);
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