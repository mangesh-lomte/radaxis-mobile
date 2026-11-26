const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = ({ config }) => {
  const appEnv = process.env.EXPO_PUBLIC_APP_ENV?.toLowerCase().trim();
  const isStaging = appEnv === 'staging';
  const isVideo =
    process.env.EAS_BUILD_PROFILE === 'preview-video' ||
    process.env.EXPO_PUBLIC_APP_VARIANT === 'video' ||
    process.env.APP_VARIANT === 'video';

  const baseConfig = {
    ...config,
    name: 'RadAxis Mobile',
    slug: isVideo ? 'mangesh-lomte' : 'radaxis-mobile',
    scheme: 'radaxis',
    android: {
      ...config.android,
      package: isVideo
        ? 'com.radaxis.mobile.video'
        : isStaging
        ? 'com.radaxis.mobile.staging'
        : 'com.radaxis.mobile',
    },
    extra: {
      ...config.extra,
      appEnv: isStaging ? 'staging' : 'production',
      apiBaseUrl:
        process.env.EXPO_PUBLIC_API_BASE_URL ||
        (isStaging
          ? 'http://192.168.43.204:5005/api/v1'
          : 'https://meril-ris.mangesh.my.id/api/v1'),
      eas: {
        ...config.extra?.eas,
        projectId: isVideo
          ? 'b9632958-cc6e-4ab5-b058-c221d90b3f76'
          : (config.extra?.eas?.projectId || 'a63f5dfc-d6ae-419e-a9a6-9f0fe1977706'),
      },
    },
  };

  if (isStaging || isVideo) {
    // Staging and video preview builds allow local cleartext HTTP traffic over local Wi-Fi LAN
    return withAndroidManifest(baseConfig, (modConfig) => {
      const mainApplication = modConfig.modResults.manifest.application?.[0];
      if (mainApplication) {
        mainApplication.$ = mainApplication.$ || {};
        mainApplication.$['android:usesCleartextTraffic'] = 'true';
      }
      return modConfig;
    });
  }

  // Production build retains strict HTTPS-only (no cleartext traffic allowed)
  return baseConfig;
};
