const config = require('../dev/postcss.config');
module.exports = {
	plugins: config.plugins.concat([
		require('cssnano')({
			preset: ["advanced", {
				"minifyFontValues": false
			}]
		})
	])
}

