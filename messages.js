angular.module("messages", ["ui.bootstrap", "ngAnimate"])

    .factory("message", function() {
        var listeners = [];

        var sendMsg = function(type, msg, details) {
            if(typeof(msg) == "object") {
                details = msg.details;
                msg = msg.msg;
            }
            var addToArchive = true;
            if (messages.archive.length) {
                var last = messages.archive[0];
                if (last.type == type && last.msg === msg && last.details === details) {
                    // it is double, update the one in the archive
                    ++last.count;
                    last.datetime = new Date();
                    addToArchive = false;
                }
            }
            if (addToArchive) messages.archive.unshift({
                type: type,
                msg: msg,
                details: details,
                count: 1,
                datetime: new Date()
            });
            listeners.forEach(function(d) {
                d(type, msg, details);
            });
        };

        var messages = {
            addListener: function(fn) {
                // If messages were waiting, send them to this listener
                listeners.push(fn);
                messages.archive.forEach(function(msg) {
                    fn(msg.type, msg.msg, msg.details);
                });
            },
            error: function(msg, details) {
                sendMsg("danger", msg, details);
            },
            success: function(msg, details) {
                sendMsg("success", msg, details);
            },
            warning: function(msg, details) {
                sendMsg("warning", msg, details);
            },
            info: function(msg, details) {
                sendMsg("info", msg, details);
            },
            archive: []
        };
        return messages;
    })

    .directive("msgViewer", ["$timeout", "message",
        function($timeout, message) {

            var timeouts = {
                "danger": 9,
                "success": 5,
                "warning": 5,
                "info": 5
            };

            return {
                restrict: "A",
                scope: true,
                template: "<div class=\"fixed-alerts\">\n" +
                " <div data-ng-repeat=\"msg in msgs\"\n" +
                "      class=\"alert alert-{{msg.type}} alert-dismissable msg\"\n" +
                "      role=\"alert\"\n" +
                "      data-ng-mousemove=\"cancelTimeouts()\"\n" +
                "      data-ng-mouseleave=\"resetTimeouts()\">\n" +
                "     <div class=\"pull-right msg-ctrls\">\n" +
                "         <span class=\"fa fa-close\" data-ng-click=\"close(msg); resetTimeouts();\"></span>\n" +
                "     </div>\n" +
                "     <span class=\"preline\" data-ng-bind=\"msg.msg\"></span>\n" +
                "     <span data-ng-if=\"msg.details\">\n" +
                "         <span class=\"details-link\" data-ng-click=\"showDetails=!showDetails\">\n" +
                "             <span data-ng-bind=\"showDetails?'Hide':'Show'\"></span> details\n" +
                "         </span>\n" +
                "         <span data-uib-collapse=\"!showDetails\" class=\"alert-details\">\n" +
                "             <br />\n" +
                "             <span data-ng-bind=\"msg.details\" class=\"preline\"></span>\n" +
                "         </span>\n" +
                "     </span>\n" +
                " </div>\n" +
                "</div>",
                link: function(scope) {
                    var id = 0; // used to give each message a unique id
                    scope.msgs = [];

                    function cancelTimeout(msg) {
                        if(msg.timeout) $timeout.cancel(msg.timeout);
                        msg.countdown = 0;
                    }

                    function resetTimeout(msg) {
                        cancelTimeout(msg);
                        msg.countdown = timeouts[msg.type];
                        var fn = function() {
                            if(msg.countdown === 1) {
                                scope.close(msg);
                            } else {
                                --msg.countdown;
                            }
                            msg.timeout = $timeout(fn, 1000);
                        };
                        msg.timeout = $timeout(fn, 1000);
                    }

                    scope.cancelTimeouts = function() {
                        scope.msgs.forEach(cancelTimeout);
                    };

                    scope.resetTimeouts = function() {
                        scope.msgs.forEach(resetTimeout);
                    };

                    scope.close = function(msg) {
                        scope.msgs.some(function(d, i) {
                            if(d.id == msg.id) {
                                scope.msgs.splice(i, 1);
                                return true;
                            }
                            return false;
                        });
                    };

                    message.addListener(function(type, msg, details) {
                        // if an equivalent message group is already in the messages, reset its timeout
                        // and do not add this one
                        var exists = false;
                        scope.msgs.some(function(oldMsg) {
                            if(oldMsg.type == type && oldMsg.msg === msg && oldMsg.details === details) {
                                resetTimeout(oldMsg);
                                exists = true;
                                return true;
                            }
                            return false;
                        });
                        if(exists) return;
                        var msgObj = {
                            id: id++,
                            type: type,
                            msg: msg,
                            details: details,
                            countdown: false,
                            timeout: 0
                        };

                        resetTimeout(msgObj);

                        scope.msgs.push(msgObj);

                        // and at last, remove all other non-success messages if this is a success
                        if(type == "success") {
                            scope.msgs = scope.msgs.filter(function(msg) {
                                return msg.type == "success";
                            });
                        }
                    });
                }
            }
        }])

    .directive("msgArchive", ["message", function(message) {
        return {
            restrict: "A",
            template: "<div class=\"msg-archive\">\n" +
            " <div ng-show=\"showFilters\" class=\"well well-sm\">\n" +
            "     <div class=\"filter\" ng-repeat=\"(name, filter) in filters\" ng-show=\"filter.show\">\n" +
            "         <input type=\"checkbox\"\n" +
            "                ng-model=\"filter.checked\"\n" +
            "                id=\"msg-archive-checkbox-{{name}}\" />\n" +
            "         <label for=\"msg-archive-checkbox-{{name}}\" ng-bind=\"filter.label\"></label>\n" +
            "     </div>\n" +
            " </div>\n" +
            " <h3 ng-show=\"archive.length==0\">No archived messages yet</h3>\n" +
            " <div ng-show=\"archive.length>0\">\n" +
            "     <div ng-repeat=\"msg in archive|filter:showmsg\" ng-class=\"'panel panel-'+msg.type\">\n" +
            "         <div class=\"panel-heading\">\n" +
            "             <span ng-bind=\"msg.datetime|formatDatetime\"></span>\n" +
            "             <span class=\"pull-right\" ng-show=\"msg.count>1\" ng-bind=\"'('+msg.count+')'\" tooltip=\"This message has occurred {{msg.count}} times in a row\"></span>\n" +
            "         </div>\n" +
            "         <div class=\"panel-body msg\">" +
            "             <p ng-bind=\"msg.msg\"></p>\n" +
            "             <p ng-show=\"msg.details\" class=\"alert-details\" ng-bind=\"msg.details\">\n" +
            "         </div>\n" +
            "     </div>\n" +
            " </div>\n" +
            "</div>",
            link: function(scope) {
                scope.showFilters = false;
                scope.filters = {
                    danger: { label: "Errors", checked: true, show: false},
                    success: { label: "Success messages", checked: true, show: false},
                    warning: { label: "Warnings", checked: true, show: false},
                    info: { label: "Info messages", checked: true, show: false}
                };
                scope.archive = message.archive;

                message.addListener(function(type) {
                    scope.showFilters = true;
                    scope.filters[type].show = true;
                });

                scope.showmsg = function(msg) {
                    return scope.filters[msg.type].checked;
                };

                scope.show = 10;
            }
        };
    }]);
