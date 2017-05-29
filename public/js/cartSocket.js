/*Author: Miguel Monasor*/

$(document).ready(function () {
    if (!Modernizr.websockets) {
        alert('WebSockets are not supported by this browser.');
        return;
    }

    var settings = {
    	host: 'ws://localhost:9000',
    };

    cartSocket.connect(settings);

    $.tablesorter.addParser({
        id: "date",
        is: function (s) {
            return false;
        },
        format: function (s, table) {
            var date = (s + '').match(/(\d{1,2}\s+\w{3}\s+\d{4}),(\s+\d{1,2}:\d{1,2}:\d{1,2}\s+[AP]M)/);
            return date ? new Date(date[1] + date[2]).getTime() || s : s;
        },
        type: "numeric"
    });

    $("#shoppingListTable").tablesorter({ 
        headers: { 
            1: {
                sorter: 'date'
            },
            3: { 
                // disable sorting in Action column 
                sorter: false 
            } 
        } 
    }); 
});


var cartSocket = function() {
    var settings,

    connect = function(_settings) {
        settings = _settings;
        var connection = new WebSocket(settings.host);

        connection.onopen = function () {};

        connection.onmessage = function (message) {
            var messageData = JSON.parse(message.data);
            updateProduct(messageData);
        };
    },

    isUserCartOwner = function(){
        if ($('#userLb').length>0 && $('#cart_user').val()==$('#userLb').text() ) {
           return true;
        }
        return false;
    }

    updateTotal = function(){
        var total=0;
        $('.productPrice').each(function() {
            total+=parseCurrency($( this ).text());
        });
        $('#totalLb').text('Total: $' + (void 0 == total ? '0.00' : total.toFixed(2)));
    }

    parseCurrency = function(num) {
        return parseFloat(num.replace( /,/g, '').replace('$','') );
    }

    updateProduct = function(messageData) {
        var product=messageData.product;
        var action=messageData.action;
        var productsTable = $('#shoppingListTable');
        productsTable.fadeOut(500, function() {
            switch(action) {
                case 'add':
                    var newRow='<tr data-entry='+product.id+' class="entry"><td>'+product.name+'</td><td class="dateAdded">'+product.dateAdded+'</td><td class="productPrice">'+'$' + (void 0 == product.price ? '0.00' : product.price.toFixed(2))+'</td>';
                    if (isUserCartOwner()){
                        newRow+='<td class="remove">remove</td></tr>';
                    }
                    $('#shoppingListTable tr:last').after(newRow);
                    enableRemoveEvent();
                    break;
                case 'delete':
                    $('tr[data-entry='+product.id+']').remove();
                    break;
                default:
                    break;
            }
            productsTable.fadeIn(500);
            updateTotal();
        });
    };

    return {
        connect: connect
    };
}();