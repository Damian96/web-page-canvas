/* globals chrome */

var canvasOpen = [];
var popupObjects = [];

chrome.tabs.onUpdated.addListener(handleUpdated);

function handleUpdated(tabId) {
    if(canvasOpen[tabId]) {
        canvasOpen[tabId] = undefined;
    }
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if((request == null) || (request.tabId == null)) {
        return;
    }
    var tabId = request.tabId;
    if(request.message === 'init-object') {
        if(popupObjects[tabId] != null) {
            sendResponse({data: popupObjects[tabId]});
        } else {
            sendResponse({data: 'do-it-yourself'});
        }
    }
});