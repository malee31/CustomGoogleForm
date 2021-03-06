console.log("Creation script attached");

const form = document.forms["mainForm"];
const renderWrapperTemplate = document.getElementById("render-wrapper-template");
const choiceEditorTemplate = {
	main: document.getElementById("choice-editor-template"),
	choice: document.getElementById("choice-option-template")
};
const creationOverlay = document.getElementById("creation-overlay");
const creationInputs = {
	template: creationOverlay.querySelector("#template-type"),
	labelValue: creationOverlay.querySelector("#label-value"),
	defaultValue: creationOverlay.querySelector("#default-value"),
	placeholder: creationOverlay.querySelector("#placeholder-text"),
	requiredInput: creationOverlay.querySelector("#required-checkbox")
};

let uuidCounter = 0;
// Contains templates already fetched from the server. Caches them so they don't need to be fetched again
const loadedTemplates = {};
// Contains the element maps in uuid: elementMap pairs
const dataMap = {};
const GeneratedData = {
	name: "Custom Form",
	headers: [],
	sheetId: "N/A"
};

window.addEventListener("load", () => {
	form.addEventListener("submit", e => e.preventDefault());
	creationOverlay.addEventListener("submit", createToolOverride);
	const fileTitle = document.getElementById("fileTitle");
	formTitleListeners(fileTitle);
	createToolHideToggleListener();
	const sheetIDInput = document.querySelector("#save-overlay-button > input");
	document.getElementById("save-overlay-button").addEventListener("click", e => {
		GeneratedData.sheetId = sheetIDInput.value;
		if(e.target.id === "save-overlay-button") sendJSON();
		// else console.log(e.target);
	});

	const params = new URLSearchParams(window.location.search);
	if(params.has("edit")) {
		const editing = params.get("edit");
		const req = new XMLHttpRequest();
		toggleLoader(true);
		const onerror = err => {
			toggleLoader(false);
			toggleErrorBox(true, "Failed to Fetch Form", err || "Please try again later");
		}
		req.addEventListener("load", res => {
			toggleLoader(false);
			if(res.target.status === 200) {
				toggleErrorBox(true, "Form Fetched", `Now editing form ${editing}`);
				const fetched = JSON.parse(res.target.response);
				GeneratedData.name = fetched.name;
				for(const header of fetched.headers) {
					createToolOverride(null, new InputDataManager(header));
				}
				fileTitle.innerText = fetched.name;
				sheetIDInput.value = fetched.sheetId;
				GeneratedData.editing = editing;
			} else onerror(res.target.responseText);
		});
		req.addEventListener("error", onerror);
		req.open("GET", `${window.location.origin}/edit/${editing}`);
		req.send()
	}
});

/**
 * Attaches the listener to the content-editable form title and updates the name property on input.
 * @param {HTMLElement} formTitleElem The content-editable element to listen to
 */
function formTitleListeners(formTitleElem) {
	formTitleElem.addEventListener("input", e => {
		GeneratedData.name = e.target.innerText.replace(/\s/g, " ");
	});
	editableListeners(formTitleElem);
}

/**
 * Adds a filter and multiple listeners for content-editable elements
 * @param {HTMLElement} editableElem Content-editable element to add listeners to
 */
function editableListeners(editableElem) {
	editableElem.addEventListener("input", e => {
		editableContentFilter(e.target, e.target.innerText.replace(/\s(?!$)\s*/g, " ").replace(/ $/, String.fromCharCode(160)), true, /\s{2}/.test(e.target.innerText) ? -1 : 0);
	});
	editableElem.addEventListener("blur", e => {
		editableContentFilter(e.target, e.target.innerText.replace(/\s+/g, " ").trim(), false);
	});
	editableElem.addEventListener("paste", e => {
		e.preventDefault();
		const savedSelection = cutSelection();
		const clippedText = e.clipboardData.getData("text/plain").replace(/\s+/g, " ");
		e.target.innerText = `${e.target.innerText.substring(0, savedSelection.start)}${clippedText}${e.target.innerText.substring(savedSelection.end)}`;
		restoreSelection(e.target, savedSelection, clippedText.length);
	});
}

/**
 * Removes all selections on the page and saves the first one for restoring later if needed
 * @returns {Object} The position of the selection as a start and end integer property
 */
function cutSelection() {
	const selection = window.getSelection();
	const currentRange = selection.rangeCount ? selection.getRangeAt(0) : {};
	const savedRange = {
		start: currentRange.startOffset || 0,
		end: currentRange.endOffset || 0
	};
	selection.removeAllRanges();
	return savedRange;
}

