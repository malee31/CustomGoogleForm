window.addEventListener("load", () => {
	document.querySelectorAll("input[type='checkbox'], input[type='radio']").forEach(elem => {
		elem.addEventListener("change", () => {
			labelCheckedUpdate(elem, true);
		});
		labelCheckedUpdate(elem, true);
	});

	document.querySelectorAll("input[type='color']").forEach(elem => {
		elem.addEventListener("input", event => {
			colorSync(event.target);
		});
	});

	document.querySelectorAll("input[data-bindto]").forEach(elem => {
		elem.addEventListener("input", event => {
			reverseColorSync(event.target);
		});
	});
});

function labelCheckedUpdate(element, rippleRadios = false) {
	let elementLabel = element.parentElement;
	while(elementLabel.tagName.toUpperCase() !== "LABEL") {
		if(elementLabel.tagName.toUpperCase() === "BODY") {
			// No corresponding label wrapped around it. Searching by id + for bind
			if(element.id) elementLabel = document.querySelector(`label[for='${element.id}']`);
			// If label not found, do nothing
			if(!elementLabel || elementLabel.tagName.toUpperCase() !== "LABEL") return;
		} else {
			elementLabel = elementLabel.parentElement;
		}
	}

	if(element.checked) {
		elementLabel.classList.add("label-checked");
	} else {
		elementLabel.classList.remove("label-checked");
	}

	if(rippleRadios && element.type.toUpperCase() === "RADIO") {
		document.querySelectorAll(`input[name='${element.name}']`).forEach(elem => labelCheckedUpdate(elem));
	}
}

function colorSync(element) {
	document.querySelector(`input[type="text"][data-bindto="${element.dataset.columnname}"]`).value = element.value.toUpperCase();
}

function reverseColorSync(element) {
	// TODO: Add warning/fix inputs that are invalid
	if(!/#[0-9A-F]{6}/.test(element.value.toUpperCase())) return;
	document.querySelector(`input[type="color"][data-columnname="${element.dataset.bindto}"]`).value = element.value.toUpperCase();
}