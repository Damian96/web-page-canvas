/* globals chrome, EXTENSIONPATH, html2canvas */

/**
 * The main frontend plugin class.
 * Used for creating the Highlighting Mode layout.
 * Implements the drawing function code. 
 */
class Highlightor {
    constructor() {
        this.activeIcon = {
            id: 'highlighter'
        };
        this.canvas = {
            clickX: [],
            clickY: [],
            clickDrag: [],
            clickColor: [],
            isDrawing: false,
            brushColor: '#0000FF',
            markerColor: '#FFFF00',
            highlightColor: '#ff0000',
            lineWidth: 5,
            drawEnabled: false,
            element: null,
            context: null
        };
        this.htmlInserted = false;
        this.downloads = 0;
    }

    attachHandlers() {
        var closeIcon = document.querySelector("#close-overlay.highlighter"),
            confirmBtn = document.querySelector("#confirm-message.highlighter");
        closeIcon.addEventListener("click", function() {
            closeIcon.parentElement.style.display = "none";
            this.canvas.drawEnabled = true;
        }.bind(this, closeIcon));
        confirmBtn.addEventListener('click', function() {
            confirmBtn.parentNode.parentElement.style.display = "none";
            this.canvas.drawEnabled = true;
        }.bind(this, confirmBtn));
        Array.from(document.querySelectorAll("#toolbar.highlighter .tool-container")).forEach(function(element) {
            element.addEventListener('click', this.iconClickHandler.bind(this, element));
            element.addEventListener('mouseenter', this.optionsPopupHandler.bind(this, element));
            element.addEventListener('mouseleave', this.optionsPopupHandler.bind(this, element));
        }.bind(this));
        document.querySelector('#toolbar.highlighter #save-page').addEventListener('click', function() {
            var scope = this;
            html2canvas(document.body, {
                onrendered: function(canvas) {
                    var link = document.createElement('a');
                    link.className = "highlighter-download";
                    link.href = canvas.toDataURL();
                    link.download = location.hostname + '_' + scope.getCurrentDate() + '.png';
                    document.body.appendChild(link);
                    link.click();
                }
            });
        }.bind(this));
        document.querySelector('#toolbar.highlighter #toolbar-alignment').addEventListener('click', function() {
            var toolbar = document.querySelector('#toolbar.highlighter');
            if(toolbar.classList.contains('aligned-top')) {
                toolbar.classList.remove('aligned-top');
                toolbar.classList.add('aligned-right');
            } else if(toolbar.classList.contains('aligned-right')) {
                toolbar.classList.remove('aligned-right');
                toolbar.classList.add('aligned-top');                
            }
        });
        document.querySelector('#toolbar.highlighter #close-toolbar').addEventListener('click', function() {
            this.closeOverlay();
            chrome.runtime.sendMessage({overlayStatus: false});
        }.bind(this));
        Array.from(document.querySelectorAll('.highlighter.popup span.color')).forEach(function(element) {
            element.addEventListener('click', this.toolColorClickHandler.bind(this, element));
        }.bind(this));
    }

    insertOverlay() {
        'use strict';
        var request = new XMLHttpRequest();
        request.open('GET', EXTENSIONPATH + "content-scripts/html/highlight.html", true);
        request.overrideMimeType("text/plain; charset=utf-8");
        request.send();
        request.onreadystatechange = function() {
            if((request.readyState === 4) && (request.status == 200) || ((request.status == 0))) {
                document.body.innerHTML += request.responseText;
                this.htmlInserted = true;
            }
        }.bind(this);
    }

    closeOverlay() {
        document.querySelector('#canvas.highlighter').remove();
        document.querySelector('#canvas-overlay.highlighter').remove();
        document.querySelector('#toolbar.highlighter').remove();
    }

    getCurrentDate() {
        var today = new Date();
        var days = today.getDate();
        var months = today.getMonth() + 1;
        var years = today.getFullYear();
        var hours  = today.getHours();
        var minutes = today.getMinutes();
        var seconds = today.getSeconds();

        days = this.addZero(days);
        months = this.addZero(months);
        years = this.addZero(years);
        hours = this.addZero(hours);
        minutes = this.addZero(minutes);
        seconds = this.addZero(seconds);

        return days + '-' + months + '-' + years + '_' + hours + '-' + minutes + '-' + seconds;
    }

    addZero(num) {
        if(num < 10) {
            return '0' + num;
        }
        return num;
    }

