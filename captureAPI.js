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
        console.log('initing api');
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
     * @param {Function} onSuccess
     */
    takeSnapshot() {
        console.log('taking snapshot');
        return new Promise((resolve) => {
            if((this.maxSnapshots - this.snapshots.length) > 0) {
                chrome.tabs.captureVisibleTab({format: 'jpeg'}, function(dataUrl) {
                    this.snapshots.push(dataUrl);
                    this.takeSnapshot.call(this);
                }.bind(this));
            } else {
                console.log(this.maxSnapshots, this.snapshots);
                resolve(this.snapshots);
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
            captureObjects[request.data.tabId].takeSnapshot().then((snapshots) => {
                sendResponse({data: snapshots});
            });
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