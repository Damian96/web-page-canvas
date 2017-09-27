/* globals chrome */

var tabInfo,
    background = chrome.extension.getBackgroundPage(),
    basePath = chrome.extension.getURL('');

/**
 * The main frontend plugin class.
 * Used for creating the Highlighting Mode layout.
 * Implements the drawing function code. 
 */
class Main {
    constructor() {
        this.overlayOpen = false;
        this.toolInfo = {
            paintBrush: {
                color: '#FFFF00',
                defaultColor: '#FFFF00',
                size: 5
            },
            eraser: {
                size: 5
            }
        };
        this.activeTool = {
            id: 'paint-brush',
            options: this.toolInfo.paintBrush
        };
    }

    init() {
        this.attachHandlers();
    }

    reload(attributes) {
        for(var key in attributes) {
            this[key] = null;
            this[key] = attributes[key];
        }
        this.attachHandlers();
        this.reloadValues();
    }

    restoreSwitcher() {
        var switcher = document.getElementById('switcher');
        if(switcher.classList.contains('on')) {
            switcher.classList.remove('on');
            switcher.classList.add('off');
        }
    }

    attachHandlers() {
        var switcher = document.getElementById('switcher');
        switcher.addEventListener('click', function() {
            if(switcher.classList.contains('off')) {
                switcher.classList.remove('off');
                switcher.classList.add('on');
                background.popupObjects[tabInfo.id] = this;
                chrome.tabs.sendMessage(tabInfo.id,
                {
                    message: 'init-canvas', 
                    data: this.activeTool
                });
                this.overlayOpen = true;
            } else if(switcher.classList.contains('on')) {
                switcher.classList.remove('on');
                switcher.classList.add('off');
                chrome.tabs.sendMessage(tabInfo.id,
                {
                    message: 'close-canvas'
                });
                this.overlayOpen = false;
            }
        }.bind(this, switcher));
        Array.from(document.querySelectorAll('.tab-title.tool')).forEach(function(element) {
            element.addEventListener('click', this.toolClickHandler.bind(this, element));
        }, this);
        Array.from(document.querySelectorAll('.tab-content.active .color'))
        .forEach(function(element) {
            element.addEventListener('click', this.colorClickHandler.bind(this, element));
        }, this);
        Array.from(document.querySelectorAll('.tab-content.active input.size-range'))
        .forEach(function(element) {
            element.addEventListener('change', this.rangeHandler.bind(this, element));            
        }, this);
    }

    reloadValues() {
        if(this.overlayOpen) {
            document.querySelector('#switcher').classList.remove('off');
            document.querySelector('#switcher').classList.add('on');
        }
        var dataSelector = "[data-tool-id='" + this.activeTool.id + "']";
        var toolElement = document.querySelector(".tab-title" + dataSelector);
        this.toolClickHandler(toolElement);
        if(this.activeTool.id === 'paint-brush') {
            var colorElement = document.querySelector(".tab-content" + dataSelector + " .color[data-color-code='" + this.toolInfo.paintBrush.color + "']"),
                sizeElement = document.querySelector(".tab-content" + dataSelector + " .size-range");
            sizeElement.value = this.toolInfo.paintBrush.size;
            this.colorClickHandler(colorElement);
            this.rangeHandler(sizeElement);
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
            this.changeActiveTool(id);
        }
    }

    changeActiveTool(newId) {
        this.activeTool.id = newId;
        switch(newId) {
            case 'paint-brush':
                this.activeTool.options = this.toolInfo['paintBrush'];
                break;
            default:
                this.activeTool.options = this.toolInfo[newId];
                break;
        }
        this.updatePageToolInfo();
    }

    updatePageToolInfo() {
        chrome.tabs.sendMessage(tabInfo.id,
        {
            message: 'update-info',
            data: this.activeTool
        });
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
            this.changeActiveTool(toolId);
        }
    }

    rangeHandler(element) {
        var toolId = element.dataset.toolId,
            value = parseFloat(element.value);
        element.nextElementSibling.innerHTML = value + 'px';
        if(toolId === 'paint-brush') {
            this.toolInfo.paintBrush.size = value;
        } else if(toolId === 'eraser') {
            this.toolInfo.eraser.size = value;
        }
        this.changeActiveTool(toolId);
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

var object = new Main();

window.onunload = function() {
    background.popupObjects[tabInfo.id] = object;
};

window.onload = function() {
    chrome.tabs.query({active: true}, function(tabArray) {
        var tab = tabArray[0];
        tabInfo = tab;
        chrome.runtime.sendMessage({message: 'init-object', tabId: tab.id}, function(response) {
            if(response.data !== 'do-it-yourself') {
                object.reload(response.data);
            } else {
                object.init();
            }
        });
    });
};