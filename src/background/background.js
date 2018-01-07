/* globals chrome */

var popupObjects = [],
    removePopupObject = function(tabID) {
        if(tabID != null && popupObjects[tabID] != null) {
            popupObjects[tabID].overlayOpen = false;
        }
    },
    sendResizeMessage = function (tabID) {
        if(tabID != null && popupObjects[tabID] != null) {
            chrome.tabs.sendMessage(tabID, { message: 'resize-canvas'});
        }
    },
    welcomePageStorageKey = 'webPageCanvas_welcomePage';

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if(request.hasOwnProperty('message')) {
        if(sender.hasOwnProperty('tab')) {
            if(request.message == 'get-tool-info') {
                sendResponse(popupObjects[sender.tab.id]);
            } else if(request.message == 'manually-disabled-canvas') {
                popupObjects[sender.tab.id].overlayOpen = false;
            }
        } else {
            if(request.message == 'init-object' && request.hasOwnProperty('tabID')) {
                if(popupObjects[request.tabID] != null) {
                    sendResponse({message: 'sending-popup-object-data', data: popupObjects[request.tabID]});
                } else {
                    sendResponse({message: 'do-it-yourself'});
                }
            }
        }
    }
    return true;
});

chrome.tabs.onZoomChange.addListener(sendResizeMessage);

chrome.tabs.onUpdated.addListener(removePopupObject);

chrome.tabs.onRemoved.addListener(removePopupObject);

window.onload = function() {

    chrome.storage.local.get(welcomePageStorageKey, function(items) {

        if(items[welcomePageStorageKey] == null || !items[welcomePageStorageKey]) {

            chrome.tabs.create({
                "url": chrome.extension.getURL('about/about.html')
            });

            chrome.storage.local.set({ [welcomePageStorageKey]: true });
        }
    });

};