/* globals chrome */

var background = chrome.extension.getBackgroundPage();

/**
 * The main popup plugin class.
 * @prop {boolean} overlayOpen A flag of whether the webpage canvas is open.
 * @prop {Object.<string, number>} toolInfo The object with all the information of all available tools.
 * @prop {Object.<string, number>} activeTool The object with all the information about the currently active tool.
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
        this.tabId = null;
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
        let save = document.getElementById('save'),
            switcher = document.getElementById('switcher');
        save.addEventListener('click', this.saveClickHandler.bind(this, save));
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
        console.log(this.tabId);
        if(element.classList.contains('off')) {
            console.log('sending message');
            element.classList.remove('off');
            element.classList.add('on');
            background.popupObjects[this.tabId] = this;
            chrome.tabs.sendMessage(this.tabId,
            {
                message: 'init-canvas', 
                data: {
                    tool: this.activeTool,
                    tabId: this.tabId
                }
            });
            this.overlayOpen = true;
        } else if(element.classList.contains('on')) {
            element.classList.remove('on');
            element.classList.add('off');
            chrome.tabs.sendMessage(this.tabId,
            {
                message: 'close-canvas'
            });
            this.overlayOpen = false;
        }
    }

    saveClickHandler(element) {
        chrome.tabs.sendMessage(this.tabId, {message: 'save-canvas'}, function(response) {
            if(response.message === 'saved') {
                this.switcherClickHandler.call(this, document.getElementById('switcher'));
            }
        }.bind(this));
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
        chrome.tabs.sendMessage(this.tabId,
        {
            message: 'update-info',
            data: {
                tool: this.activeTool,
                tabId: this.tabId
            }
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
    background.popupObjects[object.tabId] = object;
};

window.onload = function() {
    chrome.tabs.query({active: true}, function(tabArray) {
        object.tabId = tabArray[0].id;
        chrome.runtime.sendMessage({message: 'init-object', tabId: object.tabId}, function(response) {
            if(response.data !== 'do-it-yourself') {
                object.reload(response.data);
            } else {
                object.init();
            }
        });
    });
};