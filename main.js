var AnotherPart;
(function (AnotherPart) {
    window.onresize = function () {
    };
    window.onload = function () {
        var sk = new AnotherPart.Sketch('canvasImg');
        sk.start();
    };
})(AnotherPart || (AnotherPart = {}));
var AnotherPart;
(function (AnotherPart) {
    var DayNight = /** @class */ (function () {
        function DayNight(p) {
            this._R2D = 180 / Math.PI;
            this._D2R = Math.PI / 180;
            this._p = p;
        }
        ;
        DayNight.prototype.getJulian = function () {
            /* Calculate the present UTC Julian Date. Function is valid after
             * the beginning of the UNIX epoch 1970-01-01 and ignores leap
             * seconds. */
            var td = new Date();
            var delta = Date.UTC(td.getUTCFullYear(), td.getUTCMonth(), td.getUTCDay(), td.getUTCHours(), td.getUTCMinutes(), td.getUTCSeconds());
            return (delta / 86400000) + 2440587.5;
        };
        DayNight.prototype.getGMST = function () {
            /* Calculate Greenwich Mean Sidereal Time according to
               http://aa.usno.navy.mil/faq/docs/GAST.php */
            var julianDay = this.getJulian();
            var d = julianDay - 2451545.0;
            // Low precision equation is good enough for our purposes.
            return (18.697374558 + 24.06570982441908 * d) % 24;
        };
        DayNight.prototype._sunEclipticPosition = function (julianDate) {
            /* Compute the position of the Sun in ecliptic coordinates at
               julianDay.  Following
               http://en.wikipedia.org/wiki/Position_of_the_Sun */
            // Days since start of J2000.0
            var n = julianDate - 2451545.0;
            // mean longitude of the Sun
            var L = 280.460 + 0.9856474 * n;
            L %= 360;
            // mean anomaly of the Sun
            var g = 357.528 + 0.9856003 * n;
            g %= 360;
            // ecliptic longitude of Sun
            var lambda = L + 1.915 * Math.sin(g * this._D2R) +
                0.02 * Math.sin(2 * g * this._D2R);
            // distance from Sun in AU
            var R = 1.00014 - 0.01671 * Math.cos(g * this._D2R) -
                0.0014 * Math.cos(2 * g * this._D2R);
            return { "lambda": lambda, "R": R };
        };
        DayNight.prototype._eclipticObliquity = function (julianDate) {
            // Following the short term expression in
            // http://en.wikipedia.org/wiki/Axial_tilt#Obliquity_of_the_ecliptic_.28Earth.27s_axial_tilt.29
            var n = julianDate - 2451545.0;
            // Julian centuries since J2000.0
            var T = n / 36525;
            var epsilon = 23.43929111 -
                T * (46.836769 / 3600
                    - T * (0.0001831 / 3600
                        + T * (0.00200340 / 3600
                            - T * (0.576e-6 / 3600
                                - T * 4.34e-8 / 3600))));
            return epsilon;
        };
        DayNight.prototype._sunEquatorialPosition = function (sunEclLng, eclObliq) {
            /* Compute the Sun's equatorial position from its ecliptic
             * position. Inputs are expected in degrees. Outputs are in
             * degrees as well. */
            var alpha = Math.atan(Math.cos(eclObliq * this._D2R)
                * Math.tan(sunEclLng * this._D2R)) * this._R2D;
            var delta = Math.asin(Math.sin(eclObliq * this._D2R)
                * Math.sin(sunEclLng * this._D2R)) * this._R2D;
            var lQuadrant = Math.floor(sunEclLng / 90) * 90;
            var raQuadrant = Math.floor(alpha / 90) * 90;
            alpha = alpha + (lQuadrant - raQuadrant);
            return { "alpha": alpha, "delta": delta };
        };
        DayNight.prototype._hourAngle = function (lng, sunPos, gst) {
            /* Compute the hour angle of the sun for a longitude on
             * Earth. Return the hour angle in degrees. */
            var lst = gst + lng / 15;
            return lst * 15 - sunPos.alpha;
        };
        DayNight.prototype._latitude = function (ha, sunPos) {
            /* For a given hour angle and sun position, compute the
             * latitude of the terminator in degrees. */
            var lat = Math.atan(-Math.cos(ha * this._D2R) /
                Math.tan(sunPos.delta * this._D2R)) * this._R2D;
            return lat;
        };
        //----------------------------------------------------------------------------------
        DayNight.prototype.computeDayNight = function (resolution) {
            var today = new Date(); // new Date(year, month, day, hours, minutes, seconds, milliseconds) - months 0-11
            var julianDay = this.getJulian();
            var gst = this.getGMST();
            var latLng = [];
            var sunEclPos = this._sunEclipticPosition(julianDay);
            var eclObliq = this._eclipticObliquity(julianDay);
            var sunEqPos = this._sunEquatorialPosition(sunEclPos.lambda, eclObliq);
            // Build right Polygon ...
            if (sunEqPos.delta < 0) {
                latLng[0] = [90, -360];
            }
            else {
                latLng[0] = [-90, -360];
            }
            for (var i = 0; i <= 360 / resolution; i++) {
                var lng = -360 + i * resolution;
                var ha = this._hourAngle(lng, sunEqPos, gst);
                var lat = this._latitude(ha, sunEqPos);
                latLng[i + 1] = [lat, lng];
            }
            var len = latLng.length;
            if (sunEqPos.delta < 0) {
                latLng[len] = [90, 0];
            }
            else {
                latLng[len] = [-90, 0];
            }
            return latLng;
        };
        DayNight.prototype.createVrtx = function (value, shiftAngle, bordure) {
            var deltaX = (this._p.windowWidth - bordure) / 360.0;
            var deltaY = (this._p.windowHeight - bordure) / 180;
            var x = deltaX * (360.0 - shiftAngle + value[1]);
            var y = -deltaY * (-90.0 - value[0]);
            this._p.curveVertex(x, y);
        };
        DayNight.prototype.updateDayNight = function (resolution, shiftAngle, bordure) {
            var latLng = this.computeDayNight(resolution);
            this._p.stroke(140, 255, 255, 100);
            this._p.fill(140, 255, 255, 100);
            this._p.beginShape();
            var i;
            var iDelta = Math.round(shiftAngle / resolution);
            // First Virtex
            if (latLng[0][0] == 90.0) {
                this.createVrtx([-90, -360 + shiftAngle], shiftAngle, bordure);
            }
            else {
                this.createVrtx([90, -360 + shiftAngle], shiftAngle, bordure);
            }
            // All Corrected Virtex do not Submit here Last element
            for (i = iDelta; i < latLng.length - 1; i++) {
                var value = latLng[i];
                this.createVrtx(value, shiftAngle, bordure);
            }
            //Remain Virtex - (image was shift - include iDelta for right join)
            for (i = 1; i <= iDelta + 2; i++) {
                var value = latLng[i];
                this.createVrtx([value[0], value[1] + 360.0], shiftAngle, bordure);
            }
            // Final Vertex;
            if (latLng[latLng.length - 1][0] == 90.0) {
                this.createVrtx([-90, shiftAngle], shiftAngle, bordure);
            }
            else {
                this.createVrtx([90, shiftAngle], shiftAngle, bordure);
            }
            this._p.endShape(this._p.CLOSE);
        };
        return DayNight;
    }());
    AnotherPart.DayNight = DayNight;
})(AnotherPart || (AnotherPart = {}));
var AnotherPart;
(function (AnotherPart) {
    var Sketch = /** @class */ (function () {
        /**
         * Constructor for new Sketch
         * @param background Canvas background, optional. Default value = 255
         */
        function Sketch(divId) {
            var _this = this;
            if (divId === void 0) { divId = ""; }
            this._resolution = 0.5;
            this._shiftAngle = 12.0;
            this._bordure = 20.0;
            this.sketch = function (pp) {
                var canvas;
                var dayNight;
                var img;
                pp.preload = function () {
                    canvas = pp.createCanvas(pp.windowWidth, pp.windowHeight);
                    canvas.parent(_this._divElement);
                    img = pp.loadImage("./Images/world_8.jpg");
                    dayNight = new AnotherPart.DayNight(pp);
                };
                pp.setup = function () {
                    pp.resizeCanvas(pp.windowWidth - _this._bordure, pp.windowHeight - _this._bordure);
                    pp.background(img);
                };
                pp.windowResized = function () {
                    pp.resizeCanvas(pp.windowWidth - _this._bordure, pp.windowHeight - _this._bordure);
                    dayNight.updateDayNight(_this._resolution, _this._shiftAngle, _this._bordure);
                };
                pp.draw = function () {
                    pp.background(img);
                    dayNight.updateDayNight(_this._resolution, _this._shiftAngle, _this._bordure);
                };
            };
            this._divId = divId;
            this._divElement = document.getElementById(this._divId);
        }
        /**
         *  "sketch" interface implementation, it must include "setup" and "draw", other function(s) - optional.
         */
        Sketch.prototype.start = function () {
            this._p = new p5(this.sketch);
        };
        return Sketch;
    }());
    AnotherPart.Sketch = Sketch;
})(AnotherPart || (AnotherPart = {}));
//# sourceMappingURL=main.js.map