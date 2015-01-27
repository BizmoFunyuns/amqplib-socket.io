/**
 * Created by GGuinn on 11/23/2014.
 */
var eventsApp = angular.module('eventsApp');
eventsApp.controller('RabbitController', ['$scope', '$log', '$route', 'socket', function ($scope, $log, $route, socket) {

    $log.info('controller');
    $scope.dataFoo = [];

    $scope.user = {
        queueName: "new_plan_issued",
        id: Math.floor(Math.random() * 101)
    };

    /*socket.emit('subscribe', 'New_Plan_Issued', function(msg){
        $scope.foo = msg;
    });*/

    socket.emit('subscribe', $scope.user, function(msg){
        $scope.foo = msg;
    });

    $log.info('in control');

    socket.on('data', function(message) {
        $scope.dataFoo[$scope.dataFoo.length] = message.toString();
    });

    socket.on('reconnect', function (message) {
        console.log('in controller reconnect');
        window.location.reload();
        socket.emit('data', message);
    });

    window.onbeforeunload = function (event) {
        socket.emit('disconnecting', $scope.user.id);
    };

    $scope.$on('$destroy', function() {
        delete window.onbeforeunload;
    });
}]);