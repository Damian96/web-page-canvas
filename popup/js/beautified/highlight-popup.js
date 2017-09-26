/* globals chrome */

/**
 * The main frontend plugin class.
 * Used for creating the Highlighting Mode layout.
 * Implements the drawing function code. 
 */
class Main {
    constructor() {
        this.activeTool = {
            id: 'paint-brush'
        };
        this.toolInfo = {
            paintBrush: {
                color: '#FFFF00',
                defaultColor: '#FFFF00',
                size: 5,
                opacity: 1
            },
            eraser: {
                size: 5
            }
        };
    }

    init() {
        this.attachHandlers();
    }

    reload() {
        this.attachHandlers();
        this.reloadValues();
    }

    attachHandlers() {
        Array.from(document.querySelectorAll('.tab-title.tool')).forEach(function(element) {
            element.addEventListener('click', this.toolClickHandler.bind(this, element));
        }, this);
        Array.from(document.querySelectorAll('.tab-content.active .color'))
        .forEach(function(element) {
            element.addEventListener('click', this.colorClickHandler.bind(this, element));
        }, this);
        Array.from(document.querySelectorAll('.tab-content.active input.size-range, .tab-content.active input.opacity-range'))
        .forEach(function(element) {
            element.addEventListener('change', this.rangeHandler.bind(this, element));            
        }, this);
    }

    reloadValues() {
        var dataSelector = "[data-tool-id='" + this.activeTool.id + "']";
        var toolElement = document.querySelector(".tab-title" + dataSelector);
        this.toolClickHandler(toolElement);
        if(this.activeTool.id === 'paint-brush') {
            var colorElement = document.querySelector(".tab-content" + dataSelector + " .color[data-color-code='" + this.toolInfo.paintBrush.colorCode)
            var sizeElement = document.querySelector(".tab-content" + dataSelector + " .size-range");
            var opacityElement = document.querySelector(".tab-content" + dataSelector + " .opacity-range");
            this.colorClickHandler(colorElement);
            this.rangeHandler(sizeElement);
            this.rangeHandler(opacityElement);
        } else if(this.activeTool.id === 'eraser') {
            // var sizeElement = document.querySelector(".tab-content" + dataSelector + " .size-range");
        }
    }

    toolClickHandler(element) {
        if(!element.classList.contains('active')) {
            var id = element.dataset.toolId;
            this.disableAllTools();
            element.classList.add('active');
            document.querySelector(".tab-content[data-tool-id='" + id + "']").classList.add('active');
            this.activeTool.id = id;
        }
    }

    colorClickHandler(element) {
        if(!element.classList.contains('active')) {
            var tabContent = element.parentElement.parentElement,
                toolId = tabContent.dataset.toolId,
                colorName = element.title.toLowerCase();
            this.disableAllColors(toolId);
            element.classList.add('active');
            if(toolId === 'paint-brush') {
                this.toolInfo.paintBrush.color = element.dataset.colorCode;
            }
            tabContent.dataset.toolColor = colorName;
            document.querySelector(".tab-title[data-tool-id='" + toolId + "']").dataset.toolColor = colorName;
        }
    }

    rangeHandler(element) {
        var toolId = element.dataset.toolId,
            value = null,
            type = null;
        if(element.classList.contains('size-range')) {
            value = parseFloat(element.value);
            type = 'size';            
            element.nextElementSibling.innerHTML = value + 'px';
        } else if(element.classList.contains('opacity-range')) {
            type = 'opacity';
            value = 1 - parseFloat(element.value);
            if((value > 0) && (value < 1)) {
                element.nextElementSibling.innerHTML = element.value.charAt(2) + '0%';
            } else if(value == 0) {
                element.nextElementSibling.innerHTML = '100%';
            } else if(value == 1) {
                element.nextElementSibling.innerHTML = '0%';
            }
        }
        if((toolId === 'paint-brush') && (value != null)) {
            if(type === 'size') {
                this.toolInfo.paintBrush.size = value;
            } else if(type === 'opacity') {
                this.toolInfo.paintBrush.opacity = value;
            }
        } else if((toolId === 'eraser') && (type === 'size') && (value != null)) {
            this.toolInfo.eraser.size = value;
        }
    }

    disableAllTools() {
        Array.from(document.querySelectorAll('.tab-title.active, .tab-content.active'))
        .forEach(function(element) {
            element.classList.remove('active');
        });
    }

    disableAllColors(toolId) {
        var contentSelector = ".tab-content[data-tool-id='" + toolId + "']";
        Array.from(document.querySelectorAll(contentSelector + " .color.active"))
        .forEach(function(element) {
            element.classList.remove('active');
        }, this);
    }
}

window.onbeforeunload = function() {
    chrome.runtime.sendMessage({saveObject: true, data: JSON.stringify(object)});
}

chrome.runtime.onMessage.addListener(function(request, sender) {
    if((request.message === 'initMain')) {
        if(!data) {
            var object = new Main();
            object.init();
        } else {
            var object = JSON.parse(request.data);
            object.reload();
        }
    }
});