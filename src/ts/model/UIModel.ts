/**
 * Represents a JSON-type string stored in `h.0`, `h.1`, .. keys in the localStorage.
 */
export declare interface IStorageHistoryEntity {
	block: string, 		// block expression as used in the query
	date: string, 		// time expression, as used in the query
	queryDate: number  	// the time when the query was made in milliseconds
}

/**
 * Storage scheme:
 * num: # of stored reports
 * h.0, h.1, ..: IStorageHistoryEntity, i.e.,
 * rep: {
 *     id: report of the entity "id" 
 * }
 * curr: {
 *     id: current page of the entity "id"
 * }
 */
export default class UIModel {
	private storage = window.localStorage;

	private static readonly STR_HISTORY_KEY = "h";
	private static readonly STR_CURR_KEY = "curr";
	private static readonly STR_ID_KEY = "id";
	private static readonly STR_REP_KEY = "rep";

	private static getHistoryKey(id: number) {
		return UIModel.STR_HISTORY_KEY + '.' + String(id);
	}
	private static getReportKey(id: number) {
		return UIModel.STR_REP_KEY + '.' + String(id);
	}
	private static getCurrKey(id: number) {
		return UIModel.STR_CURR_KEY + '.' + String(id);
	}

	constructor() {
		if (this.storage.getItem(UIModel.STR_ID_KEY) === null) {
			this.storage.setItem(UIModel.STR_ID_KEY, JSON.stringify([]));
		}
	}
	private getIDs(): number[] {
		return JSON.parse(this.storage.getItem(UIModel.STR_ID_KEY));
	}
	private setIDs(ids: number[]) {
		this.storage.setItem(UIModel.STR_ID_KEY, JSON.stringify(ids));
	}
	private getID(index: number): number {
		return this.getIDs()[index];
	}
	private getLastNthID(index: number): number {
		let ids = this.getIDs();
		return ids[ids.length - 1 - index];
	}
	private addNewID(): number {
		let ids = this.getIDs();
		for (let i = 0, l = ids.length; i <= l; i++) {
			if (ids.indexOf(i) === -1) {
				ids.push(i);
				this.setIDs(ids);
				return i;
			}
		}
	}
	// Deletes last n-th ID, and returns the deleted ID.
	private deleteLastNthID(n: number): number {
		let ids = this.getIDs();
		let deleted = ids.splice(-n - 1, 1)[0];
		this.setIDs(ids);
		return deleted;
	}
	private getPage(id: number) {
		return parseInt(this.storage.getItem(UIModel.getCurrKey(id)));
	}
	private setPage(id: number, page: number) {
		this.storage.setItem(UIModel.getCurrKey(id), JSON.stringify(page));
	}
	private getHistory(id: number): IStorageHistoryEntity {
		return JSON.parse(this.storage.getItem(UIModel.getHistoryKey(id)));
	}
	storeNewReport(block: string, date: string, rep: string[]) {
		let id = this.addNewID();
		let historyEntity: IStorageHistoryEntity = {
			block, date,
			queryDate: Date.now()
		};
		this.storage.setItem(UIModel.getHistoryKey(id), JSON.stringify(historyEntity));
		this.storage.setItem(UIModel.getReportKey(id), JSON.stringify(rep));
		this.setPage(id, 0);
	}
	private getReportByID(id: number): string[] {
		return JSON.parse(this.storage.getItem(UIModel.getReportKey(id)));
	}
	/**
	 * Get n-th most recent query's cached reports
	 */
	getReportByIndex(n: number): string[] {
		return this.getReportByID(this.getLastNthID(n));
	}
	/**
	 * @param n {number} returns nth most recent query.
	 */
	getRecentQuery(n: number): IStorageHistoryEntity {
		return this.getHistory(this.getLastNthID(n));
	}
	/**
	 * @param n {number} returns recent n queries.
	 */
	getRecentQueries(n: number): IStorageHistoryEntity[] {
		return this.getIDs().slice(-n).reverse().map(this.getHistory, this);
	}
	/**
	 * @param n {number} delete n-th most recent history
	 */
	deleteQueryHistory(n: number) {
		let id = this.deleteLastNthID(n);
		this.storage.removeItem(UIModel.getHistoryKey(id));
		this.storage.removeItem(UIModel.getReportKey(id));
		this.storage.removeItem(UIModel.getCurrKey(id));
	}

	private fetchingXHR: XMLHttpRequest;
	private static readonly API_URL = "https://synop-api.herokuapp.com/getsynop?"; 
	fetchReports(block: string, date: string): Promise<Readonly<string[]>> {
		if (this.fetchingXHR) {
			this.fetchingXHR.abort();
			this.fetchingXHR = undefined;
		}
		// Search cached queries
		let ids = this.getIDs();
		let l = ids.length;
		while (l--) {
			let id = ids[l];
			let history = this.getHistory(id);
			if (history.block === block && history.date === date) {
				return Promise.resolve(this.getReportByID(id));
			}
		}
		// Fetch report via API
		let url = UIModel.API_URL + "block=" + encodeURIComponent(block) + "&time=" + date;
		let xhr = this.fetchingXHR = new XMLHttpRequest();
		xhr.open("GET", url);
		return new Promise((resolve, reject) => {
			xhr.onreadystatechange = () => {
				if (xhr.readyState !== 4) return;
				this.fetchingXHR = undefined;
				xhr.onreadystatechange = null;
				if (xhr.status === 200) {
					let reports = xhr.responseText.split('\n');
					// Store it as a history.
					this.storeNewReport(block, date, reports);
					resolve(reports);
				} else {
					reject(`Error fetching resources: ${xhr.responseText}, ${xhr.status}`);
				}
			}
			xhr.send();
		})
	}
	private currentReportArr: Readonly<string[]>;
	setCurrentReport(reportArr: Readonly<string[]>) {
		this.currentReportArr = reportArr;
	}
	getCurrentReportByIndex(index: number) {
		return this.currentReportArr[index];
	}

	private static readonly RE_BLOCK = /^(?:\d{1,5}|\d{1,5}\-\d{1,5})(?:\,\d{1,5}|\d{1,5}\-\d{1,5})*$/;
	static validateBlockExpr(block: string) {
		return UIModel.RE_BLOCK.test(block);
	}
	// dateExpr is of the a YYMMDDHH.
	static validateDateExpr(dateExpr: string) {
		if (dateExpr.length !== 8 || !/^\d*$/.test(dateExpr)) return false;
		let yy = parseInt(dateExpr.slice(0, 2));
		let mm = parseInt(dateExpr.slice(2, 4));
		let dd = parseInt(dateExpr.slice(4, 6));
		let hh = parseInt(dateExpr.slice(6, 8));
		if (mm > 12 || dd > 31 || hh > 23) return false;
		return true;
	}
}