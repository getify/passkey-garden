import {
	prefersReducedMotion,
	getStyledButton,
	cancelEvent,
} from "./util.js";


var tryClickingTheseEl;
var drawerEl;
var drawerCloseBtn;
var drawerButtonPreviewEl;
var drawerBtnsEl;
var titleEls;
var previewMarkup;
var previewExport;
var iconCache = {};
var subjectBtn;
var timerIntv;
var drawerAlreadyOpened = false;
var downloadZip;


if (document.readyState == "loading") {
	document.addEventListener("DOMContentLoaded",init);
}
else {
	init();
}


export {
	drawerAlreadyOpened,
	openDrawer,
};


// *************************

function init() {
	tryClickingTheseEl = document.querySelector("[rel*=js-try-clicking-these]");
	drawerEl = document.querySelector("[rel*=js-drawer-container]");
	drawerCloseBtn = drawerEl.querySelector("[rel*=js-close-drawer-btn]");
	drawerButtonPreviewEl = drawerEl.querySelector("[rel*=js-drawer-button-preview]");
	drawerBtnsEl = drawerEl.querySelector("[rel*=js-drawer-buttons");

	for (let el of drawerEl.querySelectorAll(
		"[rel*=js-close-drawer-btn], [rel*=js-drawer-buttons] > button"
	)) {
		el.setAttribute("tabindex","-1");
	}
	drawerEl.setAttribute("aria-hidden","true");

	drawerCloseBtn.addEventListener("click",closeDrawer,false);
	drawerBtnsEl.addEventListener("click",onDrawerButtonClick,false);

	// initially delay showing the "try clicking these..." hint
	setTimeout(showHint,2 * 1000);

	// hide the hint after 30s
	timerIntv = setTimeout(hideHint,30 * 1000);
}

function showHint() {
	// drawer hasn't been opened yet?
	if (!drawerAlreadyOpened) {
		tryClickingTheseEl.classList.remove("hidden");
		// hack to force reflow
		tryClickingTheseEl.dataset.ow = tryClickingTheseEl.offsetWidth;
		tryClickingTheseEl.classList.add("animated");
	}
}

function hideHint() {
	if (timerIntv != null) {
		clearTimeout(timerIntv);
		timerIntv = null;
	}
	tryClickingTheseEl.classList.remove("animated");
	// hack to force reflow
	tryClickingTheseEl.dataset.ow = tryClickingTheseEl.offsetWidth;
	tryClickingTheseEl.classList.add("hidden");
}

