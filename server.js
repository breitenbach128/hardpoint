#!/bin/env node
//  Hardpoint application
//https://github.com/jaredhanson/passport-google-oauth/blob/master/examples/oauth2/app.js
var express = require('express');
var fs      = require('fs');
var mongojs = require('mongojs');
var passport = require('passport')
var util = require('util');
var app = express();
//var GoogleStrategy = require('passport-google').Strategy;
//var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var GoogleStrategy = require('passport-google-oauth20').Strategy;;
//Directories
var publicDirectory = "public_html";
//Server variables for gameplay
var players = [];
var games = []; //rooms
var online = [];
var connection_string = '127.0.0.1:27017/GAME';
var gamesizelimit = 10;

//Disconnection Variables
var dcCacheRetentionTime = 5;//5 Minutes to retain dc'd players.
var dcCache = new Array();//Disconnected players for reconnection tracking
var cleanerArray = new Array();

//Classes
function playersyncdata (remoteid, gid) {
    this.pid=remoteid; 
    this.gid=gid;
    this.pos= {x: 100, y:100 };
    this.linearVel= 0;
    this.remoteAnim= 0;
    this.remoteId= 0;
    this.angle= 0;
    this.wpangles= "";
    this.health= {current: 100, max:100};
}
function botsyncdata (remoteid) {
    this.pid=remoteid; 
    this.pos= {x: 100, y:100 };
    this.linearVel= 0;
    this.remoteAnim= 0;
    this.remoteId= 0;
    this.angle= 0;
    this.wpangles= "";
    this.health= {current: 100, max:100};
}
//DisConnect cache timer
dcCacheTimer = setInterval(function () {
    
    //Clear out the cache after 5 minutes old.
    cleanerArray = [];
    var currentTime = Date.now();
    var expirationTime = 0;
    //Find old items
    for (var d = 0; d < dcCache.length; d++) {
        //console.log("dcCache:cached", dcCache[d].playerData.id);
        expirationTime = dcCache[d].timeStamp + (dcCacheRetentionTime * 60000);
        if (expirationTime < currentTime) {
            console.log("Player Expired On schedule:", dcCache[d].playerData.id);
            //Update player information and increase their disconnect count.
            hp_users_col.update(
            { 
                pid: dcCache[d].playerData.gid 
            },
            {
                $inc:
                    {
                        disconnects: 1
                    }
            },function(err){if(err){console.log("Update failed for player disconnect count ",data.pgid,err)}});
            //Add to removal list
            cleanerArray.push(d);
        }
    }
    //splice old items out of the dcCache
    for (var c = 0; c < cleanerArray.length; c++) {
        dcCache.splice(cleanerArray[c], 1);
    }
    //The histoical stats are reloaded onto the new player from the dcCache stats (kills, assist, damage, etc)


}, 1000*5);

//Google IDs
var GOOGLE_CLIENT_ID = "574759193783-00ci4dnduaunuqtj7vvp537tatecjifu.apps.googleusercontent.com";
var GOOGLE_CLIENT_SECRET = "LBzM6OUuhj3zJnekF87-7qpW";

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete Google profile is serialized
//   and deserialized.

passport.serializeUser(function(user, done) {
   //console.log('serializing user.',user.id);
    done(null, user.id);
});

passport.deserializeUser(function(obj, done) {
    //console.log('deserialize User',obj);
    done(null, obj);
});



//Database vars
var connection_string = 'mongodb:\/\/gameUser:gu128@localhost:27017/game?authSource=admin&authMechanism=MONGODB-CR';
var db = mongojs(connection_string, ['hp_users','hp_matches']);
var hp_users_col = db.collection('hp_users');
var hp_matches_col = db.collection('hp_matches');

// Use the GoogleStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and Google
//   profile), and invoke a callback with a user object.
passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    // scope: 'profile',
    //callbackURL: 'http://localhost:'+process.env.PORT+'/auth/google/return'
    callbackURL: 'http://www.128games.com:8080/auth/google/return',
},
function(accessToken, refreshToken, profile, cb) {
    return cb(null, profile);
  }
//   function(accessToken, refreshToken, profile, done) {
//       // asynchronous verification, for effect...
//       process.nextTick(function () {
      
//           // To keep the example simple, the user's Google profile is returned to
//           // represent the logged-in user.  In a typical application, you would want
//           // to associate the Google account with a user record in your database,
//           // and return that user instead.
//           //var db = mongojs(connection_string, ['hp_users']);
//           //var hp_users_col = db.collection('hp_users');
          
//           //console.log("pid type",(typeof (profile.id)),profile);
          
//           hp_users_col.find({pid:(profile.id)}).toArray(function(err,users){
//               if (err || !users) {
//                   console.log("err",err);
//                   return done(null, profile);
//               }else if(users.length == 0){
//                   console.log("no users found");
//                   //Create object
//                   //var namearray = profile.displayName.toString();
//                   //var subname = namearray[0] + profile.id.toString().substring(0,8);
//                   var subname = "Newbie" + profile.id.toString().substring(0,8);
//                   var userobject = {
//                       pid:profile.id,
//                       name: subname,//Make this a combo of name and pid (NO SPACES ALLOWED!)
//                       email: profile.emails[0].value,
//                       authstatus: true,
//                       beta: false,
//                       currentsocketid: 0,
//                       careerkills: 0,
//                       careerdeaths: 0,
//                       careerassists: 0,
//                       totaldamrcv: 0,
//                       totaldamgiven: 0,
//                       caps: 0,
//                       profilepic: "test.jpg",
//                       matches: [],
//                       wins: 0,
//                       loses: 0,
//                       disconnects: 0,
//                       reports: 0,
//                       kicks: 0,
//                       xp: 0,
//                       friends:new Array(),//{friendId: <globalId>, status: blocked/pending/accepted/sent}
//                   }
//                   //var db = mongojs(connection_string, ['hp_users'],{authMechanism: 'ScramSHA1'});
//                   //var db = mongojs(connection_string, ['hp_users']);
//                   //var hp_users_col = db.collection('hp_users');
//                   //insert object
//                   hp_users_col.insert(userobject, function(err){
//                       if(err){
//                           console.log(err);
//                           return done(null, profile);
//                       }else{
//                           console.log("insert complete");
//                           return done(null, profile);
//                       };

//                   });

                  
//               } else {
//                   //console.log("Yes users found",users[0].pid);
//                   return done(null, profile);
//               }
//           });

//       });
//   }
))
/**
 *  Define the sample application.
 */
