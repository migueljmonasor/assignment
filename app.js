/* Copyright (c) 2013-2015 Richard Rodger, MIT License */
/* Adapted for GameHouse shopping cart by Miguel Monasor*/

"use strict";

var http = require('http')

var express        = require('express')
var bodyParser     = require('body-parser')
var cookieParser   = require('cookie-parser')
var methodOverride = require('method-override')
var session        = require('express-session')
var serveStatic    = require('serve-static')
var argv    = require('optimist').argv

var conf = {
  port: argv.p || 3000
}

// create a seneca instance
var seneca  = require('seneca')()

//Database connection
seneca.use('mongo-store',{
  name:'gamehouse',
  host:'127.0.0.1',
  port:27017
})

// use the engage plugin to store extended user sessions
// these are known as "engagements"
// this means that user's shopping carts will be saved and still active if they
// return the next day
seneca.use('engage')

// the shopping cart plugin provides standard web shopping cart business logic
// and also a HTTP JSON api
var cartModule = require(__dirname + '/modules/cart');
seneca.use(cartModule)

var dataModule = require(__dirname + '/modules/data');
seneca.use(dataModule)

var userModule = require(__dirname + '/modules/user');
seneca.use(userModule);

var authModule = require(__dirname + '/modules/auth');

// the auth plugin handles HTTP authentication
seneca.use(authModule,{
  // redirects after login are needed for traditional multi-page web apps
  redirect:{
    login: {
      win:  '/account',
      fail: '/login#failed'
    },
    register: {
      win:  '/account',
      fail: '/#failed'
    }
  }
})

// set up express
var app = express()
app.enable('trust proxy')

app.use(cookieParser())
app.use(express.query())
app.use(bodyParser.urlencoded({extended: true}))
app.use(methodOverride())
app.use(bodyParser.json())

app.use(serveStatic(__dirname + '/public'))

// expose the shopping cart api
// the seneca.export('web') method returns a single function with the signature
// function(req,res,next) that can be used with connect or express
// this service method wraps up all the plugin HTTP endpoints
// seneca includes the connect utility plugin by default, which
// sets the special arguments req$ and res$ on all seneca calls, allowing
// seneca actions to access the current HTTP req and res objects 
app.use( seneca.export('web') )

// init socket for automatic UI update on database changes
var socketServer = require('./socketServer');
socketServer.init(9000);

// express views for the cart pages
app.engine('ejs',require('ejs-locals'))
app.set('views', __dirname + '/views')
app.set('view engine','ejs')

// a utility method
function formatprice(price) {
  return '$' + (void 0 == price ? '0.00' : price.toFixed(2))
}

app.get('/', function(req,res,next){
  req.seneca.act('role:user,cmd:getRegisteredUsers',function(err,registeredUsers) {
    if( err ) return next(err);   
    req.seneca.act('role:cart,cmd:getListandItems',function(err,listandItems) {
      if( err ) return next(err);
      res.render('home.ejs',{locals:{registeredUsers:registeredUsers, numShoppingList:listandItems.numShoppingList, totalItemsInAllShoppingList:listandItems.totalItemsInAllShoppingList, user:req.seneca.user}})
    });
  });
});

app.get('/cart', function(req,res,next){
  req.seneca.act('role:cart,cmd:getCart',function(err,out) {
    if( err ) return next(err);
    req.seneca.act('role:user,cmd:getUserByEmail, email:'+out.cart.user,function(err,cartUser) {
      res.render('cart.ejs',{locals:{cart:out.cart,formatprice:formatprice, user:req.seneca.user, cartUser:cartUser[0]}})
    });
  });
});

app.get('/data', function(req,res,next){ 
      res.render('dataAdmin.ejs',{status:"updated"})
});

app.get('/checkout', function(req,res,next){
  req.seneca.act('role:cart,cmd:get',function(err,out) {
    if( err ) return next(err);
    res.render('checkout.ejs',{locals:{cart:out.cart,formatprice:formatprice}})
  })
})

app.get('/dataAdmin', function(req,res,next){
    res.render('dataAdmin.ejs',{status:""})
})

// when rendering the account page, use the req.seneca.user object
// to get user details. This is automatically set up by the auth plugin
app.get('/account', function(req, res){
    req.seneca.act('role:cart,cmd:getProducts',function(err,out) {
      if( err ) return next(err);
      res.render('account.ejs',{locals:{cart:out.cart, products:out.products,formatprice:formatprice, user:req.seneca.user}})
    })
})

app.get('/doc_introduction', function(req,res,next){
    res.render('doc_introduction.ejs',{locals:{user:req.seneca.user}})
})

app.get('/doc_instructions', function(req,res,next){
    res.render('doc_instructions.ejs',{locals:{user:req.seneca.user}})
})

app.get('/doc_deployment', function(req,res,next){
    res.render('doc_deployment.ejs',{locals:{user:req.seneca.user}})
})

app.get('/doc_checklist', function(req,res,next){
    res.render('doc_checklist.ejs',{locals:{user:req.seneca.user}})
})

app.get('/about', function(req,res,next){
    res.render('about.ejs',{locals:{user:req.seneca.user}})
})

app.get('/login', function(req, res){
  res.render('login.ejs',{})
})

app.get('/signup', function(req, res){
  res.render('signup.ejs',{})
})

app.get('/logout', function (req, res){
  var tokenkey="seneca-login"
  var clienttoken = req.seneca.cookies.get(tokenkey)
  var servertoken
  res.seneca.cookies.set(tokenkey)

  if( clienttoken ) {
    servertoken = req.seneca.login && req.seneca.login.token
    var useract = seneca.pin({role:'user',cmd:'*'})
    useract.logout({token:clienttoken},logerr)
  }

  if( servertoken && servertoken != clienttoken ) {
    seneca.log('auth','token-mismatch',clienttoken,servertoken)
    useract.logout({token:servertoken},logerr)
  }

  try { req.logout() } catch(err) { logerr(err) }
  if( req.seneca ) {
    delete req.seneca.user
    delete req.seneca.login
  }
  res.render('login.ejs',{})
});

// Use seneca.ready to ensure all plugins fully ready
// before we extend action patterns
seneca.ready(function(){
  // ensure that cart actions get the cart from the engagement
  seneca.wrap({role:'cart',cmd:'*'},function(args,done){
    var seneca = this
    var prior  = this.prior
      if( !args.req$ ) return this.prior( args, done );

      this.act('role:engage,cmd:get,key:cart',function(err,out) {
        if( err ) return done(err);

        args.cart = out.value
        prior( args, function(err,out) {
          if( err ) return done(err);
          if (args.cmd!="getListandItems"){
            this.act('role:engage,cmd:set,key:cart',{value:out.cart.id},function(err){
              if( err ) return done(err);
              done(null,out)
            })
            }else{
              done(null,out);
            }
        })
      })
  
  })
})

// use the node.js http api to create a HTTP server
// this allows the admin plugin to use websockets
var server = http.createServer(app)
server.listen(conf.port)
server.on('error', function(err) { 
  console.log(err.toString());
 });

// unlike the user-accounts example, the local:true
// setting means anybody can access the admin panel from localhost
seneca.use('data-editor',{admin:{local:true}})
seneca.use('admin',{server:server,local:true})

function logerr(err) {
  if( err ) return seneca.log('error',err);
}