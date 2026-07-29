/*
 * Patches the app's SceneDelegate.swift (cordova-ios 8+).
 *
 * CDVSceneDelegate forwards connectionOptions.URLContexts (custom schemes) on
 * launch, but drops connectionOptions.userActivities — so an app launched cold
 * from a universal link never delivers the link to plugins. This hook injects
 * an override of scene(_:willConnectTo:options:) that re-posts the browsing-web
 * NSUserActivity as CDVPluginContinueUserActivityNotification once plugins have
 * initialized. CULPlugin listens for that notification.
 *
 * No-op when SceneDelegate.swift does not exist (cordova-ios 7 and older) or
 * when the patch is already applied.
 */

var path = require('path');
var fs = require('fs');
var iosProjectHelper = require('./iosProjectHelper.js');

module.exports = {
  patchSceneDelegate: patchSceneDelegate
};

var PATCH_MARKER = 'CDVPluginContinueUserActivityNotification';

var OVERRIDE_METHOD = [
  '    // Injected by cordova-plugin-universal-links-fix (after_prepare hook).',
  '    // CDVSceneDelegate drops connectionOptions.userActivities on launch, so',
  '    // cold-start universal links never reach plugins. Re-post them once',
  '    // plugins have initialized.',
  '    override func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {',
  '        super.scene(scene, willConnectTo: session, options: connectionOptions)',
  '',
  '        if let activity = connectionOptions.userActivities.first(where: { $0.activityType == NSUserActivityTypeBrowsingWeb }) {',
  '            DispatchQueue.main.async {',
  '                NotificationCenter.default.post(name: NSNotification.Name("CDVPluginContinueUserActivityNotification"), object: activity)',
  '            }',
  '        }',
  '    }'
].join('\n');

function patchSceneDelegate(context) {
  var sceneDelegatePath;
  try {
    var locations = iosProjectHelper.getLocations(context);
    sceneDelegatePath = path.join(locations.xcodeCordovaProj, 'SceneDelegate.swift');
  } catch (err) {
    return;
  }

  if (!fs.existsSync(sceneDelegatePath)) {
    // cordova-ios 7 and older: no scene lifecycle, AppDelegate category handles links.
    return;
  }

  var content = fs.readFileSync(sceneDelegatePath, 'utf8');
  if (content.indexOf(PATCH_MARKER) >= 0) {
    return;
  }

  var classDeclaration = /class\s+SceneDelegate\s*:\s*CDVSceneDelegate\s*\{/;
  if (!classDeclaration.test(content)) {
    console.warn('Universal Links plugin: could not patch SceneDelegate.swift (unexpected content). Cold-start universal links will not work.');
    return;
  }

  content = content.replace(classDeclaration, function(match) {
    return match + '\n' + OVERRIDE_METHOD;
  });

  if (content.indexOf('import UIKit') < 0) {
    content = content.replace('import Cordova', 'import Cordova\nimport UIKit');
  }

  fs.writeFileSync(sceneDelegatePath, content, 'utf8');
  console.log('Universal Links plugin: patched SceneDelegate.swift for cold-start universal links.');
}
