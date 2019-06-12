import UIModel from '../model/UIModel';
import UIView, {UserMessages} from '../view/UIView';
import EventEmitter from '../shared/EventEmitter';
import {isUndef} from '../shared/utils';


export default class UIController {
	constructor(
		private model: UIModel,
		private view: UIView
	) {
		this.onDrawButtonClick = this.onDrawButtonClick.bind(this);
		this.onBackButtonClick = this.onBackButtonClick.bind(this);
		this.onGliderMove = this.onGliderMove.bind(this);
	}
	private static readonly QUERIES_TO_RENDER = 5;
	initializeMainPage() {
		// render recent queries
		this.renderQueriesList();
		// add listeners
		this.view.onDrawButtonClick(this.onDrawButtonClick);
		this.view.onBackButtonClick(this.onBackButtonClick);
	}
	// Render recent queries
	renderQueriesList() {
		let queryHistories = this.model.getRecentQueries(UIController.QUERIES_TO_RENDER);
		// instantiate event emitters;
		let clickEventEmitter = new EventEmitter('click');
		let deleteEventEmitter = new EventEmitter('click');
		clickEventEmitter.addListener((index) => {
			//render it directly without fetching reports.
			let history = this.model.getRecentQuery(index);
			let report = this.model.getReportByIndex(index);
			this.renderReports(history.block, history.date, report)
				.catch(reason => {
					this.displayWarningMessage(String(reason));
				});
		});
		deleteEventEmitter.addListener((index) => {
			this.model.deleteQueryHistory(index);
			this.renderQueriesList();
		});
		this.view.renderQueryHistory(queryHistories, clickEventEmitter, deleteEventEmitter);
	}
	async onDrawButtonClick() {
		let block = this.view.getSearchBarText();
		if (!UIModel.validateBlockExpr(block)) {
			this.displayInfoMessage(UserMessages.INVALID_BLOCK);
			return;
		}
		let dateExpr = this.view.getDateBarText();
		if (!UIModel.validateDateExpr(dateExpr)) {
			this.displayInfoMessage(UserMessages.INVALID_DATE);
			return;
		}
		this.view.toggleDrawButtonLoadingState(true);
		try {
			const reports = await this.model.fetchReports(block, dateExpr);
			this.view.toggleDrawButtonLoadingState(false);
			return this.renderReports(block, dateExpr, reports);
		} catch (reason) {
			this.view.toggleDrawButtonLoadingState(false);
			this.displayWarningMessage(String(reason));
		}
	}
	async renderReports(block: string, dateExpr: string, reports: Readonly<string[]>) {
		this.view.clearCarousel();
		this.view.setSearchBarText(block);
		this.view.setDateBarText(dateExpr);
		this.model.setCurrentReport(reports);
		await this.view.fontIsLoaded;
		this.view.drawCanvasesFromReport(reports);
		await this.view.collapseSearchBar();
		this.renderQueriesList();
		this.view.mountNewGlider(this.onGliderMove)
	}
	onGliderMove(index: number) {
		this.view.setDisplayedReportText(this.model.getCurrentReportByIndex(index));
	}
	onBackButtonClick() {
		this.view.expandSearchBar();
	}
	onQueryDeleteClick(index: number) {
		this.model.deleteQueryHistory(index);
		this.renderQueriesList();
	}

	private static readonly MESSAGE_DISPLAY_TIME = 3 * 1000; // 3 seconds
	private messageCollapseTimer: number;
	private prepareMessageDisplay() {
		this.view.hideMessage();
		if (!isUndef(this.messageCollapseTimer)) {
			clearTimeout(this.messageCollapseTimer);
		}
		this.messageCollapseTimer = window.setTimeout(() => {
			this.view.hideMessage();
		}, UIController.MESSAGE_DISPLAY_TIME);
	}
	private displayInfoMessage(msg: UserMessages) {
		this.prepareMessageDisplay();
		requestAnimationFrame(() => {
			this.view.showInfoMessage(msg);
		});
	}
	private displayWarningMessage(msg: string) {
		this.prepareMessageDisplay();
		requestAnimationFrame(() => {
			this.view.showWarningMessage(msg);
		})
	}
}

