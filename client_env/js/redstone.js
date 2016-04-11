var updateCrumb = function updateCrumb(crumb, newValue) {
	ractive.set(crumb.idName, newValue);
};

var variableName2Value = {};

var evaluateExpression = function evaluateExpression(expression) {
	var type = expression.type;

	switch (type) {
		case esprima.Syntax.Program:
			var bodyLength = expression.body.length;
			if (bodyLength != 1) {
				console.log("!!! Program.body.length should be equal to 1");
				console.log("!!! Got " + bodyLength);
				return false;
			}
			return evaluateExpression(expression.body[0]);

		case esprima.Syntax.ExpressionStatement:
			return evaluateExpression(expression.expression);

		case esprima.Syntax.Identifier:
			if (expression.hasOwnProperty("isInCrumb")) {
				return variableName2Value[expression.name];
			} else {
				console.log("!!! I don't know what to do with identifier that is not in crumb");
				return false;
			}

		default:
			console.log("!!! unknown type of expression: " + type);
	}
};

function RUpdateGUI(variableName, value) {
	// Clean up old value
	if (variableName2Value.hasOwnProperty(variableName)) {
		var oldValue = variableName2Value[variableName];
		if (typeof oldvalue == 'object') {
			OBJSPY.untrack(oldvalue, variableName);
		}
	}

	// Set new value
	variableName2Value[variableName] = value;

	var crumbIds = VARTOCRUMBID[variableName];

	var onInternalUpdate = function onInternalUpdate() {
		crumbIds.map(function (crumbId) {
			return CRUMBS[crumbId];
		}).forEach(function (crumb) {
			var value = evaluateExpression(crumb.parsedExpression);
			updateCrumb(crumb, value);
		});
	};

	// Do initial update
	onInternalUpdate();

	// Track value
	if (typeof value == 'object') {
		OBJSPY.track(
			value,
			function (prop, action, difference, oldvalue, fullnewvalue) {
				onInternalUpdate();
			},
			variableName
		);
	}
}