importScripts('https://storage.googleapis.com/workbox-cdn/releases/4.3.1/workbox-sw.js');

const dynamicResourcesStrategy = new workbox.strategies.StaleWhileRevalidate({
	cacheName: "dynamic-resources"
});

workbox.routing.registerRoute(
	/\.(css|js|html)/,
	dynamicResourcesStrategy
);

workbox.routing.registerRoute(
	'https://station-model-drawer.github.io/',
	dynamicResourcesStrategy
);

workbox.routing.registerRoute(
	/\.svg/,
	new workbox.strategies.CacheFirst({
		cacheName: "svg",
		plugins: [
			new workbox.expiration.Plugin({
				maxEntries: 20,
				maxAgeSeconds: 7 * 24 * 60 * 60
			})
		]
	})
);

// Cache certain third-party resources from cdn
workbox.routing.registerRoute(
	({url}) => {
		const {origin} = new URL(url);
		if (origin === "https://use.fontawesome.com" || origin === "https://cdn.jsdelivr.net") {
			return true;
		}
	},
	new workbox.strategies.StaleWhileRevalidate({
		cacheName: "cdn-resources"
	})
);

workbox.routing.registerRoute(
	/.woff2?/,
	new workbox.strategies.CacheFirst({
		cacheName: "font",
		plugins: [
			new workbox.expiration.Plugin({
				maxEntries: 20,
				maxAgeSeconds: 30 * 24 * 60 * 60
			})
		]
	})
);

