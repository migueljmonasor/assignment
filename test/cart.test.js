/* Author Miguel Monasor*/
"use strict";
var assert  = require('chai').assert
var util    = require('util')

var _  = require('underscore')
var gex  = require('gex')

var seneca = require('seneca')()

seneca.use( 'engage' )
seneca.use( require('../modules/cart') )

var cartpin = seneca.pin({role:'cart',cmd:'*'})

var product_ent  = seneca.make$('shop','product')
var cart_ent     = seneca.make$('shop','cart')
var purchase_ent = seneca.make$('shop','purchase')

var apple  = product_ent.make$({name:'apple',price:11,code:'app01'}).save$(function(e,o){apple=o})
var orange = product_ent.make$({name:'orange',price:22,code:'ora02'}).save$(function(e,o){orange=o})

var cart

function squish(obj) { return util.inspect(obj).replace(/\s+/g,'') }

describe('engage', function() {
  
  it('Check seneca version', function() {
    assert.ok(gex(seneca.version),'0.6.*')
  }),


  it('Cart creation', function(done) {
    cartpin.create({},function(err,out){
      assert.isNull(err)
      var cart = out.cart
      assert.isNotNull(cart)
      assert.ok(cart.entity$)
      assert.equal('open',cart.status)
      done()
    })
  })

  it('Add product to cart', function(done) {
    cartpin.add_entry({code:'app01'},function(err,out){
      assert.isNull(err)
      cart = out.cart
      assert.isNotNull(cart)
      assert.ok(cart.entity$)
      assert.equal('open',cart.status)
      assert.equal(11,cart.total)
      assert.equal(1,cart.entries.length)
      assert.equal('app01',cart.entries[0].code)
      done()
    })
  })

  it('Remove product from cart', function(done) {
      cartpin.remove_entry({entry:cart.entries[0].id, cart:cart},function(err, out){
      assert.isNull(err)
      var cart = out.cart
      assert.isNotNull(cart)
      assert.ok(cart.entity$)
      assert.equal('open',cart.status)
      assert.equal(0,cart.total)
      assert.equal(0,cart.entries.length)
      done()
      })
    })
})