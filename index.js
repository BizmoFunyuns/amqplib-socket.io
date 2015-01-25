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

function User (id, connection) {
    this.id = id;
    this.connection = connection;
    this.closeConn = function () {
        if (typeof this.connection !== 'undefined'){
            try {
                this.connection.close();
            }
            catch (err){
                console.log("User.closeConn exception: " + err + ". Eating exception and returning execution. Nom-nom-nom...");
            }
        }
    }
}

var fooser = function () {
    var conn = null;
    var id = -1;

    function closeConn() {
        if (typeof conn !== 'undefined') {
            console.log("In close");
            conn.close();
        }
        else {
            console.log("Did not delete user with id " + id);
        }
    }

    return {
        closeConn: closeConn,
        id: id,
        connection: conn
    }
};

io.on('connection', function (socket) {
    console.log('a user connected');

    socket.on('subscribe', function (user) {

        console.log('In socket.io message "subscribe"');

        doAmqpAdministration(user.queueName, user.id);
    });

    socket.on('disconnect', function () {
        console.log('user disconnected');
    });

    socket.on('disconnecting', function (data) {
        var lookup = {};

        for (var i = 0, len = users.length; i < len; i++) {
            lookup[users[i].id] = users[i];
        }
        console.log("Disconnecting with id: " + data);
        //console.log("lookup[" + data + "]: " + JSON.stringify(lookup[data].connection, censor(lookup[data].connection), 4));

        try {
            lookup[data].closeConn();
        }
        catch (err) {
            console.log("Eating exception. Nom-nom-nom...");
        }
    });
});

http.listen(3000, function () {
    console.log('listening on *:3000');
});

function doAmqpAdministration(queueNameSuppliedByHmi, id) {
    amqp.connect('amqps://Symphony:SymphonyPass@localhost:5671', opts).then(function (conn) {

        console.log(id);

        var newUser = new User(id, conn);
            /*newUser.id = id;
            newUser.connection = conn;*/

        users.push(newUser);

        var newFooser = new fooser();
        newFooser.id = id;
        newFooser.connection = conn;

        foosers.push(newFooser);

        foosers.forEach(function (fooser) {
            console.log(fooser);
        });

        //newUser = {};

        /*users.push({
            id: id,
            queueName: queueNameSuppliedByHmi,
            connection: conn
        });*/

        /*users.forEach(function (user){
            console.log(user);
        });*/

        conn.createChannel().then(function (ch) {
            ch.assertQueue(queueNameSuppliedByHmi, {durable: false})
                .then(function () {
                    console.log("Queue '" + queueNameSuppliedByHmi + "' asserted successfully");

                    ch.consume(queueNameSuppliedByHmi, function (msg) {

                        console.log(" [x] Received '%s'", msg.content.toString());

                        io.emit('data', msg.content.toString());
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
                errorHasOccurred = false;
            }
        });
    })
}
