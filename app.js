var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session'),
    flash = require('connect-flash');
var ig = require('instagram-node').instagram();

// Every call to `ig.use()` overrides the `client_id/client_secret` 
// or `access_token` previously entered if they exist. 
//ig.use({ access_token: 'YOUR_ACCESS_TOKEN' });
ig.use({ client_id: 'e3975ca3f0a54f538de0747c92e5484b',
         client_secret: '6691a82af1aa463ca55bef0c0b0dbc69' });

// Instagram Redirect URI
var redirect_uri = 'http://localhost:3000/handleauth';

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//Express Session
app.use(session({
    secret: 'secret',
    saveUninitialized: true,
    resave: true
}));

//Connect Flash
app.use(flash());

//Global Vars
app.use(function(req, res, next){
    res.locals.messages = require('express-messages')(req, res);
    
    res.locals.moment = require('moment');
    res.locals.formatDate = function(date){
        var myDate = new Date(date * 1000);
        return myDate.toLocaleString();
    };
    
    if(req.session.accesstoken && req.session.accesstoken != 'undefined') {
        res.locals.isLoggedIn = true;
        console.log('%%% Logged In %%%');
    } else {
        res.locals.isLoggedIn = false;
        console.log('%%% Logged Out %%%');
    }
    
    next();
});

//Home Route
app.get('/', function(req, res){
    if(res.locals.isLoggedIn) {
        console.log('/// You are logged in ///');
    } else {
        console.log('/// You are not logged in ///');
    }
    res.render('index', {
        title: 'Welcome'
    });
});

// Instagram Login Route
app.get('/login', function(req, res){
    if(!res.locals.isLoggedIn){
        res.redirect(ig.get_authorization_url(redirect_uri, { scope: ['likes'], state: 'a state' }));
    } else {
        console.log('*** Already logged in, skipping ig.get_auth');
        res.redirect('/main');
    }
});

// Handle Auth Route
app.get('/handleauth', function(req, res){
    ig.authorize_user(req.query.code, redirect_uri, function(err, result) {
    if (err) {
        console.log(err.body);
        res.send("Didn't work");
    } else {
        req.session.accesstoken = result.access_token;
        req.session.uid = result.user.id;
        ig.use({access_token: req.session.accesstoken});
        
        console.log('******************');
        console.log('*** Authorized ***');
        console.log('*** Access token is ' + result.access_token);
        console.log('*** user.id is ' + result.user.id);
        console.log('*** user.username is ' + result.user.username);
        console.log('******************');
        
        res.redirect('/main');
    }
  });
});

// Main Route
app.get('/main', function(req, res){
    ig.user(req.session.uid, function(err, result, remaining, limit){
        if(err) {
            res.send(err);
        } else {
            //ig.user_self_feed(req.session.accesstoken, function(err, medias, pagination, remaining, limit){
            //ig.user_media_recent(req.session.uid, {}, function(err, medias, pagination, remaining, limit) {  
            ig.user_self_feed({}, function(err, medias){
                if(err) {
                    console.log('!!! ERROR: app.js/main - user_self_feed');
                    console.log('!!! err: ' + err);
                    console.log('!!! medias: ' + medias);
                    if(medias == null){
                        console.log('!!! ERROR: medias is undefined.  No Content.');
                        res.render('main', {
                            title: 'Main Instagram Feed',
                            user: result,
                            medias: {}
                        });
                    } else {
                        res.send(err);
                        /*res.render('main', {
                            title: 'Main Instagram Feed',
                            user: result,
                            medias: medias
                        });*/
                    }
                } else {
                    res.render('main', {
                        title: 'Main Instagram Feed',
                        user: result,
                        medias: medias
                    });
                }
            });
        }
    });
});

// Me (My Images link) Route
app.get('/me', function(req, res){
  ig.user(req.session.uid, function(err, result, remaining, limit){
    if(err){
      res.send(err);
    } else {
      ig.user_self_media_recent({}, function(err, medias){
          if(err) {
              consolelog('### ERROR: user_self_media_recent');
              res.send(err.body);
          } else {
              res.render('main', {
                title:'My Recent Images',
                user: result,
                medias: medias
              })
          }
      });
    }
  });
});

// Logout Route
app.get('/logout', function(req, res){
    req.session.accesstoken = false;
    req.session.uid = false;
    res.redirect('/');
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
