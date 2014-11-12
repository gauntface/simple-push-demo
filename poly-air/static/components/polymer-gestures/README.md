## pointer-gestures
> A set of rich gestures for desktop and mobile.

Supported events:
* down
* up
    * Same target as down, provides the element under the pointer with the relatedTarget property
* trackstart
* track
    * Same target as down
* trackend
    * Same target as down, provides the element under the pointer with the relatedTarget property
* tap
    * Targets the nearest common ancestor of down and up.relatedTarget
    * Can be prevented by calling any gesture event's preventTap function
* pinch

Not yet implemented:
* flick
* hold
* holdpulse
* release
* pinchstart
* pinchend

More info — https://groups.google.com/forum/#!topic/polymer-dev/ba4aDyOozm8

## How to use

The element, or a parent of the element, should have the `touch-action="none"` attribute.

```javascript
PolymerGestures.addEventListener(element, eventname, handler, capture);
```

## How to build

```bash
mkdir gestures
cd gestures
git clone git@github.com:Polymer/tools.git
git clone git@github.com:Polymer/polymer-gestures.git
cd polymer-gestures
npm install
grunt
```

## How to run
```bash
cd gestures
python -m SimpleHTTPServer
open http://localhost:8000/polymer-gestures/samples/simple/
```
More info — http://www.polymer-project.org/resources/tooling-strategy.html