async function openDrawer(btnEl) {
	if (btnEl != null) {
		drawerAlreadyOpened = true;
		subjectBtn = btnEl;

		hideHint();

		let btnClasses = [ ...btnEl.classList, ];
		let bodyClasses = [ ...document.body.classList, ];

		let selectedModeBackground = (
			getComputedStyle(btnEl.closest(".light-mode, .dark-mode"))
				.backgroundColor
		)
		let btnTypes = [ "button-1", "button-2", "button-3", ];
		let selectedBtnType = (
			btnClasses
				.find(cls => btnTypes.includes(cls)) ??

				"button-1"
		);

		let selectedText = (
			`${
				(
					[ "button-1", "button-2", ].includes(selectedBtnType) ?
						btnEl :

						btnEl.closest("label")
				).querySelector("u").innerText
			}${
				bodyClasses.includes("append-text") ?
					` ${
						(
							(document.body.style.getPropertyValue("--append-text") ?? "")
								.match(/^"\s+(.+)"$/) || []
						)[1] ?? ""
					}` :

					""
			}`
		);

		let btnStyle = getComputedStyle(btnEl);
		let btnFont = btnStyle.fontFamily;
		let buttonIconSize = btnStyle.getPropertyValue("--button-icon-size");
		let buttonContentColor = btnStyle.getPropertyValue("--button-content-color");
		let buttonBackgroundColor = btnStyle.getPropertyValue("--button-background-color");
		let iconURL = btnStyle.getPropertyValue("--icon-url");
		if (
			!bodyClasses.includes("custom-icon") &&
			iconURL != null &&
			iconURL != ""
		) {
			if (iconCache[iconURL] == null) {
				let imgURL = (
					iconURL.match(/^\s*url\(\.(\.\/images\/[^\/\s]+)\)\s*$/) ?? []
				)[1];
				if (imgURL != null) {
					try {
						let resp = await fetch(imgURL);
						if (resp.ok) {
							iconCache[iconURL] = await resp.text();
						}
					}
					catch (err) {
						console.log(`Failed loading contents of '${imgURL}' for CSS inlining; ${err.toString()}`);
					}
				}
			}
			if (iconCache[iconURL] != null) {
				iconURL = `url("data:image/svg+xml;base64,${btoa(iconCache[iconURL])}")`;
			}
		}
		let iconFilter = (
			[ "button-1", "button-3", ].includes(selectedBtnType) ? (
				getComputedStyle(btnEl,"::before")
					.getPropertyValue("--icon-filter")
			) :

			selectedBtnType == "button-2" ? (
				getComputedStyle(btnEl.closest("label").querySelector("i"))
					.getPropertyValue("--icon-filter")
			) :

			null
		);
        let btnVariables = getButtonVariables(
			buttonIconSize,
			buttonContentColor,
			buttonBackgroundColor,
			iconURL,
			iconFilter
		);

		let btnCSS = (
			selectedBtnType == "button-1" ? (`
.passkey-button-1 {
    ${btnVariables}
    --button-icon-padding: calc(var(--button-icon-size) / 2);
    --button-vertical-padding: calc(var(--button-icon-size) * 0.6);
    --button-horizontal-padding: calc(var(--button-icon-padding) * 2);
    --button-height: calc(
        var(--button-icon-size) +
        (var(--button-vertical-padding) * 2)
    );

    box-sizing: border-box;
    display: inline-flex;
    flex-flow: row nowrap;
    column-gap: var(--button-icon-padding);
    align-items: center;
    justify-items: start;
    border: none;
    border-radius: var(--button-vertical-padding);
    color: var(--button-content-color);
    background-color: var(--button-background-color);
    font-size: var(--button-icon-size);
    line-height: var(--button-icon-size);
    width: min-content;
    height: var(--button-height);
    padding:
        var(--button-vertical-padding)
        var(--button-horizontal-padding);
    white-space: nowrap;
}
.passkey-button-1::before {
    content: "";
    box-sizing: inherit;
    display: inline-block;
    width: var(--button-icon-size);
    height: var(--button-icon-size);
    background-position: 0;
    background-size: var(--button-icon-size);
    background-repeat: no-repeat;
    background-image: var(--icon-url);
    filter: var(--icon-filter);
}
            `).trim() :

			selectedBtnType == "button-2" ? (`
label:has(.passkey-button-2) {
    ${btnVariables}
    --button-icon-padding: calc(var(--button-icon-size) / 2);
    --button-vertical-padding: calc(var(--button-icon-size) * 0.6);
    --button-horizontal-padding: calc(var(--button-icon-padding) * 2);
    --button-height: calc(
        var(--button-icon-size) +
        (var(--button-vertical-padding) * 2)
    );
    --larger-outside-button-icon-size: calc(var(--button-icon-size) * 1.8);

    box-sizing: border-box;
    display: inline-flex;
    flex-flow: row nowrap;
    column-gap: var(--button-icon-padding);
    align-items: center;
    justify-items: start;
}
label:has(.passkey-button-2) > i {
    box-sizing: inherit;
    display: inline-block;
    min-width: var(--larger-outside-button-icon-size);
    width: var(--larger-outside-button-icon-size);
    height: var(--larger-outside-button-icon-size);
    min-height: var(--larger-outside-button-icon-size);
    background-position: 0;
    background-size: var(--larger-outside-button-icon-size);
    background-repeat: no-repeat;
    background-image: var(--icon-url);
    filter: var(--icon-filter);
}
.passkey-button-2 {
    box-sizing: inherit;
    border: none;
    border-radius: var(--button-vertical-padding);
    color: var(--button-content-color);
    background-color: var(--button-background-color);
    font-size: var(--button-icon-size);
    line-height: var(--button-icon-size);
    width: min-content;
    height: var(--button-height);
    padding:
        var(--button-vertical-padding)
        var(--button-horizontal-padding);
    white-space: nowrap;
}
            `).trim() :

			selectedBtnType == "button-3" ? (`
label:has(.passkey-button-3) {
    ${btnVariables}
    --button-icon-padding: calc(var(--button-icon-size) / 2);
    --button-vertical-padding: calc(var(--button-icon-size) * 0.6);
    --button-horizontal-padding: calc(var(--button-icon-padding) * 2);
    --button-height: calc(
        var(--button-icon-size) +
        (var(--button-vertical-padding) * 2)
    );
    --solo-button-size: calc(var(--button-height) * 0.8);
    --solo-button-icon-size: calc(var(--solo-button-size) * 0.7);

    box-sizing: border-box;
    display: inline-flex;
    flex-flow: row nowrap;
    column-gap: var(--button-icon-padding);
    align-items: center;
    justify-items: start;
    font-size: var(--solo-button-icon-size);
    color: var(--button-background-color);
    white-space: nowrap;
}
.passkey-button-3 {
    box-sizing: inherit;
    display: inline-block;
    border: none;
    border-radius: calc(var(--solo-button-icon-size) * 0.25);
    width: min-content;
    height: var(--solo-button-size);
    padding: 0;
    font-size: 0.01px;
    color: rgba(0,0,0,0);
    background-color: var(--button-background-color);
    white-space: nowrap;
}
.passkey-button-3::before {
    content: "";
    display: inline-block;
    width: var(--solo-button-size);
    height: var(--solo-button-size);
    background-position: 50% 50%;
    background-size: var(--solo-button-icon-size);
    background-repeat: no-repeat;
    background-image: var(--icon-url);
    filter: var(--icon-filter);
}
            `).trim() :

			null
		);

		let btnMarkup = (
			selectedBtnType == "button-1" ? (`
    <button type="button" class="passkey-button-1" aria-label="Click to ${selectedText}">
        ${selectedText}
    </button>
        `).trim() :

			selectedBtnType == "button-2" ? (`
    <label aria-label="Click to ${selectedText}">
        <i role="presentation"></i>
        <button type="button" class="passkey-button-2">${selectedText}</button>
    </label>
        `).trim() :

			selectedBtnType == "button-3" ? (`
    <label aria-label="Click to ${selectedText}">
        <button type="button" class="passkey-button-3"></button>
        ${selectedText}
    </label>
        `).trim() :

			null
		);

		previewMarkup = (`
<style>
#button-container {
    box-sizing: border-box;
    font-family: ${btnFont ?? "inherit"};
    background-color: ${selectedModeBackground ?? "inherit"};
    text-align: center;
    padding: 2rem 3rem;
}
${btnCSS}
</style>

<div id="button-container">
    ${btnMarkup}
</div>
		`).trim();

		previewExport = {
			"passkey-button.svg": (
				atob(
					(iconURL.match(/^.*base64,(.*)"\)$/i) ?? [])[1] ?? ""
				)
			),
			"passkey-button.css": (
				btnCSS
					.replace(
						/--icon-url:\s*(?:;|url.*?base64[^;]+;)/i,
						`--icon-url: url(./passkey-button.svg);`
					)
			),
			"index.html": (`
<!DOCTYPE html>
<html>
<head>
<title>Passkey Button</title>
<link rel="stylesheet" href="./passkey-button.css">
<style>
#button-container {
    box-sizing: border-box;
    font-family: ${btnFont ?? "inherit"};
    background-color: ${selectedModeBackground ?? "inherit"};
    text-align: center;
    padding: 2rem 3rem;
}
</style>
</head>
<body>
<div id="button-container">
    ${btnMarkup}
</div>
</body>
</html>
            `).trim(),
		};

		drawerButtonPreviewEl.innerHTML = previewMarkup;

		// drawer is currently closed?
		if (drawerEl.matches(".hidden")) {
			for (let el of drawerEl.querySelectorAll(
				"[rel*=js-close-drawer-btn], [rel*=js-drawer-buttons] > button"
			)) {
				el.removeAttribute("tabindex");
			}

			drawerEl.classList.remove("hidden");
			drawerEl.setAttribute("aria-expanded","true");
			drawerEl.removeAttribute("aria-hidden");

			document.addEventListener("click",clickHideDrawer,true);
			document.addEventListener("keydown",onDrawerKey,true);
		}

		let previewBtn = drawerButtonPreviewEl.querySelector("button");
		previewBtn.disabled = true;
		previewBtn.setAttribute("tabindex","-1");
		previewBtn.setAttribute("aria-role","presentation");
		let labelParentEl = previewBtn.closest("label");
		if (labelParentEl != null) {
			labelParentEl.setAttribute("tabindex","-1");
			labelParentEl.setAttribute("aria-role","presentation");
		}

		drawerEl.querySelector("[rel*=js-copy-html-css-btn]").focus();

		setTimeout(() => {
			btnEl.scrollIntoView({
				block: "center",
				behavior: (prefersReducedMotion() ? "instant" : "smooth"),
			});
		},125);

		// still need to lazy load this library?
		if (downloadZip == null) {
			({ downloadZip, } = await import("/js/external/client-zip/index.js"));
			drawerEl.querySelector("[rel*=js-download-zip-btn]").disabled = false;
		}
	}
}

function getButtonVariables(
	buttonIconSize,
	buttonContentColor,
	buttonBackgroundColor,
	iconURL,
	iconFilter
) {
	return (`
    --button-icon-size: ${buttonIconSize ?? ""};
    --button-content-color: ${buttonContentColor ?? ""};
    --button-background-color: ${buttonBackgroundColor ?? ""};
    --icon-url: ${iconURL ?? ""};
    --icon-filter: ${iconFilter ?? ""};
	`).trim();
}

function clickHideDrawer(evt) {
	if (
		// drawer open?
		!drawerEl.matches(".hidden") &&

		// click outside the drawer?
		evt.target.closest("#drawer") == null &&

		// not clicking on one of the styled buttons
		// which would just re-open this drawer?
		getStyledButton(evt.target) == null
	) {
		// not a click on the open-nav-menu button?
		if (!evt.target.matches("[rel*=js-nav-menu-btn]")) {
			cancelEvent(evt);
		}
		closeDrawer();
	}
}

function closeDrawer() {
	drawerButtonPreviewEl.innerHTML = "";
	previewMarkup = previewExport = null;
	drawerEl.classList.add("hidden");
	drawerEl.setAttribute("aria-expanded","false");
	drawerEl.setAttribute("aria-hidden","true");

	for (let el of drawerEl.querySelectorAll(
		"[rel*=js-close-drawer-btn], [rel*=js-drawer-buttons] > button"
	)) {
		el.setAttribute("tabindex","-1");
	}

	document.removeEventListener("click",clickHideDrawer,true);
	document.removeEventListener("keydown",onDrawerKey,true);

	document.activeElement?.blur();
	if (subjectBtn != null) {
		subjectBtn.focus();
		subjectBtn = null;
	}
}

function onDrawerButtonClick(evt) {
	if (evt.target.matches("[rel*=js-copy-html-css-btn]")) {
		copyToClipboard(previewMarkup);
	}
	else if (evt.target.matches("[rel*=js-download-zip-btn]")) {
		exportZip();
	}
	else if (evt.target.matches("[rel*=js-try-passkeys-btn]")) {
		document.location.href = "/try-passkeys";
	}
}

function onDrawerKey(evt) {
	// drawer open?
	if (!drawerEl.matches(".hidden")) {
		// escape key pressed?
		if (evt.key == "Escape") {
			cancelEvent(evt);
			closeDrawer();
		}
	}
}

async function copyToClipboard(text) {
	if (navigator.clipboard) {
		try {
			await navigator.clipboard.writeText(text);
			await markButton(
				drawerEl.querySelector("[rel*=js-copy-html-css-btn]"),
				"copy"
			);
		}
		catch (err) {}
	}
}

async function exportZip() {
	try {
		let lastModified = new Date();
		let blob = await downloadZip(
			Object.entries(previewExport)
				.map(([ filename, contents, ]) => ({
					name: filename,
					lastModified,
					input: contents,
				}))
		).blob();

		let link = document.createElement("a");
		link.href = URL.createObjectURL(blob);
		link.download = "passkey-button.zip";
		link.click();
		link.remove();

		await markButton(
			drawerEl.querySelector("[rel*=js-download-zip-btn]"),
			"download"
		);
	}
	catch (err) {
		console.log(err);
		alert("Something failed in creating the .zip, please try again.");
	}
}

async function markButton(btnEl,iconClass) {
	btnEl.classList.remove(iconClass);
	btnEl.classList.add("check-markup");
	await new Promise(res => setTimeout(res,750));
	btnEl.classList.remove("check-markup");
	btnEl.classList.add(iconClass);
}
