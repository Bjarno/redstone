function RUpdateGUI(idname, newvalue) {
	// TODO: Look up type and update accordingly
	
	var cleanupOldValue = function (oldvalue) {
		if (typeof oldvalue == 'object') {
			OBJSPY.untrack(oldvalue, idname);
		}
	};

	var update = function (newvalue) {
		cleanupOldValue(ractive.get(idname));
		ractive.set(idname, newvalue);
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