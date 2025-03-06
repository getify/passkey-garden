export {
	prefersReducedMotion,
	getStyledButton,
	cancelEvent,
};


// *************************

function prefersReducedMotion() {
	return (
		window.matchMedia("(prefers-reduced-motion: reduce)") === true ||
		window.matchMedia(`(prefers-reduced-motion: reduce)`).matches === true
	);
}

function getStyledButton(el) {
	if (el.matches(".button-1, .button-2, .button-3")) {
		return el;
	}
	else if (el.matches("label:has(.button-2, .button-3), label:has(.button-2) i, label:has(.button-3) u")) {
		return el.closest("label").querySelector(".button-2, .button-3");
	}
	else {
		return el.closest(".button-1, .button-2, .button-3");
	}
}

function cancelEvent(evt) {
	if (evt != null) {
		evt.preventDefault();
		evt.stopImmediatePropagation();
		evt.stopPropagation();
	}
}
