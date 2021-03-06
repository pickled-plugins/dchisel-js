/**
 * @fileOverview API for live editing and visualizing spline-based 3-dimensional objects
 * @author Peter Szerzo
 * @version 2
 */

// \\\\\\\**\\\\\\\\\\\\\\\\\\\\\\\\\***\\\
// !NAMESPACE + MAIN PARAMETERS
// ///////**/////////////////////////***///
/** @namespace */
var DCHISEL = {

    /** If fullScreenApp is true, the app fills the entire screen and overflows if the window is not wide-screen or too small. If false, the canvas strictly fills the container div and does not overflow. */
    isFullScreenApp: false,

    /** The stage objects handles different sections of the multi-page application including tutorial pages and design steps */
    stage: {
        /** Stage number. */
        no: 0,
        /** Change stage by an increment. Update time, and mode. */
        change: function(inc) {
            this.no += inc;
            this.no = Math.round(this.no * 10) / 10;
            DCHISEL.time0 = DCHISEL.time;
            if (typeof DCHISEL.nav.current() !== "undefined") {
                DCHISEL.mode = DCHISEL.nav.current().defaultMode;
            }
            DCHISEL.nav.mouseMove();

        },
        /** Change stage to a target value. Update time */
        set: function(target) {
            this.no = Math.round(target * 10) / 10;
            DCHISEL.time0 = DCHISEL.time;
            if (typeof DCHISEL.nav.current() !== "undefined") {
                DCHISEL.mode = DCHISEL.nav.current().defaultMode;
            }
            DCHISEL.nav.mouseMove();
        }
    },

    /** Active drawing or viewing mode. */
    mode: "mode3",


    /** Time at last stage change. */
    time0: new Date().getTime(),

    /** Current time. Most functions use value (time - time0). */
    time: 0,

    /** Refresh interval in [ms]. */
    interval: 10,

    /** Controls animations speeds and delays (anim.speed and anim.delay). Values in [ms]. */
    anim: {
        speed: 2000,
        delay: 500
    },

    /** Font - to be extended to include multiple fonts. */
    fonts: "Monaco",

    /** Color schemes and utility functions manipulating them. */
    colors: {

        schemes: {
            purple: [
                [61, 56, 79], // 0: background
                [247, 141, 52], // 1: title
                [203, 168, 114], // 2: subtitle
                [61, 103, 196], // 3: misc text
                [95, 52, 247], // 4: control handle endpoints
                [61, 103, 196], // 5: control handle midpoint
                [95, 90, 113], // 6: nav bounding boxes
                [255, 255, 255] // 7: curve strokes
            ],
            bw: [
                [255, 255, 255],
                [0, 0, 0],
                [30, 30, 30],
                [70, 70, 70],
                [50, 50, 50],
                [20, 20, 20],
                [200, 200, 200],
                [100, 100, 100]
            ]
        },

        activeScheme: "purple",

        get: function(index, opacity) {
            return "rgba(" + this.schemes[this.activeScheme][index][0] + "," + this.schemes[this.activeScheme][index][1] + "," + this.schemes[this.activeScheme][index][2] + "," + (opacity) + ")";
        },

        getBetween: function(index1, index2, tParam, opacity) {
            var color = [
                this.schemes[this.activeScheme][index1][0] * tParam + this.schemes[this.activeScheme][index1][0] * (1 - tParam),
                this.schemes[this.activeScheme][index1][1] * tParam + this.schemes[this.activeScheme][index1][1] * (1 - tParam),
                this.schemes[this.activeScheme][index1][2] * tParam + this.schemes[this.activeScheme][index1][2] * (1 - tParam)
            ];
            return "rgba(" + Math.round(color[0]) + "," + Math.round(color[1]) + "," + Math.round(color[2]) + "," + opacity + ")";
        }
    },

    /** Application canvas. It is generated automatically, such that no predefined canvas is necessary. */
    canvas: undefined,

    /** Canvas drawing context. */
    ctx: undefined,

    /** Holds current mouse coordinates (.x, .y), coordinates at when dragging started (.xDrag, .yDrag) and whether mouse is currently being dragged (isDragging). */
    mouse: {
        x: 0,
        y: 0,
        z: 0,
        xDrag: 0,
        yDrag: 0,
        isDragging: false
    },

    /** Display widths, relative to minWH. */
    wDisplay: {
        path: 1 / 200,
        navButton: 0.03,
        text: 1 / 80
    },

    /** Product dimensions in the real world. */
    rDim: {
        /** length [mm] */
        l: 150,
        /** width [mm] */
        w: 0,
        /** depth [mm] */
        d: 3,
        /** how much depth profiles are scaled up for visibility */
        depthScale: 10
    },

    /** Meshing and subdivision parameters for 3d rendering. */
    mesh: {
        n1: 100,
        n2: 30,
        /** Number of control points in depth profile objects. */
        nP: 3
    },

    /** Holds all design object information. */
    masterPiece: {},

    /** Canvas width. */
    W: 0,
    /** Canvas height. */
    H: 0,
    /** Canvas min width/height. */
    minWH: 0
};

// \\\\\\\**\\\\\\\\\\\\\\\\\\\\\\\\\***\\\
// !SET UP AND LAUNCH APP
// ///////**/////////////////////////***///
/** Translate mouse click events into touch events. */
DCHISEL.touchHandler = function(event) {

    var touch = event.changedTouches[0],
        simulatedEvent = document.createEvent("MouseEvent");

    simulatedEvent.initMouseEvent({
        touchstart: "mousedown",
        touchmove: "mousemove",
        touchend: "mouseup"
    }[event.type], true, true, window, 1, touch.screenX, touch.screenY, touch.clientX, touch.clientY, false, false, false, false, 0, null);
    touch.target.dispatchEvent(simulatedEvent);
    event.preventDefault();
};

/** Initialize application, create and append application canvas, apply touch handler and resize.
 * @param {string} containerID - ID of container DOM element.
 */
DCHISEL.init = function(containerID, fullScreen, activeColorScheme) {
    this.isFullScreenApp = fullScreen || false;
    // set body background
    this.containerID = containerID || "wrapper";
    this.container = $("#" + this.containerID);
    this.colors.activeScheme = activeColorScheme;
    // set background color equal to DCHISEL background color
    if (this.isFullScreenApp) {
        document.body.setAttribute("style", "background-color:" + DCHISEL.colors.get(0, 1));
    }
    // couple
    document.addEventListener("touchstart", DCHISEL.touchHandler, true);
    document.addEventListener("touchmove", DCHISEL.touchHandler, true);
    document.addEventListener("touchend", DCHISEL.touchHandler, true);
    document.addEventListener("touchcancel", DCHISEL.touchHandler, true);
    // create canvas and context
    this.canvas = document.createElement("canvas");
    this.container.append(this.canvas);
    this.ctx = this.canvas.getContext("2d");
    this.ctx.lineCap = "round";
    $(this.canvas).css("border-radius", "inherit").css("margin", "auto");
    // add mouse event listeners
    DCHISEL.canvas.addEventListener('mousedown', DCHISEL.mouseDown);
    DCHISEL.canvas.addEventListener('mousemove', DCHISEL.mouseMove);
    DCHISEL.canvas.addEventListener('mouseup', DCHISEL.mouseUp);

    // handle resize
    window.addEventListener('resize', DCHISEL.resize, false);
    this.resize(this.isFullScreenApp);
};

/** Launch application.
 */
DCHISEL.launch = function() {
    setInterval(DCHISEL.draw, DCHISEL.interval);
};

/** Recalculate canvas dimensions upon browser resize. */
DCHISEL.resize = function() {
    /** Read current canvas dimensions. */
    DCHISEL.W = DCHISEL.container.width();
    DCHISEL.H = DCHISEL.container.height();
    DCHISEL.minWH = Math.min(DCHISEL.W, DCHISEL.H);
    DCHISEL.canvas.width = DCHISEL.W;
    DCHISEL.canvas.height = DCHISEL.H;
};

/** Clear canvas. */
DCHISEL.prepDraw = function() {
    DCHISEL.ctx.fillStyle = DCHISEL.colors.get(0, 1);
    DCHISEL.pen.solidRect(0, 0, DCHISEL.W, DCHISEL.H);
    DCHISEL.ctx.textAlign = "center";
    DCHISEL.ctx.textBaseline = "middle";
    DCHISEL.time = new Date().getTime();
};

/**
 * Get mouse coordinates
 * @param {event} event
 */
