ig.module(
	'game.databases'
)
.requires(
	'impact.game'
)
.defines(function () {

    DatabaseReader = ig.Class.extend({
        weaponDbArray: new Array(),
        projectileDbArray: new Array(),
        classDbArray: new Array(),
        perkDbArray: new Array(),
        destructablesDbArray: new Array(),
        abilityArray: new Array(),
        eyeCandyDBArray: new Array(),


        init: function () {
            this.WeaponDBcreate();
            this.perkDBcreate();
            this.projectileDBcreate();
            this.ClassDBCreate();
            this.destructableDBcreate();
            this.abilityDBcreate();
            this.eyeCandyDBcreate();
        },
        ClassDBCreate: function(){
            //(0,this.size.y / 2 * Box2D.SCALE + .75) //MIDDLE SIDE RIGHT
            //(0,-this.size.y / 2 * Box2D.SCALE + .75) //MIDDLE SIDE LEFT
            //(0,0) //CENTER
            //(this.size.x / 2 * Box2D.SCALE + .75,0) //FRONT CENTER
            //Make hardpoint object class, like I have with other objects.
            //13 Possible Hardpoints
            //[1]---[2]---[3]
            //---------------
            //[4]---------[5]
            //---------------
            //-----[ 6 ]-----
            //---------------
            //[7]---------[8]
            //---------------
            //[9]--[10]--[11]
            //1- Front-left, 2 Front-Center, 3 Front-Right, 4, Right-Front, 5 Left-Front
            //6 Center, 7 Right-Back, 8 Left-Back, 9 Back-Left, 10 Back-Center, 11 Back-Right
            //Armor is the starting armor. More can be added
            var class0 = {
                animSheet: new ig.AnimationSheet('media/tankchass_sheet2.png', 128, 64),
                desc: "Barely a tank, the scout hosts very thin armor, but makes up for it with high speed. It is the only tank that can navigate tight quarters well and can reverse as fast as it moves forward.",
                classType: 'Scout',
                density: 1.0, 
                movespeed: 14,
                turnRate: 1.8,
                hp: 450,
                maxphp: 450,
                armor: { f: 1, l: 1, r: 1, b: 0 },
                reversespeed: 1.0,
                optics: 600, //Range of mouse move
                panrate: 20, //Rate optics pan around
                stealth: 380, //Range this tank appears on radar of other tanks
                hardpoints: [new hardpoint(4, "chassisFC", true, 0, 85, null, 2),
                new hardpoint(5, "chassisC", false, 0, 45, null, 1)],
                classid:0,
                defaultperks: [0, 1, 2],
                imgsrc: "media/design/Scout_Gif.gif",
            }
            var class1 = {
                animSheet: new ig.AnimationSheet('media/tankchass_sheet2.png', 128, 64),
                classType: 'Interceptor',
                desc: "A fast assault tank made to quickly meet enemy forces and destroy them, or tie them up long enough for other tanks to arrive.",
                density: 1.5,
                movespeed: 10,
                turnRate: 1.5,
                hp: 475,
                maxphp: 475,
                armor: { f: 2, l: 1, r: 1, b: 0 },
                reversespeed: .75,
                optics: 560, //Range of mouse move
                panrate: 20, //Rate optics pan around
                stealth: 500, //Range this tank appears on radar of other tanks
                hardpoints: [new hardpoint(4, "chassisFL", true, 0, 45, null, 1),
                    new hardpoint(4, "chassisFR", true, 0, 45, null, 2)],
                classid: 1,
                defaultperks: [0, 1, 2],
                imgsrc: "media/design/interceptor.gif",
            }
            var class2 = {
                animSheet: new ig.AnimationSheet('media/tankchass_sheet2.png', 128, 64),
                classType: 'Gladiator',
                desc: "What could be called a main battle tank. Provides good firepower with a durable design.",
                density: 2.0,
                movespeed: 9,
                turnRate: .8,
                hp: 500,
                maxphp: 500,
                armor: { f: 2, l: 2, r: 2, b: 1 },
                reversespeed: .75,
                optics: 520, //Range of mouse move
                panrate: 20, //Rate optics pan around
                stealth: 800, //Range this tank appears on radar of other tanks
                hardpoints: [new hardpoint(4, "chassisFC", true, 0, 45, null, 2),
                    new hardpoint(5, "chassisC", false, 0, 45, null, 1)],
                classid: 2,
                defaultperks: [0, 1, 2],
                imgsrc: "media/design/Scout_Gif.gif",
            }
            var class3 = {
                animSheet: new ig.AnimationSheet('media/tankchass_sheet2.png', 128, 64),
                classType: 'Defender',
                desc: "Made to hold points, soaking up damaging and provide a wall of death to any who approach.",
                density: 60,
                movespeed: 7,
                turnRate: .6,
                hp: 600,
                maxphp: 600,
                armor: { f: 3, l: 2, r: 2, b: 2 },
                reversespeed: .60,
                optics: 500, //Range of mouse move
                panrate: 20, //Rate optics pan around
                stealth: 1500, //Range this tank appears on radar of other tanks
                hardpoints: [new hardpoint(6, "chassisFL", true, 0, 45, null,2),
                    new hardpoint(6, "chassisFR", true, 0, 45, null,2),
                   new hardpoint(5, "chassisC", false, 0, 45, null,1)],
                classid: 3,
                defaultperks: [0, 1, 2],
                imgsrc: "media/design/Scout_Gif.gif",
            }
            var class4 = {
                animSheet: new ig.AnimationSheet('media/tankchass_sheet2.png', 128, 64),
                classType: 'The Rhino',
                desc: "A uniquely designed tank made to charge fast into combat and punish enemies with its forward guns. The result of the enginners efforts for suprising fast speed with heavy armor is a very weak reverse gear, and no ability to attack from angles other than the front.",
                density: 2.3,
                movespeed: 7,
                turnRate: .4,
                hp: 550,
                maxphp: 550,
                armor: { f: 4, l: 2, r: 2, b: 1 },
                reversespeed: .40,
                optics: 500, //Range of mouse move
                panrate: 20, //Rate optics pan around
                stealth: 1000, //Range this tank appears on radar of other tanks
                hardpoints: [new hardpoint(6, "chassisFL", true, 0, 25, null,2),
                    new hardpoint(4, "chassisFC", true, 0, 25, null,1),
                    new hardpoint(6, "chassisFR", true, 0, 25, null,2)],
                classid: 4,
                defaultperks: [0, 1, 2],
                imgsrc: "media/design/Scout_Gif.gif",
            }
            var class5 = {
                animSheet: new ig.AnimationSheet('media/tankchass_sheet2.png', 128, 64),
                classType: 'Back Jack',
                desc: "Could have only been designed by a mad man. It features a slow speed, but a very fast reverse gear. More confusingly, most guns are on the back, but different directions! The left gun faces back, and the right faces front.",
                density: 1.8,
                movespeed: 7,
                turnRate: .9,
                hp: 480,
                maxphp: 480,
                armor: { f: 2, l: 2, r: 2, b: 4 },
                reversespeed: 2,
                optics: 560, //Range of mouse move
                panrate: 20, //Rate optics pan around
                stealth: 600, //Range this tank appears on radar of other tanks
                hardpoints: [new hardpoint(6, "chassisBL", true, 0, -155, null,2),
                    new hardpoint(4, "chassisC", false, 0, 25, null,1),
                    new hardpoint(6, "chassisBR", true, 0, 45, null,2)],
                classid: 5,
                defaultperks: [0, 1, 2],
                imgsrc: "media/design/Scout_Gif.gif",
            }
            var class6 = {
                animSheet: new ig.AnimationSheet('media/tankchass_sheet2.png', 128, 64),
                classType: 'M938 Patton',
                desc: "Based on a very old and trusted design, the Patton bears the name of a great general long dead. Its frame is still used by commanders who prefer more analog methods of killing their foes.",
                density: 2.0,
                movespeed: 7,
                turnRate: .7,
                hp: 500,
                maxphp: 500,
                armor: { f: 2, l: 2, r: 2, b: 2 },
                reversespeed: .50,
                optics: 510, //Range of mouse move
                panrate: 20, //Rate optics pan around
                stealth: 1200, //Range this tank appears on radar of other tanks 
                hardpoints: [new hardpoint(1, "chassisFC", true, 0, 35, null,2),
                    new hardpoint(1, "chassisRF", true, 0, 25, null,2),
                    new hardpoint(2, "chassisC", false, 0, 45, null,1)],
                classid: 6,
                defaultperks: [0, 1, 2],
                imgsrc: "media/design/Scout_Gif.gif",
            }
            var class7 = {
                animSheet: new ig.AnimationSheet('media/tankchass_sheet2.png', 128, 64),
                classType: 'MRL 2138',
                desc: "Released at the end of the last great war, but before it could prove effective, the MRL comes with a multidimensional relocation device. This device allows the tank to teleport short distances when charged. The downstide of the device is amount of space it takes up on the tank reduces the load spared on armor and weapons.",
                density: 1.5,
                movespeed: 8,
                turnRate: 1.1,
                hp: 480,
                maxphp: 480,
                armor: { f: 2, l: 1, r: 1, b: 1 },
                reversespeed: 1.6,
                optics: 580, //Range of mouse move
                panrate: 20, //Rate optics pan around
                stealth: 800, //Range this tank appears on radar of other tanks 
                hardpoints: [new hardpoint(2, "chassisLF", true, 0, 25, null,1),
                    new hardpoint(2, "chassisRF", true, 0, 25, null,2)],
                classid: 7,
                defaultperks: [0, 1, 2],
                imgsrc: "media/design/Scout_Gif.gif",
            }
            var class8 = {
                animSheet: new ig.AnimationSheet('media/tankchass_sheet2.png', 128, 64),
                classType: 'JMY 19',
                desc: "Originally, the Just In Time Maintenance Yard vehicle was meant for battlefield repairs of other tanks. However, with some proper armor and weapons fitted on it, can has proven to be a powerful ally and killer in its own right.",
                density: 10,
                movespeed: 8,
                turnRate: .8,
                hp: 525,
                maxphp: 525,
                armor: { f: 3, l: 3, r: 3, b: 3 },
                reversespeed: .60,
                optics: 535, //Range of mouse move
                panrate: 20, //Rate optics pan around
                stealth: 1400, //Range this tank appears on radar of other tanks
                hardpoints: [new hardpoint(4, "chassisC", false, 0, 45, null, 1),
                new hardpoint(4, "chassisFC", false, 0, 45, null, 2)],
                classid: 8,
                defaultperks: [0, 1, 2],
                imgsrc: "media/design/Scout_Gif.gif",
            }
            this.classDbArray.push(class0);
            this.classDbArray.push(class1);
            this.classDbArray.push(class2);
            this.classDbArray.push(class3);
            this.classDbArray.push(class4);
            this.classDbArray.push(class5);
            this.classDbArray.push(class6);
            this.classDbArray.push(class7);
            this.classDbArray.push(class8);

        },
        WeaponDBcreate: function () {

            var weapon1 = {
                name: "Cannister Round",
                desc: "Sends out a burst of shot dealing low damage and low armor penetration, but it has a very wide spread.",
                rofTime: 30, // ROF (Frames)
                reloadTime: 15,//Time it takes to reload the weapon. (Seconds)
                ammoCurrent: 25,//Magazine size
                ammoMax: 25,
                abilityCost: 5, //Rounds between reload                
                wpTileSetIdle: [0],
                wpTileSetShoot: [0, 1, 2],
                rotationRate: 5,
                range: 192,
                //Projectile
                bulletID: 0,
                projectileCount: 4, //How many projectiles to fire?
                sound: soundManager.createSound({ id: 'effect_cannister', url: './media/sounds/pistol.wav', volume: 30 }),
                imgsrc: "media/design/Animation_wp_cannister.gif",
            }
            var weapon2 = {
                name: "120mm Tank gun",
                desc: "A very strong gun, but with a longer reload time.",
                rofTime: 50, // ROF (Frames)
                reloadTime: 6,//Time it takes to reload the weapon. (Seconds)
                ammoCurrent: 60,
                ammoMax: 60,
                abilityCost: 15, //Rounds between reload                
                wpTileSetIdle: [6],
                wpTileSetShoot: [6, 7, 8],
                rotationRate: 4,
                range: 400,
                //Projectile
                bulletID: 7,
                projectileCount: 1, //How many projectiles to fire?
                sound: soundManager.createSound({ id: 'effect_120mm', url: './media/sounds/machinegun1.wav', volume: 30 }),
                imgsrc: "media/design/Animation_wp_120mm.gif",
            }
            var weapon3 = {
                name: "20mm Auto Cannon",
                desc: "A rapid fire weapon made for moderate damage at moderate range.",
                rofTime: 35, // ROF (Frames)
                reloadTime: 15,//Time it takes to reload the weapon. (Seconds)
                ammoCurrent: 120,
                ammoMax: 120,
                abilityCost: 5, //Rounds between reload                
                wpTileSetIdle: [12],
                wpTileSetShoot: [12, 13, 14],
                rotationRate: 5,
                range: 400,
                //Projectile
                bulletID: 1,
                projectileCount: 1, //How many projectiles to fire?
                sound: soundManager.createSound({ id: 'effect_autocannon', url: './media/sounds/anti_tank_gun_single_shot.mp3', volume: 30 }),
                imgsrc: "media/design/Animation_wp_autocannon.gif",
            }
            var weapon4 = {
                name: "Mortar",
                desc: "A powerful indirect weapon. Takes a delay before impact but has high armor pierce and high damage. Enemies can see the target area just before impact.",
                rofTime: 180, // ROF (Frames)
                reloadTime: 20,//Time it takes to reload the weapon. (Seconds)
                ammoCurrent: 40,
                ammoMax: 40,
                abilityCost: 15, //Rounds between reload                
                wpTileSetIdle: [18],
                wpTileSetShoot: [18, 19, 18],
                rotationRate: 2,
                range: 500,
                wptype: "hitscan",//projectile, hitscan
                firedelay: 2, //Mostly for hitscan weapons, how long from shoot until it actually hits the target area? Think of it as travel time
                //Projectile
                bulletID: 3,
                projectileCount: 1, //How many projectiles to fire?
                sound: soundManager.createSound({ id: 'effect_mortar', url: './media/sounds/howitzer_cannon_single_shot.mp3', volume: 30 }),
                imgsrc: "media/design/Animation_wp_arty.gif",
            }
            var weapon5 = {
                name: "Machinegun",
                desc: "A rapid file small arm. It won't do much damage to enemy tanks, but it provides a constant stream of fire power.",
                rofTime: 3, // ROF (Frames)
                reloadTime: 1.5,//Time it takes to reload the weapon. (Seconds)
                ammoCurrent: 8,
                ammoMax: 8,
                abilityCost: 5, //Rounds between reload                
                wpTileSetIdle: [24],
                wpTileSetShoot: [24, 25, 26],
                rotationRate: 5,
                range: 300,
                //Projectile
                bulletID: 2,
                projectileCount: 1, //How many projectiles to fire?
                sound: soundManager.createSound({ id: 'effect_machinegun', url: './media/sounds/machinegun1.wav', volume: 30 }),
                imgsrc: "media/design/Animation_wp_mg.gif",
            }
            var weapon6 = {
                name: "Anti Tank Missle",
                desc: "The ATM can do enormous damage to armor and tank upon impact, but has a very long reload time. The explosion can do damage to friend or foe.",
                rofTime: 65, // ROF (Frames)
                reloadTime: 10,//Time it takes to reload the weapon. (Seconds)
                ammoCurrent: 1,
                ammoMax: 1,
                abilityCost: 40, //Rounds between reload                
                wpTileSetIdle: [30],
                wpTileSetShoot: [30, 31, 30],
                rotationRate: 3,
                range: 1000,
                //Projectile
                bulletID: 6,
                projectileCount: 1, //How many projectiles to fire?
                sound: soundManager.createSound({ id: 'effect_atgm', url: './media/sounds/missle_launch1.mp3', volume: 30 }),
                imgsrc: "media/design/Animation_wp_atgm.gif",
            }
            var weapon7 = {
                name: "Rocket Pod",
                desc: "Rockets are moderate distance explosive weapons with good damage. Great for causing chaos in the enemy ranks.",
                rofTime: 45, // ROF (Frames)
                reloadTime: 15,//Time it takes to reload the weapon. (Seconds)
                ammoCurrent: 4,
                ammoMax: 4,
                abilityCost: 25, //Rounds between reload                
                wpTileSetIdle: [36],
                wpTileSetShoot: [36, 37, 38],
                rotationRate: 3,
                range: 400,
                //Projectile
                bulletID: 4,
                projectileCount: 1, //How many projectiles to fire?
                sound: soundManager.createSound({ id: 'effect_rocket', url: './media/sounds/rocket1.mp3', volume: 30 }),
                imgsrc: "media/design/Animation_wp_rocket.gif",
            }
            var weapon8 = {
                name: "Flame Thrower",
                desc: "Does nearly no damage to tanks and has a short range. However, the morale damage is massive and it can disable whole crews.",
                rofTime: 15, // ROF (Frames)
                reloadTime: 12,//Time it takes to reload the weapon. (Seconds)
                ammoCurrent: 150,
                ammoMax: 150,
                abilityCost: 10, //Rounds between reload                
                wpTileSetIdle: [42],
                wpTileSetShoot: [42, 42, 42],
                rotationRate: 3,
                range: 150,
                //Projectile
                bulletID: 8,
                projectileCount: 3, //How many projectiles to fire?
                sound: soundManager.createSound({ id: 'effect_flamethrower', url: './media/sounds/fireball1.mp3', volume: 30 }),
                imgsrc: "media/design/Animation_wp_flamer.gif",
            }
            //Load weapons into array
            this.weaponDbArray.push(weapon1);
            this.weaponDbArray.push(weapon2);
            this.weaponDbArray.push(weapon3);
            this.weaponDbArray.push(weapon4);
            this.weaponDbArray.push(weapon5);
            this.weaponDbArray.push(weapon6);
            this.weaponDbArray.push(weapon7);
            this.weaponDbArray.push(weapon8);

        },
        perkDBcreate: function () {

            var perk0 = {
                id: 0,
                name: 'Basic Engineering',
                desc: "With a basic understanding of engineering, a tank crew can keep their vehicle in working order far beyond its normal life span. (Tank Hull gains regen)",
                summary: "Regeneration +2",
                type: "statboost",
                value: {stat: "regen", n: 2},

            }
            var perk1 = {
                id: 1,
                name: 'Speed Demon',
                desc: "Fearless and reckless, your tank crew is more than willing to push the tanks engine to its limits. (Gain speed)",
                summary: "Movement + 10",
                type: "statboost",
                value: { stat: "movespeed", n: 10 },
            }
            var perk2 = {
                id: 2,
                name: 'Beefy',
                desc: "Your hull is thicker than most, providing a more solid barrier should your armor fail.",
                summary: "Hull Strength + 20%",
                type: "statboost",
                value: { stat: "hp", n: .2 },
            }
            var perk3 = {
                id: 3,
                name: 'Guns Blazing',
                desc: "Your weapon crews are skilled and experienced, allowing for a much quicker target aquisition.",
                summary: "Rotation Speed  +2",
                type: "statboost",
                value: { stat: "rotationRate", n: 2 },

            }
            var perk4 = {
                id: 4,
                name: 'Sneaky Peeky',
                desc: "Your crew has managed to hide nearly all the noise your tank would normally produce. You wont show up on radar until it is too late for them to respond.)",
                summary: "Noise reduced by half",
                type: "statboost",
                value: { stat: "stealth", n: 2 },

            }
            var perk5 = {
                id: 5,
                name: 'Sniper',
                desc: "Your optics have been updated beyond the normal. You can scan the battlefield considerably further than you normally would be able to.",
                summary: "Optics range x1.5",
                type: "statboost",
                value: { stat: "optics", n: 1.5 },
            }
            var perk6 = {
                id: 6,
                name: 'Explosive Temper',
                desc: "Your tank is a giant bomb. No joke. When you die, you go Kaboom.",
                summary: "Explodes on Death",
                type: "statboost",
                value: { stat: "boom", n: 2 },
            }
            var perk7 = {
                id: 7,
                name: 'Heroic',
                desc: "You take command and lead people. It is what your do. You count double on capture points in contention.",
                summary: "Capture Dominance x2",
                type: "statboost",
                value: { stat: "caprate", n: 5 },

            }
            var perk8 = {
                id: 8,
                name: 'Skillfull',
                desc: "Your tank crew has a natural aptitude towards their tanks specific ability.",
                summary: "Ability Cooldown -20%",
                type: "statboost",
                value: { stat: "cooldown", n: .2 },

            }
            var perk9 = {
                id: 9,
                name: 'Bulletstorm',
                desc: "Your tank carries a much larger ammo supply.",
                summary: "Magazine size x2",
                type: "statboost",
                value: { stat: "magsize", n: 2 },
            }
            var perk10 = {
                id: 10,
                name: 'Phoenix',
                desc: "Your tank can return to battle faster after being destroyed.",
                summary: "15% faster respawn.",
                type: "statboost",
                value: { stat: "respawn", n: .15 },
            }
            var perk11 = {
                id: 11,
                name: 'Turtle',
                desc: "Reenforced armor makes your tank tougher, but slower.",
                summary: "20% more armor -30% movement speed..",
                type: "statboost",
                value: { stat: "turtle", n: .2 },
            }
            var perk12 = {
                id: 12,
                name: 'Defense Drone',
                desc: "Allocating a slot for a defense drone can provide valuable support fire.",
                summary: "Spawn Defense Drone on damage. Limit 1.",
                type: "statboost",
                value: { stat: "defensedrone", n: 1 },
            }
            var perk13 = {
                id: 13,
                name: 'Triage',
                desc: "Your crews can provide emergancy repairs to other tanks with close proximity.",
                summary: "Tank creates health kits which last for 10 seconds.",
                type: "statboost",
                value: { stat: "createitem", n:1 },
            }
            var perk14 = {
                id: 14,
                name: 'Quick Turn',
                desc: "Your tank possesses a powerful turning gear, allow for faster rotation speeds.",
                summary: "+.5 rotation rate.",
                type: "statboost",
                value: { stat: "turnrate", n:.5 },
            }
            //Load weapons into array
            this.perkDbArray.push(perk0);
            this.perkDbArray.push(perk1);
            this.perkDbArray.push(perk2);
            this.perkDbArray.push(perk3);
            this.perkDbArray.push(perk4);
            this.perkDbArray.push(perk5);
            this.perkDbArray.push(perk6);
            this.perkDbArray.push(perk7);
            this.perkDbArray.push(perk8);
            this.perkDbArray.push(perk9);
            this.perkDbArray.push(perk10);
            this.perkDbArray.push(perk11);
            this.perkDbArray.push(perk12);
            this.perkDbArray.push(perk13);
            this.perkDbArray.push(perk14);

        },
        projectileDBcreate: function () {
            var projectile0 = {
                name: "buckshot",
                size: { x: 4, y: 4 },
                id: 0,//What type of projectile is it? Used for pooling.
                animSheet: new ig.AnimationSheet('media/projectiles.png', 4, 4),
                animspeed: .2,
                tileset: [2],
                lifespan: 20,//120 frames
                hasLifespan: true,//Does the projectile have a limit on it's life?
                bulletvelocity: 5,
                effValue: 0, //If the effect causes a number impact, what is it's value.
                bulletType: "bullet", //What effect does it cause when it hits?Dies?
                accuracy: 6, //How accuracte is it, the lower the better.
                damage: { hp: 25, mp: 4 },
            }
            var projectile1 = {
                name: "20mm",
                id: 1,//What type of projectile is it? Used for pooling.
                animspeed: .2,
                tileset: [48],
                lifespan: 100,//120 frames
                hasLifespan: true,//Does the projectile have a limit on it's life?
                bulletvelocity: 40,
                effValue: 0, //If the effect causes a number impact, what is it's value.
                bulletType: "cannon", //What effect does it cause when it hits?Dies?
                accuracy: .2, //How accuracte is it, the lower the better.
                damage: { hp: 50, mp: 4 },
            }
            var projectile2 = {
                name: "7.62",
                id: 2,//What type of projectile is it? Used for pooling.
                animspeed: .2,
                tileset: [96],
                lifespan: 25,//120 frames
                hasLifespan: true,//Does the projectile have a limit on it's life?
                bulletvelocity: 35,
                effValue: { stat: 'slowpercent', value: 3, secondsDuration: 1 }, //If the effect causes a number impact, what is it's value.
                bulletType: "bullet", //What effect does it cause when it hits?Dies?
                accuracy: 2, //How accuracte is it, the lower the better.
                damage: { hp: 12, mp: 5 },
            }
            var projectile3 = {
                name: "mortar",
                id: 3,//What type of projectile is it? Used for pooling.
                animSheet: new ig.AnimationSheet('media/projectiles.png', 32, 32),
                animrepeat: true,
                animspeed: .2,
                tileset: [8,9,10,11,12,13,14,15],
                lifespan: 1800,//120 frames, For the mortar, this is how much warning the player is going to get.
                hasLifespan: true,//Does the projectile have a limit on it's life?
                bulletvelocity: 12,
                effValue: 0, //If the effect causes a number impact, what is it's value.
                bulletType: "explode", //What effect does it cause when it hits?Dies?
                explodePrjId: 9,//What does it spawn when it explodes
                accuracy: 0, //How accuracte is it, the lower the better.
                damage: { hp: 50, mp: 40 },
                maskBits: 0x0000,
                deathsound: soundManager.createSound({ id: 'effect_mortar', url: './media/sounds/bigbomb1.mp3', volume: 30 })
            }
            var projectile4 = {
                name: "rocket",
                id: 4,//What type of projectile is it? Used for pooling.
                animspeed: .2,
                tileset: [49,50,51],
                lifespan: 360,//120 frames
                hasLifespan: true,//Does the projectile have a limit on it's life?
                bulletvelocity: 35,
                effValue: 60, //If the effect causes a number impact, what is it's value.
                bulletType: "explode", //What effect does it cause when it hits?Dies?
                explodePrjId: 10,//What does it spawn when it explodes
                accuracy: 2, //How accuracte is it, the lower the better.
                damage: { hp: 30, mp: 6 },
            }
            var projectile5 = {
                name: "shock",
                id: 5,//What type of projectile is it? Used for pooling.
                animspeed: .2,
                tileset: [80,81,82],
                lifespan: 60,//120 frames
                hasLifespan: true,//Does the projectile have a limit on it's life?
                bulletvelocity: 90,
                effValue: 0, //If the effect causes a number impact, what is it's value.
                bulletType: "fire", //What effect does it cause when it hits?Dies?
                accuracy: 3, //How accuracte is it, the lower the better.
                damage: { hp: 1, mp: 1 },
            }
            var projectile6 = {
                name: "missle",
                id: 6,//What type of projectile is it? Used for pooling.
                animspeed: .2,
                tileset: [16,17],
                lifespan: 600,//120 frames
                hasLifespan: true,//Does the projectile have a limit on it's life?
                bulletvelocity: 35,
                effValue: 0, //If the effect causes a number impact, what is it's value.
                bulletType: "explode", //What effect does it cause when it hits?Dies?
                explodePrjId: 10,//What does it spawn when it explodes
                accuracy: 0, //How accuracte is it, the lower the better.
                damage: { hp: 80, mp: 10 },
            }
            var projectile7 = {
                name: "shell",
                id: 7,//What type of projectile is it? Used for pooling.
                animspeed: .2,
                tileset: [32],
                lifespan: 240,//120 frames
                hasLifespan: true,//Does the projectile have a limit on it's life?
                bulletvelocity: 28,
                effValue: 0, //If the effect causes a number impact, what is it's value.
                bulletType: "cannon", //What effect does it cause when it hits?Dies?
                accuracy: 0, //How accuracte is it, the lower the better.
                damage: { hp: 120, mp: 8 },
            }
            var projectile8 = {
                name: "flame",
                id: 8,//What type of projectile is it? Used for pooling.
                animspeed: .2,
                tileset: [80,81,82],
                lifespan: 15,//120 frames
                hasLifespan: true,//Does the projectile have a limit on it's life?
                bulletvelocity: 25,
                effValue: { stat: 'blind', value: 256, secondsDuration: 2 }, //If the effect causes a number impact, what is it's value.
                bulletType: "fire", //What effect does it cause when it hits?Dies?
                accuracy: 6, //How accuracte is it, the lower the better.
                damage: { hp: 5, mp: 7 },
            }
            var projectile9 = {
                name: "blast",
                id: 9,//What type of projectile is it? Used for pooling.
                animspeed: .2,
                tileset: [80, 81, 82],
                lifespan: 25,//120 frames
                hasLifespan: true,//Does the projectile have a limit on it's life?
                bulletvelocity: 15,
                effValue: 0, //If the effect causes a number impact, what is it's value.
                bulletType: "cannon", //What effect does it cause when it hits?Dies?
                accuracy: 0, //How accuracte is it, the lower the better.
                damage: { hp: 25, mp: 5 },
            }
            var projectile10 = {
                name: "rocketblast",
                id: 10,//What type of projectile is it? Used for pooling.
                animspeed: .2,
                tileset: [86, 87, 88],
                lifespan: 20,//120 frames
                hasLifespan: true,//Does the projectile have a limit on it's life?
                bulletvelocity: 10,
                effValue: 0, //If the effect causes a number impact, what is it's value.
                bulletType: "cannon", //What effect does it cause when it hits?Dies?
                accuracy: 0, //How accuracte is it, the lower the better.
                damage: { hp: 5, mp: 3 },
            }
            var projectile11 = {
                name: "napalm",
                id: 11,//What type of projectile is it? Used for pooling.
                animspeed: .2,
                tileset: [80, 81, 82],
                lifespan: 45,//120 frames
                hasLifespan: true,//Does the projectile have a limit on it's life?
                bulletvelocity: 0,
                effValue: 0, //If the effect causes a number impact, what is it's value.
                bulletType: "fire", //What effect does it cause when it hits?Dies?
                accuracy: 6, //How accuracte is it, the lower the better.
                damage: { hp: 5, mp: 8 },
            }
            var projectile12 = {
                zIndex: 195,
                size: { x: 16, y: 16 },
                animSheet: new ig.AnimationSheet('media/projectiles.png', 16, 16),
                name: "mine",
                id: 12,//What type of projectile is it? Used for pooling.
                animspeed: .33,
                tileset: [2, 3, 4, 5, 6],
                lifespan: 900,//120 frames
                hasLifespan: true,//Does the projectile have a limit on it's life?
                bulletvelocity: 0,
                effValue: 0, //If the effect causes a number impact, what is it's value.
                bulletType: "explode", //What effect does it cause when it hits?Dies?
                explodePrjId: 10,//What does it spawn when it explodes
                accuracy: 0, //How accuracte is it, the lower the better.
                damage: { hp: 70, mp: 10 },
            }
            this.projectileDbArray.push(projectile0);
            this.projectileDbArray.push(projectile1);
            this.projectileDbArray.push(projectile2);
            this.projectileDbArray.push(projectile3);
            this.projectileDbArray.push(projectile4);
            this.projectileDbArray.push(projectile5);
            this.projectileDbArray.push(projectile6);
            this.projectileDbArray.push(projectile7);
            this.projectileDbArray.push(projectile8);
            this.projectileDbArray.push(projectile9);
            this.projectileDbArray.push(projectile10);
            this.projectileDbArray.push(projectile11);
            this.projectileDbArray.push(projectile12);
        },
        destructableDBcreate: function () {
            var destructable0 = {
                size: { x: 64, y: 64 },
                animSheet: new ig.AnimationSheet('media/destructable_shed.png', 64, 64),
                animations: { idle: [0], damagelow: [1], damagemed: [2], damagehigh: [3] },
                hp: 250,
                maxhp: 250,
                damping: 10,
            }
            var destructable1 = {
                size: { x: 16, y: 16 },
                animSheet: new ig.AnimationSheet('media/crates_16.png', 16, 16),
                animations: { idle: [16], damagelow: [17], damagemed: [18], damagehigh: [19] },
                hp: 25,
                maxhp: 25,
                damping: 15,
            }
            var destructable2 = {
                //rocks
                size: { x: 16, y: 16 },
                animSheet: new ig.AnimationSheet('media/crates_16.png', 16, 16),
                animations: { idle: [24], damagelow: [25], damagemed: [26], damagehigh: [27] },
                hp: 50,
                maxhp: 50,
                damping: 25,
            }
            var destructable3 = {
                //metal barrel
                size: { x: 16, y: 16 },
                animSheet: new ig.AnimationSheet('media/crates_16.png', 16, 16),
                animations: { idle: [32], damagelow: [33], damagemed: [34], damagehigh: [35] },
                hp: 30,
                maxhp: 30,
                damping: 25,
            }
            this.destructablesDbArray.push(destructable0);
            this.destructablesDbArray.push(destructable1);
            this.destructablesDbArray.push(destructable2);
            this.destructablesDbArray.push(destructable3);
        },
        abilityDBcreate: function () {
            var ability01 = {
                name: 'Turn and Burn',
                desc: 'The scout can inject nitro into their engine resulting in a short, but powerful, speed boost. Additionally, the scout packs a full supply of deadly short fuse burst mines which can be dropped in rapid succession.',
                id: 0,
                cooldown: 45,
                occurence: { type: 'reccuring', effecttime: 1, ticks: 0, totalticks: 8 },
                triggerEvent: { type: 'active', source: 'key' },
                initial: { targets: ['Self'], effects: ['statstomod'] },
                persistance: { targets: ['Self'], effects: ['projectile'] },
                target: { etype: ['Self'], ents: new Array(), source: 'self', value: 300 },
                visualEffect: 0,
                tilesetmod: [],
                projectile: { Id: 12, Count: 1, Action: 'bullet', origin: 'back', anglemod: 180, firepattern: { type: 'line', rate: 0 } }, //Explosion, Bullet
                statstomod: [{ stat: 'movement', value: 10, secondsDuration: 10 }],
                bodymod: [{ type: 'position', mod: { b2dx: 0, b2dy: 0 } }], 
                imgsrc: "media/design/Animation_scout.gif",
            }
            var ability02 = {
                name: "Overkill",
                desc: 'The intercepter is able to push their firing systems to the limit for a few seconds, allowing for a massive increase in firepower.',
                id: 1,
                cooldown: 45,
                occurence: { type: 'triggered', effecttime: 1, ticks: 0, totalticks: 1 },
                triggerEvent: { type: 'active', source: 'key' },
                initial: { targets: ['Self'], effects: ['statstomod'] },
                persistance: null,
                target: { etype: ['Self'], ents: new Array(), source: 'self', value: 300 },
                visualEffect: {applyTo: 'weapons', effect: 1, attached: true},
                tilesetmod: [],
                projectile: {},
                statstomod: [{ stat: 'weapon-rof', value: .2, secondsDuration: 5 }, { stat: 'weapon-reload', value: .2, secondsDuration: 5 }, { stat: 'weapon-magsize', value: 2.0, secondsDuration: 5 }],
                entityCreate: null,
                entityTarget: null,               //Body
                bodymod: [{ type: 'position', mod: { b2dx: 0, b2dy: 0 } }], //Position, Velocity, Impulse, AngVel, AngImpulse, AngPos 
                imgsrc: "media/design/Animation_intercepter.gif",
            }
            var ability03 = {
                name: "Hull Down",
                desc: 'Some tank crews have mastered the ability to make their tank dig in to the earth, giving it greatly reduced mobility, but allow it to become much tougher to kill.',
                id: 2,
                cooldown: 45,
                occurence: { type: 'triggered', effecttime: 1, ticks: 0, totalticks: 10 },
                triggerEvent: { type: 'active', source: 'key' },
                initial: { targets: ['Self'], effects: ['statstomod'] },
                persistance: { targets: ['Self'], effects: ['statstomod'] },
                target: { etype: ['Self'], ents: new Array(), source: 'self', value: 300 },
                visualEffect: { applyTo: 'self', effect: 2, attached: true },
                tilesetmod: [],
                projectile: {},
                statstomod: [{ stat: 'regen', value: 5, secondsDuration: 10 }, { stat: 'armor', value: 8, secondsDuration: 10 }, { stat: 'morale', value: 8, secondsDuration: 10 }, { stat: 'movespeed', value: 1, secondsDuration: 10 }],
                entityCreate: null,
                entityTarget: null,                //Body
                bodymod: [{ type: 'position', mod: { b2dx: 0, b2dy: 0 } }], //Position, Velocity, Impulse, AngVel, AngImpulse, AngPos 
                imgsrc: "media/design/Animation_gladiator.gif",
            }
            var ability04 = {
                name: "Artillery Strike",
                desc: 'In dire times, the Defender can call in a remote artillery bombardment to offer additional firepower.',
                id: 3,
                cooldown: 45,
                occurence: { type: 'reccuring', effecttime: 1, ticks: 0, totalticks: 5 },
                triggerEvent: { type: 'active', source: 'key' },
                initial: { targets: ['mouse'], effects: ['projectile'] },
                persistance: { targets: ['mouse'], effects: ['projectile'] },
                target: { etype: ['mouse'], ents: new Array(), source: 'mouse', value: 900 },
                visualEffect: { applyTo: 'self', effect: 3, attached: true },
                tilesetmod: [],
                projectile: { Id: 3, Count: 1, Action: 'hitscan', origin: 'mouse', anglemod: 0, firepattern: { type: 'line', rate: 0 } },
                statstomod: [],
                entityCreate: null,
                entityTarget: null,               //Body
                bodymod: [{ type: 'position', mod: { b2dx: 0, b2dy: 0 } }], //Position, Velocity, Impulse, AngVel, AngImpulse, AngPos 
                imgsrc: "media/design/Animation_defender.gif",
            }
            var ability05= {
                name: "Rhino Charge",
                desc: 'The rhino tanks very well known attack, it can charge enemy tanks dealing considerable damage. During the charge it losses most other forms of mobility than forward.',
                id: 4,
                cooldown: 35,
                occurence: { type: 'triggered', effecttime: 5, ticks: 0, totalticks: 1 },
                triggerEvent: { type: 'active', source: 'key' },
                initial: { targets: ['Self'], effects: ['statstomod','collision'] },
                persistance: null,
                target: { etype: ['Self'], ents: new Array(), source: 'self', value: 300 },
                visualEffect: { applyTo: 'self', effect: 4, attached: true },
                tilesetmod: [],
                projectile: {},
                statstomod: [{ stat: 'movespeed', value: 40, secondsDuration: 5 }, { stat: 'turnRate', value: .1, secondsDuration: 5 }, { stat: 'reversespeed', value: .01, secondsDuration: 5 }],
                entityCreate: null,
                entityTarget: null,
                collisiondata: { enabled: false, location: 'front', targetypes: ['netplayer'], effect: { type: 'damage', value: { hp: 15, mp: 1 } } },
                bodymod: [{ type: 'position', mod: { b2dx: 0, b2dy: 0 } }], //Position, Velocity, Impulse, AngVel, AngImpulse, AngPos 
                imgsrc: "media/design/Animation_rhino.gif",
            }
            var ability06 = {
                name: "Chaos Theory",
                desc: 'The Back Jack can release a blast of fire in all directions, sowing chaos in the ranks of enemies.',
                id: 5,
                cooldown: 45,
                occurence: { type: 'reccuring', effecttime: 1, ticks: 0, totalticks: 5 },
                triggerEvent: { type: 'active', source: 'key' },
                initial: { targets: ['Self'], effects: ['projectile'] },
                persistance: { targets: ['Self'], effects: ['projectile'] },
                target: { etype: ['Self'], ents: new Array(), source: 'self', value: 300 },
                visualEffect: { applyTo: 'self', effect: 5, attached: true },
                tilesetmod: [],
                projectile: { Id: 9, Count: 18, Action: 'bullet', origin: 'front', anglemod: 0, firepattern: { type: 'radial', rate: 20 } },
                statstomod: [],
                entityCreate: null,
                entityTarget: null,
                bodymod: [{ type: 'position', mod: { b2dx: 0, b2dy: 0 } }], //Position, Velocity, Impulse, AngVel, AngImpulse, AngPos 
                imgsrc: "media/design/Animation_backjack.gif",
            }
            var ability07 = {
                name: "Calliope Rocket Barrage",
                desc: 'The Patton carries a rocket battery as a fallback weapon should its normal loadout not succeed.',
                id: 6,
                cooldown: 45,
                occurence: { type: 'reccuring', effecttime: 2, ticks: 0, totalticks: 3 },
                triggerEvent: { type: 'active', source: 'key' },
                initial: { targets: ['Self'], effects: ['projectile'] },
                persistance: { targets: ['Self'], effects: ['projectile'] },
                target: { etype: ['Self'], ents: new Array(), source: 'self', value: 300 },
                visualEffect: { applyTo: 'self', effect: 6, attached: true },
                tilesetmod: [],
                projectile: { Id: 4, Count: 1, Action: 'bullet', origin: 'front', anglemod: -90, firepattern: { type: 'line', rate: 0 } },
                statstomod: [],
                entityCreate: null,
                entityTarget: null,
                bodymod: [{ type: 'position', mod: { b2dx: 0, b2dy: 0 } }], //Position, Velocity, Impulse, AngVel, AngImpulse, AngPos 
                imgsrc: "media/design/Animation_patton.gif",
            }
            var ability08 = {
                name: "Blink",
                desc: 'Using cutting edge technology, the MRL can teleport short distances',
                id: 7,
                cooldown: 15,
                occurence: { type: 'triggered', effecttime: 1, ticks: 0, totalticks: 1 },
                triggerEvent: { type: 'active', source: 'key' },
                initial: { targets: ['Self'], effects: ['body'] },
                persistance: null,
                target: { etype: ['Self'], ents: new Array(), source: 'self', value: 300 },
                visualEffect: 0,
                tilesetmod: [],
                projectile: {},
                statstomod: [],
                entityCreate: null,
                entityTarget: null,
                bodymod: [{ type: 'setposition-player', value:'mouse'}],
                placementEnt: { ent: 'EntityPlacement', settings: { attachedTo: 'mousePointer', placementType: 'AbilityBodyMod-Teleport', owner: ig.game.player, rangelimit: 400, visualEffects: { onCreate: 0, onDeath: 0 } } }, 
                imgsrc: "media/design/Animation_mrl.gif",
            }
            var ability09 = {
                name: "Defense Drone",
                desc: 'The JMYs defense drone provides excellent cover for an area, and the JMYs passive healing and armor regen make it a valuable ally.',
                id: 8,
                cooldown: 45,
                occurence: { type: 'triggered', effecttime: 1, ticks: 0, totalticks: 1 },
                triggerEvent: { type: 'active', source: 'key' },
                initial: { targets:['Self'], effects:['entity']},
                passive: { enabled: true, targets: ['Self','Ally'], effects: ['statstomod'], effecttime: 5 },
                persistance: null,
                target: { etype: ['Self','Ally'], ents: new Array(), source: 'self', value: 300 },
                visualEffect: 0,
                tilesetmod: [],
                projectile: {},
                statstomod: [{ stat: 'regen', value: 5, secondsDuration: 5 }, { stat: 'armor', value: 8, secondsDuration: 5 }],
                entityCreate: { type: 'EntityTurret', settings: {owner:ig.game.player} },
                entityTarget: null,
                bodymod: [],
                placementEnt: { ent: 'EntityPlacement', settings: { size:{x:32,y:32},attachedTo: 'mousePointer', placementType: 'AbilityCreateEnt-Turret', owner: ig.game.player, rangelimit: 200 } }, 
                imgsrc: "media/design/Animation_jmy.gif",
            }
            this.abilityArray.push(ability01);
            this.abilityArray.push(ability02);
            this.abilityArray.push(ability03);
            this.abilityArray.push(ability04);
            this.abilityArray.push(ability05);
            this.abilityArray.push(ability06);
            this.abilityArray.push(ability07);
            this.abilityArray.push(ability08);
            this.abilityArray.push(ability09);
        },
        eyeCandyDBcreate: function () {
            var eyecandy00 = {
                name: 'ec_ability_blink',
                size: { x: 128, y: 128 },
                gravityFactor: 0,
                type: ig.Entity.TYPE.NONE,
                checkAgainst: ig.Entity.TYPE.NONE,
                collides: ig.Entity.COLLIDES.NEVER,
                animSheet: new ig.AnimationSheet('media/ability_effect_blink2.png', 128, 128),
                zIndex: 800,
                tileSeries: [0,1,2],
                lifespan: 1,
                lifeTimer: null,
                endloopanim: false,
                setAlpha: 1,
                frameTime: .33,
            }
            var eyecandy01 = {
                name: 'ec_ability_overkill',
                size: { x: 32, y: 24 },
                gravityFactor: 0,
                type: ig.Entity.TYPE.NONE,
                checkAgainst: ig.Entity.TYPE.NONE,
                collides: ig.Entity.COLLIDES.NEVER,
                animSheet: new ig.AnimationSheet('media/ability_effect_overkill.png', 32, 24),
                zIndex: 800,
                tileSeries: [0, 1, 2],
                lifespan: 3,
                lifeTimer: null,
                endloopanim: false,
                setAlpha: 1,
                frameTime: .33,
            }
            var eyecandy02 = {
                name: 'ec_ability_hulldown',
                size: { x: 128, y: 64 },
                gravityFactor: 0,
                type: ig.Entity.TYPE.NONE,
                checkAgainst: ig.Entity.TYPE.NONE,
                collides: ig.Entity.COLLIDES.NEVER,
                animSheet: new ig.AnimationSheet('media/ability_effect_gladiator.png', 128, 64),
                zIndex: 800,
                tileSeries: [0, 1, 2, 3, 4],
                lifespan: 10,
                lifeTimer: null,
                endloopanim: false,
                setAlpha: 1,
                frameTime: .25,
            }
            var eyecandy03 = {
                name: 'ec_ability_artillery',
                size: { x: 128, y: 64 },
                gravityFactor: 0,
                type: ig.Entity.TYPE.NONE,
                checkAgainst: ig.Entity.TYPE.NONE,
                collides: ig.Entity.COLLIDES.NEVER,
                animSheet: new ig.AnimationSheet('media/ability_effect_defender.png', 128, 64),
                zIndex: 800,
                tileSeries: [0, 1, 2, 3, 4, 5,6,7,8],
                lifespan: 5,
                lifeTimer: null,
                endloopanim: false,
                setAlpha: 1,
                frameTime: .28,
            }
            var eyecandy04 = {
                name: 'ec_ability_rhinocharge',
                size: { x: 128, y: 64 },
                gravityFactor: 0,
                type: ig.Entity.TYPE.NONE,
                checkAgainst: ig.Entity.TYPE.NONE,
                collides: ig.Entity.COLLIDES.NEVER,
                animSheet: new ig.AnimationSheet('media/ability_effect_rhino.png', 128, 64),
                zIndex: 800,
                tileSeries: [0, 1, 2, 3],
                lifespan: 5,
                lifeTimer: null,
                endloopanim: false,
                setAlpha: 1,
                frameTime: .25,
            }
            var eyecandy05 = {
                name: 'ec_ability_chaostheory',
                size: { x: 128, y: 64 },
                gravityFactor: 0,
                type: ig.Entity.TYPE.NONE,
                checkAgainst: ig.Entity.TYPE.NONE,
                collides: ig.Entity.COLLIDES.NEVER,
                animSheet: new ig.AnimationSheet('media/ability_effect_backjack.png', 128, 64),
                zIndex: 800,
                tileSeries: [0, 1, 2, 3,4],
                lifespan: 5,
                lifeTimer: null,
                endloopanim: false,
                setAlpha: 1,
                frameTime: .20,
            }
            var eyecandy06 = {
                name: 'ec_ability_rocketbarrage',
                size: { x: 128, y: 64 },
                gravityFactor: 0,
                type: ig.Entity.TYPE.NONE,
                checkAgainst: ig.Entity.TYPE.NONE,
                collides: ig.Entity.COLLIDES.NEVER,
                animSheet: new ig.AnimationSheet('media/ability_effect_patton.png', 128, 64),
                zIndex: 800,
                tileSeries: [0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1],
                lifespan: 6,
                lifeTimer: null,
                endloopanim: false,
                setAlpha: 1,
                frameTime: .16,
            }
            this.eyeCandyDBArray.push(eyecandy00);
            this.eyeCandyDBArray.push(eyecandy01);
            this.eyeCandyDBArray.push(eyecandy02);
            this.eyeCandyDBArray.push(eyecandy03);
            this.eyeCandyDBArray.push(eyecandy04);
            this.eyeCandyDBArray.push(eyecandy05);
            this.eyeCandyDBArray.push(eyecandy06);
        }
    });

});

