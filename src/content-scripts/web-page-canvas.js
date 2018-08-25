/* globals chrome */
/**
 * @TODO:
 * implement save area
 */

if (typeof WebPageCanvas === 'undefined') {

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
				brushColor: '#FFFF00',
				highlighterColor: '#FFFF00',
			};

			this.activeTool = {
				id: 'paintBrush',
				htmlID: 'paint-brush',
				options: {
					color: this.options.brushColor,
					size: this.options.size,
					opacity: 1,
					assist: false
				}
			};

			this.getOptions()
				.then(function(options) {
					this.options = {
						size: parseInt(options.size),
						brushColor: options.brushColor,
						highlighterColor: options.highlighterColor
					};
					this.activeTool.options.color = this.options.brushColor;
					this.activeTool.options.size = this.options.size;
				}.bind(this))
				.catch(() => {
					console.error('Could not load web-page-canvas\'s options');
				});

			this.canvas = {
				element: null,
				context: null,
				clickX: [],
				clickY: [],
				isDrawing: false,
				startingClickY: false
			};

			this.hasDrawings = false;

			let finalCanvas = document.createElement('CANVAS');
			this.finalCanvas = {
				element: finalCanvas,
				context: finalCanvas.getContext('2d')
			};

			this.optionsStorageKey = 'webPageCanvas_options';
			this.contentDocument = null;
		}

		attachHandlers() {
			// Tool, option
			for (let element of document.querySelectorAll(".tool-container, .option-container")) {
				element.addEventListener('click', this.onToolClickHandler.bind(this));
			}
			// Color picker
			document.querySelector("#toolbar.web-page-canvas input[type='color']").addEventListener('change', this.colorChangeHandler.bind(this));
			// Range Change Handler
			for (let element of document.querySelectorAll(".dropdown input[type='range']")) {
				element.addEventListener('change', this.rangeChangeHandler.bind(this));
			}
			// Highligter assist
			document.querySelector("input[type='checkbox'][data-tool='highlighter']").addEventListener('change', this.onToolOptionChangeHandler.bind(this));

			// Change input values to specified plug-in options
			document.querySelector("#toolbar.web-page-canvas input[type='color']").value = this.activeTool.options.color;

			let sizeBar = document.querySelector("#toolbar.web-page-canvas input[type='range'][data-option='size']");
			sizeBar.value = this.activeTool.options.size;
			this.triggerChange(sizeBar);
		}

		/**
		 * @method Promise Retrieves the plug-in options
		 */
		getOptions() {
			return new Promise(function(resolve, reject) {
				chrome.storage.local.get(this.optionsStorageKey, function(items) {
					if ((typeof items[this.optionsStorageKey]) !== 'string')
						reject("Error while retrieving plug-in options.");
					else
						resolve(JSON.parse(items[this.optionsStorageKey]));
				}.bind(this));
			}.bind(this));
		}

		resetFinalCanvas() {
			this.canvasImages = [];
			this.imagesLoaded = 0;
			this.finalCanvas.element.width = this.getMaxWidth();
			this.finalCanvas.element.height = this.getMaxHeight();
			this.finalCanvas.context.clearRect(0, 0, this.finalCanvas.element.width, this.finalCanvas.element.height);
		}

		close() {
			webPageCanvas.toggleContent(false);
			chrome.runtime.sendMessage({
				message: 'manually-closed-canvas'
			});
		}

		toggleContent(add) {

			return new Promise(function (resolve) {
				if (add) {
					this.injectCSS()
						.then(function() {
							this.injectHTML();
							this.initCanvas();
							this.attachHandlers();
							this.adjustCanvas();
							resolve();
						}.bind(this));
				} else {
					for(let element of document.querySelectorAll('.web-page-canvas')) {
						element.remove();
					}
					resolve();
				}
			}.bind(this));
		}

		saveCanvas() {
			this.resetFinalCanvas();
			this.scrollToTop(0);
			document.querySelector("#toolbar.web-page-canvas").classList.add('closed');
			return new Promise((resolve, reject) => {
				chrome.runtime.sendMessage({
					message: 'take-snapshot',
					data: {
						windowHeight: window.innerHeight,
						pageHeight: this.getMaxHeight()
					}
				}, function(response) {
					if (response != null && response.hasOwnProperty('data')) {
						if (response.hasOwnProperty('error')) {
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

			return new Promise((resolve) => {

				var onImgLoad = function (img, x, y) {
					this.finalCanvas.context.drawImage(img, x, y);
					if (++this.imagesLoaded == this.snapshots.length) {
						resolve(this.finalCanvas.element.toDataURL('image/webp', 0.25));
					}
				}.bind(this);

				for (let snapshot of this.snapshots) {
					let img = new Image();

					img.onload = onImgLoad.bind(this, img, snapshot.x, snapshot.y);

					img.src = snapshot.src;
					this.canvasImages.push(img);
				}
			});
		}

		onToolClickHandler(event) {

			if (event.currentTarget.dataset.hasDropdown) { // Toolbar option has dropdown menu
				for (let child of event.currentTarget.children) {

					// Is dropdown menu and is hidden
					if (child.classList.contains('dropdown') && child.classList.contains('hidden')) {

						let activeDropdown = document.querySelector('.dropdown:not(.hidden)');
						if (activeDropdown != null) {
							activeDropdown.classList.add('hidden');
						}

						child.classList.remove('hidden');
						this.canvas.element.addEventListener('mouseenter', function() {
							child.classList.add('hidden');
						}.bind(this, child), { once: true });

						break;

					} else if (child.classList.contains('dropdown') && !child.classList.contains('hidden')) { // Is dropdown, is not hidden

						if (event.path.indexOf(event.currentTarget) <= 1) // Toolbar option is clicked
							child.classList.add('hidden');
						else if (!event.currentTarget.id.localeCompare('toolbar-alignment') && child.firstElementChild.classList.contains('dropdown-item')) { // Alignment option clicked
							for (var i = 0; i < event.path.length - 4; i++) {
								if (event.path[i].classList.contains('dropdown-item')) {
									var toolbar = document.getElementById('toolbar');
									if (event.path[i].classList.contains('top')) {
										toolbar.className = 'web-page-canvas aligned-top';
									} else if (event.path[i].classList.contains('bottom')) {
										toolbar.className = 'web-page-canvas aligned-bottom';
									}
									break;
								}
							}
						}
						break;

					}

				}
			} else { // Tool is button
				let activeDropdown = document.querySelector('.dropdown:not(.hidden)');

				if (activeDropdown != null) {
					activeDropdown.classList.add('hidden'); // hide active dropdown
				}

				let action = event.currentTarget.dataset.action;
				if (action === 'clear')
					this.canvas.context.clearAll();
				else if (action === 'close')
					this.close();
			}

			this.resetCanvasTools();

			if (event.currentTarget.classList.contains('tool-container') && !event.currentTarget.classList.contains('active')) {
				let activeTool = document.querySelector('.tool-container.active');
				if (activeTool != null) {
					activeTool.classList.remove('active');
				}

				event.currentTarget.classList.add('active');

				let selector = ".tool-container[title='" + event.currentTarget.title + "']";

				if (!event.currentTarget.title.localeCompare("Paint Brush")) {

					this.activeTool.id = 'paintBrush';
					this.activeTool.htmlID = 'paint-brush';
					document.querySelector("#toolbar.web-page-canvas input[type='color']").value = this.options.brushColor;
					this.activeTool.options.color = this.options.brushColor;
					
				} else if (!event.currentTarget.title.localeCompare('Eraser')) {

					this.activeTool.id = 'eraser';
					this.activeTool.htmlID = 'eraser';
					this.activeTool.options.color = false;

				} else if (!event.currentTarget.title.localeCompare('Highlighter')) {

					this.activeTool.id = 'highlighter';
					this.activeTool.htmlID = 'highlighter';
					document.querySelector("#toolbar.web-page-canvas input[type='color']").value = this.options.highlighterColor;
					this.activeTool.options.color = this.options.highlighterColor;

					let transparency = document.querySelector(selector + " input[type='range'][data-option='transparency']").value;
					this.activeTool.options.opacity = (100 - transparency) / 100;

					let sizeInput = document.querySelector("input[data-tool='options'][data-option='size']");
					sizeInput.value = "23";
					this.triggerChange(sizeInput);

					let assist = document.querySelector(selector + " input[type='checkbox'][data-option='highlighting-assist']").checked;
					if (assist) {
						this.activeTool.options.assist = true;
					}
				}
			}

		}

		onToolOptionChangeHandler(event) {

			if (!this.activeTool.id.localeCompare('highlighter') && !event.target.dataset.tool.localeCompare('highlighter') && !event.target.dataset.option.localeCompare('highlighting-assist')) {

				if (event.target.checked)
					this.activeTool.options.assist = true;
				else
					this.canvas.startingClickY = false, this.activeTool.options.assist = false;

			}

		}

		rangeChangeHandler(event) {
			if (!event.target.dataset.tool.localeCompare('highlighter') && !event.target.dataset.option.localeCompare('transparency')) {
				this.activeTool.options.opacity = (100 - parseInt(event.target.value)) / 100;
				event.target.nextElementSibling.innerText = event.target.value + '%';
			} else {
				event.target.nextElementSibling.innerText = event.target.value;
				this.activeTool.options.size = parseInt(event.target.value);
			}
		}

		colorChangeHandler(event) {
			if (this.activeTool.id !== 'eraser') {
				if (this.activeTool.id === 'paintBrush')
					this.options.brushColor = event.target.value;
				else if (this.activeTool.id === 'highlighter')
					this.options.highlighterColor = event.target.value;
				this.activeTool.options.color = event.target.value;
			} else {
				this.activeTool.options.color = false;
			}
		}

		initCanvas() {
			this.canvas.element = document.querySelector('canvas.web-page-canvas');
			this.canvas.context = this.canvas.element.getContext('2d');

			this.canvas.context.fillCircle = function(x, y, radius, fillColor) {
				this.fillStyle = fillColor;
				this.beginPath();
				this.moveTo(x, y);
				this.arc(x, y, radius, 0, Math.PI * 2, false);
				this.fill();
			};
			this.canvas.context.clearAll = function() {
				this.hasDrawings = false;
				this.canvas.context.clearRect(0, 0, this.canvas.element.width, this.canvas.element.height);
			}.bind(this);

			this.canvas.element.onmousemove = function(e) {

				if (this.canvas.isDrawing) {

					if (this.activeTool.id === 'highlighter' && this.activeTool.options.assist) {
						if (!this.canvas.startingClickY)
							this.canvas.startingClickY = e.offsetY;
						this.addClick(e.offsetX, this.canvas.startingClickY);
					} else
						this.addClick(e.offsetX, e.offsetY);

					if (!this.activeTool.id.localeCompare('eraser'))
						this.erase();
					else
						this.draw();

				}

			}.bind(this);

			this.canvas.element.onmousedown = function(e) {

				this.canvas.isDrawing = true;

				if (this.activeTool.id === 'highlighter' && this.activeTool.options.assist) {
					if (!this.canvas.startingClickY)
						this.canvas.startingClickY = e.offsetY;
					this.addClick(e.offsetX, this.canvas.startingClickY);
				} else
					this.addClick(e.offsetX, e.offsetY);

				if (!this.activeTool.id.localeCompare('eraser'))
					this.erase();
				else
					this.draw();

			}.bind(this);
			this.canvas.element.onmouseup = function() {
				this.canvas.isDrawing = false;
				this.resetCanvasTools();
			}.bind(this);
			this.canvas.element.onmouseleave = function() {
				this.canvas.isDrawing = false;
				this.resetCanvasTools();
			}.bind(this);
		}

		resetCanvasTools() {
			this.canvas.clickX = [], this.canvas.clickY = [], this.canvas.startingClickY = false;
		}

		addClick(x, y) {
			this.canvas.clickX.push(x);
			this.canvas.clickY.push(y);
		}

		draw() {

			this.hasDrawings = true;

			if (this.activeTool.id === 'highlighter') {
				this.canvas.context.globalCompositeOperation = 'lighten';
				this.canvas.context.lineJoin = 'miter';
				this.canvas.context.globalAlpha = this.activeTool.options.opacity;
			} else {
				this.canvas.context.globalCompositeOperation = 'source-over';
				this.canvas.context.lineJoin = 'round';
				this.canvas.context.globalAlpha = 1;
			}

			this.canvas.context.lineWidth = this.activeTool.options.size;
			this.canvas.context.strokeStyle = this.activeTool.options.color;

			for (let i = 0; i < this.canvas.clickX.length; i++) {

				if ( typeof this.canvas.clickX[i] === 'undefined' )
					continue;

				this.canvas.context.beginPath();

				if ( i )
					this.canvas.context.moveTo(this.canvas.clickX[i - 1], this.canvas.clickY[i - 1]);
				else
					this.canvas.context.moveTo(this.canvas.clickX[i] - 1, this.canvas.clickY[i]);

				this.canvas.context.lineTo(this.canvas.clickX[i], this.canvas.clickY[i]);
				this.canvas.context.closePath();

				this.canvas.context.stroke();

				if ( i > 0 ) {
					this.canvas.clickX[i - 1] = undefined;
					this.canvas.clickY[i - 1] = undefined;
				}
			}

		}

		erase() {
			this.canvas.context.globalCompositeOperation = 'destination-out';
			this.canvas.context.lineJoin = 'miter';
			this.canvas.context.lineWidth = this.activeTool.options.size;
			this.canvas.context.globalAlpha = 1;

			for (let i = 0; i < this.canvas.clickX.length; i++) {

				if ( typeof this.canvas.clickX[i] === 'undefined' )
					continue;

				this.canvas.context.beginPath();

				if ( i )
					this.canvas.context.moveTo(this.canvas.clickX[i - 1], this.canvas.clickY[i - 1]);
				else
					this.canvas.context.moveTo(this.canvas.clickX[i] - 1, this.canvas.clickY[i]);

				this.canvas.context.lineTo(this.canvas.clickX[i], this.canvas.clickY[i]);
				this.canvas.context.closePath();

				this.canvas.context.stroke();

				if ( i > 0 ) {
					this.canvas.clickX[i - 1] = undefined;
					this.canvas.clickY[i - 1] = undefined;
				}
			}
		}

		getContentDocument() {
			return new Promise((resolve, reject) => {

				let request = new XMLHttpRequest();

				request.onload = function() {

					if (request.readyState == 4 && request.status == 200 && !request.responseType.localeCompare('document')) {
						this.contentDocument = request.responseXML;
						resolve();
					} else {
						reject();
					}

				}.bind(this);

				request.open('GET', chrome.runtime.getURL('/web-resources/html/web-page-canvas.html'));
				request.responseType = 'document';
				request.send();

			});
		}

		/**
		 * Injects all stylsheets on the document
		 * @returns {Promise} when all the stylesheets are loaded
		 */
		injectCSS() {
			if (this.contentDocument == null) {
				console.error('Could not load stylsheets. Web Page Canvas');
				return false;
			}

			return new Promise((resolve) => {

				let styles = this.contentDocument.querySelectorAll("head > link[rel='stylesheet']");
				
				if (styles.length < 0)
					resolve();
				else {
					let styleLoaded = 0;
					let styleOnLoad = function() {
						if (++styleLoaded == styles.length)
							resolve();
					};
	
					for (let styleSheet of styles) {
						let href = styleSheet.getAttribute('href');
						let sheet = styleSheet.cloneNode(true);
						sheet.className = 'web-page-canvas';
						sheet.onload = styleOnLoad;
						sheet.setAttribute('href', chrome.runtime.getURL(href));
						document.head.appendChild(sheet);
					}
				}

			});
		}

		/**
		 * Injects the HTML on the document.
		 */
		injectHTML() {
			document.body.innerHTML += this.contentDocument.body.innerHTML;
			setTimeout(this.animateToolbar, 500);
		}

		animateToolbar() {
			document.getElementById('toolbar').addEventListener('transitionend', function(event) {
				event.target.classList.remove('animated');
			}, {once: true});
			document.getElementById('toolbar').classList.remove('closed');
			document.getElementById('toolbar').classList.add('animated');
		}

		/**
		 * Retrieves the maximum height of the current page
		 * @returns {number} The maximum height
		 */
		getMaxHeight() {
			return Math.max(window.innerHeight, document.documentElement.scrollHeight);
		}

		/**
		 * Retrieves the maximum width of the current page
		 * @returns {number} The maximum width
		 */
		getMaxWidth() {
			return document.documentElement.offsetWidth;
		}

		/**
		 * Adjusts the canvas to the current window
		 * @returns {void}
		 */
		adjustCanvas() {
			if (this.canvas.hasOwnProperty('element') && this.canvas.element != null) {
				this.canvas.element.width = this.getMaxWidth();
				this.canvas.element.height = this.getMaxHeight();
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
			}
			else
				element.fireEvent("onchange");
		}
	}

	var webPageCanvas = new WebPageCanvas();
	webPageCanvas.getContentDocument()
		.then(function() {
			webPageCanvas.toggleContent(true);
		})
		.catch(function() {
			console.error('Could not load toolbar. Web Page Canvas.');
		});
}


chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (request != null && request.hasOwnProperty('message') && !request.hasOwnProperty('data')) {
		if (request.message === 'resize-canvas') {
			webPageCanvas.adjustCanvas();
			return false;
		} else if (request.message === 'scroll-top') {
			window.scrollTo(0, window.scrollY + window.innerHeight);
			sendResponse({ message: 'scrolled' });
		} else if (request.message === 'save-canvas') {
			webPageCanvas.saveCanvas()
				.then(function(snapshots) {
					if (typeof snapshots === 'object') {
						webPageCanvas.loadImages(snapshots)
							.then(function(finalImage) {
								sendResponse({ message: 'saved', data: finalImage });
							});
					}
				})
				.catch((error) => {
					console.log(error);
				})
				.finally(() => {
					document.querySelector('#toolbar.web-page-canvas').classList.remove('closed');
					webPageCanvas.scrollToTop(0);
				});
		}
	}
	return true;
});