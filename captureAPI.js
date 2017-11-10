/* globals chrome */

var captureObjects = [],
    removeCaptureObject = function(tabID) {
        if((tabID != null) && (captureObjects[tabID] != null)) {
            captureObjects[tabID] = null;
        }
    };

/**
 * The page capturing helper class.
 * @property {number} tabID
 * @property {number} windowHeight
 * @property {number} pageHeight
 * @property {number} maxSnapshots
 * @property {object} snapshots
 */
class CaptureAPI {

    constructor(tabID, windowHeight, pageHeight) {
        this.tabID = tabID;
        this.windowHeight = windowHeight;
        this.pageHeight = pageHeight;
        this.maxSnapshots = 0;
        this.snapshots = [];
        this.snapshotInterval = 1000;
    }

    /**
     * Initializes the class by 
     * -Calculating maximum snapshots
     * @return {void}
     */
    init() {
        this.maxSnapshots = this.calcMaxSnapshots();
    }

    /**
     * Calculates the maximum snapshots (in floating precision) of the given webpage.
     * @param {number} pageHeight The height of the whole page.
     * @param {number} windowHeight The height of the window.
     * @return {number}
     */
    calcMaxSnapshots() {
        let result =  Math.floor(this.pageHeight / this.windowHeight),
            rest = this.pageHeight % this.windowHeight;
        if(this.windowHeight > rest) {
            result += rest / this.windowHeight;
        }
        return result;
    }
    
    /**
     * Takes the full page snapshot.
     * @param {Function} onSuccess The callback to execute when async job is done.
     * @param {object} thisArg The object scope in which onSuccess function is executed.
     * @param {any} param1 The first parameter passed to onSuccess function.
     */
    takeSnapshot(onSuccess, thisArg, param1) {
        return new Promise((resolve, reject) => {
            let remaining = this.maxSnapshots - this.snapshots.length;
            if(typeof onSuccess !== 'function') {
                reject('invalid takeSnapshot parameters given!');
            }
            if(this.maxSnapshots > 20 || this.pageHeight > 4000) {
                reject('too tall page to take snapshot');
            }
            if(remaining > 0) {
                setTimeout(function() {
                    chrome.tabs.captureVisibleTab({format: 'jpeg'},
                        function(onSuccess, thisArg, param1, dataUrl) {
                            this.snapshots.push(dataUrl);
                            chrome.tabs.sendMessage(this.tabID, {message: 'scrollTop'},
                                function(onSuccess, thisArg, param1, response) {
                                    if(response.message === 'Scrolled' && response.hasOwnProperty('data')) {
                                        chrome.runtime.sendMessage({savingProgress: (this.snapshots.length / this.maxSnapshots) * 100});
                                        this.takeSnapshot.call(this, onSuccess, thisArg, param1);
                                    }
                                }.bind(this, onSuccess, thisArg, param1));
                        }.bind(this, onSuccess, thisArg, param1));
                }.bind(this, onSuccess, thisArg, param1), this.snapshotInterval);
            } else {
                resolve(onSuccess.call(thisArg, param1, this.snapshots));
            }
        });
    }
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if((request.message === 'take-snapshot') && (request.data != null)) {
        if((request.data.tabID != null) && (request.data.windowHeight != null) && (request.data.pageHeight != null)) {
            captureObjects[request.data.tabID] = new CaptureAPI(request.data.tabID,
                request.data.windowHeight,
                request.data.pageHeight);
            captureObjects[request.data.tabID].init();
            captureObjects[request.data.tabID].takeSnapshot(function(sendResponse, snapshots) {
                let result = [],
                    captureObject = captureObjects[request.data.tabID];
                for(let i = 0; i < snapshots.length; i++) {
                    let y = 0;
                    if((i > 0) && (i < (snapshots.length - 1))) {
                        y = i * captureObject.windowHeight;
                    } else if((i > 0) && (i == (snapshots.length - 1))) {
                        if(((captureObject.maxSnapshots % 1) > 0) && ((captureObject.maxSnapshots % 1) < captureObject.maxSnapshots)) {
                            y = i * captureObject.windowHeight + captureObject.pageHeight % captureObject.windowHeight + (captureObject.pageHeight % captureObject.windowHeight) % 1;
                        } else {
                            y = i * captureObject.windowHeight;
                        }
                    } else {
                        y = 0;
                    }
                    result.push({
                        src: snapshots[i],
                        x: 0,
                        y: y
                    });
                }
                sendResponse({data: result});
                return true;
            }, null, sendResponse)
            .then(function(functionRes) {
            })
            .catch(function(error) {
                sendResponse({data: null, error: error});
            });
            return true;
        }
    }
});

chrome.tabs.onUpdated.addListener(function(tabID) {
    removeCaptureObject(tabID);
});

chrome.tabs.onRemoved.addListener(function(tabID) {
    removeCaptureObject(tabID);
});