"use strict";

const resemble = require("resemblejs"),
	fs = require("fs"),
	codeceptjs = require("codeceptjs"),
	assert = require("assert"),
	mkdirp = require("mkdirp"),
	path = require("path"),
	getDirName = path.dirname;

/**
 * Resemble.js helper class for CodeceptJS, this allows screen comparison
 * @author Puneet Kala
 */

class ResembleHelper extends Helper {
	constructor(config) {
		super(config);
	}

	async _beforeSuite(suite) {
		this.dir = getDirName(suite.file);
	}
	/**
	 * Compare Images
	 * @param image1
	 * @param image2
	 * @param diffImage
	 * @param options
	 * @returns {Promise<any | never>}
	 */
	async _compareImages(image1, image2, diffImage, options) {
		image1 = path.join(this.config.baseFolder, image1);
		image2 = path.join(this.config.screenshotFolder, image2);

		if (typeof this.config.consoleOutput == "undefined") {
			this.config.consoleOutput = true;
		}

		return new Promise((resolve, reject) => {
			if (options.boundingBox !== undefined) {
				resemble.outputSettings({
					boundingBox: options.boundingBox
				});
			}

			if (options.tolerance !== undefined) {
				if (this.config.consoleOutput) {
					console.log(
						"Tolerance Level Provided " + options.tolerance
					);
				}
				var tolerance = options.tolerance;
			}

			resemble.compare(image1, image2, options, (err, data) => {
				if (err) {
					reject(err);
				} else {
					resolve(data);
					if (data.misMatchPercentage >= tolerance) {
						mkdirp(
							getDirName(
								path.join(this.config.diffFolder, diffImage)
							),
							function(err) {
								if (err) return cb(err);
							}
						);
						fs.writeFile(
							path.join(this.config.diffFolder, diffImage + ".png"),
							data.getBuffer(),
							(err, data) => {
								if (err) {
									throw new Error(this.err);
								}
							}
						);
					}
				}
			});
		}).catch((error) => {
			console.log("caught", error.message);
		});
	}

	/**
	 *
	 * @param image1
	 * @param options
	 * @returns {Promise<*>}
	 */
	async _fetchMisMatchPercentage(image1, options) {
		var image2 = image1;
		var diffImage = "Diff_" + image1.split(".")[0];
		var result = this._compareImages(
			image1,
			image2,
			diffImage,
			options
		);
		var data = await Promise.resolve(result);
		if (data) return data.misMatchPercentage;

		return 0;
	}

	/**
	 * Check Visual Difference for Base and Screenshot Image
	 * @param baseImage         Name of the Base Image (Base Image path is taken from Configuration)
	 * @param options           Options ex {prepareBaseImage: true, tolerance: 5} along with Resemble JS Options, read more here: https://github.com/rsmbl/Resemble.js
	 * @returns {Promise<void>}
	 */
	async seeVisualDiff(baseImage, options) {
		if (this.config.autoFolders) {
			let visual = this.config.autoFolders.folder || "visual";
			this.config.baseFolder = path.join(this.dir, visual);
			this.config.screenshotFolder = path.join(this.dir, visual);
		}

		if (options == undefined) {
			options = {};
			options.tolerance = 0;
		}

		if (
			options.prepareBaseImage !== undefined &&
			options.prepareBaseImage
		) {
			await this._prepareBaseImage(baseImage);
		}

		if (this.config.prepareBaseImage) {
			let imgLoc = path.join(
				this.config.baseFolder,
				baseImage + ".png"
			);
			this._getBrowser().saveScreenshot(imgLoc);
		}

		var misMatch = await this._fetchMisMatchPercentage(
			baseImage,
			options
		);
		if (this.config.consoleOutput) {
			console.log("MisMatch Percentage Calculated is " + misMatch);
		}

		assert(
			misMatch <= options.tolerance,
			"MissMatch Percentage " + misMatch
		);
	}

