/* globals chrome */

var popupObjects = {},
    removePopupObject = function(tabID) {
        if(popupObjects[tabID] != null)
            popupObjects[tabID].overlayOpen = false;
    },
    sendResizeMessage = function (tabID) {
        if(popupObjects[tabID] != null)
            chrome.tabs.sendMessage(tabID, { message: 'resize-canvas'});
    },
    welcomePageStorageKey = 'webPageCanvas_welcomePage';

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {

    if(request.hasOwnProperty('message') && typeof request.message === 'string') {
        if(sender.hasOwnProperty('tab')) { // message is from content script
            if(request.message == 'get-tool-info')
                sendResponse(popupObjects[sender.tab.id]);
            else if(request.message == 'manually-closed-canvas')
                popupObjects[sender.tab.id].overlayOpen = false;
            else if(request.message == 'save-last-canvas' && request.hasOwnProperty('data'))
                popupObjects[sender.tab.id].lastCanvas = request.data;
            else if(request.message == 'close-canvas') {
                if(request.data != null) {
                    popupObjects[sender.tab.id].lastCanvas = request.data;
                }
                popupObjects[sender.tab.id].overlayOpen = false;
            }
        } else { // message is from popup
            if(!request.message.localeCompare('init-object') && request.hasOwnProperty('tabID')) {
                if(popupObjects.hasOwnProperty(request.tabID)) {
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