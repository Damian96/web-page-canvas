/* globals chrome */

var isCanvasOpen = {},
    unseenSnapshots = 0,
    optionsStorageKey = 'webPageCanvas_options',
    snapshotsStorageKey = 'webPageCanvas_snapshots',
    welcomePageStorageKey = 'webPageCanvas_welcomePage',
    memoryLimitExceededKey = 'webPageCanvas_memoryLimit',
    removeCanvasOpen = function (tabID) {
        isCanvasOpen[tabID] = false;
    },
    sendResizeMessage = function (tabID) {
        if(isCanvasOpen[tabID])
            chrome.tabs.sendMessage(tabID, { message: 'resize-canvas'});
    },
    setMemoryLimitWarning = function () {
        chrome.storage.local.set({ [memoryLimitExceededKey]: true });
    },
    getOptions = 
    /**
     * Retrieves the options from chrome's storage area
     * @returns {Promise} Returns the options if they exist, else null
     */
    function () {
        return new Promise(function (resolve, reject) {
            chrome.storage.local.get(optionsStorageKey, function (items) {
                if ((typeof items[optionsStorageKey]) !== 'string')
                    reject("Error while retrieving plug-in options: ");
                else
                    resolve(JSON.parse(items[optionsStorageKey]));
            });
        });
    },
    getStorageMBytes = 
    function () {
        return new Promise(function (resolve, reject) {
            chrome.storage.local.getBytesInUse(null, function(bytes) {
                if (bytes > 0)
                    resolve(bytes / 1000000);
                else
                    reject(0);
            });
        });
    },
    getStorageSnapshots = 
    /**
     * Retrieves the library slides from the chrome's storage area.
     * @returns {Promise} Resolving the slides if they exist, else rejecting.
     */
    function () {
        return new Promise((resolve, reject) => {
            chrome.storage.local.get(snapshotsStorageKey, function (items) {
                if (items[snapshotsStorageKey] != null)
                    resolve(items[snapshotsStorageKey]);
                else
                    reject();
            });
        });
    },
    setSnapshots =
    /**
     * @method Promise the local snapshots in chrome's local storage.
     * @param {Array} snapshots The collection of snapshots
     */
    function (snapshots) {
        return new Promise((resolve) => {
            chrome.storage.local.set({
                [snapshotsStorageKey]: snapshots
            }, function () {
                resolve();
            });
        });
    },
    addSnapshot = 
    /**
     * @method void
     * @param {string} snapshotSrc 
     */
    function (snapshotSrc) {
        return new Promise((resolve) => {
            getStorageSnapshots()
                .then(function (snapshots) {
                    setSnapshots(snapshots.concat([snapshotSrc]))
                        .then(() => {
                            resolve();
                        });
                })
                .catch(function () {
                    setSnapshots([snapshotSrc])
                        .then(() => {
                            resolve();
                        });
                })
                .finally(function () {
                    unseenSnapshots++;
                    getOptions()
                        .then(function (options) {
                            if (options.hasOwnProperty('maxStorage')) {
                                let max = parseInt(options.maxStorage);
                                getStorageMBytes()
                                    .then(function (mbytes) {
                                        if (mbytes > max) {
                                            setMemoryLimitWarning();
                                        }
                                    })
                                    .catch(function () {
                                        return;
                                    });
                            }
                        })
                        .catch(function () {
                            return;
                        });
                });
        });
    };

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if(request.hasOwnProperty('message') && sender.hasOwnProperty('tab')) { // message is from content script
        if (request.message === 'manually-closed-canvas')
            isCanvasOpen[sender.tab.id] = false;
        else if (request.message === 'add-snapshot' && typeof request.data === 'string') {
            addSnapshot(request.data)
                .then(() => {
                    
                });
        }
    }
    return true;
});

chrome.tabs.onZoomChange.addListener(sendResizeMessage);

chrome.tabs.onUpdated.addListener(removeCanvasOpen);

chrome.tabs.onRemoved.addListener(removeCanvasOpen);

window.onload = function () {

    chrome.storage.local.get(welcomePageStorageKey, function (items) {

        if(items[welcomePageStorageKey] == null || !items[welcomePageStorageKey]) {

            chrome.tabs.create({
                "url": chrome.extension.getURL('about/about.html')
            });

            chrome.storage.local.set({ [welcomePageStorageKey]: true });
        }
    });

};