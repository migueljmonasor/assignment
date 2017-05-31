/* Adapted for GameHouse shopping cart by Miguel Monasor*/

"use strict";
var _   = require('underscore')
var nid = require('nid')
var dateFormat = require('dateformat');

var socketServer = require('../socketServer');

module.exports = function cart( options ) {
  var name = "cart"

  options = this.util.deepextend({
    prefix: '/api/cart',
    add: {redirect:'/cart'},
    remove: {redirect:'/cart'}
  },options)

  var cart_ent     = this.make('shop','cart')
  var product_ent  = this.make('shop','product')

  var add_count = 0
  var salestax_update = false

  // create a new empty cart, args can contain custom values
  // but id,created,modified,entries,total,status are set by this plugin
  this.add({role:name,cmd:'create'},function(args,done){
    var seneca = this

    var cart = cart_ent.make$()
    cart.created = cart.modified = new Date()
    cart.entries = []
    cart.total = 0
    cart.status = 'open'
    if (cart.user){
      cart.user=args.user.email
    }
/*
    _.each( seneca.util.clean(_.omit(args, ['role','cmd','cart','id','created','modified','entries','total','status'])), function(v,k){
      cart[k]=v
    })
*/
    cart.save$(function(err,cart){
      if( err ) return done(err);
      seneca.log.debug('create',cart.id)
      done(null,{cart:cart})
    })
  })


    
  // adds entry based on product data
  // adds entry fields id, type, sort
  // does not save cart, rather calls trigger:update action
  this.add(
    {role:name,cmd:'add_entry'},
    //{required$:['cart'],object$:['cart']},
    function(args,done){
      var seneca = this

      var cart = args.cart
      if( !cart ) {
        this.act({role:name,cmd:'create'},function(err,out){
          if( err ) return done(err);
          do_product(out.cart)
        })
      }
      else do_product(cart)

      function do_product( cart ) {
        var product = args.product

        if( !product ) {
          product_ent.load$({code:args.code},function(err,product){
            if( err ) return done(err);
            do_add(product)
          })
        }
        else do_add(product);

        function do_add(product) {
          var entry = _.extend({},product.data$(false))

          // entry fields that can be overwritten
          entry.sort = 1000*(new Date().getTime()%1000000000)+(add_count++)
          entry.quantity = 1

          // custom and overwrite
          _.each( seneca.util.clean(_.omit(args, ['role','cmd','cart'])), function(v,k){
            entry[k]=v
          })

          // controlled fields
          entry.id = nid()
          entry.type = 'product'

          
          var now = new Date();
          entry.dateAdded=dateFormat(now, "dd mmmm yyyy, h:MM:ss TT");

          seneca.log.debug('add/product',cart.id,entry)
          cart.entries.push(entry)

          //send message to socket to update the cart in all connected browsers
          socketServer.updateProduct(entry,cart.id,'add');

          seneca.act({role:name,trigger:'update',cart:cart},done)
        }
      }
    })


  // removes an entry by id
  // cals trigger:update action
  this.add({role:name,cmd:'remove_entry'},function(args,done){
    var seneca = this

    var cart = args.cart

    var removed_entry
    cart.entries = _.filter(cart.entries,function(entry){
      if( entry.id == args.entry ) {
        removed_entry = entry
        return false
      }
      else return true
    })

    seneca.log.debug('remove/entry',cart.id,'entry:',args.entry,removed_entry)

    //send message to socket to update the cart in all connected browsers
    socketServer.updateProduct(removed_entry, cart.id,'delete');

    seneca.act({role:name,trigger:'update',cart:cart},done)
  })

  this.add({role:name,trigger:'update'},function(args,done){
    var seneca = this
    var cart = args.cart

    cart.entries = cart.entries.sort(function(a,b){
      if( a.inserted && b.inserted ) {
        return b.inserted - a.inserted
      }
      else if( a.footer ) {
        return 1
      }
      else if( b.footer ) {
        return -1
      }
      else {
        return 0
      }
    })

    var total = 0
    cart.entries.forEach(function(entry){
      if( _.isNumber(entry.price) ) {
        total+=entry.price
      }
    })
    cart.total = total
     
    seneca.log.debug('update/total',cart.id,'total:',cart.total,'size:',cart.entries.length)

    cart.modified = new Date()
    cart.save$(function(err,cart){
      if( err ) return done(err);
      done(null,{cart:cart})
    })
  })


  // get cart entity from cart id via ensure_entity wrapper
  // also for http api
  this.add({role:name,cmd:'getCart'},function(args,done){
    var cartId=args.req$.query.id;
    var cart

    if (cartId){
      cart_ent.list$({user:cartId}, function(err, result){
        cart=result.length>0? result[0]:null;
        done(null,{cart:cart}) 
      })
    }else{
      if (args.req$.seneca.user){
        cart_ent.list$({user:args.req$.seneca.user.email}, function(err, result){
        if (result.length>0){
          done(null,{cart:result[0]}) 
        }else{
          this.act({role:name,cmd:'create',user:args.req$.seneca.user},done)
        }
        })
      }else{
        args.res$.render('login.ejs',{})
      }
  }
})

  // get shopping lists and items
  this.add({role:name,cmd:'getListandItems'},function(args,done){ 
    var numShoppingList=0;
    var totalItemsInAllShoppingList=0;
    cart_ent.list$({}, function(err, carts){
      carts.forEach(function(cart){
        if (cart.entries.length>0){
          numShoppingList++;
        }
        totalItemsInAllShoppingList+=cart.entries.length;
      })
      done(null,{totalItemsInAllShoppingList:totalItemsInAllShoppingList, numShoppingList:numShoppingList});     
     })
  });

  // get products
  // also for http api
  this.add({role:name,cmd:'getProducts'},function(args,done){
    var productsList
    product_ent.list$( { }, function(err,productsList){
 
    cart_ent.list$({user:args.req$.seneca.user.email}, function(err, cart){
      if (cart.length>0){
         done(null,{products:productsList, cart:cart[0] });
      }else{
        this.act({role:name,cmd:'create',user:args.req$.seneca.user}, function (args, cart){
          done(null,{products:productsList, cart:cart.cart });
        })
      }
      
    })      
  })
  })

  if( _.isArray(options.onlyone) ) {
    this.add({role:name,trigger:'update'},function(args,cb){
      var seneca = this

      var cart = args.cart

      var last = {}
      var newentries = []
      cart.entries = cart.entries || []
      cart.entries.forEach(function(entry){
        if( _.contains(options.onlyone,entry.category) ) {
          last[entry.category] = entry
        }
        else {
          newentries.push(entry)
        }
      })
      for( var category in last ) {
        newentries.push(last[category])
      }

      cart.entries = newentries
      cart.save$( function(err,cart){
        seneca.log.debug('update/onlyone',cart.id,_.keys(last))
        seneca.parent(args,cb)
      })
    })
  }

  // ensure args.{cart,product} is a valid entity
  // loads ent if value is just an id
  this.act({
    role:'util',
    cmd:'ensure_entity',
    pin:{role:'cart',cmd:'*'},
    entmap:{
      cart:cart_ent,
      product:product_ent,
    }
  })

  this.act({role:'web',use:{
    prefix:options.prefix,
    pin:{role:name,cmd:'*'},
    map:{
      add_entry:    {POST:{redirect:(options.add?options.add.redirect:null)}},
      remove_entry: {POST:{redirect:(options.remove?options.remove.redirect:null)}},
      getProducts:      {GET:{}},
      getCart:      {GET:{filter:['id','$']}},
      complete: {POST:{redirect:(options.complete?options.complete.redirect:null)}},
    }
  }})

  this.add({init:name}, function( args, done ){
    this.act('role:util, cmd:define_sys_entity', {list:[
      cart_ent,
      product_ent
    ]})

    done()
  })

  return {
    name:name
  }
}
