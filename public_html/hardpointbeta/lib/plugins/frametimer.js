ig.module(
	'plugins.frametimer'
).defines(function () { //"use strict";

    ig.Frametimer = ig.Class.extend({
        _count: 0,//Current count
        _max: 30,//Upper value
        _enabled: true,
        _autoreset: true,

        init: function (c,m,r) {
            this._count = c;
            this._max = m;
            this._autoreset = r;
        },
        update: function(){
            //if (this._enabled) {
            //    this._count++;
            //}
        },
        increment: function () {
            if (this._enabled) {
                this._count++;
                if (this._count > this._max) { this._count = this._max; };
            }
        },
        getCount: function(){
            return this._count;
        },
        setCount: function(){
            this._count = c;
        },
        setCountToMax: function(){
            this._count = this._max;
        },
        getMax: function () {
            return this._max;
        },
        
        complete: function () {
            if (this._enabled) {
                if (this._count < this._max) {                    
                    return false;
                } else {
                    if (this._autoreset) {
                        this.reset(this._max);
                    }
                    return true;
                }
            } else {
                return false;
            }

        },
        reset: function(max){
            this._count = 0;
            if (max != undefined) {
                this._max = max;
            }
    
        },
        toggle: function (status) {//Change enabled to status, if no status passed, toggle the state.
            if (status == undefined) {
                this._enabled = !this._enabled;
            } else {
                this._enabled = status;
            }
        },

    });

});