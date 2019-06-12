import typescript from 'rollup-plugin-typescript2'

export default {
	input: "test/stnm/index.ts",
	output: {
		dir: "build_test/stnm",
		format: 'iife'
	},
	plugins: [
		typescript()
	]
}

