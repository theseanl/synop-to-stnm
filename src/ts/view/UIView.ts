import Drawer from '../stnm/Drawer';
import Parser from '../stnm/Parser';
import {IStorageHistoryEntity} from '../model/UIModel';
import EventEmitter from '../shared/EventEmitter';
import CanvasPool from './CanvasPool';
import Glide from '@glidejs/glide';
import * as timeago from 'timeago.js';

export default class UIView {
	constructor(
		private doc: Document
	) {}
	public readonly fontIsLoaded: Promise<void> = new FontFace(
		"American Typewriter",
		`local(American Typewriter), url(static/sub.woff) format("woff")`
	).load().then((font) => {this.doc.fonts.add(font);});

	private slideRoot = this.doc.getElementById('slideRoot');
	private carousel = this.doc.getElementById('carousel');
	private searchbar = <HTMLInputElement>this.doc.getElementById('searchbar');
	private datebar = <HTMLInputElement>this.doc.getElementById('datebar');
	private messageArea = this.doc.getElementById('messageArea');
	private reportArea = this.doc.getElementById('report');
	private queriesArea = this.doc.getElementById('queries__container');
	private backButton = this.doc.getElementById('back');
	private drawButton = this.datebar.nextElementSibling; // <button> is the next elem of datebar

	getSearchBarText(): string {
		return this.searchbar.value;
	}
	setSearchBarText(text: string) {
		this.searchbar.value = text;
	}
	getDateBarText(): string {
		return this.datebar.value;
	}
	setDateBarText(text: string) {
		this.datebar.value = text;
	}

	onDrawButtonClick(handler: () => void) {
		this.drawButton.addEventListener('click', handler);
	}
	toggleDrawButtonLoadingState(toggle: boolean) {
		this.drawButton.classList.toggle('loading', toggle);
	}
	onBackButtonClick(handler: () => void) {
		this.backButton.addEventListener('click', handler);
	}
	private static COLLAPSED = "collapsed";
	/**
	 * Listens for transition end event caused by collapse/expandSearchbar method calls.
	 * Many transition events occur simultaneously, the searchbar element was chosen
	 * among them arbitrarily.
	 */
	private transitionEndExecutor = (resolve: (r?: any) => void) => {
		function onTransitionEnd(this: Element, evt: TransitionEvent) {
			if (evt.target !== this) return;
			this.removeEventListener('transitionend', onTransitionEnd);
			this.removeEventListener('transitioncancel', onTransitionEnd);
			resolve();
		}
		this.searchbar.addEventListener('transitionend', onTransitionEnd);
		this.searchbar.addEventListener('transitioncancel', onTransitionEnd);
	}
	collapseSearchBar(): Promise<void> {
		let bodyClassList = this.doc.body.classList;
		if (bodyClassList.contains(UIView.COLLAPSED)) return;
		bodyClassList.toggle(UIView.COLLAPSED, true);
		return new Promise(this.transitionEndExecutor);
	}
	expandSearchBar(): Promise<void> {
		let bodyClassList = this.doc.body.classList;
		if (!bodyClassList.contains(UIView.COLLAPSED)) return;
		bodyClassList.toggle(UIView.COLLAPSED, false);
		return new Promise(this.transitionEndExecutor);
	}
	setDisplayedReportText(report: string) {
		this.reportArea.textContent = report;
	}
	private static dateExprToReadableFormat(YYMMDDHH: string) {
		let yy = parseInt(YYMMDDHH.slice(0, 2));
		let mm = parseInt(YYMMDDHH.slice(2, 4));
		let dd = parseInt(YYMMDDHH.slice(4, 6));
		let hh = parseInt(YYMMDDHH.slice(6, 8));
		let date = new Date(0);
		// Only the month parameter accepts zero-based index. Very weird.
		// See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/setFullYear
		date.setUTCFullYear(
			yy < 70 ? 2000 + yy : 1900 + yy,
			mm - 1,
			dd
		);
		date.setUTCHours(hh);
		return Intl.DateTimeFormat('default', {
			hour12: false,
			year: '2-digit',
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			timeZone: "UTC",
			timeZoneName: "short"
		}).format(date);
	}
	private static historyToHTMLTemplate(history: IStorageHistoryEntity, index: number): string {
		return `<div class="query" data-index="${index}">` +
			`<div class="query__string">` +
			`<div>${history.block}</div>` +
			`<div>(${UIView.dateExprToReadableFormat(history.date)})</div>` +
			`</div>` +
			`<div>` +
			`<div class="query__date" datetime="${new Date(history.queryDate).toISOString()}">` +
			`</div>` +
			`<div class="query__delete">` +
			`<img src="/static/outline-clear-24px.svg" width="18" height="18"></img>` +
			`</div>` +
			`</div>` +
			`</div>`;
	}
	renderQueryHistory(
		historyArr: IStorageHistoryEntity[],
		clickEventEmitter: EventEmitter,
		deleteEventEmitter: EventEmitter
	) {
		// Render HTML
		timeago.cancel();
		this.queriesArea.innerHTML = historyArr.reduce((acc, cur, i) => {
			return acc + UIView.historyToHTMLTemplate(cur, i);
		}, '');
		timeago.render(this.queriesArea.querySelectorAll('.query__date'));
		// Add event listeners
		// recall call signature of EventEmitter.install: (listener:func, channel:number)=>any	
		this.queriesArea.querySelectorAll('.query__string').forEach(clickEventEmitter.install, clickEventEmitter);
		this.queriesArea.querySelectorAll('.query__delete').forEach(deleteEventEmitter.install, deleteEventEmitter);
	}