DCHISEL.updateMouse = function(e, mouseState) {

    var rect = DCHISEL.canvas.getBoundingClientRect();

    DCHISEL.mouse.x = e.clientX - rect.left;
    DCHISEL.mouse.y = e.clientY - rect.top;
    if (mouseState === "down") {
        DCHISEL.mouse.isDragging = true;
        DCHISEL.mouse.xDrag = DCHISEL.mouse.x;
        DCHISEL.mouse.yDrag = DCHISEL.mouse.y;
    } else if (mouseState === "up") {
        DCHISEL.mouse.isDragging = false;
    }
};

/**
 * Maps normalized coordinates to canvas
 * @param {float} x coordinate
 * @param {float} y coordinate
 * @return {DCHISEL.Vector} mapped point
 */
DCHISEL.map = function(x, y) { // map relative x and y coordinates to canvas
    return new DCHISEL.Vector(x * DCHISEL.W, y * DCHISEL.H, 0);
};

/**
 * Distance between two points - by coordinates.
 * @param {float} x1, y1, z1 - Coordinates of first point.
 * @param {float} x2, y2, z2 - Coordinates of second point.
 * @returns {float}
 */
DCHISEL.getDistancePP = function(x1, y1, z1, x2, y2, z2) {

    var d = Math.pow(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2), 0.5);

    return d;

};

/**
 * Distance between two points - input as vectors.
 * @param {float} v1 - First point.
 * @param {float} v2 - Second point.
 * @returns {float}
 */
DCHISEL.getDistanceVV = function(v1, v2) { //

    var d = Math.pow(Math.pow(v1.x - v2.x, 2) + Math.pow(v1.y - v2.y, 2) + Math.pow(v1.z - v2.z, 2), 0.5);

    return d;

};

/**
 * General drawing methods.
 */
DCHISEL.pen = {

    /**
     * Draw solid rectangle
     */
    solidRect: function(x, y, w, h) {
        DCHISEL.ctx.beginPath();
        DCHISEL.ctx.rect(x, y, w, h);
        DCHISEL.ctx.closePath();
        DCHISEL.ctx.fill();
    },

    /**
     * Place text on canvas
     */
    write: function(s, x, y, fontSizeRelative, colorCodingIndex, opacity) {

        DCHISEL.ctx.fillStyle = DCHISEL.colors.get(colorCodingIndex, opacity);
        DCHISEL.ctx.font = "" + DCHISEL.W * DCHISEL.wDisplay.text * fontSizeRelative + "px " + DCHISEL.fonts;
        DCHISEL.ctx.fillText(s, DCHISEL.W * x, DCHISEL.H * y);

    },

    start: function() {

        DCHISEL.ctx.beginPath();

    },

    end: function() {

        DCHISEL.ctx.stroke();

    },

    moveTo: function(v) {

        DCHISEL.ctx.moveTo(v.x, v.y);

    },

    lineTo: function(v) {

        DCHISEL.ctx.lineTo(v.x, v.y);

    },

    line: function(v1, v2) {

        this.start();
        this.moveTo(v1);
        this.lineTo(v2);
        this.end();

    },

    splineTo: function(v1, v2, v3) {

        DCHISEL.ctx.bezierCurveTo(v1.x, v1.y, v2.x, v2.y, v3.x, v3.y);

    },

    /**
     * Draw solid circle
     * @param {DCHISEL.Vector} v - Center.
     * @param {float} r - Radius.
     * @param {string} s - Optional relative modifier. If it has the value "r", the radius is relative to minWH * wDisplay.path.
     */
    solidCircle: function(v, r, s) {

        r = (s === "r") ? (r * DCHISEL.wDisplay.path * DCHISEL.minWH) : (r);
        DCHISEL.ctx.beginPath();
        DCHISEL.ctx.arc(v.x, v.y, r, 0, Math.PI * 2, true);
        DCHISEL.ctx.fill();

    },

    /**
     * Set stroke are relative to minWH * wDisplay.path
     * @param {float} r - Relative stroke weight.
     */
    stroke: function(r) {
        DCHISEL.ctx.lineWidth = r * DCHISEL.wDisplay.path * DCHISEL.minWH;
    },

    /**
     * Set stroke and fill color (color.stroke() and color.fill()).
     * @param {integer} i - Color index.
     * @param {float} opacity
     */
    color: {

        stroke: function(i, opacity) {
            DCHISEL.ctx.strokeStyle = DCHISEL.colors.get(i, opacity || 1);
        },

        fill: function(i, opacity) {
            DCHISEL.ctx.fillStyle = DCHISEL.colors.get(i, opacity || 1);
        }

    },

    /**
     * Animate circle, transitioning between two radii and colors.
     * @param {float} x - x-coordinate of center.
     * @param {float} y - y-coordinate of circle center.
     * @param {float} r1 - Starting radius (relative to minWH).
     * @param {float} r2 - End radius (relative to minWH).
     * @param {integer} c1 - Start color - index.
     * @param {integer} c2 - End color - index.
     * @param {float} t1 - Start time [ms].
     * @param {float} t2 - Start time [ms].
     */
    animateCircle: function(x, y, r1, r2, color1, color2, t1, t2) {

        var r, color, colorCode, c1;

        if ((DCHISEL.time - DCHISEL.time0) >= t1 && (DCHISEL.time - DCHISEL.time0) <= t2) {
            c1 = (t2 - DCHISEL.time + DCHISEL.time0) / (t2 - t1); // goes from 1 to 0
            r = r1 * c1 + r2 * (1 - c1);
            DCHISEL.ctx.strokeStyle = DCHISEL.colors.getBetween(color1, color2, c1, c1);
            DCHISEL.ctx.lineWidth = DCHISEL.minWH / 200;
            DCHISEL.ctx.beginPath();
            DCHISEL.ctx.arc(DCHISEL.map(x, y).x, DCHISEL.map(x, y).y, r * DCHISEL.minWH, 0, 2 * Math.PI);
            DCHISEL.ctx.stroke();
        }

    },

    /**
     * Draw rounded rectangle
     * @param {float} x - x-coordinate of center.
     * @param {float} y - y-coordinate of circle center.
     * @param {float} w - Starting radius (relative to minWH).
     * @param {float} h - End radius (relative to minWH).
     * @param {float} r - Stroke weight.
     */
    boundingBox: function(x, y, w, h, r) {

        DCHISEL.ctx.beginPath();
        DCHISEL.ctx.moveTo(x + r, y);
        DCHISEL.ctx.lineTo(x + w - r, y);
        DCHISEL.ctx.closePath();
        DCHISEL.ctx.stroke();

        DCHISEL.ctx.beginPath();
        DCHISEL.ctx.lineTo(x + w, y + r);
        DCHISEL.ctx.lineTo(x + w, y + h - r);
        DCHISEL.ctx.closePath();
        DCHISEL.ctx.stroke();

        DCHISEL.ctx.beginPath();
        DCHISEL.ctx.lineTo(x + w - r, y + h);
        DCHISEL.ctx.lineTo(x + r, y + h);
        DCHISEL.ctx.closePath();
        DCHISEL.ctx.stroke();

        DCHISEL.ctx.beginPath();
        DCHISEL.ctx.lineTo(x, y + h - r);
        DCHISEL.ctx.lineTo(x, y + r);
        DCHISEL.ctx.closePath();
        DCHISEL.ctx.stroke();

        DCHISEL.ctx.beginPath();
        DCHISEL.ctx.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
        DCHISEL.ctx.stroke();

        DCHISEL.ctx.beginPath();
        DCHISEL.ctx.arc(x + w - r, y + r, r, Math.PI * 1.5, Math.PI * 2);
        DCHISEL.ctx.stroke();

        DCHISEL.ctx.beginPath();
        DCHISEL.ctx.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI * 1);
        DCHISEL.ctx.stroke();

        DCHISEL.ctx.beginPath();
        DCHISEL.ctx.arc(x + w - r, y + h - r, r, Math.PI * 2, Math.PI * 2.5);
        DCHISEL.ctx.stroke();

    }
};

/** Angle of line between two points.
 * @param {float} x1 - x-coordinate of first point.
 * @param {float} y1 - y-coordinate of first point.
 * @param {float} x2 - x-coordinate of second point.
 * @param {float} y2 - y-coordinate of second point.
 * @returns {float} angle - Angle between two lines [radians].
 */
DCHISEL.getAngle = function(x1, y1, x2, y2) {

    var angle;

    if (Math.abs(x1 - x2) < 1e-5 && y2 > y1) return Math.PI / 2;
    if (Math.abs(x1 - x2) < 1e-5 && y2 < y1) return 3 * Math.PI / 2;
    angle = Math.atan((y2 - y1) / (x2 - x1));
    if (x1 < x2) {
        if (angle < 0) return angle + 2 * Math.PI;
        return angle;
    }

    return angle + Math.PI;

};

