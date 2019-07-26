import Drawer from '../../src/ts/stnm/Drawer';
import Parser from '../../src/ts/stnm/Parser';


function cvs(width = 400, height = 400): CanvasRenderingContext2D {
	let canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	canvas.style.cssText = "border:3px solid black; margin: 10px;";
	document.body.appendChild(canvas);
	canvas.onclick = function () {
		var link = document.createElement("a");
		link.download = "image.png";
		link.textContent = "Click me to download";
		canvas.toBlob(function (blob) {
			link.href = URL.createObjectURL(blob);
			link.click();
		}, 'image/png');
	}
	return canvas.getContext("2d")!;
}

const drawer1 = new Drawer(cvs(), 200, 200);
drawer1.drawWindBarb("3");
drawer1.drawWindShaft("09", "65", "4");
drawer1.drawCloudGenera("923", "4", "3", "2");
drawer1.drawPressure("9925");
drawer1.drawPressureTendency("3", "052");
drawer1.drawWeather("47", "33");
drawer1.drawTemperature("0213", "0187");
drawer1.drawVisibility("05");
drawer1.drawPrecipitation("9902");

const drawer1_1 = new Drawer(cvs(), 200, 200);
drawer1_1.drawFromParsedData(new Parser(
	"AAXX190041234500205309651021320187300004992553052699027473384923=="
).parse())

const drawer2 = new Drawer(cvs(), 200, 200);
drawer2.drawWindBarb("8")
drawer2.drawWindShaft("20", "01", "4");
drawer2.drawCloudGenera("1//", "8", "8", "5");
drawer2.drawPressure("0132");
drawer2.drawPressureTendency("8", "003");
drawer2.drawWeather("94", "21");
drawer2.drawTemperature("1065", "1086"); // Testing rounding negative float
drawer2.drawVisibility("47");
drawer2.drawPrecipitation("0022");

const drawer2_1 = new Drawer(cvs(), 200, 200);
drawer2_1.drawFromParsedData(new Parser(
	"AAXX1900498765005478200111065210863000040132580036002279421881//91234=="
).parse())

const drawer3 = new Drawer(cvs(), 200, 200);
drawer3.drawWindBarb("/");
drawer3.drawWindShaft("27", "//", "4");
drawer3.drawCloudGenera("87/", "7", "/", "/");
drawer3.drawPressure("0104");
drawer3.drawPressureTendency("4", "000");
drawer3.drawWeather("//", "//");
drawer3.drawTemperature("0003", "1003"); // Testing negative zero
drawer3.drawVisibility("86");
drawer3.drawPrecipitation("0002");

const drawer3_1 = new Drawer(cvs(), 200, 200);
drawer3_1.drawFromParsedData(new Parser(
	"AAXX190041111140/86/27//10003210033000040104540007////8787/99999222=="
).parse());

const drawer4 = new Drawer(cvs(), 200, 200);
drawer4.drawWindBarb("9");
drawer4.drawWindShaft("04", "66", "1");
drawer4.drawCloudGenera("///", "/", "9", "/");
drawer4.drawPressure("0001");
drawer4.drawPressureTendency("6", "001");
drawer4.drawWeather("55", "37");
drawer4.drawTemperature("0232", "0147");
drawer4.drawVisibility("91");

const drawer4_1 = new Drawer(cvs(), 200, 200);
drawer4_1.drawFromParsedData(new Parser(
	"AAXX190011111120/91904661023220147300004000156001755378////99999555=="
).parse());

(function () {
	let context = cvs(512, 512);
	const drawer5 = new Drawer(context, 256, 256, 32 / 25);

	drawer5.drawWindBarb("4");
	drawer5.drawWindShaft("03", "165", "4");
	drawer5.drawCloudGenera("489", "1", "4", "1");
	drawer5.drawPressure("0182");
	drawer5.drawPressureTendency("6", "001");
	drawer5.drawWeather("84", "88");
	drawer5.drawTemperature("1400", "0700");
	drawer5.drawVisibility("07");
	context.globalCompositeOperation = "destination-over";
	context.fillStyle = "#efe0b9";
	context.fillRect(0, 0, 512, 512);
})();

/**
 * Draws 192*192 icon
 */
(function () {
	let context6 = cvs(192, 192);
	context6.scale(24 / 9, 24 / 9);
	context6.translate(9, 8);
	window['wxSym'].CloudHigh.CH[2](context6);
	context6.setTransform(1, 0, 0, 1, 0, 0);

	let gradient = context6.createLinearGradient(0, 0, 0, 192);
	gradient.addColorStop(0, "#efe0b9");
	gradient.addColorStop(1, "#dcba65");

	let gradient2 = context6.createLinearGradient(0, 0, 0, 96);
	gradient2.addColorStop(0, "rgba(255, 255, 255, 0.45)");
	gradient2.addColorStop(1, "rgba(255, 255, 255, 0.15)");

	context6.fillStyle = gradient;
	context6.globalCompositeOperation = "destination-over";
	context6.fillRect(0, 0, 192, 192);

	context6.globalCompositeOperation = "source-over";
	context6.fillStyle = gradient2;
	context6.fillRect(0, 0, 192, 96);
})();

// Tests for certain pathological cases - never emit things like "NaN" to the canvas.

const drawer5 = new Drawer(cvs(), 200, 200);
drawer5.drawFromParsedData(new Parser(
	"AAXX2300/20183="
).parse());

// Test that it does not draw missings when 7-group is omitted. Draw it only when it is denoted as '/'.
const drawer6 = new Drawer(cvs(), 200, 200, 1);
drawer6.drawWindBarb("7");
drawer6.drawWeather(undefined, undefined);

