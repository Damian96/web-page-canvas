/* globals chrome */

var highlighterOpen = [];

chrome.browserAction.onClicked.addListener(function(tab) {
    if(highlighterOpen[tab.id] == null) {
        chrome.tabs.executeScript(tab.id,
        {
            code: "var EXTENSIONPATH = '" + chrome.runtime.getURL('/') + "';"
        });
        chrome.tabs.executeScript(tab.id,
        {
            file: 'content-scripts/js/highlight.min.js'
        });
        chrome.tabs.insertCSS(tab.id,
        {
            file: 'content-scripts/css/highlight.min.css'
        });
        highlighterOpen[tab.id] = true;
    } else if(typeof highlighterOpen[tab.id] === 'boolean') {
        chrome.tabs.sendMessage(tab.id, {handleOverlay: !highlighterOpen[tab.id]});
        highlighterOpen[tab.id] = !highlighterOpen[tab.id];
    }
});

chrome.tabs.onUpdated.addListener(handleUpdated);

function handleUpdated(tabId) {
    if(typeof highlighterOpen[tabId] === 'boolean') {
        highlighterOpen[tabId] = undefined;
    }
}