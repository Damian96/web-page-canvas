/* globals browser */

var popupObjects = [],
    removePopupObject = function (tabID) {
        if (popupObjects[tabID] != null)
            popupObjects[tabID].overlayOpen = false;
    },
    sendResizeMessage = function (tabID) {
        if (popupObjects[tabID] != null)
            browser.tabs.sendMessage(tabID, { message: 'resize-canvas' });
    },
    getCurrentTab = function () {
        return new Promise((resolve, reject) => function () {
            browser.tabs.query({ currentWindow: true, active: true }).then(function (tabs) {
                if (tabs.length == 0)
                    resolve(tabs[0]);
                else
                    reject();
            });
        });
    },
    welcomePageStorageKey = 'webPageCanvas_welcomePage';

browser.runtime.onMessage.addListener(function (request, sender, sendResponse) {

    if (request.hasOwnProperty('message')) {
        if (sender.hasOwnProperty('tab')) {
            if (request.message == 'get-tool-info')
                sendResponse(popupObjects[sender.tab.id]);
            else if (request.message == 'manually-closed-canvas')
                popupObjects[sender.tab.id].overlayOpen = false;
            else if (request.message == 'save-last-canvas' && request.hasOwnProperty('data'))
                popupObjects[sender.tab.id].lastCanvas = request.data;
            else if (request.message == 'close-canvas') {
                if (request.data != null) {
                    popupObjects[sender.tab.id].lastCanvas = request.data;
                }
                browser.tabs.executeScript(sender.tab.id, {
                    code: "document.querySelector('iframe[src^=\"chrome-extension\"]').remove();"
                });
                popupObjects[sender.tab.id].overlayOpen = false;
            }
        } else {
            if (request.message == 'init-object' && request.hasOwnProperty('tabID')) {
                if (popupObjects[request.tabID] != null) {
                    sendResponse({ message: 'sending-popup-object-data', data: popupObjects[request.tabID] });
                } else {
                    sendResponse({ message: 'do-it-yourself' });
                }
            }
        }
    }
    return true;
});

browser.tabs.onZoomChange.addListener(sendResizeMessage);

browser.tabs.onUpdated.addListener(removePopupObject);

browser.tabs.onRemoved.addListener(removePopupObject);

window.onload = function () {

    browser.storage.local.get(welcomePageStorageKey, function (items) {

        if (items[welcomePageStorageKey] == null || !items[welcomePageStorageKey]) {

            browser.tabs.create({
                "url": browser.extension.getURL('about/about.html')
            });

            browser.storage.local.set({ [welcomePageStorageKey]: true });
        }
    });

};