/**
 * Restores the position of the cursor on an element
 * @param {HTMLElement} targetElem Content-editable element to restore selection position on
 * @param {Object} restorePosition Object containing the integer start and end properties to set the cursor to
 * @param {number} [offset = 0] Amount to offset the restorePosition object
 * @param {boolean} [collapse = false] Whether or not to collapse the size of the selection from a highlighted portion of text to a single cursor
 */
function restoreSelection(targetElem, restorePosition, offset = 0, collapse = false) {
	const selection = window.getSelection();
	const newRange = document.createRange();
	if(!targetElem.firstChild) targetElem.appendChild(document.createTextNode(""));
	const targetChild = targetElem.firstChild;
	while(targetElem.childNodes.length > 1) targetElem.removeChild(targetElem.lastChild);
	newRange.setStart(targetChild, Math.min(restorePosition.start + offset, targetChild.length));
	newRange.setEnd(targetChild, Math.min((collapse ? restorePosition.start : restorePosition.end) + offset, targetChild.length));
	selection.addRange(newRange);
}

/**
 * Resets the text of a content-editable element to a filtered version and restores the cursor position
 * @param {Element} targetElem Element to apply filtered text
 * @param {string} filteredText The filtered string to set as the innerText
 * @param {boolean} [restore = true] Whether or not to restore the cursor position after filtering (Set to false for blur events)
 * @param {number} [offset = 0] Number to offset the cursor by
 */
function editableContentFilter(targetElem, filteredText, restore = true, offset = 0) {
	const savedRange = cutSelection();
	targetElem.innerText = filteredText;
	if(restore) restoreSelection(targetElem, savedRange, offset);
}

/**
 * Loops through and adds the listeners needed to hide and show the editors for all the rendered elements
 */
function createToolHideToggleListener() {
	document.getElementById("hide-creation-overlay-button").addEventListener("click", e => {
		const overlayContainer = document.getElementById("creation-overlay-container");
		if(e.target.classList.contains("hide-creation-overlay")) {
			e.target.classList.remove("hide-creation-overlay");
			overlayContainer.classList.remove("hide-creation-overlay");
			document.getElementById("save-overlay-button").classList.remove("hide-creation-overlay");
			document.querySelector("main").classList.add("control-pad");
		} else {
			e.target.classList.add("hide-creation-overlay");
			overlayContainer.classList.add("hide-creation-overlay");
			document.getElementById("save-overlay-button").classList.add("hide-creation-overlay");
			document.querySelector("main").classList.remove("control-pad");
		}
	});
}

/**
 * Overrides the form that handles creating new elements and processing templates
 * @param {Event} [e] Optional event from the submit button to preventDefault()
 * @param {InputData|RawInputData} [setData] Prefilled data to use in place of fetching from create tool
 */
function createToolOverride(e, setData) {
	if(e) e.preventDefault();
	console.log("Creating New Input");
	const data = setData || fetchCreateToolValues();
	const uuid = generateUUID();
	const elementMap = createRenderWrapper();
	elementMap.data = data;
	elementMap.renderWrapper.dataset.uuid = uuid;

	if(data.subtype === "select") {
		elementMap.additionalControls.append(createOptionEditor());
		attachOptionListeners(elementMap);
	}
	addEditElementReferences(elementMap);
	attachEditListeners(elementMap);
	updatePreview(elementMap, true);

	formAppend(elementMap.renderWrapper);
	dataMap[uuid] = elementMap;
	GeneratedData.headers.push(uuid);
	console.log("New Input Added");
}

/**
 * Fetches the EJS template for a type of element from the server. Caches templates each time a unique one is requested
 * @param {string} templateType Type of template to fetch. Defaults to text if an invalid string is provided and returns an error if nothing is provided
 * @returns {Promise<string>} A promise that resolves to the EJS template string
 */
function requestTemplate(templateType) {
	return new Promise((resolve, reject) => {
		if(loadedTemplates[templateType]) resolve(loadedTemplates[templateType]);

		const request = new XMLHttpRequest();
		request.addEventListener("load", res => {
			loadedTemplates[templateType] = res.target.response;
			resolve(loadedTemplates[templateType]);
		});
		request.addEventListener("error", reject);
		request.open("GET", `${window.location.origin}/templates?type=${encodeURIComponent(templateType)}`);
		request.send();
	});
}

/**
 * Converts HTML from a string to actual nodes
 * @param {string} HTMLString HTML string to convert into nodes
 * @returns {NodeListOf<Node>} Converted HTML string as a list of nodes
 */
function parseHTMLString(HTMLString = "") {
	const mockDOM = document.createElement("body");
	mockDOM.innerHTML = HTMLString;
	return mockDOM.childNodes;
}

/**
 * Appends a new node to the form and updates listeners on the form
 * @param {HTMLElement} newNode New element to add to the form
 */
function formAppend(newNode) {
	form.append(newNode);
	updateListeners();
}

