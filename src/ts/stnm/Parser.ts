export interface IParsedData {
	iiIII: string
	iW: string
	iR: string
	iX: string
	h: string
	VV: string
	N: string
	dd: string
	ff: string
	SnTTT: string
	SnTdTdTd: string
	PPPP: string
	a: string
	ppp: string
	RRRtR: string
	ww: string
	W1W2: string
	Nh: string
	ClCmCh: string
}

export class ParseError extends Error {}

export default class Parser {
	private parsedData: Partial<IParsedData> = Object.create(null);
	private report: string;
	private lenient: boolean;
	constructor(report: string) {
		this.report = report.replace(/\s/g, "");
	}
	parse(lenient:boolean = false): Readonly<IParsedData> { // throws ParseError
		this.setParseMode(lenient);
		this.digestBulletinHeader();
		this.digestYYGGiW();
		this.digestiiIII();
		this.digestiRiXhVV();
		this.digestNddff();
		this.digest00fff();
		this.digestSnTTT();
		this.digestSnTdTdTd();
		this.digestPoPoPoPo();
		this.digestPPPP();
		this.digestappp();
		this.digestRRRtR();
		this.digestwwW1W2();
		this.digestNhClCmCh();
		this.digestGGgg();
		this.digestSectionTwoAndOnwards();
		return <IParsedData>this.parsedData;
	}
	private setParseMode(lenient:boolean) {
		if (!lenient) return;
		this.lenient = true;
		this.parseErrors = [];
	}
	private parseErrors: string[];
	private raiseParseError(msg: string) {
		if (this.lenient) this.parseErrors.push(msg);
		else throw new ParseError(msg);
	}
	getParseErrors(): ReadonlyArray<string> {
		return this.parseErrors;
	}
	private cut(n: number) {
		this.report = this.report.slice(n);
	}
	// Returns wheather the first character in the report is **NOT** equal
	// to char or not.
	private firstCharIsNot(char: string) {
		return this.report[0] !== char;
	}
	private digestBulletinHeader() {
		let header = this.report.slice(0, 4);
		this.cut(4);
		if (header !== "AAXX") this.raiseParseError(`Unrecognized header: ${header}.`);
		return;
	}
	private digestYYGGiW() {
		if (!this.firstCharIsNot("=")) return;
		// Throw away YYGG part
		this.parsedData.iW = this.report[4];
		this.cut(5);
	}
	private digestiiIII() {
		if (!this.firstCharIsNot("=")) return;
		this.parsedData.iiIII = this.report.slice(0, 5);
		this.cut(5);
	}
	private digestiRiXhVV() {
		if (!this.firstCharIsNot("=")) return;
		this.parsedData.iR = this.report[0];
		this.parsedData.iX = this.report[1];
		this.parsedData.h = this.report[2];
		this.parsedData.VV = this.report.slice(3, 5);
		this.cut(5);
	}
	private digestNddff() {
		if (!this.firstCharIsNot("=")) return;
		this.parsedData.N = this.report[0];
		this.parsedData.dd = this.report.slice(1, 3);
		this.parsedData.ff = this.report.slice(3, 5);
		this.cut(5);
	}
	private digest00fff() {
		if (this.firstCharIsNot("0")) return;
		if (this.report[1] !== "0") {
			let erroredGroup = this.report.slice(0, 5);
			this.cut(5);
			this.raiseParseError(`Unrecognized 0-group ${erroredGroup}.`);
			return;
		} else if (this.parsedData.ff !== "99") {
			this.raiseParseError("00fff group is present without 99being reported in Nddff group.");
			// Continue parsing, accept the value provided here as the wind speed.
		}
		this.parsedData.ff = this.report.slice(2, 5);
		this.cut(5);
	}
	private digestSnTTT() {
		if (this.firstCharIsNot("1")) return; // 1SnTTT
		this.parsedData.SnTTT = this.report.slice(1, 5);
		this.cut(5);
	}
	private digestSnTdTdTd() {
		if (this.firstCharIsNot("2")) return; // 2SnTdTdTd
		this.parsedData.SnTdTdTd = this.report.slice(1, 5);
		this.cut(5);
	}
	private digestPoPoPoPo() {
		if (this.firstCharIsNot("3")) return; // 3PoPoPoPo
		this.cut(5);
	}
	private digestPPPP() {
		if (this.firstCharIsNot("4")) return; // 4PPPP
		this.parsedData.PPPP = this.report.slice(1, 5);
		this.cut(5);
	}
	private digestappp() {
		if (this.firstCharIsNot("5")) return;
		this.parsedData.a = this.report[1];
		this.parsedData.ppp = this.report.slice(2, 5);
		this.cut(5);
	}
	private digestRRRtR() {
		let iR = this.parsedData.iR;
		if (this.firstCharIsNot("6")) {
			if (iR === "0" || iR === "1") {
				this.raiseParseError(`6-group is not present, but iR is ${iR}.`)
			}
			return;
		}
		if (iR !== "0" && iR !== "1") {
			this.raiseParseError(`6-group is present, but iR is ${iR}.`)
		}
		this.parsedData.RRRtR = this.report.slice(1, 5);
		this.cut(5);
	}
	private digestwwW1W2() {
		if (this.firstCharIsNot("7")) return;
		this.parsedData.ww = this.report.slice(1, 3);
		this.parsedData.W1W2 = this.report.slice(3, 5);
		this.cut(5);
	}
	private digestNhClCmCh() {
		if (this.firstCharIsNot("8")) return;
		this.parsedData.Nh = this.report[1];
		this.parsedData.ClCmCh = this.report.slice(2, 5);
		this.cut(5);
	}
	private digestGGgg() {
		if (this.firstCharIsNot("9")) return;
		this.cut(5);
	}
	private digestSectionTwoAndOnwards() {
		let firstChar = this.report[0];
		let firstThreeChar = this.report.slice(0, 3);
		if (firstThreeChar === "222" || firstThreeChar === "333" || firstThreeChar === "555") return;
		if (firstChar === "=" || this.report.length === 0) return;
		this.raiseParseError(`Unrecognized code ${truncateString(this.report, 7)} after section 1.`);
	}
}

// Truncate string with ellipsis at end.
function truncateString(str: string, maxLength: number): string {
	if (str.length <= maxLength) return str;
	return str.substr(0, maxLength - 2) + '..';
}

/**
 * Caveats:
 *
 * 1. Since this was initially implemented without taking account of spaces in every 5 characters,
 * it may conclude that `333` markers and such belong to a n-group.
 * This only affects very short malformed reports. Anyway, there are inherent ambiguity in parsing
 * of synop reports. e.g. How to parse `AAXX 23004 20272 30070 82100=`? Does 82100 belongs to
 * Nddff group or 8NhClCmCh group?
 * 
 * 2. Ideally has to be implemented by reading each chars, collecting them in buffers,
 * so that one can terminate immediately when one encounters "=" character.
 * In practice there won't be any difference except for some badly-malformed reports.
 */
