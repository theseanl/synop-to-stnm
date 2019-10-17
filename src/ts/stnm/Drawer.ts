import {IParsedData, ITempParseData} from './Parser'
import {isUndef} from '../shared/utils';

/**
 * A station model drawer class. 
 */
export default class Drawer {
	public static readonly DEFAULT_CANVAS_SIZE = 400;
	private static readonly ICON_SIZE = 55; // Wind barb size is 55 * 55
	private static readonly HALF_ICON_SIZE = Drawer.ICON_SIZE / 2;
	private static readonly SHAFT_WIDTH = Drawer.ICON_SIZE * 3;
	private static readonly GRID_SIZE = 65;
	private static readonly COMMON_FONT = "100 36px Optima, sans-serif";
	/**
	 * By default, Drawer class methods produce drawings that fits into 400x400 box.
	 * x, y indicates the center of the station model, scale indicates a ratio by which
	 * the drawings will be scaled.
	 */
	constructor(
		private ctx: CanvasRenderingContext2D,
		private x: number,
		private y: number,
		private scale: number = 1
	) {}
	private setFont(font: string = Drawer.COMMON_FONT) {
		this.ctx.font = font;
		this.ctx.textBaseline = "middle";
		this.ctx.textAlign = "center";
	}
	// A method decorator that does:
	//  - Before draw, move the pen to (x, y) and scales the canvas.
	//  - After draw, resets the above transformation.
	private static setTransform(target: Drawer, prop: string, desc: PropertyDescriptor) {
		const drawingFunction = desc.value;
		desc.value = function (this: Drawer) {
			this.ctx.save();
			this.ctx.translate(this.x, this.y);
			this.ctx.scale(this.scale, this.scale);
			let returnValue = Reflect.apply(drawingFunction, this, arguments);
			this.ctx.restore();
			return returnValue;
		}
	}
	@Drawer.setTransform
	drawWindBarb(N: string) {
		// These svgs are not centered.
		let ctx = this.ctx;
		ctx.translate(-Drawer.HALF_ICON_SIZE, - Drawer.HALF_ICON_SIZE);
		if (!isNumeric(N)) { // e.g. N is "/", which means "Missing"
			wxSym.TotalCloudCover.N["Slash"](ctx);
		} else {
			wxSym.TotalCloudCover.N[N](ctx);
		}
	}
	drawWindShaftSYNOP(dd: string, ff: string, iw: string) {
		// There seem to be 2 conventions in denoting wind speeds higher than 100:
		// In ROKAF documentations, one subtracts 50 from "ff" and adds 50 to "dd".
		// In documentation from WMO, one puts 99 for "ff" and provide another group
		// "00fff" right next to it. This routine supports both.
		if (!isNumeric(dd) || !isNumeric(ff) || !isNumeric(iw)) return;
		let dir_deg = parseInt(dd);
		let speed = parseInt(ff);
		if (dir_deg > 50) {
			dir_deg -= 50;
			speed += 50;
		}
		if (parseInt(iw) < 2) { // iw can be 0, 1, 3, 4; 0, 1 means ff is in meter per sec.
			speed = meterPerSecondsToKnots(speed);
		}
		let dir = rad(dir_deg / 36);
		this.drawWindShaft(dir, speed);
	}
	@Drawer.setTransform
	drawWindShaft(dir: number, speed: number) {
		let roundedSpeed = Math.round(speed / 5);

		let ctx = this.ctx;
		if (speed === 0) { // No shaft for wind calm!
			ctx.translate(-32.7, -32.7) // Wind calm svg is not centered, is 65*65
			wxSym.WindArrowCalm["00"](ctx);
			return;
		}
		ctx.rotate(dir + rad(1 / 4));

		if (!isNaN(speed)) {
			// translate by the amount of the wind shaft svg size. 2.5, 5 are offsets
			// by that the starting point of the shaft is located in the svg.
			// These constants are adjusted for aesthetic purposes.
			ctx.translate(-Drawer.SHAFT_WIDTH + 2.5 - Drawer.HALF_ICON_SIZE, -Drawer.ICON_SIZE + 7);
			let index = String(roundedSpeed).padStart(2, "0"); //
			wxSym.WindArrowNH[index](ctx);
		} else { // Missing
			ctx.translate(-Drawer.SHAFT_WIDTH - Drawer.HALF_ICON_SIZE + 1, -31);
			wxSym.WindArrowMissing["99"](ctx);
		}
	}
	@Drawer.setTransform
	drawCloudGenera(ClCmCh: string, Nh: string, N: string, h: string) {
		if (isUndef(ClCmCh)) return;

		let ctx = this.ctx;

		let Cl = ClCmCh[0];
		let Cm = ClCmCh[1];
		let Ch = ClCmCh[2];

		let n = isNumeric(N) ? parseInt(N) : null;
		let nh = isNumeric(Nh) ? parseInt(Nh) : null;
		let cl = isNumeric(Cl) ? parseInt(Cl) : null;
		let cm = isNumeric(Cm) ? parseInt(Cm) : null;
		let ch = isNumeric(Ch) ? parseInt(Ch) : null;

		if (nh !== null) {
			ctx.save();
			this.setFont();
			ctx.fillText(Nh, Drawer.GRID_SIZE - Drawer.HALF_ICON_SIZE * 0.5, Drawer.GRID_SIZE);
			ctx.restore();
		}

		const drawMissing = () => {
			this.setFont("normal 36px American Typewriter, serif");
			ctx.fillText("M", Drawer.HALF_ICON_SIZE, Drawer.HALF_ICON_SIZE);
		};

		const obscured = nh === 9 || n === 9;

		ctx.save();
		ctx.translate(-Drawer.HALF_ICON_SIZE, Drawer.GRID_SIZE - Drawer.HALF_ICON_SIZE);
		if (cl !== null) {
			if (cl !== 0) {
				wxSym.CloudLow.CL[cl](ctx);
			}
		} else if (!obscured) {
			// "/" on the low cloud is valid only when nh and n is "9", which means
			// the sky is obscured.
			drawMissing();
		}
		ctx.restore();

		ctx.save();
		ctx.translate(-Drawer.HALF_ICON_SIZE, -Drawer.GRID_SIZE - Drawer.HALF_ICON_SIZE);
		if (cm !== null) {
			if (cm !== 0) {
				wxSym.CloudMedium.CM[cm](ctx);
			}
		} else if (!obscured && (nh !== 8 || n !== 8 || cl === null)) {
			// For Cm to be obscured by Cl, nh and n must be the OVC and
			// Cl must be present. => otherwise draw Missing mark at Cm position
			drawMissing();
		}
		ctx.restore();

		ctx.save();
		ctx.translate(-Drawer.HALF_ICON_SIZE, - 2 * Drawer.GRID_SIZE - Drawer.HALF_ICON_SIZE);
		if (ch !== null) {
			if (ch !== 0) {
				wxSym.CloudHigh.CH[ch](ctx);
			}
		} else if (!obscured && (n !== 8 || nh < 7 || (nh < 8 && (cl === 0 || cm === 0)))) {
			// For Ch to be obscured by Cl or Cm, n must be OVC.
			// If nh < 7, there is a possibility that Cm is 7 oktas, whence Ch is Missing.
			// If nh is not OVC and Cl or Cm is not present, Ch cannot be obscured.
			drawMissing();
		}
		ctx.restore();

		// h code is depicted directly to the graphic.
		ctx.save();
		this.setFont();
		ctx.fillText(h, 0, 2 * Drawer.GRID_SIZE);
		ctx.restore();
	}
	@Drawer.setTransform
	drawPressure(pppp: string) {
		if (isNumeric(pppp)) {
			this.setFont();
			this.ctx.fillText(pppp.slice(1), Drawer.GRID_SIZE, -Drawer.GRID_SIZE);
		}
	}
	@Drawer.setTransform
	drawPressureTendency(a: string, ppp: string) {
		let ctx = this.ctx;
		if (isNumeric(a) && parseInt(a) < 9) {
			ctx.save();
			ctx.translate(2 * Drawer.GRID_SIZE - Drawer.HALF_ICON_SIZE, -Drawer.HALF_ICON_SIZE);
			wxSym.PressureTendencyCharacteristic.a[a](ctx);
			ctx.restore();
			if (isNumeric(ppp)) {
				let a_num = parseInt(a);
				let sign = (a_num < 4 ? "+" : (a_num > 4 ? "-" : "\u00B1"));
				let presTendencyText = sign + ppp.slice(-2);
				ctx.save();
				this.setFont();
				ctx.fillText(presTendencyText, Drawer.GRID_SIZE, 0);
				ctx.restore();
			}
		}
	}
	@Drawer.setTransform
	drawWeather(ww: string, W1W2: string) {
		let ctx = this.ctx;
		ctx.save();
		ctx.translate(-Drawer.GRID_SIZE - Drawer.HALF_ICON_SIZE, -Drawer.HALF_ICON_SIZE);
		if (isUndef(ww)) {
			// pass - don't draw missing when 7-group is not present. Draw only when it is explicitly
			// missing, such as "7////".
		} else if (isNumeric(ww)) {
			wxSym.PresentWeather.ww[ww](ctx);
		} else { // Missing
			wxSym.PresentWeather.ww.DoubleSlash(ctx);
		}
		ctx.restore();
		ctx.save();
		// Nh and W are drawn in the same grid cell, GRID_SIZE * 1/3 is
		// the offset within the cell.
		ctx.translate(Drawer.GRID_SIZE - Drawer.HALF_ICON_SIZE + Drawer.GRID_SIZE * (1 / 3),
			Drawer.GRID_SIZE - Drawer.HALF_ICON_SIZE);
		if (isUndef(W1W2)) {
			// pass - don't draw missing when 7-group is not present.
		} else if (isNumeric(W1W2)) {
			let W1 = parseInt(W1W2.slice(0, 1));
			let W2 = parseInt(W1W2.slice(1));
			let prevWx = W1 > W2 ? W1 : W2; // More significant previous weather
			if (prevWx >= 3) { // otherwise no symbol is depicted
				let svgName = prevWx === 3 ? "3a" : String(prevWx);
				wxSym.PastWeather.W1W2[svgName](ctx);
			}
		} else { // Missing, denoted by XX
			wxSym.PastWeather.W1W2.DoubleSlash(ctx);
		}
		ctx.restore();
	}
	@Drawer.setTransform
	drawTemperature(SnTTT: string, SnTdTdTd: string) {
		let ctx = this.ctx;
		this.setFont();
		function toDispStr(SnTTT: string) {
			let snttt = parseInt(SnTTT);
			let ttt = snttt % 1000;
			let sn = (snttt - ttt) / 1000;
			let sign = sn === 0 ? 1 : -1;
			let tt = Math.round(sign * ttt / 10); // It is necessary to apply Math.round to 
			// a signed value, because one has to round -0.5 to 0 but 0.5 to 1.
			return (sn === 0 ? "+" : "-") +
				String(tt * sign /* make positive */).padStart(2, "0");
		}
		if (isNumeric(SnTTT)) {
			ctx.fillText(toDispStr(SnTTT), -Drawer.GRID_SIZE, -Drawer.GRID_SIZE);
		}
		if (isNumeric(SnTdTdTd)) {
			ctx.fillText(toDispStr(SnTdTdTd), -Drawer.GRID_SIZE, Drawer.GRID_SIZE);
		}
	}
	@Drawer.setTransform
	drawVisibility(VV: string) {
		let ctx = this.ctx;
		if (isNumeric(VV)) {
			let visCode = parseInt(VV);
			let visExpr = meterToReportableMilesExpression(visCodeToMeter(visCode));
			ctx.translate(-Drawer.GRID_SIZE * 2, 0);
			this.setFont();
			ctx.fillText(visExpr, 0, 0);
		}
	}
	@Drawer.setTransform
	drawPrecipitation(RRRtR: string) { // Depicted as RRR/tR following ROKAF convention
		if (isUndef(RRRtR)) return;

		let ctx = this.ctx;
		let RRR = RRRtR.slice(0, 3);
		let tR = RRRtR[3];
		if (isNumeric(RRR)) {
			this.setFont();
			ctx.fillText(RRR, Drawer.GRID_SIZE, Drawer.GRID_SIZE * 2);
			// The constant 10 is chosen for aesthetic purposes
		}
		if (isNumeric(tR)) {
			this.setFont();
			ctx.fillText(tR, Drawer.GRID_SIZE * 2, Drawer.GRID_SIZE);
		}
	}
	private static readonly INDEX_BOX_HEIGHT = 26;
	private static readonly INDEX_BOX_WIDTH = 62;
	@Drawer.setTransform
	drawStationIndex(iiIII: string) {
		let ctx = this.ctx;

		ctx.textAlign = "start";
		ctx.textBaseline = "middle"
		ctx.font = "normal 20px Trebuchet MS, sans-serif";

		const indexBoxWidth = ctx.measureText(iiIII).width;

		ctx.fillStyle = "black";
		ctx.fillRect(-200, -200, indexBoxWidth + 10, Drawer.INDEX_BOX_HEIGHT);

		ctx.fillStyle = "white";
		ctx.fillText(iiIII, -200 + 5, -200 + Drawer.INDEX_BOX_HEIGHT / 2);
	}
	drawFromParsedData(data: Readonly<IParsedData>) {
		this.drawStationIndex(data.iiIII);
		this.drawVisibility(data.VV);
		this.drawWindBarb(data.N);
		this.drawWindShaftSYNOP(data.dd, data.ff, data.iW);
		this.drawTemperature(data.SnTTT, data.SnTdTdTd);
		this.drawPressure(data.PPPP);
		this.drawPressureTendency(data.a, data.ppp);
		this.drawPrecipitation(data.RRRtR);
		this.drawWeather(data.ww, data.W1W2);
		this.drawCloudGenera(data.ClCmCh, data.Nh, data.N, data.h);
	}
	drawWindShaftForUpperAir(ddd: string, ff: string, YY: string) {
		if (!isNumeric(ddd) || !isNumeric(ff)) return;
		// ddd is in a multiple of 5; if it isn't, the remainder signifies the 100-th digit of ff.
		let dir = parseInt(ddd);
		let remainder = dir % 5;
		dir -= remainder;
		let speed = parseInt(ff) + 100 * remainder;
		// YY, representing a day when the observation was taken is greater than 50 when
		// wind speeds in this observation is in knots. Otherwise it is in meter per seconds.
		if (parseInt(YY) <= 50) {
			speed = meterPerSecondsToKnots(speed);
		}
		this.drawWindShaft(dir, speed);
	}
	@Drawer.setTransform
	drawTemperatureForUpperAir(TTT: string, DD: string) {
		let ctx = this.ctx;
		this.setFont();
		// TTT is a temperature in one tenth celcius; if the one-tenth digit is even, it indicates
		// a positive value, otherwise it indicateas a negative value.
		if (isNumeric(TTT)) {
			let temp = parseInt(TTT);
			let dispStr = ((temp & 1) === 0 ? "" : "-") + parseInt(TTT.slice(0, 2)) + '.' + TTT[2];
			ctx.fillText(dispStr, -Drawer.GRID_SIZE, -Drawer.GRID_SIZE);
		}
		// Dew point depression is in one tenth celcius; if DD is greator than 50, the dpp is 
		// DD - 50 (in 1 celcius unit)
		if (isNumeric(DD)) {
			let dpp = parseInt(DD);
			let dispStr = dpp > 50 ? String(dpp - 50) + '.0' : DD[0] + '.' + DD[1];
			ctx.fillText(dispStr, -Drawer.GRID_SIZE, Drawer.GRID_SIZE);
		}
	}
	@Drawer.setTransform
	drawPressureHeight(hhh: string) {
		if (isNumeric(hhh)) {
			this.setFont();
			this.ctx.fillText(hhh, Drawer.GRID_SIZE, 0);
		}
	}
	drawFromParsedTempData(data: Readonly<ITempParseData>) {
		this.drawStationIndex(data.iiIII);
		this.drawPressureHeight(data.hhh);
		this.drawWindBarb("9");
		this.drawWindShaftForUpperAir(data.ddd, data.ff, data.YY);
		this.drawTemperatureForUpperAir(data.TTT, data.DD);
	}
}

