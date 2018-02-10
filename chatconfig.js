var chatConfig =
    {
        //RESET THESE BEFORE ON PRODUCTION should be true on Production...
        //SET TEST = false BEFORE PUBLISH TO PRODUCTION OR PREPRODUCTION!!!

        onProduction: false,
        onTest: true,


        //GLOBAL variables - unlikely to change depending on server config
    
        //babajob specific google API key
        GOOGLE_GEOCODE_API_KEY: "AIzaSyA4ouAWlzc2jCpoA_YY-ufIFkMENa5EgH0",

        //Microsoft Bot connector app_ids and passwords
        //Production
        productionConnector_appId: "490e695c-812b-4895-b1ce-2b41a7c240fd",
        productionConnector_appPassword: "8btCfmHEPeS0QDLvZdVf1Th",

        //Test Bot
        testConnector_appId: "ba070147-4be9-47cc-947c-f26d9e1f6486",
        testConnector_appPassword: "sXfCkOaFZXcU8fzT8gZ61Cm",

        //Consumer key for calling Babajob APIs.
        // old IVR key 
        //var consumerKey = "DZdXZhkUx2qjom5YwJYc0PiBgIgcKI"; 

        //Chat Consumer Key
        BABAJOB_consumerKey: "YwXQg4OsjFUU1hBUC8AqjqHn2LGcau"

    };

module.exports = chatConfig;