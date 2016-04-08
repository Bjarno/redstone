function RUpdateGUI(idname, newvalue) {
	// TODO: Look up type and update accordingly

	var crumb = CRUMBS[idname];

	var cleanupOldValue = function (oldvalue) {
		if (typeof oldvalue == 'object') {
			OBJSPY.untrack(oldvalue, idname);
		}
	};

	var update = function (newvalue) {
		cleanupOldValue(ractive.get(idname));

		var subvalue = undefined;

		switch (crumb.type) {
			case "Identifier":
				subvalue = newvalue;
				break;

			case "MemberExpression":
				subvalue = newvalue;
				for (var i = 0; i < crumb.properties.length; i++) {
					if (subvalue === undefined) {
						break; // Stop looking
					}
					var propname = crumb.properties[i];
					subvalue = subvalue[propname];
				}
				break;
		}

		ractive.set(idname, subvalue);
	};

	update(newvalue);

	if (typeof newvalue == 'object') {
		OBJSPY.track(
				newvalue,
				function (prop, action, difference, oldvalue, fullnewvalue) {
					update(fullnewvalue);
				},
				idname
		);
	}
}