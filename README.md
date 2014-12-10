jquery.areaSelect.js
====================

areaSelect is a jQuery plugin that gives you the ability to Select multiple area from an image.

view demo: http://blog.gongshw.com/jquery.areaSelect.js/demo/demo.html

Init
====
```javascript
var options = {
	initAreas: [{"x": 280, "y": 93, "width": 50, "height": 50}], //the initial areas when the plugin load
	deleteMethod: 'click', //or 'doubleClick'
	area: {strokeStyle: 'red', lineWidth: 2}, //style to draw selected areas
	point: {size: 3, fillStyle: 'black'}, //style to draw point
};
$img.areaSelect(options);
```

Get Selected Areaa
=================
```javascript
var selectAreas = showPreview($img.areaSelect('get'));
//[{"x":280,"y":93,"width":50,"height":50}]
```

Event
=====
```javascript
$img.areaSelect('bindChangeEvent', function (event, data) {
	//invoke when select areas changed
	alert(data.areas);
});
```
