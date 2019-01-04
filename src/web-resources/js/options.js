/* globals chrome, $, jQuery */
var options;

/**
 * @class The plug-in's options class
 * @prop {Object.<string,HTMLElement>} fields The fields of the options form
 * @prop {string} this.storageKeys.options Chrome's storage area key
 */
class Options {
    constructor() {
        if (typeof jQuery === "undefined")
            return new Error("No jQuery included");

        this.fields = {
            options: {
                size: $("input[name='size']"),
                brushColor: $("input[name='brushColor']"),
                highlighterColor: $("input[name='highlighterColor']")
            },
            settings: {
                maxStorage: $("input[name='maxStorage']"),
                deleteSnapshots: $("input[name='deleteSnapshots']"),
                zipSnapshots: $("input[name='zipSnapshots']"),
                snapshotFormat: {
                    png: $("input[name='snapshotFormat'][value='png']"),
                    webp: $("input[name='snapshotFormat'][value='webp']")
                }
            }
        };
        this.storageKeys = {
            options: "webPageCanvas_options",
            snapshots: "webPageCanvas_snapshots"
        };

        this.refreshValues();
        this.attachHandlers();
        $("#options div.button").on("click", this.saveClickHandler.bind(this));
    }

    attachHandlers() {
        this.fields.settings.deleteSnapshots.on(
            "change",
            this.deleteChangeHandler.bind(this)
        );
        this.fields.settings.zipSnapshots.on(
            "click",
            this.zipSnapshots.bind(this)
        );
    }

    refreshValues() {
        this.getOptions()
            .then(
                function(options) {
                    console.log(options);
                    $.each(
                        options,
                        function(key, value) {
                            if (key === "size" && parseInt(value) > 0) {
                                this.fields.options.size.val(value);
                            } else if (
                                (key === "brushColor" ||
                                    key === "highlighterColor") &&
                                value
                            ) {
                                this.fields.options[key].val(value);
                            } else if (
                                key === "maxStorage" &&
                                parseInt(value) > 10
                            ) {
                                this.fields.settings.maxStorage.val(value);
                            } else if (key === "snapshotFormat" && value) {
                                this.fields.settings.snapshotFormat[
                                    value
                                ][0].checked = true;
                            }
                        }.bind(this)
                    );
                    this.getSnapshots().catch(
                        function(error) {
                            console.log(error);
                            this.fields.settings.deleteSnapshots.attr(
                                "disabled",
                                true
                            );
                            this.fields.settings.deleteSnapshots
                                .closest(".form-group")
                                .addClass("disabled");
                        }.bind(this)
                    );
                }.bind(this)
            )
            .catch(error => {
                console.log(error);
                return;
            });
    }

    saveClickHandler(event) {
        if (typeof _gaq !== "undefined")
            _gaq.push(["_trackEvent", "Options Saved", "clicked"]);

        let options, prevOptions;
        this.getOptions()
            .then(function(options) {
                prevOptions = options;
            })
            .catch(function(error) {
                console.log(error);
            })
            .finally(
                function() {
                    if (
                        $(event.currentTarget)
                            .closest(".form-section")
                            .is(":first-of-type")
                    ) {
                        // options save button clicked
                        options = {
                            size: this.fields.options.size.val(),
                            brushColor: this.fields.options.brushColor.val(),
                            highlighterColor: this.fields.options.highlighterColor.val(),
                            maxStorage:
                                prevOptions != null ? prevOptions.maxStorage : 5
                        };
                    } else {
                        // settings save button clicked
                        let snapshotFormat;

                        if (
                            this.fields.settings.snapshotFormat.png[0].checked
                        ) {
                            snapshotFormat = "png";
                        } else if (
                            this.fields.settings.snapshotFormat.webp[0].checked
                        ) {
                            snapshotFormat = "webp";
                        } else snapshotFormat = "png";

                        options = {
                            size:
                                prevOptions != null
                                    ? prevOptions.maxStorage
                                    : 5,
                            brushColor:
                                prevOptions != null
                                    ? prevOptions.brushColor
                                    : "#FFFF00",
                            highlighterColor:
                                prevOptions != null
                                    ? prevOptions.highlighterColor
                                    : "#FFFF00",
                            maxStorage: this.fields.settings.maxStorage.val(),
                            snapshotFormat: snapshotFormat
                        };

                        if (this.fields.settings.deleteSnapshots[0].checked)
                            this.deleteSnapshots();
                    }

                    browser.storage.local.set({
                        [this.storageKeys.options]: JSON.stringify(options)
                    });
                }.bind(this)
            );
    }

