var webPageCanvas,background=chrome.extension.getBackgroundPage();class webPageCanvasPopup{constructor(){this.overlayOpen=!1,this.toolsOptions={paintBrush:{color:"#FFFF00",defaultColor:"#FFFF00",size:5},eraser:{size:5}},this.activeTool={id:"paintBrush",htmlId:"paint-brush",options:this.toolsOptions.paintBrush},this.activePanel={id:"none",htmlId:"none"},this.localSnapshots=[],this.isProperPage=!0,this.STORAGEAREAKEY="webPageCanvas_screenshots_array"}init(){this.attachHandlers(),this.tabClickHandler.call(this,document.querySelector(".tab-title[data-tool-id='paint-brush']")),this.updateSlideshow(),this.isProperPage||(document.querySelector("#switcher button.on").disabled=!0)}reload(e){for(let t in e)this[t]=e[t];this.attachHandlers(),this.reloadValues(),this.updateSlideshow()}reloadValues(){let e=document.getElementById("switcher"),t="[data-tool-id='"+this.activeTool.htmlId+"']";if("library"==this.activePanel.id?this.tabClickHandler.call(this,document.querySelector(".tab-title.panel[data-panel-id='library']")):"options"==this.activePanel.id?this.tabClickHandler.call(this,document.querySelector(".tab-title.panel[data-panel-id='options']")):this.tabClickHandler.call(this,document.querySelector(".tab-title"+t)),this.overlayOpen?(e.classList.remove("off"),e.classList.add("on"),document.getElementById("save").disabled=!1,null!=this.lastCanvas&&(document.getElementById("restore").disabled=!1)):(e.classList.remove("on"),e.classList.add("off"),document.getElementById("save").disabled=!0),"paintBrush"==this.activeTool.id&&"none"==this.activePanel.id){let e=document.querySelector(".tab-content"+t+" .color[data-color-code='"+this.toolsOptions.paintBrush.color+"']"),s=document.querySelector(".tab-content"+t+" .size-range");s.value=this.toolsOptions.paintBrush.size,this.colorClickHandler(e),this.sizeHandler(s)}else if("eraser"==this.activeTool.id){document.querySelector(".tab-content"+t+" .size-range").value=this.toolsOptions.eraser.size}}updateSlideshow(){chrome.storage.local.get(this.STORAGEAREAKEY,function(e){null!=e[this.STORAGEAREAKEY]&&e[this.STORAGEAREAKEY].length>this.localSnapshots.length?(this.localSnapshots=e[this.STORAGEAREAKEY],this.reloadSlideshowWithLocalSnapshots()):this.localSnapshots.length>0?(this.reloadSlideshowWithLocalSnapshots(),chrome.storage.local.set({[this.STORAGEAREAKEY]:this.localSnapshots})):this.clearSlideshow()}.bind(this))}reloadSlideshowWithLocalSnapshots(){let e=document.getElementById("slideshow"),t=document.getElementById("slide-image"),s=document.getElementById("current-screenshot-number"),a=document.getElementById("total-screenshot-number");e.className="",t.src=this.b64ToBlobURL(this.localSnapshots[this.localSnapshots.length-1]),t.dataset.storageIndex=this.localSnapshots.length-1,s.innerText=this.localSnapshots.length-1==0?1:this.localSnapshots.length,a.innerText=this.localSnapshots.length}clearSlideshow(){let e=document.getElementById("slideshow"),t=document.getElementById("slide-image"),s=document.getElementById("current-screenshot-number"),a=document.getElementById("total-screenshot-number");e.className="empty",t.src=t.dataset.storageIndex=s.innerText=a.innerText="",this.localSnapshots={}}attachHandlers(){let e=document.getElementById("switcher"),t=document.getElementById("clear-screenshots"),s=document.getElementById("restore"),a=document.getElementById("clear-all");document.getElementById("save").addEventListener("click",this.saveClickHandler.bind(this)),e.addEventListener("click",this.switcherClickHandler.bind(this,e)),t.addEventListener("click",this.clearScreenshotsClickHandler.bind(this,t)),s.addEventListener("click",this.restoreClickHandler.bind(this,s)),a.addEventListener("click",this.clearClickHandler.bind(this,a));for(let e of document.querySelectorAll(".tab-title"))e.addEventListener("click",this.tabClickHandler.bind(this,e));for(let e of document.querySelectorAll(".tab-content .color"))e.addEventListener("click",this.colorClickHandler.bind(this,e));for(let e of document.querySelectorAll(".tab-content input.size-range"))e.addEventListener("change",this.sizeHandler.bind(this,e));for(let e of document.querySelectorAll("#slideshow > .screenshot-actions > div"))e.addEventListener("click",this.screenshotActionClickHandler.bind(this,e));for(let e of document.querySelectorAll("#slideshow > .screenshot-navigation > i"))e.addEventListener("click",this.screenshotNavigationClickHandler.bind(this,e))}disableMenu(){Array.from(document.querySelectorAll("#switcher button")).forEach(function(e){e.disabled=!0})}insertDownload(e){let t=new Date;chrome.downloads.download({url:e,filename:"Web-Page-Drawing_"+t.getTime()+".png",saveAs:!0})}switcherClickHandler(e,t=!0){e.classList.contains("off")?(this.overlayOpen=!0,chrome.tabs.sendMessage(this.tabID,{message:"init-canvas",data:{tool:this.activeTool,tabID:this.tabID}}),e.classList.remove("off"),e.classList.add("on"),document.getElementById("save").disabled=!1,null!=this.lastCanvas&&(document.getElementById("restore").disabled=!1)):e.classList.contains("on")&&(this.overlayOpen=!1,t&&chrome.tabs.sendMessage(this.tabID,{message:"close-canvas"}),e.classList.remove("on"),e.classList.add("off"),document.getElementById("save").disabled=!0,document.getElementById("restore").disabled=!0)}restoreClickHandler(e){null!=this.lastCanvas&&chrome.tabs.sendMessage(this.tabID,{message:"restore-canvas",data:this.lastCanvas}),restore.disabled=!0}clearClickHandler(e){this.overlayOpen&&chrome.tabs.sendMessage(this.tabID,{message:"clear-canvas"})}screenshotActionClickHandler(e){let t=document.getElementById("slideshow"),s=document.getElementById("slide-image");""==t.className&&null!=s.src&&(e.classList.contains("download-screenshot")?this.insertDownload(s.src):e.classList.contains("delete-screenshot")&&chrome.storage.local.get(this.STORAGEAREAKEY,function(e,t,s){let a=s[this.STORAGEAREAKEY];document.getElementById("current-screenshot-number"),document.getElementById("total-screenshot-number");"object"==typeof a&&a.length>0&&(a.splice(e.dataset.storageIndex,1),a.length>0?(this.localSnapshots=a,this.reloadSlideshowWithLocalSnapshots()):this.clearSlideshow(),chrome.storage.local.set({[this.STORAGEAREAKEY]:a}))}.bind(this,s,t)))}screenshotNavigationClickHandler(e){let t,s=parseInt(document.getElementById("slide-image").dataset.storageIndex),a=document.getElementById("slide-image"),l=document.getElementById("current-screenshot-number");t="Previous"==e.title?s-1<0?this.localSnapshots.length-1:s-1:s+1>=this.localSnapshots.length?0:s+1,a.dataset.storageIndex=t,l.innerText=t+1,a.src=this.b64ToBlobURL(this.localSnapshots[t])}saveClickHandler(){this.tabClickHandler.call(this,document.querySelector(".tab-title[data-panel-id='library'")),chrome.tabs.sendMessage(this.tabID,{message:"save-canvas"},function(e){null!=e&&e.hasOwnProperty("message")&&e.hasOwnProperty("data")&&"saved"==e.message&&this.insertImage(e.data).then(function(){this.updateSlideshow()}.bind(this))}.bind(this))}tabClickHandler(e){if(!e.classList.contains("active"))if(this.disableAllTabs(),e.classList.add("active"),e.dataset.toolId){let t=e.dataset.toolId;document.querySelector(".tab-content[data-tool-id='"+t+"']").classList.add("active"),this.activePanel.id="none",this.activePanel.htmlId="none",this.changeActiveTool(t)}else{let t=e.dataset.panelId;document.querySelector(".tab-content[data-panel-id='"+t+"']").classList.add("active"),"library"==t?this.localSnapshots.length>0?this.reloadSlideshowWithLocalSnapshots():this.clearSlideshow():"options"==t&&(this.activePanel.id=this.activePanel.htmlId="options"),this.activePanel.id=t,this.activePanel.htmlId=t,this.activeTool.id="paintBrush",this.activeTool.htmlId="paint-brush"}}clearScreenshotsClickHandler(e){this.localSnapshots.length>0&&(chrome.storage.local.set({[this.STORAGEAREAKEY]:null}),this.localSnapshots={},this.reloadSlideshowWithLocalSnapshots())}changeActiveTool(e){let t=this.changeToCamelCase(e);this.activeTool={id:t,htmlId:"paintBrush"==t?"paint-brush":t,options:this.toolsOptions[t]},this.updatePageActiveTool()}updatePageActiveTool(){chrome.tabs.sendMessage(this.tabID,{message:"update-info",data:{tool:this.activeTool,tabID:this.tabID}})}colorClickHandler(e){if(!e.classList.contains("active")){let t=e.parentElement.parentElement,s=t.dataset.toolId,a=e.title.toLowerCase();this.disableAllColors(s),e.classList.add("active"),"paint-brush"===s&&(this.toolsOptions.paintBrush.color=e.dataset.colorCode),t.dataset.toolColor=a,document.querySelector(".tab-title[data-tool-id='"+s+"']").dataset.toolColor=a,this.changeActiveTool(s)}}sizeHandler(e){let t=e.dataset.toolId,s=parseFloat(e.value);e.nextElementSibling.innerHTML=s+"px","paint-brush"===t?this.toolsOptions.paintBrush.size=s:"eraser"===t&&(this.toolsOptions.eraser.size=s),this.changeActiveTool(t)}disableAllTabs(){for(let e of document.querySelectorAll(".tab-title.active, .tab-content.active"))e.classList.remove("active")}disableAllColors(e){let t=".tab-content[data-tool-id='"+e+"']";for(let e of document.querySelectorAll(t+" .color.active"))e.classList.remove("active")}changeToCamelCase(e){let t=e.includes("-");if(t){let t=e.split("-");return t[0]+t[1].charAt(0).toUpperCase()+t[1].substr(1,t[1].length)}return e}animateLoader(e){let t=document.getElementById("slideshow"),s=document.getElementById("passed-bar"),a=document.getElementById("loader-percent");t.classList.contains("loading")||(t.className="loading"),e>=100?(s.style.width="100%",a.innerHTML="100"):(s.style.width=e+"%",a.innerHTML=parseInt(e))}insertImage(e){return new Promise(t=>{chrome.storage.local.get(this.STORAGEAREAKEY,function(e,s){null!=s[this.STORAGEAREAKEY]?this.localSnapshots=s[this.STORAGEAREAKEY].concat([e]):this.localSnapshots=new Array(e);let a=this.b64ToBlobURL(e);chrome.storage.local.set({[this.STORAGEAREAKEY]:this.localSnapshots},function(e){let s=document.getElementById("slide-image"),a=document.getElementById("current-screenshot-number"),l=document.getElementById("total-screenshot-number");s.src=e,s.dataset.storageIndex=this.localSnapshots.length-1,a.innerText=this.localSnapshots.length-1==0?1:this.localSnapshots.length,l.innerText=this.localSnapshots.length,t("success")}.bind(this,a))}.bind(this,e))})}b64ToBlobURL(e){let t=atob(e.split(",")[1]),s=[];for(var a=0;a<t.length;a++)s.push(t.charCodeAt(a));let l=new Blob([new Uint8Array(s)],{type:"image/png"});return URL.createObjectURL(l)}}webPageCanvas=new webPageCanvasPopup,window.onunload=function(){background.popupObjects[webPageCanvas.tabID]=webPageCanvas},window.onload=function(){chrome.tabs.getSelected(null,function(e){webPageCanvas.tabID=e.id;var t=e.url.includes("chrome://")||e.url.includes("chrome-extension://"),s=e.url.includes(".pdf")||e.url.includes(".jpg")||e.url.includes(".gif")||e.url.includes(".jpeg")||e.url.includes(".JPG")||e.url.includes(".PNG")||e.url.includes(".GIF");(e.url.includes("file:///")||t||s)&&(webPageCanvas.isProperPage=!1,webPageCanvas.disableMenu()),chrome.runtime.sendMessage({message:"init-object",tabID:webPageCanvas.tabID},function(e){null!=e&&e.hasOwnProperty("message")&&("do-it-yourself"==e.message?webPageCanvas.init():"sending-popup-object-data"==e.message&&e.hasOwnProperty("data")&&webPageCanvas.reload(e.data))})})},chrome.runtime.onMessage.addListener(function(e){null!=e&&e.hasOwnProperty("message")&&e.hasOwnProperty("data")&&("update-snapshot-process"==e.message?webPageCanvas.animateLoader(e.data):"save-last-canvas"==e.message&&(webPageCanvas.lastCanvas=e.data))});