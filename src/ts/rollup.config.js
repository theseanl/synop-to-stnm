import typescript from 'rollup-plugin-typescript2';
import tscc from '@tscc/rollup-plugin-tscc';
/**
 * Other inputs will be managed in the Makefile.
 */
export default {
	output: {
		dir: '.',
		format: 'iife',
	},
	plugins: [
		tscc({specFile: "src/ts/tscc.spec.json"}),
		typescript()
	]
}

