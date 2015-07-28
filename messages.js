angular.module("messages", [])

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
		"danger": 10000,
		"success": 5000,
		"warning": 5000,
		"info": 5000
	};

 	return {
		restrict: "A",
		templateUrl: "partials/messages.html",
		link: function(scope) {
			var id = 0; // used to give each message a unique id
			scope.msgs = [];
			message.addListener(function(type, msgs) {
				var msg = {
					id: id++,
					type: type,
					msgs: msgs,
                    timeout: null
				};
				// if an equivalent message group is already in the messages, remove this old one
				var oldPos = -1;
				scope.msgs.some(function(oldMsg, i) {
					if(msg.type == oldMsg.type && msg.msgs.length == oldMsg.msgs.length) {
						var eq;
						msg.msgs.every(function(m) {
							return (eq = (oldMsg.msgs.indexOf(m) > -1));
						});
						if(eq) {
							// all messages were equal
							oldPos = i;
							return true;
						}
					}
					return false;
				});
				if(oldPos > -1) {
					scope.msgs.splice(oldPos, 1);
				}

                scope.resetTimeout(msg);

				scope.msgs.push(msg);

				// and at last, remove all other non-success messages if this is a success
				if(type == "success") {
					scope.msgs = scope.msgs.filter(function(msg) {
						return msg.type == "success";
					});
				}
			});

            scope.cancelTimeout = function(msg) {
                if(msg.timeout) $timeout.cancel(msg.timeout);
            };

            scope.resetTimeout = function(msg) {
                scope.cancelTimeout(msg);
                msg.timeout = $timeout(function() { scope.close(msg); }, timeouts[msg.type]);
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
		}
	}	
}]);
