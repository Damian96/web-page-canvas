/* globals chrome */

var tabInfo,
    background = chrome.extension.getBackgroundPage();

/**
 * The main popup plugin class.
 * @prop {boolean} overlayOpen A flag of whether the webpage canvas is open.
 * @prop {Object.<string, number>} toolInfo The object with all the information of all available tools.
 * @prop {Object.<string, number>} activeTool The object with all the information about the currently active tool.
 * @prop {?Element} switcher The HTML element of the open/close switcher of the extension.
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
            id: 'paintBrush',
            htmlId: 'paint-brush',
            options: this.toolInfo.paintBrush
        };
    }

    init() {
        this.attachHandlers();
    }

    reload(attributes) {
        for(let key in attributes) {
            this[key] = null;
            this[key] = attributes[key];
        }
        this.attachHandlers();
        this.reloadValues();
    }

    reloadValues() {
        if(this.overlayOpen) {
            let switcher = document.getElementById('switcher');
            switcher.classList.remove('off');
            switcher.classList.add('on');
        }
        let dataSelector = "[data-tool-id='" + this.activeTool.htmlId + "']";
        let toolElement = document.querySelector(".tab-title" + dataSelector);
        this.toolClickHandler(toolElement);
        if(this.activeTool.id === 'paintBrush') {
            let colorElement = document.querySelector(".tab-content" + dataSelector + " .color[data-color-code='" + this.toolInfo.paintBrush.color + "']"),
                sizeElement = document.querySelector(".tab-content" + dataSelector + " .size-range");
            sizeElement.value = this.toolInfo.paintBrush.size;
            this.colorClickHandler(colorElement);
            this.sizeHandler(sizeElement);
        } else if(this.activeTool.id === 'eraser') {
            // var sizeElement = document.querySelector(".tab-content" + dataSelector + " .size-range");
        }
    }

    attachHandlers() {
        let switcher = document.getElementById('switcher');
        switcher.addEventListener('click', this.switcherClickHandler.bind(this, switcher));
        for(let element of document.querySelectorAll('.tab-title.tool')) {
            element.addEventListener('click', this.toolClickHandler.bind(this, element));
        }
        for(let element of document.querySelectorAll('.tab-content.active .color')) {
            element.addEventListener('click', this.colorClickHandler.bind(this, element));
        }
        for(let element of document.querySelectorAll('.tab-content.active input.size-range')) {
            element.addEventListener('change', this.sizeHandler.bind(this, element));            
        }
    }
    
    switcherClickHandler(element) {
        if(element.classList.contains('off')) {
            element.classList.remove('off');
            element.classList.add('on');
            background.popupObjects[tabInfo.id] = this;
            chrome.tabs.sendMessage(tabInfo.id,
            {
                message: 'init-canvas', 
                data: this.activeTool
            });
            this.overlayOpen = true;
        } else if(element.classList.contains('on')) {
            element.classList.remove('on');
            element.classList.add('off');
            chrome.tabs.sendMessage(tabInfo.id,
            {
                message: 'close-canvas'
            });
            this.overlayOpen = false;
        }
    }

    toolClickHandler(element) {
        if(!element.classList.contains('active')) {
            let id = element.dataset.toolId;
            this.disableAllTools();
            element.classList.add('active');
            document.querySelector(".tab-content[data-tool-id='" + id + "']").classList.add('active');
            this.changeActiveTool(id);
        }
    }

    changeActiveTool(newId) {
        let id = this.changeToCamelCase(newId);
        this.activeTool = {
            id: id,
            htmlId: (id === 'paintBrush') ? 'paint-brush' : id,
            options: this.toolInfo[id]
        };
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
            let tabContent = element.parentElement.parentElement,
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

    sizeHandler(element) {
        let toolId = element.dataset.toolId,
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
        for(let element of document.querySelectorAll('.tab-title.active, .tab-content.active')) {
            element.classList.remove('active');
        }
    }

    disableAllColors(toolId) {
        let contentSelector = ".tab-content[data-tool-id='" + toolId + "']";
        for(let element of document.querySelectorAll(contentSelector + " .color.active")) {
            element.classList.remove('active');
        }
    }

    /**
     * Changes the given string to a camel case string by removing the hyphens between.
     * @param {string} string 
     */
    changeToCamelCase(string) {
        let hyphenIndex = string.includes('-');
        if(hyphenIndex) {
            let strParts = string.split('-');
            return strParts[0] + strParts[1].charAt(0).toUpperCase() + strParts[1].substr(1, strParts[1].length);
        }
        return string;
    }
}

var object = new Main();

window.onunload = function() {
    background.popupObjects[tabInfo.id] = object;
};

window.onload = function() {
    chrome.tabs.query({active: true}, function(tabArray) {
        let tab = tabArray[0];
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