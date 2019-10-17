import UIModel from '../model/UIModel';
import UIView, {UserMessages} from '../view/UIView';
import EventEmitter from '../shared/EventEmitter';
import {isUndef, debounceAnimation} from '../shared/utils';

export default class UIController {
	constructor(
		private model: UIModel,
		private $view: UIView
	) {
		this.onDrawButtonClick = this.onDrawButtonClick.bind(this);
		this.onBackButtonClick = this.onBackButtonClick.bind(this);
		this.onGliderMove = debounceAnimation(this.onGliderMove, this);
	}
	private static readonly QUERIES_TO_RENDER = 5;
	initializeMainPage() {
		// render recent queries
		this.renderQueriesList();
		// add listeners
		this.$view.onDrawButtonClick(this.onDrawButtonClick);
		this.$view.onBackButtonClick(this.onBackButtonClick);
		this.$view.onKeyDown(' ', () => {
			if (!this.model.isCarouselVisible()) return;
			this.markPageOfCurrentReports(this.model.getCurrentPage());
		})
	}
	// Render recent queries
	renderQueriesList() {
		let queryHistories = this.model.getRecentQueries(UIController.QUERIES_TO_RENDER);
		// instantiate event emitters;
		let clickEventEmitter = new EventEmitter('click');
		let deleteEventEmitter = new EventEmitter('click');
		clickEventEmitter.$addListener((recentIndex) => {
			//render it directly without fetching reports.
			let {block, date} = this.model.getRecentQuery(recentIndex);
			let [id, report] = this.model.getRecentReportByIndex(recentIndex);
			this.renderReports(id, block, date, report)
				.catch(reason => {
					this.displayWarningMessage(String(reason));
				});
		});
		deleteEventEmitter.$addListener((index) => {
			this.model.deleteQueryHistory(index);
			this.renderQueriesList();
		});
		this.$view.renderQueryHistory(queryHistories, clickEventEmitter, deleteEventEmitter);
	}
	async onDrawButtonClick() {
		let block = this.$view.getSearchBarText();
		if (!UIModel.validateBlockExpr(block)) {
			this.displayInfoMessage(UserMessages.INVALID_BLOCK);
			return;
		}
		let dateExpr = this.$view.getDateBarText();
		if (!UIModel.validateDateExpr(dateExpr)) {
			this.displayInfoMessage(UserMessages.INVALID_DATE);
			return;
		}
		this.$view.toggleDrawButtonLoadingState(true);
		try {
			const [id, reports] = await this.model.fetchReports(block, dateExpr);
			this.$view.toggleDrawButtonLoadingState(false);
			return this.renderReports(id, block, dateExpr, reports);
		} catch (reason) {
			this.$view.toggleDrawButtonLoadingState(false);
			this.displayWarningMessage(String(reason));
		}
	}
	private markPageOfCurrentReports(channel: number) {
		this.model.toggleCurrentPageMarked(channel);
		this.$view.toggleMarkState(channel);
		this.renderSlideCounter(this.model.getCurrentPage());
	}
	async renderReports(index: number, block: string, dateExpr: string, reports: Readonly<string[]>) {
		this.$view.clearCarousel();
		this.$view.setSearchBarText(block);
		this.$view.setDateBarText(dateExpr);
		this.$view.blurSearchBar();
		this.model.setCurrentReport(index, reports);
		await this.$view.resourcesRequiredToPaintIsLoaded;
		const canvasClickEventEmitter = new EventEmitter('click');
		this.$view.drawCanvasesFromReport(
			reports,
			block,
			this.model.getReadOnlyMarkBitMask(),
			canvasClickEventEmitter
		);
		canvasClickEventEmitter.$addListener((channel) => {
			this.markPageOfCurrentReports(channel);
		});
		await this.$view.collapseSearchBar();
		this.model.setCarouselIsVisible(true);
		this.renderQueriesList();
		this.$view.mountNewGlider(this.onGliderMove);
		this.renderSlideCounter(0);
		let storedPage = this.model.getCurrentPage();
		if (storedPage !== null) {
			this.$view.moveGlider(storedPage);
		}
	}
	private renderSlideCounter(index: number) {
		this.$view.renderSlideCounter(
			index,
			this.model.getTotalReportsCount(),
			this.model.getMarkedIndexCount()
		);
	}
	onGliderMove(index: number) {
		this.$view.setDisplayedReportText(this.model.getCurrentReportByIndex(index));
		this.renderSlideCounter(index);
		this.model.setCurrentPage(index);
	}
	onBackButtonClick() {
		this.$view.expandSearchBar();
		this.model.setCarouselIsVisible(false);
	}
	onQueryDeleteClick(index: number) {
		this.model.deleteQueryHistory(index);
		this.renderQueriesList();
	}

	private static readonly MESSAGE_DISPLAY_TIME = 3 * 1000; // 3 seconds
	private messageCollapseTimer: number;
	private prepareMessageDisplay() {
		this.$view.hideMessage();
		if (!isUndef(this.messageCollapseTimer)) {
			clearTimeout(this.messageCollapseTimer);
		}
		this.messageCollapseTimer = window.setTimeout(() => {
			this.$view.hideMessage();
		}, UIController.MESSAGE_DISPLAY_TIME);
	}
	private displayInfoMessage(msg: UserMessages) {
		this.prepareMessageDisplay();
		requestAnimationFrame(() => {
			this.$view.showInfoMessage(msg);
		});
	}
	private displayWarningMessage(msg: string) {
		this.prepareMessageDisplay();
		requestAnimationFrame(() => {
			this.$view.showWarningMessage(msg);
		})
	}
}

