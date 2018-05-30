/* globals browser */

var captureObjects = [],
    removeCaptureObject = function(tabID) {
        if(tabID != null && captureObjects.includes(tabID)) {
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
        var result =  Math.floor(this.pageHeight / this.windowHeight),
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
            var remaining = this.maxSnapshots - this.snapshots.length,
                percentage = this.maxSnapshots * 100 / this.snapshots.length;

            if(typeof onSuccess !== 'function') {
                reject('invalid takeSnapshot parameters given!');
            }

            if(this.maxSnapshots > 20 || this.pageHeight > 4000) {
                reject('too tall page to take snapshot');
            }


            if(remaining > 0) {
                setTimeout(function() {
                    browser.tabs.captureVisibleTab(null, {format: 'jpeg'},
                        function(onSuccess, thisArg, param1, dataUrl) {
                            this.snapshots.push(dataUrl);
                            browser.tabs.sendMessage(this.tabID, {message: 'scroll-top'},
                                function(onSuccess, thisArg, param1, response) {
                                    if(response.message == 'Scrolled') {
                                        browser.runtime.sendMessage({
                                            message: 'update-snapshot-process',
                                            data: this.snapshots.length * 100 / this.maxSnapshots
                                        });
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

browser.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if(request.message == 'take-snapshot' && request.data != null) {
        if((sender.tab.id != null) && (request.data.windowHeight != null) && (request.data.pageHeight != null)) {
            captureObjects[sender.tab.id] = new CaptureAPI(sender.tab.id,
                request.data.windowHeight,
                request.data.pageHeight);
            captureObjects[sender.tab.id].init();
            captureObjects[sender.tab.id].takeSnapshot(function(sendResponse, snapshots) {
                var result = [],
                    captureObject = captureObjects[sender.tab.id];
                for(let i = 0; i < snapshots.length; i++) {
                    let y = 0,
                        lastSnapshot = snapshots.length - 1;

                    if(i < lastSnapshot || (i == lastSnapshot && captureObject.maxSnapshots % 1 == 0)) {
                        y = i * captureObject.windowHeight;
                    } else if(i == lastSnapshot && captureObject.maxSnapshots % 1 != 0) {
                        // make y the countered height
                        y = i * captureObject.windowHeight;
                        // remove the difference
                        y -= captureObject.windowHeight - captureObject.maxSnapshots % 1 * captureObject.windowHeight;
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

browser.tabs.onUpdated.addListener(function(tabID) {
    removeCaptureObject(tabID);
});

browser.tabs.onRemoved.addListener(function(tabID) {
    removeCaptureObject(tabID);
});