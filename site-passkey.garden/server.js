"use strict";

process.on("uncaughtException",function(err){
	console.log(err.stack);
});


var path = require("path");
var http = require("http");
var httpServer = http.createServer(handleRequest);

var nodeStaticAlias = require("@getify/node-static-alias");

var HSTSHeader = {
	"Strict-Transport-Security": `max-age=${ 1E9 }`,
};
var noSniffHeader = {
	// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options
	"X-Content-Type-Options": "nosniff",
};
var CSPHeader = {
	"Content-Security-Policy":
		[
			`default-src ${[
				"'self'",
			].join(" ")};`,

			`style-src ${[
				"'self'",
				"'unsafe-inline'",
			].join(" ")};`,

			`img-src ${[
				"'self'",
				"data:",
			].join(" ")};`,

			`connect-src ${[
				"'self'",
			].join(" ")};`,

			`script-src ${[
				"'self'",
				"'wasm-unsafe-eval'",
			].join(" ")};`,
		].join(" ")
};

const OLD_EXPIRES = "Thu, 01 Jan 1970 00:00:01 UTC";
const COOKIE_PARAMS = "domain=passkey.garden; path=/; SameSite=Lax; Secure";
const CLEAR_COOKIE = `${COOKIE_PARAMS}; Expires=${OLD_EXPIRES}`;
const STATIC_DIR = path.join(__dirname,"web");
const DEV = false;
const CACHE_FILES = false;

var staticServer = new nodeStaticAlias.Server(STATIC_DIR,{
	serverInfo: "Passkey Garden",
	cache: CACHE_FILES ? (60 * 60 * 3) : 0,
	cacheStaleRevalidate: CACHE_FILES ? (60 * 60 * 24 * 7) : 0,
	gzip: /^(?:(?:text\/.+)|(?:image\/svg\+xml)|(?:application\/javascript)|(?:application\/json)|(?:application\/manifest\+json))(?:; charset=utf-8)?$/,
	headers: {
		...(!DEV ? HSTSHeader : {}),
	},
	onContentType(contentType,headers) {
		// apparently this is the new preferred mime-type for JS
		if (contentType == "application/javascript") {
			contentType = "text/javascript";
		}

		// only add CSP headers for text/html pages
		if (contentType == "text/html") {
			Object.assign(headers,CSPHeader);
		}

		// no-sniff header for CSS and JS only
		if (/^(?:text\/(?:css|javascript))|(?:application\/json)$/.test(contentType)) {
			Object.assign(headers,noSniffHeader);
		}

		// add utf-8 charset for some text file types
		if (
			/^((text\/(?:html|css|javascript))|(?:application\/json)|(image\/svg\+xml)|(application\/manifest\+json))$/.test(contentType)
		) {
			contentType = `${contentType}; charset=utf-8`;
		}

		return contentType;
	},
	indexFile: "index.html",
	alias: [
		// basic static page friendly URL rewrites
		{
			match: /^\/(?:index(?:\.html)?)?(?:[#?]|$)/,
			serve: "index.html",
		},
		{
			match: /^\/(?:more|try-passkeys)(?:[#?]|$)/,
			serve: "<% basename %>.html",
		},
		{
			match: /[^]/,
			serve: "<% absPath %>",
		},
	],
});

httpServer.listen(8052,"127.0.0.1");


// *************************************

function handleRequest(req,res) {
	if (!DEV && !/^passkey\.garden$/.test(req.headers["host"])) {
		res.writeHeader(307,{
			Location: `https://passkey.garden${req.url}`,
			"Cache-Control": "public, max-age=3600",
			Expires: new Date(Date.now() + (3600 * 1000) ).toUTCString(),
		});
		res.end();
	}
	// unconditional, permanent HTTPS redirect
	else if (!DEV && req.headers["x-forwarded-proto"] !== "https") {
		res.writeHead(301,{
			"Cache-Control": "public, max-age=31536000",
			Expires: new Date(Date.now() + 31536000000).toUTCString(),
			Location: `https://passkey.garden${req.url}`
		});
		res.end();
	}
	else {
		onRequest(req,res);
	}
}

async function onRequest(req,res) {
	// process inbound request?
	if ([ "GET", "HEAD", ].includes(req.method)) {
		if (req.method == "GET") {
			let parsedURL = new URL(req.url,"https://passkey.garden");
			req.params = Object.fromEntries(parsedURL.searchParams.entries());
		}
	}

	if (["GET","OPTIONS"].includes(req.method)) {
		if (!DEV) {
			// basic page load logging
			if (/^\/(?:index\.html)?(?:[\?#]|$)/.test(req.url)) {
				console.log(`page request: ${
					req.headers["x-forwarded-for"]?.split(',').shift() ||
					req.socket?.remoteAddress
				} | ${new Date(Date.now()).toLocaleString("en-US")}`);
			}
		}

		// handle all other static files
		staticServer.serve(req,res,async function onStaticComplete(err){
			if (err && !res.writableEnded) {
				try {
					res.writeHead(404,{
						"Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
					});
					res.end();
				}
				catch (err2) {
					console.error(`Failed sending '404' on missing file (${req.url}); ${err2.stack}`);
					res.writeHead(500);
					res.end();
				}
			}
		});
	}
	else {
		res.writeHead(404);
		res.end();
	}
}

function serveFile(url,statusCode,headers,req,res) {
	var listener = staticServer.serveFile(url,statusCode,headers,req,res);
	return new Promise(function c(resolve,reject){
		listener.on("success",resolve);
		listener.on("error",reject);
	});
}
