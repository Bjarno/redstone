var updateCrumb = function updateCrumb(crumb, newValue) {
	ractive.set(crumb.idName, newValue);
};

var variableInfo = {};
var loaded = false;
var waitingUpdates = [];

var evalProgram = function evalProgram(program) {
	var bodyLength = program.body.length;
	if (bodyLength != 1) {
		console.log("!!! Program.body.length should be equal to 1");
		console.log("!!! Got " + bodyLength);
		return false;
	}
	return eval(program.body[0]);
};

var evalExpressionStatement = function evalExpressionStatement(expressionStatement) {
	return eval(expressionStatement.expression);
};

var evalLiteral = function evalLiteral(literal) {
	return literal.value;
};

var evalIdentifier = function evalIdentifier(identifier) {
	if (identifier.hasOwnProperty("isInCrumb")) {
		return variableInfo[identifier.name].value;
	} else {
		console.log("!!! I don't know what to do with identifier that is not in crumb");
		return false;
	}
};

var evalMemberExpression = function evalMemberExpression(memberExpression) {
	var object = eval(memberExpression.object);

	if (memberExpression.computed) {
		console.log("!!! computed NYI");
		return false;
	} else {
		return object[memberExpression.property.name];
	}
};

var evalBinaryExpression = function evalBinaryExpression(binaryExpression) {
	var left = eval(binaryExpression.left);
	var right = eval(binaryExpression.right);
	var operator = binaryExpression.operator;

	switch (operator) {
		case "==":          return left == right;
		case "===":         return left === right;
		case "!=":          return left != right;
		case "!==":         return left !== right;
		case "<":           return left < right;
		case "<=":          return left <= right;
		case ">":           return left > right;
		case ">=":	        return left >= right;
		case "<<":          return left << right;
		case ">>":	        return left >> right;
		case ">>>":         return left >>> right;
		case "+":           return left + right;
		case "-":           return left - right;
		case "*":           return left * right;
		case "/":           return left / right;
		case "%":           return left % right;
		case "|":           return left | right;
		case "^":           return left ^ right;
		case "&":           return left & right;
		case "in":          return left in right;
		case "instanceof":  return left instanceof right;

		default:
			console.log("!!! Unknown type of BinaryOperator: " + operator);
			return false;
	}
};

var evalCallExpression = function evalCallExpression(callExpression) {
	var callee = callExpression.callee;
	var methodObj;
	var thisObj = null;

	switch (callee.type) {
		case esprima.Syntax.Identifier:
			methodObj = METHODS[callee.name];

			if (!methodObj) {
				console.log("!!! method object undefined for " + callee.name);
				return false;
			}
			break;
	}

	var argumentExpressions = callExpression.arguments;
	var arguments = argumentExpressions.map(eval);

	return methodObj.apply(thisObj, arguments);
};

var eval = function eval(ast) {
	var type = ast.type;

	switch (type) {
		case esprima.Syntax.Program:
			return evalProgram(ast);

		case esprima.Syntax.ExpressionStatement:
			return evalExpressionStatement(ast);

		case esprima.Syntax.Literal:
			return evalLiteral(ast);

		case esprima.Syntax.Identifier:
			return evalIdentifier(ast);

		case esprima.Syntax.MemberExpression:
			return evalMemberExpression(ast);

		case esprima.Syntax.BinaryExpression:
			return evalBinaryExpression(ast);

		case esprima.Syntax.CallExpression:
			return evalCallExpression(ast);

		default:
			console.log("!!! unknown type of expression: " + type);
			return false;
	}
};

function _RUpdateGUI(variableName, value) {
	// When not yet loaded, wait until loaded
	if (!loaded) {
		waitingUpdates.push({
			variableName: variableName,
			value: value
		});
		return;
	}

	// Create info object if not yet created
	if (!variableInfo.hasOwnProperty(variableName)) {
		variableInfo[variableName] = {
			value: undefined,
			blocked: false,
			finalValue : value
		}
	}

	// Don't do anything if blocked
	if (variableInfo[variableName].blocked) {
		console.log("!!! Variable " + variableName + " is blocked, not allowing nested RUpdateGUI on same variable!");
		return false;
	}

	// Clean up old value
	var oldValue = variableInfo[variableName].value;
	if (typeof oldvalue == 'object') {
		OBJSPY.untrack(oldvalue, variableName);
	}

	// Block and set new value
	variableInfo[variableName].blocked = true;
	variableInfo[variableName].finalValue = value;
	variableInfo[variableName].value = value;

	var crumbIds = VARTOCRUMBID[variableName];

	var onInternalUpdate = function onInternalUpdate() {
		crumbIds.map(function (crumbId) {
			return CRUMBS[crumbId];
		}).forEach(function (crumb) {
			var value = eval(crumb.parsedExpression);
			updateCrumb(crumb, value);
		});
	};

	// Do initial update
	onInternalUpdate();

	// Unblock
	variableInfo[variableName].blocked = false;

	// Set the final value
	value = variableInfo[variableName].finalValue;
	variableInfo[variableName].value = value;

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

	return true;
}

function _RInitGUI() {
	loaded = true;

	// Evaluate crumbs without any varnames
	var crumbIds = Object.keys(CRUMBS);
	crumbIds.map(function(crumbId) {
		return CRUMBS[crumbId];
	}).forEach(function (crumb) {
		var variableNames = crumb.variableNames;

		// Immediate evaluate after loading
		if (variableNames.length === 0) {
			var value = eval(crumb.parsedExpression);
			updateCrumb(crumb, value);
		}
	});

	// Evaluate those that were waiting until loaded
	for (var i = 0; i < waitingUpdates.length; i++) {
		var upd = waitingUpdates[i];
		_RUpdateGUI(upd.variableName, upd.value);
	}
	waitingUpdates = [];
}