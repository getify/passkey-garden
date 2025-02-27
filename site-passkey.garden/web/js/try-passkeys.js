import { closeNavMenu, } from "./nav.js";
import {
	supportsWebAuthn,
	supportsConditionalMediation,
	register,
	regDefaults,
	auth,
	authDefaults,
	toBase64String,
	resetAbortReason,
} from "./external/@lo-fi/webauthn-local-client/walc.js";


var webauthnSupportNoticeEl;
var registerNameEl;
var registerBtn;
var registerResultsEl;
var login1Btn;
var login1ResultsEl;
var login2AutofillNoticeEl;
var login2UserIDEl;
var login2Btn;
var login2ResultsEl;

var registeredCredentials = {};
var autofillCancelToken;


if (document.readyState == "loading") {
	document.addEventListener("DOMContentLoaded",init);
}
else {
	init();
}


// *************************

function init() {
	webauthnSupportNoticeEl = document.querySelector("[rel*=js-webauthn-support-notice]");
	registerNameEl = document.querySelector("[rel*=js-register-name]");
	registerBtn = document.querySelector("[rel*=js-register-btn]");
	registerResultsEl = document.querySelector("[rel*=js-register-results]");
	login1Btn = document.querySelector("[rel*=js-login-1-btn]");
	login1ResultsEl = document.querySelector("[rel*=js-login-1-results]");
	login2AutofillNoticeEl = document.querySelector("[rel*=js-login-2-autofill-support-notice]");
	login2UserIDEl = document.querySelector("[rel*=js-login-2-user-id]");
	login2Btn = document.querySelector("[rel*=js-login-2-btn]");
	login2ResultsEl = document.querySelector("[rel*=js-login-2-results]");

	if (!supportsWebAuthn) {
		webauthnSupportNoticeEl.classList.remove("hidden");
		registerNameEl.disabled = registerBtn.disabled = login1Btn.disabled =
			login2UserIDEl.disabled = login2Btn.disabled = true;
	}
	else {
		if (!supportsConditionalMediation) {
			login2AutofillNoticeEl.classList.remove("hidden");
		}

		registerResultsEl.addEventListener("click",onClickCopyUserID,false);
		registerNameEl.addEventListener("input",onInputRegisterName,false);
		registerNameEl.addEventListener("keydown",evt => onEnterSubmit(evt,registerBtn));
		registerBtn.addEventListener("click",onRegister,false);
		login1Btn.addEventListener("click",onDetectLogin,false);
		login2UserIDEl.addEventListener("input",onInputLogin2UserID,false);
		login2UserIDEl.addEventListener("keydown",evt => onEnterSubmit(evt,login2Btn));
		login2Btn.addEventListener("click",onProvideLogin,false);
		startAutofill().catch(console.log);
	}
}

function onClickCopyUserID(evt) {
	if (evt.target.matches(".icon-only-btn.copy")) {
		copyToClipboard(evt.target.dataset.userId);
	}
}

function onInputRegisterName() {
	registerBtn.disabled = (registerNameEl.value == "");
}

async function onRegister() {
	resetAutofillCancelToken();

	if (registerNameEl.value == "") {
		alert("Please enter an account label to register with.");
		return;
	}
	var name = registerNameEl.value.trim().slice(0,25);
	var userID = new Uint8Array(6);
	window.crypto.getRandomValues(userID);

	var regOptions = regDefaults({
		authenticatorSelection: {
			authenticatorAttachment: "platform",
			residentKey: "required",
			requireResidentKey: true,
		},
		user: {
			name,
			displayName: name,
			id: userID,
		},
	});
	try {
		let regResult = await register(regOptions);

		if (regResult.response != null) {
			let userIDStr = toBase64String(userID);
			registeredCredentials[userIDStr] = regResult.response.credentialID;

			registerNameEl.value = "";
			onInputRegisterName();
			registerResultsEl.classList.remove("hidden");
			registerResultsEl.innerHTML = (
				`Registered: <strong>${name}</strong>
				(User ID: <strong>${userIDStr}</strong>)
				<button type="button" class="icon-only-btn copy" rel="js-copy-user-id-btn"
				data-user-id="${userIDStr}" title="Copy User ID">Copy User ID</button>
				`
			);
			return;
		}

		// note: if we get here, the operation was silently canceled
	}
	catch (err) {
		console.log(err);
		registerResultsEl.classList.remove("hidden");
		registerResultsEl.innerHTML = (
			"Sorry, something went wrong. Please try again."
		);
		return;
	}
	finally {
		startAutofill().catch(console.log);
	}
}

