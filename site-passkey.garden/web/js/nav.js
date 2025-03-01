var navMenuBtn;
var navMenuEl;
var navMenuCloseBtn;
var navMenuItemEls;


if (document.readyState == "loading") {
	document.addEventListener("DOMContentLoaded",init);
}
else {
	init();
}


export {
	closeNavMenu,
	cancelEvent,
};


// *************************

function init() {
	navMenuBtn = document.querySelector("[rel*=js-nav-menu-btn");
	navMenuEl = document.querySelector("[rel*=js-nav-menu-slideout");
	navMenuCloseBtn = navMenuEl.querySelector("[rel*=js-close-nav-menu-btn");
	navMenuItemEls = [ ...navMenuEl.querySelectorAll("li a"), ];

	for (let el of navMenuEl.querySelectorAll(
		"[rel*=js-close-nav-menu-btn], ul > li > a"
	)) {
		el.setAttribute("tabindex","-1");
	}

	navMenuBtn.addEventListener("click",onToggleNavMenu,false);
	navMenuCloseBtn.addEventListener("click",onToggleNavMenu,false);
}

function clickHideNavMenu(evt) {
	if (
		// menu open?
		!navMenuEl.matches(".hidden") &&

		// click outside the menu?
		evt.target.closest("#nav-menu") == null
	) {
		cancelEvent(evt);
		closeNavMenu();
	}
	else if (evt.target.matches("ul > li > a")) {
		closeNavMenu();
	}
}

function onMenuKey(evt) {
	// menu open?
	if (!navMenuEl.matches(".hidden")) {
		// escape key pressed?
		if (evt.key == "Escape") {
			cancelEvent(evt);
			closeNavMenu();
		}
		// <left>, <up> key pressed?
		else if ([ "ArrowLeft", "ArrowUp", ].includes(evt.key)) {
			cancelEvent(evt);
			let idx = navMenuItemEls.indexOf(document.activeElement);
			if (idx == -1) idx = 2;
			navMenuItemEls[
				(idx + navMenuItemEls.length - 1) % navMenuItemEls.length
			].focus();
		}
		// <right>, <down> key pressed?
		else if ([ "ArrowRight", "ArrowDown", ].includes(evt.key)) {
			cancelEvent(evt);
			let idx = navMenuItemEls.indexOf(document.activeElement);
			navMenuItemEls[(idx + 1) % navMenuItemEls.length].focus();
		}
	}
}

function onToggleNavMenu() {
	// currently hidden?
	if (navMenuEl.matches(".hidden")) {
		navMenuEl.classList.remove("hidden");
		navMenuEl.removeAttribute("aria-hidden");
		navMenuEl.setAttribute("aria-expanded","true");
		for (let el of navMenuEl.querySelectorAll(
			"[rel*=js-close-nav-menu-btn], ul > li > a"
		)) {
			el.removeAttribute("tabindex");
		}
		navMenuEl.querySelector("ul > li > a").focus();

		document.addEventListener("click",clickHideNavMenu,true);
		document.addEventListener("keydown",onMenuKey,true);
	}
	else {
		closeNavMenu();
	}
}

function closeNavMenu(returnFocus = true) {
	navMenuEl.classList.add("hidden");
	navMenuEl.setAttribute("aria-hidden","true");
	navMenuEl.setAttribute("aria-expanded","false");
	for (let el of navMenuEl.querySelectorAll(
		"[rel*=js-close-nav-menu-btn], ul > li > a"
	)) {
		el.setAttribute("tabindex","-1");
	}

	if (returnFocus) {
		navMenuBtn.focus();
	}
	else {
		document.activeElement?.blur();
	}

	document.removeEventListener("click",clickHideNavMenu,true);
	document.removeEventListener("keydown",onMenuKey,true);
}

function cancelEvent(evt) {
	if (evt != null) {
		evt.preventDefault();
		evt.stopImmediatePropagation();
		evt.stopPropagation();
	}
}
