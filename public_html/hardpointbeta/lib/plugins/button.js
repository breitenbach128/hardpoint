ig.module('plugins.button')
.requires(
  'impact.entity',
  'plugins.box2d.entity',
  'plugins.canvastext'
)
.defines(function () {

    Button = ig.Entity.extend({
        size: { x: 80, y: 40 },
        collides: ig.Entity.COLLIDES.NEVER,
        health: 50,
        type: ig.Entity.TYPE.B,
        zIndex: 800,
        text: [],
        textPos: { x: 5, y: 5 },
        textAlign: ig.Font.ALIGN.LEFT,
        gravityFactor: 0,

        font: new ig.Font('media/04b03.font.png'),
        canvasfont: true,
        fontsize: 8,
        animSheet: null,
        entityType: 'button',
        tooltip: "none",
        state: 'idle',
        attachedTo: {entity: null,x:0,y:0},
        //Button Text Fade 
        buttontextFadeCount: 0,
        buttontextFadeTime: 30,
        buttontextFadeStatus: 'in',
        buttontextFadeRate: 1,
        buttontextFadeRepeat: false,
        buttontextFadeToggle: false,
        buttontextFadeEnabled: false,

        //Button tile series
        tileSeries: [0, 1, 2], //Allows me to use more than just the three images on a single file. I can now use a whole sprite sheet, assuming it is setup correctly.
        //I just need to keep in mind, it goes idle, active, deactive
        animatedButton: false,
        animatedButtonSpeed: 1,
        _oldPressed: false,
        _newPress: false,
        _startedIn: false,
        _actionName: 'leftButton',
        
        
        init: function (x, y, settings) {
            this.parent(x, y, settings);
            this.soundeffect =  soundManager.createSound({ id: 'effect_button1', url: './media/sounds/switch_strength_stove_01.ogg', volume: 50 });
            if (this.animatedButton) {
                this.addAnim('idle', this.animatedButtonSpeed, this.tileSeries[0]);
                this.addAnim('active', this.animatedButtonSpeed, this.tileSeries[1]);
                this.addAnim('deactive', this.animatedButtonSpeed, this.tileSeries[2]);
            } else {
                this.addAnim('idle', .1, [this.tileSeries[0]]);
                this.addAnim('active', .1, [this.tileSeries[1]]);
                this.addAnim('deactive', .1, [this.tileSeries[2]]);
            }
            if (this.text.length > 0 && this.font === null) {
                if (ig.game.buttonFont !== null) this.font = ig.game.buttonFont;
                else console.error('If you want to display text, you should provide a font for the button.');                
            }
            this.cnvtext = new ig.Canvastext({ text: this.text, fontsize: this.fontsize, width: 50, spacing: 12, location: { x: 25, y: 25 }, fontcolor: "255, 255, 255", });
            if (this.animatedButton) { this.loopCheck = 1; } else { this.loopCheck = 0 };
        },

        update: function () {            
            this.parent();
            if (this.state !== 'hidden') {//Added loopCount to wait for button animation to play.
                if (this.animatedButton) {

                    if (this.currentAnim.loopCount >= this.loopCheck) {
                        this.checkState();
                    }

                } else {
                    this.checkState();
                }
                

                if (this.attachedTo.entity != null) {
                    this.pos.x = this.attachedTo.entity.pos.x + this.attachedTo.x;//Attach buttons to HUD to move with player.
                    this.pos.y = this.attachedTo.entity.pos.y + this.attachedTo.y;//Attach buttons to HUD to move with player.
                }

                if (this.buttontextFadeEnabled) {
                    if (this.buttontextFadeStatus == 'in') {
                        this.fadeIn();
                    } else if (this.buttontextFadeStatus == 'out') {
                        this.fadeOut();
                    }

                }
            }
        },

        draw: function () {
            if (this.state !== 'hidden') {
               
                this.parent();
                if (!this.canvasfont) {
                    if (this.font !== null) {

                        for (var i = 0; i < this.text.length; i++) {
                            this.font.draw(
                              this.text[i],
                              this.pos.x + this.textPos.x - ig.game.screen.x,
                              this.pos.y + ((this.font.height + 2) * i) + this.textPos.y - ig.game.screen.y,
                              this.textAlign
                            );

                        }
                    }
                } else {
                    //this.cnvtext.alpha = this.font.alpha;
                    this.cnvtext.write(this.pos.x + this.size.x / 2 - this.cnvtext.width / 2 - this.cnvtext.fontsize / 2 - ig.game.screen.x, this.pos.y + this.size.y / 2 - ig.game.screen.y);
                }
                //if (this.tooltip != 'none') {
                //    if (this._inButton()) {
                //        this.font.draw(this.tooltip, ig.game.mousePointer.pos.x - ig.game.screen.x, ig.game.mousePointer.pos.y - ig.game.screen.y - (this.size.y/2));
                //        //this.font.draw(this.tooltip, 480 / 2 - 16, 300);
                //    }
                //}
            }
        },
        fadeIn: function(){
            if (this.buttontextFadeCount < this.buttontextFadeTime) {
                this.buttontextFadeCount++;
                this.font.alpha = this.buttontextFadeCount / this.buttontextFadeTime; 
                this.cnvtext.alpha = this.buttontextFadeCount / this.buttontextFadeTime;                
            } else {
                if (this.buttontextFadeRepeat) {

                    if (this.buttontextFadeToggle) {
                        this.buttontextFadeStatus = 'out';
                    } else {
                        this.buttontextFadeCount = 0;
                    }
                } else {
                    this.buttontextFadeEnabled = false;
                }
            }
        },

        fadeOut: function(){
            if (this.buttontextFadeCount > 0) {
                this.buttontextFadeCount--;
                this.font.alpha = this.buttontextFadeCount / this.buttontextFadeTime;
                this.cnvtext.alpha = this.buttontextFadeCount / this.buttontextFadeTime;
            } else {
                if (this.buttontextFadeRepeat) {

                    if (this.buttontextFadeToggle) {
                        this.buttontextFadeStatus = 'in';
                    } else {
                        this.buttontextFadeCount = 0;
                    }
                } else {
                    this.buttontextFadeEnabled = false;
                }
            }
        },
        checkState: function(){           

            
            if (this._newPress) {
                this.setState('active');
                this.pressedDown();
                this._oldPressed = true;
            }

            if (this._oldPressed && this._newPress == false) {
                this.setState('idle');
                this._oldPressed = false;
                this.soundeffect.play();
                this.pressedUp();
            }

            this._newPress = false;


        },
        setState: function (s) {
            this.state = s;

            if (this.state !== 'hidden') {

                this.currentAnim = this.anims[this.state];
                if (this.animatedButton) { this.currentAnim.rewind(); };
            }
            
            
        },

        pressedDown: function () { },
        pressedUp: function () { },

        _inButton: function () {
            return ig.input.mouse.x + ig.game.screen.x > this.pos.x &&
                   ig.input.mouse.x + ig.game.screen.x < this.pos.x + this.size.x &&
                   ig.input.mouse.y + ig.game.screen.y > this.pos.y &&
                   ig.input.mouse.y + ig.game.screen.y < this.pos.y + this.size.y;
        },
        clicked: function () {
            this._newPress = true;
            return true;
        },

    });

});