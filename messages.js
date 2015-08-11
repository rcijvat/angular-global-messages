angular.module("messages", ["ngAnimate"])

.factory("message", function() {
	var errMem = [];
	var listeners = [];
	
	var sendMsgs = function(type, msgs) {
		if(!Array.isArray(msgs)) {
			msgs = [msgs];
		}
        msgs = msgs.map(function(msg) {
            if(typeof(msg) == "string") {
                return { msg: msg };
            }
            return msg;
        });
		if(listeners.length == 0) {
			// If we have no listeners, it might be that they still need to be linked.
			// Store call locally, until someone links to it
			return errMem.push({type: type, msgs: msgs});
		}
		listeners.forEach(function(d) {
			d(type, msgs);
		});
	};

	return {
		addListener: function(fn) {
			// If messages were waiting, send them to this listener
			listeners.push(fn);
			errMem.forEach(function(d) { sendMsgs(d.type, d.msgs); });
			errMem = [];
		},
		error: function(msgs) {
			sendMsgs("danger", msgs);
		},
		success: function(msgs) {
			sendMsgs("success", msgs);
		},
		warning: function(msgs) {
			sendMsgs("warning", msgs);
		},
		info: function(msgs) {
			sendMsgs("info", msgs);
		}
	};
})

.directive("msg", ["$timeout", "message",
		function($timeout, message) {

	var timeouts = {
		"danger": 10,
		"success": 5,
		"warning": 5,
		"info": 5
	};

 	return {
		restrict: "A",
        scope: true,
		template: "<div class=\"fixed-alerts\">\n" +
                  " <div ng-repeat=\"msg in msgs\"\n" +
                  "      class=\"alert alert-{{msg.type}} alert-dismissable msg\"\n" +
                  "      role=\"alert\">\n" +
                  "     <div class=\"pull-right\" ng-mousemove=\"cancelTimeouts(); align();\" ng-mouseleave=\"resetTimeouts()\">\n" +
                  "         <span ng-style=\"{opacity: msg.countdown > 0 ? 1 : 0}\" ng-bind=\"'('+msg.countdown+')'\"></span>\n" +
                  "         <span class=\"glyphicon glyphicon-remove\" ng-click=\"close(msg)\"></span>\n" +
                  "     </div>\n" +
                  "     <div ng-repeat=\"s in msg.msgs track by $index\" ng-mousemove=\"cancelTimeouts(); align();\" ng-mouseleave=\"resetTimeouts()\">\n" +
                  "         <span ng-bind=\"s.msg\"></span>\n" +
                  "         <span ng-if=\"s.details\">\n" +
                  "             <span class=\"details-link\" ng-click=\"showDetails=!showDetails; align();\">\n" +
                  "                 <span ng-bind=\"showDetails?'Hide':'Show'\"></span> details\n" +
                  "             </span>\n" +
                  "             <span ng-if=\"showDetails\" class=\"alert-details\">\n" +
                  "                 <br />\n" +
                  "                 <span ng-bind=\"s.details\"></span>\n" +
                  "             </span>\n" +
                  "         </span>\n" +
                  "     </div>\n" +
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

            message.addListener(function(type, msgs) {
                // if an equivalent message group is already in the messages, reset its timeout
                // and do not add this one
                var exists = false;
                scope.msgs.some(function(oldMsg) {
                    if(oldMsg.type == type && angular.equals(msgs, oldMsg.msgs)) {
                        resetTimeout(oldMsg);
                        exists = true;
                        return true;
                    }
                    return false;
                });
                if(exists) return;
                var msg = {
                    id: id++,
                    type: type,
                    msgs: msgs,
                    countdown: false,
                    timeout: 0
                };

                resetTimeout(msg);

                scope.msgs.push(msg);

                // and at last, remove all other non-success messages if this is a success
                if(type == "success") {
                    scope.msgs = scope.msgs.filter(function(msg) {
                        return msg.type == "success";
                    });
                }
            });
		}
	}	
}]);