/*******************************************************************************/
// Helper functions
function meterPerSecondsToKnots(speed: number) {
	return speed *= 1.94384; // Conversion constant for m/s to knots
}
/*******************************************************************************/
// Helper functions for converting visibility codes in SYNOP reports to
// an expression depicted in station models
function visCodeToMeter(code: number): number {
	if (code <= 50) return code * 100;
	if (code <= 80) return (code - 50) * 1000;
	if (code <= 89) return (code - 80) * 5000 + 30000;
	return [0, 50, 200, 500, 1000, 2000, 4000, 10000, 20000, 50000][code - 90];
}

function meterToReportableMilesExpression(meter: number): string {
	if (meter <= 500 /* 5/16 miles */) return reducedFraction(meter / 100, 16);
	if (meter <= 3200 /* 2 miles */) return reducedFraction(meter / 200, 8);
	if (meter <= 4800 /* 3 miles */) return reducedFraction(meter / 400, 4);
	if (meter <= 24000 /* 15 miles */) return String(roundToMultiple(meter / 1600, 1));
	return String(Math.min(roundToMultiple(meter / 1600, 5)));
}

// Returns the max number that's a multiple of m and is less than n
function roundToMultiple(n: number, m: number) {
	return Math.floor(n / m) * m;
}
// Make a fraction expression that is reduced (by factor of 2)
function reducedFraction(a: number, b: number) {
	a = a | 0; // Round a real number to an integer
	while ((a % 2 === 0) && (b % 2) === 0) {
		a = a / 2; b = b / 2;
	}
	let i = 0;
	while (a >= b) {
		i++;
		a = a - b;
	}
	let output = [];
	if (i === 0 && a === 0) return "0";
	if (i > 0) output.push(String(i));
	if (a > 0) output.push(String(a) + "/" + String(b));
	return output.join(" ");
}
/*******************************************************************************/

function isNumeric(str: string | undefined) {
	if (typeof str !== 'string') return false;
	return /^\d+$/.test(str);
}

function isFloat(str: string | undefined) {
	if (typeof str !== 'string') return false;
	return /^\d+(?:\.\d+)?$/.test(str);
}

function rad(num: number) {
	return num * Math.PI * 2;
}