	private static readonly CANVAS_SIZE = 400;
	private CANVAS_SIZE = (() => {
		const width = this.doc.defaultView.innerWidth;
		const arrowWidth = Math.min(width / 10, 30);
		return Math.min(400, width - 2 * arrowWidth + 20/* grace */);
	})()
	private pool = new CanvasPool(this.doc, this.CANVAS_SIZE, this.CANVAS_SIZE);
	drawCanvasesFromReport(reports: Readonly<string[]>) {
		// Creates a canvas, draw station model one by one.
		for (let i = 0, l = reports.length; i < l; i++) {
			let wrapper = this.doc.createElement('div');
			wrapper.classList.add('glide__slide');
			this.slideRoot.appendChild(wrapper);
			/**
			 * TODO: if canvas creation fails, maybe notify users about it
			 * and lazyload canvases. Before that, fill slides with dummy images.
			 */
			let renderingContext = this.pool.getContext();
			if (renderingContext) {
				wrapper.appendChild(renderingContext.canvas);
			} else { // Canvas creation has failed - attach an empty placeholder, display error 
				wrapper.appendChild(this.getCanvasErrorBoxNode(
					`Couldn't create more canvas to draw on. ` +
					`Currently ${this.pool.getCurrentActiveCanvasCount()} canvases are in use. ` +
					`Try refreshing the page.`
				));
				continue;
			}

			const parser = new Parser(reports[i]);
			let parsedData = parser.parse(true /* Gracefully fail on errors */);

			const drawer = new Drawer(renderingContext,
				this.CANVAS_SIZE / 2, this.CANVAS_SIZE / 2, this.CANVAS_SIZE / UIView.CANVAS_SIZE);
			drawer.drawFromParsedData(parsedData);

			let errors = parser.getParseErrors();
			if (errors.length) {
				wrapper.appendChild(this.getCanvasErrorBoxNode(errors.join(' ')));
			}
		}

	}
	private getCanvasErrorBoxNode(msg: string): Element {
		let div = this.doc.createElement('div');
		div.classList.add('slide--error');
		div.textContent = msg;
		div.style.transform = `scale(${this.CANVAS_SIZE / UIView.CANVAS_SIZE})`
		return div;
	}
	clearCarousel() {
		if (this.glide) this.glide.destroy();
		this.glide = undefined;
		this.pool.releaseAll(); // Release all canvases
		this.slideRoot.innerHTML = '';
		this.carousel.classList.toggle('initialized', false);
	}
	private glide: Glide;
	mountNewGlider(onMove: (index: number) => void) {
		let glide = this.glide = new Glide('.glide');
		let mounted = false;
		glide.on('mount.after', () => {
			if (mounted) return;
			mounted = true;
			this.carousel.classList.toggle('initialized', true);
		});
		glide.on('move.after', () => {
			onMove(this.glide.index);
		});
		glide.mount();
	}

	private static readonly MESSAGE_INFO = 'message--info';
	private static readonly MESSAGE_WARNING = 'message--warning';

	hideMessage() {
		let classList = this.messageArea.classList;
		classList.toggle(UIView.MESSAGE_WARNING, false);
		classList.toggle(UIView.MESSAGE_INFO, false);
	}
	showInfoMessage(text: UserMessages) {
		this.messageArea.textContent = text;
		this.messageArea.classList.toggle(UIView.MESSAGE_INFO, true);
	}
	showWarningMessage(text: string) {
		this.messageArea.textContent = text;
		this.messageArea.classList.toggle(UIView.MESSAGE_WARNING, true);
	}
}

export const enum UserMessages {
	INVALID_DATE = "Please provide the time in a format YYMMDDHH.",
	NO_MATCHED_QUERIES = "Your query matched no reports.",
	INVALID_BLOCK = "Please provide the request block in a form 111,22000-22999."
}

