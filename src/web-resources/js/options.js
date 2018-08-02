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
            options: {
                size: $("input[name='size']"),
                brushColor: $("input[name='brushColor']"),
                highlighterColor: $("input[name='highlighterColor']"),
            },
            settings: {
                maxStorage: $("input[name='maxStorage']"),
                clearSnapshots: $("input[name='clearSnapshots']")
            }
        };
        this.storageKeys = {
            options: 'webPageCanvas_options',
            snapshots: 'webPageCanvas_snapshots' 
        };

        this.refreshValues();
        this.attachHandlers();
        $('#options div.button').on('click', this.saveClickHandler.bind(this));
    }

    attachHandlers() {
        this.fields.settings.clearSnapshots.on('change', this.clearChangeHandler.bind(this));
    }

    refreshValues() {
        this.getOptions()
            .then(
            function(options) {
                $.each(options, function(key, value) {
                    if (key === 'size' && parseInt(value) > 0) {
                        this.fields.options.size.val(value);
                    } else if ((key === 'brushColor' || key === 'highlighterColor') && value) {
                        this.fields.options[key].val(value);
                    } else if (key === 'maxStorage' && parseInt(value) > 10) {
                        this.fields.settings.maxStorage.val(value);
                    }
                }.bind(this));
                this.getSnapshots()
                    .catch(function (error) {
                        console.log(error);
                        this.fields.settings.clearSnapshots.attr('disabled', true);
                        this.fields.settings.clearSnapshots.closest('.form-group').addClass('disabled');
                    }.bind(this));
            }.bind(this))
            .catch((error) => {
                console.log(error);
                return;  
            });
    }

    saveClickHandler(event) {
        let options, prevOptions;
        this.getOptions()
            .then(function (options) {
                prevOptions = options;
            })
            .catch(function (error) {
                console.log(error);
            })
            .finally(function () {
                if ($(event.currentTarget).closest('.form-section').is(':first-of-type')) { // options save button clicked
                    options = {
                        size: this.fields.options.size.val(),
                        brushColor: this.fields.options.brushColor.val(),
                        highlighterColor: this.fields.options.highlighterColor.val(),
                        maxStorage: prevOptions != null ? prevOptions.maxStorage : 5
                    };
                } else { // settings save button clicked
                    options = {
                        size: prevOptions != null ? prevOptions.maxStorage : 5,
                        brushColor: prevOptions != null ? prevOptions.brushColor : '#FFFF00',
                        highlighterColor: prevOptions != null ? prevOptions.highlighterColor : '#FFFF00',
                        maxStorage: this.fields.settings.maxStorage.val()
                    };
                }
                chrome.storage.local.set({ [this.storageKeys.options]: JSON.stringify(options) });
            }.bind(this));
    }

    clearChangeHandler(event) {
        if (event.currentTarget.checked) {
            if (window.confirm('Are you sure?')) {
                return true;
            } else {
                event.currentTarget.checked = false;
                return false;
            }
        }
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

    /**
     * @method Promise
     */
    getSnapshots() {
        return new Promise(function (resolve, reject) {
            chrome.storage.local.get(this.storageKeys.snapshots, function (items) {
                console.log(items);
                if (typeof items[this.storageKeys.snapshots] !== 'undefined' && items[this.storageKeys.snapshots] != null && items[this.storageKeys.snapshots].length > 0)
                    resolve(items[this.storageKeys.snapshots]);
                else
                    reject('No snapshots');
            }.bind(this));
        }.bind(this));
    }
}

document.addEventListener("DOMContentLoaded", function() {
    options = new Options();
}, {once: true});