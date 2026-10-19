import { a as require_jsx_runtime, c as __toESM, i as TabItem, n as getOrCreateAuthToken, o as require_client, r as Button, s as require_react, t as AuthTokenSection } from "./authToken.js";
//#region src/ui/connect.tsx
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_client = require_client();
var import_jsx_runtime = require_jsx_runtime();
var SUPPORTED_PROTOCOL_VERSION = 2;
var clientInfo = (() => {
	try {
		return JSON.parse(new URLSearchParams(window.location.search).get("client") || "{}").name || "unknown";
	} catch {
		return "unknown";
	}
})();
var ConnectApp = () => {
	const [tabs, setTabs] = (0, import_react.useState)([]);
	const [status, setStatus] = (0, import_react.useState)(null);
	const [showTabList, setShowTabList] = (0, import_react.useState)(true);
	const setError = (0, import_react.useCallback)((message) => {
		setShowTabList(false);
		setStatus({
			type: "error",
			message
		});
	}, []);
	(0, import_react.useEffect)(() => {
		const runAsync = async () => {
			const params = new URLSearchParams(window.location.search);
			const relayUrl = params.get("mcpRelayUrl");
			if (!relayUrl) {
				setError("Missing mcpRelayUrl parameter in URL.");
				return;
			}
			try {
				const host = new URL(relayUrl).hostname;
				if (host !== "127.0.0.1" && host !== "[::1]") {
					setError(`Codex Browser Control only allows loopback connections (127.0.0.1 or [::1]). Received host: ${host}`);
					return;
				}
			} catch (e) {
				setError(`Invalid mcpRelayUrl parameter in URL: ${relayUrl}. ${e}`);
				return;
			}
			setStatus({
				type: "connecting",
				message: `"${clientInfo}" is trying to connect to Codex Browser Control.`
			});
			const parsedVersion = parseInt(params.get("protocolVersion") ?? "", 10);
			const requestedVersion = isNaN(parsedVersion) ? 1 : parsedVersion;
			if (requestedVersion > SUPPORTED_PROTOCOL_VERSION) {
				const extensionVersion = chrome.runtime.getManifest().version;
				setShowTabList(false);
				setStatus({
					type: "error",
					versionMismatch: { extensionVersion }
				});
				return;
			}
			if (requestedVersion < SUPPORTED_PROTOCOL_VERSION) {
				setError("The client uses an unsupported protocol version. Update the Codex browser plugin to the latest version.");
				return;
			}
			await chrome.runtime.sendMessage({
				type: "connectionRequested",
				mcpRelayUrl: relayUrl
			});
			const expectedToken = getOrCreateAuthToken();
			const token = params.get("token");
			if (token === expectedToken) {
				await handleConnectToTab();
				return;
			}
			if (token) {
				setError("Invalid token provided.");
				return;
			}
			if (params.get("newTab") === "true") setShowTabList(false);
			else await loadTabs();
		};
		runAsync();
		const keepalive = setInterval(() => {
			chrome.runtime.sendMessage({ type: "keepalive" }).catch(() => {});
		}, 2e4);
		return () => clearInterval(keepalive);
	}, []);
	const loadTabs = (0, import_react.useCallback)(async () => {
		const response = await chrome.runtime.sendMessage({ type: "getTabs" });
		if (response.success) setTabs(response.tabs);
		else setStatus({
			type: "error",
			message: "Failed to load tabs: " + response.error
		});
	}, []);
	const handleConnectToTab = (0, import_react.useCallback)(async (tab) => {
		setShowTabList(false);
		try {
			const response = await chrome.runtime.sendMessage({
				type: "connectToTab",
				tab,
				clientName: clientInfo
			});
			if (response?.success) setStatus({
				type: "connected",
				message: `"${clientInfo}" connected.`
			});
			else setStatus({
				type: "error",
				message: response?.error || `"${clientInfo}" failed to connect.`
			});
		} catch (e) {
			setStatus({
				type: "error",
				message: `"${clientInfo}" failed to connect: ${e}`
			});
		}
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "app-container",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "content-wrapper",
			children: [
				status && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "status-container",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBanner, { status })
				}),
				status?.type === "connecting" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "warning-banner",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "⚠️ Warning:" }), " Allowing this connection lets the client inspect and control the selected tab and any tabs you add to the codex group. Those pages may contain signed-in sessions and private content. Only approve a client you trust. If you configure token-based reconnection, the client can reconnect without showing this dialog again."]
				}),
				status?.type === "connecting" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthTokenSection, {}),
				showTabList && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "tab-section-title",
					children: "You can drag tabs into the codex group later to make them accessible to the client. Optionally, select a tab to allow and immediately switch to it:"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: tabs.map((tab) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabItem, {
					tab,
					button: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "primary",
						onClick: () => handleConnectToTab(tab),
						children: "Allow & select"
					})
				}, tab.id)) })] })
			]
		})
	});
};
var VersionMismatchError = ({ extensionVersion }) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		"Codex Browser Control requires a newer extension version (current version: ",
		extensionVersion,
		").",
		" ",
		"Update the extension from ",
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
			href: "https://github.com/EuZaqueuNilton/codex-browser-playwright/releases/latest",
			target: "_blank",
			rel: "noopener noreferrer",
			children: "GitHub releases"
		}),
		".",
		" ",
		"See ",
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
			href: "https://github.com/EuZaqueuNilton/codex-browser-playwright/blob/release/README.md",
			target: "_blank",
			rel: "noopener noreferrer",
			children: "installation instructions"
		}),
		" for more details."
	] });
};
var StatusBanner = ({ status }) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: `status-banner ${status.type}`,
		children: "versionMismatch" in status ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VersionMismatchError, { extensionVersion: status.versionMismatch.extensionVersion }) : status.message
	});
};
var container = document.getElementById("root");
if (container) (0, import_client.createRoot)(container).render(/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConnectApp, {}));
//#endregion
