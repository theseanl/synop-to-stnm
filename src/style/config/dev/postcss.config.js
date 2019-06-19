module.exports = {
	plugins: [
		require('postcss-import'),
		require('postcss-nested-props'),
		require('postcss-nested'),
		require('postcss-preset-env')({
			stage: 0,
			features: {
				'custom-properties': false
			}
		})	  
	]
}

