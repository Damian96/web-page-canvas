/* globals browser */
/**
 * @TODO:
 * implement save area
 */

if (typeof WebPageCanvas === "undefined") {
    var webPageCanvas;

    var webPageCanvas_initialize = function() {
        webPageCanvas = new WebPageCanvas();
        webPageCanvas.toggleContent(true);
    };

    /**
     * @class The main frontend plugin class. Used for creating the Drawing Mode layout. Implements the drawing function code
     * @prop {Object.<string, Object>} activeTool The object with all the information about the currently active tool
     * @prop {Object} tabID The chrome ID of the current tab
     * @prop {Object.<string, number>} snapshots Contains the generated snapshots and their position on the final image
     */
    class WebPageCanvas {
        constructor() {
            this.options = {
                size: 5,
                brushColor: "#FFFF00",
                highlighterColor: "#FFFF00",
                snapshotFormat: "webp"
            };

            this.activeTool = {
                id: "paintBrush",
                htmlID: "paint-brush",
                options: {
                    color: this.options.brushColor,
                    size: this.options.size,
                    opacity: 1,
                    assist: false
                }
            };

            this.getOptions()
                .then(
                    function(options) {
                        this.options = {
                            size: parseInt(options.size),
                            brushColor: options.brushColor,
                            highlighterColor: options.highlighterColor,
                            snapshotFormat: options.snapshotFormat
                        };
                        this.activeTool.options.color = this.options.brushColor;
                        this.activeTool.options.size = this.options.size;
                    }.bind(this)
                )
                .catch(() => {
                    console.error("Could not load web-page-canvas's options");
                });

            this.canvas = {
                elm: null,
                cxt: null,
                cX: [],
                cY: [],
                drag: false,
                scY: false
            };

            this.history = {
                collection: [],
                drawStep: 0,
                actionStep: 0,
                backwards: false
            };

            this.page = {
                width: this.getMaxWidth(),
                height: this.getMaxHeight()
            };

            this.hasDrawings = false;

            let finalCanvas = document.createElement("CANVAS");
            this.finalCanvas = {
                element: finalCanvas,
                context: finalCanvas.getContext("2d")
            };

            this.optionsStorageKey = "webPageCanvas_options";
            this.extBase = browser.extension.getURL("/");
        }

        attachHandlers() {
            // Tool, option
            for (let element of document.querySelectorAll(
                ".tool-container, .option-container"
            )) {
                element.addEventListener(
                    "click",
                    this.onToolClickHandler.bind(this)
                );
            }
            // Color picker
            document
                .querySelector("#toolbar.web-page-canvas input[type='color']")
                .addEventListener("change", this.colorChangeHandler.bind(this));
            // Range Change Handler
            for (let element of document.querySelectorAll(
                ".dropdown input[type='range']"
            )) {
                element.addEventListener(
                    "change",
                    this.rangeChangeHandler.bind(this)
                );
            }
            // Highligter assist
            document
                .querySelector(
                    "input[type='checkbox'][data-tool='highlighter']"
                )
                .addEventListener(
                    "change",
                    this.onToolOptionChangeHandler.bind(this)
                );

            // Change input values to specified plug-in options
            document.querySelector(
                "#toolbar.web-page-canvas input[type='color']"
            ).value = this.activeTool.options.color;

            let sizeBar = document.querySelector(
                "#toolbar.web-page-canvas input[type='range'][data-option='size']"
            );
            sizeBar.value = this.activeTool.options.size;
            this.triggerChange(sizeBar);
        }

        /**
         * @method Promise Retrieves the plug-in options
         */
        getOptions() {
            return new Promise(
                function(resolve, reject) {
                    browser.storage.local.get(this.optionsStorageKey).then(
                        function(items) {
                            if (
                                typeof items[this.optionsStorageKey] !==
                                "string"
                            )
                                reject(
                                    "Error while retrieving plug-in options."
                                );
                            else
                                resolve(
                                    JSON.parse(items[this.optionsStorageKey])
                                );
                        }.bind(this)
                    );
                }.bind(this)
            );
        }

        resetFinalCanvas() {
            this.canvasImages = [];
            this.imagesLoaded = 0;
            this.finalCanvas.element.width = this.getMaxWidth();
            this.finalCanvas.element.height = this.getMaxHeight();
            this.finalCanvas.context.clearRect(
                0,
                0,
                this.finalCanvas.element.width,
                this.finalCanvas.element.height
            );
        }

        close() {
            this.toggleContent(false);
            browser.runtime.sendMessage({
                message: "manually-closed-canvas"
            });
        }

        injectHTML() {
            "use strict";

            var node_1 = document.createElement("CANVAS");
            node_1.setAttribute("class", "web-page-canvas");

            var node_2 = document.createElement("DIV");
            node_2.setAttribute("id", "toolbar");
            node_2.setAttribute("class", "web-page-canvas aligned-top closed");

            var node_3 = document.createElement("DIV");
            node_3.setAttribute("id", "tool-col");
            node_2.appendChild(node_3);

            var node_4 = document.createElement("DIV");
            node_4.setAttribute("class", "tool-container active");
            node_4.setAttribute("title", "Paint Brush");
            node_3.appendChild(node_4);

            var node_5 = document.createElement("IMG");
            node_5.setAttribute("src", "/images/paint-brush.svg");
            node_4.appendChild(node_5);

            var node_6 = document.createElement("SPAN");
            node_6.innerHTML = new String("&nbsp;Paint Brush");
            node_6.setAttribute("class", "tool-label");
            node_4.appendChild(node_6);

            var node_7 = document.createElement("DIV");
            node_7.setAttribute("class", "tool-container");
            node_7.setAttribute("title", "Eraser");
            node_3.appendChild(node_7);

            var node_8 = document.createElement("IMG");
            node_8.setAttribute("src", "/images/eraser.svg");
            node_7.appendChild(node_8);

            var node_9 = document.createElement("SPAN");
            node_9.innerHTML = new String("&nbsp;Eraser");
            node_9.setAttribute("class", "tool-label");
            node_7.appendChild(node_9);

            var node_10 = document.createElement("DIV");
            node_10.setAttribute("class", "tool-container");
            node_10.setAttribute("title", "Highlighter");
            node_10.setAttribute("data-has-dropdown", "true");
            node_3.appendChild(node_10);

            var node_11 = document.createElement("IMG");
            node_11.setAttribute("src", "/images/pencil.svg");
            node_10.appendChild(node_11);

            var node_12 = document.createElement("SPAN");
            node_12.innerHTML = new String("&nbsp;Highlighter");
            node_12.setAttribute("class", "tool-label");
            node_10.appendChild(node_12);

            var node_13 = document.createElement("IMG");
            node_13.setAttribute("src", "/images/caret-down.svg");
            node_10.appendChild(node_13);

            var node_14 = document.createElement("DIV");
            node_14.setAttribute("class", "dropdown hidden");
            node_10.appendChild(node_14);

            var node_15 = document.createElement("DIV");
            node_15.setAttribute("class", "row");
            node_14.appendChild(node_15);

            var node_16 = document.createElement("H3");
            node_16.innerHTML = new String("Transparency");
            node_15.appendChild(node_16);

            var node_17 = document.createElement("INPUT");
            node_17.setAttribute("data-tool", "highlighter");
            node_17.setAttribute("type", "range");
            node_17.setAttribute("step", "5");
            node_17.setAttribute("min", "0");
            node_17.setAttribute("max", "100");
            node_17.setAttribute("value", "60");
            node_17.setAttribute("data-option", "transparency");
            node_15.appendChild(node_17);

            var node_18 = document.createElement("SPAN");
            node_18.setAttribute("class", "range-value");
            node_15.appendChild(node_18);

            var node_19 = document.createElement("HR");
            node_15.appendChild(node_19);

            var node_20 = document.createElement("DIV");
            node_20.setAttribute("class", "row");
            node_14.appendChild(node_20);

            var node_21 = document.createElement("H3");
            node_21.innerHTML = new String("Highlighting Assist");
            node_20.appendChild(node_21);

            var node_22 = document.createElement("INPUT");
            node_22.setAttribute("type", "checkbox");
            node_22.setAttribute("data-tool", "highlighter");
            node_22.setAttribute("data-option", "highlighting-assist");
            node_22.setAttribute("checked", "");
            node_20.appendChild(node_22);

            var node_23 = document.createElement("SPAN");
            node_23.innerHTML = new String("Draw only Straight Lines");
            node_23.setAttribute("class", "tool-label");
            node_20.appendChild(node_23);

            var node_24 = document.createElement("DIV");
            node_24.setAttribute("id", "option-col");
            node_2.appendChild(node_24);

            var node_25 = document.createElement("DIV");
            node_25.setAttribute("class", "option-container");
            node_25.setAttribute("title", "Options");
            node_25.setAttribute("data-has-dropdown", "true");
            node_24.appendChild(node_25);

            var node_26 = document.createElement("IMG");
            node_26.setAttribute("src", "/images/cog.svg");
            node_25.appendChild(node_26);

            var node_27 = document.createElement("SPAN");
            node_27.innerHTML = new String("&nbsp;Options");
            node_27.setAttribute("class", "tool-label");
            node_25.appendChild(node_27);

            var node_28 = document.createElement("IMG");
            node_28.setAttribute("src", "/images/caret-down.svg");
            node_25.appendChild(node_28);

            var node_29 = document.createElement("DIV");
            node_29.setAttribute("class", "dropdown hidden");
            node_25.appendChild(node_29);

            var node_30 = document.createElement("DIV");
            node_30.setAttribute("class", "row");
            node_29.appendChild(node_30);

            var node_31 = document.createElement("H3");
            node_31.innerHTML = new String("Color");
            node_30.appendChild(node_31);

            var node_32 = document.createElement("INPUT");
            node_32.setAttribute("data-tool", "options");
            node_32.setAttribute("type", "color");
            node_32.setAttribute("title", "Color");
            node_32.setAttribute("value", "#FFFF00");
            node_30.appendChild(node_32);

            var node_33 = document.createElement("HR");
            node_30.appendChild(node_33);

            var node_34 = document.createElement("DIV");
            node_34.setAttribute("class", "row");
            node_29.appendChild(node_34);

            var node_35 = document.createElement("H3");
            node_35.innerHTML = new String("Size");
            node_34.appendChild(node_35);

            var node_36 = document.createElement("INPUT");
            node_36.setAttribute("data-tool", "options");
            node_36.setAttribute("type", "range");
            node_36.setAttribute("step", "1");
            node_36.setAttribute("min", "1");
            node_36.setAttribute("max", "30");
            node_36.setAttribute("value", "10");
            node_36.setAttribute("data-option", "size");
            node_34.appendChild(node_36);

            var node_37 = document.createElement("SPAN");
            node_37.innerHTML = new String("10");
            node_37.setAttribute("class", "range-value");
            node_34.appendChild(node_37);

            var node_38 = document.createElement("DIV");
            node_38.setAttribute("class", "option-container disabled");
            node_38.setAttribute("title", "Undo");
            node_38.setAttribute("data-action", "undo");
            node_24.appendChild(node_38);

            var node_39 = document.createElement("IMG");
            node_39.setAttribute("src", "/images/undo-arrow.svg");
            node_38.appendChild(node_39);

            var node_40 = document.createElement("SPAN");
            node_40.innerHTML = new String("&nbsp;Undo");
            node_40.setAttribute("class", "tool-label");
            node_38.appendChild(node_40);

            var node_41 = document.createElement("DIV");
            node_41.setAttribute("class", "option-container disabled");
            node_41.setAttribute("title", "Redo");
            node_41.setAttribute("data-action", "redo");
            node_24.appendChild(node_41);

            var node_42 = document.createElement("IMG");
            node_42.setAttribute("src", "/images/redo.svg");
            node_41.appendChild(node_42);

            var node_43 = document.createElement("SPAN");
            node_43.innerHTML = new String("&nbsp;Redo");
            node_43.setAttribute("class", "tool-label");
            node_41.appendChild(node_43);

            var node_44 = document.createElement("DIV");
            node_44.setAttribute("class", "option-container");
            node_44.setAttribute("title", "Clear All");
            node_44.setAttribute("data-action", "clear");
            node_24.appendChild(node_44);

            var node_45 = document.createElement("IMG");
            node_45.setAttribute("src", "/images/circle-cross.svg");
            node_44.appendChild(node_45);

            var node_46 = document.createElement("SPAN");
            node_46.innerHTML = new String("&nbsp;Clear");
            node_46.setAttribute("class", "tool-label");
            node_44.appendChild(node_46);

            var node_47 = document.createElement("DIV");
            node_47.setAttribute("id", "toolbar-alignment");
            node_47.setAttribute("class", "option-container");
            node_47.setAttribute("title", "Change Toolbar Position");
            node_47.setAttribute("data-has-dropdown", "true");
            node_47.setAttribute("data-action", "chage-position");
            node_24.appendChild(node_47);

            var node_48 = document.createElement("IMG");
            node_48.setAttribute("src", "/images/menu.svg");
            node_47.appendChild(node_48);

            var node_49 = document.createElement("SPAN");
            node_49.innerHTML = new String("&nbsp;Alignment");
            node_49.setAttribute("class", "tool-label");
            node_47.appendChild(node_49);

            var node_50 = document.createElement("IMG");
            node_50.setAttribute("src", "/images/caret-down.svg");
            node_47.appendChild(node_50);

            var node_51 = document.createElement("DIV");
            node_51.setAttribute("class", "dropdown hidden");
            node_47.appendChild(node_51);

            var node_52 = document.createElement("DIV");
            node_52.setAttribute("class", "dropdown-item top");
            node_51.appendChild(node_52);

            var node_53 = document.createElement("IMG");
            node_53.setAttribute("src", "./images/align-top.svg");
            node_52.appendChild(node_53);

            var node_54 = document.createElement("SPAN");
            node_54.innerHTML = new String("&nbsp;Align Top");
            node_54.setAttribute("class", "tool-label");
            node_52.appendChild(node_54);

            var node_55 = document.createElement("DIV");
            node_55.setAttribute("class", "dropdown-item bottom");
            node_51.appendChild(node_55);

            var node_56 = document.createElement("IMG");
            node_56.setAttribute("src", "./images/align-bottom.svg");
            node_55.appendChild(node_56);

            var node_57 = document.createElement("SPAN");
            node_57.innerHTML = new String("&nbsp;Align Bottom");
            node_57.setAttribute("class", "tool-label");
            node_55.appendChild(node_57);

            var node_58 = document.createElement("DIV");
            node_58.setAttribute("id", "close-toolbar");
            node_58.setAttribute("class", "option-container");
            node_58.setAttribute("title", "Close Toolbar");
            node_58.setAttribute("data-action", "close");
            node_24.appendChild(node_58);

            var node_59 = document.createElement("IMG");
            node_59.setAttribute("src", "/images/circle-cross.svg");
            node_58.appendChild(node_59);

            document.body.appendChild(node_1); // canvas
            document.body.appendChild(node_2); // toolbar
            node_2.classList.remove("closed");
        }

        toggleContent(add) {
            if (add) {
                this.injectHTML();
                this.initCanvas();
                this.attachHandlers();
                this.adjustCanvas();
            } else {
                for (let element of document.querySelectorAll(
                    ".web-page-canvas"
                ))
                    element.remove();
            }
        }

        saveCanvas() {
            this.resetFinalCanvas();
            this.scrollToTop(0);
            document
                .querySelector("#toolbar.web-page-canvas")
                .classList.add("closed");
            return new Promise((resolve, reject) => {
                browser.runtime
                    .sendMessage({
                        message: "take-snapshot",
                        data: {
                            windowHeight: window.innerHeight,
                            pageHeight: this.getMaxHeight()
                        }
                    })
                    .then(function(response) {
                        if (
                            response != null &&
                            response.hasOwnProperty("data")
                        ) {
                            if (response.hasOwnProperty("error")) {
                                reject(response.error);
                            } else {
                                resolve(response.data);
                            }
                        } else {
                            reject();
                        }
                    });
            });
        }

        /**
         *
         * @param {Object} snapshots
         */
        loadImages(snapshots) {
            this.snapshots = snapshots;

            return new Promise(resolve => {
                var onImgLoad = function(img, x, y) {
                    this.finalCanvas.context.drawImage(img, x, y);
                    if (++this.imagesLoaded == this.snapshots.length) {
                        resolve(
                            this.finalCanvas.element.toDataURL(
                                "image/" + this.options.snapshotFormat,
                                0.25
                            )
                        );
                    }
                }.bind(this);

                for (let snapshot of this.snapshots) {
                    let img = new Image();

                    img.onload = onImgLoad.bind(
                        this,
                        img,
                        snapshot.x,
                        snapshot.y
                    );

                    img.src = snapshot.src;
                    this.canvasImages.push(img);
                }
            });
        }

        onToolClickHandler(event) {
            if (event.currentTarget.dataset.hasDropdown) {
                // Toolbar option has dropdown menu
                for (let child of event.currentTarget.children) {
                    // Is dropdown menu and is hidden
                    if (
                        child.classList.contains("dropdown") &&
                        child.classList.contains("hidden")
                    ) {
                        let activeDropdown = document.querySelector(
                            ".dropdown:not(.hidden)"
                        );
                        if (activeDropdown != null) {
                            activeDropdown.classList.add("hidden");
                        }

                        child.classList.remove("hidden");
                        this.canvas.elm.addEventListener(
                            "mouseenter",
                            function() {
                                child.classList.add("hidden");
                            }.bind(this, child),
                            { once: true }
                        );

                        break;
                    } else if (
                        child.classList.contains("dropdown") &&
                        !child.classList.contains("hidden")
                    ) {
                        // Is dropdown, is not hidden

                        if (event.path.indexOf(event.currentTarget) <= 1)
                            // Toolbar option is clicked
                            child.classList.add("hidden");
                        else if (
                            !event.currentTarget.id.localeCompare(
                                "toolbar-alignment"
                            ) &&
                            child.firstElementChild.classList.contains(
                                "dropdown-item"
                            )
                        ) {
                            // Alignment option clicked
                            for (var i = 0; i < event.path.length - 4; i++) {
                                if (
                                    event.path[i].classList.contains(
                                        "dropdown-item"
                                    )
                                ) {
                                    var toolbar = document.getElementById(
                                        "toolbar"
                                    );
                                    if (
                                        event.path[i].classList.contains("top")
                                    ) {
                                        toolbar.className =
                                            "web-page-canvas aligned-top";
                                    } else if (
                                        event.path[i].classList.contains(
                                            "bottom"
                                        )
                                    ) {
                                        toolbar.className =
                                            "web-page-canvas aligned-bottom";
                                    }
                                    break;
                                }
                            }
                        }
                        break;
                    }
                }
            } else {
                // Tool is button
                let activeDropdown = document.querySelector(
                    ".dropdown:not(.hidden)"
                );

                if (activeDropdown != null) {
                    activeDropdown.classList.add("hidden"); // hide active dropdown
                }

                let action = event.currentTarget.dataset.action;
                if (action === "clear") {
                    this.canvas.cxt.clearAll();
                    this.deleteHistory();
                } else if (action === "close") this.close();
                else if (action === "undo") this.undo();
                else if (action === "redo") this.redo();
            }

            this.resetCanvasTools();

            if (
                event.currentTarget.classList.contains("tool-container") &&
                !event.currentTarget.classList.contains("active")
            ) {
                let activeTool = document.querySelector(
                    ".tool-container.active"
                );
                if (activeTool != null) {
                    activeTool.classList.remove("active");
                }

                event.currentTarget.classList.add("active");

                let selector =
                    ".tool-container[title='" +
                    event.currentTarget.title +
                    "']";

                if (!event.currentTarget.title.localeCompare("Paint Brush")) {
                    this.activeTool.id = "paintBrush";
                    this.activeTool.htmlID = "paint-brush";
                    document.querySelector(
                        "#toolbar.web-page-canvas input[type='color']"
                    ).value = this.options.brushColor;
                    this.activeTool.options.color = this.options.brushColor;
                } else if (!event.currentTarget.title.localeCompare("Eraser")) {
                    this.activeTool.id = "eraser";
                    this.activeTool.htmlID = "eraser";
                    this.activeTool.options.color = false;
                } else if (
                    !event.currentTarget.title.localeCompare("Highlighter")
                ) {
                    this.activeTool.id = "highlighter";
                    this.activeTool.htmlID = "highlighter";
                    document.querySelector(
                        "#toolbar.web-page-canvas input[type='color']"
                    ).value = this.options.highlighterColor;
                    this.activeTool.options.color = this.options.highlighterColor;

                    let transparency = document.querySelector(
                        selector +
                            " input[type='range'][data-option='transparency']"
                    ).value;
                    this.activeTool.options.opacity =
                        (100 - transparency) / 100;

                    let sizeInput = document.querySelector(
                        "input[data-tool='options'][data-option='size']"
                    );
                    sizeInput.value = "23";
                    this.triggerChange(sizeInput);

                    let assist = document.querySelector(
                        selector +
                            " input[type='checkbox'][data-option='highlighting-assist']"
                    ).checked;
                    if (assist) {
                        this.activeTool.options.assist = true;
                    }
                }
            }
        }

        onToolOptionChangeHandler(event) {
            if (
                !this.activeTool.id.localeCompare("highlighter") &&
                !event.target.dataset.tool.localeCompare("highlighter") &&
                !event.target.dataset.option.localeCompare(
                    "highlighting-assist"
                )
            ) {
                if (event.target.checked) this.activeTool.options.assist = true;
                else
                    (this.canvas.scY = false),
                        (this.activeTool.options.assist = false);
            }
        }

        rangeChangeHandler(event) {
            if (
                !event.target.dataset.tool.localeCompare("highlighter") &&
                !event.target.dataset.option.localeCompare("transparency")
            ) {
                this.activeTool.options.opacity =
                    (100 - parseInt(event.target.value)) / 100;
                event.target.nextElementSibling.innerText =
                    event.target.value + "%";
            } else {
                event.target.nextElementSibling.innerText = event.target.value;
                this.activeTool.options.size = parseInt(event.target.value);
            }
        }

        colorChangeHandler(event) {
            if (this.activeTool.id !== "eraser") {
                if (this.activeTool.id === "paintBrush")
                    this.options.brushColor = event.target.value;
                else if (this.activeTool.id === "highlighter")
                    this.options.highlighterColor = event.target.value;
                this.activeTool.options.color = event.target.value;
            } else {
                this.activeTool.options.color = false;
            }
        }

        initCanvas() {
            this.canvas.elm = document.querySelector("canvas.web-page-canvas");
            this.canvas.cxt = this.canvas.elm.getContext("2d");

            this.canvas.cxt.fillCircle = function(x, y, radius, fillColor) {
                this.fillStyle = fillColor;
                this.beginPath();
                this.moveTo(x, y);
                this.arc(x, y, radius, 0, Math.PI * 2, false);
                this.fill();
            };
            this.canvas.cxt.clearAll = function() {
                this.hasDrawings = false;
                this.canvas.cxt.clearRect(
                    0,
                    0,
                    this.canvas.elm.width,
                    this.canvas.elm.height
                );
            }.bind(this);

            this.canvas.toImgBlob = function() {
                return new Promise((resolve, reject) => {
                    this.elm.toBlob(function(blob) {
                        let img = document.createElement("img"),
                            url = URL.createObjectURL(blob);

                        img.onload = function() {
                            URL.revokeObjectURL(url);
                            resolve(img);
                        };
                        img.src = url;
                    });
                });
            };

            this.canvas.elm.onmousemove = function(e) {
                if (this.canvas.drag) {
                    if (
                        this.activeTool.id === "highlighter" &&
                        this.activeTool.options.assist
                    ) {
                        if (!this.canvas.scY) this.canvas.scY = e.offsetY;
                        this.addClick(e.offsetX, this.canvas.scY);
                    } else this.addClick(e.offsetX, e.offsetY);

                    if (!this.activeTool.id.localeCompare("eraser"))
                        this.erase();
                    else this.draw();
                }
            }.bind(this);

            this.canvas.elm.onmousedown = function(e) {
                this.canvas.drag = true;

                if (this.activeTool.id !== "eraser") {
                    this.history.drawStep++;
                    this.history.backwards = false;
                    let undo = document.querySelector(
                        "#toolbar.web-page-canvas .option-container[data-action='undo']"
                    );
                    if (undo.classList.contains("disabled")) {
                        undo.classList.remove("disabled");
                        this.history.actionStep = 0;
                    }
                }

                if (
                    this.activeTool.id === "highlighter" &&
                    this.activeTool.options.assist
                ) {
                    if (!this.canvas.scY) this.canvas.scY = e.offsetY;
                    this.addClick(e.offsetX, this.canvas.scY);
                } else this.addClick(e.offsetX, e.offsetY);

                if (!this.activeTool.id.localeCompare("eraser")) this.erase();
                else this.draw();
            }.bind(this);
            this.canvas.elm.onmouseup = function() {
                if (this.canvas.drag) this.saveAction();
                this.canvas.drag = false;
                this.resetCanvasTools();
            }.bind(this);
            this.canvas.elm.onmouseleave = function() {
                if (this.canvas.drag) this.saveAction();

                this.canvas.drag = false;
                this.resetCanvasTools();
            }.bind(this);
        }

        resetCanvasTools() {
            (this.canvas.cX = []),
                (this.canvas.cY = []),
                (this.canvas.scY = false);
        }

        saveAction() {
            this.canvas.toImgBlob().then(
                function(img) {
                    this.history.collection.push(img);
                }.bind(this)
            );
        }

        addClick(x, y) {
            this.canvas.cX.push(x);
            this.canvas.cY.push(y);
        }

        deleteHistory() {
            this.history = {
                collection: [],
                drawStep: 0,
                actionStep: 0,
                backwards: false
            };
            let undo = document.querySelector(
                "#toolbar.web-page-canvas .option-container[data-action='undo']"
            );
            let redo = document.querySelector(
                "#toolbar.web-page-canvas .option-container[data-action='redo']"
            );
            undo.classList.add("disabled");
            redo.classList.add("disabled");
        }

        undo() {
            // console.log('before', 'drawStep:' + this.history.drawStep, 'actionStep:' + this.history.actionStep, this.history.backwards);
            if (this.history.drawStep > 0 && this.history.actionStep >= 0) {
                let step;
                if (this.history.actionStep != 0 && this.history.backwards)
                    step = --this.history.actionStep;
                else if (this.history.actionStep == 0) {
                    if (this.history.backwards || this.history.drawStep <= 1) {
                        this.canvas.cxt.clearAll();
                        this.history.backwards = false;
                        this.history.actionStep = -1;
                        this.deleteHistory();
                        return;
                    } else {
                        this.history.actionStep = this.history.drawStep - 2;
                        this.history.backwards = true;
                        step = this.history.actionStep;
                    }
                } else if (!this.history.backwards) {
                    this.history.actionStep = this.history.drawStep - 2;
                    this.history.backwards = true;
                    step = this.history.actionStep;
                }

                let redo = document.querySelector(
                    "#toolbar.web-page-canvas .option-container[data-action='redo']"
                );
                if (redo.classList.contains("disabled"))
                    redo.classList.remove("disabled");

                let img = this.history.collection[step];

                // console.log('after', 'drawStep:' + this.history.drawStep, 'actionStep:' + this.history.actionStep, 'step:' + step, this.history.backwards);

                this.canvas.cxt.clearAll();
                this.canvas.cxt.drawImage(
                    img,
                    0,
                    0,
                    this.canvas.elm.width,
                    this.canvas.elm.height
                );
            }
        }

        redo() {
            // console.log('before', 'drawStep:' + this.history.drawStep, 'actionStep:' + this.history.actionStep, this.history.backwards);

            let step,
                redo = document.querySelector(
                    "#toolbar.web-page-canvas .option-container[data-action='redo']"
                );

            if (
                !redo.classList.contains("disabled") &&
                this.history.drawStep >= 0 &&
                this.history.backwards &&
                this.history.actionStep < this.history.drawStep - 1
            ) {
                step = ++this.history.actionStep;

                if (step == this.history.drawStep - 1) {
                    redo.classList.add("disabled");
                }

                let img = this.history.collection[step];

                this.canvas.cxt.clearAll();
                this.canvas.cxt.drawImage(
                    img,
                    0,
                    0,
                    this.canvas.elm.width,
                    this.canvas.elm.height
                );
            }

            // console.log('after', 'drawStep:' + this.history.drawStep, 'actionStep:' + this.history.actionStep, 'step:' + step, this.history.backwards);
        }

        draw() {
            this.hasDrawings = true;

            if (this.activeTool.id === "highlighter") {
                this.canvas.cxt.globalCompositeOperation = "lighten";
                this.canvas.cxt.lineJoin = "miter";
                this.canvas.cxt.globalAlpha = this.activeTool.options.opacity;
            } else {
                this.canvas.cxt.globalCompositeOperation = "source-over";
                this.canvas.cxt.lineJoin = "round";
                this.canvas.cxt.globalAlpha = 1;
            }

            // this.canvas.cxt.lineWidth = this.activeTool.options.size;
            // this.canvas.cxt.strokeStyle = this.activeTool.options.color;
            this.canvas.cxt.lineWidth = 5;
            this.canvas.cxt.strokeStyle = "#000000";

            for (let i = 0; i < this.canvas.cX.length; i++) {
                if (typeof this.canvas.cX[i] === "undefined") continue;

                this.canvas.cxt.beginPath();

                if (i)
                    this.canvas.cxt.moveTo(
                        this.canvas.cX[i - 1],
                        this.canvas.cY[i - 1]
                    );
                else
                    this.canvas.cxt.moveTo(
                        this.canvas.cX[i] - 1,
                        this.canvas.cY[i]
                    );

                this.canvas.cxt.lineTo(this.canvas.cX[i], this.canvas.cY[i]);
                this.canvas.cxt.closePath();

                this.canvas.cxt.stroke();

                // if (i > 0) {
                //     this.canvas.cX[i - 1] = undefined;
                //     this.canvas.cY[i - 1] = undefined;
                // }
            }
        }

        erase() {
            this.canvas.cxt.globalCompositeOperation = "destination-out";
            this.canvas.cxt.lineJoin = "miter";
            this.canvas.cxt.lineWidth = this.activeTool.options.size;
            this.canvas.cxt.globalAlpha = 1;

            for (let i = 0; i < this.canvas.cX.length; i++) {
                if (typeof this.canvas.cX[i] === "undefined") continue;

                this.canvas.cxt.beginPath();

                if (i)
                    this.canvas.cxt.moveTo(
                        this.canvas.cX[i - 1],
                        this.canvas.cY[i - 1]
                    );
                else
                    this.canvas.cxt.moveTo(
                        this.canvas.cX[i] - 1,
                        this.canvas.cY[i]
                    );

                this.canvas.cxt.lineTo(this.canvas.cX[i], this.canvas.cY[i]);
                this.canvas.cxt.closePath();

                this.canvas.cxt.stroke();

                if (i > 0) {
                    this.canvas.cX[i - 1] = undefined;
                    this.canvas.cY[i - 1] = undefined;
                }
            }
        }

        getContentDocument() {
            return new Promise((resolve, reject) => {
                let request = new XMLHttpRequest();

                request.onload = function() {
                    if (
                        request.readyState == 4 &&
                        request.status == 200 &&
                        !request.responseType.localeCompare("document")
                    ) {
                        this.contentDocument = request.responseXML;
                        resolve();
                    } else reject();
                }.bind(this);

                request.open(
                    "GET",
                    browser.runtimegetURL(
                        "/web-resources/html/web-page-canvas.html"
                    )
                );
                request.responseType = "document";
                request.send();
            });
        }

        /**
         * @method	void
         */
        // insertCSS() {
        //     return new Promise(
        //         function(resolve) {
        //             let link = document.createElement("link");
        //             link.href =
        //                 "https://use.fontawesome.com/releases/v5.3.1/css/all.css";
        //             link.integrity =
        //                 "sha384-mzrmE5qonljUremFsqc01SB46JvROS7bZs3IO2EmfFsd15uHvIt+Y8vEf7N7fWAU";
        //             link.rel = "stylesheet";
        //             link.crossOrigin = "anonymous";
        //             document.head.appendChild(link);

        //             link.onload = function() {
        //                 resolve();
        //             };
        //         }.bind(this)
        //     );
        // }

        animateToolbar() {
            document.getElementById("toolbar").addEventListener(
                "transitionend",
                function(event) {
                    event.target.classList.remove("animated");
                },
                { once: true }
            );
            document.getElementById("toolbar").classList.remove("closed");
            document.getElementById("toolbar").classList.add("animated");
        }

        /**
         * Retrieves the maximum height of the current page
         * @returns {number} The maximum height
         */
        getMaxHeight() {
            return Math.max(
                document.documentElement.clientHeight,
                document.body.scrollHeight,
                document.documentElement.scrollHeight,
                document.body.offsetHeight,
                document.documentElement.offsetHeight
            );
        }

        /**
         * Retrieves the maximum width of the current page
         * @returns {number} The maximum width
         */
        getMaxWidth() {
            return Math.max(
                document.documentElement.clientWidth,
                document.body.scrollWidth,
                document.documentElement.scrollWidth,
                document.body.offsetWidth,
                document.documentElement.offsetWidth
            );
        }

        /**
         * Adjusts the canvas to the current window
         * @returns {void}
         */
        adjustCanvas(width = null, height = null) {
            if (this.canvas.hasOwnProperty("elm") && this.canvas.elm != null) {
                if (width != null) this.canvas.elm.style.width = width + "px";
                else this.canvas.elm.style.width = this.getMaxWidth() + "px";

                if (height != null)
                    this.canvas.elm.style.height = height + "px";
                else this.canvas.elm.style.height = this.getMaxHeight() + "px";
            }
        }

        /**
         * @method void Scrolls the page to the top
         * @param {number} delay - The delay of the scroll in milliseconds
         */
        scrollToTop(delay) {
            setTimeout(function() {
                window.scrollTo(0, 0);
            }, delay);
        }

        /**
         * @method void Triggers the 'change' event on the specified element
         * @param {HTMLElement} element
         */
        triggerChange(element) {
            if ("createEvent" in document) {
                let evt = document.createEvent("HTMLEvents");
                evt.initEvent("change", false, true);
                element.dispatchEvent(evt);
            } else element.fireEvent("onchange");
        }
    }

    if (document.readyState === "loading") {
        // document.addEventListener('DOMContentLoaded', webPageCanvas_initialize, {once: true});
    } else webPageCanvas_initialize();
} else webPageCanvas_initialize();

browser.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (
        request != null &&
        request.hasOwnProperty("message") &&
        !request.hasOwnProperty("data")
    ) {
        if (request.message === "resize-canvas") {
            webPageCanvas.adjustCanvas();
            return false;
        } else if (request.message === "scroll-top") {
            window.scrollTo(0, window.scrollY + window.innerHeight);
            sendResponse({ message: "scrolled" });
        } else if (request.message === "save-canvas") {
            webPageCanvas
                .saveCanvas()
                .then(function(snapshots) {
                    if (typeof snapshots === "object") {
                        webPageCanvas
                            .loadImages(snapshots)
                            .then(function(finalImage) {
                                sendResponse({
                                    message: "saved",
                                    data: finalImage
                                });
                            });
                    }
                })
                .catch(error => {
                    console.log(error);
                })
                .finally(() => {
                    document
                        .querySelector("#toolbar.web-page-canvas")
                        .classList.remove("closed");
                    webPageCanvas.scrollToTop(0);
                });
        }
    }
    return true;
});