/** Returns value of sinusoid over time sin( (t - t0) / period * 2pi + startPhase )
 * @param {float} period - Period of oscillation
 * @param {float} startPhase - Phase of oscillation
 * @param {float} startTime - Start time of oscillation.
 * @param {float} endTime - End time of oscillation.
 * @returns {float} oscillation displacement
 */
DCHISEL.sineAnimate = function(period, startPhase, startTime, endTime) {

    if ((DCHISEL.time - DCHISEL.time0) < startTime) {
        return Math.sin((0) / period * 2 * Math.PI + startPhase);
    } else if ((DCHISEL.time - DCHISEL.time0) > endTime) {
        return Math.sin((endTime - startTime) / period * 2 * Math.PI + startPhase);
    }
    return Math.sin(((DCHISEL.time - DCHISEL.time0) - startTime) / period * 2 * Math.PI + startPhase);

};

/** Interpolates within array vectorArray[xi, yi],
 * @param {array} vectorArray - Array of points.
 * @param {float} xTarget - Target X.
 * @returns {float} yTarget - Target Y value corresponding to targetX.
 */
DCHISEL.interpolateX = function(vectorArray, xTarget) { // interpolate by X, return Y

    var x1, x2, x, y1, y2, y;

    if (xTarget <= vectorArray[0].x) {
        return vectorArray[0].y;
    } else if (xTarget >= vectorArray[vectorArray.length - 1].x) {
        return vectorArray[vectorArray.length - 1].y;
    } else {
        j = -1;
        for (i = 0; i < vectorArray.length - 1; i++) {
            if ((vectorArray[i].x < xTarget) && (vectorArray[i + 1].x > xTarget)) j = i;
            if ((vectorArray[i].x > xTarget) && (vectorArray[i + 1].x < xTarget)) j = i;
        }
        if (j !== -1) {

            x = xTarget;

            x1 = vectorArray[j].x;
            x2 = vectorArray[j + 1].x;
            y1 = vectorArray[j].y;
            y2 = vectorArray[j + 1].y;

            y = y1 + (y2 - y1) * (x - x1) / (x2 - x1);

            return y;

        }

        return 0;

    }

};





// \\\\\\\**\\\\\\\\\\\\\\\\\\\\\\\\\***\\\
// !VECTOR
// ///////**/////////////////////////***///
/**
 * Vector object
 * @constructor
 * @param {float} x - x coordinate.
 * @param {float} y - y coordinate.
 * @param {float} z - z coordinate.
 */
DCHISEL.Vector = function(x, y, z) {

    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;

};
/**
 * Vector prototype
 */
DCHISEL.Vector.prototype = {

    /** Normalize vector to length 1. */
    normalize: function() {
        var d = Math.pow((Math.pow(this.x, 2) + Math.pow(this.y, 2) + Math.pow(this.z, 2)), 0.5);
        this.x = this.x / d;
        this.y = this.y / d;
        this.z = this.z / d;
    },

    /**
     * Scale vector by a scalar. Return new vector.
     * @param {float} k - Scale factor.
     * @returns {DCHISEL.Vector} v - Scaled vector.
     */
    scale: function(k) {

        var v = new DCHISEL.Vector(this.x * k, this.y * k, this.z * k);

        return v;

    },

    /**
     * Dot product
     * @param {DCHISEL.Vector} v - Vector to multiply with.
     * @returns {float} dotP - Value of dot product.
     */
    dotProduct: function(v) {

        var dotP = this.x * v.x + this.y * v.y + this.z * v.z;

        return dotP;

    },

    /**
     * Cross product
     * @param {DCHISEL.Vector} v vector to multiply with
     * @returns {DCHISEL.Vector} crossProduct
     */
    crossProduct: function(v) {

        var crossP = new DCHISEL.Vector(
            this.y * v.z - this.z * v.y, -this.x * v.z + this.z * v.x,
            this.x * v.y - this.y * v.x
        );

        return crossP;

    },

    /**
     * Add vectors. Leave vector unmodified.
     * @param {DCHISEL.Vector} v - Vector to add.
     * @returns {DCHISEL.Vector} sum
     */
    add: function(v) {

        return new DCHISEL.Vector(this.x + v.x, this.y + v.y, this.z + v.z);

    },

    /**
     * Subtract vectors. Leave vector unmodified.
     * @param {DCHISEL.Vector} v vector to multiply with
     * @returns {DCHISEL.Vector} result
     */
    subtract: function(v) {

        return new DCHISEL.Vector(this.x - v.x, this.y - v.y, this.z - v.z);

    },

    /**
     * Copy vectors
     * @param {DCHISEL.Vector} v - Vector to copy
     * @returns {DCHISEL.Vector} new Vector instance, identical to v
     */
    copy: function(v) {

        if (typeof v !== "undefined") {
            return new DCHISEL.Vector(this.x + (v.x || 0), this.y + (v.y || 0), this.z + (v.z || 0));
        }

        return new DCHISEL.Vector(this.x, this.y, this.z);

    }
};




// \\\\\\\**\\\\\\\\\\\\\\\\\\\\\\\\\***\\\
// !CAMERA
// ///////**/////////////////////////***///
/**
 * Camera object
 * @constructor
 * @param {float} r - Distance from origin.
 * @param {float} theta - Planar angle (spherical coordinates).
 * @param {float} phi - Vertical angle (spherical coordinates).
 */
DCHISEL.Camera = function(r, theta, phi, f) {

    /** Distance from origin. */
    this.r = r;

    /** Planar angle (spherical coordinates). */
    this.theta = theta;

    /** Vertical angle (spherical coordinates). */
    this.phi = phi;

    /** Distance from origin - temporary. */
    this.rT = r;

    /** Planar angle (spherical coordinates) - temporary. */
    this.thetaT = theta;

    /** Vertical angle (spherical coordinates) - temporary. */
    this.phiT = phi;

    /** Focal length. */
    this.f = f; // focal length

    /** Camera local axis 1 - Along view direction. */
    this.v1 = new DCHISEL.Vector(1, 0, 0);

    /** Camera local axis 2 - Prependicular to view direction, in the horizontal plane. */
    this.v2 = new DCHISEL.Vector(1, 0, 0);

    /** Camera local axis 3 - Prependicular to view direction, in the vertical plane. */
    this.v3 = new DCHISEL.Vector(1, 0, 0);

};

/**
 * Camera prototype
 */
DCHISEL.Camera.prototype = {

    /** Calculate position and orientation of the camera. */
    buildEye: function() {

        this.eye = new DCHISEL.Vector(
            this.rT * Math.cos(this.thetaT) * Math.cos(this.phiT),
            this.rT * Math.sin(this.thetaT) * Math.cos(this.phiT),
            this.rT * Math.sin(this.phiT)
        );
        this.v1 = this.eye.scale(-1);
        this.v2 = this.v1.crossProduct(new DCHISEL.Vector(0, 0, 1));
        this.v3 = this.v2.crossProduct(this.v1);
        this.v1.normalize();
        this.v2.normalize();
        this.v3.normalize();

    },

    /** Update camera upon dragging. */
    update: function() {

        this.r = this.rT;
        this.theta = this.thetaT;
        this.phi = this.phiT;
        this.buildEye();

    },

    /** 2d projection of a given point.
     * @param {DCHISEL.Vector} p - Point to project.
     * @returns {DCHISEL.Vector} Projected point.
     */
    project: function(p) {

        var xProject, yProject, zProject,
            xLens, yLens;

        // Calculate position in the local axis of the camera.
        xProject = this.eye.subtract(p).dotProduct(this.v2);
        yProject = this.eye.subtract(p).dotProduct(this.v3);
        zProject = this.eye.subtract(p).dotProduct(this.v1);

        // Calculate image positions in lens.
        xLens = xProject * this.f / zProject;
        yLens = yProject * this.f / zProject;

        return new DCHISEL.Vector(xLens, yLens, 0);

    },

    /** Callback function of corresponding event listener. Update camera angle upon dragging. */
    mouseMove: function() {

        if (DCHISEL.mouse.isDragging) {
            this.thetaT = this.theta - (DCHISEL.mouse.x - DCHISEL.mouse.xDrag) / DCHISEL.minWH * 2;
            this.phiT = this.phi - (DCHISEL.mouse.y - DCHISEL.mouse.yDrag) / DCHISEL.minWH * 2;
            if (this.phiT < -80 * Math.PI / 180) this.phiT = -80 * Math.PI / 180;
            if (this.phiT > 80 * Math.PI / 180) this.phiT = 80 * Math.PI / 180;
            this.buildEye();
        }

    }
};




