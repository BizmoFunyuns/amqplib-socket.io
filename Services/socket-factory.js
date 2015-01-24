/**
 * Created by GGuinn on 11/24/2014.
 */
var eventsApp = angular.module('eventsApp');
eventsApp.factory('socket', ['$rootScope', function ($rootScope) {

    console.log("In socket-factory");
    var socket = io.connect('http://localhost:3000');
    //var socket = io.connect('http://136.251.224.159:3000');

    return {
        on: function (eventName, callback) {
            socket.on(eventName, function () {
                var args = arguments;
                console.log('on args = ' + args.toString());
                $rootScope.$apply(function () {
                    callback.apply(socket, args);
                });
            });
        },
        emit: function (eventName, data, callback) {
            socket.emit(eventName, data, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    if (callback) {
                        callback.apply(socket, args);
                    }
                });
            })
        }
    };
}]);