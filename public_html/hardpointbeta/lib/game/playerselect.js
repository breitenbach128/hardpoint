ig.module(
	'game.playerselect'

)
.requires(
	'impact.game',
	'impact.font',
    'plugins.box2d.game'

)
.defines(function () {

    SelectPlayer = ig.Box2DGame.extend({
        //transitions
        drawTransition: false,
        //Images
        screentext: "",
        abilitytext: "",
        //Typerwriter
        typewriter: false,
        typespeed: 1,//Frames tween character typing
        typecount: 0,
        typeCurrent: 0,
        typeRepeat: false,
        //Weapons
        hardpointsSelected: null,
        playerConfiguration: null,
        //AntiPerks selected.
        antiPerksSelected: new Array(),
        perksSelected: [-1, -1, -1],
        //Chassis Selection
        currentChassis: 0,
        //Navigation Properties
        navigation: { currentPage: 0, pagedesc: ["Next-> Equip", "Next-> Perks", "Start"] },

        //Fonts
        font: new ig.Font('media/04b03.font.png', { borderColor: '#000', borderSize: 1 }),
        font20red: new ig.Font('media/fonts/visitor_s20_red.font.png', { borderColor: '#000', borderSize: 1 }),
        font14white: new ig.Font('media/fonts/visitor_s14_white.font.png', { borderColor: '#000', borderSize: 1 }),
        font16yellow: new ig.Font('media/fonts/visitor_s16_yellow.font.png', { borderColor: '#000', borderSize: 1 }),
        font20white: new ig.Font('media/fonts/visitor_s20_white.font.png', { borderColor: '#000', borderSize: 1 }),
        //Templates
        templatelist: new Array(),
        templateselected: -1,


        init: function () {
            //Sounds
            this.sound_typer =  soundManager.createSound({ id: 'menu_typer', url: './media/sounds/typer1.wav', volume: 5 });
            this.theme =  soundManager.createSound({ id: 'music_setuptheme', url: './media/sounds/Volatile_Reaction_q.mp3', volume: 100 });
            //Storage
            this.gameStorage =  new ig.Storage();

            //Start music
            this.theme.play();
            //Create game Databases
            ig.game.db = new DatabaseReader();
            //Create Useable Copy for player design
            //
            this.hardpointsSelected = ig.copy(ig.game.db.classDbArray[this.currentChassis].hardpoints);
            this.playerConfiguration = ig.copy(ig.game.db.classDbArray);
            var tankMenuParentLeft = (window.innerWidth/2);
            //Set initial positions
            $("#profileButton").css("top", -500 + "px");
            $("#notificationButton").css("top", -500 + "px");
            $("#tankStatsParent").css("top", ($("#canvas").offset().top + 128) + "px");
            $("#tankStatsParent").css("left", (window.innerWidth / 2) + "px");
            $("#chatparent").css("left", "-3000px");
            $("#openChatButton").css("bottom", -1000 + "px");

            $("#selecttanks").css("left", (window.innerWidth / 2 - 512) + "px");

            $("#selecttanks").css("top", (window.innerHeight - 112) + "px");
            $("#selectweapons").css("top", (window.innerHeight - 112) + "px");
            $("#selectperks").css("top", (window.innerHeight - 324) + "px");

            $("#infoboardparent").css("left", (window.innerWidth / 2 - 512) + "px");


            //Save templates button div positioning
            $("#chassisTemplateToggle").css("bottom", 36 + "px");
            $("#chassisTemplateToggle").click(function () {                
                if ($("#chassisTemplateParent").offset().top == '32') {
                    $("#chassisTemplateParent").css("top", -2000 + "px");
                }else{
                    $("#chassisTemplateParent").css("top", 32 + "px");
                }

            });
            
            //This writes the first phrase
            this.screentext = "Select your Chassis. This will determine your basic starting stats.";

            if (!ig.global.tips[6].triggered) {
                ig.game.getTip(6, 32, 32, false);
            }

            //Weapon and Perk DIV setup
            var weaponLoadContent = '';
            $("#weaponloadarea").html(weaponLoadContent)
            for (var w = 0; w < ig.game.db.weaponDbArray.length; w++) {
                var id = "wp" + (w + 1);
                weaponLoadContent += "<div id=\"" + id + "\" weaponID=\"" + w + "\" weapon=\"" + w + "\" class=\"designbarbutton\" style=\"display: inline-block; width: 96px; height: 64px; font-size: 10px;background: url('media/weapons64.png') 0 " + (-64 * w) + "px\">" + " " + "</div>";
            }
            $("#weaponloadarea").html(weaponLoadContent)


            for (var w = 0; w < ig.game.db.weaponDbArray.length; w++) {
                var id = "#wp" + (w + 1);
                $(id).draggable({
                    helper: "clone",
                    containment: 'window',
                    scroll: false
                });

            }
            //Load Random Perks
            //Need to splice out chosen perks out of the list.
            var rperklist = new Array();
            var perkIndexMax = ig.game.db.perkDbArray.length;
            for (var p = 0; p < perkIndexMax; p++) {
                rperklist.push(p);
                
            }
            //Insert random perks
            for (s = 0; s < 3; s++) {
                var takePerk = (Math.floor(Math.random() * (rperklist.length - (-0)) + (-0)));                
                this.perksSelected[s] = rperklist[takePerk];
                
                rperklist.splice(takePerk, 1);

                

                c = ((this.perksSelected[s] + 1) % 4) - 1;//
                r = Math.floor(this.perksSelected[s] / 4);
                //console.log("perk1 dropped box:" + ig.game.db.perkDbArray[id].name + " id:" + id + " c:" + c + " r:" + r);
                var divstring = "<div data-title=\"" + ig.game.db.perkDbArray[this.perksSelected[s]].name + "\" style=\"font-size: 10px;height: 64px; width: 64px; background: url('media/antiperksx64.png') " + (-64 * c) + "px " + (-64 * r) + "px;\" ></div>";
                $("#perkselected" + (s + 1)).html(divstring);
            }

            //Now, do the same thing for perks. Use the function to refresh each time I drop one. When I generate, only generate for ones I do not have selected.
            this.generatePerkHtml();
            $("#perkselected1").droppable({
                drop: function (event, ui) {
                    //Does the currently selected chassis suppport this hardpoint?                    
                    //ig.game.pselect.chassisEquip(this, ui);
                    if ((ui.draggable.attr("perkid")) != undefined) {
                        var id = parseInt(ui.draggable.attr("perkid"));
                        c = ((id + 1) % 4) - 1;//
                        r = Math.floor(id / 4);
                        ig.game.pselect.perksSelected[0] = id;
                        //console.log("perk1 dropped box:" + ig.game.db.perkDbArray[id].name + " id:" + id + " c:" + c + " r:" + r);
                        var divstring = "<div data-title=\"" + ig.game.db.perkDbArray[id].name + "\" style=\"font-size: 10px;height: 64px; width: 64px; background: url('media/antiperksx64.png') " + (-64 * c) + "px " + (-64 * r) + "px;\" ></div>";
                        $(this).html(divstring);
                        ig.game.generatePerkHtml();
                    }

                }
            });
            $("#perkselected1").click(function () {
                ig.game.pselect.perksSelected[0] = -1;
                $(this).html("");
                ig.game.generatePerkHtml();
            });

            $("#perkselected2").droppable({
                drop: function (event, ui) {
                    //Does the currently selected chassis suppport this hardpoint?                    
                    //ig.game.pselect.chassisEquip(this, ui);
                    if ((ui.draggable.attr("perkid")) != undefined) {
                        var id = parseInt(ui.draggable.attr("perkid"));
                        c = ((id + 1) % 4) - 1;//
                        r = Math.floor(id / 4);
                        ig.game.pselect.perksSelected[1] = id;
                        var divstring = "<div data-title=\"" + ig.game.db.perkDbArray[id].name + "\" style=\"font-size: 10px;height: 64px; width: 64px; background: url('media/antiperksx64.png') " + (-64 * c) + "px " + (-64 * r) + "px;\" ></div>";
                        $(this).html(divstring);
                        ig.game.generatePerkHtml();
                    }

                }
            });
            $("#perkselected2").click(function () {
                ig.game.pselect.perksSelected[1] = -1;
                $(this).html("");
                ig.game.generatePerkHtml();
            });
            $("#perkselected3").droppable({
                drop: function (event, ui) {
                    //Does the currently selected chassis suppport this hardpoint?                    
                    //ig.game.pselect.chassisEquip(this, ui);
                    if ((ui.draggable.attr("perkid")) != undefined) {
                        var id = parseInt(ui.draggable.attr("perkid"));
                        c = ((id + 1) % 4) - 1;//
                        r = Math.floor(id / 4);
                        ig.game.pselect.perksSelected[2] = id;
                        var divstring = "<div data-title=\"" + ig.game.db.perkDbArray[id].name + "\" style=\"font-size: 10px;height: 64px; width: 64px; background: url('media/antiperksx64.png') " + (-64 * c) + "px " + (-64 * r) + "px;\" ></div>";
                        $(this).html(divstring);
                        ig.game.generatePerkHtml();
                    }
                }
            });
            $("#perkselected3").click(function () {
                ig.game.pselect.perksSelected[2] = -1;
                $(this).html("");
                ig.game.generatePerkHtml();
            });


            //Load initial template listing
            this.listTemplates();
            this.inittemplatebuttons();
            
            ig.game.mousePointer = ig.game.spawnEntity(EntityPointer, 0, 0, {});

            var sceneparent = this;
            ig.game.pselect = this;
            
            //Initial Chassis Display
            this.refreshChassis();

            //Add click listener for bars
            //Tank chassis select click
            $(".designbarbutton").click(function () {
                var prevselected = $(".designbarbuttonselected");
                if (prevselected != null && prevselected != undefined) {
                    prevselected.removeClass();
                    prevselected.addClass("designbarbutton");
                }

                $(this).removeClass();
                $(this).addClass("designbarbuttonselected");

                //if ($(this).data('draggable')) {
                //    console.log($(this).attr("id") + "is draggable");
                //} else {
                //    console.log($(this).attr("id") + "is NOT draggable");
                //}

                //is it a tank, weapon or perk bar item?
                if ($(this).attr("tank") != undefined) {

                    ig.global.class = parseInt($(this).attr("tank"));
                    sceneparent.currentChassis = parseInt($(this).attr("tank"));
                    sceneparent.makeChassisButton();
                    sceneparent.refreshChassis()
                    
                } else if ($(this).attr("weapon") != undefined) {
                    $("#chassisEquipInfo").html("<div style=\"height: 280px;font-size:18px;\"><span style=\"font-size:32px;\">" + ig.game.db.weaponDbArray[parseInt($(this).attr("weapon"))].name + "</span> : " + ig.game.db.weaponDbArray[parseInt($(this).attr("weapon"))].desc + "</div>");
                    $("#chassisEquipInfo").append("<br><div style=\"text-align:center;height: 300px;width: 100%;\"><img src=\"" + ig.game.db.weaponDbArray[parseInt($(this).attr("weapon"))].imgsrc + "\" height=\"160\" width=\"240\" style=\"display:inline-block;border:1px solid black;position: relative;top: 25%;transform: translateY(0 ,-50%);\" /></div>");
                } else if ($(this).attr("perk") != undefined) {

                }
            });
            $(".designbarbutton").draggable({
                helper: "clone",
                containment: 'window',
                scroll: false
            });

            //Add hover stat information for bars.
            $(".tankstatbar1").hover(
              function () {
                  var offset = $(this).offset();
                  $("#infowindow").offset({ top: offset.top - 8 - (event.pageY - offset.top), left: offset.left + 16 + (event.pageX - offset.left) })
                  $("#infowindow").html($(this).attr("info"));
              }, function () {
                  var offset = $(this).offset();
                  $("#infowindow").offset({ left: -2000 });
                  $("#infowindow").html("");

              }
            );

            //Make button for class select
            this.chassis = ig.game.spawnEntity(Button, ig.system.width / 2 - 64, 264, {
                size: { x: 128, y: 64 },
                animSheet: new ig.AnimationSheet('media/tankchass_sheet2.png', 128, 64),
                font: new ig.Font('media/04b03.font.png'),
                text: [""],
                zIndex: 800,
                tileSeries: [9, 10, 11],
                ignorePause: true,
                tooltip: " " + ig.game.db.classDbArray[this.currentChassis].classType,
                pressedUp: function () {
                    ig.game.pselect.typeCurrent = 0;
                    ig.global.class = sceneparent.currentChassis;
                    sceneparent.screentext = ig.game.db.classDbArray[sceneparent.currentChassis].classType + ": " + ig.game.db.classDbArray[sceneparent.currentChassis].desc;
                    sceneparent.abilitytext = ig.game.db.abilityArray[sceneparent.currentChassis].name + ": " + ig.game.db.abilityArray[sceneparent.currentChassis].desc;                    
                    sceneparent.refreshChassis();
                },
            });
            this.readyButton = ig.game.spawnEntity(Button, ig.system.width - 96, (ig.system.height / 2) + 16, {
                size: { x: 64, y: 32 },
                animSheet: new ig.AnimationSheet('media/brickbutton1.png', 64, 32),
                font: new ig.Font('media/04b03.font.png'),
                fontsize: 8,
                text: ["Next-> Equip"],
                zIndex: 800,
                tileSeries: [0, 1, 2],
                ignorePause: true,
                tooltip: "",
                pressedUp: function () {
                    sceneparent.navigation.currentPage++;
                    sceneparent.abilitytext = "";

                    if (sceneparent.navigation.currentPage == 3) {
                        //Start Game      
                        sceneparent.loadPageClearAll();
                        ig.global.class = sceneparent.playerConfiguration[sceneparent.currentChassis];                       

                        
                        for (var p = 0; p < ig.game.pselect.perksSelected.length; p++) {
                            if (ig.game.pselect.perksSelected[p] != -1) {
                                ig.global.perks.push(ig.game.pselect.perksSelected[p]);
                            }
                        }
                        sceneparent.drawTransition = true;
                        sceneparent.transitionTimer.set(2);
                        //Set loading screen
                        randomQuote();
                        $("#loadingscreen").css({
                            left: "0px"
                        });
                    } else if (sceneparent.navigation.currentPage == 2) {
                        //Perk Page                       
                        sceneparent.loadPagePerkSelection();
                        ig.game.getTip(7, 32, 32, true);
                        this.cnvtext.settext(sceneparent.navigation.pagedesc[sceneparent.navigation.currentPage]);


                        sceneparent.chassis.pos = { x: -100, y: -100 };
                        
                        
                    } else if (sceneparent.navigation.currentPage == 1) {
                        //Equipment Page
                        if (!ig.global.tips[4].triggered) {
                            ig.game.getTip(4, 32, 32, false);
                        }
                        sceneparent.loadPageWeaponSelection();
                        
                        //$("#weaponInventory").css("top", "-1000px");
                        //$("#perkInventory").css("top", "2000px");

                        this.cnvtext.settext(sceneparent.navigation.pagedesc[sceneparent.navigation.currentPage]);
                        
                        
                    }
                    
                }
            });
            this.backButton = ig.game.spawnEntity(Button, 32, (ig.system.height / 2) + 16, {
                size: { x: 64, y: 32 },
                animSheet: new ig.AnimationSheet('media/brickbutton1.png', 64, 32),
                font: new ig.Font('media/04b03.font.png'),
                fontsize: 8,
                text: ["BACK"],
                zIndex: 800,
                tileSeries: [0, 1, 2],
                ignorePause: true,
                tooltip: "",
                pressedUp: function () {
                    sceneparent.navigation.currentPage--;

                    if (sceneparent.navigation.currentPage == 1) {
                        //Weapon Page
                        sceneparent.loadPageWeaponSelection();
                        sceneparent.chassis.pos = { x: -100, y: -100 };
                        sceneparent.readyButton.cnvtext.settext(sceneparent.navigation.pagedesc[sceneparent.navigation.currentPage]);

                        
                    } else if (sceneparent.navigation.currentPage == 0) {
                        //Tank Page
                        sceneparent.loadPageTankSelection();
                        sceneparent.chassis.pos = { x: ig.system.width / 2 - 32, y: 264 };

                        sceneparent.readyButton.cnvtext.settext(sceneparent.navigation.pagedesc[sceneparent.navigation.currentPage]);
                        

                    } else if (sceneparent.navigation.currentPage <= 0) {
                        //Return to main screen
                        sceneparent.loadPageClearAll();
                        $("#chassisTemplateParent").css("top", "-1000px");
                        $("#chassisTemplateToggle").css("bottom", -1000 + "px");
                        if (this.theme != undefined) { this.theme.stop(); }
                        //Set loading screen
                        randomQuote();
                        $("#loadingscreen").css({
                            left: "0px"
                        });
                        ig.system.setGame(MyGame);
                        
                        
                    }
                    


                }
            });
            
            //Create antiperk buttons. When clicked and action, they create marked box next to them.
            ig.game.sortEntitiesDeferred();//Resort the entities

            //Transition Timer for DIV 1s Easeout Rollout
            this.transitionTimer = new ig.Timer(2);
            this.transitionTimer.pause();
            
            //finished init, so remove loading screen transition
            $("#loadingscreen").css({
                left: "-3000px"
            });
        },
        loadPageClearAll: function(){
            $("#selectweapons").css("left", (-3000) + "px");
            $("#selectperks").css("left", (-3000) + "px");
            $("#selecttanks").css("left", (-3000) + "px");
            $("#tankStatsParent").css("left", "3000px");
            $("#infoboardparent").css("left", (-3000) + "px");
            $("#tankmenuparent").css("left", (-3000) + "px");
            $("#perkboardparent").css("left", (-3000) + "px");

        },
        loadPageTankSelection: function(){
            $("#selectweapons").css("left", (-3000) + "px");
            $("#selectperks").css("left", (-3000) + "px");
            $("#selecttanks").css("left", (window.innerWidth / 2 - 512) + "px");
            $("#tankStatsParent").css("left", "3000px");
            $("#infoboardparent").css("left", (window.innerWidth / 2 - 512) + "px");
            $("#tankmenuparent").css("left", (-3000) + "px");
            $("#perkboardparent").css("left", (-3000) + "px");
        },
        loadPageWeaponSelection: function(){
            $("#selecttanks").css("left", (-3000) + "px");
            $("#selectperks").css("left", (-3000) + "px");
            $("#selectweapons").css("left", (window.innerWidth / 2 - 512) + "px");
            $("#tankmenuparent").css("left", (window.innerWidth / 2 - 512) + "px");
            $("#infoboardparent").css("left", (-3000) + "px");
            $("#perkboardparent").css("left", (-3000) + "px");

        },
        loadPagePerkSelection: function(){
            $("#selecttanks").css("left", (-3000) + "px");
            $("#selectweapons").css("left", (-3000) + "px");
            $("#selectperks").css("left", (window.innerWidth / 2 - 256) + "px");
            $("#tankmenuparent").css("left", (-3000) + "px");
            $("#infoboardparent").css("left", (-3000) + "px");
            $("#perkboardparent").css("left", (window.innerWidth / 2 - 512) + "px");
            
        },
        makeChassisButton: function () {
            var sceneparent = this;
            this.chassis.kill();
            var index = (this.currentChassis + 1) * 9;
            
            
            this.chassis = ig.game.spawnEntity(Button, ig.system.width / 2 - 64, 264, {
                size: { x: 128, y: 64 },
                animSheet: new ig.AnimationSheet('media/tankchass_sheet2.png', 128, 64),
                font: new ig.Font('media/04b03.font.png'),
                text: [""],
                zIndex: 800,
                tileSeries: [index, index+1, index+2],
                ignorePause: true,
                tooltip: " " + ig.game.db.classDbArray[this.currentChassis].classType,
                pressedUp: function () {
                    ig.game.pselect.typeCurrent = 0;
                    ig.global.class = sceneparent.currentChassis;
                    sceneparent.screentext = ig.game.db.classDbArray[sceneparent.currentChassis].classType + ": " + ig.game.db.classDbArray[sceneparent.currentChassis].desc;
                    sceneparent.abilitytext = ig.game.db.abilityArray[sceneparent.currentChassis].name + ": " + ig.game.db.abilityArray[sceneparent.currentChassis].desc;
                    sceneparent.refreshChassis();
                },
            });
        },
        update: function(){
            this.parent()
            this.chassis.currentAnim.angle += Math.PI / 9 * ig.system.tick;
            
            if (this.drawTransition) {
                if (this.transitionTimer.delta() >= 0) {
                    if (this.theme != undefined) { this.theme.stop(); }

                    ig.system.setGame(PlayGame);
                    $("#chassisTemplateParent").css("top", "-1000px");
                    $("#chassisTemplateToggle").css("bottom", -1000 + "px");
                }
            }

        },
        draw: function () {
            if (this.drawTransition) {
                ig.system.context.fillStyle = "#000000";
                ig.system.context.fillRect(0, 0, canvas.width, canvas.height); // context.fillRect(x, y, width, height);

            } else {
                this.parent();
                img = new Image();
                img.src = '../hardpoint_b5/media/menubg2.png';
                //var ptrn = ig.system.context.createPattern(img, 'repeat'); // Create a pattern with this image, and set it to "repeat".
                //ig.system.context.fillStyle = ptrn;
                //ig.system.context.fillRect(0, 0, canvas.width, canvas.height); // context.fillRect(x, y, width, height);
                ig.system.context.drawImage(img, 0, 0, canvas.width, canvas.height);

                this.chassis.draw();
                this.backButton.draw();
                this.readyButton.draw();

                ig.game.mousePointer.draw();
                //Draw Section Guide Title
                if (this.navigation.currentPage == 2) {
                    this.font20red.draw("Are you ready? Click next to begin the game", ig.system.width / 2,1, ig.Font.ALIGN.CENTER);
                    //this.font16yellow.draw("A name can be more than just a string of letters.\n Choose wisely.", ig.system.width / 2, 33, ig.Font.ALIGN.CENTER);
                } else if (this.navigation.currentPage == 1) {
                    this.font20red.draw("Equip your tank", ig.system.width / 2, 1, ig.Font.ALIGN.CENTER);
                    this.font14white.draw("Drag a new weapon to replace a current weapon. \n Drag up to three perks into the perk boxes at the bottom. \n Click a weapon or perk to learn more.", ig.system.width / 2, 20, ig.Font.ALIGN.CENTER);
                } else if (this.navigation.currentPage == 0) {
                    this.font20red.draw("Choose your Tank Chassis", ig.system.width / 2, 1, ig.Font.ALIGN.CENTER);
                    this.font14white.draw("Your Chassis determines your basic statistics.\n Click a chassis to learn more.", ig.system.width / 2, 20, ig.Font.ALIGN.CENTER);
                }

                this.font20red.draw(ig.game.db.classDbArray[this.currentChassis].classType, ig.system.width / 2, 280, ig.Font.ALIGN.CENTER);
                
            }

        },
        inittemplatebuttons: function(){
            $("#chassisTemplateSave").click(function () {
                ig.game.saveTemplate();   
            });
            $("#chassisTemplateLoad").click(function () {
                ig.game.loadTemplate(ig.game.templateselected);
            });
            $("#chassisTemplateRemove").click(function () {
                if(ig.game.templateselected != -1 && ig.game.templateselected < ig.game.templatelist.length){
                    ig.game.removeTemplate(ig.game.templateselected);   
                }                
            });
        },
        listTemplates: function(){
            if (this.gameStorage.isSet('templatelist') == true) {
                if(ig.game.templatelist.length == 0){
                    ig.game.templatelist = this.gameStorage.get('templatelist');
                }
                
                //Clear current HTML
                $("#chassistemplatecontent").html("");
                for(var t=0;t < ig.game.templatelist.length;t++){
                    var eledata = "<div style=\"display: table-row; width: 100%;\"><div id=\"savechassis" + t + "\" index=\"" + t + "\" class=\"chassistemplatebtn\" style=\"display:table-cell;\">" + ig.game.templatelist[t].savename + "</div></div>";
                    //Append new element
                    
                    $("#chassistemplatecontent").append(eledata);
                    
                    $("#savechassis"+t).click(function () {
                        var slot = parseInt($(this).attr("index"));
                        ig.game.templateselected = slot;
                        for(var t=0;t < ig.game.templatelist.length;t++){
                           
                            if(slot == t){
                                $("#savechassis"+t).removeClass();
                                $("#savechassis"+t).addClass("chassistemplatebtnSelected");

                            }else{
                                $("#savechassis"+t).removeClass();
                                $("#savechassis"+t).addClass("chassistemplatebtn");
                            }
                        }
                        ig.game.displayTemplateData(slot);
                    });

                    // $("#savechassis"+t).hover(function () {                        
                    //     console.log("savedhover", t);
                    //     ig.game.displayTemplateData(parseInt($(this).attr("index")));
                    // });
                }
            }
        },
        displayTemplateData: function (slot) {
        if (this.gameStorage.isSet('templatelist') == true) {
                var templatelist = this.gameStorage.get('templatelist');//console.log(templateLoaderObj);
                //Load Tank Data
                $("#chassisTemplateDescTank").html(ig.game.db.classDbArray[templatelist[slot].playerClass].classType);
                //Load Weapon Data
                var disWeapons = templatelist[slot].playerWeapons;
                var weapNames = "";
                for (var w = 0; w < disWeapons.length; w++) {
                    weapNames += ig.game.db.weaponDbArray[disWeapons[w].wpid].name + "<br>";
                }
                $("#chassisTemplateDescWeapons").html(weapNames);
                //Load Perk Data
                var disPerks = templatelist[slot].playerPerks;
                var perkNames = "";
                for (var p = 0; p < disPerks.length; p++) {
                    if (disPerks[p] != -1) {
                        perkNames += ig.game.db.perkDbArray[disPerks[p]].name + "<BR>";
                    }
                }
                $("#chassisTemplateDescPerks").html(perkNames);
            }
        },
        removeTemplate: function(slot){
            this.templatelist.splice(slot,1);
            ig.game.gameStorage.set('templatelist', this.templatelist);
            this.listTemplates();
            //Clear settings HTML for display data as well
            for(var t=0;t < ig.game.templatelist.length;t++){
                $("#savechassis"+t).removeClass();
                $("#savechassis"+t).addClass("chassistemplatebtn");                
            }
            ig.game.templateselected = -1;
            //Clear HTML data
            $("#chassisTemplateDescTank").html("");
            $("#chassisTemplateDescPerks").html("");
            $("#chassisTemplateDescWeapons").html("");
        },
        saveTemplate: function(){
            this.templatelist.push(
                {
                savename: $("#chassisTemplateSaveName").val(),
                playerPerks: this.perksSelected,//perk array
                playerClass: this.currentChassis,//Player class Index
                playerWeapons: this.playerConfiguration[this.currentChassis].hardpoints,
                }  
            );
            ig.game.gameStorage.set('templatelist', this.templatelist);
            this.listTemplates();
        },
        loadTemplate: function (slot) {
            if (slot != -1) {
                if (this.gameStorage.isSet('templatelist') == true) {
                    var templatelist = this.gameStorage.get('templatelist');//console.log(templateLoaderObj);

                    this.perksSelected = templatelist[slot].playerPerks;
                    this.currentChassis = templatelist[slot].playerClass;
                    this.playerConfiguration[this.currentChassis].hardpoints = templatelist[slot].playerWeapons;
                    //Update perk information
                    for (var p = 0; p < this.perksSelected.length; p++) {
                        if (this.perksSelected[p] != -1) {
                            id = this.perksSelected[p];
                            c = ((id + 1) % 4) - 1;//
                            r = Math.floor(id / 4);
                            var divstring = "<div data-title=\"" + ig.game.db.perkDbArray[id].name + "\" style=\"font-size: 10px;height: 64px; width: 64px; background: url('media/antiperksx64.png') " + (-64 * c) + "px " + (-64 * r) + "px;\" ></div>";
                            $("#perkselected" + (p + 1)).html(divstring);
                        }
                    }

                    //Update HTML and display information
                    this.makeChassisButton();
                    this.refreshChassis();
                    ig.game.generatePerkHtml();
                }
            }
        },
        generatePerkHtml: function () {


            var perksAvailable = new Array();
            for (var w = 0; w < ig.game.db.perkDbArray.length; w++) {
                if (w != this.perksSelected[0] && w != this.perksSelected[1] && w != this.perksSelected[2]) {
                    perksAvailable.push(ig.game.db.perkDbArray[w]);
                }
            }

            //Update for total bonuses
            $("#perkboardinfobonuses").html("Current Bonuses: <br>");
            for (var p = 0; p < this.perksSelected.length; p++) {
                if (this.perksSelected[p] != -1) {
                    $("#perkboardinfobonuses").append("<li>" + ig.game.db.perkDbArray[this.perksSelected[p]].summary + "</li>");
                } else {
                    $("#perkboardinfobonuses").append("<li>" + "No Bonus Taken" + "</li>");
                }
            }
 

            //New DIV setup
            var perkLoadContent = '';
            $("#perkloadarea").html(perkLoadContent)
            for (var w = 0; w < perksAvailable.length; w++) {
                var id = "perk" + (perksAvailable[w].id);
                c = ((perksAvailable[w].id + 1) % 4) - 1;//
                r = Math.floor(perksAvailable[w].id / 4);

                perkLoadContent += "<div id=\"" + id + "\" perkid=\"" + perksAvailable[w].id + "\" perk=\"" + perksAvailable[w].id + "\" class=\"designbarbutton\" style=\"display: inline-block; width: 64px; height: 64px; font-size: 10px;background: url('media/antiperksx64.png') " + (-64 * c) + "px " + (-64 * r) + "px;\">" + " " + "</div>";
            }
            $("#perkloadarea").html(perkLoadContent)
            for (var w = 0; w < perksAvailable.length; w++) {
                var id = "#perk" + (perksAvailable[w].id);
                $(id).draggable({
                    helper: "clone",
                    containment: 'window',
                    scroll: false
                });
                $(id).click(function () {
                    if (ig.game.pselect != undefined) {
                        var index = parseInt($(this).attr("perkid"));
                        ig.game.pselect.typeCurrent = 0;
                        ig.game.pselect.screentext = ig.game.db.perkDbArray[index].name + " : " + ig.game.db.perkDbArray[index].desc;
                        $("#perkboardinfopanel").html("<span style=\"font-size:24px;text-align:left;\">" + ig.game.db.perkDbArray[index].name + " </span>: " + ig.game.db.perkDbArray[index].desc);
                        var prevselected = $(".designbarbuttonselected");
                        if (prevselected != null && prevselected != undefined) {
                            prevselected.removeClass();
                            prevselected.addClass("designbarbutton");
                        }

                        $(this).removeClass();
                        $(this).addClass("designbarbuttonselected");
                    }
                });
            }

        },
        typer: function (text) {
            if (this.typeCurrent < text.length) {
                if (this.typecount < this.typespeed) {
                    this.typecount++;
                } else {
                    this.typecount = 0;
                    this.typeCurrent++;
                    //this.sound_typer.play();
                }
            } else {
                if (this.typeRepeat) {
                    this.typecount = 0;
                    this.typeCurrent = 0;
                }
            }

            return text.substring(0,this.typeCurrent);
        },
        refreshChassis: function () {
            //update chassis stats
            $("#tankChassisStat_Hull").css("width", (ig.game.db.classDbArray[this.currentChassis].hp / 5) + "px");
            $("#tankChassisStat_MoveSpeed").css("width", (ig.game.db.classDbArray[this.currentChassis].movespeed * 10) + "px");
            $("#tankChassisStat_Reverse").css("width", (ig.game.db.classDbArray[this.currentChassis].reversespeed * 100) + "px");
            $("#tankChassisStat_Optics").css("width", (ig.game.db.classDbArray[this.currentChassis].optics / 4) + "px");
            $("#tankChassisStat_Stealth").css("width", (ig.game.db.classDbArray[this.currentChassis].stealth / 8) + "px");
            $("#tankChassisStat_arf").css("width", (ig.game.db.classDbArray[this.currentChassis].armor.f * 50) + "px");
            $("#tankChassisStat_arl").css("width", (ig.game.db.classDbArray[this.currentChassis].armor.l * 50) + "px");
            $("#tankChassisStat_arr").css("width", (ig.game.db.classDbArray[this.currentChassis].armor.r * 50) + "px");
            $("#tankChassisStat_arb").css("width", (ig.game.db.classDbArray[this.currentChassis].armor.b * 50) + "px");
            //update hardpoints
            for (var i = 0; i < ig.global.hardpointPositions.length; i++) {
                this.hardpointStatsCreateDiv(ig.global.hardpointPositions[i])
            }
            //
            $("#infoboardleftpanel").html("<span style=\"font-size:24px;\">" + ig.game.db.classDbArray[this.currentChassis].classType + "</span>: " + ig.game.db.classDbArray[this.currentChassis].desc);
            $("#infoboardrightpanel").html("<span style=\"font-size:24px;\">" + ig.game.db.abilityArray[this.currentChassis].name + "</span>: <hr />" + ig.game.db.abilityArray[this.currentChassis].desc);
            
            $("#inforboardabilityimage").attr("src", ig.game.db.abilityArray[this.currentChassis].imgsrc );
        },
        hardpointStatsCreateDiv: function (hpStatObj) {
            var hardpointDivID = hpStatObj.name.substring(1);
            var checkForHardPointExistsIndex = this.playerConfiguration[this.currentChassis].hardpoints.map(function (e) { return e.location; }).indexOf(hardpointDivID);
            //console.log("Check " + hardpointDivID + " result " + checkForHardPointExistsIndex + " JSON : " + JSON.stringify(this.playerConfiguration[this.currentChassis].hardpoints));
            
            

            var divDamageId = "#" + hardpointDivID + "damage";
            var divRateOfFireId = "#" + hardpointDivID + "rof";
            var divAmmoId = "#" + hardpointDivID + "ammo";
            var divReloadId = "#" + hardpointDivID + "reload";

            var divDamageIdBG = "#" + hardpointDivID + "damageBG";
            var divRateOfFireIdBG = "#" + hardpointDivID + "rofBG";
            var divAmmoIdBG = "#" + hardpointDivID + "ammoBG";
            var divReloadIdBG = "#" + hardpointDivID + "reloadBG";

            //var htmlString = hardpointDivID + "<div id=\"" + hardpointDivID + "orders\" class=\"tankhardpointorders\" style=\"position:relative; top:24px;right: 12px; height: 16px; width: 16px; background: url('media/action_icons.png') 0 0; \" title=\"empty\"></div>";
            var htmlString = "<div id=\"" + hardpointDivID + "damageBG\" class=\"tankmenuhardpointStatBarBackground\" >Damage</div><div id=\"" + hardpointDivID + "damage\" class=\"tankmenuhardpointdamage\"></div>"
            htmlString += "<div id=\"" + hardpointDivID + "rofBG\" class=\"tankmenuhardpointStatBarBackground\" >Rate of Fire</div><div id=\"" + hardpointDivID + "rof\" class=\"tankmenuhardpointrof\"></div>"
            htmlString += "<div id=\"" + hardpointDivID + "ammoBG\" class=\"tankmenuhardpointStatBarBackground\" >Magazine Size</div><div id=\"" + hardpointDivID + "ammo\" class=\"tankmenuhardpointammo\"></div>"
            htmlString += "<div id=\"" + hardpointDivID + "reloadBG\" class=\"tankmenuhardpointStatBarBackground\" >Reload Speed</div><div id=\"" + hardpointDivID + "reload\" class=\"tankmenuhardpointreload\"></div>"

            
            $(hpStatObj.name).html(htmlString)
            //Set Backgrounds
            $(divDamageIdBG).css("left", hpStatObj.x + "px");
            $(divRateOfFireIdBG).css("left", hpStatObj.x + "px");
            $(divAmmoIdBG).css("left", hpStatObj.x + "px");
            $(divReloadIdBG).css("left", hpStatObj.x + "px");

            $(divDamageIdBG).css("top", hpStatObj.y + "px");
            $(divRateOfFireIdBG).css("top", (hpStatObj.y - 10) + "px");
            $(divAmmoIdBG).css("top", (hpStatObj.y - 20) + "px");
            $(divReloadIdBG).css("top", (hpStatObj.y - 30) + "px");
            //Set Bars
            $(divDamageId).css("left", (hpStatObj.x+1) + "px");
            $(divRateOfFireId).css("left", (hpStatObj.x + 1) + "px");
            $(divAmmoId).css("left", (hpStatObj.x + 1) + "px");
            $(divReloadId).css("left", (hpStatObj.x + 1) + "px");

            $(divDamageId).css("top", (hpStatObj.y - 11) + "px");
            $(divRateOfFireId).css("top", (hpStatObj.y - 21) + "px");
            $(divAmmoId).css("top", (hpStatObj.y - 31) + "px");
            $(divReloadId).css("top", (hpStatObj.y - 41) + "px");

            if (checkForHardPointExistsIndex != -1) {
                $(hpStatObj.name).droppable({
                    drop: function (event, ui) {
                        //Does the currently selected chassis suppport this hardpoint?   
                        if ((ui.draggable.attr("weaponid")) != undefined) {
                            ig.game.pselect.chassisEquip(this, ui);
                        }
                    }
                });
                $(hpStatObj.name).attr("style", "");
                $(hpStatObj.name).removeClass("tankmenuhardpointDisabled");
                $(hpStatObj.name).addClass("tankmenuhardpointEnabled");

                var indexOfImage = parseInt(this.playerConfiguration[this.currentChassis].hardpoints[checkForHardPointExistsIndex].wpid) * -64;
                var wpgroup = this.playerConfiguration[this.currentChassis].hardpoints[checkForHardPointExistsIndex].group;
                this.equipSlotBarRefresh(hardpointDivID, indexOfImage, $(hpStatObj.name), wpgroup);

            } else {
                if ($(hpStatObj.name).data('uiDroppable')) { $(hpStatObj.name).droppable("destroy"); }
                $(hpStatObj.name).attr("style", "");
                $(hpStatObj.name).removeClass("tankmenuhardpointEnabled");
                $(hpStatObj.name).addClass("tankmenuhardpointDisabled");

                $(hpStatObj.name).html(".")
            }

        },
        chassisEquip: function (element, ui) {
            
            var draggableId = ui.draggable.attr("weaponid");
            var droppableId = $(element).attr("id")
            

            //console.log("Currently Equipped:  " + JSON.stringify(this.hardpointsSelected));
            var checkForHardPoint = this.playerConfiguration[this.currentChassis].hardpoints.map(function (e) { return e.location; }).indexOf(droppableId);

            //console.log("Equip: " + checkForHardPoint + " " + droppableId);

            //Set Weapon id of new slot and update
            this.playerConfiguration[this.currentChassis].hardpoints[checkForHardPoint].wpid = draggableId;
            var wpgroup = this.playerConfiguration[this.currentChassis].hardpoints[checkForHardPoint].group;
            this.refreshChassis();
          

            var indexOfImage = parseInt(draggableId) * -64;
            this.equipSlotBarRefresh(droppableId, indexOfImage, element, wpgroup);
        },
        equipSlotBarRefresh: function (droppableId, index, element, group) {

            //Get Weapon Stats
            var weaponstats = ig.game.db.weaponDbArray[(index / -64)];
            var projectileStats = ig.game.db.projectileDbArray[weaponstats.bulletID];

            var reloadspeed = Math.round(((60 - weaponstats.reloadTime) / 60) * 88);
            var rateoffire = Math.round(((300 - weaponstats.rofTime) / 300) * 88);
            var damage = Math.round(((projectileStats.damage.hp) / 200) * 88);
            var magazine = Math.round(((weaponstats.ammoMax) / 150) * 88);

            $(element).css("background", "url('media/weapons64.png') 0 " + index + "px");
            if (group == 1) {
                $(element).html("<img src=\"media/mouse1Icon.png\" />");
            } else {
                $(element).html("<img src=\"media/mouse2Icon.png\" />");
            }

            var droppableDamageId = "#" + droppableId + "damage";
            var droppableRofId = "#" + droppableId + "rof";
            var droppableAmmoId = "#" + droppableId + "ammo";
            var droppableReloadId = "#" + droppableId + "reload";
            $(droppableDamageId).css("border", "solid #000000 2px");
            $(droppableRofId).css("border", "solid #000000 2px");
            $(droppableAmmoId).css("border", "solid #000000 2px");
            $(droppableReloadId).css("border", "solid #000000 2px");
            $(droppableDamageId).css("transition", ".01s ease-out");
            $(droppableRofId).css("transition", ".01s ease-out");
            $(droppableAmmoId).css("transition", ".01s ease-out");
            $(droppableReloadId).css("transition", ".01s ease-out");
            $(droppableDamageId).css("width", "0px");
            $(droppableRofId).css("width", "0px");
            $(droppableAmmoId).css("width", "0px");
            $(droppableReloadId).css("width", "0px");
            setTimeout(function () {
                $(droppableDamageId).css("transition", "1s ease-out");
                $(droppableRofId).css("transition", "1s ease-out");
                $(droppableAmmoId).css("transition", "1s ease-out");
                $(droppableReloadId).css("transition", "1s ease-out");
                $(droppableDamageId).css("width", damage + "px");
                $(droppableRofId).css("width", rateoffire + "px");
                $(droppableAmmoId).css("width", magazine + "px");
                $(droppableReloadId).css("width", reloadspeed + "px");
            }, 500);
        },
        getTip: function (tipid, x, y, browsing) {
            if (ig.global.tipsEnabled.current) {
                
                ig.global.currentTip = tipid;
                if (ig.global.tips[tipid].triggered == false || browsing) {
                    ig.global.tips[tipid].triggered = true;
                    //Update the html text
                    $("#tipsImage").attr("src", ig.global.tips[tipid].imgsrc);
                    $("#tipdata").html(ig.global.tips[tipid].text);
                    //open the css
                    $('#tipsParent').css('left', x + "px");
                    $('#tipsParent').css('top', y + "px");
                }
            }
        },

    });



});