// \\\\\\\**\\\\\\\\\\\\\\\\\\\\\\\\\***\\\
// !MENUBUTTON
// ///////**/////////////////////////***///

/**
 * MenuButton object
 * @constructor
 * @param {float} x - x-coordinate of button center.
 * @param {float} y - y-coordinate of button center.
 * @param {string} name - Button name.
 * @param {boolean} animate - If true, short animation is displayed to signal to the user that the button is new in the environment (new tutorial stage).
 */
DCHISEL.MenuButton = function(x, y, name, animate) {

    /** Button name. */
    this.name = name;

    /** True if the button is active or hovered on. */
    this.isActive = false;

    /** Display opacity (0.4 if inactive, 1.0 if active or hovered). */
    this.opacity = 0.4; // display opacity

    /** x-coordinate of button center. */
    this.x = x;

    /** y-coordinate of center. */
    this.y = y;

    /** Display width, relative to minWH. */
    this.w = DCHISEL.wDisplay.navButton;

    /** Display height, relative to minWH. */
    this.h = DCHISEL.wDisplay.navButton;

    /** If true, short animation is displayed to signal to the user that the button is new in the environment (new tutorial stage). */
    this.animate = animate || false;

};

/**
 * MenuButton prototype
 */
DCHISEL.MenuButton.prototype = {

    /**
     * Place MenuButton on canvas.
     */
    place: function() {

        // set appropriate opacity
        if (this.isActive) {
            this.opacity += (1 - this.opacity) * 0.03; // increase opacity in every timestep if smaller then 1
            DCHISEL.ctx.globalAlpha = this.opacity; //1;
        } else {
            this.opacity += (0.4 - this.opacity) * 0.03; // decrease opacity in every timestep if greater than 0.4
            DCHISEL.ctx.globalAlpha = this.opacity; //0.4;
        }

        // draw image
        DCHISEL.ctx.drawImage(DCHISEL.allButtons[this.name].image, DCHISEL.map(this.x, this.y).x - this.w * DCHISEL.W / 2, DCHISEL.map(this.x, this.y).y - this.h * DCHISEL.W / 2, this.w * DCHISEL.W, this.h * DCHISEL.W);

        // reset opacity to 1
        DCHISEL.ctx.globalAlpha = 1;

        // animate button if indicated
        if (this.animate) {
            DCHISEL.pen.animateCircle(this.x, this.y, 0.05, 0.12, 2, 0, DCHISEL.anim.delay, DCHISEL.anim.delay + 500);
        }
    }

};




// \\\\\\\**\\\\\\\\\\\\\\\\\\\\\\\\\***\\\
// !NAVIGATION
// ///////**/////////////////////////***///
/**
 * MenuButton object
 * @constructor
 * @param {Object} b - Input object with the following fields: buttons [array of MenuButton objects].
 */
DCHISEL.Navigation = function(b) {

    var i, button, max;

    this.buttons = [];
    for (i = 0, max = b.buttons.length; i < max; i++) {
        button = new DCHISEL.MenuButton(b.buttons[i].x, b.buttons[i].y, b.buttons[i].name, b.buttons[i].animate);
        this.buttons.push(button);
    }
    this.displayHelp = b.displayHelp;
    this.helpX = b.xHelp;
    this.helpY = b.yHelp;
    this.buttonGroups = [];
    this.defaultMode = b.defaultMode;

};
DCHISEL.Navigation.prototype = {

    /** Callback function of corresponding event listener. Apply callback function if button is clicked. */
    mouseDown: function() {

        if (this.hoverIndex !== -1 && (typeof this.hoverIndex !== "undefined")) {
            DCHISEL.allButtons[this.buttons[this.hoverIndex].name].onClick();
        }

    },

    /** Callback function of corresponding event listener. Check if button is hovered. */
    mouseMove: function() {

        var anyLuck = false, // turns true if any of the buttons is hovered
            i, max;

        for (i = 0, max = this.buttons.length; i < max; i += 1) {
            // check if the mouse is over the button
            if (((Math.abs(DCHISEL.mouse.x - (DCHISEL.map(this.buttons[i].x, this.buttons[i].y).x)) < this.buttons[i].w * DCHISEL.W / 2) && (Math.abs(DCHISEL.mouse.y - (DCHISEL.map(this.buttons[i].x, this.buttons[i].y).y)) < this.buttons[i].h * DCHISEL.W / 2))) {
                this.hoverIndex = i;
                this.buttons[i].isActive = true;
                anyLuck = true;
            } else {
                this.buttons[i].isActive = false;
            }

            if (this.buttons[i].name === DCHISEL.mode) {
                this.buttons[i].isActive = true;
            }
        }

        if (anyLuck === false) this.hoverIndex = -1;

    },

    /** Place navigation on canvas. */
    place: function() {

        var maxX, maxY, minX, minY,
            i, max;

        for (i = 0, max = this.buttons.length; i < max; i += 1) {
            this.buttons[i].place();
        }
        // display help text for button
        if (this.displayHelp && (this.hoverIndex !== -1) && (typeof this.hoverIndex !== "undefined")) {
            DCHISEL.pen.write(DCHISEL.allButtons[this.buttons[this.hoverIndex].name].helpText, this.helpX, this.helpY, 1, 2, (this.buttons[this.hoverIndex].opacity - 0.4) / 0.6);
        }
        // find extreme X and Y coordinates for the button group - draw bounding box around it
        for (i = 0, max = this.buttonGroups.length; i < max; i += 1) {
            maxX = -10;
            maxY = -10;
            minX = 10;
            minY = 10;
            for (var j = 0; j < this.buttonGroups[i].length; j++) {
                if (maxX < this.buttons[this.buttonGroups[i][j]].x) maxX = this.buttons[this.buttonGroups[i][j]].x;
                if (maxY < this.buttons[this.buttonGroups[i][j]].y) maxY = this.buttons[this.buttonGroups[i][j]].y;
                if (minX > this.buttons[this.buttonGroups[i][j]].x) minX = this.buttons[this.buttonGroups[i][j]].x;
                if (minY > this.buttons[this.buttonGroups[i][j]].y) minY = this.buttons[this.buttonGroups[i][j]].y;
            }
            if (maxX > -10) {
                DCHISEL.pen.stroke(0.7);
                DCHISEL.pen.color.stroke(6, 0.7);
                DCHISEL.pen.boundingBox(
                    DCHISEL.map(minX, minY).x - DCHISEL.wDisplay.navButton * DCHISEL.W / 2 * 1.3,
                    DCHISEL.map(minX, minY).y - DCHISEL.wDisplay.navButton * DCHISEL.W / 2 * 1.3,
                    DCHISEL.map(maxX - minX, maxY - minY).x + DCHISEL.wDisplay.navButton * DCHISEL.W * 1.3,
                    DCHISEL.map(maxX - minX, maxY - minY).y + DCHISEL.wDisplay.navButton * DCHISEL.W * 1.3, 0.025 * DCHISEL.minWH
                );
            }
        }

    }
};




// \\\\\\\**\\\\\\\\\\\\\\\\\\\\\\\\\***\\\
// !BEZIERHANDLE
// ///////**/////////////////////////***///
/**
 * BezierHandle object
 * @constructor
 */
DCHISEL.BezierHandle = function(v1, v2, v3) {

    // distance between nodes 1-2 and 3-2, permanent coordinates
    this.d1 = DCHISEL.getDistanceVV(v1, v2);
    this.d3 = DCHISEL.getDistanceVV(v3, v2);

    this.kink1 = (this.d1 < this.tol);
    this.kink3 = (this.d3 < this.tol);

    this.p1 = v1.copy();
    this.p2 = v2.copy();
    this.p3 = v3.copy();

    this.p1T = this.p1.copy();
    this.p2T = this.p2.copy();
    this.p3T = this.p3.copy();

    // subdivisions
    this.n = 5;

};

/**
 * BezierHandle Prototype
 */
