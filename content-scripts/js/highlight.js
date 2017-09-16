/**
 * The main frontend plugin class.
 * Used for creating the Highlighting Mode layout.
 * Implements the drawing function code. 
 * @class Highlightor
 */
class Highlightor {
    constructor(lastElem) {
        this.lastElem = lastElem;

    }
    
    makeOverlay() {
        var overlay = document.createElement("div");
        overlay.id = "highlighter-overlay";
        overlay.style.position = "fixed";
        overlay.style.zIndex = "100";
        var code = document.createElement("div");
        var icons = {};
        icons.highlighter = new Image(32, 32);
        icons.highlighter.src = browser.extension.getURL("icons/highlighter-32.png");

        code.innerHTML += document.createElement("div").innerHTML("<span class='highliter-icon' title='Highlighter'>");

        // overlay.innerHTML = 
        this.lastElem.insertBefore;
    }
}

window.onload = function() {
    // var lastElem = document.body.lastChild;
    console.log(document.body.lastChild);
    var highlightorObj = new Highlightor(document.body.lastChild);
};