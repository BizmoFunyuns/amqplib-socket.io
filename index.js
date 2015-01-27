/**
 * Created by GGuinn on 11/22/2014.
 */

var express = require('express');
var app     = express();
var http    = require('http').createServer(app);
var io      = require('socket.io')(http);
var amqp 	= require('amqplib');
//var fs 		= require('fs');
var opts 	= {
    rejectUnauthorized: 'false'
};

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

app.use(express.static(__dirname + '/'));

var errorHasOccurred = false;
var users = [];
var foosers = [];
var globalLookup = {};

function User (id, connection) {
    this.id         = id;
    this.connection = connection;
    this.closeConn  = function () {
        if (typeof this.connection !== 'undefined'){
            try {
                this.connection.close();
            }
            catch (err){
                console.log("User.closeConn exception: " + err + ". Catching exception and continuing execution.");
            }
        }
    }
}

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

    return {
        closeConn: closeConn,
        id: id,
        connection: conn
    }
};

io.on('connection', function (socket) {
    console.log('a user connected to socket ' + socket.id);

    socket.on('subscribe', function (user) {
        console.log('In socket.io message "subscribe"');

        doAmqpAdministration(user.queueName, user.id, socket);
    });

    socket.on('disconnect', function () {
        console.log('user disconnected');
    });

    socket.on('disconnecting', function (data) {
        /*var lookup = {};

        for (var i = 0, len = users.length; i < len; i++) {
            lookup[users[i].id] = users[i];
        }*/
        console.log("Disconnecting with id: " + data);
        //console.log("lookup[" + data + "]: " + JSON.stringify(lookup[data].connection, censor(lookup[data].connection), 4));

        //try {
            //lookup[data].closeConn();

        /*for (var user in globalLookup) {
            if (globalLookup.hasOwnProperty(user)) {
                console.log("user: " + JSON.stringify(globalLookup[user], censor(globalLookup[user]), 4));
            }
        }*/

        globalLookup[data].closeConn();
        delete globalLookup[data];

        /*}
        catch (err) {
            console.log("Eating exception. Nom-nom-nom...");
        }*/
    });
});

http.listen(3000, function () {
    console.log('listening on *:3000');
});

function doAmqpAdministration(queueNameSuppliedByHmi, id, socket) {
    amqp.connect('amqps://Symphony:SymphonyPass@localhost:5671', opts).then(function (conn) {

        console.log(id);

        var newUser = new User(id, conn);

        users.push(newUser);

        globalLookup[newUser.id] = newUser;

        //console.log("new globalLookup[" + newUser.id + "] = " + JSON.stringify(globalLookup[newUser.id], censor(globalLookup[newUser.id]), 4));

        var newFooser = new fooser();
        newFooser.id = id;
        newFooser.connection = conn;

        foosers.push(newFooser);

        /*foosers.forEach(function (fooser) {
            console.log(fooser);
        });*/

        /*for (var user in globalLookup) {
            if (globalLookup.hasOwnProperty(user)) {
                //console.log("user: " + JSON.stringify(user, censor(user), 4));
                console.log("user: " + JSON.stringify(globalLookup[user], censor(globalLookup[user]), 4));
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
            console.log("The error: " + err);
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
    console.log('In reconnectClient');

    //io.emit('reconnect', "Reconnecting to client");
    socket.emit('reconnect', "Reconnecting to client");

    if (errorHasOccurred) {
        errorHasOccurred = false;
    }
}

function deleteUser(id) {
    delete globalLookup[id];
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
