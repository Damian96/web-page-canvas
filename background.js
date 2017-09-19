var highlighterOpen = {};

browser.browserAction.onClicked.addListener(function() {
    var querying = browser.tabs.query({currentWindow: true, active: true});
    querying.then(function(tabs) {
        if (tabs.length > 0) {
            var gettingInfo = browser.tabs.get(tabs[0].id);
            gettingInfo.then(function(tabInfo) {
                if(typeof highlighterOpen[tabInfo.id] === 'undefined') {
                    var injectUri = browser.tabs.executeScript(
                        tabInfo.id,
                        {
                            code: "var EXTENSIONPATH = '" + browser.extension.getURL('/') + "';"
                        }
                    );
                    var injectJS = browser.tabs.executeScript(
                        tabInfo.id,
                        {
                            file: 'content-scripts/js/highlight.min.js'
                        }
                    );
                    var injectCSS = browser.tabs.insertCSS(
                        tabInfo.id,
                        {
                            file: 'content-scripts/css/highlight.min.css'
                        }
                    );
                    highlighterOpen[tabInfo.id] = true;
                } else if(typeof highlighterOpen[tabInfo.id] === 'boolean') {
                    if(highlighterOpen[tabInfo.id]) {
                        console.log('sending message to hide overlay');
                        browser.tabs.sendMessage(tabInfo.id, {handleOverlay: false});
                        highlighterOpen[tabInfo.id] = false;
                    } else {
                        console.log('sending message to open overlay');
                        browser.tabs.sendMessage(tabInfo.id, {handleOverlay: true});
                        highlighterOpen[tabInfo.id] = true;
                    }
                }
            });
        }
    });
});

browser.tabs.onUpdated.addListener(handleUpdated);

function handleUpdated(tabId, changeInfo, tabInfo) {
    if(typeof highlighterOpen[tabId] !== 'undefined') {
        highlighterOpen[tabId] = undefined;
    }
}