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
	else {
		// open first element by default
		document.querySelector("details").open = true;
	}

	document.addEventListener("click",onClickInPageNavItem,true);
}

function onClickInPageNavItem(evt) {
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
}

function showElement(element) {
	if (element.matches("details")) {
		element.open = true;
	}
	else if (element.closest("details") != null) {
		element.closest("details").open = true;
	}
	element.scrollIntoView({ block: "start", behavior: "auto", });
}
