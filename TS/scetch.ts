namespace AnotherPart {

    export class Sketch {

        private _p: p5;

        private _divId: string;
        private _divElement: HTMLElement;

        private _resolution = 0.5;
        private _shiftAngle = 12.0;
        private _bordure = 20.0;

        /**
         * Constructor for new Sketch
         * @param background Canvas background, optional. Default value = 255
         */
        public constructor(divId: string = "") {
            this._divId = divId;
            this._divElement = document.getElementById(this._divId);
        }

        /** 
         *  "sketch" interface implementation, it must include "setup" and "draw", other function(s) - optional.
         */

        public start(): void {
            this._p = new p5(this.sketch);
        }

        private sketch = (pp: p5) => {

            let canvas: p5.Element;
            let dayNight: DayNight;

            let img: p5.Image;

            pp.preload = () => {
                canvas = pp.createCanvas(pp.windowWidth, pp.windowHeight);
                canvas.parent(this._divElement);
                img = pp.loadImage("./Images/world_8.jpg");
                dayNight = new DayNight(pp);
            }          

            pp.setup = () => {
                pp.resizeCanvas(pp.windowWidth - this._bordure, pp.windowHeight - this._bordure);
                pp.background(img);
            }

            pp.windowResized = () => {
                pp.resizeCanvas(pp.windowWidth - this._bordure, pp.windowHeight - this._bordure);
                dayNight.updateDayNight(this._resolution, this._shiftAngle, this._bordure);
            }

            pp.draw = () => {
                pp.background(img);
                dayNight.updateDayNight(this._resolution, this._shiftAngle, this._bordure);
                
            }
        }
    }
}