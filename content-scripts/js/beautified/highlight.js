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
        Array.from(document.querySelectorAll('#highlighter-overlay .highlighter-icon')).forEach(function(element) {
            element.addEventListener('click', iconClickHandler);
        });
        document.querySelector("#highlighter-overlay #close-overlay").addEventListener("click", function() {
            this.parentElement.style.display = "none";
            document.querySelector('#highlighter-overlay #canvas').className = 'expanded';
        });
        document.querySelector("#highlighter-overlay #confirm-overlay").addEventListener('click', function() {
            this.parentNode.parentElement.style.display = "none";
            document.querySelector('#highlighter-overlay #canvas').className = 'expanded';
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
    if(this.id === "highlighter") {
        if(!this.parentNode.classList.contains('active')) {
            this.parentNode.classList.add('active');
            this.src = EXTENSIONPATH + 'icons/highlighter-32_yellow.png';
        } else {
            this.parentNode.classList.remove('active');
        }
    } else if(this.id === "eraser") {
        if(!this.parentNode.classList.contains('active')) {
            this.parentNode.classList.add('active');
            this.src = EXTENSIONPATH + 'icons/eraser-32_red.png';
        } else {
            this.parentNode.classList.remove('active');
        }
    }
    return true;
}

var highlightorObj = new Highlightor();

function insertHighlighterContent() {
    highlightorObj.insertOverlay();
    setTimeout(function() {
        highlightorObj.insertIcons();
        highlightorObj.attachHandlers();
    }, 750);
}

function removeHighlighterContent() {
    highlightorObj.closeOverlay();
}

function handleContent(message) {
    console.log(message.handleOverlay);
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