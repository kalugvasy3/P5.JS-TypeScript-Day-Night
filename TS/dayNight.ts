namespace AnotherPart {


    export class DayNight {

        // Rebuilt * Terminator.js -- Overlay day/night region on a Leaflet map */
        // Just bring Polygon 

  


        public _p: p5;

        private _R2D = 180 / Math.PI;
        private _D2R = Math.PI / 180;


        public constructor(p: p5) {
            this._p = p;
        };



        private getJulian() {

            /* Calculate the present UTC Julian Date. Function is valid after
             * the beginning of the UNIX epoch 1970-01-01 and ignores leap
             * seconds. */
            let td = new Date();
            let delta = Date.UTC(td.getUTCFullYear(), td.getUTCMonth(), td.getUTCDay(), td.getUTCHours(), td.getUTCMinutes(), td.getUTCSeconds());  
            return (delta / 86400000) + 2440587.5;
        }


        private getGMST() {

            /* Calculate Greenwich Mean Sidereal Time according to
               http://aa.usno.navy.mil/faq/docs/GAST.php */
            let julianDay = this.getJulian();
            let d = julianDay - 2451545.0;
            // Low precision equation is good enough for our purposes.
            return (18.697374558 + 24.06570982441908 * d) % 24;
        }



        private _sunEclipticPosition(julianDate) {
            /* Compute the position of the Sun in ecliptic coordinates at
               julianDay.  Following
               http://en.wikipedia.org/wiki/Position_of_the_Sun */
            // Days since start of J2000.0
            let n = julianDate - 2451545.0;
            // mean longitude of the Sun
            let L = 280.460 + 0.9856474 * n;
            L %= 360;
            // mean anomaly of the Sun
            let g = 357.528 + 0.9856003 * n;
            g %= 360;
            // ecliptic longitude of Sun
            let lambda = L + 1.915 * Math.sin(g * this._D2R) +
                0.02 * Math.sin(2 * g * this._D2R);
            // distance from Sun in AU
            let R = 1.00014 - 0.01671 * Math.cos(g * this._D2R) -
                0.0014 * Math.cos(2 * g * this._D2R);
            return { "lambda": lambda, "R": R };
        }


        private _eclipticObliquity(julianDate) {
            // Following the short term expression in
            // http://en.wikipedia.org/wiki/Axial_tilt#Obliquity_of_the_ecliptic_.28Earth.27s_axial_tilt.29
            let n = julianDate - 2451545.0;
            // Julian centuries since J2000.0
            let T = n / 36525;
            let epsilon = 23.43929111 -
                T * (46.836769 / 3600
                    - T * (0.0001831 / 3600
                        + T * (0.00200340 / 3600
                            - T * (0.576e-6 / 3600
                                - T * 4.34e-8 / 3600))));
            return epsilon;
        }


        private _sunEquatorialPosition(sunEclLng, eclObliq) {
            /* Compute the Sun's equatorial position from its ecliptic
             * position. Inputs are expected in degrees. Outputs are in
             * degrees as well. */
            let alpha = Math.atan(Math.cos(eclObliq * this._D2R)
                * Math.tan(sunEclLng * this._D2R)) * this._R2D;
            let delta = Math.asin(Math.sin(eclObliq * this._D2R)
                * Math.sin(sunEclLng * this._D2R)) * this._R2D;

            let lQuadrant = Math.floor(sunEclLng / 90) * 90;
            let raQuadrant = Math.floor(alpha / 90) * 90;
            alpha = alpha + (lQuadrant - raQuadrant);

            return { "alpha": alpha, "delta": delta };
        }


        private _hourAngle(lng, sunPos, gst) {
            /* Compute the hour angle of the sun for a longitude on
             * Earth. Return the hour angle in degrees. */
            let lst = gst + lng / 15;
            return lst * 15 - sunPos.alpha;
        }


        private _latitude(ha, sunPos) {
            /* For a given hour angle and sun position, compute the
             * latitude of the terminator in degrees. */
            let lat = Math.atan(-Math.cos(ha * this._D2R) /
                Math.tan(sunPos.delta * this._D2R)) * this._R2D;
            return lat;
        }

        //----------------------------------------------------------------------------------

        public computeDayNight(resolution) {
            let today = new Date(); // new Date(year, month, day, hours, minutes, seconds, milliseconds) - months 0-11
            let julianDay = this.getJulian();
            let gst = this.getGMST();
            let latLng = [];

            let sunEclPos = this._sunEclipticPosition(julianDay);
            let eclObliq = this._eclipticObliquity(julianDay);
            let sunEqPos = this._sunEquatorialPosition(sunEclPos.lambda, eclObliq);

            // Build right Polygon ...

            if (sunEqPos.delta < 0) {
                latLng[0] = [90, -360];
            } else {
                latLng[0] = [-90, -360];
            }

            for (let i = 0; i <= 360 / resolution; i++) {
                let lng = -360 + i * resolution;
                let ha = this._hourAngle(lng, sunEqPos, gst);
                let lat = this._latitude(ha, sunEqPos);
                latLng[i + 1] = [lat, lng];
            }

            let len = latLng.length;
            if (sunEqPos.delta < 0) {
                latLng[len] = [90, 0];
            } else {
                latLng[len] = [-90, 0];
            }
            return latLng;
        }


        private createVrtx(value, shiftAngle, bordure) {
            let deltaX = (this._p.windowWidth - bordure) / 360.0;
            let deltaY = (this._p.windowHeight - bordure) / 180;

            let x = deltaX * (360.0 - shiftAngle + value[1]);
            let y = - deltaY * (-90.0 - value[0]);
            this._p.curveVertex(x, y);
        }



        public updateDayNight(resolution, shiftAngle, bordure) {

            let latLng = this.computeDayNight(resolution);

            this._p.stroke(140, 255, 255, 100);
            this._p.fill(140, 255, 255, 100);

            this._p.beginShape();
            let i;
            let iDelta = Math.round(shiftAngle / resolution);

            // First Virtex
            if (latLng[0][0] == 90.0) {
                this.createVrtx([-90, -360 + shiftAngle], shiftAngle, bordure);
            } else {
                this.createVrtx([90, -360 + shiftAngle], shiftAngle, bordure);
            }


            // All Corrected Virtex do not Submit here Last element
            for (i = iDelta; i < latLng.length - 1; i++) {
                let value = latLng[i];
                this.createVrtx(value, shiftAngle, bordure);
            }

            //Remain Virtex - (image was shift - include iDelta for right join)
            for (i = 1; i <= iDelta + 2; i++) {
                let value = latLng[i];
                this.createVrtx([value[0], value[1] + 360.0], shiftAngle, bordure);
            }

            // Final Vertex;

            if (latLng[latLng.length - 1][0] == 90.0) {
                this.createVrtx([-90, shiftAngle], shiftAngle, bordure);
            } else {
                this.createVrtx([90, shiftAngle], shiftAngle, bordure);
            }

            this._p.endShape(this._p.CLOSE);

        }
    }
}
