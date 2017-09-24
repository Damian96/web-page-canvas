/* globals chrome, EXTENSIONPATH */

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
            isDrawing: false,
            color: '#faff00',
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
        Array.from(document.querySelectorAll("#toolbar.highlighter .tool-container:not([title='Clear All'])")).forEach(function(element) {
            element.addEventListener('click', this.iconClickHandler.bind(this, element));
        }.bind(this));
        document.querySelector('#toolbar.highlighter #save-page').addEventListener('click', function() {
            var link = document.createElement('a');
            link.src = dataUrl;
            link.download = location.hostname + '_' + this.getCurrentDate();
            document.body.appendChild(link);
            link.click();
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
            if(this.canvas.drawEnabled && this.canvas.isDrawing) {
                this.addClick(e.pageX - this.canvas.element.offsetLeft, e.pageY - this.canvas.element.offsetTop, true);
                this.draw();
            }
        }.bind(this);
        this.canvas.element.onmousedown = function(e) {
            this.canvas.isDrawing = true;
            this.addClick(e.pageX - this.canvas.element.offsetLeft, e.pageY - this.canvas.element.offsetTop);            
            this.draw();
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
    }

    draw() {
        this.canvas.context.strokeStyle = this.canvas.color;
        this.canvas.context.lineJoin = "round";
        this.canvas.context.lineWidth = this.canvas.lineWidth;
                  
        for(var i=0; i < this.canvas.clickX.length; i++) {		
            this.canvas.context.beginPath();
            if(this.canvas.clickDrag[i] && i){
                this.canvas.context.moveTo(this.canvas.clickX[i-1], this.canvas.clickY[i-1]);
            } else {
                this.canvas.context.moveTo(this.canvas.clickX[i]-1, this.canvas.clickY[i]);
            }
            this.canvas.context.lineTo(this.canvas.clickX[i], this.canvas.clickY[i]);
            this.canvas.context.closePath();
            this.canvas.context.stroke();
        }
    }
    
    clearCanvas() {
        this.canvas.context.clearRect(0, 0, this.canvas.context.canvas.width, this.canvas.context.canvas.height); // Clears the canvas
    }

    iconClickHandler(element) {
        var isActive = element.classList.contains('active');
        this.disableAllIcons();
        if(!isActive) {
            element.classList.add('active');
            var icon = element.firstElementChild;
            this.activeIcon.id = icon.id;                    
        } else {
            this.activeIcon.id = null;
        }
    }

    disableAllIcons() {
        this.activeIcon.id = null;
        // document.querySelector('#highlighter-overlay canvas').style.cursor = "default";
        Array.from(document.querySelectorAll('#toolbar.highlighter .tool-container.active')).forEach(function(element) {
            element.classList.remove('active');
        });
    }
}

function insertHighlighterContent() {
    var obj = new Highlightor();
    console.log(domtoimage);
    obj.insertOverlay();
    setTimeout(function() {
        obj.attachHandlers();
        obj.initCanvas();
    }, 750);
}

function removeHighlighterContent() {
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