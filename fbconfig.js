var config = { };

// should end in /
config.rootUrl  = process.env.ROOT_URL                  || 'http://localhost:3001/';

config.facebook = {
    appId:          process.env.FACEBOOK_APPID          || '1582873155346889',
    appSecret:      process.env.FACEBOOK_APPSECRET      || 'd27df0d6b93258cd694b8b4dcfcc3845',
    appNamespace:   process.env.FACEBOOK_APPNAMESPACE   || 'Babajob Bot Good',
    redirectUri:    process.env.FACEBOOK_REDIRECTURI    ||  config.rootUrl + 'login/callback'
};

module.exports = config;