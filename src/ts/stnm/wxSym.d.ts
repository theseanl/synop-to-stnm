type canvasDrawer = (ctx: CanvasRenderingContext2D) => void;

interface NumberIndexedCanvasDrawer {
	[num: number]: canvasDrawer
}

interface StringIndexedCanvasDrawer {
	[index: string]: canvasDrawer
}

interface WeatherCanvasDrawer extends StringIndexedCanvasDrawer {
	DoubleSlash: canvasDrawer
}

interface CloudCoverDrawer extends NumberIndexedCanvasDrawer {
	Slash: canvasDrawer
}
interface IWxSym {
	CloudLow: {
		CL: NumberIndexedCanvasDrawer
	}
	CloudMedium: {
		CM: NumberIndexedCanvasDrawer
	}
	CloudHigh: {
		CH: NumberIndexedCanvasDrawer
	}
	PressureTendencyCharacteristic: {
		a: StringIndexedCanvasDrawer
	}
	PresentWeather: {
		ww: WeatherCanvasDrawer
	}
	PastWeather: {
		W1W2: WeatherCanvasDrawer
	}
	TotalCloudCover: {
		N: CloudCoverDrawer
	}
	WindArrowCalm: {
		"00": canvasDrawer
	}
	WindArrowNH: StringIndexedCanvasDrawer
	WindArrowMissing: {
		"99": canvasDrawer
	}
}

declare const wxSym: IWxSym