    initCanvas() {
        // assign proper variables
        this.canvas.element = document.querySelector('#canvas.highlighter');
        this.canvas.element.width = window.innerWidth;
        this.canvas.element.height = document.documentElement.offsetHeight;
        this.canvas.context = this.canvas.element.getContext('2d');
        this.canvas.context.fillCircle = function(x, y, radius, fillColor) {
            this.fillStyle = fillColor;
            this.beginPath();
            this.moveTo(x, y);
            this.arc(x, y, radius, 0, Math.PI * 2, false);
            this.fill();
        };
        this.canvas.context.clearAll = function() {
            this.canvas.context.clearRect(0, 0, this.canvas.element.width, this.canvas.element.height);
        }.bind(this);
    
        // bind mouse events
        this.canvas.element.onmousemove = function(e) {
            if(this.canvas.drawEnabled && this.canvas.isDrawing && (this.activeIcon.id === 'paint-brush')) {
                var x = e.pageX - this.canvas.element.offsetLeft;
                var y = e.pageY - this.canvas.element.offsetTop;
                this.addClick(x, y, true);
                this.draw();
            }
        }.bind(this);
        this.canvas.element.onmousedown = function(e) {
            if(this.activeIcon.id === 'paint-brush') {
                var x = e.pageX - this.canvas.element.offsetLeft;
                var y = e.pageY - this.canvas.element.offsetTop;
                this.canvas.isDrawing = true;
                this.addClick(x, y, false);            
                this.draw();
            }
        }.bind(this);
        this.canvas.element.onmouseup = function() {
            this.canvas.isDrawing = false;
        }.bind(this);
        this.canvas.element.onmouseleave = function() {
            this.canvas.isDrawing = false;
        }.bind(this);
    }

    addClick(x, y, dragging) {
        this.canvas.clickX.push(x);
        this.canvas.clickY.push(y);
        this.canvas.clickDrag.push(dragging);
        this.canvas.clickColor.push(this.canvas.brushColor);
    }

    draw() {
        this.canvas.context.lineJoin = "round";
        this.canvas.context.lineWidth = this.canvas.lineWidth;
        for(var i=0; i < this.canvas.clickX.length; i++) {
            this.canvas.context.beginPath();
            if(this.canvas.clickDrag[i] && i){
                this.canvas.context.moveTo(this.canvas.clickX[i - 1], this.canvas.clickY[i - 1]);
            } else {
                this.canvas.context.moveTo(this.canvas.clickX[i] - 1, this.canvas.clickY[i]);
            }
            this.canvas.context.lineTo(this.canvas.clickX[i], this.canvas.clickY[i]);
            this.canvas.context.closePath();
            this.canvas.context.strokeStyle = this.canvas.clickColor[i];
            this.canvas.context.stroke();
        }
    }
    
    clearCanvas() {
        this.canvas.clickX = [];
        this.canvas.clickY = [];
        this.canvas.clickDrag = [];
        this.canvas.context.clearRect(0, 0, this.canvas.element.width, this.canvas.element.height);
    }

    iconClickHandler(element) {
        'use strict';
        if(element.title === 'Clear All') {
            this.clearCanvas();
            this.disableAllIcons();
            return;
        }
        var isActive = element.classList.contains('active');
        this.disableAllIcons();
        if(!isActive) {
            element.classList.add('active');
            var icon = element.firstElementChild;
            this.activeIcon.id = icon.id;
            this.changeToolColor(icon.id);
        } else {
            element.style.borderColor = '';
        }
    }

    changeToolColor(iconId) {
        'use strict';
        var element = document.querySelector('#toolbar.highlighter i#' + iconId).parentElement;
        switch(iconId) {
            case 'paint-brush':
                element.style.borderColor = this.canvas.brushColor;
                break;
        }
    }

    toolColorClickHandler(element) {
        'use strict';
        var toolId = element.parentElement.id;
        if((toolId == null) || (toolId === 'eraser')) {
            return;
        }
        switch(toolId) {
            case 'paint-brush':
                this.canvas.brushColor = element.id;
                break;
            case 'highlighter':
                this.canvas.markerColor = element.id;
                break;
        }
        this.changeToolColor(toolId);
    }

    optionsPopupHandler(element, event) {
        'use strict';
        if(event.type === 'mouseenter') {
            var id = element.firstElementChild.id;
            var popup = document.querySelector('#' + id + '.popup.highlighter');
            if(popup == null) {
                return;
            }
            if(popup.classList.contains('hidden')) {
                var x = element.offsetLet + element.offsetWidth;
                var y = element.offsetTop + element.offsetHeight;
                popup.classList.remove('hidden');
                popup.classList.add('visible');
                popup.style.left = x + 'px';
                popup.style.top = y + 'px';
            }
        }
    }

    disableAllIcons() {
        this.activeIcon.id = null;
        Array.from(document.querySelectorAll('#toolbar.highlighter .tool-container.active')).forEach(function(element) {
            element.classList.remove('active');
        });
    }
}

function insertHighlighterContent() {
    'use strict';
    var object = new Highlightor();
    object.insertOverlay();
    setTimeout(function() {
        object.attachHandlers();
        object.initCanvas();
    }, 750);
}

function removeHighlighterContent() {
    'use strict';
    var object = new Highlightor();
    object.closeOverlay();
}

function handleContent(message) {
    if(message.handleOverlay && (document.querySelector('#canvas.highlighter') == null)) {
        insertHighlighterContent();
    } else {
        removeHighlighterContent();
    }
}

chrome.runtime.onMessage.addListener(handleContent);

insertHighlighterContent();