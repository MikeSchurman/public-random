import { get, set } from "lodash"
import Time from "../../engine/shared/time"
import DevToolsManager from "../../ui/dev-tools/dev-tools-manager"
import { visitObject } from "../../utils/debug"
import { mapToRange, VectorXY } from "../../utils/math"

let DEBUG_CANVAS_CTX: CanvasRenderingContext2D
let mousePos = { x: 0, y: 0 }
const curves: Map<string, VectorXY[]> = new Map()
const colors = ['red', 'green', 'blue', 'cyan', 'teal', 'yellow', 'orange', 'purple', 'pink', 'brown', 'grey', 'black']

const graphConfig = {
	size: { x: 800, y: 400 },
	disabled: false,
	pauseLogging: true,
	backAlpha: 0.1,
	curves: {},
	smoothing: 0.5,
	lineWidth: 0.5,
	boldLineWidth: 1.5,
	legend: {
		ySpacing: 12,
		font: '12px Arial',
		toFixed: 1,
		shadow: {
			enabled: true,
			topColor: 'white',
			bottomColor: 'black'
		}
	}
}
DevToolsManager.getInstance().addObjectByName('graphConfig', graphConfig)
DevToolsManager.getInstance().setDebugObject(graphConfig)

setTimeout(() => {
	//graphConfig.pauseLogging = false
}, 5000)

function destroyDebugCanvasIf() {
	const ctx = DEBUG_CANVAS_CTX
	if (ctx) {
		ctx.canvas.remove()
		DEBUG_CANVAS_CTX = null
	}
}

function createDebugCanvas() {
	console.log('createDebugCanvas')
	const canvas = document.createElement('canvas')
	canvas.style.position = 'absolute'
	const w = graphConfig.size.x
	const h = graphConfig.size.y
	canvas.width = w
	canvas.height = h
	canvas.onmousemove = mouseMove
	canvas.style.left = (window.innerWidth * 0.5 - w * 0.5) + 'px'
	canvas.style.top = (window.innerHeight * 0.5) + 'px'
	const ctx = canvas.getContext('2d')
	document.body.appendChild(canvas)

	return ctx
}

// /hook-nengi test.txt send 100
export function logData(name: string, value: number, smoothed: boolean = false): void {
	if (graphConfig.pauseLogging) {
		return
	}
	if (!curves.has(name)) {
		curves.set(name, [])
	}
	const t = Time.timeElapsedSinceModeStartInMs / 10

	const curve = curves.get(name)
	curve.push({ x: t, y: value })
	if (smoothed && curve.length > 1) {
		curve[curve.length - 1].x = Math.lerp(curve[curve.length - 2].x, curve[curve.length - 1].x, graphConfig.smoothing)
	}

	updateGraphCurvesUI(name)
}

function updateCreation() {
	const ctx = DEBUG_CANVAS_CTX
	if (ctx) {
		if (ctx.canvas.width !== graphConfig.size.x ||
			ctx.canvas.height !== graphConfig.size.y
		) {
			destroyDebugCanvasIf()
		}
	}
	if (!DEBUG_CANVAS_CTX) {
		DEBUG_CANVAS_CTX = createDebugCanvas()
	}
}

export function updateGraphCurvesUI(name) {
	if (!get(graphConfig.curves, name)) {
		set(graphConfig.curves, name, { enabled: true, globaly: true })
		// this set
		visitObject(graphConfig.curves, (key, member) => {
			if (typeof member === 'object') {
				member.enabled = true
			}
		}, console, true)
	}
}

export function debugDrawText(s: string, c: string = 'white') {
	if (!DEBUG_CANVAS_CTX) {
		DEBUG_CANVAS_CTX = createDebugCanvas()
	}
	const ctx = DEBUG_CANVAS_CTX
	ctx.fillStyle = c
	ctx.font = '50px Arial'
	ctx.fillText(s, 0, ctx.canvas.height - 30)
	ctx.strokeText(s, 0, ctx.canvas.height - 30)
}

export function drawGraph() {
	if (graphConfig.disabled) {
		destroyDebugCanvasIf()
		return
	}

	updateCreation()
	calcMaxRanges()

	const ctx = DEBUG_CANVAS_CTX
	ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
	ctx.globalAlpha = graphConfig.backAlpha
	ctx.fillStyle = 'black'
	ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
	ctx.globalAlpha = 1
	drawLegend()
	let i = 0
	const maxh = Math.max(...Array.from(curves.values()).map(v => Math.max(...v.map(v => v.y))))
	const closest = findClosestCurve(mousePos.x, mousePos.y)
	curves.forEach((curve, name) => {
		if (get(graphConfig.curves, name).enabled) {
			if (isEnabled(graphConfig.curves, name)) {
				ctx.lineWidth = closest === curve ? graphConfig.boldLineWidth : graphConfig.lineWidth
				drawCurve(curve, colors[i % colors.length], maxh)
			}
		}
		i++
	})
}

const ranges = {
	minx: 0,
	maxx: 0,
	miny: 0,
	maxy: 0,
}

function calcMaxRanges() {
	const curveValues = Array.from(curves.values())
	ranges.minx = Math.min(...curveValues.map(v => Math.min(...v.map(v => v.x))))
	ranges.maxx = Math.max(...curveValues.map(v => Math.max(...v.map(v => v.x))))
	ranges.miny = Math.min(...curveValues.map(v => Math.min(...v.map(v => v.y))))
	ranges.maxy = Math.max(...curveValues.map(v => Math.max(...v.map(v => v.y))))
}

