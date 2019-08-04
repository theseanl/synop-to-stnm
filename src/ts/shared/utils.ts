export function isUndef(x: any): x is undefined {
	return typeof x === 'undefined';
}

/**
 * Only the argument provided with the most recent call will be used in a scheduled execution,
 * hence debounce. Avoids creating new function on each rAF callback in order to reduce GC.
 */
export function debounceAnimation<T extends (...args)=>void>(func:T, thisArg):T {
	let args: IArguments;
	const animationCallback: FrameRequestCallback = function () {
		Reflect.apply(func, thisArg, args);
		args = undefined;
	}
	return <T>function () {
		let scheduleRequired = isUndef(args);
		args = arguments;
		if (scheduleRequired) {
			requestAnimationFrame(animationCallback);
		}
	}
}

