/*
Hook executed before the 'prepare' stage. Only for iOS project.
Ensures the .entitlements file name matches the actual Xcode project app folder name
(using cordova-ios API: "App" in current Cordova iOS, or legacy config-derived name).
If a different .entitlements file exists in Resources, it is renamed to the expected name.
*/

var path = require('path');
var fs = require('fs');
var iosProjectHelper = require('./lib/ios/iosProjectHelper.js');

module.exports = function(ctx) {
  run(ctx);
};

/**
 * Run the hook logic.
 *
 * @param {Object} ctx - cordova context object
 */
function run(ctx) {
  var resourcesPath;
  var expectedName;

  try {
    var locations = iosProjectHelper.getLocations(ctx);
    resourcesPath = path.join(locations.xcodeCordovaProj, 'Resources');
    expectedName = path.basename(locations.xcodeCordovaProj) + '.entitlements';
  } catch (err) {
    return;
  }

  var expectedPath = path.join(resourcesPath, expectedName);
  if (fs.existsSync(expectedPath)) {
    return;
  }

  var files = [];
  try {
    files = fs.readdirSync(resourcesPath);
  } catch (err) {
    return;
  }

  var existingEntitlements = files.filter(function(name) {
    return path.extname(name) === '.entitlements';
  });

  if (existingEntitlements.length === 0) {
    return;
  }

  var oldPath = path.join(resourcesPath, existingEntitlements[0]);
  if (path.basename(oldPath) === expectedName) {
    return;
  }

  console.log('Renaming .entitlements file to match project: ' + expectedName);
  try {
    fs.renameSync(oldPath, expectedPath);
  } catch (err) {
    console.warn('Failed to rename .entitlements file.');
    console.warn(err);
  }
}
