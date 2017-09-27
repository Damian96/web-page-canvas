/* globals chrome */

var canvasOpen = [];
var popupObjects = [];

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if((sender != null) && (sender.tab != null)) {
        if((request.message != null) && (request.message === 'get-tool-info')) {
            sendResponse(popupObjects[sender.tab.id]);
        }
    } else if((request != null) && (request.tabId != null)) {
        var tabId = request.tabId;
        if(request.message === 'init-object') {
            if(popupObjects[tabId] != null) {
                sendResponse({data: popupObjects[tabId]});
            } else {
                sendResponse({data: 'do-it-yourself'});
            }
        }
    }
});

chrome.tabs.onUpdated.addListener(function(tabId) {
    if((tabId != null) && (popupObjects[tabId] != null)) {
        popupObjects[tabId].overlayOpen = false;
    }
});