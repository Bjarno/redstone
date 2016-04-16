REDSTONE = {};

(function() {
	var NIL = function() {};

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
			return object[eval(memberExpression.property)];
		} else {
			// If not computed, property has type identifier according to specification
			return object[memberExpression.property.name];
		}
	};

	var evalBinaryExpression = function evalBinaryExpression(binaryExpression) {
		var left = eval(binaryExpression.left);
		var right = eval(binaryExpression.right);
		var operator = binaryExpression.operator;

		switch (operator) {
			case "==":			return left == right;
			case "===":			return left === right;
			case "!=":			return left != right;
			case "!==":			return left !== right;
			case "<":			return left < right;
			case "<=":			return left <= right;
			case ">":			return left > right;
			case ">=":			return left >= right;
			case "<<":			return left << right;
			case ">>":			return left >> right;
			case ">>>":			return left >>> right;
			case "+":			return left + right;
			case "-":			return left - right;
			case "*":			return left * right;
			case "/":			return left / right;
			case "%":			return left % right;
			case "|":			return left | right;
			case "^":			return left ^ right;
			case "&":			return left & right;
			case "in":			return left in right;
			case "instanceof":	return left instanceof right;

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
				methodObj = REDSTONE.METHODS[callee.name];

				if (!methodObj) {
					console.log("!!! method object undefined for " + callee.name);
					return false;
				}
				break;

			case esprima.Syntax.MemberExpression:
				var property_name;

				if (callee.computed) {
					property_name = eval(callee.property);
				} else {
					property_name = callee.property.name;
				}

				thisObj = eval(callee.object);
				methodObj = thisObj[property_name];
				break;

			default:
				console.log("!!! Unknown type of callExpression callee: " + callee.type);
				return false;
		}

		var argumentExpressions = callExpression.arguments;
		var arguments = argumentExpressions.map(eval);

		return methodObj.apply(thisObj, arguments);
	};

	var evalConditionalExpression = function evalConditionalExpression(conditionalExpression) {
		var test_value = eval(conditionalExpression.test);

		if (test_value) {
			return eval(conditionalExpression.consequent);
		} else {
			return eval(conditionalExpression.alternate);
		}
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

			case esprima.Syntax.ConditionalExpression:
				return evalConditionalExpression(ast);

			default:
				console.log("!!! unknown type of expression: " + type);
				return false;
		}
	};

	var updateVariable = function updateVariable(variableName, value, doRactiveUpdateIfExposed) {
		if (doRactiveUpdateIfExposed === undefined) {
			doRactiveUpdateIfExposed = true;
		}

		// When not yet loaded, wait until loaded
		if (!loaded) {
			waitingUpdates.push({
				variableName: variableName,
				value: value
			});
			return;
		}

		// If this variable is a ui->client variable, update
		if ( (variableName in REDSTONE.EXPOSEDVALUES) && (doRactiveUpdateIfExposed) ) {
			ractive.set(REDSTONE.EXPOSEDVALUES[variableName], value);
		}

		// Create info object if not yet created
		if (!variableInfo.hasOwnProperty(variableName)) {
			variableInfo[variableName] = {
				value: undefined,
				blocked: false,
				finalValue: value
			}
		}

		// Don't do anything if blocked
		if (variableInfo[variableName].blocked) {
			console.log("!!! Variable " + variableName + " is blocked, not allowing nested updating GUI on same variable!");

			// The new value is stored in finalValue: when variable is unblocked, the final value is used for storing, so
			// it reflects the final value as stored in client layer
			variableInfo[variableName].finalValue = value;
			return false;
		}

		// Clean up old value
		var oldValue = variableInfo[variableName].value;
		if (typeof oldvalue == 'object') {
			OBJSPY.untrack(oldvalue, variableName);
		}

		// Get crumbs belonging to this variable
		var crumbIds = REDSTONE.VARTOCRUMBID[variableName];
		if (crumbIds === undefined) {
			return;
		}

		// Block and set new value
		variableInfo[variableName].blocked = true;
		variableInfo[variableName].finalValue = value;
		variableInfo[variableName].value = value;

		var onInternalUpdate = function onInternalUpdate() {
			crumbIds.map(function (crumbId) {
				return REDSTONE.CRUMBS[crumbId];
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
	};

	var initGUI = function initGUI() {
		loaded = true;

		// Evaluate crumbs without any varnames
		var crumbIds = Object.keys(REDSTONE.CRUMBS);
		crumbIds.map(function (crumbId) {
			return REDSTONE.CRUMBS[crumbId];
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
			updateVariable(upd.variableName, upd.value);
		}
		waitingUpdates = [];

		// Install ractive observers
		var exposedVariables = Object.keys(REDSTONE.EXPOSEDVALUES);
		exposedVariables.forEach(function (varname) {
			var rId = REDSTONE.EXPOSEDVALUES[varname];

			ractive.observe(rId, function (newValue, oldValue) {
				// Update client variable
				REDSTONE.UPDATECLIENTVAR[varname](newValue);

				// Update other crumbs
				updateVariable(varname, newValue, false);
			});
		});
	};

	var init = function init() {
		initGUI();
	};

	var createCallback = function(func) {
		return func;
	};

	REDSTONE.init = init;
	REDSTONE.updateVariable = updateVariable;
	REDSTONE.getVarInfo = function (varname) {
		return variableInfo[varname];
	};
	REDSTONE.createCallback = createCallback;

})();