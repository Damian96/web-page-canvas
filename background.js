/* globals chrome */

var highlighterOpen = [];

chrome.browserAction.onClicked.addListener(function(tab) {
    if(highlighterOpen[tab.id] == null) {
        var basePath = chrome.runtime.getURL('/');
        chrome.tabs.executeScript(tab.id,
        {
            code: "var EXTENSIONPATH = '" + basePath + "';"
        });
        chrome.tabs.executeScript(tab.id,
        {
            file: 'content-scripts/js/highlight.min.js'
        });
        chrome.tabs.insertCSS(tab.id,
        {
            file: 'content-scripts/css/highlight.min.css'
        });
        chrome.tabs.insertCSS(tab.id, {
            code: "@font-face { font-family: 'highlighter'; src:  url('" + basePath + "content-scripts/fonts/highlighter.eot?ryk3p1'); src:  url('" + basePath + "content-scripts/fonts/highlighter.eot?ryk3p1#iefix') format('embedded-opentype'), url('" + basePath + "content-scripts/fonts/highlighter.ttf?ryk3p1') format('truetype'), url('" + basePath + "content-scripts/fonts/highlighter.woff?ryk3p1') format('woff'), url('" + basePath + "content-scripts/fonts/highlighter.svg?ryk3p1#highlighter') format('svg'); font-weight: normal; font-style: normal; }"
        });
        chrome.tabs.insertCSS(tab.id,
        {
            file: 'content-scripts/css/icons.min.css'
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