DCHISEL.BezierHandle.prototype = {

    /** Update permanent coordinates */
    update: function() {
        // distance between nodes 1-2 and 3-2, permanent coordinates
        this.p1 = this.p1T.copy(); //new DCHISEL.Vector(this.p1T.x, this.p1T.y, this.p1T.z);
        this.p2 = this.p2T.copy();
        this.p3 = this.p3T.copy();
        this.d1 = DCHISEL.getDistanceVV(this.p1T, this.p2T);
        this.d3 = DCHISEL.getDistanceVV(this.p3T, this.p2T);
        this.kink1 = (this.d1 < this.tol);
        this.kink3 = (this.d3 < this.tol);
    },

    /** Set node 1 such that it is handleLength distance from node 2. Maintain direction */
    normalize1T: function(handleLength) {
        this.p1T.x = this.p2T.x + (this.p1T.x - this.p2T.x) * handleLength / DCHISEL.getDistanceVV(this.p1T, this.p2T);
        this.p1T.y = this.p2T.y + (this.p1T.y - this.p2T.y) * handleLength / DCHISEL.getDistanceVV(this.p1T, this.p2T);
    },

    /** Set node 3 such that it is handleLength distance from node 2. Maintain direction */
    normalize3T: function(handleLength) {
        this.p3T.x = this.p2T.x + (this.p3T.x - this.p2T.x) * handleLength / DCHISEL.getDistanceVV(this.p3T, this.p2T);
        this.p3T.y = this.p2T.y + (this.p3T.y - this.p2T.y) * handleLength / DCHISEL.getDistanceVV(this.p3T, this.p2T);
    },

    /** Make nodes 1, 2 and  3 colinear */
    smooth: function() {
        var n;
        if (this.p3T.x === this.p1T.x) n = 100;
        else n = (this.p3T.y - this.p1T.y) / (this.p3T.x - this.p1T.x);

        if (this.p3T.x > this.p2T.x) k = 1;
        else k = -1;

        this.p3T.x = this.p2T.x + k * 1;
        this.p3T.y = this.p2T.y + k * n;

        this.p1T.x = this.p2T.x - k * 1;
        this.p1T.y = this.p2T.y - k * n;

        this.normalize3T(this.d3);
        this.normalize1T(this.d1);
        this.update();
    }

};

/**
 * Converts svg bezier path information into a BezierObject.
 * @param {string} path - Path from svg file. Format: "M10,10c4,5...z".
 * @param {float} rotate - Addigtional rotation angle of shape [radians].
 * @returns {array} Array of BezierHandles
 */
DCHISEL.svgPathToBezierObject = function(path, rotate) {

    /* RULES FOR PROCESSING COORDINATES

	RULE #1
	Mx0,y0cx1,y1,x2,y2,x3,y3 <=>
		moveto(x0, y0)
		bezierCurveTo(x0 + x1, y0 + y1, x0 + x2, y0 + y2, x0 + x3, y0 + y3)

	RULE #2
	Mx0,y0cx1,y1,x2,y2,x3,y3sx4,y4,x5,y5 <=>
	  moveto(x0, y0)
	  bezierCurveTo(x0 + x1, y0 + y1, x0 + x2, y0 + y2, x0 + x3, y0 + y3)
	  bezierCurveTo(x*, y*, x0+x3+x4, y0+y3+y4, x0 + x3 + x5, y0 + y3 + y5)
	  x* = x0 + x2 + 2 * (x3 - x2)
	  y* = y0 + y2 + 2 * (y3 - y2)
	  ! when 's' is followed by two points only, it is assumed the the control previous node [x0+x3, y0+y3] has symmetric handles
	*/

    // PROCESS PATH - 1. chunk up string
    var pathProcess1 = [], // process phase 1 - chunk up string
        pathProcess2 = [], // process phase 2 - convert to global coordinates
        pathProcess3 = [], // process phase 3 - get rid of S's
        BN = [],
        c,
        x1, y1, x2, y2, x3, y3,
        s = "",
        i, i0;

    for (i = 0, max = path.length; i < max; i += 1) {
        c = path.charAt(i);
        if (c === "M" || c === "m" || c === "C" || c === "c" || c === "S" || c === "s") {
            if (s !== '') pathProcess1.push(parseFloat(s));
            pathProcess1.push(c);
            s = '';
        } else if (c === ",") {
            if (s !== '') pathProcess1.push(parseFloat(s));
            s = '';
        } else if (c === "-") {
            if (s !== '') pathProcess1.push(parseFloat(s));
            s = '-';
        } else {
            s = s + c;
        }
    }
    if (s !== '') pathProcess1.push(parseFloat(s));

    pathProcess2 = pathProcess1; // process DCHISEL.stage.no 2 - convert to absolute coordinates

    i0 = -1; // index of last modifier ('c', 'C', 's', 'S')
    for (i = 0, max = pathProcess1.length; i < max; i += 1) {
        if (pathProcess1[i] === "c" || pathProcess1[i] === "s") {
            i0 = i;
            pathProcess2[i] = pathProcess1[i].toUpperCase();
        } else if (pathProcess1[i] === "C" || pathProcess1[i] === "S") {
            i0 = -1;
            pathProcess2[i] = pathProcess1[i];
        } else if (i0 === -1) {
            pathProcess2[i] = pathProcess1[i];
        } else {
            if ((i - i0) % 2 === 0) // y coordinate
            {
                pathProcess2[i] = pathProcess1[i] + pathProcess1[i0 - 1];
            } else // x coordinate
            {
                pathProcess2[i] = pathProcess1[i] + pathProcess1[i0 - 2];
            }
        }
    }

    for (i = 0, max = pathProcess2.length; i < max; i += 1) {
        if (pathProcess2[i] === "S") {
            pathProcess3.push("C");
            pathProcess3.push(2 * pathProcess2[i - 2] - pathProcess2[i - 4]);
            pathProcess3.push(2 * pathProcess2[i - 1] - pathProcess2[i - 3]);
        } else {
            pathProcess3.push(pathProcess2[i]);
        }
    }

    // BUILD NODE ARRAY
    for (i = 3, max = pathProcess3.length; i < max; i += 1) {
        if (pathProcess3[i] === "C") {
            if (i > 3) {
                x1 = pathProcess3[i - 4];
                y1 = pathProcess3[i - 3];
                x2 = pathProcess3[i - 2];
                y2 = pathProcess3[i - 1];
                x3 = pathProcess3[i + 1];
                y3 = pathProcess3[i + 2];
            } else if (i === 3) {
                x1 = pathProcess3[i - 2];
                y1 = pathProcess3[i - 1];
                x2 = pathProcess3[i - 2];
                y2 = pathProcess3[i - 1];
                x3 = pathProcess3[i + 1];
                y3 = pathProcess3[i + 2];
            } else {
                continue;
            }
            BN.push(new DCHISEL.BezierHandle(
                new DCHISEL.Vector(x1 * Math.cos(rotate) + y1 * Math.sin(rotate), x1 * Math.sin(rotate) - y1 * Math.cos(rotate), 0),
                new DCHISEL.Vector(x2 * Math.cos(rotate) + y2 * Math.sin(rotate), x2 * Math.sin(rotate) - y2 * Math.cos(rotate), 0),
                new DCHISEL.Vector(x3 * Math.cos(rotate) + y3 * Math.sin(rotate), x3 * Math.sin(rotate) - y3 * Math.cos(rotate), 0)
            ));
        }
    }

    return BN;

};




// \\\\\\\**\\\\\\\\\\\\\\\\\\\\\\\\\***\\\
// !BEZIEROBJECT
// ///////**/////////////////////////***///
/**
 * BezierObject object
 * @constructor
 */
DCHISEL.BezierObject = function(controlPoints, theta, x0, y0, scale, isClosed, constrainedEnds) {

    this.tol = 2e-2;
    if (typeof(controlPoints) === 'string') this.control = DCHISEL.svgPathToBezierObject(controlPoints, theta);
    else this.control = controlPoints;
    this.theta = theta;

    this.hoverIndex = -1;
    this.hoverType = -1;
    this.p0 = new DCHISEL.Vector(x0 || 0, y0 || 0, 0); // origin on canvas (permanent)
    this.p0T = new DCHISEL.Vector(x0 || 0, y0 || 0, 0); // origin on canvas (temporary - panning)
    this.scale = scale || 1;
    this.map = function(v) {
        return new DCHISEL.Vector(
            0 * (window.innerWidth - DCHISEL.W) / 2 + this.p0T.x * DCHISEL.W + v.x * DCHISEL.minWH * this.scale,
            this.p0T.y * DCHISEL.H + v.y * DCHISEL.minWH * this.scale,
            0
        );
    };
    this.isClosed = isClosed || false;
    this.constrainedEnds = constrainedEnds || false;
    this.allow = {
        draw: true,
        edit: true,
        pan: true
    };

};

