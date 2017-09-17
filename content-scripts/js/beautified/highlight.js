/**
 * The main frontend plugin class.
 * Used for creating the Highlighting Mode layout.
 * Implements the drawing function code. 
 * @constructor
 * @param {HTMLElement} lastElem - The last element of the document
 */
function Highlightor (lastElem) {    
    this.lastElem = lastElem;
    this.makeOverlay();
}

Highlightor.prototype.makeOverlay = function() {
    var overlay = document.createElement("div");
    overlay.id = "highlighter-overlay";

    var code = document.createElement("div");
    code.id = "highlighter-controls";

    var icons = {};
    icons.highlighter = icons.eraser = icons.disk = new Image(32, 32);
    icons.highlighter.src = browser.extension.getURL("icons/highlighter-32.png");
    icons.highlighter.alt = "highlighter-icon";
    icons.highlighter.title = "Highlighter";
    icons.highlighter.className = "highlighiter-icon";

    var highlighterContainer = document.createElement("span");
    highlighterContainer.className = "highlighter-icon-container";
    highlighterContainer.title = 'Highlighter';
    highlighterContainer.innerHTML = icons.highlighter;
    
    this.lastElem.nextSibling.insertBefore;
}

window.onload = function() {
    // var lastElem = document.body.lastChild;
    console.log(document.body.lastChild);
    // var highlightorObj = new Highlightor(document.body.lastChild);
};