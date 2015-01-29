/**
 * Created by GGuinn on 11/22/2014.
 */

'use strict';

var express = require('express');
var app     = express();
var http    = require('http').createServer(app);
var io      = require('socket.io')(http);
var amqp 	= require('amqplib');
var opts 	= {
    rejectUnauthorized: 'false'
};

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

app.use(express.static(__dirname + '/'));

var errorHasOccurred = false;
var users = {};
var fooser = function () {
    var conn    = null;
    var id      = -1;

    function closeConn() {
        if (typeof conn !== 'undefined') {
            try {
                conn.close();
            }
            catch (err) {
                console.log("fooser.closeConn exception: " + err + ". Catching exception and continuing execution.");
            }
        }
        else {
            console.log("This connection is undefined");
        }
    }

    function setConn (newConn) {
        conn = newConn;
    }

    return {
        closeConn: closeConn,
        id: id,
        connection: conn,
        setConn: setConn
    }
};

io.on('connection', function (socket) {
    console.log('a user connected to socket ' + socket.id);

    socket.on('subscribe', function (user) {
        console.log("User " + user.id + " has connected");

        doAmqpAdministration(user.id, socket);
    });

    socket.on('disconnect', function () {
        console.log("socket " + socket.id + " has disconnected");
    });

    socket.on('disconnecting', function (userId) {
        console.log("Disconnecting user: " + userId);

        //TODO: Move to own method
        try {
            users[userId].closeConn();
        }
        catch (err) {
            console.log("There was an error closing the connection associated with user ID " + userId);
        }

        deleteUser(userId);
    });
});

http.listen(3000, function () {
    console.log('listening on *:3000');
});

function doAmqpAdministration(id, socket) {
    amqp.connect('amqps://Symphony:SymphonyPass@localhost:5671', opts).then(function (conn) {
        var newFooser = new fooser();

        newFooser.id = id;

        newFooser.setConn(conn);

        users[newFooser.id] = newFooser;

        /*foosers.forEach(function (fooser) {
            console.log(fooser);
        });*/

        /*for (var user in users) {
            if (users.hasOwnProperty(user)) {
                //console.log("user: " + JSON.stringify(user, censor(user), 4));
                console.log("user: " + JSON.stringify(users[user], censor(users[user]), 4));
            }
        }*/

        conn.createChannel().then(function (ch) {
            //ch.assertQueue(queueNameSuppliedByHmi, {durable: false})
            ch.assertQueue("", {durable: false, autoDelete: true})
                .then(function (queue) {
                    console.log("Queue '" + queue.queue + "'");

                    ch.consume(queue.queue, function (msg) {
                        console.log(" [x] Received '%s'", msg.content.toString());

                        socket.emit('data', msg.content.toString());
                    },
                    {noAck: true})
                })
                .then(function () {
                    console.log(' [*] Waiting for messages. To exit press CTRL+C');
                });

            ch.on('error', function (err) {
                console.log("There was a channel error: " + err);
            });

            ch.on('close', function () {
                console.log("Channel closed");
            });
        });

        conn.on('error', function (err) {
            console.log("there was an amqp error: " + err);
            errorHasOccurred = true;
        });

        conn.on('close', function () {
            console.log("amqp was closed");

            if (errorHasOccurred) {
                console.log("Error has occurred");
                //reconnectClient();
                deleteUser(id);

                reconnectClient(socket);
            }
        });
    },
    function (err) {
        console.log(err);
    })
}

function reconnectClient (socket) {
    console.log("Attempting to reconnect with client");

    socket.emit('reconnect_client', "Reconnecting to client");

    if (errorHasOccurred) {
        errorHasOccurred = false;
    }
}

function deleteUser(id) {
    try {
        delete users[id];
    }
    catch (err) {
        console.log("There was an error deleting the user associated with ID " + id);
    }
}

/*function censor(censor) {
    var i = 0;

    return function(key, value) {
        if(i !== 0 && typeof(censor) === 'object' && typeof(value) == 'object' && censor == value)
            return '[Circular]';

        if(i >= 29) // seems to be a harded maximum of 30 serialized objects?
            return '[Unknown]';

        ++i; // so we know we aren't using the original object anymore

        return value;
    }
}*/
