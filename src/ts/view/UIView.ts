import Drawer from '../stnm/Drawer';
import SynopParser, {TempParser, Parser} from '../stnm/Parser';
import {IStorageHistoryEntity, blockKinds, ReportKinds} from '../model/UIModel';
import EventEmitter from '../shared/EventEmitter';
import CanvasPool from './CanvasPool';
import {IReadOnlyBitMask} from '../shared/BitMask';
import {debounceAnimation} from '../shared/utils'
import Glide = require('@glidejs/glide') // TODO: replace this with default import after tscc properly supports esModuleInterop
import * as timeago from 'timeago.js';
import enShort from './timeago_en_short';

timeago.register('en_short', enShort);

export default class UIView {
	constructor(
		private doc: Document
	) {
		this.setDisplayedReportText = debounceAnimation(this.setDisplayedReportText, this);

		this.updateCanvasSize();
		this.updateCanvasSizeOnResize();
	}

	private readonly fontIsLoaded: Promise<void> = new FontFace(
		"American Typewriter",
		`local(American Typewriter), url(static/sub.woff) format("woff")`
	).load().then(font => {this.doc.fonts.add(font);});

	private readonly wxSymIsLoaded: Promise<void> = new Promise((resolve, reject) => {
		if (typeof wxSym !== 'undefined') resolve();
		const onLoad = () => {
			wxSymTag.removeEventListener('load', onLoad);
			resolve();
		}
		const onError = () => {
			wxSymTag.removeEventListener('error', onError);
			reject();
		}
		wxSymTag.addEventListener('load', onLoad);
		wxSymTag.addEventListener('error', onError);
	});

	public readonly resourcesRequiredToPaintIsLoaded: Promise<[void, void]> = Promise.all(
		[this.fontIsLoaded, this.wxSymIsLoaded]
	);

	private container = this.doc.getElementById('container');
	private slideRoot = this.doc.getElementById('slideRoot');
	private slideIndex = this.doc.getElementById('slideIndex');
	private carousel = this.doc.getElementById('carousel');
	private searchbar = <HTMLInputElement>this.doc.getElementById('searchbar');
	private datebar = <HTMLInputElement>this.doc.getElementById('datebar');
	private messageArea = this.doc.getElementById('messageArea');
	private reportArea = this.doc.getElementById('report');
	private queriesArea = this.doc.getElementById('queries__container');
	private backButton = this.doc.getElementById('back');
	private drawButton = this.datebar.nextElementSibling; // <button> is the next elem of datebar

