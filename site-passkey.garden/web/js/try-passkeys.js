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
var login2AccountIDEl;
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
	login2AccountIDEl = document.querySelector("[rel*=js-login-2-account-id]");
	login2Btn = document.querySelector("[rel*=js-login-2-btn]");
	login2ResultsEl = document.querySelector("[rel*=js-login-2-results]");

	if (!supportsWebAuthn) {
		webauthnSupportNoticeEl.classList.remove("hidden");
		registerNameEl.disabled = registerBtn.disabled = login1Btn.disabled =
			login2AccountIDEl.disabled = login2Btn.disabled = true;
	}
	else {
		if (!supportsConditionalMediation) {
			login2AutofillNoticeEl.classList.remove("hidden");
		}

		registerResultsEl.addEventListener("click",onClickCopyAccountID,false);
		registerNameEl.addEventListener("input",onInputRegisterName,false);
		registerNameEl.addEventListener("keydown",evt => onEnterSubmit(evt,registerBtn));
		registerBtn.addEventListener("click",onRegister,false);
		login1Btn.addEventListener("click",onDetectLogin,false);
		login2AccountIDEl.addEventListener("input",onInputLogin2AccountID,false);
		login2AccountIDEl.addEventListener("keydown",evt => onEnterSubmit(evt,login2Btn));
		login2Btn.addEventListener("click",onProvideLogin,false);
		startAutofill().catch(console.log);
	}
}

function onClickCopyAccountID(evt) {
	if (evt.target.matches(".icon-only-btn.copy")) {
		copyToClipboard(evt.target.dataset.accountId);
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
	var accountID = new Uint8Array(6);
	window.crypto.getRandomValues(accountID);

	var regOptions = regDefaults({
		authenticatorSelection: {
			authenticatorAttachment: "platform",
			residentKey: "required",
			requireResidentKey: true,
		},
		user: {
			name,
			displayName: name,
			id: accountID,
		},
	});
	try {
		let regResult = await register(regOptions);

		if (regResult.response != null) {
			let accountIDStr = toBase64String(accountID);
			registeredCredentials[accountIDStr] = regResult.response.credentialID;

			registerNameEl.value = "";
			onInputRegisterName();
			registerResultsEl.classList.remove("hidden");
			registerResultsEl.classList.add("register-results");
			registerResultsEl.innerHTML = (
				`Registered: <strong>${name}</strong>
				(Account ID: <strong>${accountIDStr}</strong>)
				<button type="button" class="icon-only-btn copy" rel="js-copy-account-id-btn"
				data-account-id="${accountIDStr}" title="Copy Account ID">Copy Account ID</button>
				`
			);
			return;
		}

		// note: if we get here, the operation was silently canceled
	}
	catch (err) {
		console.log(err);
		registerResultsEl.classList.remove("hidden","register-results");
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
			let accountIDStr = (
				authResult.response.accountID != null ?
					toBase64String(authResult.response.accountID) :

					null
			);
			login1ResultsEl.classList.remove("hidden");
			login1ResultsEl.innerHTML = (
				`Passkey login${accountIDStr != null ? ` (Account ID: ${accountIDStr})` : ""} successful!`
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

function onInputLogin2AccountID() {
	login2Btn.disabled = (login2AccountIDEl.value == "");
}

async function startAutofill() {
	if (!supportsConditionalMediation) {
		return;
	}

	resetAutofillCancelToken();
	login2AccountIDEl.setAttribute("placeholder","(enter or autofill ID)");

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
			let accountIDStr = (
				authResult.response.accountID != null ?
					toBase64String(authResult.response.accountID) :

					null
			);
			login2ResultsEl.classList.remove("hidden");
			login2ResultsEl.innerHTML = (
				`Passkey login${accountIDStr != null ? ` (Account ID: ${accountIDStr})` : ""} successful!`
			);
			startAutofill().catch(console.log);
			return;
		}

		// note: if we get here, the operation was silently canceled
		login2AccountIDEl.setAttribute("placeholder","(enter ID)");
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

	// show the Account ID in the input box, for UX purposes
	if (authResult && authResult.response && authResult.response.accountID) {
		login2Btn.classList.add("hidden");
		login2AccountIDEl.readonly = true;
		login2AccountIDEl.value = toBase64String(authResult.response.accountID);
		login2AccountIDEl.select();

		// brief pause to ensure user can see their Account ID
		// filled in
		await new Promise(res => setTimeout(res,500));

		login2Btn.classList.remove("hidden");
		login2AccountIDEl.readonly = false;
		login2AccountIDEl.value = "";
		clearSelection();
	}
}

async function onProvideLogin() {
	var accountID = login2AccountIDEl.value.trim().slice(0,25);

	// not previously recorded Account ID (in memory only!) for a
	// registered credential?
	if (!(accountID in registeredCredentials)) {
		login2ResultsEl.classList.remove("hidden");
		login2ResultsEl.innerHTML = "Unknown Account ID, likely because it wasn't registered since this page was loaded. Please register a new account on this page, and then try again.";
		return;
	}

	resetAutofillCancelToken();
	autofillCancelToken = new AbortController();
	var authOptions = authDefaults({
		mediation: "required",
		userVerification: "required",
		allowCredentials: [{
			type: "public-key",
			id: registeredCredentials[accountID],
		}],
		signal: autofillCancelToken.signal,
	});
	try {
		let authResult = await auth(authOptions);
		// console.log("authResult",authResult);
		if (authResult != null) {
			let accountIDStr = (
				authResult.response.accountID != null ?
					toBase64String(authResult.response.accountID) :

					null
			);
			login2ResultsEl.classList.remove("hidden");
			login2ResultsEl.innerHTML = (
				`Passkey login${accountIDStr != null ? ` (Account ID: ${accountIDStr})` : ""} successful!`
			);
			login2AccountIDEl.value = "";
			onInputLogin2AccountID();
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