var SampleApp = function() {

    //  Scope.
    var self = this;

    /*  ================================================================  */
    /*  Helper functions.                                                 */
    /*  ================================================================  */

    /**
     *  Set up server IP address and port # using env variables/defaults.
     */
    self.setupVariables = function() {
        //  Set the environment variables we need.
        self.ipaddress =  process.env.IP || "165.227.202.251";
        self.port      = process.env.PORT || 8080;
        // default to a 'localhost' configuration:

        if (typeof self.ipaddress === "undefined") {
            console.warn('No IP var, using 127.0.0.1');
            self.ipaddress = "127.0.0.1";
        };
    };


    /**
     *  Populate the cache.
     */
    self.populateCache = function() {
        if (typeof self.zcache === "undefined") {
            self.zcache = { 'index.html': '' };
        }

        //  Local cache for static content.
        self.zcache['index.html'] = fs.readFileSync('./index.html');
    };


    /**
     *  Retrieve entry (content) from cache.
     *  @param {string} key  Key identifying content to retrieve from cache.
     */
    self.cache_get = function(key) { return self.zcache[key]; };


    /**
     *  terminator === the termination handler
     *  Terminate server on receipt of the specified signal.
     *  @param {string} sig  Signal to terminate on.
     */
    self.terminator = function(sig){
        if (typeof sig === "string") {
           console.log('%s: Received %s - terminating sample app ...',
                       Date(Date.now()), sig);
           process.exit(1);
        }
        console.log('%s: Node server stopped.', Date(Date.now()) );
    };


    /**
     *  Setup termination handlers (for exit and a list of signals).
     */
    self.setupTerminationHandlers = function(){
        //  Process on exit and signals.
        process.on('exit', function() { self.terminator(); });

        // Removed 'SIGPIPE' from the list - bugz 852598.
        ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
         'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
        ].forEach(function(element, index, array) {
            process.on(element, function() { self.terminator(element); });
        });
    };


    /*  ================================================================  */
    /*  App server functions (main app logic here).                       */
    /*  ================================================================  */

    /**
     *  Create the routing table entries + handlers for the application.
     */
    self.createRoutes = function() {
        self.routes = { };

        self.routes['/'] = function(req, res) {
            res.setHeader('Content-Type', 'text/html');
            res.send(self.cache_get('index.html') );
        };

        self.routes['/db'] = function(req, res) {

            hp_users_col.find({}).toArray(function(err,items){
                res.header("Content-Type:","application/json");
                res.end(JSON.stringify(items));
            });
        };
    };


    /**
     *  Initialize the server (express) and create the routes and register
     *  the handlers.
     */
    self.initializeServer = function() {
        
        //self.app = express.createServer();
        self.app = app;
        //self.app.use(express.session({ secret: 'sweet justice 128' }));
        self.app.use(express.cookieParser());
        self.app.use(express.cookieSession({
            key: 'app.sess',
            secret: 'sweet justice 128'
        }));
        self.app.use(express.bodyParser());
       
        // Initialize Passport!  Also use passport.session() middleware, to support
        // persistent login sessions (recommended).
        self.app.use(passport.initialize());
        self.app.use(passport.session());
        //self.app.use(function(req, res, next) {
        //    if (req.user == null && req.path.indexOf('/hardpoint') === 0)
        //    {
        //        res.redirect('/login');
        //    }
        //    next(); 
        //});
        self.createRoutes();
        self.app.set('views', __dirname + '/views');
        self.app.set('view engine', 'ejs');

        //self.app.get('/', function(req, res){
        //    res.render('/signin.html');
        //});

        self.app.get('/main', function(req, res){
            res.render('index', { user: req.user });
        });
        self.app.get('/account', ensureAuthenticated, function(req, res){
            res.render('account', { user: req.user });
        });
        self.app.get('/login', function(req, res){
            res.render('login', { user: req.user });
        });

        self.app.get('/hardpoint/*', ensureAuthenticated, function(req, res, next){            
            //console.log("The following user logged into Hardpoint via Google:", req.user.displayName);
            next();
           
        });
        self.app.get('/hardpointbeta/*', ensureAuthenticated, function(req, res, next){            
            //Check to make the player is a beta test, or else, send them back to the signin page.
            
            hp_users_col.find({pid:(req.user)}).toArray(function(err,users){
                if (err || !users || users.length == 0) {
                    console.log("err",err);
                    res.send({
                        auth: "err"
                    });
                }else{
                    //Do they have access
                    
                    if(users[0].beta == true){
                        next();
                    }else{
                        res.redirect('/signin.html');
                    }
                }
            });
            
            
           
        });
        self.app.get('/profile', function(req, res, next) {
            console.log("get profile", req.user);
            if(req.user != undefined){
                var userdocument = {};
                hp_users_col.find({pid:(req.user)}).toArray(function(err,users){
                    if (err || !users) {
                        console.log("err",err);
                        res.send({
                            auth: "err"
                        });
                    }else{
                        //console.log("User Access",users);
                        //Now, run a lookup on those last 5 matches and return their information
                        if(users.length >0){
                            userdocument = users[0];
                            res.json(userdocument);
                        }else{
                            res.json({result: 'error-no users'});
                        }
                    }
                });

                
            }else{
                res.send({
                    auth: "noauth"
                });
            }
            
        });
        self.app.get('/pinfo', function(req, res, next) {
            //console.log("Pinfo", req.query);
            if(req.query != undefined){
                var userdocument = {};
                hp_users_col.find({name:(req.query.name)}).toArray(function(err,users){
                    if (err || !users) {
                        console.log("err",err);
                        res.send({
                            auth: "err"
                        });
                    }else{
                        //console.log("User Access",users);
                        //Now, run a lookup on those last 5 matches and return their information
                        if(users.length >0){
                            userdocument = users[0];
                            var scores = {
                                wins:userdocument.wins,
                                loses:userdocument.loses,
                                kicks:userdocument.kicks,
                                level:Math.round((Math.sqrt(200 * ((2 * (userdocument.xp)) + 0) + 0) / 200)),
                            }
                            res.json(scores);
                        }else{
                            res.json({result: 'error-no users'});
                        }
                    }
                });

                
            }else{
                res.send({
                    result: "no query"
                });
            }
            
        });
         self.app.get('/leaderboard', function(req, res, next) {
             if(req.query != undefined){
                 console.log("Query leaderboard for :", req.query.reqtype);
                 var reqtype = req.query.reqtype;
                 if(reqtype == "xp"){
                     hp_users_col.find({},{name: 1, xp: 1}).sort({"xp" : -1}).toArray(function(err,users){
                         if (err || !users) {
                            res.send({
                                auth: "err"
                            });
                         }else{
                             var data = [];
                             for (var x = 0;x < users.length;x++) {
                                data.push({name: users[x].name, data: users[x].xp});
                             }
                             res.json(data);
                         }
                     });
                 }else if(reqtype == "kdr"){
                     
                     var dbcursor = hp_users_col.aggregate([
                        {"$project":
                            {
                                "name": "$name",
                                "kdr": { $cond: [ { $eq: [ "$careerdeaths", 0 ] }, "N/A", {"$divide":["$careerkills", "$careerdeaths"]} ] }
                            }
                        },
                        {"$sort": {"kdr":-1}}
                    ], function(err, users){
                        if (err || !users) {
                            res.send({
                                auth: "err"
                            });
                         }else{
                             var data = [];
                             for (var x = 0;x < users.length;x++) {
                                data.push({name: users[x].name, data: users[x].kdr});
                             }
                             res.json(data);
                         }
                    });


                 }else if(reqtype == "kill"){
                    hp_users_col.find({},{name: 1, careerkills: 1}).sort({"careerkills" : -1}).toArray(function(err,users){
                         if (err || !users) {
                            res.send({
                                auth: "err"
                            });
                         }else{
                             var data = [];
                             for (var x = 0;x < users.length;x++) {
                                data.push({name: users[x].name, data: users[x].careerkills});
                             }
                             res.json(data);
                         }
                     });
                 }else if(reqtype == "win"){
                     hp_users_col.find({},{name: 1, wins: 1}).sort({"wins" : -1}).toArray(function(err,users){
                         if (err || !users) {
                            res.send({
                                auth: "err"
                            });
                         }else{
                             var data = [];
                             for (var x = 0;x < users.length;x++) {
                                data.push({name: users[x].name, data: users[x].wins});
                             }
                             res.json(data);
                         }
                     });
                 }else if(reqtype == "off"){
                    hp_users_col.find({},{name: 1, totaldamgiven: 1}).sort({"totaldamgiven" : -1}).toArray(function(err,users){
                         if (err || !users) {
                            res.send({
                                auth: "err"
                            });
                         }else{
                             var data = [];
                             for (var x = 0;x < users.length;x++) {
                                data.push({name: users[x].name, data: users[x].totaldamgiven});
                             }
                             res.json(data);
                         }
                     });
                 }else if(reqtype == "def"){
                    hp_users_col.find({},{name: 1, totaldamrcv: 1}).sort({"totaldamrcv" : -1}).toArray(function(err,users){
                         if (err || !users) {
                            res.send({
                                auth: "err"
                            });
                         }else{
                             var data = [];
                             for (var x = 0;x < users.length;x++) {
                                data.push({name: users[x].name, data: users[x].totaldamrcv});
                             }
                             res.json(data);
                         }
                     });
                 }else if(reqtype == "obj"){
                    hp_users_col.find({},{name: 1, caps: 1}).sort({"caps" : -1}).toArray(function(err,users){
                         if (err || !users) {
                            res.send({
                                auth: "err"
                            });
                         }else{
                             var data = [];
                             for (var x = 0;x < users.length;x++) {
                                data.push({name: users[x].name, data: users[x].caps});
                             }
                             res.json(data);
                         }
                     });
                 }
             }else{
                res.send({
                    result: "no query"
                });
                 
             }
             
         });
        // GET /auth/google
        //   Use passport.authenticate() as route middleware to authenticate the
        //   request.  The first step in Google authentication will involve
        //   redirecting the user to google.com.  After authorization, Google
        //   will redirect the user back to this application at /auth/google/callback
        self.app.get('/auth/google',
          //passport.authenticate('google', { scope: ['https://www.googleapis.com/auth/plus.login','https://www.googleapis.com/auth/plus.profile.emails.read'] }),
          //passport.authenticate('google', { scope: ['https://www.googleapis.com/auth/userinfo.email','https://www.googleapis.com/auth/userinfo.profile'] }),
          passport.authenticate('google', { scope: ['profile'] }),
          
          function(req, res){
              // The request will be redirected to Google for authentication, so this
              // function will not be called.
              console.log("/auth/google called");
          });

        // GET /auth/google/return
        //   Use passport.authenticate() as route middleware to authenticate the
        //   request.  If authentication fails, the user will be redirected back to the
        //   login page.  Otherwise, the primary route function function will be called,
        //   which, in this example, will redirect the user to the home page.

        //self.app.get('/auth/google/return', 
        //  passport.authenticate('google', { 
        //    successRedirect : '/hardpoint/index-desktop.html', 
        //    failureRedirect: '/signin.html',
        //    failureFlash: true,
        //    failWithError: true}),
        //  function(req, res) {
        //      console.log(req,res);
        //      res.redirect('/hardpoint/index-desktop.html');
        //  });
        //Custom callback
        self.app.get('/auth/google/return', function(req, res, next) {
            passport.authenticate('google', function(err, user, info) {
                if (err) { 
                    console.log("error on google return", err);
                    return next(err); 
                }
                if (!user) { return res.redirect('/signin.html'); }
                req.logIn(user, function(err) {
                    if (err) { 
                        console.log("error on google return login", err);
                        return next(err);
                    }
                    console.log("Authentication Success", user.displayName);
                    return res.redirect('/hardpoint_b5/index-desktop.html');
                });
            })(req, res, next);
        });

        self.app.get('/logout', function(req, res){
            req.logout();
            res.redirect('/signin.html');
        });

        self.app.configure(function() {
 
            self.app.use(function(req, res, next) {
                res.header('Access-Control-Allow-Credentials',true);
                //res.header('Access-Control-Allow-Origin', 'http://www.128games.com:8080');
                res.header('Access-Control-Allow-Origin', '*');
                res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
                res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, Origin, Accept, *');

                if ('OPTIONS' === req.method) {
                    res.send(200);
                }
                else {
                    next();
                };
            });
        });

        // Browser Cache
        var oneDay = 86400000;
        self.app.use('/', express.static(__dirname + '/' + publicDirectory + '/', { maxAge: oneDay }));
        //  Add handlers for the app (from the routes).
        for (var r in self.routes) {
            self.app.get(r, self.routes[r]);
        }
    };


    /**
     *  Initializes the sample application.
     */
    self.initialize = function() {
        self.setupVariables();
        self.populateCache();
        self.setupTerminationHandlers();

        // Create the express server and routes.
        self.initializeServer();
        self.initializeSocketIO().addSocketIOEvents();
    };
    /**
     *  Initializes the socketIO for the application.
     */
    self.initializeSocketIO = function() {
        self.server = require('http').createServer(self.app);
        self.io = require('socket.io').listen(self.server);    //self.server
        self.io.enable('browser client minification');  // send minified client
        //self.io.enable('browser client etag');          // apply etag caching logic based on version number
        self.io.enable('browser client gzip');          // gzip the file
        self.io.set('log level', 1);                    // reduce logging    
        //self.io.set('transports', [ 'polling', 'websocket' ]);
        //self.io.set('transports', [ 'polling']);
        self.io.set('transports', [ 'websocket']);

        return this;
    };
    /**
     *  Initializes the socketIOEvents for the application.
     */
   
    self.addSocketIOEvents = function() {
        self.io.sockets.on('connection', function (socket) {
            
            //io.set('log level', 1);
            //io.set('transports', ['xhr-polling']);
            /**
             * starting
             * sending remoteId to client who is joining
             * broadcasting remoteId to anyone else that new client joined
             */;
            //console.log("*********socket connected***************", socket.id);


            //setup server game loop for state tracking broadcast------
            gameUpdate = setInterval(function () {

                //For each player, push them into their own room listing.
                //Once in their own rooms, broadcast those sub arrays into each room.

                for(var rm=0;rm < games.length;rm++){

                    //Broadcast the player state data to the room members

                    socket.broadcast.to(games[rm].name).emit('statesync', { roomstate: games[rm].playerstatedata, projectilespawn: games[rm].projectiledata, botstate:games[rm].botdata  });
                    //Empty out the projectile spawn array for the next cycle;
                    games[rm].projectiledata = [];

                    //console.log("SyncUpdateTest",games[rm].name,games[rm].playerstatedata );
                }

                //Send New 

            }, (1000/60));//(1000/60)//

            socket.on('playerstateupdate', function(data){
                //console.log("RCVC Sync Update:", data);
                for(var rm=0;rm < games.length;rm++){
                    for(var psd=0;psd<games[rm].playerstatedata.length;psd++){
                        if(games[rm].playerstatedata[psd].pid = data.pid){
                            //Found player, so update data.
                            games[rm].playerstatedata[psd].pos = data.data.pos;
                            games[rm].playerstatedata[psd].linearVel = data.data.linearVel;
                            games[rm].playerstatedata[psd].remoteAnim = data.data.remoteAnim;
                            games[rm].playerstatedata[psd].remoteId = data.data.remoteId;
                            games[rm].playerstatedata[psd].angle = data.data.angle;
                            games[rm].playerstatedata[psd].wpangles = data.data.wpangles;
                            games[rm].playerstatedata[psd].health = data.data.health;                            
                            games[rm].playerstatedata[psd].armor = data.data.armor;
                        }
                    }
                }
            });
            //--------------------------------------------------------
            
            socket.on('sendprojectile', function(data){
                //console.log("rcvd bullet data push into room", data.room, data.data);
                for(var rm=0;rm < games.length;rm++){
                    //console.log("Rooms Check", games[rm].name);
                    if(data.room == games[rm].name){
                        //console.log("room projectile match!");
                        games[rm].projectiledata.push(data.data);
                    }

                }
            });
            //Emit SocketId for tracking
            socket.emit('setSocketId', {id :socket.id});
            socket.on('updateOnlineArray', function(data){
                online.push({id:socket.id, name:data.name, gid: data.pid});
            });
            socket.on('getReconnectStatus', function (data) {

                //First, check if there is a game up that the player was part of.
                //MONGODB Reconnection find player query db.getCollection('hp_matches').find({$and: [{active: true},{"gamedata.pgid": "101915011540773405111"}]})
                // -- Looks for all active games where the gamedata.pgid matches the player google id.

                //If so, then Check if in cache and not kicked.
                //If passed, then emit the rejoin enable.
                
                var inCache = -1;
                for (var d = 0; d < dcCache.length; d++) {
                    //console.log("player in dccache:", dcCache[d].playerData.gid);
                    if (dcCache[d].playerData.gid == data.pgid && dcCache[d].playerData.kicked == false) {
                        inCache = d;
                    }
                }
                if (inCache != -1) {
                    console.log("Player wants to reconnect. Check status and send back to them.", data.pgid);
                    //How many people are playing still?
                    var roomChk = 0;
                    for (var p = 0; p < players.length; p++) {
                        if (players[p].room == dcCache[inCache].playerData.room) {
                            roomChk++;
                        }
                    }
                    if (roomChk > 0) {
                        console.log("Player reconnect data found in cache and allowed, and room exists. Emit enabler.", inCache);
                        socket.emit('enableReconnectByClient', { roomName: dcCache[inCache].playerData.room, roomCount: roomChk });
                    }
                }
            });
            //
            socket.on('reconnectByPlayer', function (data) {
                //Once again, check if there is an active game with the player listed to allow the join

                var inCache = -1;
                //Are they in the dcCache
                for (var d = 0; d < dcCache.length; d++) {
                    if (dcCache[d].playerData.gid == data.pgid && dcCache[d].playerData.kicked == false) {
                        inCache = d;
                    }
                }

                //Emit the reconnection object data
                if (inCache != -1) {
                    var roomChk = false;
                    //Does the room still exist?
                    for (var p = 0; p < players.length; p++) {
                        if (players[p].room == dcCache[inCache].playerData.room) {
                            roomChk = true;
                        }
                    }

                    //create a shared temp secret for authentication, and use that to allow the client to join a started game. Right now, it stops them with the game started check

                    var sseckey = "";
                    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

                    for (var i = 0; i < 64; i++) {
                        sseckey += possible.charAt(Math.floor(Math.random() * possible.length));
                    }
                    //Assign key value on server and send Authorize
                    dcCache[inCache].authkey = sseckey;
                    socket.emit('authorizedReconnect', { gamedata: dcCache[inCache].playerData, authkey: sseckey });



                }
            });
            //
            socket.on('start', function (data) {
                //console.log("start:",data)
                var authenCheck = { result: false, team: 0 };
                var matchKey = false;
                var matchIndex = -1;
                //search dcCache for id matching source, and and then compare with shared secret issue.
                //If allowed by match, clear the dcCache from of that player, as they have successfully reconnected.
                if (data.auth.ssec != 0) {
                    authenCheck.result = true;
                    for (var d = 0; d < dcCache.length; d++) {
                        if (dcCache[d].playerData.id == data.auth.remoteId && dcCache[d].authkey == data.auth.ssec) {
                            //Key match was successful with requested key and id.
                            console.log("Rejoin request via auth: " + data.auth.ssec + " matched for " + data.auth.remoteId + " with team : " + dcCache[d].playerData.team);
                            matchKey = true;
                            matchIndex = d;
                            authenCheck.team = dcCache[d].playerData.team;
                        };
                    }
                };
                //NEED TO CLEAR OUT THE LOCAL DCCACHE FROM THIS ID AND CLEAR CLIENT DATA.
                if (matchKey == true) {
                    dcCache.splice(matchIndex, 1);
                }

                //check room size, for max player count per room (currently 6)
                var roomSize = 0;
                var matchid = 0;
                var gameStarted = false;
                var team1Count = 0;
                var team2Count = 0;
                var teamToJoin = 0;
                for (var p = 0; p < players.length; p++) {
                    if (players[p].room == data.room) {
                        roomSize++;
                        //Get count of players on each team so far in this room
                        if (players[p].team == 1) {
                            team1Count++;
                        } else if (players[p].team == 2) {
                            team2Count++;
                        }
                        //Has anyone started the game
                        if (players[p].started) {
                            gameStarted = true;
                        }
                        //Get the room id from the database by grabbing it from the last player in the room in the loop above.
                        matchid = players[p].matchid;
                    }
                }
                //If room size is still 0, it is a new match, so create a match id and assign it to the room.
                if(roomSize == 0){
                    //Create id with timestamp and playerid, then push the match into match collection.
                    var d = new Date();
                    var timeforMatch = Date.now();
                    var idforMatch = data.playerGID;
                    matchid = (timeforMatch) + "00" + idforMatch;
                    //INSERT INTO DB
                    var matchobject = {
                        matchid: matchid,
                        matchname: data.room,
                        gamedata: null,
                        active: false,
                        winner: 0,
                        creationtime: d.toLocaleString()
                    }
                    hp_matches_col.insert(matchobject, function(err){
                        if(err){
                            console.log(err);;
                        }else{

                        };

                    });
                }else{
                    //Update match information with this new player.
                }
                //Which team needs a player?
                if (team1Count > team2Count) {
                    teamToJoin = 2;
                } else {
                    teamToJoin = 1;
                }
                console.log("New player wants to join the game", data.pName, teamToJoin);
                if ((roomSize < gamesizelimit) || (authenCheck.result == true && matchKey == true && roomSize < gamesizelimit)) {

                    socket.emit('setRemoteId', socket.id);
                    socket.join(data.room);
                    //Push room(games) array - Need to know if it is a new room, or a joined room.
                    var gFound = -1;
                    for(var g=0;g<games.length;g++){
                        if(games[g].name == data.room){
                            gFound = g;
                        }
                    }
                    if(gFound == -1){
                        console.log("This is a new game", data);
                        //New Room
                        games.push({name: data.room, projectiledata: [],botdata: [],  playerstatedata:[
                            {
                                pid:socket.id, 
                                gid:data.playerGID,
                                pos: {x: 100, y:100 },
                                linearVel: 0,
                                remoteAnim: 0,
                                remoteId: 0,
                                angle: 0,
                                wpangles: "",
                                health: {current: 100, max :100},
                            }
                        ]})

                        //Should we add bots?
                        if(data.addbots){
                            //Yes, so add them
                            var newbot00 = new botsyncdata("bot00");
                            var newbot01 = new botsyncdata("bot01");
                            var newbot02 = new botsyncdata("bot02");
                            games[games.length - 1].botdata.push(newbot00);
                            games[games.length - 1].botdata.push(newbot01);
                            games[games.length - 1].botdata.push(newbot02);
                            console.log("bots created for game", games[games.length - 1].name, games[games.length - 1].botdata);
                        }

                    }else{
                        console.log("This is a current game");
                        //Current room, so just find and push/update into it.
                        var pFound = -1;
                        for(var psd=0;psd<games[gFound].playerstatedata.length;psd++){
                            var pdata = games[gFound].playerstatedata[psd];
                            //Check for player already in room?                           
                            
                            if(pdata.gid == data.playerGID){
                                pFound = psd;
                            }                          
                        }
                        //Serious bug caused downtime
                        //Not found, so just add to room
                        if(pFound == -1){
                            console.log("Player not already in room, so adding them.",socket.id);
                            games[gFound].playerstatedata.push(
                                {
                                    pid:socket.id, 
                                    gid:data.playerGID,
                                    pos: {x: 100, y:100 },
                                    linearVel: 0,
                                    remoteAnim: 0,
                                    remoteId: 0,
                                    angle: 0,
                                    wpangles: "",
                                    health: {current: 100, max :100},
                                })
                        }else{
                            console.log("Player IS already in room, so just updating them them.");
                            //THEY have been found, so just let their data get updated with the new connection socket id.
                            games[gFound].playerstatedata[pFound].pid = socket.id;
                        }
                    }
                    //console.log("broadcast new player with remote id " + socket.id + " in room " + data.room);
                    //Push into online array
                    online.push({id:socket.id, name:data.pName});
                    //Push new player into server array.
                    players.push({ id: socket.id, room: data.room, matchid:matchid, roomhost: data.ishost, started: false, team: teamToJoin, levelId: data.level, gid: data.playerGID, pName: data.pName, pPerks: data.pPerks, pClass: data.pClass, objectives: new Array(), heroic: false, kicked: false });
                    //join local Player
                    var newplayer = players[players.length-1];
                    //Is it a new connect or a rejoin?
                    if(authenCheck.result == true){
                        //Reconnect Join - Broadcast only this players information and the list of others
                        var rejoinData = {rejoin:true, sourcerid:socket.id};
                    }else{
                        //New Join - Broadcast Normally.
                        var rejoinData = {rejoin:false, sourcerid:0};
                    };
                    //send all existing clients to new
                    for (var p = 0; p < players.length; p++) {
                        if( players[p].room == data.room){
                            if (authenCheck.result && players[p].id == data.auth.remoteId) {
                                //console.log("Emiting Join REconnect to:", players[p].pName);
                                self.io.sockets.in(players[p].room).emit('join', { remoteId: players[p].id, pgid: players[p].gid, pName: players[p].pName, matchid:players[p].matchid, ishost: players[p].roomhost, teamAssign: players[p].team, pClass: players[p].pClass, gamestarted: gameStarted, rejoindata:rejoinData, reconnect: authenCheck, addbots: data.addbots });
                            } else {
                                //console.log("Emiting Join to:", players[p].pName);
                                self.io.sockets.in(players[p].room).emit('join', { remoteId: players[p].id, pgid: players[p].gid, pName: players[p].pName, matchid:players[p].matchid, ishost: players[p].roomhost, teamAssign: players[p].team, pClass: players[p].pClass, gamestarted: gameStarted, rejoindata:rejoinData, reconnect: { result: false, team: 0 }, addbots: data.addbots });
                            }
                        }

                    }
                    
                } else {
                    var errorMsg = "unknown";
                    if (roomSize >= 6) {
                        errorMsg = "Room Full";
                    } else if (gameStarted) {
                        errorMsg = "Game started";
                    }
                    socket.emit('roomfullwarning', { rId: socket.id, status: errorMsg });
                    socket.disconnect();//Disconnects the calling client
                }

            });
            //
            socket.on('callgamelist', function (data) {
                //console.log(self.io.sockets.clients().length);
                var pList = new Array();
                var pOnline = new Array();
                for (var p = 0; p < players.length; p++) {
                    pList.push({ name: players[p].pName, room: players[p].room, level: players[p].levelId, started: players[p].started, gid: players[p].gid });
                }

                //Which friends are online? Use data.friends against the online listing and push into an online array
                for (var o = 0; o < online.length; o++) {
                    for(var f=0;f<data.friends.length;f++){
                        if(online[o].name == data.friends[f].name && data.friends[f].status != 'blocked'){
                            //Push since online
                            pOnline.push(online[o].name);
                        }
                    }

                }

                var gamelistobj = { plist: JSON.stringify(pList), ponline: pOnline, onlineCount: self.io.sockets.clients().length, onlinelist: online };
                //self.io.emit('gamelist', gamelistobj);
                socket.emit('gamelist', gamelistobj);
                //socket.disconnect();//Disconnects the calling client
            });
            //
            socket.on('updateProfileName', function (data) {
                //Need name check here to ensure name is unique
                hp_users_col.find({name: (data.newname)}).toArray(function(err,users){
                    if (err || !users) {
                        console.log("err",err);
                    }else if(users.length == 0){
                        //NO Name found, it is unique
                        hp_users_col.update(
                        { 
                            pid: data.pgid 
                        },
                        {
                            $set:
                                {
                                    name: data.newname
                                }
                        },function(err){if(err){console.log("Update failed for player ",data.pgid,err)}});
                        socket.emit('profilenameupdateStatusResponse', {namestatus:"succeeded"});
                        for(var o=0;o<online.length;o++){
                            if(online[o].name == data.oldname){
                                online[o].name = data.newname;
                            }
                        }
                        //Update their friends, friends lists with their new name
                        //First, get the friends list
                        hp_users_col.find({name: data.newname}).toArray(function(err,friend){
                            if (err || !friend || friend.length == 0) {
                                console.log("err requesting friends list",err);
                            }else{
                                for(var f=0;f<friend[0].friends.length;f++){
                                    //For each friend, update their list with the new name
                                    console.log("checking friend during name update", friend[0].friends[f].name);
                                    var friendname = friend[0].friends[f].name;
                                    hp_users_col.update(
                                    { 
                                        name: friend[0].friends[f].name, "friends.name" : data.oldname
                                    },                        { 
                                        $set : 
                                            { 
                                                "friends.$.name": data.newname
                                            } 
                                    },function(err,result){
                                        if(err){
                                            console.log("Error: update name on all friends, friend lists update error", err);
                                        }else{  
                                            //On the update, broadcast to each friend to force an update on their friends list, if they are online.   
                                            console.log("broadcast name update to friends", friendname);
                                            for(var o=0;o<online.length;o++){
                                                if(online[o].name == friendname){
                                                    self.io.sockets.socket(online[o].id).emit('friendslistchange', {});
                                                }
                                            }

                                            
                                        }
                                    });
                                }
                            }
                        });

                    }else{
                        //Yes Name found, it is NOT unique
                        socket.emit('profilenameupdateStatusResponse', {namestatus:"failed"});

                    }
                });
                
            });
            //
            socket.on('pingCall', function () {
                socket.emit('pingResponse', {});
            });
            //
            socket.on('updateClocks', function (data) {
                socket.broadcast.to(data.room).emit('updateclientclocks', data);
            });            
            //
            socket.on('chatLobbySendInGame', function (data) {
                var msgArray = (data.msg.split(" "));
                var srcPlayerName = data.alias;
                var message = ("<div style=\"display:table-row;width:100%;\"><div style=\"color:#FFCC00;\">" + data.alias + "</div>:      " + data.msg)+"</div>";
                if(data.msg == '/?'){
                    message = "The following commands are available:<br>/w <player> : Whisper to target player<br>/block <player> : Block communication from target player";
                    socket.emit('chatLobbyRcv', {msg:message});
                }else if((msgArray[0] == '/w' || msgArray[0] == '/W') &&  msgArray.length > 2){
                    message = "<div style=\"display:table-row;width:100%;\"><div style=\"color:#cc00cc;\">Whispered To:" +msgArray[1]+" </div>: " + data.msg.substring((3+(msgArray[1].length)))+"</div>"; 
                    var pExists = false;
                    console.log("onlinelist:", online,msgArray[1]);
                    for(var p=0;p<online.length;p++){
                        if(online[p].name == msgArray[1]){
                            pExists = true;
                            var targetSocketId = online[p].id;
                            //Now, Check to make sure they are not blocking communication from you.
                            hp_users_col.find({name: (msgArray[1])}).toArray(function(err,users){
                                if (err || !users) {
                                    console.log("err",err);
                                }else if(users.length == 0){
  
                                }else{
                                    //User Found, Make sure they are not blocking you.
                                    var allowSend = true;
                                    for(var f=0;f<users[0].friends.length;f++){
                                        if(users[0].friends[f].name == srcPlayerName && users[0].friends[f].status == 'blocked'){
                                            allowSend = false;
                                        }
                                    }

                                    if(allowSend){
                                        console.log(targetSocketId,message)
                                        socket.emit('chatLobbyRcv', {msg:("<div style=\"display:table-row;width:100%;\"><div style=\"color:#bf00ff;\">Whispered To:" +msgArray[1]+" </div>: " + data.msg.substring((3+(msgArray[1].length)))+"</div>")});
                                        self.io.sockets.socket(targetSocketId).emit('chatLobbyRcv', {msg:("<div style=\"display:table-row;width:100%;\"><div style=\"color:#cc00cc;\">" +srcPlayerName+" </div>: " + data.msg.substring((3+(msgArray[1].length)))+"</div>")})
                                    }else{
                                        socket.emit('chatLobbyRcv', {msg:("<div style=\"display:table-row;width:100%;\"><div style=\"color:#bf00ff;\">" +data.msg.substring((3+(msgArray[1].length)))+" : Use has blocked communication from </div>: " +msgArray[1] +"</div>")});
                                    }
                                }
                            });

                        }
                    }  
                    if(pExists == false){socket.emit('chatLobbyRcv', {msg:"<div style=\"display:table-row;width:100%;\"><div style=\"color:#cc00cc;\">Whispered To:" +msgArray[1]+" </div>ERROR! NO PLAYER ONLINE</div>"});};
                }else if((msgArray[0] == '/block' || msgArray[0] == '/Block' || msgArray[0] == '/BLOCK') &&  msgArray.length > 1){
                    message = "<div style=\"display:table-row;width:100%;\"><div style=\"color:#ff3300;\">Blocked:" +msgArray[1]+" </div>: " + data.msg.substring((3+(msgArray[1].length))+"</div>"); 
   
                    //Do a MongoDb find in all players. If found, do a find in the sources friends list. If found, update, if not, insert.
                    hp_users_col.find({name: (msgArray[1])}).toArray(function(err,users){
                        if (err || !users) {
                            console.log("err",err);
                        }else if(users.length == 0){
  
                        }else{
                            //Target User Found, Go ahead and check source players friends list
                            hp_users_col.find({name: srcPlayerName}).toArray(function(err,users){
                                if (err || !users) {
                                    console.log("err",err);
                                }else if(users.length == 0){
                        
                                }else{
                                    //SrcPlayer found
                                    var found = false;
                                    var status = "none";
                                    for(var f=0;f<users[0].friends.length;f++){
                                        if(users[0].friends[f].name == srcPlayerName){
                                            found = true;
                                            status = users[0].friends[f].status;
                                        }
                                    }

                                    if(!found){
                                        //ADD NEW FRIEND AS BLOCKED
                                        socket.emit('chatLobbyRcv', {msg:message});
                                        hp_users_col.update({name: srcPlayerName},{$addToSet: {"friends": {"Name":msgArray[1],"status":"blocked"}}})
                                    }else{
                                        //UPDATE CURRENT FRIEND TO BLOCKED
                                        socket.emit('chatLobbyRcv', {msg:message});
                                        hp_users_col.update({name : srcPlayerName, "friends.name" : msgArray[1], "friends.status" : status},{$set : {"friends.$.status" : "blocked"}})
                                    }
                                }
                            });
                        }
                    });
                }else{
                    self.io.sockets.in(data.room).emit('chatLobbyRcv', {msg:message});
                }
                    
                
            });
            //
            socket.on('chatLobbySend', function (data) {
                var msgArray = (data.msg.split(" "));
                var srcPlayerName = data.alias;
                var message = ("<div style=\"display:table-row;width:100%;\"><div style=\"color:#FFCC00;\">" + data.alias + "</div>:      " + data.msg)+"</div>";
                if(data.msg == '/?'){
                    message = "The following commands are available:<br>/w <player> : Whisper to target player<br>/block <player> : Block communication from target player";
                    socket.emit('chatLobbyRcv', {msg:message});
                }else if((msgArray[0] == '/w' || msgArray[0] == '/W')  &&  msgArray.length > 2){
                    message = "<div style=\"display:table-row;width:90%;\"><div style=\"color:#cc00cc;\">Whispered To:" +msgArray[1]+" </div>: " + data.msg.substring((3+(msgArray[1].length)))+"</div>"; 
                    var pExists = false;
                    console.log("onlinelist:", online,msgArray[1]);
                    for(var p=0;p<online.length;p++){
                        if(online[p].name == msgArray[1]){
                            pExists = true;
                            var targetSocketId = online[p].id;
                            //Now, Check to make sure they are not blocking communication from you.
                            hp_users_col.find({name: (msgArray[1])}).toArray(function(err,users){
                                if (err || !users) {
                                    console.log("err",err);
                                }else if(users.length == 0){
  
                                }else{
                                    //User Found, Make sure they are not blocking you.
                                    var allowSend = true;
                                    for(var f=0;f<users[0].friends.length;f++){
                                        if(users[0].friends[f].name == srcPlayerName && users[0].friends[f].status == 'blocked'){
                                            allowSend = false;
                                        }
                                    }

                                    if(allowSend){
                                        console.log(targetSocketId,message)
                                        socket.emit('chatLobbyRcv', {msg:("<div style=\"display:table-row;width:100%;\"><div style=\"color:#bf00ff;\">Whispered To:" +msgArray[1]+" </div>: " + data.msg.substring((3+(msgArray[1].length)))+"</div>")});
                                        self.io.sockets.socket(targetSocketId).emit('chatLobbyRcv', {msg:("<div style=\"display:table-row;width:100%;\"><div style=\"color:#cc00cc;\">" +srcPlayerName+" </div>: " + data.msg.substring((3+(msgArray[1].length)))+"</div>")})
                                    }else{
                                        socket.emit('chatLobbyRcv', {msg:("<div style=\"display:table-row;width:100%;\"><div style=\"color:#bf00ff;\">" +data.msg.substring((3+(msgArray[1].length)))+" : Use has blocked communication from </div>: " +msgArray[1] +"</div>")});
                                    }
                                }
                            });

                        }
                    }  
                    if(pExists == false){socket.emit('chatLobbyRcv', {msg:"<div style=\"display:table-row;width:100%;\"><div style=\"color:#cc00cc;\">Whispered To:" +msgArray[1]+" </div>ERROR! NO PLAYER ONLINE</div>"});};
                }else if((msgArray[0] == '/block' || msgArray[0] == '/Block' || msgArray[0] == '/BLOCK') &&  msgArray.length > 1){
                    message = "<div style=\"display:table-row;width:100%;\"><div style=\"color:#ff3300;\">Blocked:" +msgArray[1]+" </div>: " + data.msg.substring((3+(msgArray[1].length))+"</div>"); 
   
                    //Do a MongoDb find in all players. If found, do a find in the sources friends list. If found, update, if not, insert.
                    hp_users_col.find({name: (msgArray[1])}).toArray(function(err,users){
                        if (err || !users) {
                            console.log("err",err);
                        }else if(users.length == 0){
  
                        }else{
                            //Target User Found, Go ahead and check source players friends list
                            hp_users_col.find({name: srcPlayerName}).toArray(function(err,users){
                                if (err || !users) {
                                    console.log("err",err);
                                }else if(users.length == 0){
                        
                                }else{
                                    //SrcPlayer found
                                    var found = false;
                                    for(var f=0;f<users[0].friends.length;f++){
                                        if(users[0].friends[f].name == srcPlayerName){
                                            found = true;
                                        }
                                    }
                                    if(!found){
                                        //ADD NEW FRIEND AS BLOCKED
                                        socket.emit('chatLobbyRcv', {msg:message});
                                        hp_users_col.update({name: srcPlayerName},{$addToSet: {"friends": {"Name":msgArray[1],"status":"blocked"}}})
                                    }else{
                                        //UPDATE CURRENT FRIEND TO BLOCKED
                                        socket.emit('chatLobbyRcv', {msg:message});
                                        hp_users_col.update({name : srcPlayerName, "friends.name" : msgArray[1], "friends.status" : status},{$set : {"friends.$.status" : "blocked"}})
                                    }

                                    //if(found){                                        
                                    //    socket.emit('chatLobbyRcv', {msg:message});
                                        
                                    //    console.log("updating Block:", srcPlayerName,msgArray[1]);
                                    //    hp_users_col.update(
                                    //        {name: srcPlayerName},
                                    //        {$addToSet: {"friends": {"Name":msgArray[1],"status":"blocked"}}},
                                    //        function(err){
                                    //            if(err){
                                    //                console.log("player update error for final block player",err)
                                    //            }
                                    //        });
                                    //}else{
                                    //    socket.emit('chatLobbyRcv', {msg:message});
                                    //    console.log("inserting Block:", srcPlayerName,msgArray[1]);
                                    //    hp_users_col.insert({name: srcPlayerName, "friends.$.name": msgArray[1]},{$set: {"friends.$.status":"blocked"}},function(err){
                                    //        if(err){
                                    //            console.log("player insert error for final block player",err)
                                    //        }
                                    //    });
                                    //}
                                }
                            });
                        }
                    });
                }else{
                    self.io.sockets.in("generallobby").emit('chatLobbyRcv', {msg:message});
                }
                
            });
            //
            socket.on('chatLobbyJoin', function () {
                socket.join("generallobby");
            });
            //
            socket.on('getMatchHistory', function (data) {
                //console.log("Get Match history for ", data.pid);
                //db.getCollection('hp_matches').find({"gamedata.pgid" : "111237536696702739897"}) 101915011540773405111
                hp_matches_col.find({"gamedata.pgid" : data.pid}).sort( { _id: -1 } ).limit(50).toArray(function(err,matches){
                    if (err || !matches) {
                        console.log("err",err);
                    }else{
                        //Generate a new array so I only pass the data I need. 
                        //Match Name, Match Id, GameData, Winner
                        var historyData = new Array();
                        for(var x=0;x< matches.length;x++){

                            historyData.push({
                                mName: matches[x].matchname,
                                mId: matches[x].matchid,
                                mWinner: matches[x].winner,
                                mData: matches[x].gamedata,
                                mDate: matches[x].creationtime
                            })
                            
                        }
                        socket.emit('clientMatchHistory', historyData);

                    }
                });
            });
            //
            socket.on('connectToLobby', function () {
                socket.disconnect();//Disconnects the calling client
            });
            //
            //
            socket.on('finalscoresmatchupdate', function (data) {
                //Update match stats from game host
                //console.log("Attempting to update final scores", data);
                hp_matches_col.update({ matchid: data.matchid },{$set:{gamedata: data.gamedata, active: false, winner: data.winner}});
                for(var p=0;p< data.gamedata.length;p++){

                    var w = 0;
                    var l = 0;
                    var xpgain = 0;
                    if(data.winner == data.gamedata[p].team){
                        w = 1;
                        xpgain = 50;
                    }else{
                        l = 1;
                        xpgain = 25;
                    }
                    //Generate experience from match.
                    //Need formula
                    xpgain = xpgain + (data.gamedata[p].kills*5) + (data.gamedata[p].assists*2) + (Math.round(data.gamedata[p].received/100)) + (Math.round(data.gamedata[p].given/100)) + (data.gamedata[p].caps*10);
                    hp_users_col.update(
                        { 
                            pid: data.gamedata[p].pgid 
                        },
                        {
                            $inc:
                                {
                                    careerkills : data.gamedata[p].kills,
                                    careerdeaths : data.gamedata[p].deaths,
                                    careerassists : data.gamedata[p].assists,
                                    totaldamrcv : data.gamedata[p].received,
                                    totaldamgiven : data.gamedata[p].given,
                                    caps: data.gamedata[p].caps,
                                    wins : w,
                                    loses : l,
                                    xp: xpgain,
                                }
                        },function(err){if(err){console.log("player update error for final match scores",err)}});

                    hp_users_col.update(
                       { 
                           pid: data.gamedata[p].pgid 
                       },                        { 
                           $addToSet : 
                               { 
                                   matches: data.matchid 
                               } 
                       },function(err){if(err){console.log("player update error for final match array",err)}});
                }
            });           
            //
            socket.on('gameStarted', function (data) {
                //Check if Remote ID is a host
                var f = -1;
                for (var p = 0; p < players.length; p++) {
                    if (players[p].id == data.remoteId) {
                        f = p;
                    }
                }
                if (f != -1) {
                    //Player found, are they are host?
                    if (players[f].roomhost) {
                        //Then, update all players in the same room as game started
                        for (var r = 0; r < players.length; r++) {
                            if (players[r].room == data.room) {
                                players[r].started = true;
                            }
                        }
                        //Then update the match db with the information
                        hp_matches_col.update({ matchid: data.matchid },{$set:{gamedata: data.gamedata, active: true}});
                    }
                }

            });
            //
            socket.on('updateServerPlayerTeam', function (data) {
                var pfound = false;
                for (var p = 0; p < players.length; p++) {
                    if (players[p].id == data.remoteId) {
                        players[p].team = data.team;
                        pfound = true;
                        break;
                    }
                }
                if (pfound) {
                   self.io.sockets.in(data.room).emit('updateClientPlayerTeam', data);
                }

            });
            //
            socket.on('setPlayerHeroic', function (data) {
                for (var p = 0; p < players.length; p++) {
                    if (players[p].id == data.remoteId) {
                        players[p].heroic = true;
                    }
                }
            });
            //
            socket.on('objectiveVictory', function (data) {
                self.io.sockets.in(data.room).emit('objectiveWinner', {
                    objective: data.objectiveName,
                    winner: data.winner,
                });
            });
            socket.on('objectiveQuery', function (data) {
                //Returns the current winner of the objective capture (if there is one);
                //console.log("Run objective query for room " + data.room);
                //Find players in room
                var team1Count = 0;
                var team2Count = 0;
                for (var p = 0; p < players.length; p++) {
                    if (players[p].room == data.room) {
                        //console.log("found player in room " + data.room);
                        for (var o = 0; o < players[p].objectives.length; o++) {
                            if (players[p].objectives[o] == data.objectiveName) {
                                //Need to know what team they are on so I can check
                                //console.log("found player in objective " + data.objectiveName + " team " + players[p].team);
                                if (players[p].team == 1) {
                                    team1Count++;
                                    if (players[p].heroic) { team1Count++; };//If heroic, add an additional point
                                } else if (players[p].team == 2) {
                                    team2Count++;
                                    if (players[p].heroic) { team2Count++; };
                                }
                            }
                        }
                    }
                }
                //console.log("Query Result: " + team1Count + " " +team2Count + " on behalf of " + data.remoteId);
                //Emit winning team number.
                if (team1Count > team2Count) {
                    //console.log("Query Result: Team 1 wins");
                   self.io.sockets.in(data.room).emit('objectiveWinner', {
                        objective: data.objectiveName,
                        winner: 1,
                    });
                } else if (team2Count > team1Count) {
                    //console.log("Query Result: Team 2 wins");
                   self.io.sockets.in(data.room).emit('objectiveWinner', {
                        objective: data.objectiveName,
                        winner: 2,
                    });
                } else {
                    //console.log("Query Result: TIE");
                }
                

            });
            //
            socket.on('objectiveAddplayer', function (data) {
                //Set player objective as in objective boundary
                for (var p = 0; p < players.length; p++) {
                    if (players[p].id == data.remoteId) {
                        players[p].objectives.push(data.objectiveName);
                        console.log("Player " + data.remoteId + " entered zone " + data.objectiveName);
                    }
                }
            });
            //
            socket.on('objectiveRemoveplayer', function (data) {
                //remove player from objective boundary
                for (var p = 0; p < players.length; p++) {
                    if (players[p].id == data.remoteId) {
                        var objfound = -1;
                        //console.log("Player to remove " + data.remoteId + " from zone " + data.objectiveName);
                        for (var o = 0; o < players[p].objectives.length; o++) {
                            if (players[p].objectives[o] == data.objectiveName) {
                                objfound = o;
                            }
                        }
                        if (objfound != -1) {
                            //console.log("Player found to be removed " + objfound);
                            players[p].objectives.splice(objfound, 1);
                            //console.log("Player successfully removed" + data.remoteId + " from zone " + data.objectiveName);
                        }
                    }
                }
            });
            /**
             * universal broadcasting method
             */
            socket.on('impactconnectbroadcasting', function (data) {
                //console.log("Emiting Broadcast for :" + data.name);
                socket.broadcast.to(data.room).emit(data.name, data.data);
            });

            /**
             * announcing to everyone!
             */
            socket.on('announce', function (data) {
                //socket.broadcast.to(data.room).emit('announced', data.data);
                self.io.sockets.in(data.room).emit('announced', data.data);

                //io.in(data.room).emit('announced', data.data);
                //for (var p = 0; p < players.length; p++) {
                //    if (players[p].room == data.room) {
                //        socket.broadcast.to(players[p].id).emit('announced', data.data)
                //    }
                //}
            });
            /**
             * Kick a Player
             */
            socket.on('kickplayer', function (data) {
                for (var p = 0; p < players.length; p++) {
                    if (data.remoteId == players[p].id) {
                        players[p].kicked = true;
                        console.log("user found and kicked increased:", players[p].gid);
                        hp_users_col.update(
                           { 
                               pid: players[p].gid 
                           },                        { 
                               $inc : 
                                   { 
                                       kicks: 1 
                                   } 
                           },function(err){if(err){console.log("Kick Update Error:",err)}});
                    }
                }
                socket.disconnect();//Disconnects the calling client
            });
            /**
             * Request a friend a Player
             */
            socket.on('friendrequest', function (data) {
                var SrcId = socket.id;
                var ReqSrc = data.requestor;
                var ReqTarget = data.name;
                
                console.log("Looking for new friend:", data.name, data.requestor);
                hp_users_col.find({name: ReqTarget}).toArray(function(err,names){
                    console.log("Result from friend search", "src:", ReqSrc, "tar", ReqTarget, "length", names.length);
                    if (err || !names || names.length == 0) {
                        console.log("Player does not exist!",err)
                        socket.emit('friendsearchError', {});
                    }else{
                        //Loop through target friends list and make sure I am not already in it.
                        var flist = names[0].friends;
                        var found = false;
                        for(var l=0;l<flist.length;l++){
                            if(flist[l].name == ReqSrc){
                                found = true;//Player ALREADY IN FRIENDS LIST                            
                            }
                        }
                        if(!found){
                            //Retreived data, so perform updates
                            console.log("Context Data", "src:", ReqSrc, "tar", ReqTarget);
                            console.log("Pushing name into array:", names[0].name);
                            //Update Requestor with Pending!
                            hp_users_col.update(
                            { 
                                name: ReqTarget 
                            },                        { 
                                $addToSet : 
                                    { 
                                        friends: {name:ReqSrc, pid: data.pid, status:"pending"}
                                    } 
                            },function(err){
                                if(err){

                                }else{
                                    console.log("No Error, so SUCCESS! Now, update target with pending status from src");
                                    //Update Target with pending!
                                    hp_users_col.update(
                                    { 
                                        name: ReqSrc 
                                    },                        { 
                                        $addToSet : 
                                            { 
                                                friends: {name:ReqTarget, pid: names[0].pid,status:"sent"}
                                            } 
                                    },function(err){
                                        if(err){

                                        }else{
                                            console.log("No Error, so SUCCESS!");
                                            //Final update completed, so now emit a message to refresh their friends list for both members.
                                            //Loop through players, if if player is online and matches the socket.id or the target gid, then message for the refresh.
                                            for (var p = 0; p < players.length; p++) {                                           
                                                if (ReqTarget == players[p].pName) {                                                
                                                    //Broadcast to target to update list
                                                    socket.broadcast.to(players[p].id).emit('friendslistchange', {});
                                                };

                                            }
                                            //Broadcast to source to force update as well.
                                            socket.emit('friendslistchange', {});
                                        }
                                    });
                                }
                            });
                        }else{
                            console.log("ERROR: ALREADY FRIENDS! CANT ADD AGAIN!");
                        }
                    }
                });
                
              
            });
            //Confirm a friend
            socket.on('confirmFriend', function (data) {
                var friendName  = data.name;
                var requestorName = data.requestor
                //Update self
                hp_users_col.update(
               { 
                   name: requestorName, "friends.name" : friendName
               },                        { 
                   $set : 
                       { 
                           "friends.$.status": "accepted"
                       } 
               },function(err){
                   if(err){
                       console.log("Error: Confirm friend update error", err);
                   }else{
                       console.log("Confirm Source:f",friendName,"r",requestorName);  
                    //Broadcast to source to force update as well.
                    socket.emit('friendslistchange', {});
 
                   }
               });
                //Update target
                hp_users_col.update(
               { 
                   name: friendName, "friends.name" : requestorName
               },                        { 
                   $set : 
                       { 
                           "friends.$.status": "accepted"
                       } 
               },function(err){
                   if(err){
                       console.log("Error: Confirm friend update error", err);
                   }else{
                       console.log("Confirm Target:f",friendName,"r",requestorName);
                       //Check if target friend is online, and if so, then broadcoast the update to them as well.
                       for(var p=0;p<online.length;p++){
                           if(online[p].name == friendName){
                               console.log("confirm friend, target found online");
                               self.io.sockets.socket(online[p].id).emit('friendslistchange', {});
                           }
                       }
 
                   }
               });  
            });
            //Remove a friend/unblock a person/Reject a request - .update({name: "BEN"},{$pull: {"friends": {"Name":"DEV128"}}})
            socket.on('removeFriend', function (data) {
                var friendName  = data.name;
                var requestorName = data.requestor
                console.log("Remove friend", friendName, " by request from ", requestorName);
                //Update self
                hp_users_col.update(
               { 
                   name: requestorName
               },                        { 
                   $pull : 
                       { 
                           "friends": {"name":friendName}
                       } 
               },function(err){
                   if(err){
                       console.log("Error: Confirm friend update error", err);
                   }else{
                       
                       //Broadcast to source to force update as well.
                       socket.emit('friendslistchange', {});
 
                   }
               });
                //Update target
                hp_users_col.update(
               { 
                   name: friendName
               },                        { 
                   $pull : 
                       { 
                           "friends": {"name":requestorName}
                       } 
               },function(err){
                   if(err){
                       console.log("Error: Confirm friend update error", err);
                   }else{
                       //Check if target friend is online, and if so, then broadcoast the update to them as well.
                       for(var p=0;p<online.length;p++){
                           if(online[p].name == friendName){
                               self.io.sockets.socket(online[p].id).emit('friendslistchange', {});
                           }
                       }
 
                   }
               });  
            });
            //send the requestor a new friends list
            socket.on('friendlistrequest', function (data) {
                hp_users_col.find({name: data.name}).toArray(function(err,friends){
                    if (err || !friends || friends.length == 0) {
                        console.log("err requesting friends list",err);
                    }else{
                        socket.emit('newfriendslist', {friendslist:friends[0].friends});
                    }
                });
                
            });
            /**
             * disconnecting
             */
            socket.on('disconnect', function () {
                console.log("disconnecting: " + socket.id + " " + players.length + " " + players.indexOf(socket.id));
                var fo = -1;
                for (var o = 0; o < online.length; o++) {
                    if (socket.id == online[o].id) {
                        fo = o;
                    };

                }
                if(fo != -1){
                    //Remove from online listing
                    online.splice(fo,1);
                }


                var f = -1;
                for (var p = 0; p < players.length; p++) {
                    //console.log("players: " + players[p].id);
                    if (socket.id == players[p].id) {
                        //console.log("ID FOUND");
                        f = p;
                    };

                }


                //Remove player from Array
                //if (players.indexOf(socket.id) != -1) {
                if (f != -1) {
                    socket.broadcast.to(players[f].room).emit('removed', { remoteId: socket.id });
                    //Is this player a host? Well, find the next available player in same room and make them host
                    var roomStillExists = false;
                    for (var pl = 0; pl < players.length; pl++) {
                        if (players[pl].id != players[f].id) {
                            if (players[pl].room == players[f].room) {
                                roomStillExists = true;
                                console.log("Disconnecting Player still has room, but are they a host?", players[f].roomhost);
                                if (players[f].roomhost) {
                                    players[pl].roomhost = true;
                                    //update socket player with their new host role.
                                    console.log("Found next player in the room: " + players[pl].room + " " + players[pl].pName);
                                    socket.broadcast.to(players[pl].room).emit('newhost', { remoteid: players[pl].id });
                                    //End loop
                                    break;
                                }
                            }
                        }
                    }

                    //Store them in the disconnected player cache uncase they try to rejoin a game, but only if the room still has players.
                    if (roomStillExists &&  players[f].kicked == false) {
                        //Room is still open, but is the game still active?
                        dcCacheChecker(players[f].matchid,players[f], function(player){

                            dcCache.push({ playerData: player, timeStamp: Date.now(), authkey: 0 });
                        });

                        
                    }else{
                        //No more players, so make match no longer active
                        hp_matches_col.update({ matchid: players[f].matchid },{$set:{active: false}});
                        //Remove room from games list.
                        r=-1;
                        for(rm=0;rm<games.length;rm++){
                            if(players[f].room == games[rm].name){
                                r = rm;
                            }
                        }
                        
                        if(rm != -1){console.log("Removing room from games list",games[r].name); games.splice(rm, 1);};
                    }
                    //Now remove the player from the list
                    players.splice(f, 1);
                }
            });
            function dcCacheChecker(mId, player, callback){
                hp_matches_col.find({matchid: mId}).toArray(function(err,matches){
                    if (err || !matches) {
                        console.log("err",err);
                    }else{
                        //console.log("matchData", matches, "playerdata", player)
                        if(matches[0].active){
                            //Match was found, so push data via callback.
                            callback(player)
                        }else{
                            console.log("Game has ended, so dont push into DC Array to avoid reconnect issues");
                        }
                    }
                });
            }
            //Socket Help
            //// sending to sender-client only
            //socket.emit('message', "this is a test");

            //// sending to all clients, include sender
            //io.emit('message', "this is a test");

            //// sending to all clients except sender
            //socket.broadcast.emit('message', "this is a test");

            //// sending to all clients in 'game' room(channel) except sender
            //socket.broadcast.to('game').emit('message', 'nice game');

            //// sending to all clients in 'game' room(channel), include sender
            //io.in('game').emit('message', 'cool game');

            //// sending to sender client, only if they are in 'game' room(channel)
            //socket.to('game').emit('message', 'enjoy the game');

            //// sending to all clients in namespace 'myNamespace', include sender
            //io.of('myNamespace').emit('message', 'gg');

            //// sending to individual socketid
            //socket.broadcast.to(socketid).emit('message', 'for your eyes only');
        });
    }
    /**
     *  Start the server (starts up the sample application).
     */
    self.start = function() {
        //  Start the app on the specific interface (and port).
        //self.app.listen(self.port, self.ipaddress, function() {
        //    console.log('%s: Node server started on %s:%d ...',
        //                Date(Date.now() ), self.ipaddress, self.port);
        //});
        self.server.listen(self.port,self.ipaddress,function() {
            console.log('listening',self.ipaddress,self.port);
        });
    };

};   /*  Sample Application.  */


/**
 *  main():  Main code.
 */
var zapp = new SampleApp();
zapp.initialize();
zapp.start();

//Check Authentication Status
function ensureAuthenticated(req, res, next) {
    //console.log("ensureAuth:", req.user, req.isAuthenticated());

    if (req.isAuthenticated()) {
        
        //console.log("user Authenticated:",req.user, " path:", req.path);
        return next(); 
    }else{
        //console.log("user NOT Authenticated:",req.user, " path:", req.path);
    }
    res.redirect('/signin.html')
}
//Check Authentication Status for AJAX Requests
function ensureAuthenticatedAjax(req, res, next) {
    if (req.isAuthenticated()) { 
        //console.log("user Authenticated in AJAX Req:",req.user.displayName, " path:", req.path);
        return next(); 
    }
    res.send({err: 'noauth'});
}
