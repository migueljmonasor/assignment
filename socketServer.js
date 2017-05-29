/* Author Miguel Monasor*/

var socketServer = function() {
    var data = null,
    timerID = null,
    sockets =[],
    socketServer = null, 
    /* Add module imports here */
    ws = require('websocket.io'), 
    domain = require('domain'),
    reqDomain = domain.create(),
    socketDomain = domain.create(),
  
    socketListen = function(port) {
        socketDomain.on('error', function(err) {
            console.log('Error caught in socket domain:' + err);
        });

        socketDomain.run(function() { 
            socketServer = ws.listen(port);

            socketServer.on('listening',function(){
                console.log('SocketServer is running');
            });

            socketServer.on('connection', function (socket) {

                console.log('Connected to client');
                sockets.push(socket);

                socket.on('message', function (data) { 
                    console.log('Message received:', data);
                });

                socket.on('error', function(err) {
                    console.log('Error: ' + err.toString());
                });

                socket.on('close', function () {
                    try {
                        socket.close();
                        socket.destroy();
                        console.log('Socket closed!');                       
                        for (var i = 0; i < sockets.length; i++) {
                            if (sockets[i] == socket) {
                                sockets.splice(i, 1);
                                console.log('Removing socket from collection. Collection length: ' + sockets.length);
                                break;
                            }
                        }
                        
                        if (sockets.length == 0) {
                            clearInterval(timerID);
                            data = null;
                        }
                    }
                    catch (e) {
                        console.log(e);
                    }
                });

            });  
        });      
    },

    updateProduct = function(product, cartId, action) {
        console.log('Adding product ' + product.id + ' to cart ' + cartId + ' action: ' + action);
        
        if (sockets.length) {
            console.log('Sending data...');
            for(i=0;i<sockets.length;i++)
            {
                try {
                    sockets[i].send(JSON.stringify({"product": product, "cartId": cartId, "action": action}));
                }
                catch (e)
                {
                    console.log(e);                
                }
            }
        }
    },

    init = function(socketPort) {
        socketListen(socketPort);
    };

    return {
        init: init,
        updateProduct:updateProduct
    };
}();
module.exports = socketServer;