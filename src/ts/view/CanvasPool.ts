/**
 * https://stackoverflow.com/questions/40482586/getcontext2d-returns-null-in-safari-10?rq=1
 * Safari has very low limit on total canvases that can be created.
 */
export default class CanvasPool {
	private contextsInUse: CanvasRenderingContext2D[] = [];
	private contextsAvailable: CanvasRenderingContext2D[] = [];
	constructor(
		private doc: Document,
		private width: number,
		private height: number
	) {}
	/**
	 * returns null if canvas creation fails
	 */
	getContext(): CanvasRenderingContext2D {
		let ctxt: CanvasRenderingContext2D;
		if (this.contextsAvailable.length > 0) {
			ctxt = this.contextsAvailable.pop();
		} else {
			let canvas = this.doc.createElement('canvas');
			canvas.width = this.width;
			canvas.height = this.height;
			ctxt = canvas.getContext('2d');
			if (ctxt === null) return null;
		}
		this.contextsInUse.push(ctxt);
		return ctxt;
	}
	releaseAll() {
		this.contextsInUse.forEach(CanvasPool.clearCanvas);
		Array.prototype.push.apply(this.contextsAvailable, this.contextsInUse);
		this.contextsInUse.length = 0;
	}
	releaseContext(ctxt: CanvasRenderingContext2D) {
		CanvasPool.clearCanvas(ctxt);
		let i = this.contextsInUse.indexOf(ctxt);
		if (i !== -1) {
			this.contextsInUse.splice(i, 1);
		}
		this.contextsAvailable.unshift(ctxt);
	}
	private static clearCanvas(ctxt: CanvasRenderingContext2D) {
		ctxt.setTransform(1, 0, 0, 1, 0, 0);
		ctxt.clearRect(0, 0, ctxt.canvas.width, ctxt.canvas.height);
	}
	getCurrentActiveCanvasCount():number {
		return this.contextsInUse.length;
	}
}

