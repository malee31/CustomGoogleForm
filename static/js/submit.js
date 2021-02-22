const mainForm = document.forms["mainForm"];
let disableLeaveWarning = false;
let disableSubmit = false;

/**
 * Collects all the data from form elements and assigns them to an object
 * @param {FormData} targetObject Object reference to assign the form data to
 * @param {HTMLFormElement} form The form to collect data from
 */
function collectFormData(targetObject, form) {
	for(const input of form.querySelectorAll("input")) {
		if(!input.dataset.columnname || targetObject.get(input.dataset.columnname)) continue;
		if(input.type === "checkbox") {
		// 	targetObject[input.dataset.columnname] = [];
			form.querySelectorAll(`input[type="checkbox"][name=${input.name}]`)
				.forEach(item => {
					if(item.checked) targetObject.append(input.dataset.columnname, item.value);
				});
		} else if(input.type === "radio") {
			form.querySelectorAll(`input[type="radio"][name=${input.name}]`)
				.forEach(item => {
					if(item.checked) targetObject.set(input.dataset.columnname, item.value);
				});
		} else {
			targetObject.set(input.dataset.columnname, input.value);
		}
	}
	console.log(targetObject);
}

function unloadHandler(event) {
	if(disableLeaveWarning) return;
	// Note: Modern browsers have removed the ability to add a custom message to the pop-up
	const warningMessage = "You will lose any information you have entered.\nAre you sure you want to exit?";
	(event || window.event).returnValue = warningMessage;
	return warningMessage;
}

/**
 * Handles all the overriding of the mainForm.
 */
function mainFormOverride() {
	window.addEventListener("beforeunload", unloadHandler);
	window.onbeforeunload = unloadHandler;

	mainForm.addEventListener("submit", event => {
		event.preventDefault();
		if(disableSubmit) return;

		const data = new FormData();
		data.append("formId", document.getElementById("formId").value);

		collectFormData(data, mainForm);

		const req = new XMLHttpRequest();
		req.addEventListener("load", event => {
			if(event.target.status === 200) {
				mainForm.parentNode.removeChild(mainForm);
			}

			toggleLoader(false);
			disableSubmit = false;
			disableLeaveWarning = true;

			toggleErrorBox(true, event.target.status === 200 ? "Thank You!" : ("Status code " + event.target.status), event.target.responseText);
		});

		req.addEventListener("error", event => {
			console.log("There's been an error");
			console.log(event);
		});

		// console.log("Sending " + data);
		req.open("POST", `${window.location.origin}/submit`, true);
		// req.setRequestHeader("Content-Type", "application/json");
		// req.setRequestHeader("Content-Type", "multipart/form-data");
		req.send(data);

		toggleLoader(true);
		disableSubmit = true;
	});
}

// Overrides all the forms and handles redirects once the window loads.
window.addEventListener("load", mainFormOverride);
