/*
Script creates entitlements file with the list of hosts, specified in config.xml.
File name is: ProjectName.entitlements
Location: ProjectName/

Script only generates content. File it self is included in the xcode project in another hook: xcodePreferences.js.
*/

var path = require('path');
var fs = require('fs');
var plist = require('plist');
var mkpath = require('mkpath');
var iosProjectHelper = require('./iosProjectHelper.js');
var ASSOCIATED_DOMAINS = 'com.apple.developer.associated-domains';
var context;
var entitlementsFilePath;

module.exports = {
  generateAssociatedDomainsEntitlements: generateEntitlements
};

// region Public API

/**
 * Generate entitlements file content.
 *
 * cordova-ios 7+ projects ship their own entitlements files
 * (Entitlements-Debug.plist / Entitlements-Release.plist), already wired to
 * CODE_SIGN_ENTITLEMENTS via xcconfig and already holding other capabilities
 * (e.g. aps-environment for push). When those exist, inject the
 * associated-domains entry into them instead of generating a separate
 * .entitlements file — a separate file would replace CODE_SIGN_ENTITLEMENTS
 * and silently drop the other entitlements.
 *
 * @param {Object} cordovaContext - cordova context object
 * @param {Object} pluginPreferences - plugin preferences from config.xml; already parsed
 * @return {Boolean} true if cordova's own entitlements files were updated;
 *                   false if the legacy generated file was used (caller must
 *                   wire it into the xcode project)
 */
function generateEntitlements(cordovaContext, pluginPreferences) {
  context = cordovaContext;

  var cordovaEntitlementsFiles = getCordovaEntitlementsFiles();
  if (cordovaEntitlementsFiles.length > 0) {
    cordovaEntitlementsFiles.forEach(function(filePath) {
      var entitlements = plist.parse(fs.readFileSync(filePath, 'utf8'));
      entitlements = injectPreferences(entitlements, pluginPreferences);
      fs.writeFileSync(filePath, plist.build(entitlements), 'utf8');
    });
    console.log('Universal Links plugin: associated-domains injected into ' + cordovaEntitlementsFiles.length + ' cordova entitlements file(s).');
    return true;
  }

  var currentEntitlements = getEntitlementsFileContent();
  var newEntitlements = injectPreferences(currentEntitlements, pluginPreferences);

  saveContentToEntitlementsFile(newEntitlements);
  return false;
}

/**
 * Find cordova-ios's own entitlements files (cordova-ios 7+).
 *
 * @return {Array} absolute paths of existing entitlements files
 */
function getCordovaEntitlementsFiles() {
  var appDir;
  try {
    appDir = iosProjectHelper.getLocations(context).xcodeCordovaProj;
  } catch (err) {
    return [];
  }

  return ['Entitlements-Debug.plist', 'Entitlements-Release.plist']
    .map(function(name) {
      return path.join(appDir, name);
    })
    .filter(fs.existsSync);
}

// endregion

// region Work with entitlements file

/**
 * Save data to entitlements file.
 *
 * @param {Object} content - data to save; JSON object that will be transformed into xml
 */
function saveContentToEntitlementsFile(content) {
  var plistContent = plist.build(content);
  var filePath = pathToEntitlementsFile();

  // ensure that file exists
  mkpath.sync(path.dirname(filePath));

  // save it's content
  fs.writeFileSync(filePath, plistContent, 'utf8');
}

/**
 * Read data from existing entitlements file. If none exist - default value is returned
 *
 * @return {String} entitlements file content
 */
function getEntitlementsFileContent() {
  var pathToFile = pathToEntitlementsFile();
  var content;

  try {
    content = fs.readFileSync(pathToFile, 'utf8');
  } catch (err) {
    return defaultEntitlementsFile();
  }

  return plist.parse(content);
}

/**
 * Get content for an empty entitlements file.
 *
 * @return {String} default entitlements file content
 */
function defaultEntitlementsFile() {
  return {};
}

/**
 * Inject list of hosts into entitlements file.
 *
 * @param {Object} currentEntitlements - entitlements where to inject preferences
 * @param {Object} pluginPreferences - list of hosts from config.xml
 * @return {Object} new entitlements content
 */
function injectPreferences(currentEntitlements, pluginPreferences) {
  var newEntitlements = currentEntitlements;
  var content = generateAssociatedDomainsContent(pluginPreferences);

  newEntitlements[ASSOCIATED_DOMAINS] = content;

  return newEntitlements;
}

/**
 * Generate content for associated-domains dictionary in the entitlements file.
 *
 * @param {Object} pluginPreferences - list of hosts from conig.xml
 * @return {Object} associated-domains dictionary content
 */
function generateAssociatedDomainsContent(pluginPreferences) {
  var domainsList = [];

  // generate list of host links
  pluginPreferences.hosts.forEach(function(host) {
    var link = domainsListEntryForHost(host);
    if (domainsList.indexOf(link) == -1) {
      domainsList.push(link);
    }
  });

  return domainsList;
}

/**
 * Generate domain record for the given host.
 *
 * @param {Object} host - host entry
 * @return {String} record
 */
function domainsListEntryForHost(host) {
  return 'applinks:' + host.name;
}

// endregion

// region Path helper methods

/**
 * Path to entitlements file.
 * Uses cordova-ios API so the path is correct for both legacy (config name) and new "App" project naming.
 *
 * @return {String} absolute path to entitlements file
 */
function pathToEntitlementsFile() {
  if (entitlementsFilePath === undefined) {
    var locations = iosProjectHelper.getLocations(context);
    var projName = path.basename(locations.xcodeCordovaProj);
    entitlementsFilePath = path.join(locations.xcodeCordovaProj, 'Resources', projName + '.entitlements');
  }

  return entitlementsFilePath;
}

/**
 * Projects root folder path.
 *
 * @return {String} absolute path to the projects root
 */
function getProjectRoot() {
  return context.opts.projectRoot;
}

// endregion
