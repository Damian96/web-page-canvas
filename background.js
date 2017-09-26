/* globals chrome */

var canvasOpen = [];
var popupObjects = [];

chrome.browserAction.onClicked.addListener(function(tab) {
    if(popupObjects[tab.id] != null) {
        chrome.runtime.sendMessage({message: 'initMain', data: popupObjects[tab.id]});
    } else {
        chrome.runtime.sendMessage({message: 'initMain', data: false});
    }
    // if(canvasOpen[tab.id] == null) {
    //     canvasOpen[tab.id] = true;
    // } else if(canvasOpen[tab.id]) {
    //     canvasOpen[tab.id] = undefined;
    // }
});

chrome.tabs.onUpdated.addListener(handleUpdated);

function handleUpdated(tabId) {
    if(canvasOpen[tabId]) {
        canvasOpen[tabId] = undefined;
    }
}

chrome.runtime.onMessage.addListener(function(request, sender) {
    if((request.saveObject != null) && request.saveObject) {
        popupObjects[sender.tab.id] = request.data;
    }
});