/**
 * Created by GGuinn on 11/23/2014.
 */
var eventsApp = angular.module('eventsApp');
eventsApp.controller('RabbitController', ['$scope', '$log', 'socket', function ($scope, $log, socket) {

    $log.info('controller');
    $scope.dataFoo = [];

    socket.emit('subscribe', 'subscribing', function(msg){
        $scope.foo = msg;
    });

    $log.info('in control');

    socket.on('data', function(message) {

        $scope.dataFoo[$scope.dataFoo.length] = message.toString();
        //$scope.$apply();
    });
}]);