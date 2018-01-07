var webPageCanvas;class WebPageCanvas{constructor(e){this.activeToolInfo=e.tool,this.tabID=e.tabID,this.canvas={clickX:[],clickY:[],clickDrag:[],clickTool:[],clickColor:[],clickSize:[],isDrawing:!1,element:null,context:null},this.snapshots={},this.imagesLoaded=0,this.canvasImages=[],this.fixedElems=[],this.finalCanvas={element:document.createElement("CANVAS")},this.finalCanvas.context=this.finalCanvas.element.getContext("2d"),this.CAPTURED_IMAGE_EXTENSION="png"}init(){this.insertHTML(),this.initCanvas()}resetFinalCanvas(){this.finalCanvas.element=document.createElement("CANVAS"),this.finalCanvas.context=this.finalCanvas.element.getContext("2d")}updateToolInfo(e){this.activeToolInfo=e.tool,this.tabID=e.tabID,this.canvas.clickColor=[],this.canvas.clickDrag=[],this.canvas.clickSize=[],this.canvas.clickTool=[],this.canvas.clickX=[],this.canvas.clickY=[]}insertHTML(){var e="<canvas id='canvas' class='web-page-canvas'></canvas><div id='canvas-close-message' class='web-page-canvas' style='display: none;'>Press <u>ESC</u> to close.</div><div id='canvas-overlay' class='web-page-canvas'><span id='close-overlay' class='web-page-canvas' title='Close'>&#10006;</span><p id='overlay-message' class='web-page-canvas'>Use the tools on the plugin popup window to annotate the page. Have fun!<br/><button id='confirm-message' class='web-page-canvas' title='Close'>&#10003;&nbsp;OK</button></p></div>";document.body.innerHTML+=e;for(var a of document.querySelectorAll("#close-overlay, #confirm-message"))a.addEventListener("click",this.closeIntroMessage.bind(this));this.handleFixedElements(!1),window.onresize=this.adjustCanvas.bind(this),document.body.style.userSelect="none",this.htmlInserted=!0}closeIntroMessage(){document.querySelector("#canvas-overlay.web-page-canvas").remove(),document.querySelector("#canvas-close-message.web-page-canvas").style.display="inline-block",window.onkeydown=function(e){27==e.keyCode&&(this.removeHTML(),chrome.runtime.sendMessage({message:"manually-disabled-canvas"}))}.bind(this)}getMaxHeight(){return Math.max(window.innerHeight,document.body.offsetHeight,document.body.scrollHeight,document.body.clientHeight,document.documentElement.offsetHeight,document.documentElement.clientHeight,document.documentElement.scrollHeight)}getMaxWidth(){return Math.max(window.innerWidth,document.body.offsetWidth,document.body.scrollLeft)}removeHTML(){for(var e of document.querySelectorAll("#canvas.web-page-canvas,#canvas-overlay.web-page-canvas, #canvas-close-message.web-page-canvas, a.web-page-canvas-download"))e.remove();document.body.style.userSelect="initial",this.handleFixedElements(!0),this.htmlInserted=!1}removeGenImages(){for(var e of document.querySelectorAll("img.web-page-canvas-created"))e.remove()}initCanvas(){this.canvas.element=document.querySelector("#canvas.web-page-canvas"),this.canvas.element.width=window.innerWidth,this.canvas.element.height=this.getMaxHeight(),this.canvas.context=this.canvas.element.getContext("2d"),this.canvas.context.fillCircle=function(e,a,s,t){this.fillStyle=t,this.beginPath(),this.moveTo(e,a),this.arc(e,a,s,0,2*Math.PI,!1),this.fill()},this.canvas.context.clearAll=function(){this.canvas.context.clearRect(0,0,this.canvas.element.width,this.canvas.element.height)}.bind(this),this.canvas.element.onmousemove=function(e){var a=e.pageX-this.canvas.element.offsetLeft,s=e.pageY-this.canvas.element.offsetTop;this.canvas.isDrawing&&("paintBrush"===this.activeToolInfo.id?(this.addClick(a,s,!0,this.activeToolInfo.id,this.activeToolInfo.options.size,this.activeToolInfo.options.color),this.draw()):"eraser"===this.activeToolInfo.id&&(this.addClick(a,s,!0,this.activeToolInfo.id,this.activeToolInfo.options.size,!1,!1),this.erase()))}.bind(this),this.canvas.element.onmousedown=function(e){if(this.canvas.isDrawing=!0,"paintBrush"===this.activeToolInfo.id){var a=e.pageX-this.canvas.element.offsetLeft,s=e.pageY-this.canvas.element.offsetTop;this.addClick(a,s,!1,this.activeToolInfo.id,this.activeToolInfo.options.size,this.activeToolInfo.options.color),this.draw()}else"eraser"===this.activeToolInfo.id&&this.erase()}.bind(this),this.canvas.element.onmouseup=function(){this.canvas.isDrawing=!1}.bind(this),this.canvas.element.onmouseleave=function(){this.canvas.isDrawing=!1}.bind(this)}addClick(e,a,s,t,n,i){this.canvas.clickX.push(e),this.canvas.clickY.push(a),this.canvas.clickDrag.push(s),this.canvas.clickTool.push(t),this.canvas.clickSize.push(n),"paintBrush"===t&&i&&this.canvas.clickColor.push(i)}draw(){for(var e=0;e<this.canvas.clickX.length;e++)this.canvas.context.globalCompositeOperation="source-over",this.canvas.context.beginPath(),this.canvas.context.lineJoin="round",this.canvas.context.lineWidth=this.canvas.clickSize[e],this.canvas.clickDrag[e]&&e?this.canvas.context.moveTo(this.canvas.clickX[e-1],this.canvas.clickY[e-1]):this.canvas.context.moveTo(this.canvas.clickX[e]-1,this.canvas.clickY[e]),this.canvas.context.lineTo(this.canvas.clickX[e],this.canvas.clickY[e]),this.canvas.context.closePath(),"paintBrush"===this.canvas.clickTool[e]&&(this.canvas.context.strokeStyle=this.canvas.clickColor[e],this.canvas.context.stroke())}erase(){for(var e=0;e<this.canvas.clickX.length;e++)this.canvas.context.globalCompositeOperation="destination-out",this.canvas.context.beginPath(),this.canvas.context.lineJoin="round",this.canvas.context.lineWidth=this.canvas.clickSize[e],this.canvas.clickDrag[e]&&e?this.canvas.context.moveTo(this.canvas.clickX[e-1],this.canvas.clickY[e-1]):this.canvas.context.moveTo(this.canvas.clickX[e]-1,this.canvas.clickY[e]),this.canvas.context.lineTo(this.canvas.clickX[e],this.canvas.clickY[e]),this.canvas.context.closePath(),this.canvas.context.stroke()}clearCanvas(){this.canvas.clickX=[],this.canvas.clickY=[],this.canvas.clickDrag=[],this.canvas.context.clearRect(0,0,this.canvas.element.width,this.canvas.element.height)}saveCanvas(){return this.resetFinalCanvas(),window.scrollTo(0,0),new Promise((e,a)=>{chrome.runtime.sendMessage({message:"take-snapshot",data:{tabID:this.tabID,windowHeight:window.innerHeight,pageHeight:this.getMaxHeight()}},function(s){null!=s&&s.hasOwnProperty("data")?s.hasOwnProperty("error")?a(s.error):e(s.data):a("something went wrong while saving the canvas")})})}loadImages(e){return this.canvasImages=[],this.imagesLoaded=0,new Promise(a=>{this.snapshots=e;for(var s of this.snapshots){var t=new Image;this.finalCanvas.element.width=this.getMaxWidth(),this.finalCanvas.element.height=this.getMaxHeight(),t.dataset.x=s.x,t.dataset.y=s.y,t.onload=function(e){this.finalCanvas.context.drawImage(e,parseInt(e.dataset.x),parseInt(e.dataset.y)),++this.imagesLoaded==this.snapshots.length&&a(this.finalCanvas.element.toDataURL("image/png"))}.bind(this,t),t.src=s.src,this.canvasImages.push(t)}})}adjustCanvas(){this.canvas.hasOwnProperty("element")&&(this.canvas.element.width=this.getMaxWidth(),this.canvas.element.height=this.getMaxHeight())}handleFixedElements(e){if(e){for(var a of this.fixedElems)a.style.position="fixed";this.fixedElems=[]}else for(var a of document.querySelectorAll("div, nav, section, header")){var s=window.getComputedStyle(a,null).getPropertyValue("position");a.classList.contains("web-page-canvas")||"fixed"!=a.style.position&&"fixed"!=s||(a.style.position="absolute",this.fixedElems.push(a))}}scrollToTop(e){setTimeout(function(){window.scrollTo(0,0)},e)}}chrome.runtime.onMessage.addListener(function(e,a,s){return e.hasOwnProperty("message")&&(e.hasOwnProperty("data")&&("init-canvas"==e.message&&((webPageCanvas=new WebPageCanvas(e.data)).init(),webPageCanvas.handleFixedElements(!1)),null!=webPageCanvas&&"update-info"==e.message&&webPageCanvas.updateToolInfo(e.data)),"close-canvas"==e.message?(webPageCanvas.removeHTML(),webPageCanvas.handleFixedElements(!0)):"scrollTop"==e.message&&(window.scrollTo(0,window.scrollY+window.innerHeight),s({message:"Scrolled"})),null!=webPageCanvas&&webPageCanvas.htmlInserted&&("resize-canvas"==e.message?webPageCanvas.adjustCanvas.call(webPageCanvas):"save-canvas"==e.message&&(document.body.classList.contains("web-page-canvas")||document.body.classList.add("web-page-canvas"),document.getElementById("canvas-close-message").length>0&&document.getElementById("canvas-close-message").remove(),webPageCanvas.scrollToTop(0),webPageCanvas.saveCanvas().then(function(e){"object"==typeof e&&this.loadImages(e).then(function(e){document.body.classList.remove("web-page-canvas"),s({message:"saved",data:e})}),document.body.classList.remove("web-page-canvas"),this.scrollToTop(1e3)}.bind(webPageCanvas)).catch(function(e){webPageCanvas.removeHTML(),this.scrollToTop(1e3),this.handleFixedElements(!0),this.removeHTML()}.bind(webPageCanvas))))),!0});