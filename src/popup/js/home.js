/* globals browser, InvalidPageError */

var background = browser.extension.getBackgroundPage(),
    patterns = {
        fileOrChrome: /^(?:file:\/\/|chrome:\/\/|chrome-extension:\/\/).+$/gim,
        pdf: /^.+\.(?:pdf)$/gim
    },
    popup;

/**
 * @class The plugin's popup homepage class.
 * @prop {boolean} isCanvasOpen A flag of whether the webpage canvas is open.
 * @prop {Tab} tab The chrome's Tab object of the current tab.
 * @prop {boolean} isValidpage If the current webpage is proper for opening the extension.
 */
class Popup {
    /**
     * @constructor
     */
    constructor(tab) {
        this.isCanvasOpen = background.isCanvasOpen.hasOwnProperty(tab.id);
        this.tab = tab;

        this.checkNewSnapshots();

        if (
            !patterns.fileOrChrome.test(this.tab.url) &&
            !patterns.pdf.test(this.tab.url)
        ) {
            this.isValidpage = true;
            this.attachHandlers();
        } else {
            this.isValidPage = false;
            this.disableMenu();
            throw new InvalidPageError("Cannot execute plug-in here");
        }
    }

    /**
     * @method void Attaches the popup event handlers
     */
    attachHandlers() {
        document
            .querySelector("div.title[data-action-id='save']")
            .addEventListener("click", this.saveClickHandler.bind(this));
    }

    /**
     * @method void
     */
    storePopupObject() {
        background.isCanvasOpen[this.tab.id] = this.overlayOpen;
    }

    /**
     * @method void Disables all the popup's menu buttons
     */
    disableMenu() {
        document
            .querySelector("div.title:first-of-type")
            .setAttribute("data-action-id", "disabled");
    }

    /**
     * @method
     */
    checkNewSnapshots() {
        if (background.unseenSnapshots > 0) {
            document
                .querySelector(".title[data-action-id='library']")
                .setAttribute("data-new-snapshots", background.unseenSnapshots);
            document.querySelector(
                ".title[data-action-id='library'] .fa-layers-counter"
            ).innerText = background.unseenSnapshots;
        }
    }

    /**
     * @method Promise Inserts the content script in the current tab
     */
    insertContentScript() {
        return new Promise(
            function(resolve) {
                browser.tabs.insertCSS(
                    this.tab.id,
                    { file: "/content-scripts/css/web-page-canvas.css" },
                    function() {
                        browser.tabs.executeScript(
                            this.tab.id,
                            {
                                file: "/content-scripts/js/web-page-canvas.js"
                            },
                            function() {
                                this.overlayOpen = true;
                                this.storePopupObject();
                                resolve();
                            }.bind(this)
                        );
                    }.bind(this)
                );
            }.bind(this)
        );
    }

    /**
     * @method void
     */
    saveClickHandler() {
        if (typeof _gaq !== "undefined")
            _gaq.push(["_trackEvent", "Save Full Page", "clicked"]);
        window.location.replace("library.html?save=1&tabID=" + this.tab.id);
    }
}

window.onload = function() {
    browser.tabs
        .query({ currentWindow: true, active: true })
        .then(function(tab) {
            try {
                popup = new Popup(tab);
                if (
                    !background.isCanvasOpen[popup.tab.id] ||
                    background.isCanvasOpen[popup.tab.id] == null
                )
                    popup.insertContentScript();
            } catch (error) {
                console.error(error);
            }
        });
};

browser.runtime.onMessage.addListener(function(request) {
    if (request.hasOwnProperty("message") && request.hasOwnProperty("data")) {
        if (!request.message.localeCompare("manually-closed-canvas")) {
            popup.switcherClickHandler.call(
                popup,
                document.getElementById("switcher")
            );
            popup.lastCanvas = request.data;
        }
    }
});