/**
 * Fetches the info needed for a RawInputData object
 * @param {InputDataManager|RawInputData} [targetObj = makeData()] Object to assign the strings to. Creates an empty RawInputData object by default
 * @returns {InputDataManager} The fetched data stored in an object
 */
function fetchCreateToolValues(targetObj = makeData()) {
	targetObj.displayName = creationInputs.labelValue.value.trim() || "<Label>";
	targetObj.type = creationInputs.template.value;
	typeFilter(targetObj);
	targetObj.placeholderText = creationInputs.placeholder.value;
	targetObj.defaultValue = creationInputs.defaultValue.value;
	targetObj.required = creationInputs.requiredInput.checked;
	return targetObj;
}

/**
 * Creates a temporary UUID. This UUID is not actually universally unique, it's just unique for the current page and follows a simple pattern of Pseudo-UUID-#
 * @returns {string} Temporary UUID stand-in
 */
function generateUUID() {
	return `Pseudo-UUID-${uuidCounter++}`;
}

/**
 * Renders a preview from a map of elements and replaces the old one.
 * @param {Object} elementMap The map of the elements for rerender
 * @param {boolean} [skipFetch = false] If set to true, the object will be re-rendered from pre-existing data
 */
function updatePreview(elementMap, skipFetch = false) {
	const updatedData = skipFetch ? elementMap.data : fetchEditorValues(elementMap);
	requestTemplate(updatedData.type).then(template => {
		const rendered = parseHTMLString(ejs.render(template, {
			inputOptions: cleanData(updatedData, elementMap.renderWrapper.dataset.uuid),
			editMode: true
		}))[0];
		while(elementMap.renderPreview.firstChild) elementMap.renderPreview.firstChild.remove();
		elementMap.renderPreview.append(rendered);
		attachEditOpenerListeners(rendered, elementMap);
		setAllTabIndex(rendered, -1);
		updateListeners();
	});
}

/**
 * Fetches the data needed for a RawInputData object from the editors of each preview
 * @param {Object} elementMap The map of the elements for the object
 * @returns {InputDataManager|InputData} Completely assembled input object used to rerender. Saves it in the global object before returning
 */
function fetchEditorValues(elementMap) {
	const editorElements = elementMap.editorElements;
	const editingHeader = elementMap.data;
	editingHeader.placeholderText = editorElements.placeholderValue.value;
	editingHeader.defaultValue = editorElements.defaultValue.value;
	editingHeader.choices = [];
	if(elementMap.additionalControls.querySelector(".choice-container")) {
		for(const choice of elementMap.additionalControls.querySelectorAll(".choice-editor")) {
			editingHeader.choices.push({
				"value": choice.value,
				"default": false
			});
		}
	}
	return editingHeader;
}

/**
 * Creates a wrapper around rendered inputs and their respective editors
 * @returns {Object} Object containing a map of element nodes in the wrapper
 */
function createRenderWrapper() {
	const renderWrapperClone = renderWrapperTemplate.content.cloneNode(true);
	const renderElements = {
		renderWrapper: renderWrapperClone.querySelector(".render-wrapper"),
		renderPreview: renderWrapperClone.querySelector(".render-preview"),
		editorWrapper: renderWrapperClone.querySelector(".edit-controls-wrapper"),
		closeEditor: renderWrapperClone.querySelector(".close-editor-button"),
		destroyEditor: renderWrapperClone.querySelector(".destroy-editor-button"),
		additionalControls: renderWrapperClone.querySelector(".additional-edit-controls")
	}

	renderElements.closeEditor.addEventListener("click", () => {
		renderElements.renderWrapper.classList.remove("edit-mode");
		renderElements.editorWrapper.classList.add("dimensionless");
		setAllTabIndex(renderElements.editorWrapper, -1);
	});

	for(const animatedInput of renderElements.editorWrapper.querySelectorAll(".edit-control-label")) {
		const targetSpan = animatedInput.querySelector("input + span");
		animatedInput.querySelector("input").addEventListener("change", () => {
			if(!targetSpan.classList.contains("lock-label-span-top")) targetSpan.classList.add("lock-label-span-top");
		});
	}

	return renderElements;
}

/**
 * Clones the editor for multiple choice and checkbox options
 * @returns {Node} The cloned node
 */
function createOptionEditor() {
	return choiceEditorTemplate.main.content.cloneNode(true);
}

/**
 * Attaches the listeners the the multiple choice or checkbox option editor. Specifically for the add new option button
 * @param {Object} elementMap The map of elements for the renderWrapper
 */
