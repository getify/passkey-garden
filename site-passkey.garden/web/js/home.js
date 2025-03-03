import { cancelEvent, } from "./nav.js";
import { openDrawer, } from "./drawer.js";


var selectIconEl;
var selectColorEl;
var selectSizeEl;
var selectTextEl;
var uploadInstructionsEl;
var startUploadBtn;
var uploadPreviewImg;
var styledButtonsEl;
var titleEls;
var iconOpts;
var colorOpts;
var sizeOpts;


if (document.readyState == "loading") {
	document.addEventListener("DOMContentLoaded",init);
}
else {
	init();
}


// *************************

function init() {
	selectIconEl = document.querySelector("[rel*=js-select-icon]");
	selectColorEl = document.querySelector("[rel*=js-select-color]");
	selectSizeEl = document.querySelector("[rel*=js-select-size]");
	selectTextEl = document.querySelector("[rel*=js-select-text]");
	uploadInstructionsEl = document.querySelector("[rel*=js-upload-instructions]");
	startUploadBtn = document.querySelector("[rel*=js-start-upload-btn]");
	uploadPreviewImg = document.querySelector("[rel*=js-upload-preview-img");
	styledButtonsEl = document.querySelector("[rel*=js-styled-buttons]");
	titleEls = styledButtonsEl.querySelectorAll(".button-1[title], label:has(.button-2, .button-3)[title]");

	// discover all controls options
	[ iconOpts, colorOpts, sizeOpts, ] = (
		[ selectIconEl, selectColorEl, selectSizeEl, ]
			.map(selectEl => (
				[ ...selectEl.options, ]
					.map(optEl => optEl.value)
			))
	);

	document.querySelector("[rel*=js-controls] > form")
		.addEventListener("submit",cancelEvent,false);
	selectIconEl.addEventListener("change",onChangeIcon,false);
	selectColorEl.addEventListener("change",onChangeColor,false);
	selectSizeEl.addEventListener("change",onChangeSize,false);
	selectTextEl.addEventListener("change",onChangeText,false);
	startUploadBtn.addEventListener("click",promptUploadSVGFile,false);
	styledButtonsEl.addEventListener("click",onClickButton,false);
}

function onChangeIcon(evt) {
	if (evt.target.value == "icon-custom") {
		uploadInstructionsEl.classList.remove("hidden");
	}
	else {
		uploadInstructionsEl.classList.add("hidden");
		uploadPreviewImg.classList.add("hidden");
		document.body.style.removeProperty("--icon-url");
		document.body.classList.remove(...iconOpts);
		document.body.classList.add(evt.target.value);
	}
}

function onChangeColor(evt) {
	document.body.classList.remove(...colorOpts);
	document.body.classList.add(evt.target.value);
}

function onChangeSize(evt) {
	document.body.classList.remove(...sizeOpts);
	document.body.classList.add(evt.target.value);
}

function onChangeText(evt) {
	if (selectTextEl.value != "") {
		document.body.style.setProperty("--append-text",`"\u00a0${selectTextEl.value}"`);
		document.body.classList.add("append-text");
		for (let titleEl of titleEls) {
			if (/register/i.test(titleEl.title)) {
				titleEl.title = titleEl.title.replace(/^Register(?: \(.+?\))?/i,`Register ${selectTextEl.value}`);
			}
			else if (/login/i.test(titleEl.title)) {
				titleEl.title = titleEl.title.replace(/^Login(?: \(.+?\))?/i,`Login ${selectTextEl.value}`);
			}
		}
	}
	else {
		document.body.style.removeProperty("--append-text");
		document.body.classList.remove("append-text");
		for (let titleEl of titleEls) {
			if (/register/i.test(titleEl.title)) {
				titleEl.title = titleEl.title.replace(/^Register(?: \(.+?\))?/i,"Register");
			}
			else if (/login/i.test(titleEl.title)) {
				titleEl.title = titleEl.title.replace(/^Login(?: \(.+?\))?/i,"Login");
			}
		}
	}
}

async function promptUploadSVGFile() {
	var inpEl = document.createElement("input");
	inpEl.type = "file";
	inpEl.accept = "image/svg+xml,.svg";
	inpEl.classList.add("input-file");
	document.body.appendChild(inpEl);
	var pr = (
		new Promise((resl,rejt) => {
			inpEl.addEventListener("cancel",evt => rejt(
				new Error("File upload selection canceled",{ cause: evt, })
			));
			inpEl.addEventListener("change",() => {
				resl(inpEl.files[0]);
			});
		})
	);
	try {
		inpEl.click();
		let file = await pr;
		let svgText = await new Promise((resl,rejt) => {
			var reader = new FileReader();
			reader.onerror = evt => rejt(
				new Error("File read failed",{ cause: evt, })
			);
			reader.onload = evt => resl(evt.target.result);
			reader.readAsText(file);
		});
		document.body.classList.remove(...iconOpts);
		document.body.classList.add("icon-custom");
		document.body.style.setProperty("--icon-url",`url("data:image/svg+xml;base64,${btoa(svgText)}")`);
		uploadPreviewImg.classList.remove("hidden");
	}
	catch (err) {
		console.log(err);
		alert("Failed to upload custom SVG icon");
	}
	finally {
		inpEl.remove();
	}
}

function getStyledButton(el) {
	if (el.matches(".button-1, .button-2, .button-3")) {
		return el;
	}
	else if (el.matches("label:has(.button-2) i, label:has(.button-3) u")) {
		return el.closest("label").querySelector(".button-2, .button-3");
	}
	else {
		return el.closest(".button-1, .button-2, .button-3");
	}
}

function onClickButton(evt) {
	let btnEl = getStyledButton(evt.target);
	if (btnEl != null) {
		openDrawer(btnEl);
	}
}
