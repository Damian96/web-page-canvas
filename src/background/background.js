/* globals chrome */

var isCanvasOpen = {},
    unseenSnapshots = 0,
    snapshotsStorageKey = 'webPageCanvas_snapshots',
    optionsStorageKey = 'webPageCanvas_options',
    welcomePageStorageKey = 'webPageCanvas_welcomePage',
    removeCanvasOpen = function (tabID) {
        isCanvasOpen[tabID] = false;
    },
    sendResizeMessage = function (tabID) {
        if(isCanvasOpen[tabID])
            chrome.tabs.sendMessage(tabID, { message: 'resize-canvas'});
    };

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if(request.hasOwnProperty('message') && sender.hasOwnProperty('tab')) { // message is from content script
        if (request.message === 'manually-closed-canvas')
            isCanvasOpen[sender.tab.id] = false;
    }
    return true;
});

/**
 * Retrieves the options from chrome's storage area
 * @returns {Promise} Returns the options if they exist, else null
 */
var getOptions = function() {
    return new Promise(function (resolve, reject) {
        chrome.storage.local.get('webPageCanvas_options', function(items) {
            if ((typeof items['webPageCanvas_options']) !== 'string')
                reject("Error while retrieving plug-in options: ");
            else
                resolve(JSON.parse(items['webPageCanvas_options']));
        }.bind(this));
    }.bind(this));
};

chrome.tabs.onZoomChange.addListener(sendResizeMessage);

chrome.tabs.onUpdated.addListener(removeCanvasOpen);

chrome.tabs.onRemoved.addListener(removeCanvasOpen);

window.onload = function () {

    chrome.storage.local.get(welcomePageStorageKey, function (items) {

        if(items[welcomePageStorageKey] == null || !items[welcomePageStorageKey]) {

            chrome.tabs.create({
                "url": chrome.extension.getURL('about/about.html')
            });

            chrome.storage.local.set({
                [snapshotsStorageKey]: '',
                [optionsStorageKey]: '{"size":"5","brushColor":"#FFFF00","highlighterColor":"#FFFF00","maxStorage":"5", "snapshotFormat":"png"}',
                [welcomePageStorageKey]: true
            });
        }
    });

};