async function onDetectLogin() {
	resetAutofillCancelToken();

	var authOptions = authDefaults({
		mediation: "required",
		userVerification: "required",
	});

	try {
		let authResult = await auth(authOptions);

		if (authResult.response != null) {
			let userIDStr = (
				authResult.response.userID != null ?
					toBase64String(authResult.response.userID) :

					null
			);
			login1ResultsEl.classList.remove("hidden");
			login1ResultsEl.innerHTML = (
				`Passkey login${userIDStr != null ? ` (User ID: ${userIDStr})` : ""} successful!`
			);
			return;
		}

		// note: if we get here, the operation was silently canceled
	}
	catch (err) {
		console.log(err);
		login1ResultsEl.classList.remove("hidden");
		login1ResultsEl.innerHTML = (
			"Sorry, something went wrong. Please try again."
		);
		return;
	}
	finally {
		startAutofill().catch(console.log);
	}
}

function onInputLogin2UserID() {
	login2Btn.disabled = (login2UserIDEl.value == "");
}

async function startAutofill() {
	if (!supportsConditionalMediation) {
		return;
	}

	resetAutofillCancelToken();
	login2UserIDEl.setAttribute("placeholder","(enter user ID, or autofill)");

	autofillCancelToken = new AbortController();
	var authOptions = authDefaults({
		mediation: "conditional",
		userVerification: "required",
		signal: autofillCancelToken.signal,
	});
	try {
		let authResult = await auth(authOptions);
		if (authResult != null) {
			await onAuthAutofilled(authResult);
			let userIDStr = (
				authResult.response.userID != null ?
					toBase64String(authResult.response.userID) :

					null
			);
			login2ResultsEl.classList.remove("hidden");
			login2ResultsEl.innerHTML = (
				`Passkey login${userIDStr != null ? ` (User ID: ${userIDStr})` : ""} successful!`
			);
			startAutofill().catch(console.log);
			return;
		}

		// note: if we get here, the operation was silently canceled
		login2UserIDEl.setAttribute("placeholder","(enter user ID)");
	}
	catch (err) {
		console.log(err);
		login2ResultsEl.classList.remove("hidden");
		login2ResultsEl.innerHTML = (
			"Sorry, something went wrong. Please try again."
		);
		startAutofill().catch(console.log);
		return;
	}
}

async function onAuthAutofilled(authResult) {
	resetAutofillCancelToken();

	// show the User ID in the input box, for UX purposes
	if (authResult && authResult.response && authResult.response.userID) {
		login2Btn.classList.add("hidden");
		login2UserIDEl.readonly = true;
		login2UserIDEl.value = toBase64String(authResult.response.userID);
		login2UserIDEl.select();

		// brief pause to ensure user can see their User ID
		// filled in
		await new Promise(res => setTimeout(res,500));

		login2Btn.classList.remove("hidden");
		login2UserIDEl.readonly = false;
		login2UserIDEl.value = "";
		clearSelection();
	}
}

async function onProvideLogin() {
	var userID = login2UserIDEl.value.trim().slice(0,25);

	// not previously recorded user ID (in memory only!) for a
	// registered credential?
	if (!(userID in registeredCredentials)) {
		login2ResultsEl.classList.remove("hidden");
		login2ResultsEl.innerHTML = "Unknown User ID, likely because it wasn't registered since this page was loaded. Please register a new account on this page, and then try again.";
		return;
	}

	resetAutofillCancelToken();
	autofillCancelToken = new AbortController();
	var authOptions = authDefaults({
		mediation: "required",
		userVerification: "required",
		allowCredentials: [{
			type: "public-key",
			id: registeredCredentials[userID],
		}],
		signal: autofillCancelToken.signal,
	});
	try {
		let authResult = await auth(authOptions);
		// console.log("authResult",authResult);
		if (authResult != null) {
			let userIDStr = (
				authResult.response.userID != null ?
					toBase64String(authResult.response.userID) :

					null
			);
			login2ResultsEl.classList.remove("hidden");
			login2ResultsEl.innerHTML = (
				`Passkey login${userIDStr != null ? ` (User ID: ${userIDStr})` : ""} successful!`
			);
			login2UserIDEl.value = "";
			onInputLogin2UserID();
			return;
		}

		// note: if we get here, the operation was silently canceled
	}
	catch (err) {
		console.log(err);
		login2ResultsEl.classList.remove("hidden");
		login2ResultsEl.innerHTML = (
			"Sorry, something went wrong. Please try again."
		);
		return;
	}
	finally {
		startAutofill().catch(console.log);
	}
}

function resetAutofillCancelToken() {
	// cleanup cancel token
	if (autofillCancelToken) {
		autofillCancelToken.abort(resetAbortReason);
		autofillCancelToken = null;
	}
}

function clearSelection() {
	if (window.getSelection) {
		window.getSelection().removeAllRanges();
	}
	else if (document.selection) {
		document.selection.empty();
	}
}

async function copyToClipboard(text) {
	if (navigator.clipboard) {
		try {
			await navigator.clipboard.writeText(text);
		}
		catch (err) {}
	}
}

function onEnterSubmit(evt,btn) {
	if (evt.key == "Enter") {
		cancelEvent(evt);
		btn.click();
	}
}

function cancelEvent(evt) {
	if (evt != null) {
		evt.preventDefault();
		evt.stopImmediatePropagation();
		evt.stopPropagation();
	}
}
