ig.module(
	'plugins.canvastext'
).requires(
  'impact.entity',
  'plugins.box2d.entity'
).defines(function () { //"use strict";

ig.Canvastext = ig.Class.extend({
    fontsize: 12,
    family: "visitorTT1",
    fontcolor: "0, 0, 0",
    width: 100,
    text: "",
    align: "left",
    location: { x: 0, y: 0 },
    spacing: 0,
    writearr: new Array(),
    alpha: 1,
    background: false,

   

    init: function (settings) {
        ig.merge(this, settings);//merges settings into this object        
        this.parsetext();//Parse initial text for multiline

    },
    settext: function(text){
        this.text = text;
        this.parsetext();
    },
    parsetext: function () {
        //this.fontsize = this.fontsize * ig.system.scale;
        if (this.text.length > this.width) {
            var result = "";
            var charCount = 0;
            this.writearr.length = 0;
            for (var w = 0; w < this.text.length; w++) {
                charCount++;

                if (this.text[w] == "-" || (this.text[w] == " " && charCount >= this.width)) {
                    this.text[w] = "";
                    //console.log("Parse Check:  " + this.text[w] + " index " + w + " char#" + charCount);
                    charCount = 0;
                    this.writearr.push(result);
                    result = "";

                }
                result += this.text[w]
            }
            //Get last line in buffer
            this.writearr.push(result);
        } else {
            this.writearr.length = 0;
            this.writearr.push(this.text);
        }

        //console.log("Write Array Length: " + this.writearr.length);
    },
    write: function (x,y) {
        if (this.background) {
            //image,tileXstartPos,tileYstartPos,tileWidth,TileHeight,Xpos,yPos,imagewidth,imageheight
            //Draw backcolor
            var blockHeight = this.writearr.length * (this.fontsize + this.spacing / 2);
            if (this.text.length > this.width) {
                var blockWidth = this.width * (this.fontsize * 1.5);
            } else {
                var blockWidth = this.text.length * (this.fontsize * 1.5);
            }
            ig.system.context.drawImage(ig.global.dataimage, 0, 0, 16, 16, x * ig.system.scale, y * ig.system.scale - this.fontsize * ig.system.scale, blockWidth, blockHeight * ig.system.scale);
            //Draw highlights
            ig.system.context.drawImage(ig.global.dataimage, 16, 0, 16, 16, x * ig.system.scale, y * ig.system.scale - this.fontsize * ig.system.scale, blockWidth, 1 * ig.system.scale);
            ig.system.context.drawImage(ig.global.dataimage, 16, 0, 16, 16, x * ig.system.scale, y * ig.system.scale - this.fontsize * ig.system.scale, 1 * ig.system.scale, blockHeight * ig.system.scale);
            ig.system.context.drawImage(ig.global.dataimage, 16, 0, 16, 16, x * ig.system.scale + blockWidth, y * ig.system.scale - this.fontsize * ig.system.scale, 1 * ig.system.scale, blockHeight * ig.system.scale);
            ig.system.context.drawImage(ig.global.dataimage, 16, 0, 16, 16, x * ig.system.scale, y * ig.system.scale - this.fontsize * ig.system.scale + blockHeight * ig.system.scale, blockWidth, 1 * ig.system.scale);
        }

        ig.system.context.fillStyle = "rgba("+this.fontcolor +", " + this.alpha + ")";;
        ig.system.context.font = (this.fontsize * ig.system.scale) + 'px ' + this.family;


        for (var w = 0; w < this.writearr.length; w++) {
            //ig.system.context.fillText(this.writearr[w], x * ig.system.scale, y + this.fontsize * w * ig.system.scale);
            ig.system.context.fillText(this.writearr[w], x * ig.system.scale, y * ig.system.scale + ((this.fontsize + 2) * w) + this.spacing*w);
        }
        


    },

});

});

//**************GUIDE********************
//ig.system.context.fillStyle = 'white';
//ig.system.context.font = 'italic 12px sans-serif';
//ig.system.context.textBaseline = 'top';
//ig.system.context.fillText(this.narrationblock, 50, 100);