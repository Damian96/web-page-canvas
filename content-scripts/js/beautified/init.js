/* globals EXTENSIONPATH */

function getPageDimensions() {
    return {
        width: Math.max(document.body.scrollWidth, document.body.offsetWidth,
                document.documentElement.clientWidth, document.documentElement.scrollWidth,
                document.documentElement.offsetWidth),
        height: Math.max(document.body.scrollHeight, document.body.offsetHeight,
            document.documentElement.clientHeight, document.documentElement.scrollHeight,
            document.documentElement.offsetHeight)
    };
}

var highlightorObject = document.createElement('object');

highlightorObject.id = 'highlighter-object';
highlightorObject.data =  EXTENSIONPATH + 'content-scripts/html/highlight.html';
var dim = getPageDimensions();
highlightorObject.width = dim.width;
highlightorObject.height = dim.height;
highlightorObject.type = 'text/html';
highlightorObject.style.position = 'absolute';
highlightorObject.style.top = '0';
highlightorObject.style.left = '0';
highlightorObject.style.zIndex = 2147483640;
document.body.appendChild(highlightorObject);

window.onresize = function() {
    var dim = getPageDimensions();
    highlightorObject.width = dim.width;
    highlightorObject.height = dim.height;
};