DCHISEL.BezierObject.prototype = {

    /** Normalize coordinates such that object unit rectangle centered at origin ([-0.5, -0.5] - [0.5, 0.5]). Maintain proportions. Note: normalization is by control points. */
    normalize: function() {

        var maxX = -5000,
            maxY = -5000,
            minX = +5000,
            minY = +5000, // max/min coordinates for normalization
            max;

        for (i = 0, max = this.control.length; i < max; i += 1) {
            if (Math.max(this.control[i].p1T.x, this.control[i].p2T.x, this.control[i].p3T.x) > maxX) maxX = Math.max(this.control[i].p1T.x, this.control[i].p2T.x, this.control[i].p3T.x);
            if (Math.min(this.control[i].p1T.x, this.control[i].p2T.x, this.control[i].p3T.x) < minX) minX = Math.min(this.control[i].p1T.x, this.control[i].p2T.x, this.control[i].p3T.x);
            if (Math.max(this.control[i].p1T.y, this.control[i].p2T.y, this.control[i].p3T.y) > maxY) maxY = Math.max(this.control[i].p1T.y, this.control[i].p2T.y, this.control[i].p3T.y);
            if (Math.min(this.control[i].p1T.y, this.control[i].p2T.y, this.control[i].p3T.y) < minY) minY = Math.min(this.control[i].p1T.y, this.control[i].p2T.y, this.control[i].p3T.y);
        }

        for (i = 0, max = this.control.length; i < max; i += 1) {
            this.control[i].p1T.x = (this.control[i].p1T.x - ((maxX + minX) / 2)) / (maxX - minX);
            this.control[i].p2T.x = (this.control[i].p2T.x - ((maxX + minX) / 2)) / (maxX - minX);
            this.control[i].p3T.x = (this.control[i].p3T.x - ((maxX + minX) / 2)) / (maxX - minX);

            this.control[i].p1T.y = (this.control[i].p1T.y - ((maxY + minY) / 2)) / (maxX - minX);
            this.control[i].p2T.y = (this.control[i].p2T.y - ((maxY + minY) / 2)) / (maxX - minX);
            this.control[i].p3T.y = (this.control[i].p3T.y - ((maxY + minY) / 2)) / (maxX - minX);

            this.control[i].update();
        }

    },

    /** Sets the number of divisions for individual Bezier curve segments (between two BezierHandle objects), proportionally to segment length. */
    setSubdivisions: function(nMax) {

        var maxLength = 0,
            max, currentLength, lengths = [],
            i;

        for (i = 0, max = this.control.length; i < max; i += 1) {
            currentLength = this.getSegmentLength(i);
            lengths.push(currentLength);
            if (currentLength > maxLength) maxLength = currentLength;
        }
        for (i = 0, max = this.control.length; i < max; i += 1) {
            this.control[i].n = Math.floor(lengths[i] / maxLength * nMax);
        }

    },

    /**
     * Calculates segment length
     * @param {integer} segmentIndex - Index of segment.
     * @param {integer} n - Subdivisions per segment.
     * @returns {float} Segment length.
     */
    getSegmentLength: function(segmentIndex, n) {

        var length = 0,
            nDiv = n || 10,
            i;

        for (i = 0; i < nDiv; i += 1) {
            p1 = this.getPoint(segmentIndex, i / (nDiv));
            p2 = this.getPoint(segmentIndex, (i + 1) / (nDiv));
            length += DCHISEL.getDistanceVV(p1, p2);
        }

        return length;

    },

    /**
     * Gets point on a segment.
     * @param {integer} n subdivisions per cubic Bezier segment
     * @param {float} t curve parameter (0 at start, 1 at end)
     * @returns {DCHISEL.Vector} Subdivision points.
     */
    getPoint: function(segmentIndex, t) {

        var p1, p2, p3, p4;

        p1 = this.control[segmentIndex].p2T.copy();
        p2 = this.control[segmentIndex].p3T.copy();
        if (segmentIndex === this.control.length - 1) {
            p3 = this.control[0].p1T.copy();
            p4 = this.control[0].p2T.copy();
        } else {
            p3 = this.control[segmentIndex + 1].p1T.copy();
            p4 = this.control[segmentIndex + 1].p2T.copy();
        }

        return new DCHISEL.Vector(
            p1.x * (1 - t) * (1 - t) * (1 - t) +
            p2.x * 3 * (1 - t) * (1 - t) * t +
            p3.x * 3 * (1 - t) * t * t +
            p4.x * t * t * t,
            p1.y * (1 - t) * (1 - t) * (1 - t) +
            p2.y * 3 * (1 - t) * (1 - t) * t +
            p3.y * 3 * (1 - t) * t * t +
            p4.y * t * t * t,
            p1.z * (1 - t) * (1 - t) * (1 - t) +
            p2.z * 3 * (1 - t) * (1 - t) * t +
            p3.z * 3 * (1 - t) * t * t +
            p4.z * t * t * t
        );

    },

    /** Divides a BezierObject.
     * @param {integer} n - Optional: number of subdivisions. If ommitted, the subdivisions stored in the BezierObject instance are used.
     * @returns {array} Subdivision points.
     */
    divide: function(n) {

        var resultVectors = [],
            max, maxDiv;

        max = (this.isClosed) ? (this.control.length) : (this.control.length - 1);
        for (i = 0; i < max; i += 1) {
            maxDiv = n || this.control[i].n;
            for (j = 0; j < maxDiv; j++) {
                resultVectors.push(this.getPoint(i, j / (maxDiv - 1)));
            }
        }

        return resultVectors;

    },

    /**
     * Continuous draw using true Bezier curves.
     * @param {float} relLineWidth - Bezier curve display width, relative to default display width.
     * @param {float} relControlPointWidth - Control point display radius, relative to default display width.
     * @param {float} relControlHandleWidth - Control handle line display width, relative to default display width.
     */
    draw: function(relLineWidth, relControlPointWidth, relControlHandleWidth) {

        var i, max;

        DCHISEL.pen.color.stroke(7, 1);
        DCHISEL.pen.start();
        DCHISEL.pen.moveTo(this.map(this.control[0].p2T));
        for (i = 1, max = this.control.length; i < max; i++) {
            DCHISEL.pen.splineTo(this.map(this.control[i - 1].p3T), this.map(this.control[i].p1T), this.map(this.control[i].p2T));
        }
        if (this.isClosed) {
            DCHISEL.pen.splineTo(this.map(this.control[this.control.length - 1].p3T), this.map(this.control[0].p1T), this.map(this.control[0].p2T));
        }
        DCHISEL.pen.stroke(relLineWidth);
        DCHISEL.pen.end();
        if (relControlPointWidth !== 0) {
            for (i = 0, max = this.control.length; i < max; i++) {
                DCHISEL.pen.color.fill(4, 1);
                DCHISEL.pen.stroke(relControlHandleWidth);
                if (i > 0 || this.isClosed) {
                    DCHISEL.pen.line(this.map(this.control[i].p2T), this.map(this.control[i].p1T));
                    DCHISEL.pen.solidCircle(this.map(this.control[i].p1T), relControlPointWidth, "r");
                    if (this.hoverIndex === i && this.hoverType === 1) {
                        DCHISEL.pen.solidCircle(
                            this.map(this.control[i].p1T), 2 * relControlPointWidth, "r");
                    }
                }
                if (i < this.control.length - 1 || this.isClosed) {
                    DCHISEL.pen.line(this.map(this.control[i].p2T), this.map(this.control[i].p3T));
                    DCHISEL.pen.solidCircle(this.map(this.control[i].p3T), relControlPointWidth, "r");
                    if (this.hoverIndex === i && this.hoverType === 3) {
                        DCHISEL.pen.solidCircle(this.map(this.control[i].p3T), 2 * relControlPointWidth, "r");
                    }
                }
                DCHISEL.pen.color.fill(5, 1);
                DCHISEL.pen.solidCircle(this.map(this.control[i].p2T), relControlPointWidth, "r");
                if (this.hoverIndex === i && this.hoverType === 2) DCHISEL.pen.solidCircle(this.map(this.control[i].p2T), 2 * relControlPointWidth, "r");
            }
        }

    },

    /**
     * Three-dimensional rendering of the BezierObject, using depth profiles.
     * @param {DCHISEL.Camera} camera - View camera.
     * @param {float} relLineWidth - Bezier curve display width, relative to default display width.
     * @param {float} relControlPointWidth - Control point display radius, relative to default display width.
     * @param {float} relControlHandleWidth - Control handle line display width, relative to default display width.
     */
    draw3: function(camera, relLineWidth, relControlPointWidth, relControlHandleWidth) {

        var i, max,
            pointsTop = this.divide(),
            pointsBottom = this.divide();

        for (i = 0, max = pointsTop.length; i < max; i += 1) {
            pointsTop[i].z = DCHISEL.interpolateX(DCHISEL.masterPiece.side[0].divide(DCHISEL.mesh.n2), pointsTop[i].x) / DCHISEL.rDim.depthScale;
            pointsTop[i] = camera.project(pointsTop[i]);
        }
        DCHISEL.pen.color.stroke(7, 1);
        DCHISEL.pen.start();
        DCHISEL.pen.moveTo(this.map(pointsTop[0]));
        for (i = 1, max = pointsTop.length; i < max; i += 1) {
            DCHISEL.pen.lineTo(this.map(pointsTop[i]));
        }
        DCHISEL.pen.stroke(relLineWidth);
        DCHISEL.pen.end();

        for (i = 0, max = pointsBottom.length; i < max; i += 1) {
            pointsBottom[i].z = DCHISEL.interpolateX(DCHISEL.masterPiece.side[1].divide(DCHISEL.mesh.n2), pointsBottom[i].x) / DCHISEL.rDim.depthScale;
            pointsBottom[i] = camera.project(pointsBottom[i]);
        }
        DCHISEL.pen.color.stroke(7, 1);
        DCHISEL.pen.start();
        DCHISEL.pen.moveTo(this.map(pointsBottom[0]));
        for (i = 1, max = pointsBottom.length; i < max; i += 1) {
            DCHISEL.pen.lineTo(this.map(pointsBottom[i]));
        }
        DCHISEL.pen.stroke(relLineWidth / 2);
        DCHISEL.pen.end();

        for (i = 0, max = pointsBottom.length; i < max; i += 5) {
            DCHISEL.pen.start();
            DCHISEL.pen.moveTo(this.map(pointsTop[i]));
            DCHISEL.pen.lineTo(this.map(pointsBottom[i]));
            DCHISEL.pen.stroke(relLineWidth / 4);
            DCHISEL.pen.end();
        }

    },

    /**
     * Copies BezierObject (fully decoupled deep extension), displacing it by a vector.
     * @param {DCHISEL.Vector} v - Displacement vector.
     * @returns {DCHISEL.BezierObject} duplicate - Displaced and copied object.
     */
    copy: function(v) {

        var i,
            dx = v.x,
            dy = v.y,
            dz = v.z,
            duplicate = new DCHISEL.BezierObject([], this.theta, this.p0.x, this.p0.y, this.scale, this.isClosed, this.constrainedEnds);

        for (i = 0, max = this.control.length; i < max; i += 1) {
            duplicate.control.push(new DCHISEL.BezierHandle(
                this.control[i].p1.add(v),
                this.control[i].p2.add(v),
                this.control[i].p3.add(v)
            ));
        }

        return duplicate;

    },

    /**
     * Generates flattened 3D view of a BezierObject. Projects control points according to camera and uses them to draw new bezier curve.
     * @param {DCHISEL.camera} camera - View camera.
     * @returns {DCHISEL.BezierObject} resultObject - Resulting object.
     */
    make3D: function(camera) {

        var i, max,
            resultObject = new DCHISEL.BezierObject([], -1, -1, x0_3D, y0_3D, scale_3D, this.isClosed);

        for (i = 0, max = this.control.length; i < max; i++) {
            resultObject.control.push(new DCHISEL.BezierHandle(
                camera.project(this.control[i].p1),
                camera.project(this.control[i].p2),
                camera.project(this.control[i].p3)
            ));
        }

        return resultObject;

    },

    /** Callback function of corresponding event listener. Hover checks and all dragging behavior are controlled here. */
    mouseMove: function() {

        var dist1, dist2, dist3, // distances from cursor to bezier node point
            dx, dy, kx;

        dx = (DCHISEL.mouse.x - DCHISEL.mouse.xDrag) / DCHISEL.minWH / this.scale;
        dy = (DCHISEL.mouse.y - DCHISEL.mouse.yDrag) / DCHISEL.minWH / this.scale;
        if (!DCHISEL.mouse.isDragging) {
            anyLuck = false; // true if there is a hovered node
            for (var i = 0; i < this.control.length; i++) {
                dist1 = DCHISEL.getDistanceVV(DCHISEL.mouse, this.map(this.control[i].p1));
                dist2 = DCHISEL.getDistanceVV(DCHISEL.mouse, this.map(this.control[i].p2));
                dist3 = DCHISEL.getDistanceVV(DCHISEL.mouse, this.map(this.control[i].p3));
                if (dist1 < DCHISEL.minWH * this.tol) {
                    this.hoverIndex = i;
                    this.hoverType = 1;
                    anyLuck = true;
                }
                if (dist3 < DCHISEL.minWH * this.tol) {
                    this.hoverIndex = i;
                    this.hoverType = 3;
                    anyLuck = true;
                }
                if (dist2 < DCHISEL.minWH * this.tol) {
                    this.hoverIndex = i;
                    this.hoverType = 2;
                    anyLuck = true;
                }
            }
            if (!anyLuck) {
                this.hoverIndex = -1; // reset hoverIndex if no nodes selected
                this.hoverType = -1;
            }
        } else {
            // pan object
            if (this.hoverIndex === -1) {
                if (this.allow.pan) {
                    this.p0T.x = this.p0.x + (DCHISEL.mouse.x - DCHISEL.mouse.xDrag) / DCHISEL.W;
                    this.p0T.y = this.p0.y + (DCHISEL.mouse.y - DCHISEL.mouse.yDrag) / DCHISEL.H;
                }
            }
            // modify control handles
            else if (this.allow.edit) {
                if (this.constrainedEnds && (this.hoverIndex === 0 || this.hoverIndex === (this.control.length - 1)) && (this.hoverType === 2)) {
                    kx = 0;
                } else {
                    kx = 1;
                }
                switch (this.hoverType) {
                    case 2:
                        this.control[this.hoverIndex].p2T.x = this.control[this.hoverIndex].p2.x + dx * kx;
                        this.control[this.hoverIndex].p2T.y = this.control[this.hoverIndex].p2.y + dy;
                        this.control[this.hoverIndex].p1T.x = this.control[this.hoverIndex].p1.x + dx * kx;
                        this.control[this.hoverIndex].p1T.y = this.control[this.hoverIndex].p1.y + dy;
                        this.control[this.hoverIndex].p3T.x = this.control[this.hoverIndex].p3.x + dx * kx;
                        this.control[this.hoverIndex].p3T.y = this.control[this.hoverIndex].p3.y + dy;
                        break;
                    case 1:
                        this.control[this.hoverIndex].p1T.x = this.control[this.hoverIndex].p1.x + dx;
                        this.control[this.hoverIndex].p1T.y = this.control[this.hoverIndex].p1.y + dy;
                        if (!this.control[this.hoverIndex].kink1 && !this.control[this.hoverIndex].kink2 && (DCHISEL.mode === "mode2" || DCHISEL.mode === "mode3")) {
                            k = this.control[this.hoverIndex].d3 / this.control[this.hoverIndex].d1;
                            this.control[this.hoverIndex].p3T.x = this.control[this.hoverIndex].p3.x - k * dx;
                            this.control[this.hoverIndex].p3T.y = this.control[this.hoverIndex].p3.y - k * dy;
                            if (DCHISEL.mode === "mode2") {
                                this.control[this.hoverIndex].normalize3T(this.control[this.hoverIndex].d3);
                            }
                        }
                        break;
                    case 3:
                        this.control[this.hoverIndex].p3T.x = this.control[this.hoverIndex].p3.x + dx;
                        this.control[this.hoverIndex].p3T.y = this.control[this.hoverIndex].p3.y + dy;
                        if (!this.control[this.hoverIndex].kink1 && !this.control[this.hoverIndex].kink2 && (DCHISEL.mode === "mode2" || DCHISEL.mode === "mode3")) {
                            k = this.control[this.hoverIndex].d1 / this.control[this.hoverIndex].d3;
                            this.control[this.hoverIndex].p1T.x = this.control[this.hoverIndex].p1.x - k * dx;
                            this.control[this.hoverIndex].p1T.y = this.control[this.hoverIndex].p1.y - k * dy;
                            if (DCHISEL.mode === "mode2") {
                                this.control[this.hoverIndex].normalize1T(this.control[this.hoverIndex].d1);
                            }
                        }
                }
            }
        }

    },

    /** Performed upon mouse release. Dragged coordinates are updated */
    mouseUp: function() {

        if (this.hoverIndex !== -1) {
            this.control[this.hoverIndex].update();
        } else if (this.hoverIndex === -1) { // if screen is panned
            this.p0.x = this.p0T.x;
            this.p0.y = this.p0T.y;
        }

    },

    /** Performed upon mouseclick. Smoothes kinks */
    mouseDown: function() {

        if (DCHISEL.mode === "smooth" && this.hoverIndex !== -1 && this.hoverType === 2) {
            this.control[this.hoverIndex].smooth();
        }

    },

    /**
     * Generates SVG that reproduces current BezierObject in Rhino3d.
     * @returns {String} SVG file. Fully functional, may be opened and used in most modern browsers as well as vector drawing applications such as Adobe Illustrator.
     */
    exportSVG: function() {

        var svgText = "";

        svgText += '<svg ';
        svgText += 'version="1.1" ';
        svgText += 'id="trace" ';
        svgText += 'xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ';
        svgText += 'viewBox="0 0 200 100" ';
        svgText += 'style="enable-background:new 0 0 200 100;" xml:space="preserve" >\n';
        svgText += '<path style="fill:none;stroke-width:4;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;" ';
        svgText += 'd="M' + ((this.control[0].p2.x + 0.5) * DCHISEL.rDim.l).toFixed(2) + ',' + ((this.control[0].p2.y + 0.5) * DCHISEL.rDim.l).toFixed(2) + "\n";
        for (var i = 1; i < this.control.length; i++) {
            svgText += 'C' + ((this.control[i - 1].p3.x + 0.5) * DCHISEL.rDim.l).toFixed(2) + ',' + ((this.control[i - 1].p3.y + 0.5) * DCHISEL.rDim.l).toFixed(2) + ',' + ((this.control[i].p1.x + 0.5) * DCHISEL.rDim.l).toFixed(2) + ',' + ((this.control[i].p1.y + 0.5) * DCHISEL.rDim.l).toFixed(2) + ',' + ((this.control[i].p2.x + 0.5) * DCHISEL.rDim.l).toFixed(2) + ',' + ((this.control[i].p2.y + 0.5) * DCHISEL.rDim.l).toFixed(2) + "\n";
        }
        svgText += 'C' + ((this.control[this.control.length - 1].p3.x + 0.5) * DCHISEL.rDim.l).toFixed(2) + ',' + ((this.control[this.control.length - 1].p3.y + 0.5) * DCHISEL.rDim.l).toFixed(2) + ',' + ((this.control[0].p1.x + 0.5) * DCHISEL.rDim.l).toFixed(2) + ',' + ((this.control[0].p1.y + 0.5) * DCHISEL.rDim.l).toFixed(2) + ',' + ((this.control[0].p2.x + 0.5) * DCHISEL.rDim.l).toFixed(2) + ',' + ((this.control[0].p2.y + 0.5) * DCHISEL.rDim.l).toFixed(2) + 'z"' + '/>';
        svgText += '</svg>';

        return svgText;

    },

    /**
     * Generate Python script snippet that reproduces 2d object in Rhino3d.
     * @param {String} curveName - Curve name, appears in comments in script file
     * @param {integer} curveNumber - Curve number, appears in comments in script file
     * @param {boolean} isHorizontal - If true, y coordinate becomes z (used for depth profiles)
     * @param {boolean} isClosed - If true, last BezierHandle is connected to the first.
     * @returns {String} exportScript - Script snippet. Does not include script headers and footers.
     */
    exportRhinoScriptPython: function(curveName, curveNumber, isHorizontal, isClosed) {

        var exportScript = "",
            pointArray,
            i, max;

        exportScript += '\n\trs.AddLayer("' + curveName + '")\n';
        exportScript += '\trs.CurrentLayer("' + curveName + '")\n';
        exportScript += "\n\tpts = []";
        exportScript += "\n\t" + curveName + "_crvs = []\n\n";


        for (i = 0, max = this.control.length; i < max; i++) {
            if (isHorizontal) {
                exportScript += "\tpts.append(rs.AddPoint([" + (this.control[i].p1.x * DCHISEL.rDim.l).toFixed(2) + "," + (this.control[i].p1.y * DCHISEL.rDim.l).toFixed(2) + "," + (this.control[i].p1.z * DCHISEL.rDim.l).toFixed(2) + "]))\n";
                exportScript += "\tpts.append(rs.AddPoint([" + (this.control[i].p2.x * DCHISEL.rDim.l).toFixed(2) + "," + (this.control[i].p2.y * DCHISEL.rDim.l).toFixed(2) + "," + (this.control[i].p2.z * DCHISEL.rDim.l).toFixed(2) + "]))\n";
                exportScript += "\tpts.append(rs.AddPoint([" + (this.control[i].p3.x * DCHISEL.rDim.l).toFixed(2) + "," + (this.control[i].p3.y * DCHISEL.rDim.l).toFixed(2) + "," + (this.control[i].p3.z * DCHISEL.rDim.l).toFixed(2) + "]))\n";
            } else {
                exportScript += "\tpts.append(rs.AddPoint([" + ((this.control[i].p1.x) * DCHISEL.rDim.l * 1.05).toFixed(2) + "," + (this.control[i].p1.z * DCHISEL.rDim.l).toFixed(2) + "," + (this.control[i].p1.y * DCHISEL.rDim.l / DCHISEL.rDim.depthScale).toFixed(2) + "]))\n";
                exportScript += "\tpts.append(rs.AddPoint([" + ((this.control[i].p2.x) * DCHISEL.rDim.l * 1.05).toFixed(2) + "," + (this.control[i].p2.z * DCHISEL.rDim.l).toFixed(2) + "," + (this.control[i].p2.y * DCHISEL.rDim.l / DCHISEL.rDim.depthScale).toFixed(2) + "]))\n";
                exportScript += "\tpts.append(rs.AddPoint([" + ((this.control[i].p3.x) * DCHISEL.rDim.l * 1.05).toFixed(2) + "," + (this.control[i].p3.z * DCHISEL.rDim.l).toFixed(2) + "," + (this.control[i].p3.y * DCHISEL.rDim.l / DCHISEL.rDim.depthScale).toFixed(2) + "]))\n";
            }

        }

        for (i = 0, max = this.control.length; i < max; i += 1) {
            pointArray = "";
            if (i < this.control.length - 1) {
                pointArray += "pts[" + (3 * i + 1) + "]" + ",";
                if (this.control[i].d3 !== 0) pointArray += "pts[" + (3 * i + 2) + "]" + ",";
                if (this.control[i + 1].d1 !== 0) pointArray += "pts[" + (3 * i + 3) + "]" + ",";
                pointArray += "pts[" + (3 * i + 4) + "]";
                exportScript += "\n\t" + curveName + "_crvs.append(" + "rs.AddCurve([" + pointArray + "]))";
            } else if (this.isClosed) {
                pointArray += "pts[" + (3 * i + 1) + "]" + ",";
                if (this.control[i].d3 !== 0) pointArray += "pts[" + (3 * i + 2) + "]" + ",";
                if (this.control[0].d1 !== 0) pointArray += "pts[" + (0) + "]" + ",";
                pointArray += "pts[" + (1) + "]";
                exportScript += "\n\t" + curveName + "_crvs.append(" + "rs.AddCurve([" + pointArray + "]))";
            }
        }

        exportScript += "\n\n\t" + curveName + "=rs.JoinCurves(" + curveName + "_crvs, True);\n\n";

        if (isHorizontal) {
            exportScript += "\n\t" + curveName + "_extrudePath1 = rs.AddLine(" + "[0,0," + 0 + "]" + "," + "[0,0," + -DCHISEL.rDim.l / 2 + "]" + ")";
            exportScript += "\n\t" + curveName + "_extrudePath2 = rs.AddLine(" + "[0,0," + 0 + "]" + "," + "[0,0," + DCHISEL.rDim.l / 2 + "]" + ")";
        } else {
            exportScript += "\n\t" + curveName + "_extrudePath1 = rs.AddLine(" + "[0," + 0 + ",0]" + "," + "[0," + -DCHISEL.rDim.l / 2 + ",0]" + ")";
            exportScript += "\n\t" + curveName + "_extrudePath2 = rs.AddLine(" + "[0," + 0 + ",0]" + "," + "[0," + DCHISEL.rDim.l / 2 + ",0]" + ")";
        }

        exportScript += "\n\t" + curveName + "_srf1 = rs.ExtrudeCurve(" + curveName + "," + curveName + "_extrudePath1)";
        exportScript += "\n\t" + curveName + "_srf2 = rs.ExtrudeCurve(" + curveName + "," + curveName + "_extrudePath2)";
        exportScript += "\n\t" + curveName + "_srf = rs.JoinSurfaces([" + curveName + "_srf1," + curveName + "_srf2], True)";

        exportScript += "\n\n\n";

        return exportScript;

    }
};