function attachOptionListeners(elementMap) {
	elementMap.additionalControls.querySelector(".add-option-button").addEventListener("click", () => {
		const newOptionEditor = choiceEditorTemplate.choice.content.cloneNode(true);
		const newChoiceEditor = newOptionEditor.querySelector(".choice-editor");
		newChoiceEditor.addEventListener("input", () => {
			updatePreview(elementMap);
		});
		elementMap.additionalControls.querySelector(".choice-container").append(newOptionEditor);
		newChoiceEditor.focus();
	});
}

/**
 * Adds additional HTMLElement references to the renderMap
 * @param {Object} renderMap The map of render elements to add to
 */
function addEditElementReferences(renderMap) {
	renderMap.editorElements = {
		defaultValue: renderMap.editorWrapper.querySelector(".default-value-editor"),
		placeholderValue: renderMap.editorWrapper.querySelector(".placeholder-editor")
	};
}

/**
 * Constructs a new object for new input elements
 * @returns {InputDataManager} An empty data manager to contain and manipulate input data objects
 */
function makeData() {
	return new InputDataManager();
}

/**
 * Adds the listener to the rendered preview that opens up the editor on click
 * @param {Element|Node} previewRender The rendered preview
 * @param {Object} elementMap The element map containing the editor to reveal
 */
function attachEditOpenerListeners(previewRender, elementMap) {
	const labelEditor = previewRender.querySelector("[data-purpose='label']");
	labelEditor.setAttribute("contenteditable", "true");
	editableListeners(labelEditor);
	labelEditor.addEventListener("click", e => {
		e.preventDefault();
	});
	labelEditor.addEventListener("input", e => {
		elementMap.data.displayName = e.target.innerText.replace(/\s/g, " ");
	});
	const requiredEditor = previewRender.querySelector("[data-purpose='required-span']");
	requiredEditor.addEventListener("click", e => {
		e.preventDefault();
		if(elementMap.data.required) e.target.classList.remove("required-span-enabled");
		else e.target.classList.add("required-span-enabled");
		elementMap.data.required = !elementMap.data.required;
	});
	previewRender.addEventListener("click", e => {
		if(!elementMap.renderWrapper.classList.contains("edit-mode") && (!e.target.dataset.purpose || e.target.dataset.purpose == "component-wrapper")) {
			elementMap.renderWrapper.classList.add("edit-mode");
			elementMap.editorWrapper.classList.remove("dimensionless");
			setAllTabIndex(elementMap.editorWrapper, 0);
		}
	});
}

/**
 * Adds listeners to update tab-index and previews when the editor inputs are changed.
 * @param {Object} elementMap The element map to link to the preview
 */
function attachEditListeners(elementMap) {
	const updatePreviewForWrapper = () => {
		updatePreview(elementMap);
	};
	elementMap.editorElements.defaultValue.addEventListener("input", updatePreviewForWrapper);
	elementMap.editorElements.placeholderValue.addEventListener("input", updatePreviewForWrapper);
	elementMap.destroyEditor.addEventListener("click", () => {
		elementMap.renderWrapper.parentNode.removeChild(elementMap.renderWrapper);
		GeneratedData.headers = GeneratedData.headers.filter(val => val !== elementMap.renderWrapper.dataset.uuid);
	});
}

/**
 * Update the tab indices of an element's child inputs and buttons all at once
 * @param {HTMLElement} elem Element to search through and set the tab indices for inputs and buttons for
 * @param {number} [val = 0] Number to set tab indices to. Defaults to 0
 */
function setAllTabIndex(elem, val = 0) {
	for(const input of elem.querySelectorAll("input, button")) {
		input.tabIndex = val;
	}
}

/**
 * Finalizes the data used to generate the form and processes it.
 * @returns {RawInputData} The finalized JSON object
 */
function finalizeGeneratedData() {
	const finalized = {
		name: GeneratedData.name,
		headers: [],
		sheetId: GeneratedData.sheetId,
		editing: GeneratedData.editing || false
	};
	for(let uuidNum = 0; uuidNum < GeneratedData.headers.length; uuidNum++) {
		const uuid = GeneratedData.headers[uuidNum];
		finalized.headers[uuidNum] = dataMap[uuid].data.toCleanObject();
	}
	return finalized;
}

/**
 * Finalizes and sends the JSON data to the server and creates the resulting form
 */
function sendJSON() {
	const data = finalizeGeneratedData();
	const req = new XMLHttpRequest();
	const onerror = err => {
		toggleErrorBox(true, "Failed to Save Form", err || "Please try again later");
	}
	req.addEventListener("load", res => {
		if(res.target.status === 200) toggleErrorBox(true, "Success!", `Your form will be found at <a href="${window.location.origin}${res.target.responseText}">${window.location.origin}${res.target.responseText}</a>`, true);
		else onerror(res.target.responseText);
	});
	req.addEventListener("error", onerror);
	req.open("POST", `${window.location.origin}/create/submit`);
	req.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
	req.send(JSON.stringify(data));
}