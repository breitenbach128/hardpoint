﻿ig.module(
  'plugins.pause'
)
.requires(
  'impact.game',
  'impact.timer'
)
.defines(function () {
    "use strict";

    ig.Game.inject({

        paused: false,
        pauseDelayTimer: new ig.Timer(),
        pauseButtonDelay: .2,

        updateEntities: function () {
            var i, ent;
            for (i = 0; ent = this.entities[i]; ++i) {
                if (!ent._killed && !this.paused) {
                    ent.update();
                } else if (ent.ignorePause) {
                    ent.update();
                }
            }
        },

        togglePause: function (override) {
            if (this.pauseDelayTimer.delta() > this.pauseButtonDelay) {
                this.paused = null != override ? override : !this.paused;
                if (!this.paused) {
                    this.onResume();
                } else {
                    this.onPause();
                }
                this.pauseDelayTimer.reset();
            }
        },

        onResume: function () { },
        onPause: function () { }
    });

    ig.Entity.inject({
        ignorePause: false
    });

});
//EXAMPLE OF USE
//ig.module(
//  'game.main'
//)
//.requires(
//  'impact.game',
//  'plugins.pause'
//)
//.defines(function () {
//    MyGame = ig.Game.extend({

//        init: function () {
//            ig.input.bind(ig.KEY.P, 'pause');
//        },

//        update: function () {
//            if (ig.input.state('pause')) {
//                this.togglePause();
//            }
//        }
//    });
//});