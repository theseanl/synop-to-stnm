const fs = require('fs');
const path = require('path');

const code = fs.readFileSync(path.join(__dirname, '../src/third_party/WorldWeatherSymbols.js'), 'utf8');

function toPropertyExpression(prop) {
	if (/^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(prop)) {
		return '.' + prop;
	} else {
		return "[" + JSON.stringify(prop) + "]"
	}
}

function joinToPropertyAccess(props) {
	return props.reduce((acc, cur) => acc + toPropertyExpression(cur), "wxSym");
}

const wxSymDummy = {};

const modified = "var wxSym = {};\n" +
	code.replace(/var\sWeatherSymbol_(?:WMO|ICAO)_([a-zA-Z0-9\-_]*)/g, (_, c1) => {
		let props = c1.split("_");
		let output = "";
		let current = wxSymDummy;
		let i = 0, l = props.length;
		for (; i < l - 1; i++) {
			let prop = props[i];
			if (!current.hasOwnProperty(prop)) break;
			current = current[prop];
		}
		for (; i < l - 1; i++) {
			output += joinToPropertyAccess(props.slice(0, i + 1)) + " = {};\n";
			current = (current[props[i]] = {});
		}
		output += joinToPropertyAccess(props);
		current[props[l - 1]] = {};
		return output;
	});

fs.writeFileSync(path.join(__dirname, '../src/static/wxSym.js'), modified);
