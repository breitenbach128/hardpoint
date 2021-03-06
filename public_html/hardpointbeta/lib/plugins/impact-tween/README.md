Impact Tween
============

#### Entity Tweening Plugin for the Impact Game Engine ####

Impact Tween is a plugin for the [ImpactJS game engine](http://www.impactjs.com).
It allows you to add any number of tweens to an entity, each modifying any
number of that entities numeric properties in the specified manner. A tween
is an operation which modifies one or more properties to target values over a
defined span of time. If you've used flash before, you know all about it.

This plugin modifies the base Entity class, adding methods for creating, pausing,
resuming and stopping tweens and including code for automatically handling the
updating of all tweens for any entity. 

### The Basics ###

Copy the `impact-tween` folder into your `lib/plugins/` directory and require
`plugins.impact-tween.tween` in your game class. To add a tween to an entity and 
start it immediately, you would do something like the following:

	myEntity.tween( {pos: {x: 30}}, 2.5 ).start();

This will create a tween on the `myEntity` entity which will cause it's `pos.x` 
property to gradually change to 30 over the course of 2.5 seconds. You can 
specify as many properties in a single tween as you wish. For example:

	myEntity.tween( {pos: {x: 30, y: 100}}, 2.5).start();


When you create a tween, a tween object is actually returned. You do not have
to start a tween immediately. This means you can declare your tweens first
and use or reuse them at any time. Example:

	var myTween = myEntity.tween( {currentAnim: {angle: 2.1}}, 1.0);
	myTween.start();

Here, we created a tween that would cause the entity to rotate to 2.1 radians
over a period of one second and assigned it to `myTween`. This allows us to
start, stop, pause and resume the tween whenever we like.

### Usage ###

Create a tween:

	entity.tween( properties, duration, [settings] );

- **properties**: A javascript object containing properties and values which you would like to tween to.
- **duration**: Number of seconds (in game time) it should take to complete the tween animation.
- **settings**: Optional. A javascript object containing additional options and settings. See Settings section for more info.

Pause a tween:

	tween.pause();

Resume a paused tween:

	tween.resume();

Stop a tween:

	tween.stop( [complete] );

- **complete**: If true, tween will automatically set all properties to their final values.

Pause all tweens on an entity:

	entity.pauseTweens();

Resume all tweens on an entity:

	entity.resumeTweens();

Stop all tweens on an entity:

	entity.stopTweens( [complete] );

- **complete**: If true, all tweens will automatically set all properties to their final values.


Chain a tween:

	tween1.chain( tween2 );

- **tween2**: This tween will automatically start once tween1 has completed.

### Settings ###

- **delay**: Number of seconds to wait before beginning tween once started.
- **easing**: An easing function to be applied to the tween. See Easing below.
- **loop**: Tween will loop according to the specified behavior.
	- **ig.Tween.Loop.Revert**: Properties revert to their original values at the end of the tween and start over.
	- **ig.Tween.Loop.Reverse**: Properties will smoothly reverse from their end values back to the starting values and start over.
- **loopCount**: Number of times to loop. By default, loops will run forever.
- **onComplete**: A function to be called upon completion of the tween.

### Easing ###

A tween can be assigned an easing function which will alter the way in which
the animation is run. For example, you can have your tween start slow and end fast,
or start fast and end slow, or both! If an easing function is not specified, a
linear operation is used by default, meaning the tween smoothly animates from
beginning to end at a consistant speed. There are over 30 easing options available,
so experiment! Heres the list:

- ig.Tween.Easing.Linear.EaseNone
- ig.Tween.Easing.Quadratic.EaseIn
- ig.Tween.Easing.Quadratic.EaseOut
- ig.Tween.Easing.Quadratic.EaseInOut
- ig.Tween.Easing.Cubic.EaseIn
- ig.Tween.Easing.Cubic.EaseOut
- ig.Tween.Easing.Cubic.EaseInOut
- ig.Tween.Easing.Quartic.EaseIn
- ig.Tween.Easing.Quartic.EaseOut
- ig.Tween.Easing.Quartic.EaseInOut
- ig.Tween.Easing.Quintic.EaseIn
- ig.Tween.Easing.Quintic.EaseOut
- ig.Tween.Easing.Quintic.EaseInOut
- ig.Tween.Easing.Sinusoidal.EaseIn
- ig.Tween.Easing.Sinusoidal.EaseOut
- ig.Tween.Easing.Sinusoidal.EaseInOut
- ig.Tween.Easing.Exponential.EaseIn
- ig.Tween.Easing.Exponential.EaseOut
- ig.Tween.Easing.Exponential.EaseInOut
- ig.Tween.Easing.Circular.EaseIn
- ig.Tween.Easing.Circular.EaseOut
- ig.Tween.Easing.Circular.EaseInOut
- ig.Tween.Easing.Elastic.EaseIn
- ig.Tween.Easing.Elastic.EaseOut
- ig.Tween.Easing.Elastic.EaseInOut
- ig.Tween.Easing.Back.EaseIn
- ig.Tween.Easing.Back.EaseOut
- ig.Tween.Easing.Back.EaseInOut
- ig.Tween.Easing.Bounce.EaseIn
- ig.Tween.Easing.Bounce.EaseOut
- ig.Tween.Easing.Bounce.EaseInOut

### Advanced Usage ###

Create a tween on multiple objects and properties:

    var myEntity1 = this.spawnEntity(MyEntity, 0, 0, {}),
        myEntity2 = this.spawnEntity(MyEntity, 100, 20, {}),
        tween = new ig.Tween([myEntity1, myEntity2], [{pos: {x: 100}}, {pos: {x: 0}}], 2.5);
    tween.start();
    
    
### Weltmeister Integration ###

Weltmeister support requires the `impact-leveldata` plugin available on Github:
https://github.com/xdissent/impact-leveldata 

Install the `impact-leveldata` plugin into the `lib/plugins/impact-leveldata` folder.

Load the Weltmeister extension at the bottom of `lib/weltmeister/weltmeister.js`:

    // Load impact-tween plugin
    ig.module('weltmeister.tweening').requires('plugins.impact-tween.weltmeister').defines(function() {});

    var loader = new wm.Loader( wm.Weltmeister, ig.resources );
    loader.load();
    
Add a tween in Weltmeister using the `+` button under the `Tweens` heading. Adjust the settings and name
to your liking, then press `Apply Changes`. Entities can be added to the tween by pressing the spacebar 
or using the `+` button under the `Tween Entities` heading. Add the properties to be tweened and their 
values to the tweened entity using the text inputs.

Add `plugins.impact-tween.game` to your game dependencies and start a tween created in Weltmeister:

    ig.game.namedTweens.myTween.start();
    

### Entities ###

Two additional entity classes are available, `plugins.impact-tween.object-proxy` 
and `plugins.impact-tween.tween-trigger`. An `EntityObjectProxy` instance can be 
used to tween a property on any global javascript object. Set the `target` property
to be a string containing the name of the object to tween, for example `ig.game.screen`
or `ig.music.volume`. Then the object proxy instance can be tweened as if it were 
any other entity.

The `EntityTweenTrigger` entity is used to start a tween when a `ig.Entity.TYPE.A`
entity collides with it. It is based on the `EntityTrigger` example from the 
ImpactJS website. Add the names of the tweens to be triggered as properties on the
tween trigger instance in the form of `target.0`, `target.1`, `target.2` etc.