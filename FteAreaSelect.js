/*!
 * FteAreaSelect
 *
 * 
 */

(function (root, factory){
   	'use strict';

   	if(typeof exports === 'object') {
   		module.exports = factory();
   	}else if(typeof define === 'function' && define.amd) {
   		define(function(req) {
   			return factory();
   		})
   	}else{
   		root.FteAreaSelect = factory();
   	}
}(this, function() {

	'use strict';

	var hasEventListeners = !!window.addEventListener,

	document = window.document,

	AreaSelectStatus = {CREATE: 'create', MOVE: 'move', RESIZE: 'resize', NEAR: 'near'},

	Direction = {
		NE: {name: 'NE', x: 1, y: -1, cursor: 'nesw-resize'},
		NW: {name: 'NW', x: -1, y: -1, cursor: 'nwse-resize'},
		SE: {name: 'SE', x: 1, y: 1, cursor: 'nwse-resize'},
		SW: {name: 'SW', x: -1, y: 1, cursor: 'nesw-resize'}
	},

	DeleteMethod = {CLICK: 'click', DOUBLE_CLICK: 'doubleClick'},

	addEvent = function(el, e, callback, capture) {
		if (hasEventListeners) {
            el.addEventListener(e, callback, !!capture);
        } else {
            el.attachEvent('on' + e, callback);
        }
	},
	fireEvent = function(el, eventName, data){

        var ev;

        if (document.createEvent) {
            ev = document.createEvent('HTMLEvents');
            ev.initEvent(eventName, true, false);
            ev = extend(ev, data);
            el.dispatchEvent(ev);
        } else if (document.createEventObject) {
            ev = document.createEventObject();
            ev = extend(ev, data);
            el.fireEvent('on' + eventName, ev);
        }
    },

	isArray = function(obj){
        return (/Array/).test(Object.prototype.toString.call(obj));
    },

	extend = function(to, from, overwrite) {
		var prop, hasProp;

		for(prop in from) {
			hasProp = to[prop] !== undefined;

			if(hasProp && typeof from[prop] === 'object' && from[prop] !== null && from[prop].nodeName === undefined) {
				if(isArray(from[prop])) {
					to[prop] = from[prop].slice(0)
				}else{
					to[prop] = extend({}, from[prop], overwrite)
				}
			}else if(overwrite || !hasProp) {
				to[prop] = from[prop]
			}
		}

		return to;
	},

	near = function (point1, point2, s) {
		return Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2) <= Math.pow(s, 2);
	},

	getOffsetX = function(event) {
		return event.offsetX ? event.offsetX : event.originalEvent.layerX;
	},

	getOffsetY = function(event) {
		return event.offsetY ? event.offsetY : event.originalEvent.layerY;
	},

	defaults = {
		field 			: null,
		initAreas		: [],
		deleteMethod	: 'click', // 'doubleClick'
		padding			: 3,
		area 			: {strokeStyle: '#ffffff', lineWidth: 2},
		point			: {size: 3, fillStyle: 'black'} ,
		maxArea 		: 999,
		disabled 		: false,    // 判断是否可以画选框，需求场景：画一个选框之后需执行指定操作才能继续画选框

		// callback function
		cbDraw 			: null,
		cbClick 		: null,
		cbDblclick 		: null
	},

	getPositionPoints = function (area) {
		var points = {};
		for (var d in Direction) {
			points[d] = {
				x: area.x + area.width * (Direction[d].x + 1) / 2,
				y: area.y + area.height * (Direction[d].y + 1) / 2
			};
		}
		return points;
	},

	setAreaDirection = function(area, direction) {
		if(area != undefined && direction != undefined) {
			var x1 = area.x,
				x2 = area.x + area.width,
				y1 = area.y,
				y2 = area.y + area.height,
				width 	= Math.abs(area.width),
				height 	= Math.abs(area.height);
			var minOrMax = {'1': Math.min, '-1': Math.max}
			area.x = minOrMax[direction.x](x1, x2)
			area.y = minOrMax[direction.y](y1, y2)
			area.width = direction.x * width
			area.height = direction.y * height
		}
	},

	/**
     * FteAreaSelect constructor
     */
	FteAreaSelect = function(options){
		var self = this,
			opts = self.config(options);

		self.areas 		= opts.initAreas
		self.status 	= AreaSelectStatus.CREATE
		self.dragging 	= false
		self.resizeDirection = null
		self.dragAreaOffset = {}

		var canvas 			= document.createElement('canvas');
			canvas.width 	= opts.field.clientWidth
			canvas.height 	= opts.field.clientHeight
			canvas.style.position 	= 'absolute'
			canvas.style.top 		= opts.field.offsetTop + 'px'
			canvas.style.left 		= opts.field.offsetLeft + 'px'
			canvas.style.zIndex 	= 2

		opts.field.parentNode.appendChild(canvas);

		self.canvas = canvas;
		self.g2d 	= canvas.getContext('2d');

		var moveDownPoint = {}

		self._onMouseDown = function(event) {
			var offsetX = getOffsetX(event),
				offsetY = getOffsetY(event);

			moveDownPoint = {x: offsetX, y: offsetY}
			self.onDragStart(offsetX, offsetY)
		}

		self._onMouseMove = function(event) {
			var offsetX = getOffsetX(event),
				offsetY = getOffsetY(event);

			if(self.disabled) {
				return 
			}

			if(self.dragging) {
				self.onDragging(offsetX, offsetY)
			}else{
				self.onMouseMoving(offsetX, offsetY)
			}
		}

		self._onMouseUp = function(event) {
			var offsetX = getOffsetX(event),
				offsetY = getOffsetY(event);
			if(offsetX == moveDownPoint.x && offsetY == moveDownPoint.y) {
				self.onClick(offsetX, offsetY)
			}
			self.onDragStop()
		}

		self._onDbclick = function(event) {
			var offsetX = getOffsetX(event),
				offsetY = getOffsetY(event);
				self.onDoubleClick(offsetX, offsetY)
		}

		addEvent(self.canvas, 'mousedown', self._onMouseDown)
		addEvent(self.canvas, 'mousemove', self._onMouseMove)
		addEvent(self.canvas, 'mouseup', self._onMouseUp)
		addEvent(self.canvas, 'dblclick', self._onDbclick)

		this.draw()
	};

	FteAreaSelect.prototype = {
		/**
         * configure functionality
         */
		config: function(options) {

			if(!this._o) {
				this._o = extend({}, defaults, true);
			}

			var opts = extend(this._o, options, true);

			return opts
		},

		bindChangeEvent: function(handle) {
			addEvent(this.canvas, 'areaChange', handle[0])
		},

		get: function() {
			return this.areas
		},

		getArea: function(x, y, padding) {
			padding = padding === undefined ? 0 : padding
			for (var index in this.areas) {
				var area = this.areas[index];
				var abs = Math.abs;
				var x1 = area.x;
				var x2 = area.x + area.width;
				var y1 = area.y;
				var y2 = area.y + area.height;
				if (padding >= 0 && abs(x1 - x) + abs(x2 - x) - abs(area.width) <= padding * 2
					&& abs(y1 - y) + abs(y2 - y) - abs(area.height) <= padding * 2) {
					return area;
				}
				if (padding < 0
					&& abs(x1 - x) + abs(x2 - x) - abs(area.width) == 0
					&& abs(y1 - y) + abs(y2 - y) - abs(area.height) == 0
					&& abs(abs(x1 - x) - abs(x2 - x)) <= abs(area.width) + 2 * padding
					&& abs(abs(y1 - y) - abs(y2 - y)) <= abs(area.height) + 2 * padding) {
					return area;
				}
			}
			return undefined;
		},

		onDragStart: function(x, y) {

			this.dragging = true
			switch(this.status) {
				case AreaSelectStatus.RESIZE:
					!this.currentArea || setAreaDirection(this.currentArea, this.resizeDirection)
					break;

				case AreaSelectStatus.MOVE:
					this.dragAreaOffset = {x: this.currentArea.x - x, y: this.currentArea.y - y}
					break;

				case AreaSelectStatus.CREATE:

					if(this.areas.length <  this._o.maxArea) {
						var newArea = {x: x, y: y, width: 0, height: 0}
						this.areas.push(newArea)
						this.currentArea = newArea
					}
					this.status = AreaSelectStatus.RESIZE
					break;
			}
		},

		onDragging: function(x, y) {

			var area = this.currentArea

			switch(this.status) {
				case AreaSelectStatus.RESIZE:
					area.width = x - area.x;
					area.height = y - area.y;
					break;
				case AreaSelectStatus.MOVE:
					area.x = (x + this.dragAreaOffset.x);
					area.y = (y + this.dragAreaOffset.y);
					break;
				case AreaSelectStatus.CREATE:
					break;
			}

			this.draw();
		},

		onMouseMoving: function(x, y) {
			var area 	= this.getArea(x, y, this._o.padding);
			var canvas 	= this.canvas;
			if (area != undefined) {
				this.currentArea = area;
				var nearDrag = false;
				var dragDirection = null;
				var dragPoints = getPositionPoints(area);
				for (var d in dragPoints) {
					if (near({x: x, y: y}, dragPoints[d], this._o.padding)) {
						nearDrag = true;
						dragDirection = Direction[d];
						break;
					}
				}
				if (nearDrag) {
					canvas.style.cursor = dragDirection.cursor
					this.status = AreaSelectStatus.RESIZE;
					this.resizeDirection = dragDirection;
				}
				else if (this.getArea(x, y, -this._o.padding) != undefined) {
					canvas.style.cursor = 'move'
					this.status = AreaSelectStatus.MOVE;
				} else {
					canvas.style.cursor = 'auto'
					this.status = AreaSelectStatus.NEAR;
				}

				
			} else {
				this.currentArea = undefined;
				canvas.style.cursor = 'default'
				this.status = AreaSelectStatus.CREATE;
			}

			//this.draw()

		},

		onDragStop: function() {
			this.dragging = false
			switch(this.status) {
				case AreaSelectStatus.RESIZE:
					if (this.currentArea != undefined) {
						if (this.currentArea.width == 0 && this.currentArea.height == 0) {
							this.deleteArea(this.currentArea);
							this.currentArea = undefined;
							this.status = AreaSelectStatus.CREATE;
						} else {
							setAreaDirection(this.currentArea, Direction.SE);
							this.triggerChange();
						}
					}
					break;
				case AreaSelectStatus.MOVE:
					this.triggerChange();
					break;
			}
			this.draw()
		},

		onClick: function(x, y) {
			var area = this.getArea(x, y, this._o.padding)
			
			if(this.currentArea.width == 0 && this.currentArea.height == 0) {
				this.deleteArea(this.currentArea);
				this.currentArea = undefined;
				this.status = AreaSelectStatus.CREATE;
			}

			if(area != undefined && this._o.deleteMethod == DeleteMethod.click) {
				this.deleteArea(area)
				this.draw()
			}

			if (typeof this._o.cbClick === 'function') {
                this._o.cbClick(this, area);
            }
		},

		onDoubleClick: function(x, y) {
			var area = this.getArea(x, y, this._o.padding)
			if(area != undefined && this._o.deleteMethod == DeleteMethod.DOUBLE_CLICK) {
				if(confirm('您確定要刪除此區域嗎？')) {
					this.deleteArea(area)
					this.draw()
				}
			}
		},

		draw: function() {
			var g2d = this.g2d
			g2d.clearRect(0, 0, this.canvas.width, this.canvas.height)

			g2d.strokeStyle = this._o.area.strokeStyle
			g2d.lineWidth 	= this._o.area.lineWidth

			for(var index in this.areas) {
				var area = this.areas[index]
				this.g2d.strokeRect(area.x, area.y, area.width, area.height)
			}

			var area = this.currentArea
			g2d.fillStyle = this._o.point.fillStyle

			if(area != undefined) {
				var positionPoints = getPositionPoints(area)

				for(var index in positionPoints) {
					var point = positionPoints[index]
					g2d.beginPath()
					g2d.arc(point.x, point.y, this._o.point.size, 0, Math.PI * 2, true)
					g2d.closePath()
					g2d.fill()
				}

				// 停止拖拽后执行回调
				if (!this.dragging && typeof this._o.cbDraw === 'function') {
	                this._o.cbDraw(this, area);
	            }
			}
		},

		deleteArea: function(area) {
			this.disabled = false
			var areas = this.areas,
				index = areas.indexOf(area)
			if(index >= 0) {
				areas.splice(areas.indexOf(area), 1)
				this.currentArea = undefined
				this.triggerChange()
				this.status = AreaSelectStatus.CREATE

				if (area.width != 0 && typeof this._o.cbDraw === 'function') {
	                this._o.cbDelete(this, area);
	            }
			}
		},

		triggerChange: function() {
			fireEvent(this.canvas, 'areaChange', {areas: this.areas})
			//this.canvas.trigger("areasChange", {areas: this.areas})
		}
	}

	return FteAreaSelect; 
}));