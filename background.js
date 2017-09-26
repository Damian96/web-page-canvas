/* globals chrome */

var highlighterOpen = [];
var screenshotInjeced = [];

chrome.browserAction.onClicked.addListener(function(tab) {
    if(highlighterOpen[tab.id] == null) {
        var basePath = chrome.runtime.getURL('/');
        chrome.tabs.executeScript(tab.id,
        {
            code: "var EXTENSIONPATH = '" + basePath + "';\n"
        });
        chrome.tabs.executeScript(tab.id,
        {
            file: '/content-scripts/js/init.min.js'
        });
        highlighterOpen[tab.id] = true;
    } else if(highlighterOpen[tab.id]) {
        closeOverlay();
        highlighterOpen[tab.id] = undefined;
    }
});

function closeOverlay(tabId) {
    chrome.tabs.executeScript(tabId,
    {
        code: "highlightorObject.remove();\n"
    });
}

chrome.tabs.onUpdated.addListener(handleUpdated);

function handleUpdated(tabId) {
    screenshotInjeced[tabId] = undefined;
    if(typeof highlighterOpen[tabId] === 'boolean') {
        highlighterOpen[tabId] = undefined;
    }
}

chrome.runtime.onMessage.addListener(function(request, sender) {
    if(sender.tab) {
        if((request.handleOverlay == false)) {
            highlighterOpen[sender.tab.id] = undefined;
            screenshotInjeced[sender.tab.id] = undefined;
        }
        if(request.takeScreenshot && (typeof request.canvasSrc === 'string')) {
            closeOverlay(sender.tab.id);
            var callFn = "takeHighlighterScreenshot('" + request.canvasSrc + "');";
            if(screenshotInjeced[sender.tab.id] == null) {
                chrome.tabs.executeScript(sender.tab.id,
                {
                    file: '/content-scripts/js/html2canvas.min.js'
                });
                var code = "function takeHighlighterScreenshot(src) {";
                code += "if(confirm('Please wait 2 seconds for the page to be rendered.')) {";
                code += "var screenshot = document.createElement('img');\n";
                code += "screenshot.id = 'highlighter-screenshot';\n";
                code += "screenshot.src = src;\n";
                code += "screenshot.style.position = 'absolute';\n";
                code += "screenshot.style.zIndex = 2000000;\n";
                code += "var dimensions = getPageDimensions();\n";
                code += "screenshot.width = dimensions.width;\n";
                code += "screenshot.height = dimensions.height;\n";
                code += "document.body.appendChild(screenshot);\n";
                code += "html2canvas(document.body, {\n";
                code += "onrendered: function(canvas) {\n";
                code += "document.getElementById('highlighter-screenshot').remove();\n";
                code += "var link = document.createElement('a');\n";
                code += "link.className = 'highlighter-download';\n";
                code += "link.href = canvas.toDataURL();\n";
                code += "link.style.display = 'none';\n";
                code += "var date = new Date()\n;";
                code += "link.download = location.hostname + '_' + date.getTime() + '.png';\n";
                code += "document.body.appendChild(link);\n";
                code += "link.click();\n";
                code += "}});\n}\n}";
                setTimeout(function() {
                    chrome.tabs.executeScript(sender.tab.id,
                        {
                            code: code + callFn
                        });
                }, 1000);
                screenshotInjeced[sender.tab.id] = true;
            } else {
                chrome.tabs.executeScript(sender.tab.id,
                {
                    code: callFn
                });
            }
            highlighterOpen[sender.tab.id] = undefined;
        }
    }
});