	onKeyDown(key: string, handler: () => void) {
		this.doc.addEventListener('keydown', (evt) => {
			if (evt.key === key) handler();

		});
	}

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
		const runOnEnterKeyPress = (event: KeyboardEvent) => {
			if (event.keyCode === 13) {
				handler();
			}
		}
		this.searchbar.addEventListener('keypress', runOnEnterKeyPress);
		this.datebar.addEventListener('keypress', runOnEnterKeyPress);
	}
	toggleDrawButtonLoadingState(toggle: boolean) {
		this.drawButton.classList.toggle('loading', toggle);
	}
	onBackButtonClick(handler: () => void) {
		this.backButton.addEventListener('click', handler);
	}
	private static readonly COLLAPSED = "collapsed";
	private static readonly TRANSITION_ALL = "transition-all"
	/**
	 * Listens for transition end event caused by collapse/expandSearchbar method calls.
	 * Upon expection, it turned out that some early "transitioncancel" event is fired before
	 * the "transitionend" events that we expect are fired, which causes this promise to resolve
	 * prematurely. The button element and its "width" property was chosen in order to filter out
	 * such transitioncancel events.
	 */
	private transitionEndExecutor = (resolve: (r?: any) => void) => {
		function onTransitionEnd(this: Element, evt: TransitionEvent) {
			if (evt.target !== this) return;
			if (evt.propertyName !== 'width') return;
			this.removeEventListener('transitionend', onTransitionEnd);
			this.removeEventListener('transitioncancel', onTransitionEnd);
			resolve();
		}
		this.drawButton.addEventListener('transitionend', onTransitionEnd);
		this.drawButton.addEventListener('transitioncancel', onTransitionEnd);
	}
	private static rAFExecutor = (resolve: () => void) => {requestAnimationFrame(resolve);}
	private async transitionEnd() {
		await new Promise(this.transitionEndExecutor);
		await new Promise(UIView.rAFExecutor);
	}
	collapseSearchBar(): Promise<void> {
		// We attach "transition-all" class to the container element here, as it has
		// 100vh width, so otherwise if the window resizes it does not catch up the window
		// fast enough, leaving white margins below.
		this.container.classList.toggle(UIView.TRANSITION_ALL, true);
		let bodyClassList = this.doc.body.classList;
		if (bodyClassList.contains(UIView.COLLAPSED)) return;
		bodyClassList.toggle(UIView.COLLAPSED, true);
		this.disableSearchBar(true);
		return this.transitionEnd();
	}
	async expandSearchBar(): Promise<void> {
		let bodyClassList = this.doc.body.classList;
		if (!bodyClassList.contains(UIView.COLLAPSED)) return;
		bodyClassList.toggle(UIView.COLLAPSED, false);
		this.disableSearchBar(false);
		await this.transitionEnd();
		// Toggles off the transition effect when the searchbar is expanded.
		this.container.classList.toggle(UIView.TRANSITION_ALL, false);
	}
	blurSearchBar() {
		this.searchbar.blur();
		this.datebar.blur();
	}
	private disableSearchBar(toggle: boolean) {
		this.searchbar.disabled = this.datebar.disabled = toggle;
	}
	setDisplayedReportText(report: string) {
		this.reportArea.textContent = report;
	}
	private static dateExprToReadableFormat(YYMMDDHH: string, short?: boolean) {
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
			month: short ? 'numeric' : 'short',
			day: 'numeric',
			hour: 'numeric',
			timeZone: "UTC",
			timeZoneName: short ? undefined : "short"
		}).format(date);
	}
	private static historyToHTMLTemplate(history: IStorageHistoryEntity, index: number, short: boolean): string {
		return `<div class="query" data-index="${index}">` +
			`<div class="query__string">` +
			`<div>${history.block}</div>` +
			`<div>(${UIView.dateExprToReadableFormat(history.date, short)})</div>` +
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
		const short = this.doc.defaultView.innerWidth < 500;
		timeago.cancel();
		this.queriesArea.innerHTML = historyArr.reduce((acc, cur, i) => {
			return acc + UIView.historyToHTMLTemplate(cur, i, short);
		}, '');
		timeago.render(
			this.queriesArea.querySelectorAll('.query__date'),
			short ? 'en_short' : 'en_US'
		);
		// Add event listeners
		// recall call signature of EventEmitter.install: (listener:func, channel:number)=>any
		this.queriesArea.querySelectorAll('.query__string').forEach(clickEventEmitter.install, clickEventEmitter);
		this.queriesArea.querySelectorAll('.query__delete').forEach(deleteEventEmitter.install, deleteEventEmitter);
	}

	/**
	 * Default canvas size is 400, but it is too large for smartphones with smaller width.
	 * For such cases, canvas must be shrinked to available size, which is available width
	 * minus arrow size, with some grace which is possible because canvas image does not
	 * occupy the full width of the canvas.
	 */
	private static readonly CANVAS_SIZE = 400;
	private CANVAS_SIZE: number;
	private updateCanvasSize = () => {
		const width = this.doc.defaultView.innerWidth;
		const arrowWidth = Math.min(width * 0.06, 30); /* Duplication of a logic in CSS */
		const canvasSize = Math.min(
			UIView.CANVAS_SIZE,
			width - 2 * arrowWidth + 20/* grace */,
			this.carousel.clientHeight
		);

		this.CANVAS_SIZE = canvasSize;
		this.pool.setCanvasSize(canvasSize, canvasSize);
		this.doc.documentElement.style.setProperty('--canvas-size', canvasSize + 'px');
	}
	private updateCanvasSizeOnResize() {
		const view = this.doc.defaultView;
		view.addEventListener('resize', this.updateCanvasSize);
		view.addEventListener('orientationchange', this.updateCanvasSize);
	}

	private pool = new CanvasPool(this.doc);
	drawCanvasesFromReport(
		reports: Readonly<string[]>,
		block: string,
		marked: IReadOnlyBitMask,
		selectEventEmitter: EventEmitter
	) {
		// Creates a canvas, draw station model one by one.
		for (let i = 0, l = reports.length; i < l; i++) {
			let wrapper = this.doc.createElement('div');
			wrapper.classList.add('glide__slide');
			this.slideRoot.appendChild(wrapper);
			/**
			 * Gets the canvas, append it to the wrapper.
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

			// Draw on the canvas
			const drawer = new Drawer(renderingContext,
				this.CANVAS_SIZE / 2, this.CANVAS_SIZE / 2, this.CANVAS_SIZE / UIView.CANVAS_SIZE);
			let parser: Parser<any>;
			if (blockKinds(block) === ReportKinds.SYNOP) {
				parser = new SynopParser(reports[i]);
				let parsedData = parser.parse(true /* Flag to gracefully fail on errors */);
				drawer.drawFromParsedData(parsedData);
			} else {
				parser = new TempParser(reports[i], parseInt(block.slice(0, -3)));
				let parsedData = parser.parse(true);
				drawer.drawFromParsedTempData(parsedData);
			}

			// Attach error messages if needed
			let errors = parser.getParseErrors();
			if (errors.length) {
				wrapper.appendChild(this.getCanvasErrorBoxNode(errors.join(' ')));
			}

			// Attach check marks for marked drawings
			if (marked.hasIndex(i)) {
				this.markSlide(wrapper);
			}

			// Attach event listeners
			selectEventEmitter.install(wrapper, i);
		}
	}
	renderSlideCounter(currentIndex: number, total: number, markedTotal?: number) {
		let innerHTML = `<span>${currentIndex + 1}/${total} </span>`;
		if (markedTotal) {
			innerHTML += `<span class="slide__index--marked">${markedTotal}&#10003;</span>`
		}
		this.slideIndex.innerHTML = innerHTML;
	}
	toggleMarkState(slideIndex: number) {
		let slideWrapper = this.slideRoot.children[slideIndex];
		let isMarked = slideWrapper.classList.contains('marked');
		if (isMarked) {
			UIView.unmarkSlide(slideWrapper);
		} else {
			this.markSlide(slideWrapper);
		}
	}
	private static CHECK_SVG_CLASSNAME = 'slide--check'
	private static MARKED_CLASSNAME = 'marked';
	private markSlide(slideWrapper: Element) {
		slideWrapper.appendChild(this.getCheckSvgNode());
		slideWrapper.classList.add('marked');
	}
	private static unmarkSlide(slideWrapper: Element) {
		let check = slideWrapper.getElementsByClassName(UIView.CHECK_SVG_CLASSNAME)[0];
		slideWrapper.removeChild(check);
		slideWrapper.classList.remove(UIView.MARKED_CLASSNAME);
	}
	private getCanvasErrorBoxNode(msg: string): Element {
		let div = this.doc.createElement('div');
		div.classList.add('slide--error');
		div.textContent = msg;
		div.style.transform = `scale(${this.CANVAS_SIZE / UIView.CANVAS_SIZE})`
		return div;
	}
	private static checkSvgUrl = "/static/check.svg"
	private getCheckSvgNode(): Element {
		let img = this.doc.createElement('img');
		img.classList.add(UIView.CHECK_SVG_CLASSNAME);
		img.src = UIView.checkSvgUrl;
		return img;
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
			let index = this.glide.index;
			if (typeof index !== 'number') return;
			onMove(index);
		});
		glide.mount();
	}
	moveGlider(page: number) {
		if (!this.glide) return;
		if (this.glide.index === page) return;
		this.glide.go(`=${page}`);
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

declare const wxSymTag: HTMLScriptElement;