	/**
	 * See Visual Diff for an Element on a Page
	 *
	 * @param selector   Selector which has to be compared expects these -> CSS|XPath|ID
	 * @param baseImage  Base Image for comparison
	 * @param options    Options ex {prepareBaseImage: true, tolerance: 5} along with Resemble JS Options, read more here: https://github.com/rsmbl/Resemble.js
	 * @returns {Promise<void>}
	 */
	async seeVisualDiffForElement(selector, baseImage, options) {
		if (selector !== undefined) {
			if (options == undefined) {
				options = {};
				options.tolerance = 0;
			}

			if (
				options.prepareBaseImage !== undefined &&
				options.prepareBaseImage
			) {
				await this._prepareBaseImage(baseImage);
			}

			options.boundingBox = await this._getBoundingBox(selector);
			var misMatch = await this._fetchMisMatchPercentage(
				baseImage,
				options
			);
			if (this.config.consoleOutput) {
				console.log("MisMatch Percentage Calculated is " + misMatch);
			}
			assert(
				misMatch <= options.tolerance,
				"MissMatch Percentage " + misMatch
			);
		} else {
			return null;
		}
	}

	/**
	 * Function to prepare Base Images from Screenshots
	 *
	 * @param screenShotImage  Name of the screenshot Image (Screenshot Image Path is taken from Configuration)
	 */
	async _prepareBaseImage(screenShotImage) {
		var configuration = this.config;

		await this._createDir(
			path.join(configuration.baseFolder, screenShotImage)
		);
		let location = path.join(
			configuration.screenshotFolder,
			screenShotImage
		);
		fs.access(
			location,
			fs.constants.F_OK | fs.constants.W_OK,
			(err) => {
				if (err) {
					console.error(
						`${location} ${
							err.code === "ENOENT"
								? "does not exist"
								: "is read-only"
						}`
					);
				}
			}
		);

		fs.access(
			configuration.baseFolder,
			fs.constants.F_OK | fs.constants.W_OK,
			(err) => {
				if (err) {
					console.error(
						`${configuration.baseFolder} ${
							err.code === "ENOENT"
								? "does not exist"
								: "is read-only"
						}`
					);
				}
			}
		);

		fs.copyFileSync(
			location,
			path.join(configuration.baseFolder, screenShotImage)
		);
	}

	/**
	 * Function to create Directory
	 * @param directory
	 * @returns {Promise<void>}
	 * @private
	 */
	async _createDir(directory) {
		if (this.config.autoFolders) {
			mkdirp.sync(directory);
		} else {
			directory = getDirName(directory);
			mkdirp.sync(directory);
		}
	}

	/**
	 * Function to fetch Bounding box for an element, fetched using selector
	 *
	 * @param selector CSS|XPath|ID selector
	 * @returns {Promise<{boundingBox: {left: *, top: *, right: *, bottom: *}}>}
	 */
	async _getBoundingBox(selector) {
		const browser = this._getBrowser();

		if (this.helpers["WebDriver"]) {
			const ele = await browser.$(selector);
			var location = await ele.getLocation();
			var size = await ele.getSize();
		} else {
			var ele = await browser
				.element(selector)
				.then((res) => {
					return res;
				})
				.catch((err) => {
					// Catch the error because webdriver.io throws if the element could not be found
					// Source: https://github.com/webdriverio/webdriverio/blob/master/lib/protocol/element.js
					return null;
				});
			var location = await browser.getLocation(selector);
			var size = await browser.getElementSize(selector);
		}

		var bottom = size.height + location.y;
		var right = size.width + location.x;
		var boundingBox = {
			left: location.x,
			top: location.y,
			right: right,
			bottom: bottom
		};

		return boundingBox;
	}

	_getBrowser() {
		if (this.helpers["WebDriver"]) {
			return this.helpers["WebDriver"].browser;
		}
		if (this.helpers["Appium"]) {
			return this.helpers["Appium"].browser;
		}
		if (this.helpers["WebDriverIO"]) {
			return this.helpers["WebDriverIO"].browser;
		}
		throw new Error(
			"No matching helper found. Supported helpers: WebDriver/Appium/WebDriverIO"
		);
	}
}

module.exports = ResembleHelper;
