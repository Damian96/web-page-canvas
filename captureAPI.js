/* globals chrome */

var captureObjects = [];

class CaptureAPI {
    constructor(tabId, windowHeight, pageHeight) {
        this.tabId = tabId;
        this.windowHeight = windowHeight;
        this.pageHeight = pageHeight;
        this.maxSnapshots = 0;
        this.snapshots = [];
    }

    init() {
        this.maxSnapshots = this.calcMaxSnapshots();
    }

    calcMaxSnapshots() {
        let result =  Math.floor(this.pageHeight / this.windowHeight);
        let rest = this.pageHeight % this.windowHeight;
        if(this.windowHeight > rest) {
            result += rest / this.windowHeight;
        }
        return result;
    }
    
    /**
     * Takes the full page snapshot.
     * @param {Function} onSuccess The callback to execute when async job is done.
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
                chrome.tabs.captureVisibleTab({format: 'jpeg'},
                    function(onSuccess, thisArg, param1, dataUrl) {
                        this.snapshots.push(dataUrl);
                        chrome.tabs.sendMessage(this.tabId, {message: 'scrollTop'},
                            function(onSuccess, thisArg, param1, response) {
                                if((response != null) && (response.message === 'Scrolled') && (response.data != null)) {
                                    chrome.runtime.sendMessage({savingProgress: (this.snapshots.length / this.maxSnapshots) * 100});
                                    this.takeSnapshot.call(this, onSuccess, thisArg, param1);
                                }
                            }.bind(this, onSuccess, thisArg, param1));
                    }.bind(this, onSuccess, thisArg, param1));
            } else {
                resolve(onSuccess.call(thisArg, param1, this.snapshots));
            }
        });
    }
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if((request.message === 'take-snapshot') && (request.data != null)) {
        if((request.data.tabId != null) && (request.data.windowHeight != null) && (request.data.pageHeight != null)) {
            captureObjects[request.data.tabId] = new CaptureAPI(request.data.tabId,
                request.data.windowHeight,
                request.data.pageHeight);
            captureObjects[request.data.tabId].init();
            captureObjects[request.data.tabId].takeSnapshot(function(sendResponse, snapshots) {
                let result = [],
                    captureObject = captureObjects[request.data.tabId];
                for(let i=0;i < snapshots.length;i++) {
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

function removeCaptureObject(tabId) {
    if((tabId != null) && (captureObjects[tabId] != null)) {
        captureObjects[tabId] = null;
    }
}

chrome.tabs.onUpdated.addListener(function(tabId) {
    removeCaptureObject(tabId);
});

chrome.tabs.onRemoved.addListener(function(tabId) {
    removeCaptureObject(tabId);
});