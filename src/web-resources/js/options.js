/* globals chrome, $, jQuery */
var options;

/**
 * @class The plug-in's options class
 * @prop {Object.<string,HTMLElement>} fields The fields of the options form
 * @prop {string} this.storageKeys.options Chrome's storage area key
 */
class Options {

    constructor() {
        if (typeof jQuery === 'undefined')
            return new Error("No jQuery included");

        this.fields = {
            size: $("input[name='size']"),
            brushColor: $("input[name='brushColor']"),
            highlighterColor: $("input[name='highlighterColor']"),
            maxStorage: $("input[name='maxStorage']"),
            clearSnapshots: $("input[name='clearSnapshots']")
        };
        this.storageKeys = {
            options: 'webPageCanvas_options',
            snapshots: 'webPageCanvas_snapshots' 
        };

        this.refreshValues();
        $('#options button').on('click', this.saveClickHandler.bind(this));
    }

    refreshValues() {
        this.getOptions()
            .then(function(options) {
                $.each(options, function(key, value) {
                    if (key === 'size' && parseInt(value) > 0) {
                        this.fields[key].val(value);
                    } else if ((key === 'brushColor' || key === 'highlighterColor') && value) {
                        this.fields[key].val(value);
                    } else if (key === 'maxStorage' && parseInt(value) > 10) {
                        this.fields.maxStorage.val(value);
                    }
                }.bind(this));
            }.bind(this))
            .catch((error) => {
                console.error(error);
                return;  
            });
    }

    saveClickHandler() {
        let options = {
            size: this.fields.size.val(),
            brushColor: this.fields.brushColor.val(),
            highlighterColor: this.fields.highlighterColor.val(),
            maxStorage: this.fields.maxStorage.val()
        };
        if (this.fields.clearSnapshots[0].checked)
            this.clearSnapshots();
        chrome.storage.local.set({ [this.storageKeys.options]: JSON.stringify(options) });
    }

    setOptions(options)  {
        return new Promise(function(resolve) {
            chrome.storage.local.set({ [this.storageKeys.options]: JSON.stringify(options) }, function() {
                resolve();
            });
        }.bind(this));
    }

    /**
     * Retrieves the options from chrome's storage area
     * @returns {Promise} Returns the options if they exist, else null
     */
    getOptions() {
        return new Promise(function (resolve, reject) {
            chrome.storage.local.get(this.storageKeys.options, function(items) {
                if ((typeof items[this.storageKeys.options]) !== 'string')
                    reject("Error while retrieving plug-in options: ");
                else
                    resolve(JSON.parse(items[this.storageKeys.options]));
            }.bind(this));
        }.bind(this));
    }

    /**
     * @method Promise the local snapshots in chrome's local storage.
     */
    clearSnapshots() {
        return new Promise(function (resolve) {
            chrome.storage.local.set({
                [this.storageKeys.snapshots]: null
            }, function() {
                resolve();
            });
        }.bind(this));
    }
}

document.addEventListener("DOMContentLoaded", function() {
    options = new Options();
}, {once: true});