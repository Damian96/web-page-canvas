var webPageCanvas;class WebPageCanvas{constructor(){this.activeToolInfo={id:"paintBrush",htmlID:"paint-brush",options:{color:"#FFFF00",size:5}},this.canvas={clickX:[],clickY:[],clickDrag:[],clickTool:[],clickColor:[],clickSize:[],isDrawing:!1,element:null,context:null},this.hasDrawings=!1}init(){this.initCanvas(),window.onresize=this.adjustCanvas.bind(this),this.attachHandlers(),this.adjustCanvas()}attachHandlers(){for(let t of document.querySelectorAll(".tool-container, .option-container"))t.addEventListener("click",this.onToolClickHandler.bind(this,t));for(let t of document.querySelectorAll("span.color[data-color-code]"))t.addEventListener("click",this.colorClickHandler.bind(this,t));for(let t of document.querySelectorAll("#toolbar-alignment .dropdown-item"))t.addEventListener("click",this.alignClickHandler.bind(this,t));for(let t of document.querySelectorAll(".dropdown input[type='range']"))t.addEventListener("change",this.sizeChangeHandler.bind(this,t));document.querySelector(".option-container[title='Clear All']").addEventListener("click",this.canvas.context.clearAll.bind(this)),document.getElementById("close-toolbar").addEventListener("click",this.destroy.bind(this))}onToolClickHandler(t,s){if(t.dataset.hasDropdown)Array.from(t.children).forEach(function(e){if(e.classList.contains("dropdown")&&e.classList.contains("hidden")){let t=document.querySelector(".dropdown:not(.hidden)");null!=t&&t.classList.add("hidden"),e.classList.remove("hidden"),this.canvas.element.addEventListener("click",function(){e.classList.add("hidden")}.bind(this,e),{once:!0})}else!e.classList.contains("dropdown")||e.classList.contains("hidden")||0!=s.path.indexOf(t)&&1!=s.path.indexOf(t)||e.classList.add("hidden")}.bind(this));else{let t=document.querySelector(".dropdown:not(.hidden)");null!=t&&t.classList.add("hidden")}if(t.classList.contains("tool-container")&&!t.classList.contains("active")){let s=document.querySelector(".tool-container.active");if(null!=s&&s.classList.remove("active"),t.classList.add("active"),"Paint Brush"==t.title){this.activeToolInfo.id="paintBrush",this.activeToolInfo.htmlID="paint-brush",this.sizeChangeHandler.call(this,document.querySelector("input[type='range'][data-tool='paint-brush']")),this.activeToolInfo.options.color=document.querySelector(".tool-container[title='Paint Brush'] span.color.active").dataset.colorCode}else if("Eraser"==t.title){this.activeToolInfo.id=this.activeToolInfo.htmlID="eraser",this.sizeChangeHandler.call(this,document.querySelector("input[type='range'][data-tool='eraser']"))}}}alignClickHandler(t){let s=document.getElementById("toolbar");t.classList.contains("top")&&!s.classList.contains("aligned-top")?(s.classList.remove("aligned-bottom"),s.classList.add("aligned-top")):t.classList.contains("bottom")&&!s.classList.contains("aligned-bottom")&&(s.classList.remove("aligned-top"),s.classList.add("aligned-bottom"))}sizeChangeHandler(t){"paint-brush"==t.dataset.tool?t.nextElementSibling.innerText=t.value:"eraser"==t.dataset.tool&&(t.nextElementSibling.innerText=t.value),this.activeToolInfo.options.size=parseInt(t.value)}colorClickHandler(t){if(!t.classList.contains("active")){document.querySelector("span.color.active[data-color-code]").classList.remove("active"),t.classList.add("active");let s=document.querySelector(".icon-paint-brush"),e=t.dataset.colorCode;e&&("Black"==t.title?(s.classList.add("black"),s.classList.remove("green"),s.classList.remove("purple"),s.classList.remove("brown")):"Green"==t.title?(s.classList.add("green"),s.classList.remove("black"),s.classList.remove("purple"),s.classList.remove("brown")):"Purple"==t.title?(s.classList.add("purple"),s.classList.remove("black"),s.classList.remove("green"),s.classList.remove("brown")):"Brown"==t.title?(s.classList.add("brown"),s.classList.remove("black"),s.classList.remove("green"),s.classList.remove("purple")):(s.style.color=t.dataset.colorCode,s.classList.remove("black"),s.classList.remove("green"),s.classList.remove("purple"),s.classList.remove("brown"))),this.activeToolInfo.options.color=e}}destroy(){this.hasDrawings?chrome.runtime.sendMessage({message:"close-canvas",data:this.canvas.element.toDataURL()}):chrome.runtime.sendMessage({message:"close-canvas"})}initCanvas(){this.canvas.element=document.querySelector("canvas"),this.canvas.context=this.canvas.element.getContext("2d"),this.canvas.context.fillCircle=function(t,s,e,a){this.fillStyle=a,this.beginPath(),this.moveTo(t,s),this.arc(t,s,e,0,2*Math.PI,!1),this.fill()},this.canvas.context.clearAll=function(){this.hasDrawings=!1,this.canvas.context.clearRect(0,0,this.canvas.element.width,this.canvas.element.height)}.bind(this),this.canvas.element.onmousemove=function(t){this.canvas.isDrawing&&("paintBrush"===this.activeToolInfo.id?(this.addClick(t.offsetX,t.offsetY,!0,this.activeToolInfo.id,this.activeToolInfo.options.size,this.activeToolInfo.options.color),this.draw()):"eraser"===this.activeToolInfo.id&&(this.addClick(t.offsetX,t.offsetY,!0,this.activeToolInfo.id,this.activeToolInfo.options.size,!1,!1),this.erase()))}.bind(this),this.canvas.element.onmousedown=function(t){this.canvas.isDrawing=!0,"paintBrush"===this.activeToolInfo.id?this.addClick(t.offsetX,t.offsetY,!0,this.activeToolInfo.id,this.activeToolInfo.options.size,this.activeToolInfo.options.color):"eraser"===this.activeToolInfo.id&&this.addClick(t.offsetX,t.offsetY,!0,this.activeToolInfo.id,this.activeToolInfo.options.size,!1)}.bind(this),this.canvas.element.onmouseup=function(){this.canvas.isDrawing=!1,this.canvas.clickX=[],this.canvas.clickY=[],this.canvas.clickDrag=[],this.canvas.clickSize=[],this.canvas.clickColor=[],this.canvas.clickTool=[]}.bind(this),this.canvas.element.onmouseleave=function(){this.canvas.isDrawing=!1}.bind(this)}addClick(t,s,e,a,i,n){this.canvas.clickX.push(t),this.canvas.clickY.push(s),this.canvas.clickDrag.push(e),this.canvas.clickTool.push(a),this.canvas.clickSize.push(i),"paintBrush"===a&&n&&this.canvas.clickColor.push(n)}draw(){this.hasDrawings||(this.hasDrawings=!0);for(var t=0;t<this.canvas.clickX.length;t++)this.canvas.context.globalCompositeOperation="source-over",this.canvas.context.lineJoin="round",this.canvas.context.beginPath(),this.canvas.clickDrag[t]&&t?this.canvas.context.moveTo(this.canvas.clickX[t-1],this.canvas.clickY[t-1]):this.canvas.context.moveTo(this.canvas.clickX[t]-1,this.canvas.clickY[t]),this.canvas.context.lineTo(this.canvas.clickX[t],this.canvas.clickY[t]),this.canvas.context.closePath(),this.canvas.context.lineWidth=this.canvas.clickSize[t],"paintBrush"===this.canvas.clickTool[t]&&this.canvas.clickColor[t]&&(this.canvas.context.strokeStyle=this.canvas.clickColor[t],this.canvas.context.stroke())}erase(){for(var t=0;t<this.canvas.clickX.length;t++)this.canvas.context.globalCompositeOperation="destination-out",this.canvas.context.beginPath(),this.canvas.context.lineJoin="round",this.canvas.context.lineWidth=this.canvas.clickSize[t],this.canvas.clickDrag[t]&&t?this.canvas.context.moveTo(this.canvas.clickX[t-1],this.canvas.clickY[t-1]):this.canvas.context.moveTo(this.canvas.clickX[t]-1,this.canvas.clickY[t]),this.canvas.context.lineTo(this.canvas.clickX[t],this.canvas.clickY[t]),this.canvas.context.closePath(),this.canvas.context.stroke()}clearCanvas(){this.hasDrawings=!1,this.canvas.clickX=[],this.canvas.clickY=[],this.canvas.clickDrag=[],this.canvas.context.clearRect(0,0,this.canvas.element.width,this.canvas.element.height)}adjustCanvas(){this.canvas.hasOwnProperty("element")&&(this.canvas.element.width=document.body.offsetWidth,this.canvas.element.height=document.documentElement.scrollHeight)}restoreCanvas(t){var s=document.createElement("img");s.style.width=this.canvas.element.width+"px",s.style.height=this.canvas.element.height+"px",s.onload=function(){this.canvas.context.clearAll(),this.canvas.context.drawImage(s,0,0,this.canvas.element.width,this.canvas.element.height)}.bind(this),s.src=t}}document.addEventListener("DOMContentLoaded",function(){(webPageCanvas=new WebPageCanvas).init()},{once:!0}),chrome.runtime.onMessage.addListener(function(t,s,e){return null!=t&&t.hasOwnProperty("message")&&!t.hasOwnProperty("data")?"close-canvas"==t.message?webPageCanvas.hasDrawings?e({data:webPageCanvas.canvas.element.toDataURL()}):e(null):"save-canvas"==t.message?document.getElementById("toolbar").classList.add("hidden"):"resize-canvas"==t.message&&webPageCanvas.adjustCanvas():null!=t&&t.hasOwnProperty("message")&&t.hasOwnProperty("data")&&"restore-canvas"==t.message&&webPageCanvas.restoreCanvas(t.data),!0}),window.onmessage=function(t){"reset-toolbar"==t.data&&document.getElementById("toolbar").classList.remove("hidden")};