    deleteChangeHandler(event) {
        if (event.currentTarget.checked) {
            if (window.confirm("Are you sure?")) {
                this.deleteSnapshots();
                return true;
            } else {
                event.currentTarget.checked = false;
                return false;
            }
        }
    }

    setOptions(options) {
        return new Promise(
            function(resolve) {
                browser.storage.local.set(
                    { [this.storageKeys.options]: JSON.stringify(options) },
                    function() {
                        resolve();
                    }
                );
            }.bind(this)
        );
    }

    /**
     * Retrieves the options from chrome's storage area
     * @returns {Promise} Returns the options if they exist, else null
     */
    getOptions() {
        return new Promise(
            function(resolve, reject) {
                browser.storage.local.get(this.storageKeys.options).then(
                    function(items) {
                        if (typeof items[this.storageKeys.options] !== "string")
                            reject("Error while retrieving plug-in options: ");
                        else
                            resolve(
                                JSON.parse(items[this.storageKeys.options])
                            );
                    }.bind(this)
                );
            }.bind(this)
        );
    }

    /**
     * @method Promise the local snapshots in chrome's local storage.
     */
    deleteSnapshots() {
        return new Promise(
            function(resolve) {
                browser.storage.local.set(
                    {
                        [this.storageKeys.snapshots]: []
                    },
                    function() {
                        resolve();
                    }
                );
            }.bind(this)
        );
    }

    /**
     * @method Promise
     */
    getSnapshots() {
        return new Promise(
            function(resolve, reject) {
                browser.storage.local.get(this.storageKeys.snapshots).then(
                    function(items) {
                        console.log(items);
                        if (
                            typeof items[this.storageKeys.snapshots] !==
                                "undefined" &&
                            items[this.storageKeys.snapshots] != null &&
                            items[this.storageKeys.snapshots].length > 0
                        )
                            resolve(items[this.storageKeys.snapshots]);
                        else reject("No snapshots");
                    }.bind(this)
                );
            }.bind(this)
        );
    }

    /**
     *
     */
    zipSnapshots() {
        return new Promise(
            function(resolve) {
                this.getSnapshots()
                    .then(
                        function(snapshots) {
                            let zip = new JSZip();

                            $.each(
                                snapshots,
                                function(key, src) {
                                    let base64 = this.dataURLtoBase64(src);
                                    zip.file(
                                        "wpc-snapshot-" + key + ".webp",
                                        base64,
                                        { base64: true }
                                    );
                                }.bind(this)
                            );

                            zip.generateAsync({ type: "blob" }).then(function(
                                content
                            ) {
                                let url = URL.createObjectURL(content),
                                    filename =
                                        "wpc-snapshots-" + Date.now() + ".zip";

                                browser.downloads.download({
                                    url: url,
                                    filename: filename,
                                    saveAs: false
                                });
                            });
                        }.bind(this)
                    )
                    .catch(function(error) {
                        console.error(error);
                    });
            }.bind(this)
        );
    }

    dataURLtoBase64(data) {
        return data.replace("data:image/webp;base64,", "");
    }
}

document.addEventListener(
    "DOMContentLoaded",
    function() {
        options = new Options();
    },
    { once: true }
);