function drawCurve(curve: VectorXY[], color: string, _maxy: number) {
	const mint = Math.min(...curve.map(v => v.x))
	const maxt = Math.max(...curve.map(v => v.x))
	//const maxy = Math.max(...curve.map(v => v.y))
	const maxy = ranges.maxy
	const f = (maxt - mint) / curve.length
	//console.log({ color, mint, maxt, p: curve.length, f })
	const ctx = DEBUG_CANVAS_CTX
	ctx.strokeStyle = color
	const canvasHeight = ctx.canvas.height
	const canvasWidth = ctx.canvas.width
	const my = canvasHeight / maxy
	const mx = ctx.canvas.width / ranges.maxx
	const drawTicks = f > 10
	if (drawTicks) {
		ctx.beginPath()
		for (let i = 0; i < curve.length; i++) {
			ctx.moveTo(curve[i].x * mx, canvasHeight - 0 * my)
			ctx.lineTo(curve[i].x * mx, canvasHeight - curve[i].y * my)
		}
		ctx.stroke()
	} else {
		ctx.beginPath()
		ctx.moveTo(mapToRange(curve[0].x, ranges.minx, ranges.maxx, 0, canvasWidth), canvasHeight - curve[0].y * my)
		for (let i = 1; i < curve.length; i++) {
			ctx.lineTo(mapToRange(curve[i].x, ranges.minx, ranges.maxx, 0, canvasWidth), canvasHeight - curve[i].y * my)
		}
		ctx.stroke()
	}
}

function findClosestCurve(x: number, y: number) {
	let closestCurve: VectorXY[] = null
	let closestCurveDistance = Number.MAX_VALUE
	curves.forEach((curve, name) => {
		const distance = distanceToCurve(curve, x, y)
		if (distance < closestCurveDistance) {
			closestCurve = curve
			closestCurveDistance = distance
		}
	})
	return closestCurve
}

function drawLegend() {
	const ctx = DEBUG_CANVAS_CTX
	const legendConfig = graphConfig.legend
	ctx.font = legendConfig.font
	let i = 0
	const s = legendConfig.ySpacing
	const shadowConfig = legendConfig.shadow
	const topShadowColor = shadowConfig.topColor
	const bottomShadowColor = shadowConfig.bottomColor

	for (const [key, curve] of curves.entries()) {
		const yValues = curve.map(v => v.y)
		const miny = Math.min(...yValues)
		const maxy = Math.max(...yValues)
		const cury = yValues[yValues.length - 1]
		const color = colors[i++ % colors.length]
		const tf = legendConfig.toFixed
		const msg = `${key} (${miny.toFixed(tf)}, ${maxy.toFixed(tf)}, ${cury.toFixed(tf)})`
		if (shadowConfig.enabled) {
			ctx.fillStyle = topShadowColor
			ctx.fillText(msg, 9, i * s - 1)
			ctx.fillStyle = bottomShadowColor
			ctx.fillText(msg, 11, i * s + 1)
		}
		ctx.fillStyle = color
		ctx.fillText(msg, 10, i * s)
	}
}

// function distanceToLine2(a: VectorXY, b: VectorXY, x: number, y: number) {
// 	const dx = b.x - a.x
// 	const dy = b.y - a.y
// 	const t = ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy)
// 	return Math.abs(dy * x - dx * y + b.x * a.y - b.y * a.x) / Math.sqrt(dx * dx + dy * dy)
// }
// function distanceToLine(a: VectorXY, b: VectorXY, x: number) {
// 	const dx = b.x - a.x
// 	const dy = b.y - a.y
// 	const t = (x - a.x) / dx
// 	return Math.abs(dy * t + a.y - x)
// }

// function test(a: VectorXY, b: VectorXY, x: number, y: number, expected: number) {
// 	const result = distanceToLine2(a, b, x, y)
// 	console.assert(result === expected, { a, b, x, y, expected, result })
// }

// test({ x: 0, y: 0 }, { x: 1, y: 0 }, 0, 0, 0)
// test({ x: 0, y: 0 }, { x: 1, y: 0 }, 1, 0, 0)
// test({ x: 0, y: 0 }, { x: 1, y: 0 }, 0, 1, 1)
// test({ x: 0, y: 0 }, { x: 1, y: 0 }, 2, 0, 1)

function d2(v1: VectorXY, v2: VectorXY, x: number, y: number) {
	const dx = v1.x - x
	const dy = v2.y - y
	return dx * dx + dy * dy
}

function distanceToCurve(curve: VectorXY[], x: number, y: number) {
	let min = Infinity
	for (let i = 0; i < curve.length - 1; i++) {
		const d = d2(curve[i], curve[i + 1], x, y)
		if (d < min) {
			min = d
		}
	}
	return min
}

function mouseMove(e) {
	const values = Array.from(curves.values())
	const maxt = Math.max(...values.map(v => Math.max(...v.map(v => v.x))))
	const maxh = Math.max(...values.map(v => Math.max(...v.map(v => v.y))))
	const ctx = DEBUG_CANVAS_CTX
	const ay = ctx.canvas.height
	const my = maxh / ay
	const mx = maxt / ctx.canvas.width
	mousePos = {
		x: e.offsetX * mx, y: (ay - e.offsetY) * my
	}
}

function isEnabled(curves: {}, name: string) {
	const words = name.split('.')
	let partName = ''
	let enabled = true
	words.forEach(word => {
		partName += partName ? `.${word}` : word
		if (!get(curves, partName).enabled) {
			enabled = false
		}
	})
	return enabled
}
