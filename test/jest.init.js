"use strict";

class FakeHelper {
	constructor(config) {
		this.config = config;
		this.helpers = {};
	}
}

global.Helper = FakeHelper;
