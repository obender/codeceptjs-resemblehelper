const ResembleHelper = require("./../index"),
	fs = require("fs");

beforeAll(() => {
	return initializeCityDatabase();
});

test("ResembleHelper init works", () => {
	let helper = new ResembleHelper();
});

test("ResembleHelper auto folder init works", () => {
	let helper = new ResembleHelper({
		require: "codeceptjs-resemblehelper",
		autoFolders: "true"
	});
});

test("ResembleHelper auto folder creation works with no errors", () => {
	let helper = new ResembleHelper({
		prepareBaseImage: true,
		require: "codeceptjs-resemblehelper",
		autoFolders: "true"
	});

	return helper
		.seeVisualDiff("google", {prepareBaseImage: true, tolerance: 5})
		.catch((e) => expect(e).toMatch("error"));
});

test("ResembleHelper auto folder creation works", () => {
	let helper = new ResembleHelper({
		prepareBaseImage: true,
		require: "codeceptjs-resemblehelper",
		autoFolders: {
			folder: "componentImages"
		}
	});
	return helper
		.seeVisualDiff("google", {prepareBaseImage: true, tolerance: 5})
		.catch((e) => expect(e).toMatch("error"));
});

test("ResembleHelper test that all folders created", () => {
	expect(fs.existsSync("./visual/google")).toEqual(true);
	expect(fs.existsSync("./componentImages/google")).toEqual(true);
});
