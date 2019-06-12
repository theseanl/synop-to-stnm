import { isUndef } from './utils';


type ChannelListener = (channel:number) => void
/**
 * One can instantiate it, add several listeners, and pass it to a consumer
 * so that it can `install` to certain EventTargets.
 * 
 * Why not create several event emitters with no channels? Because having a
 * single event emitter that can moderate several 'channels' enable certain
 * simplicity on the consumer's side!
 *
 * This uses EventListener.handleEvent property which is a "forgotten" part
 * of Javascript.
 */
export default class EventEmitter {
	protected listeners: Set<ChannelListener> = new Set();
	protected targetToChannelMap: WeakMap<EventTarget, Set<number>> = new WeakMap();
	private emit(channel: number) {
		this.listeners.forEach(listener => {
			try {
				listener(channel);
			} catch (e) { }
		});
	}
	addListener(listener: ChannelListener) {
		this.listeners.add(listener);
	}
	removeListener(listener: ChannelListener) {
		this.listeners.delete(listener);
	}
	handleEvent(this: this, evt: Event) {
		if (!evt.isTrusted) return;
		let { currentTarget } = evt;
		let channels = this.targetToChannelMap.get(currentTarget);
		if (isUndef(channels)) return;
		channels.forEach(this.emit, this);
	}
	constructor(
		private eventName: string
	) { }
	install(target: EventTarget, channel: number) {
		let channels = this.targetToChannelMap.get(target);
		if (isUndef(channels)) {
			channels = new Set();
			this.targetToChannelMap.set(target, channels);
			target.addEventListener(this.eventName, this);
		}
		channels.add(channel);
	}
	uninstall(target: EventTarget, channel: number) {
		let channels = this.targetToChannelMap.get(target);
		if (isUndef(channel)) return;
		channels.delete(channel);
		if (channels.size === 0) {
			target.removeEventListener(this.eventName, this);
			this.targetToChannelMap.delete(target);
		}
	}
}
