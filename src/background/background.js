/* globals browser */

var isCanvasOpen = {},
    unseenSnapshots = 0,
    snapshotsStorageKey = "webPageCanvas_snapshots",
    optionsStorageKey = "webPageCanvas_options",
    welcomePageStorageKey = "webPageCanvas_welcomePage",
    removeCanvasOpen = function(tabID) {
        isCanvasOpen[tabID] = false;
    },
    sendResizeMessage = function(tabID) {
        if (isCanvasOpen[tabID])
            browser.tabs.sendMessage(tabID, { message: "resize-canvas" });
    };

browser.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.hasOwnProperty("message") && sender.hasOwnProperty("tab")) {
        // message is from content script
        if (request.message === "manually-closed-canvas")
            isCanvasOpen[sender.tab.id] = false;
    }
    return true;
});

/**
 * Retrieves the options from chrome's storage area
 * @returns {Promise} Returns the options if they exist, else null
 */
var getOptions = function() {
    return new Promise(
        function(resolve, reject) {
            browser.storage.local.get("webPageCanvas_options").then(
                function(items) {
                    if (typeof items["webPageCanvas_options"] !== "string")
                        reject("Error while retrieving plug-in options: ");
                    else resolve(JSON.parse(items["webPageCanvas_options"]));
                }.bind(this)
            );
        }.bind(this)
    );
};

browser.tabs.onZoomChange.addListener(sendResizeMessage);

browser.tabs.onUpdated.addListener(removeCanvasOpen);

browser.tabs.onRemoved.addListener(removeCanvasOpen);

window.onload = function() {
    browser.storage.local.get(welcomePageStorageKey).then(function(items) {
        if (
            items[welcomePageStorageKey] == null ||
            !items[welcomePageStorageKey]
        ) {
            browser.tabs.create({
                url: browser.extension.getURL("about/about.html")
            });

            browser.storage.local.set({
                [snapshotsStorageKey]: "",
                [optionsStorageKey]:
                    '{"size":"5","brushColor":"#FFFF00","highlighterColor":"#FFFF00","maxStorage":"5", "snapshotFormat":"png"}',
                [welcomePageStorageKey]: true
            });
        }
    });
};
