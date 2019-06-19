/**
 * Represents a sequence of binary numbers. bitMaskArray encodes every 32 bits into an integer.
 */
export interface IReadOnlyBitMask {
	hasIndex(index: number): boolean
	countBits(): number
	readonly bitMaskArray: ReadonlyArray<number>
}
export interface IBitMask extends IReadOnlyBitMask {
	toggleIndex(index: number):void 
}
export class BitMask implements IBitMask {
	constructor(
		public bitMaskArray: number[]
	) {}
	hasIndex(index: number) {
		let r = index & 31;
		let q = index >> 5;
		let bitMask = this.bitMaskArray[q];
		if (!bitMask) return false; // bitMask can be undefined or 0, both cases indicate "false".
		return (bitMask & (1 << r)) !== 0;
	}
	toggleIndex(index: number) {
		let r = index & 31;
		let q = index >> 5;
		this.bitMaskArray[q] ^= 1 << r;
	}
	countBits() {
		let count = 0;
		for (let i = 0, l = this.bitMaskArray.length; i < l; i++) {
			count += BitMask.countBitsInBitMask(this.bitMaskArray[i]);
		}
		return count;
	}
	private static countBitsInBitMask(bitMask: number) {
		let count = 0;
		while (bitMask !== 0) {
			bitMask &= bitMask - 1;
			count++;
		}
		return count;

	}
}

