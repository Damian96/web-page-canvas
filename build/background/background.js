var popupObjects=[],removePopupObject=function(e){null!=popupObjects[e]&&(popupObjects[e].overlayOpen=!1)},sendResizeMessage=function(e){null!=popupObjects[e]&&chrome.tabs.sendMessage(e,{message:"resize-canvas"})},welcomePageStorageKey="webPageCanvas_welcomePage";chrome.runtime.onMessage.addListener(function(e,a,o){return e.hasOwnProperty("message")&&(a.hasOwnProperty("tab")?"get-tool-info"==e.message?o(popupObjects[a.tab.id]):"manually-disabled-canvas"==e.message?popupObjects[a.tab.id].overlayOpen=!1:"save-last-canvas"==e.message&&e.hasOwnProperty("data")&&(popupObjects[a.tab.id].lastCanvas=e.data):"init-object"==e.message&&e.hasOwnProperty("tabID")&&(null!=popupObjects[e.tabID]?o({message:"sending-popup-object-data",data:popupObjects[e.tabID]}):o({message:"do-it-yourself"}))),!0}),chrome.tabs.onZoomChange.addListener(sendResizeMessage),chrome.tabs.onUpdated.addListener(removePopupObject),chrome.tabs.onRemoved.addListener(removePopupObject),window.onload=function(){chrome.storage.local.get(welcomePageStorageKey,function(e){null!=e[welcomePageStorageKey]&&e[welcomePageStorageKey]||(chrome.tabs.create({url:chrome.extension.getURL("about/about.html")}),chrome.storage.local.set({[welcomePageStorageKey]:!0}))})};