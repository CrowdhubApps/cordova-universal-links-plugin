/*
 * Helper to resolve iOS project paths via the cordova-ios JavaScript API.
 * Uses the same approach as Cordova tooling: project/target are named "App"
 * in recent Cordova iOS; the API is backwards compatible with Cordova iOS 5.0+.
 *
 * locations.root - platform root (platforms/ios)
 * locations.pbxproj - project.pbxproj path
 * locations.xcodeProjDir - .xcodeproj directory
 * locations.xcodeCordovaProj - app source folder (e.g. .../App)
 */

var path = require('path');

module.exports = {
  getIosProject: getIosProject,
  getLocations: getLocations,
  getCordovaProjName: getCordovaProjName
};

/**
 * Get the cordova-ios project instance for the current project.
 *
 * @param {Object} context - Cordova context (ctx)
 * @returns {Object} cordova-ios project instance
 */
function getIosProject(context) {
  var projectRoot = context.opts.projectRoot;
  var platformPath = path.join(projectRoot, 'platforms', 'ios');
  var cordova_ios = context.requireCordovaModule('cordova-ios');
  return new cordova_ios('ios', platformPath);
}

/**
 * Get the locations object from cordova-ios (pbxproj, xcodeCordovaProj, etc.).
 *
 * @param {Object} context - Cordova context (ctx)
 * @returns {Object} locations object
 */
function getLocations(context) {
  return getIosProject(context).locations;
}

/**
 * Get the app project folder name (basename of xcodeCordovaProj).
 * This is "App" in current Cordova iOS, or the normalized app name in older versions.
 *
 * @param {Object} context - Cordova context (ctx)
 * @returns {String} project folder name
 */
function getCordovaProjName(context) {
  var locations = getLocations(context);
  return path.basename(locations.xcodeCordovaProj);
}
