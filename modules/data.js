/* Adapted for GameHouse shopping cart by Miguel Monasor*/

"use strict";
var _   = require('underscore')
var nid = require('nid')

module.exports = function data( options ) {
  var name = "data"

  options = this.util.deepextend({
    prefix: '/api/data',  
    add: {redirect:'/data'},
    remove: {redirect:'/data'}
  },options)

  var cart_ent     = this.make('shop','cart')
  var product_ent  = this.make('shop','product')

  // Populate database
  this.add({role:name,cmd:'populate_db'},function(args,done){
    var seneca = this
    var product_ent  = seneca.make$('shop','product')
    var cart_ent     = this.make('shop','cart')

    cart_ent.remove$({ all$: true });
    product_ent.remove$({ all$: true });
    seneca.log.debug('delete_all');
    
    var cartpin = seneca.pin({role:'cart',cmd:'*'})
    var product_ent  = seneca.make$('shop','product')
    var apple  = product_ent.make$({name:'apple',price:2,code:'app01', created: new Date("May 30, 2017 11:10:00")}).save$(function(e,o){apple=o})
    var orange = product_ent.make$({name:'orange',price:3,code:'ora02', created:new Date("May 28, 2017 11:12:00")}).save$(function(e,o){orange=o})
    var pine = product_ent.make$({name:'pineapple',price:4,code:'pine03', created:new Date("May 29, 2017 11:12:00")}).save$(function(e,o){pine=o})
    seneca.log.debug('populate_db');
  })

  this.act({role:'web',use:{
    prefix:options.prefix,
    pin:{role:name,cmd:'*'},
    map:{
      delete_all:    {POST:{redirect:(options.add?options.add.redirect:null)}},
      populate_db:    {POST:{redirect:(options.add?options.add.redirect:null)}},
    }
  }})

  return {
    name:name
  }
}
