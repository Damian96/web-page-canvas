var tabID,canvasFrame=document.createElement("iframe"),canvasImages=[],imagesLoaded=0,snapshots={},finalCanvas={element:document.createElement("CANVAS")};finalCanvas.context=finalCanvas.element.getContext("2d");var resetFinalCanvas=function(){finalCanvas.element=document.createElement("CANVAS"),finalCanvas.context=finalCanvas.element.getContext("2d")},getMaxHeight=function(){return Math.max(window.innerHeight,document.body.offsetHeight,document.body.scrollHeight,document.body.clientHeight,document.documentElement.offsetHeight,document.documentElement.clientHeight,document.documentElement.scrollHeight)},getMaxWidth=function(){return Math.max(window.innerWidth,document.body.offsetWidth,document.body.scrollLeft)},scrollToTop=function(e){setTimeout(function(){window.scrollTo(0,0)},e)},insertCanvas=function(e){canvasFrame.width=getMaxWidth(),canvasFrame.height=getMaxHeight(),canvasFrame.style.cssText="position: absolute; z-index: 123400000; top: 0; left: 0; min-width: 100%; min-height: 100%;",document.body.style.overflowX="hidden",canvasFrame.src=e,document.body.appendChild(canvasFrame)},saveCanvas=function(){return resetFinalCanvas(),window.scrollTo(0,0),new Promise((e,n)=>{chrome.runtime.sendMessage({message:"take-snapshot",data:{windowHeight:window.innerHeight,pageHeight:getMaxHeight()}},function(t){null!=t&&t.hasOwnProperty("data")?t.hasOwnProperty("error")?n(t.error):e(t.data):n()})})},loadImages=function(e){return canvasImages=[],imagesLoaded=0,new Promise(n=>{e=e;for(let t of e){let a=new Image;finalCanvas.element.width=getMaxWidth(),finalCanvas.element.height=getMaxHeight(),a.dataset.x=t.x,a.dataset.y=t.y,a.onload=function(t){finalCanvas.context.drawImage(t,parseInt(t.dataset.x),parseInt(t.dataset.y)),++imagesLoaded==e.length&&n(finalCanvas.element.toDataURL("image/png"))}.bind(null,a),a.src=t.src,canvasImages.push(a)}})};chrome.runtime.onMessage.addListener(function(e,n,t){return console.log(e),null!=e&&e.hasOwnProperty("message")&&("close-canvas"==e.message?canvasFrame.remove():"save-canvas"==e.message?(scrollToTop(0),saveCanvas().then(function(e){"object"==typeof e&&loadImages(e).then(function(e){let n=document.querySelector("iframe[src^='chrome-extension']");n.contentWindow.postMessage("reset-toolbar",n.src),t({message:"saved",data:e})}),scrollToTop(1e3)}).catch(function(e){scrollToTop(1e3)})):"scroll-top"==e.message&&(window.scrollTo(0,window.scrollY+window.innerHeight),t({message:"Scrolled"}))),!0});