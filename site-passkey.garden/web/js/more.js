import { prefersReducedMotion, } from "./util.js";
import { closeNavMenu, } from "./nav.js";


if (document.readyState == "loading") {
	document.addEventListener("DOMContentLoaded",init);
}
else {
	init();
}


// *************************

function init() {
	if (/^#.+/.test(document.location.hash)) {
		let element = document.getElementById(document.location.hash.slice(1));
		if (element) {
			showElement(element);
		}
	}

	document.addEventListener("click",onClick,true);
}

function onClick(evt) {
	if (evt.target.matches("#nav-menu li a")) {
		let url = new URL(evt.target.href,document.location.origin);

		// is this an in-page nav click?
		if (
			url.origin == document.location.origin &&
			url.pathname == document.location.pathname &&
			!(
				[ "", "#", ].includes(url.hash) ||
				url.hash == document.location.hash
			)
		) {
			closeNavMenu();
			if (/^#.+/.test(url.hash)) {
				showElement(
					document.getElementById(url.hash.slice(1))
				);
			}
		}
	}
	// in-page navigation link?
	else if (evt.target.matches(`a[href^="#"]:not(.more-anchor-link)`)) {
		let element = document.getElementById(evt.target.getAttribute("href").slice(1));
		if (element) {
			showElement(element);
		}
	}
}

function showElement(element) {
	if (element.matches("details")) {
		element.open = true;
	}
	else if (element.closest("details") != null) {
		element.closest("details").open = true;
	}
	element.scrollIntoView({
		block: "start",
		behavior: (prefersReducedMotion() ? "instant" : "smooth"),
	});
}
