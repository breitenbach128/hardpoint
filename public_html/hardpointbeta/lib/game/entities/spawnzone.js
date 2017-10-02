ig.module(
	'game.entities.spawnzone'
)
.requires(
    'game.entities.gametrigger'
)
.defines(function () {

    EntitySpawnzone = ig.global.EntityGametrigger.extend({
        effectTimer: null,
        effectCD: 2,
        team: 1,
        playerInZone: false, //players in zone
        effect: { hp: 2, mp: 2, arhp: 2 }, //How much HULL HP, AR HP and Morale does it grant or take away? (Friendly gain, enemies lose)
        regenArt: new ig.Image('media/regenEffect.png'),
        init: function (x, y, settings) {
            this.parent(x, y, settings);
            if (!ig.global.wm) {
                this.body.userData = "spawnzone";
                this.effectTimer = new ig.Timer(this.effectCD);
            }
            this.regenArt = new ig.Animation(new ig.AnimationSheet('media/regenEffect.png', 32, 64), 0.3, [0,1,2,3], false);
        },
        update: function () {
            this.parent();
            this.regenArt.update();

            if (this.playerInZone && ig.game.player.team == this.team) {
                if (this.effectTimer.delta() > 0) {
                    this.passiveEffects();
                    this.effectTimer.reset();
                }
            }
           

        },
        draw: function (){
            this.parent();
            //if (this.playerInZone && ig.game.player.team == this.team) {
            //    var chassisPos = { x: ig.system.width / 2 - 88, y: ig.system.height - 160 }
            //    this.regenArt.draw(chassisPos.x, chassisPos.y);
            //    this.regenArt.draw(chassisPos.x + 144, chassisPos.y);
            //    this.regenArt.draw(ig.system.width - 64 +24, 98);
            //}
        },
        addBodyInZone: function(){
            this.playerInZone = true;
            //Toggle draw effect on player
            ig.game.player.statusEffects.push({name:'regen', stack: 30});
        },
        removeBodyInZone: function () {
            this.playerInZone = false;
            //Toggle draw effect off player
            var f = -1;
            for (var e = 0; e < ig.game.player.statusEffects.length; e++) {
                if (ig.game.player.statusEffects[e].name == 'regen') {
                    f = e;
                }
            }
            if (e != -1) {
                ig.game.player.statusEffects.splice(f, 1);
            }
        },
        passiveEffects: function () {
            ig.game.player.hp = ig.game.player.hp + 5;
            if (ig.game.player.hp > ig.game.player.maxphp) { ig.game.player.hp = ig.game.player.maxphp };
            //Maybe a visual effect as well?
        },
    });

});