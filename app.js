//FACEBOOK BABAJOB BOT
//Started October 2016 by Sean
'use strict';

//bot libraries
var restify = require('restify');
var builder = require('botbuilder');

//import config file
var chatConfig  = require('./chatconfig');

//read facebook data
var FB = require('fb'),
    fbconfig = require('./fbconfig');
var fb = new FB.Facebook(fbconfig);
 
if(!fbconfig.facebook.appId || !fbconfig.facebook.appSecret) {
    throw new Error('facebook appId and appSecret required in fbconfig.js');
}

//firebase
/*
var firebase = require('firebase');
var firebaseDBDomain = "babajob-dd6d9.firebaseio.com"; 
var firebaseStorageBucket = "babajob-dd6d9.appspot.com";
firebase.initializeApp({
  serviceAccount: "./FirebaseServiceAccount.json",
  databaseURL: "https://" + firebaseDBDomain,
  storageBucket: firebaseStorageBucket
});
*/

//phone number parsing
// Require `PhoneNumberFormat`. 
var PNF = require('google-libphonenumber').PhoneNumberFormat;
 
// Get an instance of `PhoneNumberUtil`. 
var phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();

//helper libraries 
var async = require("async");
var S = require('string'); // http://stringjs.com/
var request = require("request");
const util = require('util');
var FormData = require('form-data');

//Logger to google sheets
var GsLogger = require('./googleSheetLogger');
var gsLogger = new GsLogger();
//https://docs.google.com/spreadsheets/d/1kt3tLcyDwckZLe_aDySHZrCHurpdq_XxukUDRDjJe_M/edit#gid=0

//strings for localization
var strings = require('./strings');




//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});
  
// Create chat bot
var productionConnector = new builder.ChatConnector({
    //appId: process.env.MICROSOFT_APP_ID,
    //appPassword: process.env.MICROSOFT_APP_PASSWORD
    appId: chatConfig.productionConnector_appId,
    appPassword: chatConfig.productionConnector_appPassword
});

//Babajob Test
var testConnector = new builder.ChatConnector({
    //appId: process.env.MICROSOFT_APP_ID,
    //appPassword: process.env.MICROSOFT_APP_PASSWORD
    appId: chatConfig.testConnector_appId,
    appPassword: chatConfig.testConnector_appPassword
});


//SETUP GOOGLE GEOCODER API key 
var GOOGLE_GEOCODE_API_KEY = chatConfig.GOOGLE_GEOCODE_API_KEY;

var debugLocallyButOnProductionDB = false;
var onProduction = debugLocallyButOnProductionDB || chatConfig.onProduction;

var onTest = chatConfig.onTest;
var connector = onTest ? testConnector : productionConnector;

var facebookBabajobProductionToken = "EAAWfnWAmIckBAHH43UMFMfyMYbZAMXn8oFPoXtHN37srVjdmFjDL7vZCEXTWk6zGgopHDFqtsUWAZCG51XRZCEpv2wLrPDoPRlMRL0WP2yWe3QQMHbJCRkYwuyeqrgvklToBqZCYFzKaxTRrZC9umdZAiWu5WMKpsUZD";
var facebookPreProductionToken = 
    onTest ? 
        //Babajob - production...
        //EAAWfnWAmIckBAHH43UMFMfyMYbZAMXn8oFPoXtHN37srVjdmFjDL7vZCEXTWk6zGgopHDFqtsUWAZCG51XRZCEpv2wLrPDoPRlMRL0WP2yWe3QQMHbJCRkYwuyeqrgvklToBqZCYFzKaxTRrZC9umdZAiWu5WMKpsUZD

        //BabaBot Test - Currently BabajobTest       
        "EAAHWdFxriDMBAFUtK0HhXGhvsekj5lN9mhPuEhh3TJuZAK8mz2x2WwJFFGeWrBXmcUQ9sx7gc5xSWD6r5V7TZA50EiKLlVeMmmJzKLgshbtXkRqSomU6MTzfFP07yrdBL9nOsYKR8ZAzEOw5sGFguzgbtTnuRZAZCbK7qVrE4sAZDZD"
        //BabaBot Good - Babajob Seekers
        : "EAAWfnWAmIckBADdG8oP1WOqfJEk6gYnOPGloMfZC8Hkb6uZCblug5LABU4szNkKdyHJyNxDhomYqwKw9bUloBOqaFbLMnEKNzp8SwWdXpNaKJnI8ESr4Ylsw6UygzZApTr8UxpACNI0zVFfA89sgkkkYSPbZAlVG8INMZCuoCMwZDZD";



var bjAPIDomain =onProduction ? "http://api.babajob.com" : "http://preprodapi.babajob.com";
var bjWebDomain =onProduction ? "http://www.babajob.com" : "http://preprod.babajob.com";
var missedCallNumber = onProduction ? "08880004444" : "08039534135";


//Chat bot consumer key...
var consumerKey = chatConfig.BABAJOB_consumerKey;

var bot = new builder.UniversalBot(connector);
server.post('/chat/api/messages', connector.listen());
server.get('/chat/', (req,res) => {
    res.send('Babajob chat API');
})

/*
var bot = new builder.UniversalBot(connector, function (session) {
    session.send("You said: '%s'. Try saying Driver Jobs in Bangalore", session.message.text);
});
*/



//=========================================================
// Bots Middleware
//=========================================================

// Anytime the major version is incremented any existing conversations will be restarted.
bot.use(builder.Middleware.dialogVersion({ version: 2.0, resetCommand: /^reset/i }));

//=========================================================
// Bots Global Actions
// These have to be setup via thread settings with FB as well. 
/*
# INSTALL PERSISTENT MENUS
    Facebook supports persistent menus which Bot Builder lets you bind to global 
    actions. These menus must be installed using the page access token assigned 
    when you setup your bot. You can easily install the menus included with the 
    example by running the cURL command below:
        curl -X POST -H "Content-Type: application/json" -d @persistent-menu.json 
        "https://graph.facebook.com/v2.6/me/thread_settings?access_token=PAGE_ACCESS_TOKEN"
        */
//=========================================================

bot.endConversationAction('goodbye', 'Goodbye :)', { matches: /^goodbye/i });

bot.beginDialogAction('help', '/help', { matches: /^help/i });
 
// Global command to delete the session.userdata.profile sessions 
bot.dialog('/delete', [
    function (session, args) {
        session.send(gettext("I am forgetting your babajob profile...", session));
        //blank out the FB on the server...
        updateFacebookIdOnBabajob("", session);
        session.send(gettext("Forgotten! To come back, just say hi.", session));
        session.userData.profile = null;
        session.endConversation();
    }
]).triggerAction({
    matches: ["Delete"]
    });

bot.beginDialogAction('delete', '/delete', { matches: /^delete/i });



//=========================================================
// Bots Dialogs
//=========================================================

    

bot.dialog('/', [
    function (session, args, next) {
        session.sendTyping();
        var mymsg = session.message;

        
        //console.log("session:" + util.inspect(session, { showHidden: false, depth: null }));
        //console.log("session.message: " + session.message.text);
        //console.log("session.userData" + util.inspect(session.userData, { showHidden: false, depth: null }));
   
        
        //New User
        
        if (session.userData.profile == null
            || session.userData.profile == true
            || !session.userData.profile.firstName
        ) {
             
            checkAndSaveChannelData(session, function (err) {
                if (err) {
                    console.log("got an FB error", err);
                } else {

                }
                console.log("starting new chat...", err);
                sendNewUserMessage(session);

                session.beginDialog('/newChatUser');
            });

            

        } else {
            logFunnel("", session, funnelSteps.Had_Second_Conversation + " Had_Second_Conversation", null, "");

            if (session.userData.profile.role == null || session.userData.profile.role == "JOBSEEKER") {
                //TODO: Reactivate once reco is working better...

                var firstName = getProfileAttribute("firstName", session);            
                if (firstName) {
                    var dialogIntroText = gettext("Hi again", session) + " " + firstName + "!";
                    session.send(dialogIntroText);
                }    
                session.beginDialog('/askQsOrMenu');
            } else {
                session.send(gettext("Sorry I have limited support for employers right now. Type delete to start over.", session));;
            }
        }
    },

    // Display menu
    function (session, results) {
        // The menu runs a loop until the user chooses to (quit)?
        console.log("/ last function... about to restart menu...")
        var role = getProfileAttribute("role", session);
        if (!role || role == "JOBSEEKER") {
            session.beginDialog('/menu');
        } else {
            //TODO: Create Employer Flow..
            session.endConversation();
        }
    },
    
    function (session, results) {
        // Always say goodbye
        session.send("Ok... See you later!");
    }
]);

//gathers FB data and saves it to the profile object...
function checkAndSaveChannelData(session, callback) {
    if (session.userData.profile == null || session.userData.profile == true) {
        checkValidUserDataProfile(session);

        //assume job seeker...
        setProfileAttribute("role", "JOBSEEKER", session);

        //set the channel...
        setProfileAttribute("channel", session.message.address.channelId, session);

        console.log("checkAndSaveChannelData");
        
        //set the name property...        
        if (session.message.user && session.message.user.name
            && (
                //name is bad in webchat...
                session.message.address.channelId != 'webchat'
            )
        )
        //assume in a channel like facebook that supports a reasonable name...
        {
            setNameToProfile(session.message.user.name, session);
        }

        if (session.message.address.channelId == 'facebook') {
            //add in FacebookId 
            setProfileAttribute("facebookId", session.message.user.id, session);

            //try to figure out the correct UI lang based on locale of the user...
            //Need to do a facebook look up for this...
            getFBInfo(session.message.user.id, session, chatConfig.onTest,
                function (error, fbUserObj) {
                    if (error) {
                        callback(error);
                    } else {
                        callback(null);
                    }
                }
            );
        } else {
            callback(null);
        }
    } else {
        callback(null);
    }   
}

function setNameToProfile(name, session) {
    if (name && name != "") {
        setProfileAttribute("name", name, session);
        var nameParts = name.split(" ");
        var firstName = nameParts[0];
        setProfileAttribute("firstName", firstName, session);
        var lastName = "";
        if (nameParts.length > 1) {
            var fullName = session.message.user.name;
            lastName = S(fullName).chompLeft(firstName + " ").s;
        }
        setProfileAttribute("lastName", lastName, session);
    }
}

function sendNewUserMessage(session) {
    if (!getProfileAttribute("sentNewUserMsg", session)) {
        var titletext = gettext("Welcome to Babajob", session);
        var subtitletext = gettext(
            "I'll help you find a great nearby job in 3 questions.", session);
            //+ " " + "हिंदी, தமிழ் & ಕನ್ನಡ.";
    
        if (session.userData && session.userData.profile && session.userData.profile.firstName) {
            titletext = gettext("Hello", session) + " " + session.userData.profile.firstName + "! " + titletext;
        }
        var card = new builder.HeroCard(session)
            .title(titletext)
            .text(subtitletext)
            .images([
                builder.CardImage.create(session, "https://storage.googleapis.com/babarichdocs/logos/Horizontal_Logo_Small_taller.png")
            ])
            ;
        var msg = new builder.Message(session).attachments([card]);
        session.send(msg);

        if (getProfileAttribute("channel", session) == "webchat") {
            var langmsg = "हिंदी के लिए, के साथ उत्तर दें Hindi. ಹಿಂದಿ, ಪ್ರತ್ಯುತ್ತರ Kannada. இந்தி, விடையளித்து Tamil."
            session.send(langmsg);
        }    

        logFunnel("", session, funnelSteps.Sent_Initial_Message + " Sent_Initial_Message", null, "");
        setProfileAttribute("sentNewUserMsg", true, session);
    }    
}



bot.dialog('/newChatUser', [
    function (session, results, next) {
        checkValidUserDataProfile(session);
        setProfileAttribute("role", "JOBSEEKER", session);
        session.beginDialog("/askForBabajobMobileWithLater", true);
    },
    function (session, results, next) {
        
        session.beginDialog('/ensureSeekerProfile', session.userData.profile);
    },
    function (session, results, next) {
        session.beginDialog('/menu');
    },
    function (session, results, next) {
        session.endDialog();
    }
]);


   
bot.dialog('/language', [
    function (session, args, next) {
        var overrideLang;

        session.dialogData.oldLang = getProfileAttribute("preferredLang", session);       

        if (args) {
            overrideLang = args;  
            session.dialogData.overrideLang = overrideLang;
            next({ response: { entity: overrideLang } });
        } else {
            var style = builder.ListStyle["auto"];
            
            //{ listStyle: style }
            //auto | inline | list | button | none"
            
            let langOptions = {
                retryPrompt: gettext("Sorry, I can only speak English, हिंदी, தமிழ், ਪੰਜਾਬੀ or ಕನ್ನಡ.", session),
                listStyle: style
            };

            builder.Prompts.choice(session, "🌐 " + gettext("What language should I speak?", session, true),
                //"English.|हिंदी|தமிழ்|తెలుగు|ಕನ್ನಡ|Hindi|Tamil|Telegu|Kannada"
                "English.|हिंदी|ಕನ್ನಡ|தமிழ்|ਪੰਜਾਬੀ|Hindi|Tamil|Kannada|Punjabi"
                , langOptions);
        }

    },
    /*
    function (session, args, next) {
        var useLocaleAsUILangage = false;
        var defaultLang = "en";

                
        if (args && args == true) {
            useLocaleAsUILangage = true;
        }

        //try to parse the locale to default to correct UI lang        
        if (useLocaleAsUILangage) {
            var locale = getProfileAttribute("locale", session);
            switch (locale) {
                case "hi_IN":
                    defaultLang = "Hindi";
                    break;
                case "ta_IN":
                    defaultLang = "Tamil";
                    break;
                case "kn_IN":
                    defaultLang = "Kannada";
                    break;
                case "pn_IN":
                    defaultLang = "Punjabi";
                    break;
                case "te_IN":
                    //defaultLang = "Telegu";
                    break;
                default:
                    break;
            }
        }
        
        
        //ask the language question only for English users...
        if (defaultLang == "en") {
            var style = builder.ListStyle["auto"];
            
            //{ listStyle: style }
            //auto | inline | list | button | none"
            
            let langOptions = {
                retryPrompt: gettext("Sorry, I can only speak English, हिंदी, தமிழ், ਪੰਜਾਬੀ or ಕನ್ನಡ.", session),
                listStyle: style
            };

            builder.Prompts.choice(session, "🌐 " + gettext("What language should I speak?", session, true),
                //"English.|हिंदी|தமிழ்|తెలుగు|ಕನ್ನಡ|Hindi|Tamil|Telegu|Kannada"
                "English.|हिंदी|ಕನ್ನಡ|தமிழ்|ਪੰਜਾਬੀ|Hindi|Tamil|Kannada|Punjabi"
                , langOptions);
        } else {
            next({ response: { entity: defaultLang } });
        }
    },
    */
    function (session, results) {
        
        var preferredLang = 'en';
        checkValidUserDataProfile(session);


        var useButtons = false;


        //special check for english without the period.        
        if (session.message.text.toLowerCase() == 'english') {
            useButtons = false;
            preferredLang = 'en';
        } else {

            if (results.response.entity) {
                if (results.response.entity == 'English.') {
                    //English with buttons
                    useButtons = true;
                    preferredLang = 'en';
                } else if (results.response.entity == 'हिंदी') {
                    //हिंदी Hindi
                    preferredLang = 'hi';
                } else if (results.response.entity == 'தமிழ்') {
                    //தமிழ் Tamil
                    preferredLang = 'ta';
                }
                else if (results.response.entity == 'తెలుగు') {
                    //తెలుగు Telugu
                    preferredLang = 'te';
                }
                else if (results.response.entity == 'ಕನ್ನಡ') {
                    //ಕನ್ನಡ Kannada
                    preferredLang = 'ka';
                }
                else if (results.response.entity == 'ਪੰਜਾਬੀ') {
                    //ਪੰਜਾਬੀ ਦੇ Punjabi
                    preferredLang = 'pn';
                }
                else if (results.response.entity == 'English') {
                    preferredLang = 'en';
                }
                else if (results.response.entity == 'Hindi') {
                    preferredLang = 'hi';
                }
                else if (results.response.entity == 'Tamil') {
                    preferredLang = 'ta';
                }
                else if (results.response.entity == 'Telegu') {
                    preferredLang = 'te';
                }
                else if (results.response.entity == 'Kannada') {
                    preferredLang = 'ka';
                }
            
                else if (results.response.entity == 'Punjabi') {
                    preferredLang = 'pn';
                }
            }

            //log funnel step            
            logFunnel("", session, funnelSteps.Answered_Lang + " Answered_Lang", null, "");
        } 

        var listStyle = builder.ListStyle["list"];        
        if (useButtons) {
            listStyle = builder.ListStyle["auto"]; 
        }        
        
        /*
        { listStyle: style }
        auto | inline | list | button | none"
        */

        if (session.dialogData.oldLang) {
            var oldLanguage = getLanguageName(session.dialogData.oldLang);
            if (oldLanguage) {
                var returnToOldLangMsg = gettext("To show", session) + " " + gettext(oldLanguage, session) + " " +
                   gettext("again", session) + ", " + gettext("reply with",session) + " " + oldLanguage + ".";
                session.send(returnToOldLangMsg);
            }    
        }

        setProfileAttribute("listStyle", listStyle, session);        
        setProfileAttribute("preferredLang", preferredLang, session);
        
        if (preferredLang != "en" && session.dialogData.overrideLang) {
            var langConfirmText = gettext("I speak", session) + " " + session.dialogData.overrideLang + " " + gettext("too but it helps if you text back to me in English", session);
            session.send(langConfirmText);
        }
        
        session.endDialog();    
    }
]);
bot.beginDialogAction('language', '/language', { matches: /^language/i });

function getLanguageName(shortLang) {
    var langName;
    switch (shortLang) {
        case "en": langName = "English"; break;
        case "hi": langName = "Hindi"; break;
        case "ta": langName = "Tamil"; break;
        case "ka": langName = "Kannada"; break;
        case "pn": langName = "Punjabi"; break;    
        default: break;    
    }
    return langName;
}


bot.dialog('/seekerOrEmployer', [
    function (session, args) {

        console.log("right before seeker or employer...");
        var q = gettext("Do you need a job or want to hire someone?", session); 
        builder.Prompts.choice(session,
            q,
            gettextForArray(seekerOrEmployerMenu, session)
            ,buildOptionsRetryPrompt(q, session)
        );
    },
    function (session, results) {
        var role = 'JOBSEEKER';
        //default to seeker if no answer...
        if (results && results.response && results.response.entity) {
            role = seekerOrEmployerMenu[results.response.index].value;
        }

        if (session.userData.profile == true || session.userData.profile == null) {
            session.userData.profile = {};    
        }
        session.userData.profile.role = role;
        session.endDialogWithResult({ response: session.userData.profile });
    }
]);

/*
        // Welcome msg
        var txt = gettext("I'll now ask you a few questions to build you a awesome profile and show you matching jobs.");
        //txt = gettext("I am going to help you build an awesome profile, with a great photo, your verified mobile and ID docs and a voice clip for Employers.", session);
        //session.send(txt);
        //session.sendTyping();
        
        //session.endDialog("I'll need you to tell me a few things: your mobile, a picture of your aadhaar card and location where you want to work and your preferred job category.");
        session.send(txt);


            function (session) {
        console.log("startSeekerOrEmployerProfile");
        session.beginDialog('/seekerOrEmployer', session.userData.profile);
    },
*/


/*
bot.dialog('/alreadyOnBabajob', [
    function (session) {
            //stupid 20 char limit on prompts...
        builder.Prompts.choice(session, gettext("Have you already registered on babajob with your mobile?",session),
           gettextForArray(alreadyOnBabajobMenu,session), buildOptionsRetryPrompt(alreadyOnBabajobMenu,session)  );
        },
    function (session, results) {
        var alreadyOnBabajob = false;
         console.log("/alreadyOnBabajob results" + util.inspect(results, { showHidden: false, depth: null }));        
        
        if (results.response.entity) {
            if (!S(results.response.entity.toLowerCase()).contains("no")) {
                alreadyOnBabajob = true;
                //session.send("OK I'll ask for your mobile and then build a profile for you from it...");
              } 
        }
                
        if (session.userData.profile == true || session.userData.profile == null) {
            session.userData.profile = {};    
        }
        session.userData.profile.alreadyOnBabajob = alreadyOnBabajob;
        session.endDialog();        
    }
]);
*/

//Determines whether we should ask for questions to build the profile OR simply show the menu...
bot.dialog('/askQsOrMenu', [
    function (session, args) {
        checkValidUserDataProfile(session);
        var role = getProfileAttribute("role", session);
        if (!role || role == "JOBSEEKER") {
            if (profileIsComplete(role, session)) {
                session.beginDialog("/menu");
            } else {
                session.beginDialog("/ensureSeekerProfile");
            }
        } else {
            //employer so cancel out
            session.endDialog();

            //session.endDialog("Sorry, I can only talk to job seekers right now. To start over, please text back delete.")
        }
    },
    function (session, results, next) {
         session.beginDialog("/menu");
    },
    function (session, results,next) {
        session.endDialog();
    }

]);

//TODO: get required attributes from a central array...

function profileIsComplete(role, session) {
    checkValidUserDataProfile(session);
    var profileComplete = false;
    if (role == "JOBSEEKER") {
        if (getProfileAttribute("mobile", session) &&
            getProfileAttribute("name", session) &&
            getProfileAttribute("gender", session) &&
            getProfileAttribute("education", session) &&
            getProfileAttribute("category", session) &&
            getProfileAttribute("city", session)
            //OTP - verified
            //salary
            //experience

        ) {
            profileComplete = true;
        }
    }
    return profileComplete;
}

function profileSufficientToCreateBabajobUser(role, session) {
    checkValidUserDataProfile(session);
    var profileComplete = false;
    if (role == "JOBSEEKER") {
        if (getProfileAttribute("firstName", session) &&
            getProfileAttribute("lastName", session)
        ) {
            profileComplete = true;
        }
    }
    return profileComplete;
}

/*
bot.dialog('/startSeekerOrEmployerProfile', [
    function (session, args, next) {
        //assume seeker or employer is now answered...
        console.log("start startSeekerOrEmployerProfile session.userData" + util.inspect(session.userData.profile, { showHidden: false, depth: null }));        
        console.log("start startSeekerOrEmployerProfile args.response" + util.inspect(args.response, { showHidden: false, depth: null }));

        if (args.response) {
            session.userData.profile = args.response;
        }

        if (session.userData.profile.role == "JOBSEEKER") {
            session.beginDialog('/startSeekerProfile', session.userData.profile);
        } else {
            session.beginDialog('/startEmployerProfile', session.userData.profile);
            
        }    
    },
    function (session, results) {
        //session.send('Hello %(name)s! I love %(company)s!', session.userData.profile);
        var profile = results.response;
        console.log("end startSeekerOrEmployerProfile session.userData" + util.inspect(session.userData, { showHidden: false, depth: null }));        
        console.log("end startSeekerOrEmployerProfile profile" + util.inspect(profile, { showHidden: false, depth: null }));
        
        session.userData.profile = profile;

        session.endDialog("", profile);
    }
]);
*/
bot.dialog('/startEmployerProfile', [
    function (session, args) {
        session.send(
            gettext("At this time I can only chat with job seekers but you can reply with delete to start over.", session));
        
        var endText = 
            gettext("If you are hiring, please visit http://babajob.com/hire or call +918880006666 and a real person would love to help you.", session);

        var profile = session.userData.profile;
        session.endDialog(endText, profile);
    }
    /*
    ,
    function (session, results) {
        //session.userData.profile = results.response;

        var profile = session.userData.profile;
        var endText = gettext("Thanks for completing your employer profile.", session);
        session.endDialog(endText, profile);
    }
    */
]);

bot.dialog('/startSeekerProfile', [
    function (session) {
        session.beginDialog('/ensureSeekerProfile', session.userData.profile);
    },
    function (session, results) {
        var profile = results.response;
        session.userData.profile = results.response;
        var endText = gettext("Great! You now have a profile on Babajob.com that employers can see.", session);
        
        var bjUserId = getProfileAttribute("bjUserId", session);
        if (bjUserId) {
            endText += " " + bjWebDomain + "/person-" + bjUserId;
        }
        session.send(endText);
        session.endDialogWithResult({ response: profile });
    }
]);


bot.dialog('/askCategory', [
    function (session, args, next) {

        if (args) {
            session.dialogData.profile = args;
        } else {
            session.dialogData.profile = {};
        }
        console.log("before Category ask");

        var catMenu = relevantCategoryMenu(session.dialogData.profile);
        var translatedMenu = gettextForArray(catMenu, session);
        var q = gettext("What kind of job are you looking for?", session);
        var promptOptions = buildOptionsRetryPrompt(q, session, true);

        //console.log("catMenu: " + util.inspect(catMenu, { showHidden: false, depth: null }));
        //console.log("translatedMenu: " + util.inspect(translatedMenu, { showHidden: false, depth: null }));
        //console.log("promptOptions: " + util.inspect(promptOptions, { showHidden: false, depth: null }));
            
        builder.Prompts.choice(session,
            q,
            translatedMenu,
            promptOptions);
    },
    function (session, results, next) {
        //process category
        var menu = relevantCategoryMenu(session.dialogData.profile);
        var category = -1;
        

        var answer = session.message.text;


        if (results.response && results.response.entity) {
            //they picked something
            category = menu[results.response.index].value;
        } else {
            //Attempt to parse what they typed for categories...
            var catValues = parseMessageForSynonymMatch(categorySynonyms, answer);
            if (catValues && catValues.length > 0) {
                category = catValues[0];
                //TODO: Support saving multiple categories...
            }
        }

        
        var likelyEmployer = false;        
        //see if they said they want to hire at this step...        
        likelyEmployer = parseForIsLikelyEmployer(answer);
        var role = likelyEmployer ? "EMPLOYER" : "JOBSEEKER";
        saveProfileAttribute("role", role, session);
        session.dialogData.profile.role = role;

        

        if (category > -1) {
            var categoryArray = [category];
            saveProfileAttribute("category", categoryArray, session);
            session.dialogData.profile.category = categoryArray;

            //blank out counter if present...
            if (session.dialogData.profile.categoryRepeaterCounter) {
                delete session.dialogData.profile.categoryRepeaterCounter;
            }

            //log funnel step            
            logFunnel("", session, funnelSteps.Answered_Category + " Answered_Category", null, "");

            
            session.send(gettext("Great", session) + "!");
            session.endDialogWithResult({ response: session.dialogData.profile })
        } else {
            if (likelyEmployer) {
                //TODO: fall back to employer warning...
                session.endDialogWithResult({ response: session.dialogData.profile });
            } else {
                //do customer dialog repeat code...
                var categoryRepeatMax = 2;
        
                if (!session.dialogData.profile.categoryRepeaterCounter
                    || categoryRepeatMax >= session.dialogData.profile.categoryRepeaterCounter) {
                    if (session.dialogData.profile.categoryRepeaterCounter) {
                        session.dialogData.profile.categoryRepeaterCounter++;
                    } else {
                        session.dialogData.profile.categoryRepeaterCounter = 1;
                    }
                    session.send(gettext("Sorry, I could not understand what type of job category you are looking for. Please reply with Driver, Delivery, Sales, etc.", session));
                    session.replaceDialog('/askCategory', session.dialogData.profile);
                } else {
                    //we've hit the max...
                    if (session.dialogData.profile.categoryRepeaterCounter) {
                        delete session.dialogData.profile.categoryRepeaterCounter;
                    }
                    //fall through to next question...
                    session.send(gettext("Sorry, I could not understand what type of job category you are looking for. Please reply with Driver, Delivery, Sales, etc.", session));
                    
                    session.endDialogWithResult({ response: session.dialogData.profile });
                }
            }
        } 
    }
]);

///////////////////////////////////////////////////////////////////////////////////
///////// INTENT AND PARSING //////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////

//var recognizer = new builder.LuisRecognizer(model);

//=========================================================
// Configure the recognizer...
//=========================================================


bot.recognizer({
    recognize: function (context, done) {
        var text = context.message.text;
        console.log("---doing general reco on " + text);
        //console.log("Message: " + util.inspect(context.message, false, 10));
        
        //{ score: 1.0, intent: 'Help' }
        recognizeIntent(text,
            function (err, reco) {
                console.log("completed general reco", err, reco);
                if (err) {
                    //logWarning("recoLastMessageAndUpdateOrBeginDialog babajobIntentRecognizer err", session, err, reco);
                    done(err, reco);
                }
                else {
                    done(null, reco);
                }
            });
    }
});

bot.dialog('/generalResponder', [
    function (session, args, next) {
        console.log("starting generalResponder " + util.inspect(args,false,10));
        var reco = args.intent;
        checkAndSaveChannelData(session, function (err) {
            if (err) {
                handleError("generalResponder", session, err, "none", "Hmm. we had an error while fetching your FB data.");
            } else {
                saveIntentActions(reco, session, { confirmUpdatesToUser: true });
                console.log("Saved reco actions");
                session.replaceDialog("/askQsOrMenu");
            }
        });
    }
]).triggerAction({
    matches: ["SetRoleAsSeeker", "UpdateProfile","SearchJobs"] 
    });


bot.dialog('/respondUpdateMobile', [
    function (session, args, next) {
        console.log("starting mobile SignIn " + util.inspect(args));
        var reco = args.intent;
        var mobile = findFirstRecoEntity(reco, "mobile");
        
        //ensure we have the FB data before we attempt signin...
        checkAndSaveChannelData(session, function (err) {
            if (err) {
                handleError("respondUpdateMobile", session, err, "none", "Hmm. we had an error while fetching your FB data.");
            } else {
                session.beginDialog("/signIntoBabajobWithMobile", mobile);
            }
        });
    },
    function (session, args, next) {
        sendNewUserMessage(session);
        //TODO: Provide a better returning user message...
        session.replaceDialog("/askQsOrMenu");
    }
]).triggerAction({
    matches: ["UpdateMobile"]
});

bot.dialog('/respondProvideOTP', [
    function (session, args, next) {
        console.log("starting ProvideOTP " + util.inspect(args));
        var reco = args.intent;
        var mobile = findFirstRecoEntity(reco, "otp");
        session.beginDialog("/postMobileOTP", mobile);
    },
    function (session, args, next) {
        session.replaceDialog("/menu");
    }
]).triggerAction({
    matches: ["ProvideOTP"]
});

bot.dialog('/respondChangeLanguage', [
    function (session, args, next) {
        console.log("starting respondChangeLanguage " + util.inspect(args));
        var reco = args.intent;
        var lang = findFirstRecoEntity(reco, "language");
        
        //ensure we have the FB data before we attempt signin...
        checkAndSaveChannelData(session, function (err) {
            if (err) {
                handleError("respondChangeLanguage", session, err, "none", "Hmm. we had an error while fetching your FB data.");
            } else {
                session.beginDialog('/language', lang);
            }
        });
    },
    function (session, args, next) {
        session.replaceDialog("/askQsOrMenu");
    }
]).triggerAction({
    matches: ["ChangeLanguage"]
});

bot.dialog('/respondApply', [
    function (session, args, next) {
        console.log("starting respondApply " + util.inspect(args));
        var reco = args.intent;
        var jobPostId = findFirstRecoEntity(reco, "jobPostId");

        //TODO: we need to figure out how to get full job to process this application...
        //session.beginDialog('/startJobApplyProcess', jobPostId);
    },
    function (session, args, next) {
        session.replaceDialog("/askQsOrMenu");
    }
]).triggerAction({
    matches: ["Apply"]
});


var sampleIntents = {
    "query": "I want a Cook or Maid Job near 560025 paying Salary 12000. I speak English and Hindi and I'm a 10th pass fresher. My mobile 8012345678 ",
    "intents": [
        { intent: "UpdateMobile", score: 1 }, //? needed?
        { intent: "ProvideOTP", score: 1 },

        { intent: "SearchJobs", score: 1 },
        { intent: "UpdateProfile", score: 1 },
        
        { intent: "SetRoleAsEmployer", score: 1 },
        { intent: "SetRoleAsSeeker", score: 1 },


        { intent: "ChangeLanguage", score: 1 },        
        { intent: "Delete", score: 1 },
        { intent: "ShowHomePageURL", score: 1 },
        { intent: "GetAppURL", score: 1 },
        { intent: "PasswordReset", score: 1 }
        
    ],
    "entities": [
        {
            "entity": "8012345678",
            "type": "mobile"
        },
        {
            "entity": "2", //cook
            "type": "category"
        },
        {
            "entity": "1", //maid
            "type": "category"
        },
        {
            "entity": "Hindi",
            "type": "language"
        },
        {
            "entity": "English",
            "type": "language"
        },
        {
            "entity": "560025",
            "type": "location"
        },
        {
            "entity": "delhi", 
            "type": "location"
        },
        {
            "entity": "10", //10th Pass
            "type": "education"
        },
        {
            "entity": "fresher",
            "type": "experience"
        },
        {
            "entity": "12000",
            "type": "salary"
        },
        {
            "entity": "1234",
            "type": "otp"
        },
        {
            "entity": {"location": "delhi"}, 
            "type": "geocoded_location"
        }
    ]
};

//default text match score is .5 
//and we want to be higher such we do override normal flows if find something
//I think...
var DEFAULT_INTENT_SCORE = 0.45; 


//returns a sample Intent Array, given a text string
function recognizeIntent(text, callback) {
    
    //1. Call BJ Record
    //2. Call LUIS or WIT
    //3. Post process reco intent object - e.g. figure out where location is
    //4. Save any user changes
    //5. Do the intent actions.

    async.waterfall([
        function (callback) {
            babajobIntentRecognizer(text, callback);
        },
        //TODO: Call LUIS or WIT here...

        function (reco, callback) {
            postProcessReco(reco, callback);
        }
    ],
        function (err, reco) {
            callback(err, reco);
        }
    );
}



//returns a sample Intent Array, given a text string
function babajobIntentRecognizer(text, callback) {
    //recognize text
    //parse text to get intents and 
    
    console.log("starting babajobIntentRecognizer", text);
    
    
    var reco = newIntentReco(text);

    //pass the text through a series of recognizers
    //these can set entity and intent
    reco = parseTextForMobile(text, reco);  
    reco = parseForOTP(text, reco); 
    
    //these only update entity...
    reco = parseTextForCategory(text, reco);        
    reco = parseTextForLocation(text, reco);
    reco = parseTextForEducation(text, reco);
    reco = parseTextForMonthlySalary(text, reco);//  \b[Rr]s* *[\d]{4,5}\b

    //TODO: add other intents...    
    reco = parseTextForLanguage(text, reco);
    //reco = parseTextForApply(text, reco);
    //reco = parseTextForExperience(text, reco);
    //delete, app, homepage, password reset, quiz, rich doc, 

    //Determine Intent if needed now that entities have been done...
    var likelyEmployer = parseForIsLikelyEmployer(text);
    if (likelyEmployer) {
        reco.intents.push({ intent: "SetRoleAsEmployer", score: DEFAULT_INTENT_SCORE });
    } else {
        if (parseForActiveJobSearch(text)) {
            reco.intents.push({ intent: "SetRoleAsSeeker", score: DEFAULT_INTENT_SCORE });
            reco.intents.push({ intent: "SearchJobs", score: DEFAULT_INTENT_SCORE });
        }
    }

    //default to JobSearch intent (only if we have something)
    if (reco.entities.length > 0 && reco.intents.length == 0)
    {
        reco.intents.push({ intent: "SearchJobs", score: DEFAULT_INTENT_SCORE });
    }

    //Stack rank the intents...
    if (reco.intents.length) {
        var topIntent = reco.intents[0]; //TODO: Make this smarter...

        /*        
        if (intents.contains("Delete")) {
            topIntent = 
        }
        */

        reco.intent = topIntent.intent;
        reco.score = topIntent.score;
    }
 
    var err = null;

    //console.log("Parsing '" + text + "'");    
    util.inspect(reco);    

    callback(err, reco);
}


function newIntentReco(text) {
    var reco = {};
    //reco.score = 0.0;
    //reco.intent = 'Unknown';
    reco.query = text;
    reco.intents = []; //sampleIntents.intents;
    reco.entities = []; //sampleIntents.entities;
    return reco;
}


function parseTextForCategory(text, reco)
{
    if (!reco) {
        reco = newIntentReco(text);
    }

    var catValues = parseMessageForSynonymMatch(categorySynonyms, text);
    if (catValues && catValues.length > 0)
    {
          catValues.forEach(
                function (value) {
                    var ent = {
                        entity: value,
                        type: "category"
                    }
                    reco.entities.push(ent);
                }, this);
    }
    return reco;
}

function parseTextForLocation(text, reco)
{
    if (!reco) {
        reco = newIntentReco(text);
    }

    //look for common city names...    
    //console.log("parseTextForLocation", text);
    var locValues = parseMessageForSynonymMatch(citySynonyms, text);
        if (!locValues) {
            locValues = [];
        }


    //  jobs in Maduri
    // in *** text.match(/in \w*/g);    
    var inMatches = text.match(/(in|In) \w*/g);
    if (inMatches != null && inMatches.length > 0) {
        //remove the "in ";
        var potentialCity = S(inMatches[0]).replaceAll("in ", "").s;
        locValues.push(potentialCity);
    }

    //check for pincode match... 560003 or 560 003    
    var pincodeMatches = text.match(/(\b[\d]{6}\b|\b[\d]{3} [\d]{3}\b)/g);
    if (pincodeMatches != null && pincodeMatches.length > 0) {
        locValues.push(pincodeMatches[0]);
    }

    //Delhi Jobs...
    /*
    var pincodeMatches = text.match(/(\b[\d]{6}\b|\b[\d]{3} [\d]{3}\b)/g);
    if (pincodeMatches != null && pincodeMatches.length > 0) {
        locValues.push(pincodeMatches[0]);
    }
    */
    

    //create entities     
    if (locValues && locValues.length > 0)
    {
          locValues.forEach(
                function (value) {
                    var ent = {
                        entity: value,
                        type: "location"
                    }
                    reco.entities.push(ent);
                }, this);
    }
    return reco;
}

function parseForOTP(text, reco) {
    if (!reco) {
        reco = newIntentReco(text);
    }

    var matches = text.match(/^[\d]{4}$/g);
    var otp;
    if (matches != null && matches.length > 0) {
        otp = matches[0];

    } else
    //override case...
        if (text == "-1") {
            otp = "-1";
        }

    if (otp) {
        var intent = { intent: "ProvideOTP", score: DEFAULT_INTENT_SCORE };
        reco.intents.push(intent);

        var ent = {
            entity: otp,
            type: "otp"
        }
        reco.entities.push(ent);
    }
    return reco;
}

function parseTextForEducation(text, reco)
{
    if (!reco) {
        reco = newIntentReco(text);
    }

    //look for education synonyms...  
    var eduValues = parseMessageForSynonymMatch(educationSynonyms, text);

    //create entities     
    if (eduValues && eduValues.length > 0)
    {
        //it's not really clear how we should handle multiple values on education...
          eduValues.forEach(
                function (value) {
                    var ent = {
                        entity: value,
                        type: "education"
                    }
                    reco.entities.push(ent);
                }, this);
    }
    return reco;
}

function parseTextForLanguage(text, reco) {
    if (!reco) {
        reco = newIntentReco(text);
    }

    var foundLangs = 0;
    //look for language synonyms...  
    var languageValues = parseMessageForSynonymMatch(spokenLanguageAttribute.options, text);

    //create entities     
    if (languageValues && languageValues.length > 0) {
        languageValues.forEach(
            function (value) {
                var languageName;

                //the value is the id of the language - we now need to look up the name again...
                var langs = spokenLanguageAttribute.options.filter(
                    function (i) {
                        return i.id == value;
                    }
                );
                if (langs && langs.length > 0)
                {
                    languageName = langs[0].name; 
                }

                if (languageName) {
                    var ent = {
                        entity: languageName,
                        type: "language"
                    }
                    reco.entities.push(ent);
                    foundLangs++;
                }    
            }, this);
    }

    if (foundLangs == 1) {
        //add the intent if we find just one language...
        var intent = { intent: "ChangeLanguage", score: DEFAULT_INTENT_SCORE };
        reco.intents.push(intent);
    }
    //console.log("parseTextForLanguage foundLangs ", foundLangs);
    return reco;
}

function parseTextForApply(text, reco) {
    if (!reco) {
        reco = newIntentReco(text);
    }
    
    var applyValues = text.match(/apply:(.*)/g);
    if (applyValues != null && applyValues.length > 0) {
        var value = applyValues[0];
        value = S(value).replaceAll('apply:', '').s;
        var ent = {
            entity: value,
            type: "jobPostId"
        }
        reco.entities.push(ent);
        
        //add the intent
        //Make this lower than .5 so normal flows can occur around answer text questions...
        var intent = { intent: "Apply", score: 0.6 };
        reco.intents.push(intent);
    }
    return reco;
}

function parseTextForMobile(text, reco) {
    if (!reco) {
        reco = newIntentReco(text);
    }
    
    var mobileValues = text.match(/0*[\d]{10}/g);
    if (mobileValues != null && mobileValues.length > 0) {
        var value = mobileValues[0];
        var ent = {
            entity: value,
            type: "mobile"
        }
        reco.entities.push(ent);
        
        //add the intent
        //Make this lower than .5 so normal flows can occur around answer text questions...
        var intent = { intent: "UpdateMobile", score: 0.45 };
        reco.intents.push(intent);
    }
    return reco;
}

function parseTextForMonthlySalary(text, reco) {
    if (!reco) {
        reco = newIntentReco(text);
    }
    //Rs 12000, rs10000, rs4500, r8000
    var rs_salValues = text.match(/\b[Rr]s* *[\d]{4,5}\b/g);
    if (rs_salValues != null && rs_salValues.length > 0) {
        var rs_value = rs_salValues[0];

        //now strip out the optional Rs and r
        var salValues = rs_value.match(/[\d]{4,5}/g);
        if (salValues != null && salValues.length > 0) {
            var value = salValues[0];
            var ent = {
                entity: value,
                type: "salary"
            }
            reco.entities.push(ent);
        }
    }
    return reco;
}





//maps entity values to profile values that we should save...
function getProfileValueFromIntentEntity(attribute, value) {
    var returnVal = value;
    //don't do anything on category, location, education, 
    return returnVal;
};


 


//updates the profile and BJ data depending on an intent array
function saveIntentActions(reco, session, options) {
    var options = options || {};
    //confirmUpdatesToUser


    if (reco && session) {
        var userMsg = "";
        //action:Job Search -> Maduri jobs -> Great. I'll search 
        //for <Driver> jobs <in Maduri>,<paying Rs12000>,<with 3 yrs exp>,<requiring Language>,<requiring 10th pass>
        //action:update mobile: 09886251476 -> OK. I'll update your mobile number to 09886251476
        //action: change language -> Tamil -> I speak Tamil too. -> Menu

        //Set your category to Driver

        //determine any attributes to save...        
        var attributes = [];
        var geocoded_location = null;

        var foundCategories = [];
        
        if (reco.entities && reco.intents.length > 0) {
            reco.entities.forEach(
                function (e) {
                    var attribute = e.type;
                    var value = getProfileValueFromIntentEntity(attribute, e.entity);

                    if (attribute == "location") {
                        //we assume that any location values have been post processed into geocoded_location values
                    } else if (attribute == "geocoded_location") {
                        
                        geocoded_location = value;

                        if (geocoded_location && geocoded_location.country == "India" && (geocoded_location.locality || geocoded_location.formatted_address) ) {
                            var city = geocoded_location.locality || geocoded_location.formatted_address;
                            //set the data in profile (it will be saved to bj later)
                            setProfileAttribute("city", city, session);
                            setProfileAttribute("cityPrecise", geocoded_location, session);
                            attributes.push("cityPrecise");            
                            
                            if (options.confirmUpdatesToUser) {
                                userMsg += gettext("I love", session) + " " + city + " 😊";
                            }
                        } else {
                            if (options.confirmUpdatesToUser) {
                                var msg = gettext("Sorry", session) + ". " + city + gettext(" does not seem to be a place in India that I know. Please reply with something like 'Jobs in Mumbai'", session);
                                session.send(msg);
                            }

                        }
                    }
                    else if (attribute == "otp") {
                        //don't save otp...
                        //kick off of otp intent occurs below...
                    } else if (attribute == "category") {
                        foundCategories.push(value);
                    }
                    else {
                        setProfileAttribute(attribute, value, session);
                        attributes.push(attribute);

                        var displayedValue = getLocalizedAttributeText(attribute, value, session);
                        
                        console.log("before user msg in general: attribute" + attribute + " value" + value + "displayedValue", displayedValue);
                        
                        userMsg += gettext("Your", session) + " " + gettext(attribute, session)
                            + " " + gettext("is", session) + " " + displayedValue + ".\n";
                    }

                }, this);
            
            if (foundCategories.length > 0) {
                setProfileAttribute("category", foundCategories, session);
                attributes.push("category");


                //build the translated category string...                
                var translatedCats = [];
                foundCategories.forEach(function(cat) {
                    translatedCats.push(getLocalizedCategoryText([cat], session));
                }, this);
                var catsText = translatedCats.join(" " + gettext("or") + " ");

                //I'll find you Driver or Delivery jobs.                 
                userMsg += gettext("I'll find you", session) + " " + catsText
                    + " " + gettext("jobs", session) + ". \n";
                
            }
            
            
            //Save all the intent actions...
            if (attributes.length > 0) {
                //finally save all the attributes back to babajob        
                saveAttributesToBJ(attributes, session);
            }
            if (options.confirmUpdatesToUser && userMsg) {
                session.send(userMsg);
            };

            //now save attributes and do all actions...
            //performIntentActions(reco, attributes, session, options, userMsg);
        }
    }
}


    
/*
//called by the doIntentActions after callbacks are done... 
function performIntentActions(reco, attributes, session, options, userMsg) {

    //certain actions trump others...
    ////delete, mobile, otp, jobs, menu
    //mobile -> signIntoBabajobWithMobile
    //otp -> saveOTP
    //jobs -> 
    //if mobile and other stuff, first store stuff, then attempt login...

    var nextDialog = "SearchJobs";
    var intents = [];
    if (reco.intents && reco.intents.length > 0) {
        reco.intents.forEach(function (element) {
            intents.push(element.intent);
        }, this);
    }

    
    if (intents.contains("Delete")) {
        session.replaceDialog("/delete");
    }
    //moved to a dialog
    
    else if (intents.contains("UpdateMobile")) {
        var mobile = findFirstRecoEntity(reco, "mobile");
        session.replaceDialog("/signIntoBabajobWithMobile", mobile);
    }
    
    if (intents.contains("ProvideOTP")) {
        var otp = findFirstRecoEntity(reco, "otp");
        session.replaceDialog("/postMobileOTP", otp);
    }
    else
     if (intents.contains("SearchJobs")
    ) {
        //just bring them to the menu to do a job search....
        session.replaceDialog("/menu");
    }
    else if (intents.contains("UpdateProfile")) {
        session.replaceDialog("/menu");
    } else {
        session.replaceDialog("/menu");
    }
}
    */

//Looks at a reco object and determines if any items need further clarification - like location
function postProcessReco(reco, callback) {
    if (reco) {
        var attributes = [];
        var locationValue = null;

        if (reco.entities && reco.intents.length > 0) {
            reco.entities.forEach(
                function (e) {
                    var attribute = e.type;
                    var value = getProfileValueFromIntentEntity(attribute, e.entity);
                    
                    if (attribute == "location") {
                        //special cased below...
                        locationValue = value;
                    }
                }, this);
        }

        if (locationValue != null) {
            //do a callback to async lookup location from google and update...
            lookUpLocationAsync(
                locationValue,
                false,
                function (error, place) {
                    if (error || !place) {
                        logWarning("postProcessReco lookUpLocationAsync", null, error, locationValue);
                        callback(error, reco);
                    } else {
                        var bjLocValue =
                            getBJLocationValueFromGoogleGeocode(place, false, locationValue);
                        console.log("postProcessReco bjLocValue", util.inspect(bjLocValue));

                        reco.entities.push({
                            "entity": bjLocValue,
                            "type": "geocoded_location"
                        });
                        callback(null, reco);
                    }
                });
            
        } else {
            callback(null, reco);
        }
    }
}
    

//returns the first found entity of a given type...
function findFirstRecoEntity(reco, type) {
    var retEntity = null;
    if (type && reco && reco.entities) {
        var matches = reco.entities.filter(
            function (ent) {
                return ent.type == type;
            })
        if (matches && matches.length > 0) {
            retEntity = matches[0].entity;
        }
    }    
    return retEntity;
}

var spokenLanguageAttribute =
    {
        "attributeId": 133,
        "attributeName": "SpokenLanguages",
        "classification": "Profile",
        "dataType": "Language",
        "attributeType":
        "MultiValue",
        "options": [
            { "id": 3, "name": "English", "synonyms": "english", "answerOptionId": 5866, "labelSeeker": "Know English", "labelPost": "Knows English", "has": false },
            { "id": 5, "name": "Hindi", "synonyms": "hindi", "answerOptionId": 5867, "labelSeeker": "Know Hindi", "labelPost": "Knows Hindi", "has": false },
            { "id": 6, "name": "Kannada","synonyms": "Kannada", "answerOptionId": 5868, "labelSeeker": "Know Kannada", "labelPost": "Knows Kannada", "has": false },
            { "id": 12, "name": "Tamil","synonyms": "Tamil", "answerOptionId": 5869, "labelSeeker": "Know Tamil", "labelPost": "Knows Tamil", "has": false },
            { "id": 13, "name": "Telugu", "synonyms": "Telugu","answerOptionId": 5870, "labelSeeker": "Know Telugu", "labelPost": "Knows Telugu", "has": false },
            { "id": 8, "name": "Malayalam","synonyms": "Malayalam", "answerOptionId": 5871, "labelSeeker": "Know Malayalam", "labelPost": "Knows Malayalam", "has": false },
            { "id": 1, "name": "Bengali","synonyms": "Bengali", "answerOptionId": 5872, "labelSeeker": "Know Bengali", "labelPost": "Knows Bengali", "has": false },
            { "id": 4, "name": "Gujarati","synonyms": "Gujarati", "answerOptionId": 5873, "labelSeeker": "Know Gujarati", "labelPost": "Knows Gujarati", "has": false },
            { "id": 9, "name": "Marathi","synonyms": "Marathi", "answerOptionId": 5874, "labelSeeker": "Know Marathi", "labelPost": "Knows Marathi", "has": false },
            { "id": 14, "name": "Urdu","synonyms": "Urdu", "answerOptionId": 5875, "labelSeeker": "Know Urdu", "labelPost": "Knows Urdu", "has": false },
            { "id": 10, "name": "Odiya", "synonyms": "Odiya","answerOptionId": 5876, "labelSeeker": "Know Odiya", "labelPost": "Knows Odiya", "has": false },
            { "id": 11, "name": "Punjabi", "synonyms": "Punjabi","answerOptionId": 5877, "labelSeeker": "Know Punjabi", "labelPost": "Knows Punjabi", "has": false },
            {
                "id": 15, "name": "Assamese", "synonyms": "Assamese","answerOptionId": 5878, "labelSeeker": "Know Assamese", "labelPost": "Knows Assamese",
                "has": false
            }
        ]
    }


var educationSynonyms = [
    { "id": 0, "name": "Never been to School", "synonyms": "no school" },
    { "id": 1, "name": "Less than 5th standard", "synonyms": "<5"  },
    { "id": 5, "name": "5th standard", "synonyms": "5th,6th" },
    { "id": 8, "name": "8th standard", "synonyms": "8th,7th" },
    { "id": 10, "name": "10th standard", "synonyms": "10,10th,9,9th" },
    { "id": 12, "name": "12th standard", "synonyms": "11,11th,12,12th,PUC" },
    { "id": 14, "name": "Diploma", "synonyms": "diploma,dipolma,iti" },
    { "id": 16, "name": "Bachelors", "synonyms": "college,b com,graduate,fresher,bachelor,bachelors" },
    { "id": 18, "name": "Masters", "synonyms": "masters,mba,m.b.a." },
    { "id": 19, "name": "PHD", "synonyms": "phd" }
];        

var citySynonyms = [
    { "id": "Mumbai", "synonyms": "bombay,mumbei" },
    { "id": "Chennai", "synonyms": "madras" },
    { "id": "Hyderabad", "synonyms": "" },
    { "id": "Pune", "synonyms": "" },
    { "id": "New Delhi", "synonyms": "delhi" },
    { "id": "Kolkata", "synonyms": "calcutta,calcuta" },
    { "id": "Bangalore", "synonyms": "bengaluru,bangaluru" },
    { "id": "Coimbatore", "synonyms": "" },
    { "id": "Noida", "synonyms": "" },
    { "id": "Guragoan", "synonyms": "" },
    { "id": "Pondicherry", "synonyms": "Puducherry,Pondy" },
    { "id": "Jaipur", "synonyms": "" },
    { "id": "Mysore", "synonyms": "" },
    { "id": "Mangalore", "synonyms": "" },

    //kanpor
    //erode

];

var categorySynonyms = [
    { "id": 0, "name": "Driver", "synonyms": "driver,driv,drivr,drvr,drivers,drivar,drivars,car,auto" },
    { "id": 1, "name": "Maid/Housekeeping", "synonyms": "maid,housekeeper,miad,mad,mid,cleaner,servant,servent,cleaner,maids,bai,cleaner,maids,made,housekeeping,house" },
    { "id": 2, "name": "Cook", "synonyms": "cook,cok,cooks,maharaj,chef" },
    { "id": 3, "name": "Aayah/Child Caretaker", "synonyms": "aayah,ayah,ayyah,nanny,nany,baby,caretaker" },
    { "id": 4, "name": "Gardener", "synonyms": "gardener,garden,grdener,grdenr,mali" },
    { "id": 5, "name": "Security/Guard", "synonyms": "guard,security guard,security,watchman,watcher,watchmen,watch man,watch men,guards,gard,gaurd,army" },
    { "id": 6, "name": "Construction/Laborer", "synonyms": "laborer,plumber,plumer,worker,labour,labor,construction,carpenter,carpentar,electrician" },
    { "id": 7, "name": "Garment Tailor/Textile", "synonyms": "garment worker,garmentworker,seamtress,sewer,cloth,tailor,fabric" },
    { "id": 8, "name": "Office Helper", "synonyms": "helper,officehelper,office boy,boy,boys,coffee,coffee boy,helpers,sahayak,peon" },
    { "id": 9, "name": "Delivery/Collection Logistics", "synonyms": "delivery helper,deliveryhelper,delivery,gofer,collections,collection,logistic,logistics,deliverycollections" },
    { "id": 10, "name": "Receptionist/Front Office", "synonyms": "receptionist,admin,secretary,exec admin,reception,office,assist,assistant,off,asstant,receiptionist,recepctionist,recepsinist,receptionist,receptinist,representative,admin manager,document,operational,receptionis,office work,assisten,affice,receptionist,cashierorreceptionist,administration,office,administrator,receptionlist,receptionist and front office executive" },
    { "id": 11, "name": "Other", "synonyms": "other" },
    { "id": 12, "name": "Maid Who Can Cook", "synonyms": "maid/cook,maid cum cook,maid cook,maidcook,maid-cook,cookmaid,cookandmaid" },
    { "id": 13, "name": "Data Entry/Back Office", "synonyms": "clerk,data opr,internet,clerk,data opr,data,comp,enter,computeroperator,entry,dataentryoperator,operator,opertar,computer opertar,excvtr,computer,dataentry,typist,typest,internet,draft,draftsmen,draftman,draftsman,clark,data entry and computer operator,officeclerk" },
    { "id": 14, "name": "Cashier/Retail", "synonyms": "cashier,retail,casheir,casheirs,cashiers,casher,cashiser,store,storekeeper,chashier,bank,retailclerk" },
    { "id": 15, "name": "Nurse/Healthcare", "synonyms": "nurse,nursemaid,nurse cum maid,nurse/maid,elder,medical,hospital,medicine,clinic" },
    { "id": 16, "name": "IT Software/Hardware", "synonyms": "it,itpro,software,hardware,web,technician,scientist,animator,sap,qa,qc,tech support,cad,architect,archtect,software engineer,database administrator,graphic designer,network engineer,system administrator,testing engineer" },
    { "id": 17, "name": "Machinist/ITI Trades", "synonyms": "machinist,fitter,machnist,welder,weld,fit,electrician,elec,electriaon,camera man,cemera men,technician,diploma" },
    { "id": 18, "name": "Sales/Marketing", "synonyms": "sales,salas,customer rep,cust rep,marketing,marketting,mrkt,mrkting,market,sell,showroom,purchaseexecutive,cust,rep,sale,sels,sales man,sales girl,sales person,seal,marketing and sales" },
    { "id": 19, "name": "BPO/Call Center", "synonyms": "telecaller,tele caller,caller,bpo,call center,center,centre,inbound,outbound,tele,backend" },
    { "id": 20, "name": "Management", "synonyms": "management,hr,mba,legal" },
    { "id": 21, "name": "Teacher/Trainer", "synonyms": "teacher,edu,teach,lecturer,professor,lec,prof,tutor,lecturer,tutors,teaching,research,researchassociate,trainer,train" },
    { "id": 22, "name": "Finance/Accounts", "synonyms": "finance,accountant,account,accounts,fin,accnt,accountent,auditor,financial,analyst,ca,tally,accounting,Chartered Accountant,Auditor,Finance Assistant,Finance Planning" },
    { "id": 23, "name": "Engineering", "synonyms": "engineering,engineer,eng,mech,civil,mechanical,hardware,enginer,cic,mechanical engineer,civil engineer,electrical engineer" },
    { "id": 24, "name": "Beautician/Salon", "synonyms": "spa,salon,hairdresser,hair,beautician,nails,beauty" },
    { "id": 25, "name": "Steward/Hospitality", "synonyms": "waiter,captain,restaurant,hotel,steward,hotels" }
];   

function getLocalizedAttributeText(attribute, value, session) {
    var localText = value;
    //console.log("getLocalizedAttributeText attribute" + attribute + " value" + value, localText); 
    if (attribute == "category") {
        localText = getLocalizedCategoryText(value, session);
    } else if (attribute == "education") {
        localText = getLocalizedEducationText(value, session);
    }
    //console.log("getLocalizedAttributeText attribute" + attribute + " value" + value, localText); 
                        
    return localText;
}

function getLocalizedCategoryText(catArray, session) {
    var catText = "";
    var catArrayText = util.inspect(catArray);
    if (catArray != null) {
        var cats = categorySynonyms.filter(
            function (cat) {
                if (Array.isArray(catArray)) {
                    return catArray.contains(cat.id) || catArray.contains(cat.id.toString());
                } else {
                    return cat.id.toString() == catArray.toString();
                }
            }
        );
        if (cats && cats.length > 0) {
            var catNames = [];
            cats.forEach(function (element) {
                catNames.push(gettext(element.name, session));
            }, this);
            catText = catNames.join(", ");
        }
    }    
    console.log("getLocalizedCategoryText catArray:" + catArrayText + " catText:" , catText);
    return catText; 
}


function getLocalizedEducationText(eduLevel, session) {
    var eduText = "";
    if (eduLevel != null) {
        var edus = educationSynonyms.filter(
            function (edu) {
                return edu.id.toString() == eduLevel.toString();
            }
        );
        if (edus && edus.length > 0) {
            var eduNames = [];
            edus.forEach(function (element) {
                eduNames.push(gettext(element.name, session));
            }, this);
            eduText = eduNames.join(", ");
        }
    }    
    console.log("getLocalizedEducationText eduLevel:" + eduLevel + " eduText:" , eduText);
    return eduText; 
}

//returns an array of matching category or Location values
function parseMessageForSynonymMatch(valueSynonymArray, text) {
    var cats = [];
    var showDebug = false;
    if (text && text.length > 0)
    {
        var textParts = [];
        //textParts = S(text).toLowerCase().split(" ");  //does not handle periods or commas well..
        var lowerText = S(text).toLowerCase().s;
        textParts = lowerText.match(/(\w+)/g); //split into words...
        for (var i = 0; i < valueSynonymArray.length; i++) {
            var value = valueSynonymArray[i];
            var syns = value.synonyms.split(",").filter(
                function (syn) {
                    var compare = S(syn).toLowerCase().s;
                    if (showDebug) {
                        console.log("in filter compare", compare);
                    }
                    return textParts.contains(compare);
                });
            //one of the synonyms matched one of the text parts...
            if (syns && syns.length > 0)
            {
                if (showDebug) {
                    console.log("Got a match value:", util.inspect(value, { showHidden: false, depth: null }));
                }
                cats.push(value["id"]);
            }

            if (showDebug) {
                console.log("parseMessageForSynonymMatch value:",
                    value.synonyms + " textParts.len:" + textParts.length + " textParts:" + textParts.join(",") +
                    ": syns:" + syns.join(",") + " cats:" + cats.join(","));
            }
        }
    } 
    return cats;
} 

function parseForIsLikelyEmployer(text) {
    text = S(text).toLowerCase();
    var likelyEmployer = false;
    if (S(text).contains("hire")) {
        likelyEmployer = true;
    }
    return likelyEmployer;
}


function parseForActiveJobSearch(text) {
    text = S(text).toLowerCase();
    var activeSearching = false;
    if (S(text).contains("job") || S(text).contains("search")) {
        activeSearching = true;
    }
    return activeSearching;
}

function userHasValidName(session) {
    var validName = true;
    var firstName = getProfileAttribute("firstName", session);   
    if (!firstName || firstName == "Mobile") {
        validName = false;
    }
    return validName;
}

///////////////////////////////////////////////////////////////////////////////

bot.dialog('/ensureSeekerProfile', [
    function (session, args, next) {
        //session.dialogData.profile = args || {};
        if (args == true || args == null) {
            session.dialogData.profile = session.userData.profile;
        } else {
            session.dialogData.profile = args;
        }
        console.log("start ensureSeekerProfile: session.dialogData.profile: " + util.inspect(session.dialogData.profile, { showHidden: false, depth: null }));

        if (!userHasValidName(session) ) {
            builder.Prompts.text(session,
                gettext("What's your name?", session, true));
        } else {
            next();
        }
    },
    function (session, results, next) {
        //process name
        if (results.response) {
            var name = results.response;// S(results.response).capitalize().s; 
            session.dialogData.profile.name = name;
            
            var nameParts = name.split(" ");
            var firstName = nameParts[0];
            
            session.send(gettext("Nice to meet you, ", session) + firstName);
            setNameToProfile(name, session);
            saveProfileAttribute("name", name, session);
        }

        if (!session.dialogData.profile.city) {
            session.beginDialog('/askLocation', session.dialogData.profile);
        } else {
            next();
        }
    },
    function (session, results, next) {
        if (!session.dialogData.profile.category) {
            session.beginDialog('/askCategory', session.dialogData.profile);
        } else {
            next();
        }
    },
    function (session, results, next) {
        session.endDialogWithResult({ response: session.dialogData.profile });
    }
]);

bot.dialog('/askLocation', [
    function (session, args, next) {
        if (args) {
            session.dialogData.profile = args;
        }
        var onFacebook = getProfileAttribute("channel", session) == "facebook";

        var q = "📍 " +
            gettext("In which pincode or city would you like to work?", session, true) +
            (onFacebook ? " " + gettext("For nearby jobs, send me your map location.", session) : "");
   

        var menuOptions = buildOptionsRetryPrompt(q, session, true); 
        //override menu options...
        menuOptions.listStyle = builder.ListStyle["auto"];

        
        
        builder.Prompts.choice(session, q,
            gettextForArray(cityMenu, session),
            menuOptions);
    },
    function (session, results, next) {
        let city = "Bangalore";
        let gotMap = false;

        //by-passing entity so we always get a valid location...
        if (results.response && results.response.entity) {
            city = cityMenu[results.response.index].value;
            //saveProfileAttribute("city", city, session);
            //session.dialogData.profile.city = city;
           
            //session.endDialogWithResult({ response: session.dialogData.profile });
        }
        else {
            console.log("figuring out city. initial city:", city);
            
            console.log("figuring out city. results.response:" + util.inspect(results.response, { showHidden: false, depth: null }));
            console.log("figuring out city. session.message:" + util.inspect(session.message, { showHidden: false, depth: null }));
        
            var lat, lng;
            var ents = session.message.entities;
            if (ents && ents.length > 0 && ents[0].geo) {
                lat = ents[0].geo.latitude;
                lng = ents[0].geo.longitude;
                
                gotMap = true;
                /*
                   session.message
                { type: 'message',
                timestamp: '2016-10-17T17:31:54.0544146Z',
                attachments: [],
                entities:
                [ { geo:
                    { elevation: 0,
                        latitude: 13.000933647155762,
                        longitude: 77.56626892089844,
                        type: 'GeoCoordinates' },
                    type: 'Place' } ],
            */
            } else {
                city = session.message.text;
            }
        }
        
        var locationQuery = gotMap ? lat + "," + lng : city;

        //Validate City + Allow for map upload...
        lookUpLocationAsync(
            locationQuery,
            gotMap,
            function (error, place) {
                if (error || !place) {
                    //saveProfileAttribute("city", city, session);
                    //session.dialogData.profile.city = city;
                    handleError("lookUpLocationAsync", null, error, city,
                        "I'm could not understand your city so I'm setting it to Bangalore"
                    );
                    city = "Bangalore";
                    saveProfileAttribute("city", city, session);
                    session.dialogData.profile.city = city;
                    session.endDialogWithResult({ response: session.dialogData.profile });
                } else {
                    var bjLocValue =
                        getBJLocationValueFromGoogleGeocode(place, gotMap, locationQuery);
                        
                    //fail if we don't find an India city...
                    //if (!bjValue.locality || bjValue.country != "India") {
                    //  bjValue = null;
                    //}
                        
                    //ensure we have Indian city set...
                    if (bjLocValue && bjLocValue.country == "India" && bjLocValue.locality) {
                        city = bjLocValue.locality;
                        session.dialogData.profile.city = city;
                            
                        //save the data...
                        setProfileAttribute("city", bjLocValue.locality, session);
                        session.dialogData.profile.cityPrecise = bjLocValue;
                        //Write full precise location to babajob once...
                        saveProfileAttribute("cityPrecise", bjLocValue, session);

                        var msg = gettext("I love", session) + " " + city + " 😊";
                        session.send(msg);
                            
                        //log funnel step
                        if (gotMap) {
                            logFunnel("", session, funnelSteps.Added_map_Location + " Added_map_Location", null, "");
                        } else {
                            logFunnel("", session, funnelSteps.Answered_Location + " Answered_Location", null, "");
                        }
                        
                        /*
                        if (gotMap || bjLocValue.confidence > 50) {

                            setProfileAttribute("city", bjLocValue.locality, session);
                            //Saving in Dialog as welll                                
                            session.dialogData.profile.cityPrecise = bjLocValue;

                            //Write full precise location to babajob once...
                            saveProfileAttribute("cityPrecise", bjLocValue, session);
                        } else {
                            //store city back to babajob
                            saveProfileAttribute("city", city, session);
                        }
                        */
                    } else {

                        city = "Bangalore";
                        saveProfileAttribute("city", city, session);
                        session.dialogData.profile.city = city;
                            
                        var msg = gettext("Sorry but I could not understand your city, so I'm setting it to Bangalore, India.", session);
                        session.send(msg);
                        logWarning("SetLocation", session,
                            "bjLocValue was not a city", bjLocValue);
                    }
                    console.log("set city to :", city);

                    //log funnel step            
                    logFunnel("", session, funnelSteps.Answered_Location + " Answered_Location", null, "");

                    session.endDialogWithResult({ response: session.dialogData.profile });
                }
            });
    }
]);


           

//https://maps.googleapis.com/maps/api/place/textsearch/xml?query=Coimbatore,India&key=GOOGLE_GEOCODE_API_KEY
//https://maps.googleapis.com/maps/api/geocode/json?address=delhi&key=GOOGLE_GEOCODE_API_KEY&region=in

//Async example
function lookUpLocationAsync(cityText,gotMap, callback) {
   // var uri = "https://maps.googleapis.com/maps/api/place/textsearch/xml?query=" + cityText +
   //     "&key=" + placesAPIKey;

    //special case "delhi" to "New Delhi"
    var delhiText = S(cityText).toLowerCase().s;
    if (S(delhiText).contains("delhi") && !S(delhiText).contains("new delhi")) {
        cityText = S(delhiText).replaceAll("delhi", "New Delhi").s
    }

    //TODO: ddefault to capitals in state

    var uri = "https://maps.googleapis.com/maps/api/geocode/json?region=in&address=" + cityText +
        "&key=" + GOOGLE_GEOCODE_API_KEY;
    request({
        uri: uri,
        method: "GET",
        accept: "application/json",
        contentType: "application/json",
        timeout: 5000
    }, function (error, response, body) {
        if (error) {
            console.log("Got back error map " + util.inspect(body, { showHidden: false, depth: null }));
        
            callback(error, null);
        } else {
            try {
                let place = JSON.parse(body);
                console.log("Google Geocode Uri:", uri);
                console.log("Got big map back");
                //console.log("Got big map back " + util.inspect(place, { showHidden: false, depth: null }));
        
                callback(null, place);
            } 
            catch (e) {
                callback(e);
            }
        }
    }
    );    
};



//take a google object and makes the correct Babajob parameters for the object
function getBJLocationValueFromGoogleGeocode(locObj, gotMap, locationQuery) {
    
    var confidence = 50; //city level confidence
    
    var pincodeMatches = locationQuery.match(/(\b[\d]{6}\b|\b[\d]{3} [\d]{3}\b)/g);
    if (gotMap || (pincodeMatches != null && pincodeMatches.length > 0)) {
        //set confidence to 100 if map was sent or a pincode was sent.
        confidence = 100;
    }
   
    
    var bjValue =
        {
            isVerified: false,
            //formatted_address: 'R-38,R Block,  Kovaipudhur,  coimbatore ',
            landmark: '',
            //location: { longitude: 76.938379, latitude: 10.9435131 },
            //postal_code: '641042',
            //country: 'India',
            //locality: 'Coimbatore',
            confidence: confidence
            //100 is pincode
            //110 is map drag but I think there's a bug around that
            //50 is city Update confidence if we are more accurate...
        };
    
    //console.log("getBJLocationValueFromGoogleGeocode :" + util.inspect(locObj, { showHidden: false, depth: null }));
    

    try {
        //determine the correct google locality to use 
        //sometimes it does not contain a locality in the first response object (e.g. Delhi)
        //https://maps.googleapis.com/maps/api/geocode/json?region=in&address=Delhi&key=AIzaSyA4ouAWlzc2jCpoA_YY-ufIFkMENa5EgH0
 
        var loc = locObj.results[0];
        if (locObj.results.length > 1) {
            var foundLocality = false;
            for (var y = 0; !foundLocality && y < locObj.results.length; y++) {
                var localitysFirst = locObj.results[y].address_components.filter(function (i) {
                    return i.types.contains("locality");
                });
        
                if (localitysFirst && localitysFirst.length > 0) {
                    foundLocality = true; //stop the loop
                    loc = locObj.results[y]; //set the loc object correctly for logic below...
                }
            }
        }

    
        
        bjValue.formatted_address = loc.formatted_address;
        bjValue.location = {};
        bjValue.location.longitude = loc.geometry.location.lng;
        bjValue.location.latitude = loc.geometry.location.lat;


        //postal_code
        var postals = loc.address_components.filter(function (i) {
            return i.types.contains("postal_code");
        });
        if (postals && postals.length > 0) {
            bjValue.postal_code = postals[0].long_name;
        }


        //city/locality
        var localitys = loc.address_components.filter(function (i) {
            return i.types.contains("locality");
        });
        
        if (localitys && localitys.length > 0) {
            bjValue.locality = localitys[0].long_name;
        }
 
        //Country
        var countrys = loc.address_components.filter(function (i) {
            return i.types.contains("country");
        });
        if (countrys && countrys.length > 0) {
            bjValue.country = countrys[0].long_name;
        }
    }
    catch (e) {
        handleError("getBJLocationValueFromGoogleGeocode exception:", session, e, bjValue);
    }
    console.log("getBJLocationValueFromGoogleGeocode bjValue:" + util.inspect(bjValue, { showHidden: false, depth: null }));
    
    
    return bjValue;
}

    
        /*
        { isVerified: false,
                formatted_address: 'R-38,R Block,  Kovaipudhur,  coimbatore ',
                landmark: '',
                location: { longitude: 76.938379, latitude: 10.9435131 },
                postal_code: '641042',
                country: 'India',
                locality: 'Coimbatore',
                confidence: 100 },
            
        //from Google...
            {
        "results" : [
            {
                "address_components" : [
                    {
                    "long_name" : "Connaught Place",
                    "short_name" : "CP",
                    "types" : [ "political", "sublocality", "sublocality_level_1" ]
                    },
                    {
                    "long_name" : "New Delhi",
                    "short_name" : "New Delhi",
                    "types" : [ "locality", "political" ]
                    },
                    {
                    "long_name" : "New Delhi",
                    "short_name" : "New Delhi",
                    "types" : [ "administrative_area_level_2", "political" ]
                    },
                    {
                    "long_name" : "Delhi",
                    "short_name" : "DL",
                    "types" : [ "administrative_area_level_1", "political" ]
                    },
                    {
                    "long_name" : "India",
                    "short_name" : "IN",
                    "types" : [ "country", "political" ]
                    },
                    {
                    "long_name" : "110001",
                    "short_name" : "110001",
                    "types" : [ "postal_code" ]
                    }
                ],
                "formatted_address" : "Connaught Place, New Delhi, Delhi 110001, India",
                "geometry" : {
                    "bounds" : {
                    "northeast" : {
                        "lat" : 28.6375771,
                        "lng" : 77.22336
                    },
                    "southwest" : {
                        "lat" : 28.6202521,
                        "lng" : 77.2072139
                    }
                    },
                    "location" : {
                    "lat" : 28.6314512,
                    "lng" : 77.2166672
                    },
                    "location_type" : "APPROXIMATE",
                    "viewport" : {
                    "northeast" : {
                        "lat" : 28.6375771,
                        "lng" : 77.22336
                    },
                    "southwest" : {
                        "lat" : 28.6202521,
                        "lng" : 77.2072139
                    }
                    }
                },
                "partial_match" : true,
                "place_id" : "ChIJV9BBtzf9DDkR8cOTc-SI7s0",
                "types" : [ "political", "sublocality", "sublocality_level_1" ]
            }
        ],
        "status" : "OK"
        }
            
            */






bot.dialog('/restartProfile', [
    function (session, args, next) {
                //clear out the old data before I start...
        //session.userData.profile = null;
        //setProfileAttribute("gender", null, session);
        setProfileAttribute("education", null, session);
        setProfileAttribute("category", null, session);
        setProfileAttribute("city", null, session);

        //mobile, language, role?
        //setProfileAttribute("gender", null, session);
        /*
        var bjUserId = getProfileAttribute("bjUserId", session);
        if (bjUserId) {
            session.send(gettext("Your Babajob Profile Link is",session) 
            + " " + bjWebDomain + "/person-" + bjUserId);
        }
        */
        
        var mobile = getProfileAttribute("mobile", session);
        if (!mobile) {
            session.beginDialog("/askForBabajobMobileWithLater", true);
        } else {    
            next();
        }    
    },
    function (session, args, next) {
        session.beginDialog('/ensureSeekerProfile', session.userData.profile);
    },
    function (session, results, next) {
        session.beginDialog('/askAboutMe');
    }
    ,
    function (session, results, next) {
        var profile = session.userData.profile; 
        //console.log("session.userData" + util.inspect(session.userData, { showHidden: false, depth: null }));
        //var endText = gettext("Great. I'll show you the best jobs in %(city)s", profile);
        session.endDialogWithResult({ response: profile });
    }
]);



bot.dialog('/ImproveProfile', [
    function (session, args, next) {
        var mobile = getProfileAttribute("mobile", session);
        if (!mobile) {
            session.beginDialog("/askForBabajobMobileWithLater", true);
        } else {
            next();
        }
    },
    function (session, args, next) {
        //name, location, category 
        session.beginDialog('/ensureSeekerProfile', session.userData.profile);
    },

    function (session, results, next) {
        var gender = getProfileAttribute("gender", session);
        if (!gender) {
            session.beginDialog('/askGender');
        } else {
            next();
        }
    },

    function (session, results, next) {
        var aboutMe = getProfileAttribute("aboutMe", session);
        if (!aboutMe) {
            session.beginDialog('/askAboutMe');
        } else {
            next();
        }
    },



    function (session, results, next) {
        var education = getProfileAttribute("education", session);
        if (!education) {
            session.beginDialog('/askEducation');
        } else {
            next();
        }
    },
    
    function (session, results, next) {
        var salary = getProfileAttribute("salary", session);
        if (!salary) {
            session.beginDialog('/askSalary');
        } else {
            next();
        }
    },


    function (session, results, next) {
        var experience = getProfileAttribute("experience", session);
        if (!experience) {
            session.beginDialog('/askExperience');
        } else {
            next();
        }
    },    

    //OTP
    //age
    //languages...
    //current position
    //current company, last company, 


    //Category specific questions...
    //Rich Doc License
    //World Bank
    //voiceClip

    function (session, results, next) {
        var profile = session.userData.profile;
        var msg = gettext("Great", session ) + "! " + gettext("Your basic biodata is complete.", session) + " "
        + gettext("Now take our Personality Quiz and upload your ID Proofs to make yourself stand out to employers.", session);
        session.send(msg);
        //console.log("session.userData" + util.inspect(session.userData, { showHidden: false, depth: null }));
        //var endText = gettext("Great. I'll show you the best jobs in %(city)s", profile);
        session.endDialogWithResult({ response: profile });
    }
]);



bot.dialog('/menu', [
    function (session) {
        console.log("/menu");
       
        /*
        var menuObj = gettextForArray(menuData, session);
        builder.Prompts.choice(session,
            gettext("What would you like to do?", session),
            menuObj, buildOptionsRetryPrompt(menuData, session, true));
        */
        
        var msg = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments(getMenuHeroCards(session));

        //session.send(msg);

        //console.log(util.inspect(session.userData.profile));
        
        

        var promptArray = [];
        promptArray.push("SearchJobs");
        promptArray.push("ImproveProfile");

        promptArray.push("AddIDProof");
        promptArray.push("personalityTestCard");

        //only show voice chat to facebook users...    
        var channel = getProfileAttribute("channel", session);
        if (channel == "facebook") {
           // promptArray.push("RecordMyVoice");
        }

        var bjUserId = getProfileAttribute("bjUserId", session);
        if (bjUserId) {
            promptArray.push("goToBabajobCard");
        }

        promptArray.push("language");
        //promptArray.push("amazonCoupon");
        promptArray.push("giveFeedback");
    
        var promptCommands = promptArray.join("|");
        
            
        var promptOptions = {};
        promptOptions.maxRetries = 0;
        builder.Prompts.choice(session, msg, promptCommands, promptOptions);
    },
    function (session, results, next) {
        if (results.response && results.response.entity != '(quit)' && menuData[results.response.index])
        {
            console.log("menu selected:" + util.inspect(results.response, { showHidden: false, depth: null }));
            
            var menuDialog = results.response.entity; // menuData[results.response.index].value;
            session.beginDialog('/' + menuDialog);
        }
        /*
        else {
            console.log("no Match on menu:" + util.inspect(results.response));
            var text = session.message.text;
            session.beginDialog("/generalParser", text);
            //next();
        }
        */
    }
    ,
    function (session, results, next) {
        // The menu runs a loop until the user chooses to (quit).
        session.replaceDialog('/menu');
    }    
])
//    .reloadAction('reloadMenu', null, { matches: /^menu|show menu/i });
bot.beginDialogAction('menu', '/menu', { matches: /^menu/i });


function getMenuHeroCards(session) {
    var cards = [];
   
    /*
    151 Driver Jobs in Bangalore

See nearby jobs, apply
and call employers immediately if you meet the job's requirements.

Search Jobs  

*/
    var jobCardTitle = gettext("🔍 Search Jobs", session);

    var city = getProfileAttribute("city", session);
    var cat = getLocalizedCategoryText(getProfileAttribute("category", session), session);

    //Search Bangalore Driver jobs.
    jobCardTitle = "🔍 " + gettext("Search", session) + " " +
        (city ? city + " " : "") + (cat ? cat + " " : "") + gettext("Jobs", session);

    var jobCard = new builder.HeroCard(session)
        .title(jobCardTitle)
        .subtitle(gettext("See nearby jobs, apply and call employers if you meet their requirements.", session))
        .buttons([
            builder.CardAction.imBack(session, "SearchJobs", gettext("🔍 Search Jobs", session))
        ]);
    console.log("Menu Job Card Title:", jobCardTitle);
    
    var idProofCard = new builder.HeroCard(session)
        .title(gettext("Photograph and Verify your Documents", session))
        .subtitle(gettext("I can verify your Aadhaar Card, PANCard, etc & showcase them to employers.", session))
        .buttons([
            builder.CardAction.imBack(session, "AddIDProof", "📷 " + gettext("Add ID Proof", session))
        ]);
    

    var carDocumentCard = new builder.HeroCard(session)
        .title("🚗 " + gettext("Upload your Car Documents", session))
        .subtitle(gettext("Take photos of your car registration, insurance and tax documents for awesome driver jobs", session))
        .buttons([
            builder.CardAction.imBack(session, "carDocument", "📷 " +  gettext("Add Car Document", session))
        ]);
        
    var personalityTestCard = new builder.HeroCard(session)
        .title(gettext("Showcase your Personality", session))
        .subtitle(gettext("I can identify your best personality traits to help you get a better job.", session))
        .buttons([
            builder.CardAction.imBack(session, "PersonalityQuiz", gettext("💡 Take the Quiz", session))
        ]);
    var voiceCard = new builder.HeroCard(session)
        .title(gettext("Prove your English Skills", session))
        .subtitle(gettext("Send me a voice clip over chat and I'll certify how well you command English.", session))
        .buttons([
            builder.CardAction.imBack(session, "RecordMyVoice", gettext("🎤 Record my Voice", session))
        ]);
    
    /*
    Map
Your Biodata & Profile
Driver, Bangalore, Rs 15000, 
Edit my Profile
*/
    var editProfileCard = new builder.HeroCard(session)
        .title(gettext("Improve Your Biodata & Profile", session))
        .subtitle(gettext("Add your education, experience, salary and how you describe yourself", session))
        .buttons([
            builder.CardAction.imBack(session, "ImproveProfile", "💼 " + gettext("Improve Profile", session))
        ]);

    
    //we check below to ensure the babajob id is valid...
    var bjUserId = getProfileAttribute("bjUserId", session);
    var profileURL = bjWebDomain + "/person-" + bjUserId;
    var goToBabajobCard = new builder.HeroCard(session)
        .title(gettext("See yourself on Babajob.com", session, true))
        .subtitle(gettext("Login to Babajob.com and see how your profile looks to employers", session) )
        .buttons([
            builder.CardAction.openUrl(session, profileURL, gettext("Visit Babajob.com", session))
        ]);
   
    var languageCard = new builder.HeroCard(session)
        .title(gettext("Speak हिंदी, தமிழ் or ಕನ್ನಡ", session, true) + "?")
        .subtitle(gettext("I can speak multiple languages too", session) + ".")
        .buttons([
            builder.CardAction.imBack(session, "language", gettext("🌐 Change Language", session))
        ]);

    /*
    var amazonCard = new builder.HeroCard(session)
        .title(gettext("Get your Rs 50 Amazon Coupon", session) + "!")
        .subtitle(gettext("Babajob and Amazon have teamed up to help you improve your Babajob profile", session) + ".")
        .buttons([
            builder.CardAction.imBack(session, "amazonCoupon", gettext("Learn More", session))
        ]);
        */
    
    var feedbackCard = new builder.HeroCard(session)
        .title(gettext("Tell us what you think", session) + "!")
        .subtitle(gettext("We'd love to hear from you", session) + ".")
        .buttons([
            builder.CardAction.imBack(session, "giveFeedback", gettext("😊 Give Feedback", session))
        ]);
    

    var channel = getProfileAttribute("channel", session); 
    var seekerIsDriver = false;
    var showQuizFirst = showPersonalityQuizFirst(session);
   
    if (showQuizFirst) {
        cards.push(personalityTestCard);
    }

    cards.push(jobCard);
    if (seekerIsDriver) {
        cards.push(carDocumentCard);    
    }
    
    //hide the quiz if they have already taken it...
    if (!showQuizFirst && !getProfileAttribute("tookPersonalityQuiz", session)) {
        cards.push(personalityTestCard);
    }
    cards.push(editProfileCard);
    cards.push(idProofCard);

    if (bjUserId) {
        cards.push(goToBabajobCard);
    }

    cards.push(languageCard);
    //cards.push(amazonCard);

    //only show voice chat to facebook users...    
    if (channel == "facebook") {
        cards.push(voiceCard);
    }
    cards.push(feedbackCard);
    return cards;
}

function showPersonalityQuizFirst(session)
{
    var first = true;
    if (getProfileAttribute("tookPersonalityQuiz", session)) {
        first = false;
    } else
    //we want to show to returning users but not first timers...
    {
        if (getProfileAttribute("10 Added_map_Location", session)
            || getProfileAttribute("3 Answered_Location", session)
        )
            first = false;
    }
    return first;
}

function getHeroCard(title, subtitle, imageURL, menuItem, session) {
    return new builder.HeroCard(session)
        .title(gettext(menuItem.title || menuItem.en, session))
        .subtitle("The Space Needle is an observation tower in Seattle, Washington, a landmark of the Pacific Northwest, and an icon of Seattle.")
        .images([
            builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Seattlenighttimequeenanne.jpg/320px-Seattlenighttimequeenanne.jpg")
                .tap(builder.CardAction.showImage(session, "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Seattlenighttimequeenanne.jpg/800px-Seattlenighttimequeenanne.jpg")),
        ])
        .buttons([
            builder.CardAction.openUrl(session, "https://en.wikipedia.org/wiki/Space_Needle", "Wikipedia"),
            builder.CardAction.imBack(session, "select:100", "Select")
        ]);
}


/*
bot.dialog('/fakemenu', [
    function (session) {        
         var menuObj = gettextForArray(menuData, session);
         builder.Prompts.choice(session,
             gettext("What would you like to do?",session), menuObj, buildOptionsRetryPrompt(menuData, session, true));
    },
    function (session, results) {
        if (results.response && results.response.entity != '(quit)' && menuData[results.response.index])
        {
            console.log("menu selected:" + util.inspect(results.response, { showHidden: false, depth: null }));
            var menuDialog = menuData[results.response.index].value;
            session.beginDialog('/' + menuDialog);
        } else {
            session.replaceDialog("/generalParser");
        }
    }
])
bot.beginDialogAction('fakemenu', '/fakemenu', { matches: /^fakemenu/i });
*/

function checkValidUserDataProfile(session) {
    //console.log("checkValidUserDataProfile session", util.inspect(session));
    //console.log("checkValidUserDataProfile session.userData", util.inspect(session.userData));
    if (!session.userData.profile
        || session.userData.profile == null
        || session.userData.profile == true) {
        session.userData.profile = {};

        //default to list liststyle...
        session.userData.profile.listStyle = builder.ListStyle["list"];
    }
}

function relevantCategoryMenu(profile) {
    var menu = categoryMenu12Male;
    if (profile && profile.education && profile.gender) {
        if (profile.education <= 10) {
            if (profile.gender == "female") {
                menu = categoryMenu10Female;
            } else {
                menu = categoryMenu10Male;
            }
        } else {
            if (profile.gender == "female") {
                menu = categoryMenu12Female;
            } else {
                menu = categoryMenu12Male;
            }
        }
    }
    return menu;
}
 



bot.dialog('/askForBabajobMobile', [
    function (session, args, next) {
        if (args == true || args == null) {
            session.dialogData.profile = {};
        } else {
            session.dialogData.profile = args;
        }    

        builder.Prompts.text(session, "📱 " + gettext("What's your mobile number?",session, true));
    },
    function (session, results, next) {
        if (results.response) {
            var mobileText = results.response;
            //validate it's a real Indian numger'
            var mobile = cleanMobileNumber(mobileText);
            if (!mobile) {
                session.send(gettext("Hmm...",session) + " 📱 " + mobileText + " " +
                    gettext("does not appear to be a valid Indian mobile number. Please enter another or text back 'goodbye'", session));
                session.replaceDialog("/askForBabajobMobile");
            }
            else {
                session.dialogData.profile.mobile = mobile;
                session.beginDialog("/signIntoBabajobWithMobile", mobile);
            }
        }
        //   session.endDialogWithResult({ response: session.dialogData.profile });
    },
    function (session, results,next) {
        session.endDialog();
    }
]);

bot.dialog('/askForBabajobMobileWithLater', [
    function (session, args, next) {
        checkValidUserDataProfile(session);
        var text = "📱 " +
            gettext("Send me your mobile number or 'later' if you'd prefer employers not to call you now.", session);
        //builder.Prompts.text(session,text);
        builder.Prompts.choice(session, "📱 " + gettext("What's your mobile number?", session, true),
            "🏃🏼" + " " + gettext("Skip", session), {maxRetries: 0});
    },
    function (session, results, next) {
        if (results.response && results.response.entity) {
            next();
        } else {
            var mobileText = session.message.text;
            mobileText = S(mobileText).toLowerCase().s;
            if (S(mobileText).contains("later") || mobileText == "no" || S(mobileText).contains("skip") ) {
                next();
            } else {
                //validate it's a real Indian numger'
                var mobile = cleanMobileNumber(mobileText);
                if (!mobile) {
                    session.send(gettext("Hmm...", session) + " 📱 " + mobileText + " " +
                        gettext("does not appear to be a valid Indian mobile number.", session) + " ");
                    session.replaceDialog("/askForBabajobMobileWithLater");
                }
                else {
                    session.beginDialog("/signIntoBabajobWithMobile", mobile);
                }
            }
        }
    },
    function (session, results,next) {
        session.endDialog();
    }
]);
bot.beginDialogAction('askForBabajobMobileWithLater', '/askForBabajobMobileWithLater', { matches: /^askMobile/i });


//returns null if not a validNumber, returns 10-digit mobile otherwise
function cleanMobileNumber(mobileText) {

    //https://github.com/googlei18n/libphonenumber
    /*
    {
    "country_code": 41,
    "national_number": 446681800
    }
    */
    //9740530275 
    var cleanNumber = null;
    var parsedNumber;
    var nationalNumber; 
    try {
        parsedNumber = phoneUtil.parse(mobileText, "IN");
        cleanNumber = phoneUtil.format(parsedNumber, PNF.E164);
        nationalNumber = phoneUtil.format(parsedNumber, PNF.NATIONAL);

    } catch (e) {
        console.log("phoneUtil.parse exception. Provided mobileText:" + mobileText + ": exception: " + e);
    }
    
    console.log("cleanNumber: " + util.inspect(cleanNumber, { showHidden: false, depth: null }));
    console.log("nationalNumber: " + util.inspect(nationalNumber, { showHidden: false, depth: null }));
 

    if (cleanNumber != null
        && S(cleanNumber).startsWith("+91")
        && (
            S(nationalNumber).startsWith("07") ||
            S(nationalNumber).startsWith("08") ||
            S(nationalNumber).startsWith("09")
        )    
    )
    {
        return cleanNumber;
    } else {
        return null;
    }
}

bot.dialog('/restartEnsureMobile', [
    function (session)
    {
        checkValidUserDataProfile(session);
        //reset the mobile data if it's there
        if (session.userData.profile.mobile) {
            session.userData.profile.mobile = null;
        }
        
        if (session.userData.profile.mobileVerified) {
            session.userData.profile.mobileVerified = null;
        }

        session.beginDialog('/askForBabajobMobile', session.userData.profile);
    },
    function (session, results) {
        var mobile = getProfileAttribute("mobile", session);
        var endText = "📱 " + gettext("I've updated your mobile to ", session) + mobile;
        session.endDialog(endText, session.userData.profile);
    }
]);

/*
//Old code to get mobile...
bot.dialog('/ensureMobile', [
    function (session, args, next) {
        if (args == true || args == null) {
            session.dialogData.profile = {};
        } else {
            session.dialogData.profile = args;
        }    

        if (!session.dialogData.profile.mobile) {
            session.send(gettext("To apply for jobs, employers need your verified mobile."));
            builder.Prompts.number(session,"📱 " + gettext("What's your mobile number?", session));            
        } else {
            next();
        }
    },
    function (session, results, next) {
        if (results.response) {
            session.dialogData.profile.mobile = results.response;
        }
        //verification is combined with the mobile number given I need to redo verification for new numbers...
        if (!session.dialogData.profile.mobileVerified || (session.dialogData.profile.mobile != session.dialogData.profile.mobileVerified)) {
            session.send(gettext("Great.", session) + gettext("I've just SMS'd you an OTP code.", session));
            builder.Prompts.number(session,
                gettext("Please text back your 4 digit OTP to verify your mobile.", session));
        } else {
            next();
        }
    },
    function (session, results) {
        if (results.response) {
            let OTP = results.response;
            
            //TODO: Call babajob to verify the mobile OTP. 
            let OTP_was_correct = true;
            
            if (OTP_was_correct) {
                session.send(gettext("Great.", session) + " " + gettext("Your mobile number is now verified and you can call employers.", session));
                //store the verified mobile in mobileVerified property
                session.dialogData.profile.mobileVerified = session.dialogData.profile.mobile;
            } else {
                session.send(gettext("Sorry.", session) + " " + gettext("I could not verify your mobile number.", session));
            }

        }
        session.endDialogWithResult({ response: session.dialogData.profile });
    }
]);
*/

///////////////////////////////////////////////////////
///  RICH DOCS - VOICE AND GOVERNMENT ID DOCS  ////////
///////////////////////////////////////////////////////

let richDocsDomain = "http://localhost:3001/richdocs";

bot.dialog('/carDocument', [
    function (session) {
        beginDialog('/AddIDProof', 'carDocument');
    },
    function (session, results) {
        session.endDialog();
    }
]); 
bot.beginDialogAction('carDocument', '/carDocument', { matches: /^carDocument/i });


bot.dialog('/AddIDProof', [
    function (session, args) {
        var introText = "Employers often need to see your ID Proof to consider your application."
        var questionText = "📷 " + gettext("Which ID Proof will you photograph?", session,true);
    
        session.dialogData.menu = governmentIDMenu;

        if (args && args == 'carDocument') {
            introText = "You can get much better paying driver jobs if you photograph and then send me your car documents.";
            questionText = "📷 " + gettext("Which Car Document will you photograph?", session);
            session.dialogData.menu = carDocumentMenu;
        }        

        session.send(gettext(introText, session));

         //var menuObj = gettextForArray(menuData, session);
        builder.Prompts.choice(session, questionText, gettextForArray(session.dialogData.menu, session), buildOptionsRetryPrompt(questionText,session, false,true));
    },
    function (session, results) {
        let richDocHint = "";
        let localizedRichDoc = "";
        if (results.response) {
            if (results.response.entity) {
                richDocHint = session.dialogData.menu[results.response.index].value;
                localizedRichDoc = results.response.entity;
            } else {
                //TODO: Validate Document...
                richDocHint = results.response;
                localizedRichDoc = results.response;
            }
            session.dialogData.richDocHint = richDocHint;
            session.dialogData.localizedRichDoc = localizedRichDoc;
        }

        //TODO: If they choose Company Card or Payslip, also ask for Compnany Name...        
        var txt = "📷 " + gettext("Please take a picture of your", session) + " " + localizedRichDoc + " "
            + gettext("and send it back to me in this chat.", session);
        var promptOptions = { maxRetries: 1 };

        builder.Prompts.attachment(session, txt, promptOptions);
    },

    function (session, results) {
        var msg = new builder.Message(session)
            .ntext("I got %d photos.", "I got %d photos.", results.response.length);
        var attachmentCount = results.response.length;

        if (attachmentCount => 1) {
            var attachment = results.response[0];
          //  results.response.forEach(function (attachment) {
                console.log("Attachment data: " + util.inspect(attachment, { showHidden: false, depth: null }));

                logFunnel("", session, funnelSteps.Added_RichDoc + " Added_RichDoc", null, ""); 
                                
                
                //TODO: Check if too big                
                let contentUrl = attachment.contentUrl;
                let contentType = attachment.contentType;
                //msg.text("attachment data:" + attachment.contentType + " URL:" + attachment.contentUrl);
                msg.text("I'll now analyze your photo and verify it's official...");
                //msg.addAttachment(attachment);
                session.send(msg);
                session.sendTyping();

                let firstName = "Unknown";
                let lastName = "User";
                let bjUserId = "BJ10001";
                
                if (session.userData.profile) {
                    if (session.userData.profile.firstName) { firstName = session.userData.profile.firstName; };
                    if (session.userData.profile.lastName) { lastName = session.userData.profile.lastName; };
                    if (session.userData.profile.bjUserId) { bjUserId = session.userData.profile.bjUserId; };
                }

                let documentHint = "GovenrmentID";
                if (session.dialogData.richDocHint) {
                    documentHint = session.dialogData.richDocHint
                }
                
                let localizedDoc = "document";
                
                if (session.dialogData.localizedRichDoc) {
                    localizedDoc = session.dialogData.localizedRichDoc
                }
                
                var jobSeekerId = getProfileAttribute("jobSeekerId", session);
                var accessToken = getProfileAttribute("accessToken", session);

                //call Async
                var putData = {
                    firstName: firstName, lastName: lastName, userid: bjUserId,
                    contentType: contentType, contentUrl: contentUrl, documentHint: documentHint,
                    jobSeekerId: jobSeekerId, accessToken: accessToken
                };
                var uri = richDocsDomain + '/api/richdocs';
            
                console.log("About to send RichDoc");
                console.log(putData);
                console.log(util.inspect(putData, { showHidden: false, depth: 10 }));
    
                request({
                    uri: uri ,
                    method: "POST",
                    timeout: 45000,
                    form: putData,
                }, function (error, response, body) {
                    if (error) {
                        handleError("AddIDProof", session, error, putData, "Error in analyzing your ID Proof", uri, body);
                    } else {
                        try {
                            console.log("Got back richDocs Body" + util.inspect(body, { showHidden: false, depth: null }));
    
                            let richDocObj = JSON.parse(body);
                            console.log("Got back richDocs result " + util.inspect(richDocObj, { showHidden: false, depth: null }));
                       
                            //if (richDocObj.success) {
                            if (richDocObj.document.summary) {
                                let summary = richDocObj.document.summary;
                                let title = gettext("Here's what I think your", session) + " " + localizedDoc + " " + gettext("says", session) + ": ";

                                if (richDocObj.document.verificationLevel &&
                                    richDocObj.document.verificationLevel >=
                                    VerificationLevelEnum.API_Number && 
                                    richDocObj.document.verifier)
                                {
                                    title = localizedDoc + " " + gettext("VERIFIED by ", session) + " " + "Indian Gov't"; // + richDocObj.document.verifier;
                                };
                                
                                var richDocCard = new builder.HeroCard(session)
                                    .title(title)
                                    .images([
                                        builder.CardImage.create(session, richDocObj.publicUploaded)
                                    ])
                                    .subtitle(summary)
                                    .buttons([
                                        builder.CardAction.imBack(session, "AddIDProof", "📷 " + gettext("Add ID Proof", session)),
                                       // builder.CardAction.imBack(session, "menu", gettext("Menu", session)) 
                                    ]);
                                
                                var msg = new builder.Message(session)
                                .attachmentLayout(builder.AttachmentLayout.carousel)
                                .attachments([richDocCard]);

                                session.send(msg);

                               // session.send(gettext("Here's what I think your", session) + " "
                               //     + localizedDoc + " " + gettext("says", session) + ": " + summary);
                                
                                if (richDocObj.nameMatch) {
                                    //Update any other data in the document (address, DOB, Aadhaar)
                                    updateOtherRichDocData(richDocObj, session);
                                    logFunnel("", session, funnelSteps.Got_a_Parsed_RichDoc + " Got_a_Parsed_RichDoc", null, "");
                                } else {
                                    var msg = gettext("Sorry, I could not tell if that was a valid", session)
                                        + " " + localizedDoc + " " + gettext("with your name on it.", session);
                                    msg += " " + gettext("Please Add ID Proof again with a new photo.", session);
                                    session.send(msg);
                                }
                            } else {
                                //no summary and likely resume...
                                let title = gettext("Great",session) + "! " +  gettext("I've saved your", session) + " " + localizedDoc + " " + gettext("to your Babajob profile", session) + ".";
                                session.send(title);
                                logFunnel("", session, funnelSteps.Got_a_Parsed_RichDoc + " Got_a_Parsed_RichDoc", null, "");
                                
                            }
                        } catch (e) {
                            handleError("AddIDProof", session, e, putData, "Exception in analyzing your ID Proof", uri, body);
                        }
                        session.endDialog();
                    }
                    
                });

                
    //    });
    
        } else {
            session.endDialog(msg);
        }
    }
]);
bot.beginDialogAction('AddIDProof', '/AddIDProof', { matches: /^AddIDProof/i });

var VerificationLevelEnum = {
  NotVerified: 0,
  Name: 1,
  Name_DocTitle: 2,
  Name_DocTitle_ID: 3,
  Name_DocTitle_ID_Human: 4,
  API_Number: 5,
  API_Number_Name: 6,
};


//parse the richDoc info and update aadhaar, DOB or address...

//Assume namematch was found
function updateOtherRichDocData(richDocObj, session) {
    /*
    nameMatch = null | firstName | last | firstAndLast
    document
     { summary: 'Verified: Sean Blagsvedt\'s PANCard AJGPB7906B Age: 40',
         hint: 'PANCard',
         type: 'PANCard',
         hasFace: null,
         humanVerified: null,
         user:
          { firstName: '',
            lastName: '',
            location: { stateName: null },
            PANumber: 'AJGPB7906B',
            DOB: '1976-02-17T03:00:00.000Z' } },
    */

    //var nameMatch = richDocObj.nameMatch;
    var user = richDocObj.document.user;

    var oldDOB = getProfileAttribute("age", session);
    
    if (!oldDOB && user && user.DOB) {
        saveProfileAttribute("age", user.DOB, session);
    }

    var oldAadhaar = getProfileAttribute("aadhaar", session);
    if (!oldAadhaar && user && user.aadhaarNumber) {
        saveProfileAttribute("aadhaar", user.aadhaarNumber, session);
    }    

}

        

///////////////////////////////////////////////////////////////////////////////////
////// VOICE CLIP  ////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////


var englishSpeakingPhrase = "I'm an honest and hard worker and I'd love to work for you.";
bot.dialog('/RecordMyVoice', [
    function (session, args) {
        session.send(gettext("Employers often want to hear your voice before hiring you.",session));
        session.send("🎤 " + gettext("Please record the following phrase and send it back to me in this chat", session));
        
        //Animated Helper Gif...
        var help_gif = "https://storage.googleapis.com/babarichdocs/help_gifs/Babajob%20-%20Job%20Seeker%20Low%20Quality.gif";
        var helpMsg  = new builder.Message(session)
            .attachments([{
                contentType: "image/gif",
                contentUrl: help_gif
            }]);
            
        session.send(helpMsg);
        var txt = "\"" + englishSpeakingPhrase + "\"";
        var promptOptions = { maxRetries: 0 };

        builder.Prompts.attachment(session, txt, promptOptions);
    },

    function (session, results) {
        var msg = new builder.Message(session)
            .ntext("I got %d voice clip.", "I got %d voice clip.", results.response.length);
        var attachmentCount = results.response.length;

        //  contentUrl: 'https://cdn.fbsbx.com/v/t59.3654-21/14931650_10154439492671084_6156889271547461632_n.aac/audioclip-1477943008722-4096.aac?oh=9bc5ab0fba4ee79b63e8466b6ab93fcb&oe=58194C96',

        if (attachmentCount == 1) {
            results.response.forEach(function (attachment) {
                console.log("voice data: " + util.inspect(attachment, { showHidden: false, depth: null }));

                let audioURL = attachment.contentUrl;
                //msg.text("attachment data:" + attachment.contentType + " URL:" + attachment.contentUrl);
                let contentType = attachment.contentType; 

                //ensure audio content                
                if (!(
                    S(attachment.contentType).contains("video") ||
                    S(attachment.contentType).contains("audio")
                )) {
                    session.endDialog(gettext("Sorry, that does not seem to be a voice clip...", session));
                } else {
                    logFunnel("", session, funnelSteps.Attempted_Voice_Test + " Attempted_Voice_Test", null, ""); 

                    session.send(gettext("Thanks! This is what I heard.",session));
                    
                    msg.text("");
                    msg.addAttachment(attachment);
                    session.send(msg);
                
                    session.send(gettext("I'll now analyze your voice and give you my assessment of how well you speak English.",session));
                    session.sendTyping();
                
                    //iphone "audio/aac";
                    //androi "video/mp4"
                    let matchPhrase = englishSpeakingPhrase;
                
                    let firstName = "Sean";
                    let lastName = "Blagsvedt";
                    let bjUserId = "BJ10001";

                    var jobSeekerId = getProfileAttribute("jobSeekerId", session);
                    var accessToken = getProfileAttribute("accessToken", session);

    
                
                    if (session.userData.profile) {
                        if (session.userData.profile.firstName) { firstName = session.userData.profile.firstName; };
                        if (session.userData.profile.lastName) { lastName = session.userData.profile.lastName; };
                        if (session.userData.profile.bjUserId) { bjUserId = session.userData.profile.bjUserId; };
                    }

                    console.log("RecordMyVoice session.userData: " + util.inspect(session.userData, { showHidden: false, depth: null }));

                
                    var putData = {
                        firstName: firstName, lastName: lastName, userid: bjUserId, contentUrl: audioURL,
                        contentType: contentType, matchPhrase: matchPhrase,
                        jobSeekerId: jobSeekerId, accessToken: accessToken
                    };
                    
                    console.log("RecordMyVoice putData: " + util.inspect(putData, { showHidden: false, depth: null }));


                    var uri = richDocsDomain + '/api/richdocs';
                    request({
                        uri: uri,
                        method: "POST",
                        timeout: 150000,
                        form: putData,
                    }, function (error, response, body) {
                        if (error) {
                            console.log("Error in RichDocs: ", error);
                            console.log('error:', util.inspect(error, { showHidden: false, depth: null }));
                            console.log('response:', response);
                            console.log('body:', body);
                            handleError("RecordMyVoice", session, error, putData,
                                "Sorry, I had an error while saving your voice clip", uri, body);

                        } else {
                            console.log("Got back richDocs Audio Body" + util.inspect(body, { showHidden: false, depth: null }));
    
                            let richDocObj = JSON.parse(body);
                            console.log("Got back richDocs audio result " + util.inspect(richDocObj, { showHidden: false, depth: null }));
                       
                            if (richDocObj.success) {
                                let summary = richDocObj.document.summary;
                                if (summary != "") {
                                    session.send(summary);
                                    //session.send(gettext("Here's what I think your voice clip says", session) + ": " + summary);
                                }
                                var score = 0;
                                if (richDocObj.voiceClip && richDocObj.voiceClip.bestReco && richDocObj.voiceClip.bestReco.matchScore > 60) {
                                    score = richDocObj.voiceClip.bestReco.matchScore;
                                    session.send(gettext("You've got a great English score and I'll share this with employers", session));
                                    logFunnel("", session, funnelSteps.Scored_60_on_Voice_Test + " Scored_60_on_Voice_Test", null, ""); 

                                } else {
                                    session.send(gettext("Hmmm. I could not understand your English voice clip. Please 'Record my Voice' again to try for a better English score.", session));
                                }
                                session.endDialog();
                            } else {
                                handleError("RecordMyVoice", session, "!richDocObj.success", putData,
                                    gettext("Sorry, I had an error while analyzing your voice", session), uri, body);
                            }
                        }
                    });
                }    
            });
        } else {
            session.endDialog(msg);
        }   
    }
]);
bot.beginDialogAction('RecordMyVoice', '/RecordMyVoice', { matches: /^RecordMyVoice/i });


///////////////////////////////////////////////////////////////
////  JOB SEARCH //////////////////////////////////////////////
///////////////////////////////////////////////////////////////


function jobFactory(jobid, title, employer, salary, locality, city, description, imageURL, URL, jobPostId, userID) {
    let job = {};
    job.jobid = jobid || "";
    job.title = title || "";;
    job.employer = employer || "";;
    job.salary = salary || "";
    job.locality = locality || "";
    job.city = city || "";
    job.description = description || "";
    job.imageURL = imageURL || "";
    job.URL = URL || "";
    job.jobPostId = jobPostId || "";
    job.userID = userID || "";
    return job;
}    

function heroCardJobFactory(session, job) {
    var selectedCity = getProfileAttribute("city", session);
    var subtitle = (job.employer ? job.employer + " " : "") + "₹"
        + job.salary + "/" + gettext("mth", session);
    
    var localityLine = (job.locality ? job.locality : "");
    var cityLine = (job.city != selectedCity ? job.city : "");
    if (localityLine && cityLine) {
        subtitle += " " + localityLine + ", " + cityLine
    } else if (localityLine) {
        subtitle += " " + localityLine;
    } else if (cityLine) {
        subtitle += " " + cityLine;
    }
    
    


    var heroButtons = [];
    if (job.jobid) {
        heroButtons.push(builder.CardAction.openUrl(session, job.URL, gettext("View on Web", session)));
    }
    heroButtons.push(
        builder.CardAction.imBack(session, "apply:" + job.jobPostId, gettext("⭐ Apply", session))
    );    
    
    if (job.imageURL) {
        return new builder.HeroCard(session)
            .title(gettext(job.title,session))
            .subtitle(subtitle)
            .text(job.description)
            .images([
                builder.CardImage.create(session, job.imageURL)
                    .tap(builder.CardAction.openUrl(session, job.URL))
            ])
            .buttons(heroButtons);
    } else {
        return new builder.HeroCard(session)
            .title(gettext(job.title,session))
            .subtitle(subtitle)
            .text(job.description)
            .buttons(heroButtons);
    }
}


function heroCardJobSearchEnd(pageCount,session) {
    return new builder.HeroCard(session)
        //.title
        //Want more? We have lots more matching jobs!
        .text(gettext("For more jobs, tap 🔍 More Jobs or Menu for additional choices.",session))
        //.subtitle(subtitle)
        //.text(job.description)
       // .images([
        //    builder.CardImage.create(session, "https://storage.googleapis.com/babarichdocs/logos/Horizontal_Logo_Large.png")
        //])
        .buttons([
            builder.CardAction.imBack(session, "more:" + pageCount,"🔍 " + gettext("More Jobs", session))
            , builder.CardAction.imBack(session, "menu", "🏠 " + gettext("Menu", session))
        ]);
}

var staticJobs = [];
staticJobs.push(jobFactory(2146685046, "Commercial Car Driver Cum Owner", "UBER", "45000", "Agara", "Bangalore",
    "The driver should have DL , Yellow badge commercial license with Police Clearance Certificate.",
    "http://www.babajob.com/services/getimage.aspx?id=775814&width=160",
    "http://www.babajob.com/Job-Commercialcardrivercumowner-For-Uber_India_Systems-in-Bangalore-Near-Koramangala(560034)-2146685046",
    "fooJobPostId1"));

staticJobs.push(jobFactory(2146286950, "Yellow Badge Drivers For Airport", "Sanjeev", "15000", "RT Nagar", "Bangalore",
    "Movement of Passenger, Cargo, Baggage &amp; Looking for drivers to work within Airport premises.",
    null,
    "http://www.babajob.com/Job-YellowBadgeDriversForAirport-for-Sanjeev_-in-Bangalore-near-RT_Nagar(560032)-2146286950",
    "fooJobPostId2"));

/*
function addJobToProfileData(job, session)
{
    if (job) {
        if (session.userData.profile && !session.userData.profile.jobs) {
            session.userData.profile.jobs = {};
        }

        if (!session.userData.profile.jobs[job.jobPostId]) {
            session.userData.profile.jobs[job.jobPostId] = job;
        }
    }
}

function getJobFromProfileData(jobPostId, session) {
    var job = null;
    if (jobPostId && session.userData.profile && session.userData.profile.jobs) {
        if (session.userData.profile.jobs[jobPostId]) {
            job = session.userData.profile.jobs[jobPostId];
        }
    }
    return job;
}
*/

bot.dialog('/renderJobs', [
    function (session, args, next) {
        session.sendTyping();
        
        var jobsWrapper;
        var jobs;
        var totalCount;
        if (args == null) {
            jobs = staticJobs;
        } else {
            jobs = args.jobs;
            totalCount = args.totalCount;
        }
        if (!session.dialogData.jobs) {
            session.dialogData.jobs = {};
        }

        var city = getProfileAttribute("city", session);

        var cat = getLocalizedCategoryText(
            getProfileAttribute("category", session), session);
        
        
        //I've found 39 Bangalore Driver jobs for you.
        session.send(gettext("I've found", session) + (totalCount ? " " + totalCount : "")
            + (cat ? " " + cat : "") +
            " " + gettext("jobs in", session) + " " + city + "."
            + " " + gettext("Apply to those you like", session) + "!");

        
        var heroCards = [];
        var applyCommands = [];
        var maxJobs = 5;
        var iStart = jobs.length - maxJobs;
        if (iStart < 0) { 
            iStart = 0;
        }
        for (var i = iStart; i < jobs.length; i++) {
            var job = jobs[i];

            heroCards.push(heroCardJobFactory(session, job));
            applyCommands.push("apply:" + job.jobPostId);
            if (!session.dialogData.jobs[job.jobPostId]) {
                session.dialogData.jobs[job.jobPostId] = job;
            }
        }

        //Add in last card to get more jobs... 
        var pageCount = jobs.length + maxJobs;
        session.dialogData.pageCount = pageCount;
        console.log("renderJobs:pageCount: ", pageCount); 
        

        heroCards.push(heroCardJobSearchEnd(pageCount, session));
        applyCommands.push("more:" + pageCount);
        applyCommands.push("menu:");
        

        var promptCommands = applyCommands.join("|");

        var msg = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments(heroCards);

        var promptOptions = {};
        promptOptions.maxRetries = 0;
        builder.Prompts.choice(session, msg, promptCommands,promptOptions);

        /*
        var heroCards = [];
        var applyCommands = [];
        for (var i = 0; i < jobs.length; i++) {
            heroCards.push(heroCardJobFactory(session, jobs[i]));
            //applyCommands.push(jobs[i].jobid + ":" + jobs[i].title);
            applyCommands.push("apply:" + jobs[i].jobid);
        
        }

        var promptCommands = applyCommands.join("|");

        var msg = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments(heroCards);

        
        builder.Prompts.choice(session, msg, promptCommands);
        */
  
        /*
        var msg = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                    .title("Commercial Car Driver Cum Owner")
                    .subtitle("UBER | ₹45000/" + gettext("month", session) + " |  Agara, Bangalore")
                    .text("The driver should have DL , Yellow badge commercial license with Police Clearance Certificate. Other required documents are Passbook,Insurance, Permit, RC, Tax receipt and Fitness Certificate( If applicable)")
                    .images([
                        builder.CardImage.create(session, "http://www.babajob.com/services/getimage.aspx?id=775814&width=160")
                            .tap(builder.CardAction.openUrl(session, "http://www.babajob.com/Job-Commercialcardrivercumowner-For-Uber_India_Systems-in-Bangalore-Near-Koramangala(560034)-2146685046")),
                    ])
                    .buttons([
                        builder.CardAction.openUrl(session, "http://www.babajob.com/Job-Commercialcardrivercumowner-For-Uber_India_Systems-in-Bangalore-Near-Koramangala(560034)-2146685046", gettext("View on Web", session)),
                        builder.CardAction.imBack(session, "apply:2146685046", gettext("⭐ Apply", session))
                    ])
                ,
                new builder.HeroCard(session)
                    .title("Yellow Badge Drivers For Airport")
                    .subtitle("Sanjeev | ₹15000/" + gettext("month", session) + " | RT Nagar, Bangalore")
                    .text("Movement of Passenger, Cargo, Baggage &amp; Looking for drivers to work within Airport premises. Driver should have Commercial badge and also HMV drivers preferred.")
                    .buttons([
                        builder.CardAction.openUrl(session, "http://www.babajob.com/Job-YellowBadgeDriversForAirport-for-Sanjeev_-in-Bangalore-near-RT_Nagar(560032)-2146286950", gettext("View on Web", session) ),
                        builder.CardAction.imBack(session, "apply:2146286950", gettext("⭐ Apply", session))
                    ])
            ]);
        builder.Prompts.choice(session, msg, "2146685046:title|2146286950:title");
        */

    },

    //process application response
    function (session, results, next) {
        var action, param, jobPostId, pageCount;
        pageCount = session.dialogData.pageCount;
         console.log("/renderJObs pageCount " + pageCount);
       

        console.log("/renderJobs apply or more entity: " + util.inspect(results.response,
            { showHidden: false, depth: null }));
        
        if (results.response && results.response.entity) {
            console.log("processsing job list response..");
            util.inspect(results.response);

            var kvPair = results.response.entity.split(':');
            action = kvPair[0];
            param = kvPair[1];
            if (action == 'apply') {
                jobPostId = param;
               
                var appliedJob = session.dialogData.jobs[jobPostId];
                if (appliedJob) {     
                    session.beginDialog("/startJobApplyProcess", appliedJob);
                } else {
                    handleError("renderJobs:apply", session, "", "jobPostId:" + jobPostId,
                        "While you were applying, I could not find the job:" + jobPostId);
                }
            } else if (action == 'more') {                
                session.replaceDialog("/SearchJobs", pageCount);
            }
            else if (action == 'menu') {
                session.replaceDialog("/menu");
            }
        } else {
            //unknown response
            action = session.message.text;
            var lowerAction = S(action).toLowerCase().s;

            console.log("/renderJobs unknown response last message: " + lowerAction);
            if (S(lowerAction).contains('more')) {
                session.replaceDialog("/SearchJobs", pageCount);
            }
            else if (S(lowerAction).contains('menu')) {
                session.replaceDialog("/menu");
            } else {
                session.send(gettext("Sorry, I could not understand you.", session));
                session.replaceDialog("/menu");
             //   session.replaceDialog("/generalParser", action);
            }
        }
    },
    function (session, results,next) {
        session.endDialog();
    }
]);

bot.dialog("/startJobApplyProcess", [
    function (session, args, next) {

        //log funnel step            
        logFunnel("", session, funnelSteps.Applied_for_a_Job + " Applied_for_a_Job", null, "");
        

        var appliedJobFromSearch;
        var jobId;
        var jobPostId;

        if (args) {
            appliedJobFromSearch = args;
            session.dialogData.appliedJob = appliedJobFromSearch;
            if (appliedJobFromSearch.jobId) {
                jobId = appliedJobFromSearch.jobId;
            }
            if (appliedJobFromSearch.jobPostId) {
                jobPostId = appliedJobFromSearch.jobPostId;
            }

            //push the job to the application queueAppliedJobs           
            pushJobToQueueApplications(appliedJobFromSearch, session);
        }

        var bjUserId = getProfileAttribute("bjUserId", session);
        var jobSeekerId = getProfileAttribute("jobSeekerId", session);
        var accessToken = getProfileAttribute("accessToken", session);

        
        //check if logged in...        
        if (!accessToken) {
            session.send(gettext("Cool. I need to ask you a few more simple questions before I can send your application.", session));
            session.beginDialog("/askForBabajobMobile");
        } else {
            session.send(gettext("Starting your application...", session));
            next();
        }        
    },
  
    //check for verified mobile...
    function (session, results, next) {
        var mobileVerified = getProfileAttribute("mobileVerified", session);
        if (!mobileVerified) {
            //ask them to verify their mobile...
            var msg = gettext("Next I need to verify your mobile number.", session);
            session.send(msg);
            session.beginDialog('/askForMobileOTP');
        } else {
            //jump to next step if mobile is verified...
            next(results);
        }
    },
    
    function (session, results, next) {
        session.beginDialog("/applyToQueuedJobs");
    },
    function (session, results,next) {
        session.endDialog();
    }
]);

bot.dialog("/askForMobileOTP", [
    function (session, args, next) {
        
        var fakeNum = "08012345678";
        var myText = gettext("Please send me the 4-digit OTP I just SMS'd you.", session) +
            "\n" + gettext("Or miss call 08012345678 and then reply with 'I called'", session);

        myText = S(myText).replaceAll(fakeNum, missedCallNumber).s;
        
        builder.Prompts.text(session,
            myText);
        
    },
    function (session, results, next) {
        //recheck via API 
        if (results.response) {

            //separate this into a different function...
            var reco = parseForOTP(results.response);
            if (reco.entities.length > 0) {
                var otp = reco.entities[0].entity;
                session.beginDialog('/postMobileOTP', otp);
            }
            else {
                //did not get back 4 digit... so check to see if they called...
                session.beginDialog('/checkIfMobileVerified');
            }
        }
    },
    function (session, results,next) {
        session.endDialog();
    }
]);
bot.beginDialogAction('otp', '/askForMobileOTP', { matches: /^otp/i });

bot.dialog("/postMobileOTP", [
    function (session, args, next) {
        var otp;
        if (args) {
            otp = args;
            verifyOTPWithBJ(otp, session,
                function (err, statusCode) {
                    if (err) {
                        handleError("askForMobileOTP", session,
                            err, "otp:" + otp, "Error while saving your otp",
                            "", "");
                    } else {
                        //need to update mobileVerified status...
                        console.log("askForMobileOTP"
                            , util.inspect(statusCode, { showHidden: false, depth: null }));
                            
                        session.beginDialog("/checkIfMobileVerified");

                        //if now verified
                        //now apply for any queued applied jobs...
                        //applyToQueuedJobs(session);

                        //session.endDialog();
                    }
                });
        } else {
            handleError("postOTP", session, "args was null", args, "No OTP was provided");
        }
    },
    function (session, results,next) {
        session.endDialog();
    }
]);


function verifyOTPWithBJ(otp, session, callback) {
    var bjUserId = getProfileAttribute("bjUserId", session);
    var accessToken = getProfileAttribute("accessToken", session);
    
    if (!bjUserId) { // if no babajob id, then we have nothing to update...
        handleError("updateMobileOTPToBJ", session, "missing params:",
            "bjUserId" + bjUserId
            , "missing parameters for updateMobileOTPToBJ:"
        );
    }
    else if (!accessToken) {
        handleError("updateMobileOTPToBJ", session, "missing params:",
            + " accessToken:" + accessToken,
             "missing parameters for updateMobileOTPToBJ:"
        );
    } else {
        var uri = bjAPIDomain + "/v2/authentication/otp/verify";
        var putData = {
            //userId: bjUserId,
            otp: otp,
            contactInformationType: "MobileNumber"
        }
        request({
            uri: uri,
            method: "POST",
            accept: "application/json",
            contentType: "application/json",
            headers: {
                    'Authorization': accessToken,
                    'consumer-key': consumerKey,
                },
            timeout: 10000,
            json: putData
        }, function (error, response, body) {
            if (error) {
                callback(error, null);
            } else {
                try {
                    logWarning("updateMobileOTPToBJ", session,"uri:" + uri + " body:" + body, putData);
                    console.log("accessToken:", accessToken);
                    
                    if (response.statusCode == 403) {
                        //the code was likely wrong
                        callback(null, response.statusCode);
                    } else if (response.statusCode == 200) {
                        //the code was accepted...
                        callback(null, response.statusCode);
                    } else {
                        callback("verifyOTPWithBJ: unknown response code:" + response.statusCode);
                        //handleError("updateMobileOTPToBJ", session, "unknown response code:" +
                        //    response.statusCode, putData, "Error while trying to verify your OTP", uri, response);
                    }
                }
                catch (e) {
                    callback(e, null);
                }
            }
        }
        );
    }
}    


bot.dialog('/checkIfMobileVerified', [
    function (session, args, next) {
        session.beginDialog('/getBJSeekerData');
    },
    function (session, results, next) {
        var mobileVerified = getProfileAttribute("mobileVerified", session);
        var msg;
        if (mobileVerified) {
            msg = gettext("Thanks! Your mobile is now verified.", session);
            session.send(msg);
            session.beginDialog("/applyToQueuedJobs");
        } else {
            msg = gettext("Sorry your mobile does not seem to be verified yet. Please try again.", session);
            session.send(msg);

            var foundIntent = false;
            if (foundIntent) {
                //TODO: Intent check if the last message is something we should
                session.endDialog();
            } else {
                session.beginDialog("/askForMobileOTP");
            }
        }
    },
    function (session, results,next) {
        session.endDialog();
    }
]);



                


bot.dialog('/askQsForJob', [
    function (session, args, next) {
        console.log("askQsForJob...");
        if (args) {
            session.dialogData.fullAppliedJob = args;
            next();
        } else {
            handleError("askQsForJob", session, "args was null",args,"No job passed in the AskJobQs"
            );
        }
    },
    //check for aboutMe
    function (session, results, next) {
        var aboutMe = getProfileAttribute("aboutMe", session);
        if (aboutMe && (aboutMe != "I called babajob")
        ) {
            next();
        } else {
            session.beginDialog("/askAboutMe");
        }    
    },

    //check for experience...
    function (session, results, next) {
        var exp = getProfileAttribute("experience", session);
        if (exp && exp > -1)
        {
            next();
        } else {
            //session.beginDialog("/askExperience");
             next();
        }    
    },
    
    //TODO: check for answers...
    function (session, results, next) {
        if (session.dialogData.fullAppliedJob && session.dialogData.fullAppliedJob.answers) {
           // console.log("start askQsForJob" , util.inspect(appliedJob.answers, { showHidden: false, depth: null }));
        }
        session.endDialog();
    }
]);

////////////////////////////////////////////////////////////////
//  BABAJOB API CALLS //////////////////////////////////////////
////////////////////////////////////////////////////////////////


//Get http://preprodapi.babajob.com/v2/authentication/users?facebookId=704336083
//See if I have any existing users with this FB ID. 

bot.dialog('/checkForExisitingFBIdOnBabajob', [
    function (session, args) {
        var fbID = getProfileAttribute("facebookId", session);

        fbID = "704336083";
        // 704336083// sean's on BJ
        // "905716556224705"; 
        //10153157437126084 //sean's according to FB graph

        console.log("checkForExisitingFBIdOnBabajob:", fbID);

        var bjUserId = null;
        var accessToken = null;

        session.sendTyping();
        var uri = bjAPIDomain + "/v2/authentication/users?facebookId=" + fbID;
        request({
            uri: uri,
            method: "GET",
            timeout: 20000,
            accept: "application/json",
            contentType: "application/json",
            headers: {
                'consumer-key': consumerKey,
            }
            
        }, function (error, response, body) {
            if (error) {                
                handleError("checkForExisitingFBIdOnBabajob", session, error, fbID,
                    "I had an error while looking up your Facebook ID on babajob", uri, body
                );
        
            } else {


                /*
                //Success
                //No header yet...
                {
                "userId": "10001",
                "role": "EMPLOYER"
                }
                //failure
                "No resource of type User found with mobile number 7043360836 "

                                console.log("Got back BJ API Body: " + util.inspect(body, { showHidden: false, depth: null }));
                                console.log('responseaccess-token:', response.headers["access-token"]);
                                console.log("responseaccess-token: " + util.inspect(response.headers["access-token"], { showHidden: false, depth: null }));                
                                
                */
                
                if (response.headers["access-token"]) {
                    //access-token
                    accessToken = response.headers["access-token"];
                    session.userData.profile.accessToken = accessToken;
                
                    let userObj;
                    try {
                        userObj = body;
                    } catch (e) {
                        console.log("exception while parsing JSON:", e);
                    }

                    if (!userObj || !userObj.userId || !userObj.role) {
                        handleError("checkForExisitingFBIdOnBabajob", session, "Sorry, I got back an access token but no userid", fbID,
                            "I had an error while looking up your Facebook ID on babajob", uri, body
                        );

                    } else {
                    
                        console.log("Got back bjAPI response result " + util.inspect(userObj, { showHidden: false, depth: null }));

                        setProfileAttribute("bjUserId", bjUserId, session);
                        setProfileAttribute("role", userObj.role, session);
                        
                        //Hmm if we had the access token, we'd now get more data
                        //now get more data about them depending on role.
                        if (userObj.role == "JOBSEEKER") {
                            session.beginDialog("/getBJSeekerData");
                        } else {
                            session.send(gettext(
                                "You seem to be an employer on Bababjob", session) + "." +
                                gettext("At this time I can only chat with job seekers but you can reply with delete to start over.", session));
                            session.send(
                                gettext("If you are hiring, please visit http://babajob.com/hire or call +918880006666 and a real person would love to help you.", session));
 
                        }
                    }
                }
                //the fbID is not on our system and there's no access token...
                else {
                    //I could not find their fbID on Babajob, so start the process to ask them if they already registered with us.
                    session.send("Hmm. I could find not your FBID on Babajob.");
                    session.beginDialog("/alreadyOnBabajob");
                }
            }
        });
    },
    function (session, results,next) {
        session.endDialog();
    }
]);
bot.beginDialogAction('checkfb', '/checkForExisitingFBIdOnBabajob', { matches: /^checkfb/i });



//Sign Into Babajob with a Mobile
bot.dialog('/signIntoBabajobWithMobile', [
    function (session, args) {
        //random user...
        //Praveen
        //7373052612
        //3179019
        var mobile = "7373052612";
        if (args != null) {
            mobile = "" + args;
        }

        
        var role = getProfileAttribute("role", session);        
        console.log("signIntoBabajobWithMobile role:", role);

        //session.send(gettext("Great.", session) + gettext("I'm now looking you up...", session));
        //session.sendTyping();
        console.log("signIntoBabajobWithMobile:", mobile);
        //session.send("signIntoBabajobWithMobile:" + mobile);

        var bjUserId = null;
        var accessToken = null;

        session.sendTyping();
        var putData = {
            "userName": mobile,
            "serviceUserName": "ivr@babajob.com",
            "password": "ivr@123",
            "loginType": "ServiceAccount"
        };
        var uri = bjAPIDomain + '/v2/authentication/login';
        request({
            uri: uri,
            method: "POST",
            timeout: 20000,
            accept: "application/json",
            contentType: "application/json",
            headers: {
                'consumer-key': consumerKey,
            },
            json: putData
        }, function (error, response, body) {
            if (error) {
                handleError("signIntoBabajobWithMobile", session, error, putData,
                    "Sorry, I had an error in signIntoBabajobWithMobile connecting to the BabajobAPI", uri, body
                );
            } else {
                /*
                     In header:
                     Access-Token:  refresh-Token:
                  
          {
          "userID": "7916837"
          "profileID": "7916837"
          "role": "JOBSEEKER"
          "lastVisitedOn": "2016-10-07T16:18:28.443+05:30"
          }
          */

                console.log("signIntoBabajobWithMobile  Body: " + util.inspect(body, { showHidden: false, depth: null }));
                console.log('responseaccess-token:', response.headers["access-token"]);
                console.log("responseaccess-token: " + util.inspect(response.headers["access-token"], { showHidden: false, depth: null }));
                
                let userObj;
                try {
                    //userObj = JSON.parse(body);
                    userObj = body;
                } catch (e) {
                    handleError("signIntoBabajobWithMobile", session, e, null,
                        "exception while parsing JSON", uri, body
                    );
                }
                
                if (response.headers["access-token"]) {
                    //access-token
                    accessToken = response.headers["access-token"];
                    setProfileAttribute("accessToken", accessToken, session);
                
                    if (!userObj || !userObj.userID) {
                        //this should not happen
                        handleError("signIntoBabajobWithMobile", session, "Sorry, I got back an access token but no userid", null,
                            "I had an error while looking up your mobile on babajob", uri, body
                        );
                    } else {
                        
                        //log funnel step
                        logFunnel("", session, funnelSteps.Added_Mobile + " Added_Mobile", null, "");

                    
                        console.log("Got back bjAPI response result " + util.inspect(userObj, { showHidden: false, depth: null }));
                     
                        bjUserId = userObj.userID;
                        setProfileAttribute("bjUserId", bjUserId, session);
                        setProfileAttribute("role", userObj.role, session);
                        
                        // update the profile with the new mobile...
                        setProfileAttribute("mobile", mobile, session);

                        
                        //now get more data about them depending on role.
                        if (userObj.role == "JOBSEEKER") {
                            try {
                                session.beginDialog("/getBJSeekerData");
                            } 
                            catch (e) {
                                handleError("signIntoBabajobWithMobile", session,"Sorry, I'm in a loop and I could not log you in. ", null,
                                    "Sorry, I'm in a loop and I could not log you in. ", uri, body);
                            }
                        } else {
                            session.send("You seem to be an employer on Bababjob. Unfortunately, at this time I don't support employers in chat. Send back a different mobile or delete to start over.");
                            session.beginDialog("/askForBabajobMobile");

                        }
                    }
                }
                //the mobile is not on our system and there's no access token...
                else {
                    
                    if (userObj && userObj.statusCode && userObj.statusCode == 400) {
                        //Got back BJ API Body: { statusCode: 400, body: 'Mobile number is invalid' }
                        var errorText = mobile + " " + gettext("does not appear to be a valid Indian mobile number. Please enter another or text back 'goodbye'", session);
                        session.send(errorText);
                        session.replaceDialog("/askForBabajobMobile");
                    } else {
                        //response.statusCode == 401 is the default state for unknown numbers
                        //I could not find their mobile on Babajob, so start the signup process...
                        console.log("About to create seeker session.userData" + util.inspect(session.userData, { showHidden: false, depth: null }));
                    
                        if (role == "JOBSEEKER"
                           // && profileSufficientToCreateBabajobUser(role, session)
                        ) {
                            session.beginDialog("/createBabajobUserWithMobile", mobile);
                        } else {
                            handleError("signIntoBabajobWithMobile", session, "Bad role or name before creating user",
                                putData,
                                "Could not start createBabajobUserWithMobile. Role is wrong or insufficient profile data (firstName, lastLast or Mobile)", uri, body
                            );
                        }
                    }
                
                }
            }
        });
    },
    function (session, results,next) {
        session.endDialog();
    }
]);



//http://edge-linux.babajob.com/v2/jobseekers/?userId=12134
//Assuming I have a jobSeekerId, get their profile
bot.dialog('/getBJSeekerData', [
    function (session, args) {
        //session.send("I'm now getting your Babajob profile...");
        session.sendTyping();

        checkValidUserDataProfile(session);
        
        //http://edge-linux.babajob.com/v2/jobseekers/?userId=12134

        //var bjlinuxAPIDomain = "http://edge-linux.babajob.com/v2/";
        var uri = bjAPIDomain + '/v2/jobseekers/?userId=' + session.userData.profile.bjUserId;  //check to ensure...

        if (!(session.userData.profile.bjUserId && session.userData.profile.accessToken)) {
            handleError("getBJSeekerData", session, "You don't have a BJ auth key yet...", null,
                "I could not find your babajob userid or accesstoken. Please reply with delete to start over.", uri, body, true
            );
            
        } else {

            request({
                uri: uri,
                method: "GET",
                timeout: 20000,
                accept: "application/json",
                contentType: "application/json",
            
                headers: {
                    'Authorization': session.userData.profile.accessToken,
                    'consumer-key': consumerKey,
                }
                
            }, function (error, response, body) {
                if (error) {
                    handleError("getBJSeekerData", session, error, null,
                        "I could not look up your data on babajob", uri, body
                    );
                } else {
                    console.log("Got back BJ Mongo without formating: " + body);
                    console.log("Got back BJ Mongo: " + util.inspect(body, { showHidden: false, depth: null }));
    
                    if (body.indexOf("not found") > 0) {
                        //this user is not a job seeker...
                        handleError("getBJSeekerData", session, "not a job seeker", null,
                            "You seem to be an employer and I could not look up your data.", uri, body, true
                        );
                    } else {
                        let seekerObj;
                        try {
                            seekerObj = JSON.parse(body);
                            console.log("Trying to parse getBJSeekerData seekerObj: " + util.inspect(seekerObj, { showHidden: false, depth: null }));
    
                            //seekerObj = body;
                        } catch (e) {
                            handleError("getBJSeekerData", session, e, null,
                                "Problem parsing your babajob data...", uri, body
                            );
                        }

                        if (!seekerObj) {
                            handleError("getBJSeekerData", session, "!seekerObj", null,
                                "Problem parsing your babajob data...", uri, body
                            );
                        
                        } else {
                            console.log("jobSeekerId[] was " + seekerObj["jobSeekerId"]);
                        
                            setProfileAttribute("jobSeekerId", seekerObj["jobSeekerId"], session);
      
                            //Parse the Profile and if needed update the gender and photo if there is none...
                            setBJSeekerDataToProfile(seekerObj, session);
                            
                            //log funnel step
                            logFunnel("", session, funnelSteps.Got_Provisioned_with_BJ_UserID + " Got_Provisioned_with_BJ_UserID", null, "");
                        
                            //update last signin to work around Mongo sync issue...    
                            updateLastLogin(session);
                        }
                        session.endDialog();
                    }
                }
            })
        }
    }
]);
bot.beginDialogAction('getdata', '/getBJSeekerData', { matches: /^testjobs/i });



//updates the LastLogin and called after successful mobile login...
function updateLastLogin(session) {

    var bjUserId = getProfileAttribute("bjUserId", session);
    var jobSeekerId = getProfileAttribute("jobSeekerId", session);
    var accessToken = getProfileAttribute("accessToken", session);


    if (!(bjUserId)) {
        handleError("updateLastLogin", session, "bjUserId was null","");
    } else if (!jobSeekerId) {
        handleError("updateLastLogin", session, "jobSeekerId was null", property + ':' + value);
    } else if (!accessToken) {
        handleError("updateLastLogin", session, "accessToken was null", property + ':' + value);
    }

    var now = new Date();
    var data = { "user": { "lastSignIn": now } };

    var uri = bjAPIDomain + "/v2/jobseekers/" + jobSeekerId;
    request({
        uri: uri,
        method: "POST",
        timeout: 30000,
        accept: "application/json",
        contentType: "application/json",
        headers: {
            'Authorization': accessToken,
            'consumer-key': consumerKey,
        },
        json: data
    }, function (error, response, body) {
        if (error) {
            handleError("updateLastLogin", session, error, data,
                "Sorry, I failed to update your last login on Babajob."
                , uri, body);
        } else {
            let seekerObj;
            try {
                seekerObj = body;
                console.log("Got response on updateLastLogin");
                console.log(util.inspect(data));
                console.log(util.inspect(body));
                if (S(body).contains("Error")) {
                    logWarning("updateLastLogin", session, body, data);
                } else {
                    console.log("Saved new updateLastLogin");
                }
            } catch (e) {
                handleError("updateLastLogin", session, e, data,
                    "exception while parsing JSON:"
                    , uri, body);
            }
        }
    }
    );
}

////////////////////////////////////////////////////////
/// CREATE BABABJOB USER ///////////////////////////////
////////////////////////////////////////////////////////

//CREATE USER ON BABAJOB
//mobile as param
bot.dialog('/createBabajobUserWithMobile', [
    function (session, args) {
        checkValidUserDataProfile(session);
        
        var profile = {};
        //profile.mobile = "7373052699"; //new mobile.  "7373052612";  //existing mobile
        //profile.firstName = "Test";
        //profile.lastName = "FacebookChatUser";
        //profile.facebookId = "905716556224705"; //sean's

        var mobile;        
        if (args) {
            mobile = args;
        }
        
        profile = session.userData.profile;

        if (!profile.password) {
            profile.password = "1234"; //dumb... should be OTP.
        }
        
        //session.send("I'm reating your profile on Babajob...");
        session.sendTyping();
        console.log("createBabajobUser:", profile.facebookId);

        var newUserData =
            {
                "user":
                {
                    "name":
                    {
                        "firstName": profile.firstName || "Mobile",
                        "lastName": profile.lastName || ""
                    },
                    "password": profile.password,
                    "contactDetails": [
                        {
                            "contactType": 2,
                            "value": mobile,
                            "isVerified": false
                        }
                    ]
                    //currently, must be done as a separate call...
                    //,"facebookId": profile.facebookId
                },
                "analyticsParameters": {
                    "channel": "Chatbot"
                }
            };


        var bjUserId = null;
        var accessToken = null;

        console.log("newUserData: " + util.inspect(newUserData, { showHidden: false, depth: null }));
        var uri = bjAPIDomain + "/v2/jobseekers/";
        request({
            uri: uri,
            method: "POST",
            timeout: 45000,
            accept: "application/json",
            contentType: "application/json",
            headers: {
                'consumer-key': consumerKey,
            },
            json: newUserData
            /*
            json: {
                "serviceUserName": "ivr@babajob.com",
                "password": "ivr@123",
                "loginType": "ServiceAccount"
            },
            */
        }, function (error, response, body) {
            if (error) {
                handleError("createBabajobUserWithMobile", session, error, newUserData,
                    "Error while trying to create a new user on Babajob", uri, body
                );
            } else {
                /*
                     In header: 
                     Access-Token:  

                { modifiedOn: '2016-11-02T06:21:32.708Z',
  createdOn: '2016-11-02T06:21:32.708Z',
  status: 0,
  user:
   { createdBy: '8084732',
     lastSignIn: '2016-11-02T06:21:54.266Z',
     userID: 8084732,
     isDeleted: false,
     role: 2,
     contactDetails: [ { contactType: 2, value: '7373052699', isVerified: false } ],

          */

                console.log("createBabajobUserWithMobile Body: " + util.inspect(body, { showHidden: false, depth: null }));
                console.log('responseaccess-token:', response.headers["access-token"]);
                console.log("responseaccess-token: " + util.inspect(response.headers["access-token"], { showHidden: false, depth: null }));
                
                if (response.headers["access-token"] && response.headers["access-token"] != undefined) {
                    console.log("got access token...");
                    
                    accessToken = response.headers["access-token"];
                    session.userData.profile.accessToken = accessToken;

                    console.log("new create profile check" + util.inspect(profile, { showHidden: false, depth: null }));
                    
                    
                
                    let userObj;
                    try {
                        //userObj = JSON.parse(body);
                        userObj = body.user;
                    } catch (e) {
                        console.log("exception while parsing JSON:", e);
                    }

                    console.log("Parsing returned new user " + util.inspect(userObj, { showHidden: false, depth: null }));
                                   
                    if (!userObj || !userObj.userID) {
                        //this should not happen
                        handleError("createBabajobUserWithMobile", session, "!userObj || !userObj.userID", newUserData,
                            "Sorry, I got back an access token but no userid", uri, body
                        );
                    } else {

                        // update the profile with the new mobile...
                        setProfileAttribute("mobile", mobile, session);

                    
                        console.log("Got back bjAPI response result " + util.inspect(userObj, { showHidden: false, depth: null }));
                        userObj.role = "JOBSEEKER"; //userObj.role;

                        updateProfileDataFromBabajob(userObj, session);                        
                        console.log("Got Back userid: " + userObj.userID + " and saved:" + session.userData.profile.bjUserId);

                        
                        //Save the FB ID as well...
                        var fbId = getProfileAttribute("facebookId", session);
                        if (fbId) {
                            updateFacebookIdOnBabajob(fbId, session);
                        }

                        //after save go to menu...
                        console.log("profile after creation... " + util.inspect(session.userData.profile, { showHidden: false, depth: null }));
                        //session.send(gettext("You seem to be new to Babajob, so I'll ask you a few questions to get started.",session));
                        session.beginDialog('/getBJSeekerData');
                        //session.endDialog();
                        
                    }
                }
                //I did not get back an access token
                else
                {
                    

                    //the mobile already exists on Babajob... I should associate this number...
                    if (body && body.statusCode == 403) {
                        //I found your number already
                        session.send("This number is already registered on Babajob. I'll now get your profile...");
                        session.beginDialog("/signIntoBabajobWithMobile", mobile);
                    } else if (body && body.statusCode == 400) {
                        //{ statusCode: 400, body: 'Mobile number is invalid' }
                        session.send(gettext("Hmm...") + " 📱 " + mobile + " " +
                            gettext("does not appear to be a valid Indian mobile number. Please enter another or text back 'goodbye'")
                            , session);
                        session.replaceDialog("/askForBabajobMobile");
                        
                    } else {
                         handleError("createBabajobUserWithMobile", session, "no access token", newUserData,
                           "I was trying to create you on babajob but I had an error:" + body, uri, body
                        );

                        //console.log("Exception createUser: " + util.inspect(body, { showHidden: false, depth: null }));
       
                        //session.send(+ body);
                        //session.endDialog();
                    }
                }
            }
        });
    },
    function (session, results,next) {
        session.endDialog();
    }
]);
bot.beginDialogAction('create', '/createBabajobUserWithMobile', { matches: /^create/i });

function updateProfileDataFromBabajob(userObj, session) {
    checkValidUserDataProfile(session);
    session.userData.profile.bjUserId = userObj.userID;
    session.userData.profile.role = userObj.role;
    session.userData.profile.jobSeekerId = userObj.jobSeekerId;

    
    //contactDetails: [ { contactType: 2, value: '7373052699', isVerified: false } ],
    var contactDetailsArray = userObj.contactDetails;

    updateContactDetails(contactDetailsArray, session);
}

function updateContactDetails(contactDetailsArray, session) {
    checkValidUserDataProfile(session);
    var mobileContactInfo;
    for (var i = 0; i < contactDetailsArray.length; i++) {
        var contactInfo = contactDetailsArray[i];
        if (contactInfo.contactType == 2) {
            mobileContactInfo = contactInfo;
        }
    }

    if (mobileContactInfo) {
        session.userData.profile.mobileContactInfo = mobileContactInfo;

        session.userData.profile.mobile = mobileContactInfo.value;
        session.userData.profile.mobileVerified = (mobileContactInfo.isVerified ? mobileContactInfo.value : null);
    }

    console.log("updateProfileDataFromBabajob mobileContactInfo"
        , util.inspect(mobileContactInfo, { showHidden: false, depth: null }));
    
    var mobileVerified = getProfileAttribute("mobileVerified", session);
    console.log("mobileVerified ", mobileVerified);    
}


//After getting Data from Babajob about the user, save that that data to the session
//userData.profile. Once that is done, update Babajob with any data we don't have from facebook 
//E.g. Name, gender, profile_pic, category, city
function setBJSeekerDataToProfile(seeker, session) {

    var missingAttributesToPullFromProfile = [];
    
    //TODO: Remove this given it will always overwrite our photo
    //missingAttributesToPullFromFB.push("profile_pic");

    try {
        if (seeker) {
            //name
            if (seeker.user && seeker.user.name) {
                if (!seeker.user.name.firstName
                    || seeker.user.name.firstName == ''
                    || seeker.user.name.firstName == 'Mobile')
                {
                    missingAttributesToPullFromProfile.push("name");
                    missingAttributesToPullFromProfile.push("firstName");
                    missingAttributesToPullFromProfile.push("lastName");
                } else {
                    setProfileAttribute("firstName", seeker.user.name.firstName, session);
                    if (seeker.user.name.lastName) {
                        setProfileAttribute("lastName", seeker.user.name.lastName, session);
                    }
                    setProfileAttribute("name", seeker.user.name.firstName + " " + 
                    seeker.user.name.lastName, session);
                }
            }

            if (seeker.user) {
                //mobile and verification data
                if (seeker.user.contactDetails) {
                    updateContactDetails(seeker.user.contactDetails, session);
                }

                //aboutMe
                if (seeker.user.aboutMe) {
                    setProfileAttribute("aboutMe", seeker.user.aboutMe, session);
                }
            }

        
            if (seeker.profile) {
                //gender
                var genderArray = seeker.profile.filter(function (i) {
                    return i.attributeName == 'Gender';
                });
                if (genderArray && genderArray.length > 0) {
                    var genderValue = genderArray[0].value.value.toLowerCase();
                    setProfileAttribute("gender", genderValue, session);
                } else {
                    missingAttributesToPullFromProfile.push("gender");
                }

                //city   
                var cityArray = seeker.profile.filter(function (i) {
                    return i.attributeName == 'Location';
                });
                if (cityArray && cityArray.length > 0) {
                    var cityValue = cityArray[0].value.locality;
                    setProfileAttribute("city", cityValue, session);
                    setProfileAttribute("cityPrecise", cityArray[0].value, session);
                } else {
                    //missingAttributesToPullFromProfile.push("city");
                    missingAttributesToPullFromProfile.push("cityPrecise");
                }
            
                //profile_pic
                var picArray = seeker.profile.filter(function (i) {
                    return i.attributeName == 'ProfilePic';
                });

                //check for deafult pic and update if needed...                
                var defaultPicUrl = "services/getimage.aspx?id=15";
                if (picArray && picArray.length > 0
                && picArray[0].value.uploaded != defaultPicUrl) {
                    var picValue = picArray[0].value.uploaded;
                    setProfileAttribute("profile_pic", picValue, session);
                } else {
                    missingAttributesToPullFromProfile.push("profile_pic");
                }

                //age
                var ageArray = seeker.profile.filter(function (i) {
                    return i.attributeName == 'Age';
                });
                if (ageArray && ageArray.length > 0) {
                    var ageValue = ageArray[0].value;
                    setProfileAttribute("age", ageValue, session);
                } else {
                    missingAttributesToPullFromProfile.push("age");
                }

                //experience
                var expArray = seeker.profile.filter(function (i) {
                    return i.attributeName == 'TotalYearOfExperience';
                });
                if (expArray && expArray.length > 0) {
                    var expValue = expArray[0].value;
                    setProfileAttribute("experience", expValue, session);
                } else {
                    missingAttributesToPullFromProfile.push("experience");
                }

                //salary
                var salArray = seeker.profile.filter(function (i) {
                    return i.attributeName == 'ExpectedSalary';
                });
                if (salArray && salArray.length > 0) {
                    var salValue = salArray[0].value;
                    setProfileAttribute("salary", salValue, session);
                }  else {
                    missingAttributesToPullFromProfile.push("salary");
                }
            
            } else { //no profile so push gender and profile_pic
                missingAttributesToPullFromProfile.push("gender");
                missingAttributesToPullFromProfile.push("profile_pic");
                missingAttributesToPullFromProfile.push("cityPrecise");
            }

            //category        
            if (seeker.jobPreferences) {
                var catArray = seeker.jobPreferences.filter(function (i) {
                    return i.attributeName == 'JobCategory';
                });
                if (catArray && catArray.length > 0) {
                    //var catValue = catArray[0].value[0].id;  //just taking one category...
                    var cats = [];
                    catArray[0].value.forEach(function (element) {
                        if (element.has) {
                            cats.push(element.id)
                        }    
                    }, this);
                    setProfileAttribute("category", cats, session);
                } else {
                    missingAttributesToPullFromProfile.push("category");
                }
            } else {
                missingAttributesToPullFromProfile.push("category");
            }

            //education
            if (seeker.qualifications) {
                var eduArray = seeker.qualifications.filter(function (i) {
                    return i.attributeName == 'Qualification';
                });
                if (eduArray && eduArray.length > 0) {
                    var eduValue = eduArray[0].value.name;
                    setProfileAttribute("education", eduValue, session);
                }
            }  else {
                    missingAttributesToPullFromProfile.push("education");
                }

            //documents -> aadhaar
            if (seeker.documents) {
                var aadhaarArray = seeker.documents.filter(function (i) {
                    return i.attributeName == 'AadharCard';
                });
                if (aadhaarArray && aadhaarArray.length > 0) {
                    var aadhaarValue = aadhaarArray[0].value;
                    setProfileAttribute("aadhaar", aadhaarValue, session);
                }
                else {
                    missingAttributesToPullFromProfile.push("aadhaar");
                }
            } else {
                missingAttributesToPullFromProfile.push("aadhaar");
            }
        
        
            //assessments -> worldbank
            if (seeker.assessments) {
                var wbArray = seeker.assessments.filter(function (i) {
                    return i.attributeId >= 266 && i.attributeId <= 270;
                });
                if (wbArray && wbArray.length > 0) {
                    setProfileAttribute("tookPersonalityQuiz", true, session);
                }
                else {
                   // missingAttributesToPullFromProfile.push("personalityQuiz");
                }
            } else {
                //TODO: save results if they take the test before giving mobile...
               // missingAttributesToPullFromProfile.push("personalityQuiz");
            }    

            //Update Extra Info from FB...
            //locale? timezone?
            if (missingAttributesToPullFromProfile.length > 0) {
                saveAttributesToBJ(missingAttributesToPullFromProfile, session);
            }
        }
    } catch (e) {
        console.log("Exception in setBJSeekerDataToProfile" + e);
    }    
}


function getProfileAttribute(attribute, session) {
    checkValidUserDataProfile(session);
    var value = null;
    if (session.userData && session.userData.profile && session.userData.profile[attribute]) {
        value = session.userData.profile[attribute];
    }
    //Validate...
    if (value) {
        if (attribute == "age") {
            var ageInYears = getAge(value);
            if (!(ageInYears > 17 && ageInYears < 100)) {
                value = null;
            }
        }
    }
    return value;
}

function getAge(dateText) {
    var now = new Date();
    var date = new Date(dateText);
    var years = parseInt((now - date) / (1000 * 3600 * 24 * 365.25));
    console.log("date:" + date + " years:" + years);
    return years;
}

//sets the value in the local chatbot profileData
function setProfileAttribute(attribute, value, session) {
    checkValidUserDataProfile(session);
    var newValue = value;
    if (attribute == "category") {
        if (!newValue) {
            newValue = [0];
        } 
        else {
            if (!Array.isArray(newValue)) {
                newValue = [value];
            }
        }
    }


    session.userData.profile[attribute] = newValue;
}


function saveProfileAttribute(attribute, value, session)
{
    setProfileAttribute(attribute, value, session);
    var attributes = [attribute];
    saveAttributesToBJ(attributes, session);
}






///
function updateFacebookIdOnBabajob(facebookId, session) {
    var bjUserId = getProfileAttribute("bjUserId", session);
    var accessToken = getProfileAttribute("accessToken", session);

    if (bjUserId) { // if no babajob id, then we have nothing to update...
        if (!(session.userData && session.userData.profile && bjUserId && accessToken)) {
            handleError("updateFacebookIdOnBabajob", session, "missing params:",
                "facebookId" + facebookId + " accessToken:" + accessToken,
                "missing parameters for updateFacebookIdOnBabajob:"
            );

        } else {
            //Call Babajob API
            /*
            Post http://preprodapi.babajob.com/v2/authentication/users/8061457
                { 
                   "facebookId":"1234455"
                }
            This api will update users facebookId
            */
            console.log("trying updateFacebookIdOnBabajob:", facebookId);
            session.sendTyping();
            var uri = bjAPIDomain + "/v2/authentication/users/" + bjUserId;
            request({
                uri: uri,
                method: "POST",
                timeout: 20000,
                accept: "application/json",
                contentType: "application/json",
                headers: {
                    'Authorization': accessToken,
                    'consumer-key': consumerKey,
                },
                json: {
                    facebookId: facebookId
                }
            }, function (error, response, body) {
                if (error) {
                    //TODO: Handle case where fbID is already on babajob:
                    //"User with this facebook id already exists" 403
                    handleError("updateFacebookIdOnBabajob", null, error,
                        "facebookId" + facebookId, "Hmmm. You seem to already be registered on Babajob with this FacebookId",
                        uri, body);
                } else {
                    console.log("updateFacebookIdOnBabajob Body: " + util.inspect(body, { showHidden: false, depth: null }));
                
                    /*
                    {
      "userId": "10001",
      "mobileNo": "+919886251476",
      "emailId": "sean@babajob.com",
      "role": "ADMIN"
    }
    */
                    let userObj;
                    try {
                        //userObj = JSON.parse(body);
                        userObj = body;
                    } catch (e) {
                        console.log("exception while parsing JSON:", e);
                    }

                    if (!userObj || !userObj.userId) {
                        //this should not happen
                    } else {
                        console.log("updateFacebookIdOnBabajob succeeded to new id", facebookId);
                    }
                }
            }
            )
        }
    }
}

var profileLevelEnum = { none: 1, search: 2, match: 3 };

//GET jobs...
bot.dialog('/SearchJobs', [
    function (session, args) {
        session.sendTyping();
        var uri;

        console.log("/SearchJobs args " + args);
               
        //parse pageCount if present...
        var maxCount = 5; 
        var pageCount = maxCount;
        if (args && args < 100) {
            console.log("/SearchJobs args seetting " + args);
       
            pageCount = args;
        }

        //We have 3 choices:
        //1. We have a valid auth token (mobile + user is provisioned) ->match API
        //2. We have gender, lat/lng, cat for anonymous search... -> search API
        //3. We lack both and hence need to ask more Qs to get one of the above done...
        var startFrom = 0;
       
        if (pageCount > maxCount) {
            startFrom = pageCount - maxCount;
        }

        console.log("/SearchJobs pageCount " + pageCount + "startFrom:", startFrom);
        
        
        var level = profileLevelEnum.none;
           //got gender, city and category
        if (session.userData.profile &&
            session.userData.profile.category
             && session.userData.profile.city
            )
        {
            level = profileLevelEnum.search;
            //got jobSeekerId and AccessToken
            if (session.userData.profile.jobSeekerId && session.userData.profile.accessToken) {
                level = profileLevelEnum.match;
            }
        }    

         console.log("/SearchJobs profileLevelEnum ", level);
         console.log(util.inspect(session.userData.profile));
               
        
        if (level == profileLevelEnum.none) {
            //return and ask Qs
            session.send(gettext("Hmmm. I need to know a bit more about you before I can search for matching jobs.", session));
            session.replaceDialog("/askQsOrMenu");
        } else {
        
            var headers;

            if (level == profileLevelEnum.match) {
                headers = {
                    'Authorization': session.userData.profile.accessToken,
                    'consumer-key': consumerKey,
                };
                uri = bjAPIDomain + '/v1/match/jobseeker/' + session.userData.profile.jobSeekerId +
                    "/jobposts?size=" + pageCount + "&excludejob=false";
               
            } else {
                //for Anonymous Search...
                headers = {
                    'consumer-key': consumerKey //likely not needed....
                };

                //default searches to male gender if not known...                
                var gender = "Male";
                if (getProfileAttribute("gender", session)) {
                    gender = S(getProfileAttribute("gender", session)).contains("female") ? "Female" : "Male";
                }   
                
                var lat = "12.967773";
                var lng = "77.60234";
                var cityPrecise = getProfileAttribute("cityPrecise", session);
                if (cityPrecise && cityPrecise.location) {
                    lat = cityPrecise.location.latitude;
                    lng = cityPrecise.location.longitude;
                }
             
                var categories = getProfileAttribute("category", session);
                
                //http://api.babajob.com/v1/search/jobposts?gender=Male&lat=12.967773&lng=77.60234&categories=1,0&from=0&size=5&sortBy=createdOn&sortOrder=desc
                uri = bjAPIDomain + '/v1/search/jobposts?gender=' + gender + "&lat=" + lat + "&lng=" + lng
                    + "&categories=" + categories + "&from=" + startFrom + "&size=" + pageCount + "&sortBy=createdOn&sortOrder=desc";
            }
                
            request({
                uri: uri,
                method: "GET",
                timeout: 30000,
                accept: "application/json",
                contentType: "application/json",
                headers: headers
            }, function (error, response, body) {
                if (error) {
                    handleError("/SearchJobs", session, error, headers, "Sorry I had an error while getting your matching jobs",
                        uri, body)
                }
                else {
                    if (S(body).contains("Not Found")) {
                        //Hack for not found in Mongo Search...
                        updateLastLogin(session);

                        //this user is not a job seeker...
                        handleError("/SearchJobs", session, session.userData.profile, headers, "Doh - I had a small problem while searching for jobs. Please try Search Jobs again. ",
                            uri, body);
                        
                    } else if (S(body).contains("Required details are not present")) {
                        //Hack for not found in Mongo Search...
                        updateLastLogin(session);

                        //this user is missing gender, category and/or location
                        handleError("/SearchJobs", session, session.userData.profile, headers, "Oh no! I had a small problem while searching for jobs. Please try Search Jobs again.",
                            uri, body);
                    } else {
                        let jobsObj;
                        let totalCount;
                        let jobs = [];

                        try {
                            if (level == profileLevelEnum.match) {
                                jobsObj = JSON.parse(body);
                            } else {
                                //search is in a different format that includes totalCount...
                                var metaObj = JSON.parse(body);
                                if (metaObj && metaObj.jobPosts) {
                                    jobsObj = metaObj.jobPosts;
                                    if (metaObj.totalCount) {
                                        totalCount = metaObj.totalCount;
                                    }
                                }
                            }
                            // console.log("GOT JOBS:", util.inspect(jobsObj,
                            //       { showHidden: false, depth: null }));
                            
                            /*
                            jobs.push(jobFactory(2146685046, "Commercial Car Driver Cum Owner", "UBER", "45000", "Agara", "Bangalore",
                                "The driver should have DL , Yellow badge commercial license with Police Clearance Certificate.",
                                "http://www.babajob.com/services/getimage.aspx?id=775814&width=160",
                                "http://www.babajob.com/Job-Commercialcardrivercumowner-For-Uber_India_Systems-in-Bangalore-Near-Koramangala(560034)-2146685046"))
                            
                        //match returns...
                        { userID: 7857881,
                            JobCategory: { name: 'Delivery/Collection Logistics' },
                            employerName: 'Pradeep Yadav',
                            title: 'Delivery Exceutive',
                            employerId: null,
                            jobId: 2146292127,
                            CurrentSalary: 10000,
                            address:
                                { locality: 'Bangalore',
                                sublocality_level_2: null,
                                sublocality_level_1: 'Marattahalli' },
                            companyName: 'P&amp;S Enterprise',
                            jobPostId: '57d54f17b4490e71ee610415' },


//search returns...                            
var searchedJobs =
    {
        "jobPosts":
        [
            {
                "_index": "jobposts", "_type": "jobpost", "_id": "57d55015b4490e71ee61c05b", "_score": null,
                "_source":
                {
                    "createdOn": "2016-06-16T04:50:52.427+0000",
                    "JobCategory": { "id": 0 },
                    "employerName": "Advith Shetty",
                    "title": "Driver",
                    "CurrentSalary": 16000,
                    "address":
                    {
                        "location":
                        { "lon": 77.62561, "lat": 12.981994 },
                        "sublocality_level_2": null,
                        "sublocality_level_1": "Halasuru", "sublocality_level_3": null
                    },
                    "description": "Looking for Driver",
                    "validUntil": "2016-12-06T10:22:50.227+0000",
                    "companyName": "City Living",
                    "jobPostId": "57d55015b4490e71ee61c05b"
                }, "sort": [1466052652427]
            }
        ],
        "totalCount": 727
    };

                            */
                            

                            for (var i = 0; i < jobsObj.length; i++) {
                                var job = jobsObj[i]["_source"];
                                // createdOn: '2016-09-20T07:40:03.175+0000',

                                jobs.push(jobFactory(job.jobId, job.title,
                                    job.companyName || job.employerName,
                                    job.CurrentSalary,
                                    job.address.sublocality_level_1, job.address.locality, job.description, null,
                                    bjWebDomain + "/job-" + job.jobId,
                                    job.jobPostId, job.userID));
                            }
                            
                            var jobsWrapper = {};
                            jobsWrapper.jobs = jobs;

                            //set if totalCount is yet undefined...                            
                            if (!totalCount) {
                                totalCount = jobs.length;
                            }
                            jobsWrapper.totalCount = totalCount;

                            //console.log("Trying to parse jobsObj: " + util.inspect(jobsObj, { showHidden: false, depth: null }));
                            console.log("Got " + totalCount + " jobs ");


                            if (jobs.length > 0) {
                                session.beginDialog("/renderJobs", jobsWrapper);
                            } else {

                                //Error case of no jobs...
                                var city = getProfileAttribute("city", session);

                                //console.log("renderJobs:session", util.inspect(session.userData.profile));

                                var cat = getLocalizedCategoryText(
                                    getProfileAttribute("category", session), session);
                                

                                // gettext("I could not find any matching jobs. Please Edit your Profile and changing your category or city."
                                //Sorry, I could not find any Cook Jobs in Maduri right now. Please try a different search such as 'Driver Jobs in Bangalore'".
                                var noJobsMsg =
                                    gettext("Sorry, I could not find any", session) 
                                    + (cat ? " " + cat : "") +
                                    " " + gettext("jobs in", session) + " " + city
                                    + " " + gettext("right now. Please try a different search such as 'Driver Jobs in Bangalore'", session);

                                session.send(noJobsMsg);

                                logWarning("/SearchJobs - No matching jobs.", session,
                                    noJobsMsg, { cat: cat, city: city });
                                
                                session.beginDialog("/menu");
                                
                                /*
                                handleError("/SearchJobs", session, "No matching jobs.", "",
                                    noJobsMsg,
                                    uri, body, true);
                                */
                            }
                        }
                        catch (e) {
                            handleError("/SearchJobs", session, e, headers, "Sorry I had an exception while getting your matching jobs",
                                uri, body)
                        }
                    }
                }
            })
        }
    },
    function (session, results,next) {
        session.endDialog();
    }
]);
bot.beginDialogAction('SearchJobs', '/SearchJobs', { matches: /^searchjobs/i });

bot.dialog('/viewjob', [
    function (session, args) {

        var uri;
        var jobId = 2146288609;
        if (args) {
            jobId = args;
        }
        
        if (!(session.userData.profile.jobSeekerId && session.userData.profile.accessToken)) {
            //for you just send the hardcoded jobs...
            session.endDialog("You must have a added your mobile number to view jobs. To start over, type delete.");
        } else {
            uri = bjAPIDomain + '/v2/jobPosts?jobId=' + jobId; 
                
            request({
                uri: uri,
                method: "GET",
                timeout: 30000,
                accept: "application/json",
                contentType: "application/json",
            
                headers: {
                    'Authorization': session.userData.profile.accessToken,
                    'consumer-key': consumerKey,
                }
                
            }, function (error, response, body) {
                if (error) {
                    handleError("viewjob", session, error,
                        "jobId" + jobId, "error viewing job: " + jobId,
                        uri, body);                    
                } else {
                    if (S(body).contains("Not Found")) {
                        handleError("viewjob", session, "",
                            "jobId" + jobId, "Job not found",
                            uri, body);      
                    } else {
                        let jobsWrapper;
                        try {
                       jobsWrapper  = body;
                        console.log("Trying to parse jobsObj: " + util.inspect(jobsWrapper, { showHidden: false, depth: null }));
                        
                        let jobs = jobsWrapper.items;

                        if (jobs && jobs.length > 0) {
                            let job = jobs[0];
                        }

            /*        
                        {
  "items": [
    {
      "modifiedOn": "2016-09-16T03:39:43.189Z",
      "createdOn": "2016-09-15T15:02:39.916Z",
      "jobId": 2146288609,
      "totalNumberOfOpenings": 1,
      "address": {
        "address_line_2": "Visakha
                           
               

                            for (var i = 0; i < jobsObj.length; i++) {
                                var job = jobsObj[i]["_source"];
                                jobs.push(jobFactory(job.jobId, job.title, job.companyName || job.employerName, job.CurrentSalary,
                                    job.address.sublocality_level_1, job.address.locality, job.description, null,
                                    "http://www.babajob.com/job-" + job.jobId));
                            }

                            */ 
                            
                            //session.beginDialog("/askJobApplyQs",job);
                        }
                        catch (e) {
                            handleError("viewjob", session, e,
                                "jobId" + jobId, "Sorry I had a parse error while getting your matching jobs",
                                uri, body);    
                        }
                    }
                }
            })
        }
    },
    function (session, results,next) {
        session.endDialog();
    }
]);
bot.beginDialogAction('viewjob', '/viewjob', { matches: /^viewjob/i });


bot.dialog('/askJobApplyQs', [
    function (session, args, next) {
        session.dialogData.job = args || {};
        console.log("askJobApplyQs : " + util.inspect(args, { showHidden: false, depth: null }));

        //first check for OTP...
        var mobileContactInfo = getProfileAttribute("mobileContactInfo", session);
        if (mobileContactInfo) {
            if (mobileContactInfo.isVerified) {
                next();
            } else {
                //startOTP
            }
        }
    },
    function (session, results, next) {
        //process something
        var gender;
        if (results.response) {
            console.log("gender selected:" + util.inspect(results.response, { showHidden: false, depth: null }));
      
            if (results.response.entity) {
                //they picked something
                gender = genderMenu[results.response.index].value;
            } else {
                //TODO: attempt to parse what they typed...
            }
        }
        if (gender) {
            saveProfileAttribute("gender", gender, session);
            session.dialogData.profile.gender = gender;
        }
            

        if (!session.dialogData.profile.education) {
            var q = gettext("What's your highest education qualification?", session);
            builder.Prompts.choice(session,
                q,
                gettextForArray(educationMenu, session), buildOptionsRetryPrompt(q, session));
            
        } else {
            next();
        }
    },
    function (session, results, next) {
        //process OTP
        session.endDialogWithResult({ response: session.dialogData.profile });
    }
]);


///v2/jobseekers/57ff869792690f03a72ce33d/applications
//APPLY FOR A JOB
bot.dialog('/applyjob', [
    function (session, args, next) {

        
        //var jobId = 2146288609;
        var jobPostId = "57ff8678778ed36756451130";
        var job;
        session.dialogData.fullAppliedJob = null; //set after apply....

        if (args && args.jobPostId) {
            job = args;
            jobPostId = args.jobPostId;
            session.dialogData.searchJob = job;
            session.dialogData.jobPostId = jobPostId;
        }

        next();        
    },

    
    function (session, results, next) {

        var bjUserId = getProfileAttribute("bjUserId", session);
        var jobSeekerId = getProfileAttribute("jobSeekerId", session);
        var accessToken = getProfileAttribute("accessToken", session);
        var jobPostId = session.dialogData.jobPostId;
        var uri;
        
        if (!(jobPostId && bjUserId && jobSeekerId && accessToken)) {
            handleError("applyjob", session,
                "Exception: applyjob was missing",
                "jobPostId:" + jobPostId + " bjUserId: " + bjUserId
                + " jobSeekerId:" + jobSeekerId + " or accessToken:" + accessToken,
                "Sorry, I had an error while trying to apply for a job");  
        } else {
            uri = bjAPIDomain + "/v2/jobseekers/" + jobSeekerId + "/applications";
            request({
                uri: uri,
                method: "POST",
                timeout: 30000,
                accept: "application/json",
                contentType: "application/json",
            
                headers: {
                    'Authorization': session.userData.profile.accessToken,
                    'consumer-key': consumerKey,
                },
                json: {
                    jobPostId: jobPostId
                }
                
            }, function (error, response, body) {
                if (error) {
                    handleError("applyjob", session, error,
                        "jobPostId" + jobPostId, "Sorry, I had an error while trying to apply for a job",
                        uri, body);      

                } else {
                    if (S(body).contains("Not Found")) {
                        handleError("applyjob", session, "JobiD Not Found in Search...",
                            "jobPostId" + jobPostId, "This job does not seem to exist: " + jobPostId,
                            uri, body);    
                    } else {
                        try {
                            if (body && body.statusCode == 403) {
                                //{ statusCode: 403,  message: 'Your contact details are not verified. ' }
                                
                                next({ response: { notVerified: true } });
                                //session.beginDialog("/signIntoBabajobWithMobile", profile.mobile);

                                //} else if (body && body.statusCode == 400) {
                                //{ statusCode: 400, message: 'Mobile number is invalid' }                            
                            } else if (body && body.statusCode == 500) {
                                var msg = body.message;
                                handleError("applyjob", session, "statusCode==500",
                                    "jobPostId" + jobPostId, "Sorry, I had an error while trying to apply for a job:" + msg,
                                    uri, body);
                            }
                            else if (body && body.jobPost) {

                                console.log("Trying to parse apply jobPost: " +
                                    util.inspect(body.jobPost, { showHidden: false, depth: null }));
              
                                //remove the job from the applied job queue if there...
                                removeJobFromQueuedAppliedJob(body.jobPost.jobPostId, session);
                                
                                //set the full Job for later questions to use...
                                session.dialogData.fullAppliedJob = body.jobPost;
                                
                                next({ response: body.jobPost });
                            } else {
                                handleError("applyjob", session, "body or body.jobPost was null ",
                                    "jobPostId" + jobPostId, "Sorry, I had an error while trying to apply for a job: no body",
                                    uri, body);
                            }
                        }
                        catch (e) {
                            handleError("applyjob", session, e,
                                "jobPostId" + jobPostId, "Sorry I had a parse error while applying for a job",
                                uri, body);
                        }
                    }
                }
            })
        }
    },

    //check for not Verified just in case it slipped through...
    function (session, results, next) {
        console.log("checking OTP...");
        if (results.notVerified) {
            session.beginDialog("/askForMobileOTP");
        } else {
            next(results);
        }
    },

       
    //Do Qs...
    function (session, results, next) {
        console.log("Do Qs...");
        if (session.dialogData.fullAppliedJob) {
            session.beginDialog('/askQsForJob', session.dialogData.fullAppliedJob);
        } else {
            next(results);
        }
    },

     //TODO: kick off getting the full job, so they are prepared before the call...
    

    //post application - show number...
    function (session, results, next) {
        console.log("Getting number...");
        if (session.dialogData.fullAppliedJob) {
            session.beginDialog('/getJobNumber', session.dialogData.fullAppliedJob);
        } else {
            logWarning("applyjob:postApply", session, "no jobPostId",
                "results.response:" + results.response);
            session.endDialog();
            //removing so the fall through on search jobs works 
            //  handleError("renderJobs:postApply", session, "no result.response", "results.response=null",
            //      "I had an error while you were applying for this job.");
        }
    },
    function (session, results,next) {
        session.endDialog();
    }
]);


function pushJobToQueueApplications(appliedJobFromSearch, session) {
    checkValidUserDataProfile(session);
    if (appliedJobFromSearch && appliedJobFromSearch.jobPostId) {
        if (!session.userData.queueAppliedJobs) {
            session.userData.queueAppliedJobs = {};
        }

        session.userData.queueAppliedJobs[appliedJobFromSearch.jobPostId]
            = appliedJobFromSearch;
    }
}

function removeJobFromQueuedAppliedJob(jobPostId, session) {
    checkValidUserDataProfile(session);
    if (session.userData.queueAppliedJobs) {
        var job = session.userData.queueAppliedJobs[jobPostId];
        if (job) {
            delete session.userData.queueAppliedJobs[jobPostId];
        }
    }
}

bot.dialog('/applyToQueuedJobs', [
    function (session, args, next) {
        if (session.userData && session.userData.queueAppliedJobs) {
            var queue = session.userData.queueAppliedJobs;

            var postKeys = [];
            //first copy the list of jobPostIds to a separate array
            for (var key in queue) {
                if (queue.hasOwnProperty(key)) {
                    postKeys.push(key);
                }
            }

            //this will only apply to one job...
            
            if (postKeys.length > 0) {
                //then call apply job on each...      
                var jobPostId = postKeys[0];
                var job = queue[jobPostId];
                session.beginDialog("/applyjob", job);
            } else {
                session.endDialog();
            }
        }
        else {
            session.endDialog();
        }
    },
    function (session, results, next) {
        session.endDialog();
    }
]
);






//Get number that a job seeker can call...
//http://preprodapi.babajob.com/v1/VirtualNumberAssociations/
bot.dialog('/getJobNumber', [
    function (session, args) {
        //appliedFullJob;
        var job;
        var jobPostId = null;// "57ff8678778ed36756451130";
        var jobId;
        var employerId;
        if (args && args.jobPostId) {
            job = args;
            jobPostId = args.jobPostId;
            jobId = job.jobId;
            employerId = job.employer.user.userID;
        } 
        var bjUserId = getProfileAttribute("bjUserId", session);

        if (!(jobPostId && job && bjUserId && employerId && jobId)) {
            handleError("getJobNumber", session, "missing parameters",
                "missing jobPostId: " + jobPostId + " jobId:" + jobId +
                " employerId:" + employerId,
                "Missing parameters while getting the number for this job",
                "", args);
            
        } else {

            var application = {
                "caller": {
                    "id": bjUserId,
                    "babaJobUserTypeId": 2 // job seeker
                },
                "callee": {
                    "id": employerId,
                    "babaJobUserTypeId": 1 // employer
                },
                "purposeId": 6, // 6 is for job applications
                "babajobJobId": job.jobId
            };

            var uri = bjAPIDomain + "/v1/VirtualNumberAssociations/";

            console.log("getNumber uri:", uri);     
            console.log('getNumber application:',
                util.inspect(application, { showHidden: false, depth: null }));
 
            request({
                uri: uri,
                method: "POST",
                timeout: 30000,
                accept: "application/json",
                contentType: "application/json",
                json:application
                
            }, function (error, response, body) {
                if (error) {
                    handleError("getJobNumber", session, error,
                        application,
                        "Sorry, I had an error while trying to getJobNumber",
                        uri, body);
                } else {
                    if (S(body).contains("Not Found")) {
                        
                        handleError("getJobNumber", session, "getJobNumberFailed Not Found in Search...",
                            application,
                            "getJobNumberFailed Not Found in Search...",
                            uri, body);
                        
                    } else {
                        let jobWrapper;
                        try {
                            if (body && body.message) {
                                //error
                                /*
                                {
                                "statusCode": 500,
                                "message": "No more numbers available!",
                                "stackTrace": "   at Telephony.VritualNumberService.ApplicationServices.OneWayNumberProvider.Generate(IVirtualNumberRequest virtualNumberRequest) in d:\\Jenkins\\Virtual_Numbers_QA_Artifacts\\Telephony\\Telephony.VritualNumberService\\ApplicationServices\\OneWayNumberProvider.cs:line 43\r\n   at Telephony.VritualNumberService.ApplicationServices.VirtualNumberAssociationService.Generate(IVirtualNumberRequest virtualNumberRequest) in d:\\Jenkins\\Virtual_Numbers_QA_Artifacts\\Telephony\\Telephony.VritualNumberService\\ApplicationServices\\VirtualNumberAssociationService.cs:line 163\r\n   at Babajob.VirtualNumbers.Api.VirtualNumberModule.<<.ctor>b__11>d__25.MoveNext() in d:\\Jenkins\\Virtual_Numbers_QA_Artifacts\\VirtualNumbers\\src\\VirtualNumbers.Api\\VirtualNumberModule.cs:line 75",
                                "status": "InternalServerError"
                                }
                                */
                                
                                handleError("getJobNumber", session, "getJobNumber Failed " + body.message,
                                    application,
                                    "getJobNumber Failed " + body.message,
                                    uri, body);
                            } else {
                                /*
                            //success
                            [
                            {
                                "caller": {
                                "babaJobUserTypeId": 2,
                                "babajobUserType": null,
                                "id": 7877743
                                },
                                "callee": {
                                "babaJobUserTypeId": 1,
                                "babajobUserType": null,
                                "id": 7440004
                                },
                                "virtualNumber": "08039534101"
                            }
                            ]
                            */
                            //Driver with UBER application sent. Miss call  
                            //Miss call 08
                                session.send(gettext("Your job application has been sent",session)  + "!");

                                var employerPhone;
                                var numObj = body[0];
                                if (numObj && numObj.virtualNumber) {
                                    employerPhone = numObj.virtualNumber;
                                    session.send(
                                        job.title + ", " + employerCompanyNameOrName(job) + "\n" + 
                                        gettext("Give a missed call to", session) + " "
                                        + employerPhone + " " +
                                        gettext("to answer a few more questions about this job. If you answer them correctly, I'll connect you to the employer.", session)
                                    );

                                    
                                    logFunnel("", session, funnelSteps.Got_Back_a_Virtual_Number + " Got_Back_a_Virtual_Number", null, "");   
                                    session.replaceDialog("/menu");
                                } else {
                                    handleError("getJobNumber", session, "getJobNumber parse failed",
                                        application,
                                        "Sorry, I could not get this employer's phone number. Please try applying for another job."
                                        , uri, body, true);
                                }
                            }
                        }
                        catch (e) {
                            handleError("getJobNumber", session, e,
                                        application,
                                        "Sorry, I failed to parse this employer's phone number. Please try applying for another job."
                                        , uri, body, true);
                        }
                    }
                }
            })
        }
    },
    function (session, results,next) {
        session.endDialog();
    }
]);


bot.dialog('/askAboutMe', [
    function (session, args) {
        var msg = gettext("What are the skills you are admired for and make you suitable for your next job?", session, true);
        builder.Prompts.text(session, msg);
    },
    function (session, results) {
            if (results.response) {
            var answer = results.response;
            if (answer.length < 15) {
                session.send(gettext("I'm sure you can be a bit more specific", session) + "..." + gettext("and longer when describing yourself", session) + "😊");
                session.replaceDialog("/askAboutMe");
            } else {

                //hack around apply getting into the about me box...
                var applyValues = answer.match(/apply:(.*)/g);
                if (applyValues != null && applyValues.length > 0) {
                    session.send(gettext("Sorry - let's finish this job application first before applying to another", session));
                } else {
                    session.send(gettext("Nice", session) + "! " + gettext("That sounds impressive", session) + "...");
                    saveProfileAttribute("aboutMe", answer, session);
                }
                session.endDialog();
            }
        } else {
            session.endDialogWithResult({ response: session.userData.profile });
        }
    },
    function (session, results,next) {
        session.endDialog();
    }
]);

bot.dialog('/askEducation', [
    function (session, results, next) {
        
        var q = gettext("What's your highest education qualification?", session);
        builder.Prompts.choice(session,
            q,
            gettextForArray(educationMenu, session), buildOptionsRetryPrompt(q, session));
    },
    function (session, results, next) {
        //process education
        var educationLevel;
        if (results.response) {
            if (results.response.entity) {
                //they picked something
                educationLevel = educationMenu[results.response.index].value;
            } else {
                //TODO: attempt to parse what they typed...
            }
        }
        if (educationLevel) {
            saveProfileAttribute("education", educationLevel, session);
        }        
        session.endDialogWithResult({ response: session.userData.profile });
    }]);

bot.dialog('/askGender', [
    function (session, results, next) {
        var q = gettext("Are you a man or a woman?", session);
        builder.Prompts.choice(session,
            q,
            gettextForArray(genderMenu, session),
            buildOptionsRetryPrompt(q, session));
    },
    function (session, results, next) {
        //process gender
        var gender;
        if (results.response) {
            console.log("gender selected:" + util.inspect(results.response, { showHidden: false, depth: null }));
            if (results.response.entity) {
                //they picked something
                gender = genderMenu[results.response.index].value;
            } else {
                //TODO: attempt to parse what they typed...
            }
        }
        if (gender) {
            saveProfileAttribute("gender", gender, session);
        }
        session.endDialogWithResult({ response: session.userData.profile });
    }]);


bot.dialog('/askSalary', [
    function (session, args) {
        var msg = gettext("What's your expected monthly salary / CTC? e.g. 10000", session, true);
        builder.Prompts.number(session, msg);
    },
    function (session, results) {
        if (results.response) {
            var answer = results.response;
            // if (answer.length < 4 ) {
            //validate
            saveProfileAttribute("salary", answer, session);
            session.endDialog();
        } else {
            session.endDialogWithResult({ response: session.userData.profile });
        }
    },
    function (session, results,next) {
        session.endDialog();
    }
]);

bot.dialog('/askExperience', [
    function (session, args) {
        var msg = gettext("How many years of work experience do you have? e.g. 2 or 0 for fresher", session, true);
        builder.Prompts.number(session, msg);
    },
    function (session, results) {
        if (results.response) {
            var answer = results.response;
            //validate
            //convert to months
            answer = answer * 12;
            saveProfileAttribute("experience", answer, session);
            session.endDialog();
        } else {
            session.endDialogWithResult({ response: session.userData.profile });
        }
    },
    function (session, results,next) {
        session.endDialog();
    }
]);

/////////////////////////////////////////////////////////
///////////  FEEDBACK ///////////////////////////////////
/////////////////////////////////////////////////////////

bot.dialog('/giveFeedback', [
    function (session, args) {
        var msg = gettext("What can I improve?", session, true);
        builder.Prompts.text(session, msg);
    },

    function (session, results) {
        logFeedback(session); //session includes the last sent messsage...

        session.send(gettext("Thanks for your feedback! Please know we read every piece of feedback and will get back to you if we have questions.", session));
        session.beginDialog("/menu");
        /*
        if (getProfileAttribute("role", session) != "EMPLOYER") {
            session.beginDialog("/SearchJobs");
        } else {
            
        }
        */
    },
    function (session, results,next) {
        session.endDialog();
    }
]);
bot.beginDialogAction('giveFeedback', '/giveFeedback', { matches: /^giveFeedback/i });


/////////////////////////////////////////////////////////
//// WORLD BANK Assessment  ////////////////////////////////////
/////////////////////////////////////////////////////////



var personalityAssessmentData =
    {
        traits: [
            {
                //•	Applicants who score high in openness will perform well in jobs that are composed of a variety of different tasks 
                //and entail a high level of creative thinking while low scorers prefer familiar routines and repetitive tasks.


                dimension: "Openness", //openness to experience
                pair: [
                    {
                        trait: "Realistic", //cautious, consistent
                        en: "Realistic",
                        description: "Practical, likely conservative. Like working with things rather than with ideas" // and prefer somewhat repetitive tasks"
                        //Practical, likes working with things rather than with ideas. Prefers familiar routines to new experiences. Tends to be conservative.
                        , valueData: {
                            "id": 1,
                            "min": 0,
                            "max": 50,
                            "value": "Realistic"
                        },
                        detail:
                        {
                            "en_DescriptionForEmployer": "Practical, consistent and likes working with things rather than with ideas. Prefers familiar routines to new experiences. Usually Conservative.",
                            "en_DescriptionForSeeker": "You are practical, consistent and generally like working with things rather than with ideas. You prefer familiar routines to new experiences and tend to be conservative.",
                            "en": "Realistic",
                            "name": "Realistic"
                        }
                    },
                    {
                        trait: "Imaginative", //Imaginative, Original, Curious
                        en: "Imaginative",
                        description: "Fanciful and curious, like to try new things. Likely liberal. Creative."
                        //Fanciful and curious, likes to try new things. Creative and in touch with their feelings. 
                        //Tends to be liberal. 
                        , valueData:
                        {
                            "id": 2,
                            "min": 51,
                            "max": 100,
                            "value": "Imaginative"
                        },
                        detail:
                        {
                            "en_DescriptionForEmployer": "Fanciful and curious, likes to try new things. Creative and in touch with their feelings. Usually Liberal.",
                            "en_DescriptionForSeeker": "You are fanciful and curious and like to try new things. You are creative and in touch with your feelings. You tend to be liberal.",
                            "en": "Imaginative",
                            "name": "Imaginative"
                        }
                    }
                ]
            },
        
            //•	Low scores in Extroversion often like working alone or in small groups, while high scorers tend to prefer working in groups and will be more likely to take the lead. 
            {
                dimension: "Extroversion",
                pair: [
                    {
                        trait: "Quiet", //Reflective, Quiet
                        en: "Quiet",
                        description: "Reflective, like working in small groups or alone and doing one task at a time."
                        //Likes to spend time alone and doing solitary activities such as reading and writing. Prefers to concentrate on a single activity at a time. 
                        , valueData: {
                            "id": 1,
                            "min": 0,
                            "max": 50,
                            "value": "Quiet"
                        },
                        detail:
                        {
                            "en_DescriptionForEmployer": "Prefers to concentrate on a single activity at a time.  Likes to spend time alone rather than in groups and doing solitary activities.",
                            "en_DescriptionForSeeker": "You like to spend time alone and doing solitary activities such as reading and writing. You prefer to concentrate on a single activity at a time.",
                            "en": "Quiet",
                            "name": "Quiet"
                        }
                    },
                    {
                        trait: "Outgoing", //Talkative, Assertive, Outgoing, Dominant
                        en: "Outgoing",
                        description: "Talkative, energetic, like working in groups and taking the lead."
                        //Likes to be around people and enjoys being the center of attention. Is talkative and energetic. Prefers to work in groups. 
                        , valueData: {
                            "id": 2,
                            "min": 51,
                            "max": 100,
                            "value": "Outgoing"
                        },
                         detail:
                        {
                            "en_DescriptionForEmployer": "Likes to be around people and enjoys being the center of attention. Is talkative and energetic. Prefers to work in groups.",
                            "en_DescriptionForSeeker": "You prefer to be around people and enjoy being the center of attention. You are talkative and energetic and prefer to work in groups.",
                            "en": "Outgoing",
                            "name": "Outgoing"
                        }
                    }
                ]
            },

            //•	High scorers in agreeableness tend to cooperate well with others, while low scorers can perform better in situtations that require difficult or objective decisions or in competitive environments.

            {
                dimension: "Agreeableness",
                pair: [
                    {
                        trait: "Competitive",  // Competitive, Challenging
                        en: "Competitive",
                        description: "Ambitious, rational. Not afraid to criticize others or make difficult decisions. "
                        //Ambitious. Not afraid to criticize others or make difficult decisions. 
                        //Is rational and may be perceived as insensitive.  
                        , valueData: {
                            "id": 1,
                            "min": 0,
                            "max": 50,
                            "value": "Competitive"
                        },
                        detail:
                        {
                            "en_DescriptionForEmployer": "Ambitious. Not afraid to criticize others or make difficult decisions. Is rational and may be perceived as occasionally insensitive.",
                            "en_DescriptionForSeeker": "You are ambitious and not afraid to criticize others or make difficult decisions. You are rational but may sometimes be perceived as insensitive.",
                            "en": "Competitive",
                            "name": "Competitive"
                        }
                    },
                    {
                        trait: "Cooperative", //Sympathetic, Kind, Avoid conflict
                        en: "Cooperative",
                        description: "Sensitive and warm-hearted, get along well with others. Tend to avoid conflict."
                        //Sensitve and warm-hearted, gets along well with others. Tends to avoid conflict and has a difficult time saying ‘no’.
                        , valueData: {
                            "id": 2,
                            "min": 51,
                            "max": 100,
                            "value": "Cooperative"
                        },
                        detail:
                        {
                            "en_DescriptionForEmployer": "Sensitive and warm-hearted, gets along well with others. Tends to avoid conflict and may have a difficult time saying 'no'.",
                            "en_DescriptionForSeeker": "You are sensitive and warm-hearted and get along well with others. You tend to avoid conflict and have a difficult time saying 'no'.",
                            "en": "Cooperative",
                            "name": "Cooperative"
                        }
                    }
                ]
            },
            
            
            {
                dimension: "Conscientiousness",
                pair: [
                    {
                        trait: "Easy_Going",  // Easy-going, Spontaneous
                        en: "Easy-going",
                        description: "More laid back, less goal-oriented and more flexible and spontaneous.", //adjust
                        //Tends to be more laid back, less goal-oriented, and less driven by success. More flexible and spontaneous. 
                        valueData: {
                            "id": 1,
                            "min": 0,
                            "max": 50,
                            "value": "Easy-going"
                        },
                        detail:
                        {
                            "en_DescriptionForEmployer": "More flexible and spontaneous. Tends to be more laid back, less goal-oriented and less driven by success.",
                            "en_DescriptionForSeeker": "You tend to be more laid back, less goal-oriented, and less driven by success. You can be more flexible and spontaneous.",
                            "en": "Easy-going",
                            "name": "Easy_Going"
                        }
                    },
                    {
                        trait: "Organised", //Organised, Efficient, Responsible
                        en: "Organised",
                        description: "Hard-working and reliable, efficient. Like to think carefully before acting."//adjust
                        //Had-working and reliable, efficient. Likes to think carefully before acting. Prefers working in a structured setting.
                        , valueData:
                        {
                            "id": 2,
                            "min": 51,
                            "max": 100,
                            "value": "Organised"
                        },
                        detail:
                        {
                            "en_DescriptionForEmployer": "Hard-working and reliable, efficient. Likes to think carefully before acting. Prefers working in a structured setting.",
                            "en_DescriptionForSeeker": "You are hard-working, reliable and efficient. You like to think carefully before acting. You prefer working in a structured setting.",
                            "en": "Organised",
                            "name": "Organised"
                        }
                    }
                ]
            },
            {
                dimension: "EmotionalStability",
                pair: [
                    {
                        trait: "Sensitive",  // Nervous, Sensitive
                        en: "Sensitive",
                        description: "You tend to enjoy jobs that are less stressful." //adjust
                        //More emotional, can get worried and nervous easily. May be vulnerable to stress.
                        , valueData: {
                            "id": 2,
                            "min": 51,
                            "max": 100,
                            "value": "Sensitive"
                        },
                        detail:
                        {
                            "en_DescriptionForEmployer": "More emotional, can get worried easily. May be vulnerable to stress.",
                            "en_DescriptionForSeeker": "You are more emotional, can get worried and nervous easily. You may be vulnerable to stress.",
                            "en": "Sensitive",
                            "name": "Sensitive"
                        }
                    },
                    {
                        trait: "Calm", //Stable, Calm, Unemotional
                        en: "Calm",
                        description: "Stable, calm, able to be unemotional when required. Handle stress well."//adjust
                        //Tends to be calm and unemotional. Handles stressful situtations well. Does not get easily upset.
                        , valueData: {
                            "id": 1,
                            "min": 0,
                            "max": 50,
                            "value": "Calm"
                        },
                        detail:
                        {
                            "en_DescriptionForEmployer": "Tends to be calm and unemotional. Handles stressful situations well. Does not get easily upset.",
                            "en_DescriptionForSeeker": "You tend to be calm and unemotional. You handle stressful situations well and do not get easily upset.",
                            "en": "Calm",
                            "name": "Calm"
                        }
                    }
                ]
            }
        ],
        questions: [
            {
                id: 1,
                dimension: "Extroversion",
                en: "Are you generally reserved?",
                reverseScore: true,
            },
            {
                id: 2,
                dimension: "Agreeableness",
                en: "Are you generally trusting of other people?",
            },
            {
                id: 3,
                dimension: "Conscientiousness",
                en: "Do you tend to be lazy?",
                reverseScore: true,
            },
            
            {
                id: 4,
                dimension: "EmotionalStability",
                en: "Do you see yourself as relaxed and able to handle stress well?",
            },
            {
                id: 5,
                dimension: "Openness",
                en: "Do you see yourself as someone who has many artistic interests?"
            },
            {
                id: 6,
                dimension: "Extroversion",
                en: "Are you outgoing and sociable?",
            },
            
            {
                id: 7,
                dimension: "Agreeableness",
                en: "Do you tend to find fault with others?",
                reverseScore: true,
            },
            {
                id: 8,
                dimension: "Conscientiousness",
                en: "Do you see yourself as someone who does a thorough job?",
            },
            {
                id: 9,
                dimension: "EmotionalStability",
                en: "Do you get nervous easily?",
                reverseScore: true,
            },
            {
                id: 10,
                dimension: "Openness",
                en: "Do you see yourself as having active imagination?",
            },
            {
                id: 11,
                dimension: "Agreeableness",
                en: "Are you considerate and kind to almost everyone?",
            }
            


            
        ],
        answers: [
            {
                en: "Almost Always",
                value: 90,
                emoji: ""
            },
 
            {
                en: "Often",
                value: 70,
                emoji: ""
            },
            {
                en: "Sometimes",
                value: 30,
                emoji: ""
            },
            {
                en: "Almost Never",
                value: 10,
                emoji: ""
            }
        ], 
        
        //how we actually save data...
        assessments: [
            {
                "attributeId": 266,
                "attributeName": "Conscientiousness",
                "classification": "Assessment",
                "attributeType": "SingleValue",
                "isJobSpecific": true,
                "dataType": "Assessment",
                "options": [
                    {
                        "id": 1,
                        "min": 0,
                        "max": 50,
                        "value": "Easy Going"
                    },
                    {
                        "id": 2,
                        "min": 51,
                        "max": 100,
                        "value": "Organised"
                    }
                ]
            },
            {
                "attributeId": 267,
                "attributeName": "Extroversion",
                "classification": "Assessment",
                "attributeType": "SingleValue",
                "isJobSpecific": true,
                "dataType": "Assessment",
                "options": [
                    {
                        "id": 1,
                        "min": 0,
                        "max": 50,
                        "value": "Quiet"
                    },
                    {
                        "id": 2,
                        "min": 51,
                        "max": 100,
                        "value": "Outgoing"
                    }
                ]
            },
            {
                "attributeId": 268,
                "attributeName": "Agreeableness",
                "classification": "Assessment",
                "attributeType": "SingleValue",
                "isJobSpecific": true,
                "dataType": "Assessment",
                "options": [
                    {
                        "id": 1,
                        "min": 0,
                        "max": 50,
                        "value": "Competitive"
                    },
                    {
                        "id": 2,
                        "min": 51,
                        "max": 100,
                        "value": "Cooperative"
                    }
                ]
            },
            {
                "attributeId": 269,
                "attributeName": "EmotionalStability",
                "classification": "Assessment",
                "attributeType": "SingleValue",
                "isJobSpecific": true,
                "dataType": "Assessment",
                "options": [
                    {
                        "id": 1,
                        "min": 0,
                        "max": 50,
                        "value": "Calm"
                    },
                    {
                        "id": 2,
                        "min": 51,
                        "max": 100,
                        "value": "Sensitive"
                    }
                ]
            },
            {
                "attributeId": 270,
                "attributeName": "Openness",
                "classification": "Assessment",
                "attributeType": "SingleValue",
                "isJobSpecific": true,
                "dataType": "Assessment",
                "options": [
                    {
                        "id": 1,
                        "min": 0,
                        "max": 50,
                        "value": "Realistic"
                    },
                    {
                        "id": 2,
                        "min": 51,
                        "max": 100,
                        "value": "Imaginative"
                    }
                ]
            }
        ],

        sampleSaveData:
        {
            "assessments": [
                {
                    "value": {
                        "details": {
                            "dimension":
                            {
                                "score": 70,
                                "name": "Conscientiousness",
                                "dominantTrait": {
                                    "en_DescriptionForEmployer": "More laid back, less goal-oriented and more flexible and spontaneous.",
                                    "en_DescriptionForSeeker": "More laid back, less goal-oriented and more flexible and spontaneous.",
                                    "en": "Easy-going",
                                    "name": "Easy_Going"
                                },
                                "subordinateTrait": {
                                    "en_DescriptionForEmployer": "Candidates tend to be Hard-working and reliable, efficient. Like to think carefully before acting.",
                                    "en_DescriptionForSeeker": "Hard-working and reliable, efficient. Like to think carefully before acting.",
                                    "en": "Organised",
                                    "name": "Organised"
                                }
                            },
                            "version": 1
                        },
                        "date": "2017-01-11T09:00:00.000Z",
                        "logo": "",
                        "by": "World Bank Test",
                        "score": 20,
                        "value": "Easy Going",
                        "max": 30,
                        "min": 0,
                        "id": 1
                    },
                    "dataType": "Assessment",
                    "attributeType": "SingleValue",
                    "classification": "Assessment",
                    "attributeName": "Conscientiousness",
                    "attributeId": 266
                }
            ]
        }
    };    

var samplePersonalityTraitAnswers = {
    assessedTraits: [
    //old
        {
            dimension: "Conscientiousness",
            score: 70,
            dominantTrait: "Easy_Going",
            en: "Easy_Going",
            description: "More laid back, less goal-oriented and more flexible and spontaneous." //adjust
        },

        //new
        {
            dimension: "Conscientiousness",
            score: 70,
            dominantTrait: {
                name: "Easy_Going",
                en: "Easy-going",
                en_DescriptionForSeeker: "More laid back, less goal-oriented and more flexible and spontaneous.",
                en_DescriptionForEmployer: "More laid back, less goal-oriented and more flexible and spontaneous."
            
            },
            subordinateTrait: {
                name: "Organised",
                en: "Organised",
                en_DescriptionForSeeker: "Hard-working and reliable, efficient. Like to think carefully before acting.", 
                en_DescriptionForEmployer: "Candidates tend to be Hard-working and reliable, efficient. Like to think carefully before acting."
            }
        }        

    ],
    answers: [
        { questionId: 1, answer: 10 },
        { questionId: 2, answer: 30 },
        { questionId: 3, answer: 50 },
        { questionId: 4, answer: 5 },
        { questionId: 5, answer: 5 },
        { questionId: 6, answer: 5 },
        { questionId: 7, answer: 5 },
        { questionId: 8, answer: 5 },
        { questionId: 9, answer: 5 }
    ]
};

const WORLD_BANK_LOGO_URL = "https://storage.googleapis.com/babarichdocs/worldbank%20%2B%20babajob.png";

var cancelQuizText = "";

bot.dialog('/PersonalityQuiz', [
    function (session, args, next) {
        
        checkValidUserDataProfile(session);
        //erase any old answers...
        session.userData.profile.personalityTestAnswers = [];

        var subtile =
            gettext("We've have designed a short test to assess your personality.", session);
        
      
        
        var card = new builder.HeroCard(session)
            .title("Babajob/WorldBank " + gettext("Personality Test", session))
            .text(subtile)
            .images([
                builder.CardImage.create(session, WORLD_BANK_LOGO_URL)
            ])
            ;
        var msg = new builder.Message(session).attachments([card]);

        var nextMsg = gettext("I'll ask you", session)
            + " " + personalityAssessmentData.questions.length + " " + gettext("questions and then tell you your job personality. Sharing these with employers increases the odds you'll be hired.", session);

        session.send(msg);
        session.send(nextMsg);

        //session.send(gettext("Let's start", session));
        session.send("💡 " + gettext("Remember there are no right or wrong answers!", session));

        logFunnel("", session, funnelSteps.Started_Personality_Test + " Started_Personality_Test", null, "");
        
        //workaround for localizing cancel message...
        cancelQuizText = gettext("Quiz cancelled. You can always take it again.", session)
        session.beginDialog('/askNextPersonalityQuestion');
        
    },
    function (session, results, next) {
        session.endDialog();
    }
]).cancelAction('cancelItemAction',
    cancelQuizText, { matches: /cancel/i });

bot.beginDialogAction('PersonalityQuiz', '/PersonalityQuiz', { matches: /^PersonalityQuiz/i });


bot.dialog('/askNextPersonalityQuestion', [
    function (session, args, next) {
        console.log("askNextPersonalityQuestion" + args);
        var questionIndex = 0;
        if (args) {
            questionIndex = args;
        }
        var question = personalityAssessmentData.questions[questionIndex];
        if (!question) {
            handleError("askNextPersonalityQuestion", session, "personalityAssessmentData.questions[questionIndex] is null", questionIndex);
        } else {
        
            session.dialogData.questionIndex = questionIndex;
            var params = {
                count: questionIndex + 1,
                totalQs: personalityAssessmentData.questions.length,
                question: question
            };
    
            session.beginDialog('/askPersonalityQuestion', params);
        }    
    },
    function (session, args, next) {
        var index = session.dialogData.questionIndex
        index++;

        var questionsLeft =
            (index < personalityAssessmentData.questions.length);

        if (questionsLeft) {
            session.replaceDialog('/askNextPersonalityQuestion', index);
        } else {
            //session.send(gettext("Well done! I'll now calculate your results...", session));
            session.sendTyping();
            var traits = calculatePersonalityTraits(session);
            //setProfileAttribute("personalityTraitAssessment", traits, session);
            session.replaceDialog("/renderPersonalityResults", traits);
        }
    }
]);

// 1/10: Are you a talkative person?
bot.dialog('/askPersonalityQuestion', [
    function (session, args, next) {
        console.log('askPersonalityQuestion: ' + util.inspect(args));
        var count = args.count;
        var totalQs = args.totalQs;
        var question = args.question;
        session.dialogData.question = question;

        var q = count + "/" + totalQs + ": " + gettext(question.en, session);
        builder.Prompts.choice(session,
            q,
            gettextForArray(personalityAssessmentData.answers, session),
            buildOptionsRetryPrompt(q, session,false, true));
    },
    function (session, results, next) {
        console.log('askPersonalityQuestion result: ' + util.inspect(results.response));
        if (results.response && results.response.entity) {
            var answer = personalityAssessmentData.answers[results.response.index].value;
            var question = session.dialogData.question;
            savePersonalityTraitAnswer(question, answer, session);

            //session.send(gettext("Great", session));
        } else {
            session.send(gettext("OK - we'll skip that question...", session));
        }
        session.endDialog();
    }]);


function savePersonalityTraitAnswer(question, answer, session)
{
    if (!answer) {
        handleError("savePersonalityTraitAnswer", session, "answer was null");
    } else if (!(question && question.id)) {
        handleError("savePersonalityTraitAnswer", session, "question was null");
    } else {
        //get the answer array...            
        checkValidUserDataProfile(session);
        if (!session.userData.profile.personalityTestAnswers) {
            session.userData.profile.personalityTestAnswers = [];
        };

        //push the anwer to the array but reserve the score if needed...
        session.userData.profile.personalityTestAnswers.push(
            {
                questionId: question.id,
                answer: (question.reverseScore ? 100 - answer : answer)
            }
        );
    }
}

//reads the personality answers and creates an assessed traits object...
function calculatePersonalityTraits(session) {
    var assessedTraits = [];
    checkValidUserDataProfile(session);
    if (!session.userData.profile.personalityTestAnswers) {
        logWarning("calculatePersonalityTraits,", session,"personalityTestAnswers was null");
    } else {
        var answers = session.userData.profile.personalityTestAnswers;
        
        personalityAssessmentData.traits.forEach(function (trait) {
            var score = calculateDimensionTrait(trait.dimension, answers);
           
            if (score > 0) {
                var index = (score > 50 ? 1 : 0);
                //reverse the score if needed to always be positive towards a trait...
                score = (score > 50 ? score : 100 - score);

                var dominantIndex = index;
                var subordinateIndex = index ? 0 : 1;

                assessedTraits.push({
                    dimension: trait.dimension,
                    score: score,
                    dominantTrait: trait.pair[index].trait,
                    en: trait.pair[index].en,
                    description: trait.pair[index].description,
                    valueData: trait.pair[index].valueData,
                    details: {
                        version: 1,
                        dimension: {
                            score: score,
                            name: trait.dimension,
                            dominantTrait: trait.pair[dominantIndex].detail,
                            subordinateTrait: trait.pair[subordinateIndex].detail
                        }
                    }
                })
            }
        }, this);
        
    }
    return assessedTraits;
}

function calculateDimensionTrait(type, answers) {
    
    //first get all the questions that are relevant to the trait

    //first filter those answers for one trait
    //check the direction and reverse if needed
    //10, 30, 70, 90
    //take the average score...
    var qIds = [];
    var typeAnswers = [];
    var typeScore;    

    console.log("calculateDimensionTrait " + type + " answers:", util.inspect(answers)); 


    //find the relevant Qs
    var relevantQs = personalityAssessmentData.questions.filter(function (q) {
        if (q.dimension == type) {
            qIds.push(q.id);
        }
        return q.dimension == type;
    })
    console.log("calculateDimensionTrait " + type + " relevantQs:", util.inspect(relevantQs)); 

    //if we found any relevant Qs, look through the answers...    
    if (relevantQs && relevantQs.length > 0) {
        for (var i = 0; i < answers.length; i++) {
            if (qIds.contains(answers[i].questionId))
            {
                typeAnswers.push(answers[i].answer);
            }
        }
    };
    console.log("calculateDimensionTrait " + type + "  typeAnswers:", util.inspect(typeAnswers)); 


    //now get the average of the scores...    
    if (typeAnswers.length > 0) {
        var summedScore = 0;
        typeAnswers.forEach(function(score) {
            summedScore += score;
        }, this);
        typeScore = Math.round(summedScore / typeAnswers.length);
    }

     console.log("calculateDimensionTrait  " + type + "  typeScore:", typeScore);    
    return typeScore;
}

//renders and saves the results back to BJ
bot.dialog('/renderPersonalityResults', [
    function (session, args, next) {
    
        var profileURL = getSeekerProfileUrl(session);

        
    /*
       Logged in:
    Well done!
    Here are your best personality traits, which I'll show employers on your Babajob.com profile too.
    You are:
    */    

      //      gettext("Here are your Babajob Personality Test Results. You are:", session));
       
        
        var resultSummary = gettext("Well done", session) + "! " +
            (profileURL ?
                gettext("Here are your best personality traits, which I'll show employers on your Babajob.com profile too.", session)
                : gettext("Here are your best personality traits. Send me your mobile number and I'll share these with employers on your Babajob.com profile.", session) ) 
                + " " + gettext("You are", session) + ":";
  

        //render a set of cards
        //Quiet - 65%
        //Your communication style is reserved rather than brash.
        //Take Quiz Again
        //Menu

        var traits = args;
        if (!(traits && traits.length)) {
            session.send(gettext("Hmmm... I did not seem to get any personality traits...", session));
        } else {
            session.send(resultSummary);

            savePersonalityTestResultsToBJ(traits, session);
            
            var heroCards = [];
            var commands = ["quiz", "menu"];
            
            traits.forEach(function (trait) {
                //only show strong results...
                var score = trait.score;
                if (score > 60) {
                    var title = gettext(trait.en, session) + " | " + score + "%";
                    var subtitle = gettext(trait.description, session);
                    heroCards.push(heroCardPersonalityTrait(title, subtitle, session));
                }
            }, this);

            
            var promptCommands = commands.join("|");

            var msg = new builder.Message(session)
                .attachmentLayout(builder.AttachmentLayout.carousel)
                .attachments(heroCards);

            logFunnel("", session, funnelSteps.Answered_Personality_Test + " Answered_Personality_Test", traits, "");
        
            
            var promptOptions = {};
            promptOptions.maxRetries = 0;
            builder.Prompts.choice(session, msg, promptCommands, promptOptions);
            
        }
    },
    function (session, results, next) {
        if (results.response && results.response.entity) {
            var action = results.response.entity;
            if (action == 'quiz') {
                session.replaceDialog("/quiz");
            }
            else if (action == 'menu') {
                session.replaceDialog("/menu");
            } else {
                session.replaceDialog("/menu");
            }
        } else {
            session.replaceDialog("/menu");
        }
    }
]);

//returns null if seeker has no profile...
function getSeekerProfileUrl(session) {
    var profileURL;
    var seekerId = getProfileAttribute("bjUserId", session);
    if (seekerId) {
        var name = getProfileAttribute("name", session);
        if (!name) {
            name = "p";
        } else {
            name = S(name).replaceAll(" ", "-").s;
        }    
        profileURL = bjWebDomain + "cv/" + name + "-" + seekerId;
    }
    return profileURL;
}

function heroCardPersonalityTrait(title, text, session) {
    var heroButtons = [];

    var profileURL = getSeekerProfileUrl(session);
    

    if (profileURL) {
        //var shareURL = "https://www.facebook.com/dialog/share?app_id=1582873155346889&display=popup&href=https%3A%2F%2Ffacebook.com%2Fbabajob%2F"
        //var shareURL = "https://www.facebook.com/sharer.php?u=http%3A%2F%2Fwww.babajob.com%2Fcv%2FSean-Blagsvedt-7872703  ;
       
        heroButtons.push(builder.CardAction.openUrl(
            session, profileURL, gettext("Your Babajob.com Profile", session)));
        
         var shareURL = "https://www.facebook.com/sharer.php?u=" + encodeURI(profileURL);
          heroButtons.push(builder.CardAction.openUrl(
            session, shareURL, gettext("Share with Friends!", session)));
    } else {
        heroButtons.push(
            builder.CardAction.imBack(session, "askMobile", gettext("Create your Profile", session))
        );
    }

    //menu...    
    heroButtons.push(
        builder.CardAction.imBack(session, "menu", "🏠 " + gettext("Menu", session))
    );

    /*
    Logged in:
    
    Imaginative:
        Your Babajob.com Profile
        Share with Friends
        Back to Menu
    */

    /*
    Not logged:
       
      Imaginative:
        Create your Profile
        Back to Menu

        */
    
  
        /*
    heroButtons.push(
        builder.CardAction.imBack(session, "quiz", gettext("Redo Test", session))
    );
    */    


    return new builder.HeroCard(session)
        .title(title)
        .text(text)
        /*
        .images([
            builder.CardImage.create(session, job.imageURL)
                .tap(builder.CardAction.openUrl(session, job.URL))
        ])
        */
        .buttons(heroButtons);
}

function savePersonalityTestResultsToBJ(traits, session) {
    //locally save the results so that the quiz is not listed first...
    setProfileAttribute("tookPersonalityQuiz", true, session);

    var assessments = [];
    traits.forEach(function (trait) {
        assessments.push(getPersonalityTraitJSONForBJSave(trait, session));
    }, this);

    console.log("Saving assessments...");    
    console.log(util.inspect(assessments));    

    if (assessments.length > 0) {
        //save the data to babajob...

        var jobSeekerId = getProfileAttribute("jobSeekerId", session);
        var accessToken = getProfileAttribute("accessToken", session);

        if (!(accessToken && jobSeekerId)) {
            console.log("savePersonalityTestResultsToBJ not logged in. assessments: ", util.inspect(assessments));
        } else {
            var uri = bjAPIDomain + "/v2/jobseekers/" + jobSeekerId;
            request({
                uri: uri,
                method: "POST",
                timeout: 30000,
                accept: "application/json",
                contentType: "application/json",
                headers: {
                    'Authorization': accessToken,
                    'consumer-key': consumerKey,
                },
                json: { assessments: assessments }
            }, function (error, response, body) {
                if (error) {
                    handleError("savePersonalityTestResultsToBJ", session, error, assessments,
                        "Sorry, I failed to save your data back to Babajob."
                        , uri, body);
                } else {
                    let seekerObj;
                    try {
                        seekerObj = body;
                        console.log("Saved new asessments on " + jobSeekerId);
                        console.log(util.inspect(assessments));
                        console.log(util.inspect(seekerObj));
                
                    } catch (e) {
                        handleError("savePersonalityTestResultsToBJ", session, e, assessments,
                            "exception while parsing JSON:"
                            , uri, body);
                    }
                }
            }
            );
        }
    }
}

function getPersonalityTraitJSONForBJSave(trait, session) {
    var attributeName = trait.dimension;
    var assessment;

    //find the matching assessment...
    var matchingValues = personalityAssessmentData.assessments.filter(function (i) { return i.attributeName == attributeName });
    if (matchingValues && matchingValues.length > 0) {
        assessment = matchingValues[0];
    }
    //console.log("getPersonalityTraitJSONForBJSave asessment" + util.inspect(assessment));

    var putData = JSON.parse(JSON.stringify(assessment));

    if (putData.options) {
        delete putData.options;
    }  

    putData.value = {
        date: new Date(),
        logo: WORLD_BANK_LOGO_URL,
        by: "World Bank Babajob Personality Test",
        score: trait.score,
        value: trait.valueData.value,
        id: trait.valueData.id,
        max: trait.valueData.max,
        min: trait.valueData.min,
        details: trait.details
    }

       // console.log("getPersonalityTraitJSONForBJSave putData" + util.inspect(putData));
    
    return putData;
}


//////////////////////////////////////////////////////////
/////// AMAZON COUPON ////////////////////////////////////
//////////////////////////////////////////////////////////

//Determines whether we should ask for questions to build the profile OR simply show the menu...
bot.dialog('/amazonCoupon', [
    function (session, args, next) {
        checkValidUserDataProfile(session);
        var text = gettext("To get a Rs50 Amazon coupon, you just need to add your verified mobile number in this chat and describe why you should be hired. We'll then verify your facebook id and unique mobile number on babajob and send you a coupon within 48 hours. Offer expires Jan 30, 2016.", session);
        session.send(text);
        var mobile = getProfileAttribute("mobile", session);
        if (!mobile) {
            session.beginDialog("/askForBabajobMobile");
        } else {
            next();
        }
    },


    function (session, results, next) {
        var aboutMe = getProfileAttribute("aboutMe", session);
        if (!aboutMe) {
            session.beginDialog("/askAboutMe");
        } else {
            next();
        }
    },

        //check for verified mobile...
    function (session, results, next) {
        var mobileVerified = getProfileAttribute("mobileVerified", session);
        if (!mobileVerified) {
            //ask them to verify their mobile...
            var msg = gettext("I need to verify your mobile number.", session);
            session.send(msg);
            session.beginDialog('/askForMobileOTP');
        } else {
            //jump to next step if mobile is verified...
            next();
        }
    },
    
    function (session, results,next) {
        var text = gettext(
            "Great. It looks like you've already described yourself and provided your mobile. You should receive your Amazon code via SMS shortly.  If not, please email support@babajob.com with your mobile number.", session);
        session.send(text);
        session.endDialog();
    }
]);
//bot.beginDialogAction('amazonCoupon', '/amazonCoupon', { matches: /^amazonCoupon/i });




/////////////////////////////////////////////////////////
//// ERROR HANDLING  ////////////////////////////////////
/////////////////////////////////////////////////////////

/* Errors:
Unknown input
- who's the user userId, fbId, Name,  :session
- last sent message : session
- function we were in
- data paramters passed / putData
- error message
- Hint for user to react:
- what to display to user? Error: FunctionName, errorMsg
for API
- uri called
- body returned


API Fail

ERROR: GetProfileID
ERROR: Sean Blagsvedt, FBID: 23408934, BJ: 1232022, BJ SeekerID: 230983204
ERROR: lastMessage: F Me
ERROR: error Message: Exception something
ERROR: URI: HTTPS://apisomething
ERROR: Parameters: inspect parameters / putData
ERROR: Body: What we got back.
ERROR: user Error Message: Something went wrong:

*/

function handleError(functionName, session,
    errorDetails, parameters,
    userMsg, uri, responseBody, hideErrorInfoToUser)
{
    var logType = "ERROR";
    log(logType, functionName, session,
        errorDetails, parameters,
        userMsg, uri, responseBody, hideErrorInfoToUser);
};

function logWarning(functionName, session, warningDetails, parameters)
{
    var logType = "WARNING";
    log(logType, functionName, session, warningDetails, parameters);
}


function logFunnel(intent, session, funnelstep, entities, botmessage)
{
    //don't repeat log funnel steps...
    var step = getProfileAttribute(funnelstep, session);
    if (!step) {        
        log("FUNNEL", intent, session, funnelstep, entities, botmessage);    
        saveProfileAttribute(funnelstep, true, session);
    } else {
        if (funnelstep == funnelSteps.Applied_for_a_Job + " Applied_for_a_Job") {
            logFunnel(intent, session, funnelSteps.Applied_2_Times + " Applied_2_Times", entities, botmessage);
        }
    }
}

function logFeedback(session)
{
    var logType = "FEEDBACK";
    log(logType, "", session, "", "");
}


function log(logType, functionName, session,
        details, parameters,
        botmessage, uri, responseBody, hideErrorInfoToUser)
{
    var user;
    var userInfo;
    var lastMessage;
    
    try {
        if (session) {
            if (session.message) {
                lastMessage = session.message.text || "No Text Sent in Last Message";
            }
            if (session.userData && session.userData.profile) {
                user = session.userData.profile;
                userInfo = user.name + ", facebookId:" + user.facebookId + ", bjUserId:"
                    + user.bjUserId + ", mobile:" + user.mobile + ", jobSeekerId:" + user.jobSeekerId;
            }
        }

        if (logType != "FUNNEL") {
            console.log(logType + ':', functionName);
            console.log(logType + ': lastMessage:', lastMessage);
            console.log(logType + ': details:', util.inspect(details, { showHidden: false, depth: null }));
            if (uri) {
                console.log(logType + ': uri:', uri);
            }
            if (parameters) {
                console.log(logType + ': parameters:', parameters);
            }
            console.log(logType + ':', userInfo);
            if (responseBody) {
                responseBody = util.inspect(responseBody, { showHidden: false, depth: 5 })
                console.log(logType + ': responseBody:', responseBody);

            } else {
                console.log(logType + ': responseBody: was null or undefined');
            }
            if (botmessage) {
                console.log(logType + ': botMessage:', botmessage);
            }
        }


        
        //Save errors      
        if (logType == "ERROR") {
            details = util.inspect(details, false, 10);
            gsLogger.logError(functionName, session,
                details, parameters,
                botmessage, uri, responseBody, onProduction);
        
            //show the user an error message            
            if (session) {
                var msgToUser = "💩 Sorry, I had an error: " +
                    functionName + "\n" + details + (botmessage ? ".\n " + botmessage : "");
                if (hideErrorInfoToUser) {
                    msgToUser = botmessage;
                }
                session.endDialog(msgToUser);
            }
        }
        
        //Log Funnel Events
        if (logType == "FUNNEL") {
            var language = getProfileAttribute("preferredLang",session);
            gsLogger.logFunnelStep(functionName, session, details, parameters, botmessage, onProduction, language);
        
        }

        //Log Funnel Events
        if (logType == "FEEDBACK") {
            gsLogger.logFeedback(session, onProduction);
        
        }
    }
    catch (e) {
        console.log(logType + ':log!', functionName + "Exception:" + e);
    }
}


var funnelSteps = {
    Sent_Initial_Message: 1,
    Answered_Lang: 2,
    Answered_Location: 3,
    Answered_Category: 4,
    Applied_for_a_Job: 5,
    Added_Mobile: 6,
    Verified_Mobile: 7,
    Got_Provisioned_with_BJ_UserID: 8,
    Added_Pincode: 9,
    Added_map_Location: 10,
    Added_About_Me: 11,
    Got_Back_a_Virtual_Number: 12,
    Added_RichDoc: 13,
    Got_a_Parsed_RichDoc: 14,
    Attempted_Voice_Test: 15,
    Scored_60_on_Voice_Test: 16,
    Rated_Chat_Bot: 17,
    Shared_Chat_Bot: 18,
    Applied_2_Times: 19,
    Applied_3_Times: 20,
    Answered_Job_Screening_Q: 21,
    Had_Second_Conversation: 22,
    Started_Personality_Test: 24,
    Answered_Personality_Test: 25,
}





/////////////////////////////////////////////////////////
//// SAVE BJ DATA ///////////////////////////////////////
/////////////////////////////////////////////////////////

//The big ass array of attribute values and options that we can use to save to Babajob.
var attributeFeatures = {
    "education":
    {
        "attributeId": 261,
        "attributeName": "Qualification",
        "classification": "Qualification",
        "dataType": "Qualification",
        "attributeType": "SingleValue",
        "options": [
            { "id": 0, "answerOptionId": 6071, "name": "Never been to School", "duration": 0 },
            { "id": 1, "answerOptionId": 6072, "name": "Less than 5th standard", "duration": 0 },
            { "id": 5, "answerOptionId": 6073, "name": "5th standard", "duration": 0 },
            { "id": 8, "answerOptionId": 6074, "name": "8th standard", "duration": 0 },
            { "id": 10, "answerOptionId": 6075, "name": "10th standard", "duration": 0 },
            { "id": 12, "answerOptionId": 6076, "name": "12th standard", "duration": 0 },
            { "id": 14, "answerOptionId": 6077, "name": "Diploma", "duration": 0 },
            { "id": 16, "answerOptionId": 6078, "name": "Bachelors", "duration": 0 },
            { "id": 18, "answerOptionId": 6079, "name": "Masters", "duration": 0 },
            { "id": 19, "answerOptionId": 6080, "name": "PHD", "duration": 0 }
        ]
    },
    "gender":
    {
        "attributeId": 4, "attributeName": "Gender", "classification": "Profile",
        "dataType": "Default",
        "attributeType": "SingleValue",
        "options":
        [{ "id": 1, "value": "Male", "answerOptionId": 4346, "labelSeeker": "Male", "labelPost": "Male" },
        { "id": 2, "value": "Female", "answerOptionId": 4347, "labelSeeker": "Female", "labelPost": "Female" }]
    },
    "city":
    {
        "attributeId": 2,
        "attributeName": "Location",
        "classification": "Profile",
        "dataType": "Address",
        "attributeType": "SingleValue",
        "options": [
            { "locality": "Bangalore" },  //city level address
        ]
    },
    "cityPrecise":
    {
        "attributeId": 2,
        "attributeName": "Location",
        "classification": "Profile",
        "dataType": "Address",
        "attributeType": "SingleValue",
        "options": [
            
            //exact address
            {
                "isVerified": false,
                "formatted_address": "",
                "landmark": "",
                "location": { "longitude": 76.938379, "latitude": 10.9435131 },
                "postal_code": "560001",
                "country": "India",
                "locality": "Bangalore",
                "confidence": 100
            }
        ]
    },
    "profile_pic":
    {
        "attributeType": "SingleValue",
        "attributeId": 5,
        /*
        "value":
        {
            "name": "ProfilePic",
            "has": true,
            //"uploaded": "services/getimage.aspx?id=919165"
            
        },
        */
        "attributeName": "ProfilePic",
        "dataType": "Document",
        "classification": "Profile"
    },
    
    "category":
    {
        "attributeId": 260,
        "attributeName": "JobCategory",
        "attributeType": "MultiValue",
        "dataType": "Default",
        "classification": "JobPreference",
        //"options": [{ "value": "DRIVER", "id": 0, "has": true, "answerOptionId": 6051 }]

        "options": [
            { "id": 0, "name": "Driver" },  //must be first.... see  getAttributeJSONForBJSave
            { "id": 1, "name": "Maid/Housekeeping" },
            { "id": 2, "name": "Cook" },
            { "id": 3, "name": "Aayah/Child Caretaker" },
            { "id": 4, "name": "Gardener" },
            { "id": 5, "name": "Security/Guard" },
            { "id": 6, "name": "Construction/Laborer" },
            { "id": 7, "name": "Garment Tailor/Textile" },
            { "id": 8, "name": "Office Helper" },
            { "id": 9, "name": "Delivery/Collection Logistics" },
            { "id": 10, "name": "Receptionist/Front Office" },
            { "id": 11, "name": "Other" },
            { "id": 12, "name": "Maid Who Can Cook" },
            { "id": 13, "name": "Data Entry/Back Office" },
            { "id": 14, "name": "Cashier/Retail" },
            { "id": 15, "name": "Nurse/Healthcare" },
            { "id": 16, "name": "IT Software/Hardware" },
            { "id": 17, "name": "Machinist/ITI Trades" },
            { "id": 18, "name": "Sales/Marketing" },
            { "id": 19, "name": "BPO/Call Center" },
            { "id": 20, "name": "Management" },
            { "id": 21, "name": "Teacher/Trainer" },
            { "id": 22, "name": "Finance/Accounts" },
            { "id": 23, "name": "Engineering" },
            { "id": 24, "name": "Beautician/Salon" },
            { "id": 25, "name": "Steward/Hospitality" }]
    },

    "age":
    {
        "attributeId": 3,
        "attributeName": "Age",
        "attributeType": "SingleValue",
        "dataType": "Date",
        "classification": "Profile",
        "options": []
    },
    "aadhaar":
    {
        "attributeId": 46,
        "attributeName": "AadharCard",
        "classification": "Document",
        "dataType": "Document",
        "attributeType": "SingleValue",
        "options": []
        /*
           [ { value:
                { id: 0,
                  name: 'AadharCard',
                  isVerified: false,
                  confidence: 0,
                  properties: [ { key: 'AadharNumber', value: '982723492348' } ],
                  has: true },
               attributeId: 46,
               attributeName: 'AadharCard',
               attributeType: 'SingleValue',
               classification: 'Document',
               dataType: 'Document' } ],
               */

    },
    "experience":
    {
        "attributeId": 263,
        "attributeName": 'TotalYearOfExperience',
        "classification": "Profile",
        "dataType": "Number",
        "attributeType": "SingleValue",
        "options": []
    },
    "salary":
    {
        "attributeId": 1,
        "attributeName": "ExpectedSalary",
        "attributeType": "SingleValue",
        "dataType": "Number",
        "classification": "Profile",
        "options": []
    }
};


function getAttributeJSONForBJSave(attribute, session)
{
    var newValue = getProfileAttribute(attribute, session);

    if (S(attribute).contains("city")) {
        console.log("getAttributeJSONForBJSave for city attribute: " +
            attribute + " newValue: "
            + util.inspect(newValue, { showHidden: false, depth: null }));
    }    

    var features = attributeFeatures[attribute];
    var bjValue = null;
    var putData = {};

    //console.log("trying to set age newValue:" + newValue + " features:", util.inspect(features));

    //special case zero value of category (Driver)
    if ((newValue || (attribute == "category")) && features) {
        //var cloneOfA = JSON.parse(JSON.stringify(a));
        putData = JSON.parse(JSON.stringify(features));
               
        console.log("getAttributeJSONForBJSave attribute: " + attribute);
        console.log("getAttributeJSONForBJSave newValue: " + newValue);
        
        //Now set the value...
        if (attribute == "education") {
            var matchingValues = features.options.filter(function (i) { return i.name == newValue });
            if (matchingValues && matchingValues.length > 0) {
                bjValue = matchingValues[0];
            }
        }
        
        if (attribute == "gender") {
            var matchingValues = features.options.filter(function (i) {
                return i.value.toLowerCase() == newValue.toLowerCase();
            });
            if (matchingValues && matchingValues.length > 0) {
                bjValue = matchingValues[0];
            }
        }


        if (attribute == "category") {
            console.log("setting category... newValue", newValue);
            //{ "id": 25, "name": "Steward/Hospitality" }]
            //"options": [{ "value": "DRIVER", "id": 0, "has": true, "answerOptionId": 6051 }]
            //newValue is an Array....
            
            var matchingValues = features.options.filter(function (i) {
                return (newValue.contains(i.id.toString()) || newValue.contains(i.id));
            });

            /*
            //special case driver...            
            if (matchingValues.length == 0 && newValue == null) {
                matchingValues.push(features.options[0]);
            }
            */

            console.log("setting category... matchingValues", matchingValues);
            if (matchingValues && matchingValues.length > 0) {
                //matchingValues[0];
                var newCats = [];
                matchingValues.forEach(function (element) {
                    var categoryValue = {};
                    categoryValue.value = element.name;
                    categoryValue.id = element.id;
                    categoryValue.has = true;
                    newCats.push(categoryValue);
                }, this);
                
                bjValue = newCats;
            }
            console.log("setting category... bjValue", util.inspect(bjValue));
        }

        if (attribute == "city") {
            bjValue = {};
            bjValue.locality = newValue;
        }

        if (attribute == "cityPrecise") {
            bjValue = newValue;
        }

        if (attribute == "age") {
            bjValue = newValue;
            console.log("trying to set age after:" + bjValue);
        }

        if (attribute == "experience") {
            bjValue = newValue;
        }

        if (attribute == "salary") {
            bjValue = newValue;
        }

        if (attribute == "aadhaar") {
            bjValue =
                {
                    id: 0,
                    name: 'AadharCard',
                    isVerified: false,
                    confidence: 1,
                    properties: [{ key: 'AadharNumber', value: newValue }],
                    has: true
                }

            /*
        value:
        { id: 0,
          name: 'AadharCard',
          isVerified: false,
          confidence: 0,
          properties: [ { key: 'AadharNumber', value: '982723492348' } ],
          has: true }
            
            */
            //bjValue = newValue;
        }

        if (attribute == "profile_pic") {
            bjValue =
                {
                    name: "ProfilePic",
                    has: true,
                    uploaded: newValue
                }
        }

        //remove the options data from the object if needed...
        if (putData.options) {
            delete putData.options;
        }    
    }  

    if (bjValue != null) {
        putData.value = bjValue;
    } else {
        putData = null;
    }
    console.log("getAttributeJSONForBJSave "+ attribute + " putData: " + util.inspect(putData, { showHidden: false, depth: null }));

    //console.log("getAttributeJSONForBJSave: " + util.inspect(putData, { showHidden: false, depth: null }));
    return putData;
}  

function saveAttributesToBJ(_attributes, session) {
    var attributes = _attributes || [];
    checkValidUserDataProfile(session);

    var jobSeekerId = getProfileAttribute("jobSeekerId", session);   
    var accessToken = getProfileAttribute("accessToken", session);
    
    var okToSave = (accessToken && jobSeekerId);

    var jsonArrayOfPutData = [];
    for (var i = 0; i < attributes.length; i++) {
        if (session.userData.profile.hasOwnProperty(attributes[i])) {
            if (okToSave && attributes[i] == "profile_pic") {
                //special case save the photo...
                saveFBProfilePicToBJ(
                    getProfileAttribute("profile_pic", session), session);
            }
            //special case aboutMe, name
            else if (okToSave && (attributes[i] == "aboutMe" || attributes[i] == "name")) {
                saveSeekerPropertyToBJ(attributes[i], getProfileAttribute(attributes[i], session), session);
            } else {
                var attributePutData = getAttributeJSONForBJSave(attributes[i], session);
                if (attributePutData) {
                    jsonArrayOfPutData.push(attributePutData);
                }
            }
        }
    }    


    if (jsonArrayOfPutData.length > 0) {
        if (!(okToSave)) {
            /*
            console.log("saveAttributesToBJ missing accessToken or jobSeekerId or jsonArrayOfPutData");
            console.log("saveAttributesToBJ missing session.userData: "
                + util.inspect(session.userData, { showHidden: false, depth: null }));
            console.log("saveAttributesToBJ missing jsonArrayOfPutData: "
                + util.inspect(jsonArrayOfPutData, { showHidden: false, depth: null }));
            */
            console.log("saveAttributesToBJ not logged in. Attributes: ", util.inspect(attributes));
            //logWarning("saveAttributesToBJ", session, "no accessToken or jobSeekerId");
            /*
            handleError("saveAttributesToBJ", session, "missing parameters: jobSeekerId:  " + jobSeekerId
                + " accessToken:" + accessToken + " jsonArrayOfPutData: " + jsonArrayOfPutData, jsonArrayOfPutData,
                "Not enough parameters while saving FB Data to Bababjob...");
            */
        } else {
            var uri = bjAPIDomain + "/v2/jobseekers/" + jobSeekerId + "/attributes";
            request({
                uri: uri,
                method: "POST",
                timeout: 30000,
                accept: "application/json",
                contentType: "application/json",
                headers: {
                    'Authorization': accessToken,
                    'consumer-key': consumerKey,
                },
                json: jsonArrayOfPutData
            }, function (error, response, body) {
                if (error) {
                    handleError("saveAttributesToBJ", session, error, jsonArrayOfPutData,
                        "Sorry, I failed to save your data back to Babajob."
                        , uri, body);
                } else {
                    let seekerObj;
                    try {
                        seekerObj = body;
                    } catch (e) {
                        handleError("saveAttributesToBJ", session, e, jsonArrayOfPutData,
                            "exception while parsing JSON:"
                            , uri, body);
                    }
                    console.log("Saved new Attributes: " + attributes.join(',') + " on " + jobSeekerId);
                }
            }
            );
        }
    }    
}


/*
http://preprodapi.babajob.com/v2/jobseekers/{userid}

Request : 
{
"user": {
    "aboutMe": "I am looking job",
    "contactDetails": [
      {
        "contactType": 2,
        "isVerified": true,
        "value": "9686524225"
      }
    ],
    "name": {
      "firstName": "Moorthy"
    },
    "userID": 8061738
  }
}
*/

function saveSeekerPropertyToBJ(property, value, session) {
    var bjUserId = getProfileAttribute("bjUserId", session);
    var jobSeekerId = getProfileAttribute("jobSeekerId", session);
    var accessToken = getProfileAttribute("accessToken", session);

    if (!(bjUserId)) {
        handleError("saveSeekerPropertyToBJ", session, "bjUserId was null", property + ':' + value);
    } else if (!jobSeekerId) {
        handleError("saveSeekerPropertyToBJ", session, "jobSeekerId was null", property + ':' + value);
    } else if (!accessToken) {
        handleError("saveSeekerPropertyToBJ", session, "accessToken was null", property + ':' + value);
    }
    
    else {
        var data = { "user": {} };
        if (property == "aboutMe") {
            data.user.aboutMe = value;
        }
 
        if (property == "name") {
            data.user.name = {};
            var nameParts = value.split(" ");
            var firstName, lastName;
            if (nameParts.length > 0) {
                firstName = nameParts[0];
                data.user.name.firstName = firstName;
   
                if (nameParts.length == 2) {
                    lastName = nameParts[1];
                } else {
                    lastName = nameParts.join(" ");
                    lastName = S(lastName).chompLeft(firstName + ' ').s;
                }
                if (lastName) {
                    data.user.name.lastName = lastName;
                }
            }
            //ensure local data repo is sync'd
            setProfileAttribute("firstName", firstName, session);
            setProfileAttribute("lastName", lastName, session);
        }
    
        var uri = bjAPIDomain + "/v2/jobseekers/" + jobSeekerId;
        request({
            uri: uri,
            method: "POST",
            timeout: 30000,
            accept: "application/json",
            contentType: "application/json",
            headers: {
                'Authorization': accessToken,
                'consumer-key': consumerKey,
            },
            json: data
        }, function (error, response, body) {
            if (error) {
                handleError("saveSeekerPropertyToBJ", session, error, data,
                    "Sorry, I failed to save your data back to Babajob."
                    , uri, body);
            } else {
                let seekerObj;
                try {
                    seekerObj = body;
                    console.log("Trying to Save new property: " + property + ":" + value + " for:" + bjUserId);
                    console.log(util.inspect(data));
                    console.log(util.inspect(body));
                    if (S(body).contains("Error")) {
                        logWarning("saveSeekerPropertyToBJ:AboutMe", session, body, data);
                    } else {
                        console.log("Saved new property: " + property + ":" + value + " for:" + bjUserId);
                    }
                } catch (e) {
                    handleError("saveSeekerPropertyToBJ", session, e, data,
                        "exception while parsing JSON:"
                        , uri, body);
                }
            }
        }
        );
    }
}


/*
//https://github.com/request/request#forms
//https://github.com/form-data/form-data
*/

function saveFBProfilePicToBJ(picUrl, session) {
    var bjUserId = getProfileAttribute("bjUserId", session);
    var jobSeekerId = getProfileAttribute("jobSeekerId", session);
    var accessToken = getProfileAttribute("accessToken", session);

    if (!S(picUrl).contains("getimage")) {
        //hack to ensure we are not over-writing the image with the same image...
        
        if (!(picUrl && bjUserId && jobSeekerId && accessToken)) {
            handleError("saveAttributesToBJ", session, " missing picUrl:" + picUrl + " bjUserId: " + bjUserId
                + " jobSeekerId:" + jobSeekerId + " or accessToken:" + accessToken, null,
                "Not enough parameters while saving FB Pic to Bababjob...");
        } else {
            var uri = bjAPIDomain + "/api/jobseeker/" + bjUserId + "/profilepic";

            var formData = {
        
                //my_file: ,
                // Pass optional meta-data with an 'options' object with style: {value: DATA, options: OPTIONS}
                // Use case: for some types of streams, you'll need to provide "file"-related information manually.
                // See the `form-data` README for more information about options: https://github.com/form-data/form-data
        
                //attachments: [  request(picUrl) ],
        
                custom_file: {
                    value: request(picUrl),
                    options: {
                        filename: 'image.png',
                        contentType: 'image/*'
                    }
                    //"file\"; filename=\"image.png\"")
                }
            };

            request({
                uri: uri,
                method: "POST",
                timeout: 45000,
                contentType: "multipart/form-data",
                headers: {
                    'Authorization': accessToken,
                    'consumer-key': consumerKey,
                    'ProfileId': jobSeekerId
                },
                formData: formData
            }, function (error, response, body) {
                if (error) {
                    handleError("saveFBProfilePicToBJ", session, error, null,
                        "error while saving your facebook photo..."
                        , uri, body);
                } else {
                    console.log("Saved new picture " + body);
                }
            }
            );
        }
    }
}    

//////////////////////////////////////////////////////////
///// DATA PARSING HELPER FUNCTIONS //////////////////////
//////////////////////////////////////////////////////////

function employerCompanyNameOrName(job) {

/*
 employer:
      { employerId: '57d5529ab4490e71f5379e09',
        user:
         { userID: 5069081,
           name:
            { firstName: 'Sripad',
              lastName: '',
              salutation: 'MR',
              middleName: null } },
        organisation: { name: 'Surabhi Ventures' } },
    
     { employerId: '57d55566b4490e71f53af1fa',
     user: { userID: 7533544 },
     organisation: { name: 'AIMS Training Academy' } },
    */
    
    var name = "Employer";
    if (job.employer) {
        if (job.employer.organisation && job.employer.organisation.name) {
            name = job.employer.organisation.name;
        } else if (job.employer && job.employer.user && job.employer.user.name) {
            name = job.employer.user.firstName + " " + job.employer.user.lastName;
        }
    }
    return name;
}



/* --------------------------------------------
Locatization
-----------------------------------------------*/

function gettextForArray(arr, session) {
    let localizedMenu = {};
    for (var i = 0; i < arr.length; i++) {
        let key = gettext(arr[i].en, session);
        localizedMenu[key] = { value: arr[i].value };
    }
    //console.log("gettextForArray: " + util.inspect(localizedMenu, { showHidden: false, depth: null }));
    return localizedMenu;
}


/* gettext("Hello",session);

returns back text if no matches
If English finds a match, get the localized version
*/

function gettext(englishText, session, hideReplyWithNumber) {
    var preferredLang = 'en';
    var returnText = englishText;
    if (!session) {
        logWarning("GetText - no session", null, englishText);
        return returnText;
    }
    if (session && session.userData && session.userData.profile && session.userData.profile.preferredLang) {
        preferredLang = session.userData.profile.preferredLang;
    }
    
    var textObjs = strings.filter(function (text) { return text.en == englishText });
    if (textObjs && textObjs.length > 0) {
        var textObj = textObjs[0];
    
        var foundText = textObj[preferredLang];
        
        if (foundText) {
            returnText = foundText;
        } else {
            logWarning("gettext - missing translation", session, englishText, preferredLang);
        }
    }

    //check for whether we should add "Reply with a number:" to the end of questions "?"
    //Reply with number
    
   

    //check to see if we should add "reply with number" to questions...    
    if (!hideReplyWithNumber && S(returnText).endsWith('?')) {
        checkValidUserDataProfile(session);
        if (session.userData.profile.listStyle != builder.ListStyle["auto"]) {
            returnText += " (" + gettext("Reply with a number", session) + ")";
        }    
    }

    /*    
    if (!hideReplyWithNumber && session.userData && session.userData.profile
        && session.userData.profile.listStyle)
    {
        listStyle = session.userData.profile.listStyle;
        if (listStyle == builder.ListStyle["list"]
            && S(returnText).endsWith('?')
        ) {
            returnText += " (" + gettext("Reply with a number", session) + ")";
        }
    }       
    */
    
        
    //  console.log("gettext input: " + englishText + " output:" + returnText + " session.userData.profile " + util.inspect(session.userData.profile, { showHidden: false, depth: null }));
    return returnText;
}

/*
export interface IPromptOptions {
    retryPrompt?: string|string[]|IMessage|IIsMessage;
    maxRetries?: number;
    refDate?: number;
    listStyle?: ListStyle;
    promptAfterAction?: boolean;
    localizationNamespace?: string;
}
 args.retryCnt++;
            this.sendPrompt(session, args, true);
*/

//I could not understand that. Please text back: Below 10th, 10th Pass, 12th Pass or College and Above".
function buildOptionsRetryPrompt(questionText, session, noRetries, forceButtons) {
    var options = {};

    //Set the liststyle depending on whether they can use buttons...
    //"auto|inline|list|button|none"
    //var listStyle = forceButtons ? "auto" : "list";

    options.listStyle = builder.ListStyle["list"];

    if (session.userData && session.userData.profile && session.userData.profile.listStyle) {
        options.listStyle = session.userData.profile.listStyle;
    }
    if (forceButtons) {
        options.listStyle = builder.ListStyle["auto"];
    }
    
    //set reprompt text
    var returnText = gettext("Sorry, I could not understand you.", session) + " " + questionText + " ";

    
    if (
        options.listStyle == builder.ListStyle["list"] &&
        (!
            (S(returnText).contains("(") && S(returnText).contains(")"))
        )) {
        returnText += gettext("Please reply with 'goodbye' or a number below", session);
    } else {
        returnText += gettext("Please reply with 'goodbye' or pick an option below", session);
    } 
    options.retryPrompt = returnText;

    //set retries    
    options.maxRetries = noRetries ? 0 : 2;
    return options;
}


        /*
        if (promptData.length == 1) {
            returnText += gettext("Please text back goodbye or:", session) + " " + promptData[0].en;
        } else {
            for (var i = 0; i < promptData.length; i++) {
                if (i == 0) {
                    returnText += gettext("Please text back goodbye or:", session) + "\n"
                }
                returnText += promptData[i].en;
                if (i == promptData.length - 2) {
                    returnText += "\n"// " or ";
                } else if (i == promptData.length - 1) {
                    //last one so don't add anything after
                } else {
                    returnText += "\n" // ", ";
                }
            }
        }
        */


Array.prototype.contains = function(obj) {
    var i = this.length;
    while (i--) {
        if (this[i] === obj) {
            return true;
        }
    }
    return false;
}

var educationMenu = [
    {
        en: "Below 10th",
        value: "8th standard"
    },
    {
        en: "10th Pass",
        value: "10th standard"
    },
    {
        en: "12th Pass",
        value: "12th standard"
    },
    {
        en: "College or Above",
        value: "Bachelors"
    }
];

var genderMenu = [
    {
        en: "♂ Man",
        value: "male"
    },
    {
        en: "♀ Woman",
        value: "female"
    }
    /*
    ,
    {
        en: "⚦ Transgender",
        value: "transgender"
    }
    */
];

var seekerOrEmployerMenu = [
    {
        en: "I need a job",
        value: "JOBSEEKER"
    },
    {
        en: "I want to hire",
        value: "EMPLOYER"
    }
];


var alreadyOnBabajobMenu = [
    {
        en: "No",
        value: false
    },
    {
        en: "Add my Mobile",
        value: true
    }
];

     

var categoryMenu10Male = [
    {
        en: "Driver",
        value: "0"
    },
    {
        en: "Delivery",
        value: "9"
    },
    {
        en: "Security",
        value: "5"
    },
    {
        en: "Steward",
        value: "25"
    },
    {
        en: "Chef",
        value: "2"
    },
    {
        en: "Office Helper",
        value: "8"
    },
    {
        en: "Housekeeping",
        value: "1"
    }
];

var categoryMenu12Male = [
    {
        en: "BPO/Call Center",
        value: "19"
    },
    {
        en: "Sales/Marketing",
        value: "18"
    },
    {
        en: "Driver",
        value: "0"
    },
    {
        en: "Cashier",
        value: "14"
    },
    {
        en: "Delivery",
        value: "9"
    },
    {
        en: "Teacher",
        value: "21"
    },
    {
        en: "Steward",
        value: "25"
    },
    {
        en: "Accountant",
        value: "22"
    },
    {
        en: "Machinist ITI",
        value: "17"
    }
];

var categoryMenu10Female = [
    {
        en: "Maid",
        value: "1"
    },
    {
        en: "Cook",
        value: "2"
    },
    {
        en: "Aayah",
        value: "3"
    },
	{
        en: "Beautician",
        value: "24"
    },
    {
        en: "Cashier",
        value: "14"
    },
    {
        en: "Nurse",
        value: "15"
    },

    {
        en: "BPO",
        value: "19"
    }
];


var categoryMenu12Female = [
    {
        en: "BPO",
        value: "19"
    },
    {
        en: "Cashier",
        value: "14"
    },
    {
        en: "Teacher",
        value: "21"
    },
    {
        en: "Data Entry",
        value: "13"
    },
    {
        en: "Accountant",
        value: "22"
    },
    {
        en: "Management",
        value: "20"
    },
    {
        en: "Nurse",
        value: "15"
    }
];

var cityMenu = [
    {
        en: "Bangalore",
        value: "Bangalore"
    },
    {
        en: "Delhi",
        value: "New Delhi"
    },
    {
        en: "Mumbai",
        value: "Mumbai"
    },
    {
        en: "Chennai",
        value: "Chennai"
    },
    {
        en: "Hyderabad",
        value: "Hyderabad"
    },
    {
        en: "Patna",
        value: "Patna"
    }
];


var governmentIDMenu = [
    {
        en: "Driving License",
        value: "DrivingLicense"
    },
    {
        en: "Aadhaar Card",
        value: "AadhaarCard"
    },
    {
        en: "PAN Card",
        value: "PANCard"
    },
    {
        en: "CV/Resume",
        value: "Resume"
    },
    
        {
        en: "Your Photo",
        value: "Photo"
    },
    
    {
        en: "Voter Card",
        value: "VoterID"
    },
    {
        en: "PaySlip",
        value: "PaySlip"
    },
    {
        en: "Company Card",
        value: "CompanyCard"
    },
    {
        en: "Ration Card",
        value: "RationCard"
    },
    {
        en: "Passport",
        value: "Passport"
    }
];

var carDocumentMenu = [
    {
        en: "Car Registration Certificate",
        value: "Car_Registration_Certificate"
    },
    {
        en: "Car Insurance Proof",
        value: "Car_Insurance_Proof"
    },
    {
        en: "Road Tax Receipt",
        value: "Road_Tax_Receipt"
    },
    {
        en: "Car Owner No Objection Certificate",
        value: "Car_Owner_No_Objection_Certificate"
    }
    /*,
    {
        en: "Car BSG Consent Form",
        value: "Car_BSG_Consent_Form"
    }
    */
    
];







var menuData = [
    {
        en: "🔍 Search Jobs",
        value: "SearchJobs", 
        pic: "",
        title: "🔍 Search Jobs",
        description: ""
    },
    {
        en: "📷 Add ID Proof",
        value: "AddIDProof"
    },
    {
        en: "💡 Personality Test",
        value: "PersonalityQuiz"
    },
    {
        en: "🎤 Record my Voice",
        value: "RecordMyVoice"
    },
    {
        en: "💼 Improve Profile",
        value: "ImproveProfile"
    },
    
    /*
    {
        en: "📱 Update Mobile",
        value: "restartEnsureMobile"
    },
    
    {
        en: "⭐ My Jobs",
        value: "AppliedJobs"
    },
    */
    {
        en: "🌐 Change Language",
        value: "language"
    },
    /*
    {
        en: "Amazon Coupon",
        value: "amazonCoupon"
    },
    */
    {
        en: "😊 Give Feedback",
        value: "giveFeedback"
    },
    /*
    {
        en: "❌ Delete Me",
        value: "delete"
    }
    */
    /*
    ,
    //Facebook demo prompts
    {
        en: "prompts",
        value: "prompts"
    },
    {
        en: "picture",
        value: "picture"
    },
    {
        en: "cards",
        value: "cards"
    },
    {
        en: "receipt",
        value: "receipt"
    },
    {
        en: "actions",
        value: "actions"
    }
    ,
    {
        en: "(quit)",
        value: "(quit)"
    }
    */
    //AddIDProof|prompts|picture|cards|carousel|list|receipt|actions|(quit)   
];

      // session.send("🔍 Search Jobs|⭐ My Jobs|💼 Edit Profile|⚙ Settings");


//(mag) Find Jobs, (Bell) Alerts, (Man) Edit Profile, (i) About

/*
var promptData = "jobs|prompts|picture";


var menuDataLocalized = {
    "Search Jobs in Hindi": {
        value: "SearchJobs"
    }
};

 function gettext(text, session) {
    return text + "H";
}

function runme() {
//    var myObj = gettextForArray(menuData, null);
//    alert("myObj" + myObj["jobsH"].value);
}
//runme();

*/ 


/* --------------------------------------------
Sample Dialogs From Microsoft Facebook Stack...
-----------------------------------------------*/

function getFBInfo(fbID, session, useTestToken, callback) {
    //var neverExpireToken = "EAAHWdFxriDMBAJ01ZAlfLlAirxSpHZANA4AmVsNFBdorskjJytTjMuMVUhZA3cjGZBdoVsgH5zUw4Ix4KFlfGjUyDqBZAVGrJCXEgYIxKEjSIde4I42tFLkgK8MVWKuZBk1CHqRfaAParV8UyzweijB3O7VlCZC27QZD";
    
    //works 
    //https://graph.facebook.com/v2.8/905716556224705?access_token=EAAWfnWAmIckBADdG8oP1WOqfJEk6gYnOPGloMfZC8Hkb6uZCblug5LABU4szNkKdyHJyNxDhomYqwKw9bUloBOqaFbLMnEKNzp8SwWdXpNaKJnI8ESr4Ylsw6UygzZApTr8UxpACNI0zVFfA89sgkkkYSPbZAlVG8INMZCuoCMwZDZD
    /*
    {
   "first_name": "Sean",
   "last_name": "Blagsvedt",
   "profile_pic": "https://scontent.xx.fbcdn.net/v/t1.0-1/14681799_10154405392511084_1926440463842494133_n.jpg?oh=818120036048e9c64664e62efa7f9378&oe=589818AE",
   "locale": "en_US",
   "timezone": 5.5,
   "gender": "male"
}
    
https://graph.facebook.com/v2.6/905716556224705?access_token=EAAWfnWAmIckBADdG8oP1WOqfJEk6gYnOPGloMfZC8Hkb6uZCblug5LABU4szNkKdyHJyNxDhomYqwKw9bUloBOqaFbLMnEKNzp8SwWdXpNaKJnI8ESr4Ylsw6UygzZApTr8UxpACNI0zVFfA89sgkkkYSPbZAlVG8INMZCuoCMwZDZD
fields=first_name,last_name&access_token=EAAWfnWAmIckBADdG8oP1WOqfJEk6gYnOPGloMfZC8Hkb6uZCblug5LABU4szNkKdyHJyNxDhomYqwKw9bUloBOqaFbLMnEKNzp8SwWdXpNaKJnI8ESr4Ylsw6UygzZApTr8UxpACNI0zVFfA89sgkkkYSPbZAlVG8INMZCuoCMwZDZD

        // 704336083// sean's on BJ
        // "905716556224705"; //sean's on the bot
        //10153157437126084 //sean's according to FB graph
*/

    //we need to try to hit facebook twice (once for production and again if running on test)    
    var token = useTestToken ?  facebookPreProductionToken : facebookBabajobProductionToken;
    
    FB.setAccessToken(token);

    console.log("Trying big FB");
    FB.api(fbID, function (fbUserObj) {
        if (!fbUserObj || !fbUserObj.timezone || fbUserObj.error) {
            if (!useTestToken) {
                //default case... so recall the FB API using the test token...
                getFBInfo(fbID, session, true, callback); 
            } else {
                //if testToken also fails, then error out.
                var errorMsg = !fbUserObj ? 'ERROR: FB error occurred' : fbUserObj.error;
                console.log(errorMsg);      
                if (callback) {
                    callback(errorMsg);
                }    
                return;
            }
        } else {
            setProfileInfoFromFacebookInfo(fbUserObj, session);
            if (callback) {
                callback(null, fbUserObj);
            }    
        }
    });
}

function setProfileInfoFromFacebookInfo(res, session) {
    console.log("Got big FB " + util.inspect(res, { showHidden: false, depth: null }));
        
    //save FB info:
    if (res.profile_pic) {
        setProfileAttribute("profile_pic", res.profile_pic, session);
    }
    if (res.locale) {
        setProfileAttribute("locale", res.locale, session);
        setPreferredLanguageFromLocale(res.locale, session);
    }
    if (res.timezone) {
        setProfileAttribute("timezone", res.timezone, session);
    }
    if (res.gender) {
        setProfileAttribute("gender", res.gender, session);
    }
}

function setPreferredLanguageFromLocale(locale, session) {
    var defaultLang = "en";
    switch (locale) {
        case "hi_IN":
            defaultLang = "hi";
            break;
        case "ta_IN":
            defaultLang = "ta";
            break;
        case "kn_IN":
            defaultLang = "ka";
            break;
        case "pn_IN":
            defaultLang = "pn";
            break;
        case "te_IN":
            //defaultLang = "te";
            break;
        default:
            break;
    }
    setProfileAttribute("preferredLang", defaultLang, session);
}

bot.dialog('/help', [ 
    function (session) {
        session.endDialog("Global commands that are available anytime:\n\n* menu - Exits a demo and returns to the menu.\n* goodbye - End this conversation.\n* help - Displays these commands.");
    }
]);




bot.dialog('/prompts', [
    function (session) {
        session.send("Our Bot Builder SDK has a rich set of built-in prompts that simplify asking the user a series of questions. This demo will walk you through using each prompt. Just follow the prompts and you can quit at any time by saying 'cancel'.");
        builder.Prompts.text(session, "Prompts.text()\n\nEnter some text and I'll say it back.");
    },
    function (session, results) {
        session.send("You entered '%s'", results.response);
        builder.Prompts.number(session, "Prompts.number()\n\nNow enter a number.");
    },
    function (session, results) {
        session.send("You entered '%s'", results.response);
        session.send("Bot Builder includes a rich choice() prompt that lets you offer a user a list choices to pick from. On Facebook these choices by default surface using Quick Replies if there are 10 or less choices. If there are more than 10 choices a numbered list will be used but you can specify the exact type of list to show using the ListStyle property.");
        builder.Prompts.choice(session, "Prompts.choice()\n\nChoose a list style (the default is auto.)", "auto|inline|list|button|none");
    },
    function (session, results) {
        var style = builder.ListStyle[results.response.entity];
        builder.Prompts.choice(session, "Prompts.choice()\n\nNow pick an option.", "option A|option B|option C", { listStyle: style });
    },
    function (session, results) {
        session.send("You chose '%s'", results.response.entity);
        builder.Prompts.confirm(session, "Prompts.confirm()\n\nSimple yes/no questions are possible. Answer yes or no now.");
    },
    function (session, results) {
        session.send("You chose '%s'", results.response ? 'yes' : 'no');
        builder.Prompts.time(session, "Prompts.time()\n\nThe framework can recognize a range of times expressed as natural language. Enter a time like 'Monday at 7am' and I'll show you the JSON we return.");
    },
    function (session, results) {
        session.send("Recognized Entity: %s", JSON.stringify(results.response));
        builder.Prompts.attachment(session, "Prompts.attachment()\n\nYour bot can wait on the user to upload an image or video. Send me an image and I'll send it back to you.");
    },
    function (session, results) {
        var msg = new builder.Message(session)
            .ntext("I got %d attachment.", "I got %d attachments.", results.response.length);
        results.response.forEach(function (attachment) {
            console.log("Attachment data: " + util.inspect(attachment, { showHidden: false, depth: null }));
            msg.text("attachment data:" + attachment.contentType + " URL:" + attachment.contentUrl);
            msg.addAttachment(attachment);    
        });
        session.endDialog(msg);
    }
]);




bot.dialog('/picture', [
    function (session) {
        session.send("You can easily send pictures to a user...");
        var msg = new builder.Message(session)
            .attachments([{
                contentType: "image/jpeg",
                contentUrl: "http://www.theoldrobots.com/images62/Bender-18.JPG"
            }]);
        session.endDialog(msg);
    }
]);

bot.dialog('/cards', [
    function (session) {
        session.send("You can use either a Hero or a Thumbnail card to send the user visually rich information. On Facebook both will be rendered using the same Generic Template...");

        var msg = new builder.Message(session)
            .attachments([
                new builder.HeroCard(session)
                    .title("Hero Card")
                    .subtitle("The Space Needle is an observation tower in Seattle, Washington, a landmark of the Pacific Northwest, and an icon of Seattle.")
                    .images([
                        builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Seattlenighttimequeenanne.jpg/320px-Seattlenighttimequeenanne.jpg")
                    ])
                    .tap(builder.CardAction.openUrl(session, "https://en.wikipedia.org/wiki/Space_Needle"))
            ]);
        session.send(msg);

        msg = new builder.Message(session)
            .attachments([
                new builder.ThumbnailCard(session)
                    .title("Thumbnail Card")
                    .subtitle("Pike Place Market is a public market overlooking the Elliott Bay waterfront in Seattle, Washington, United States.")
                    .images([
                        builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/en/thumb/2/2a/PikePlaceMarket.jpg/320px-PikePlaceMarket.jpg")
                    ])
                    .tap(builder.CardAction.openUrl(session, "https://en.wikipedia.org/wiki/Pike_Place_Market"))
            ]);
        session.endDialog(msg);
    }
]);

bot.dialog('/list', [
    function (session) {
        session.send("You can send the user a list of cards as multiple attachments in a single message...");

        var msg = new builder.Message(session)
            .attachments([
                new builder.HeroCard(session)
                    .title("Space Needle")
                    .subtitle("The Space Needle is an observation tower in Seattle, Washington, a landmark of the Pacific Northwest, and an icon of Seattle.")
                    .images([
                        builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Seattlenighttimequeenanne.jpg/320px-Seattlenighttimequeenanne.jpg")
                    ]),
                new builder.HeroCard(session)
                    .title("Pikes Place Market")
                    .subtitle("Pike Place Market is a public market overlooking the Elliott Bay waterfront in Seattle, Washington, United States.")
                    .images([
                        builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/en/thumb/2/2a/PikePlaceMarket.jpg/320px-PikePlaceMarket.jpg")
                    ])
            ]);
        session.endDialog(msg);
    }
]);

bot.dialog('/carousel', [
    function (session) {
        session.send("You can pass a custom message to Prompts.choice() that will present the user with a carousel of cards to select from. Each card can even support multiple actions.");
        
        // Ask the user to select an item from a carousel.
        var msg = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                    .title("Space Needle")
                    .subtitle("The Space Needle is an observation tower in Seattle, Washington, a landmark of the Pacific Northwest, and an icon of Seattle.")
                    .images([
                        builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Seattlenighttimequeenanne.jpg/320px-Seattlenighttimequeenanne.jpg")
                            .tap(builder.CardAction.showImage(session, "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Seattlenighttimequeenanne.jpg/800px-Seattlenighttimequeenanne.jpg")),
                    ])
                    .buttons([
                        builder.CardAction.openUrl(session, "https://en.wikipedia.org/wiki/Space_Needle", "Wikipedia"),
                        builder.CardAction.imBack(session, "select:100", "Select")
                    ]),
                new builder.HeroCard(session)
                    .title("Pikes Place Market")
                    .subtitle("Pike Place Market is a public market overlooking the Elliott Bay waterfront in Seattle, Washington, United States.")
                    .images([
                        builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/en/thumb/2/2a/PikePlaceMarket.jpg/320px-PikePlaceMarket.jpg")
                            .tap(builder.CardAction.showImage(session, "https://upload.wikimedia.org/wikipedia/en/thumb/2/2a/PikePlaceMarket.jpg/800px-PikePlaceMarket.jpg")),
                    ])
                    .buttons([
                        builder.CardAction.openUrl(session, "https://en.wikipedia.org/wiki/Pike_Place_Market", "Wikipedia"),
                        builder.CardAction.imBack(session, "select:101", "Select")
                    ]),
                new builder.HeroCard(session)
                    .title("EMP Museum")
                    .subtitle("EMP Musem is a leading-edge nonprofit museum, dedicated to the ideas and risk-taking that fuel contemporary popular culture.")
                    .images([
                        builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Night_Exterior_EMP.jpg/320px-Night_Exterior_EMP.jpg")
                            .tap(builder.CardAction.showImage(session, "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Night_Exterior_EMP.jpg/800px-Night_Exterior_EMP.jpg"))
                    ])
                    .buttons([
                        builder.CardAction.openUrl(session, "https://en.wikipedia.org/wiki/EMP_Museum", "Wikipedia"),
                        builder.CardAction.imBack(session, "select:102", "Select")
                    ])
            ]);
        builder.Prompts.choice(session, msg, "select:100|select:101|select:102");
    },
    function (session, results) {
        var action, item;
        var kvPair = results.response.entity.split(':');
        switch (kvPair[0]) {
            case 'select':
                action = 'selected';
                break;
        }
        switch (kvPair[1]) {
            case '100':
                item = "the Space Needle";
                break;
            case '101':
                item = "Pikes Place Market";
                break;
            case '102':
                item = "the EMP Museum";
                break;
        }
        session.endDialog('You %s "%s"', action, item);
    }    
]);

bot.dialog('/receipt', [
    function (session) {
        session.send("You can send a receipts for facebook using Bot Builders ReceiptCard...");
        var msg = new builder.Message(session)
            .attachments([
                new builder.ReceiptCard(session)
                    .title("Recipient's Name")
                    .items([
                        builder.ReceiptItem.create(session, "$22.00", "EMP Museum").image(builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/commons/a/a0/Night_Exterior_EMP.jpg")),
                        builder.ReceiptItem.create(session, "$22.00", "Space Needle").image(builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/commons/7/7c/Seattlenighttimequeenanne.jpg"))
                    ])
                    .facts([
                        builder.Fact.create(session, "1234567898", "Order Number"),
                        builder.Fact.create(session, "VISA 4076", "Payment Method")
                    ])
                    .tax("$4.40")
                    .total("$48.40")
            ]);
        session.send(msg);

        session.send("Or using facebooks native attachment schema...");
        msg = new builder.Message(session)
            .sourceEvent({
                facebook: {
                    attachment: {
                        type: "template",
                        payload: {
                            template_type: "receipt",
                            recipient_name: "Stephane Crozatier",
                            order_number: "12345678902",
                            currency: "USD",
                            payment_method: "Visa 2345",        
                            order_url: "http://petersapparel.parseapp.com/order?order_id=123456",
                            timestamp: "1428444852", 
                            elements: [
                                {
                                    title: "Classic White T-Shirt",
                                    subtitle: "100% Soft and Luxurious Cotton",
                                    quantity: 2,
                                    price: 50,
                                    currency: "USD",
                                    image_url: "http://petersapparel.parseapp.com/img/whiteshirt.png"
                                },
                                {
                                    title: "Classic Gray T-Shirt",
                                    subtitle: "100% Soft and Luxurious Cotton",
                                    quantity: 1,
                                    price: 25,
                                    currency: "USD",
                                    image_url: "http://petersapparel.parseapp.com/img/grayshirt.png"
                                }
                            ],
                            address: {
                                street_1: "1 Hacker Way",
                                street_2: "",
                                city: "Menlo Park",
                                postal_code: "94025",
                                state: "CA",
                                country: "US"
                            },
                            summary: {
                                subtotal: 75.00,
                                shipping_cost: 4.95,
                                total_tax: 6.19,
                                total_cost: 56.14
                            },
                            adjustments: [
                                { name: "New Customer Discount", amount: 20 },
                                { name: "$10 Off Coupon", amount: 10 }
                            ]
                        }
                    }
                }
            });
        session.endDialog(msg);
    }
]);

bot.dialog('/actions', [
    function (session) { 
        session.send("Bots can register global actions, like the 'help' & 'goodbye' actions, that can respond to user input at any time. You can even bind actions to buttons on a card.");

        var msg = new builder.Message(session)
            .attachments([
                new builder.HeroCard(session)
                    .title("Space Needle")
                    .subtitle("The Space Needle is an observation tower in Seattle, Washington, a landmark of the Pacific Northwest, and an icon of Seattle.")
                    .images([
                        builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Seattlenighttimequeenanne.jpg/320px-Seattlenighttimequeenanne.jpg")
                    ])
                    .buttons([
                        builder.CardAction.dialogAction(session, "weather", "Seattle, WA", "Current Weather")
                    ])
            ]);
        session.send(msg);

        session.endDialog("The 'Current Weather' button on the card above can be pressed at any time regardless of where the user is in the conversation with the bot. The bot can even show the weather after the conversation has ended.");
    }
]);

// Create a dialog and bind it to a global action
bot.dialog('/weather', [
    function (session, args) {
        session.endDialog("The weather in %s is 71 degrees and raining.", args.data);
    }
]);
bot.beginDialogAction('weather', '/weather');   // <-- no 'matches' option means this can only be triggered by a butt

/*
    SIMPLE BOTS
*/
/*
//Simple Bot
bot.dialog('/', function (session) {
    var msg = session.message;
    console.log('got it:', msg.text); 
    session.send("You said '" + msg.text); 
});

//Async example
bot.dialog('/listItems', function (session) {
    session.sendTyping();
    lookupItemsAsync(function (results) {
        // Calling session.send() here is dangerous because you've done an action that's
        // triggered a change in your bots conversation state.
        session.endDialog(results.message);
    });
});

//EnsureProfile
bot.dialog('/ensureProfile', [
    function (session, args, next) {
        session.dialogData.profile = args || {};
        session.dialogData.profile.name = "foo";

        if (!session.dialogData.profile.name) {
            
            console.log("In ensure profile");
            builder.Prompts.text(session, "What's your name?");
            //builder.Prompts.choice(session, "Welcome to Babajob. Tap a language:", ["English" | "Hindi"]); 
        } else {
            next();
        }
    },
    function (session, results, next) {
        if (results.response) {
            session.dialogData.profile.name = results.response;
        }
        if (!session.dialogData.profile.company) {
            builder.Prompts.text(session, "What company do you work for?");
        } else {
            next();
        }
    },
    function (session, results) {
        if (results.response) {
            session.dialogData.profile.company = results.response;
        }
        session.endDialogWithResult({ response: session.dialogData.profile });
    }
]);

//delete session data
bot.dialog('/delete', [
    function (session) {
        session.send("I'm forgeting you...");
        session.userData.profile = null;
        session.send("Forgotten!");
        session.endDialog();
    }
]);

//echo whatever the message was
bot.dialog('/echo', [
    function (session) {
        var msg = session.message;
        session.send("You said '" + msg.text); 
        session.endDialog();
    }
]);


//send a picture
bot.dialog('/picture', [
    function (session) {
        session.send("You can easily send pictures to a user...");
        var msg = new builder.Message(session)
            .attachments([{
                contentType: "image/jpeg",
                contentUrl: "http://www.theoldrobots.com/images62/Bender-18.JPG"
            }]);
        session.endDialog(msg);
    }
]);

//sample card
bot.dialog('/cardssample', [
    function (session) {
        var msg = new builder.Message(session)
            .textFormat(builder.TextFormat.xml)
            .attachments([
                new builder.HeroCard(session)
                    .title("Hero Card")
                    .subtitle("Space Needle")
                    .text("The <b>Space Needle</b> is an observation tower in Seattle, Washington, a landmark of the Pacific Northwest, and an icon of Seattle.")
                    .images([
                        builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Seattlenighttimequeenanne.jpg/320px-Seattlenighttimequeenanne.jpg")
                    ])
                    .tap(builder.CardAction.openUrl(session, "https://en.wikipedia.org/wiki/Space_Needle"))
            ]);
        session.endDialog(msg);
    }
]);

//sample card
bot.dialog('/cards', [
    function (session) {
        var msg = new builder.Message(session)
            .textFormat(builder.TextFormat.xml)
            .attachments([
                new builder.HeroCard(session)
                    .title("Hero Card")
                    .subtitle("Space Needle")
                    .text("The <b>Space Needle</b> is an observation tower in Seattle, Washington, a landmark of the Pacific Northwest, and an icon of Seattle.")
                    .buttons(getSampleCardActions(session))
            ]);
        session.endDialog(msg);
    }
]);


function getSampleCardActions(session) {
    return [
        builder.CardAction.openUrl(session, 'https://docs.botframework.com/en-us/', 'Get Started'),
        builder.CardAction.openUrl(session, 'https://docs.botframework.com/en-us/', 'More started')
        
    ];
}


//JSON Choice example

var salesData = {
    "west": {
        units: 200,
        total: '$6,000'
    },
    "central": {
        units: 100,
        total: '$3,000'
    },
    "east": {
        units: 300,
        total: '$9,000'
    }
};

bot.dialog('/choice', [
    function (session) {
        builder.Prompts.choice(session, "Which region would you like sales for?", salesData); 
    },
    function (session, results) {
        if (results.response) {
            var region = salesData[results.response.entity];
            session.send("We sold %(units)d units for a total of %(total)s.", region); 


//NORMAL TEXT MESSAGE
session.message.
session.message
{ type: 'message',
  timestamp: '2016-10-17T17:28:56.0760183Z',
  text: 'yi',
  sourceEvent:
   { sender: { id: '905716556224705' },
     recipient: { id: '373223816108072' },
     timestamp: 1476725333766,
     message: { mid: 'mid.1476725333766:15a73c0e67', seq: 2498, text: 'yi' } },
  attachments: [],
  entities: [],
  address:
   { id: 'mid.1476725333766:15a73c0e67',
     channelId: 'facebook',
     user: { id: '905716556224705', name: 'Sean Blagsvedt' },
     conversation: { isGroup: false, id: '905716556224705-373223816108072' },
     bot: { id: '373223816108072', name: 'babajob' },
     serviceUrl: 'https://facebook.botframework.com',
     useAuth: true },
  source: 'facebook',
  agent: 'botbuilder',
  user: { id: '905716556224705', name: 'Sean Blagsvedt' }
}

//LAT/LONG location
session.message
{ type: 'message',
  timestamp: '2016-10-17T17:31:54.0544146Z',
  attachments: [],
  entities:
   [ { geo:
        { elevation: 0,
          latitude: 13.000933647155762,
          longitude: 77.56626892089844,
          type: 'GeoCoordinates' },
       type: 'Place' } ],
  sourceEvent:
   { sender: { id: '905716556224705' },
     recipient: { id: '373223816108072' },
     timestamp: 1476725512615,
     message:
      { mid: 'mid.1476725512615:053a44fa39',
        seq: 2510,
        attachments:
         [ { type: 'location',
             payload: { coordinates: { lat: 13.0009336, long: 77.56627 } },
             title: 'Sean\'s Location',
             url: 'https://www.facebook.com/l.php?u=https%3A%2F%2Fwww.bing.com%2Fmaps%2Fdefault.aspx%3Fv%3D2%26pc%3DFACEBK%26mid%3D8100%26where1%3D13.000933597808%252C%2B77.566266898138%26FORM%3DFBKPL1%26mkt%3Den-US&h=AAQFVe536&s=1&enc=AZN2RHOn_fBThII2YzqNeUicNkBKxIVZTyYK6ImdgJ-VHDkGTukSjhp7RA45BGhF7wqzjUs5PRtbVyHamV2Hrw2PipKF-kB5My51566xL1GF7g' } ] } },
  text: '',
  address:
   { id: 'mid.1476725512615:053a44fa39',
     channelId: 'facebook',
     user: { id: '905716556224705', name: 'Sean Blagsvedt' },
     conversation: { isGroup: false, id: '905716556224705-373223816108072' },
     bot: { id: '373223816108072', name: 'babajob' },
     serviceUrl: 'https://facebook.botframework.com',
     useAuth: true },
  source: 'facebook',
  agent: 'botbuilder',
  user: { id: '905716556224705', name: 'Sean Blagsvedt' } }

//
    http://graph.facebook.com/905716556224705/picture?type=large
      

//Basic pattern for exposing a custom prompt. The create() function should be
//called once at startup and then beginDialog() can be called everytime you
//wish to invoke the prompt.

var builder = require('../../core/');

exports.beginDialog = function (session, options) {
    session.beginDialog('/meaningOfLife', options || {});
}

exports.create = function (bot) {
    var prompt = new builder.IntentDialog()
        .onBegin(function (session, args) {
            // Save args passed to prompt
            session.dialogData.retryPrompt = args.retryPrompt || "Sorry that's incorrect. Guess again. Or do you give up?";

            // Send initial prompt
            // - This isn't a waterfall so you shouldn't call any of the built-in Prompts.
            session.send(args.prompt || "What's the meaning of life?");
        })
        .matches(/(give up|quit|skip|yes)/i, function (session) {
            // Return 'false' to indicate they gave up
            session.endDialogWithResult({ response: false });
        })
        .onDefault(function (session) {
            // Validate users reply.
            if (session.message.text == '42') {
                // Return 'true' to indicate success
                session.endDialogWithResult({ response: true });
            } else {
                // Re-prompt user
                session.send(session.dialogData.retryPrompt);
            }
        });
    bot.dialog('/meaningOfLife', prompt);
}

*/


/*
//=========================================================
// Global Change Language Commands
//=========================================================

function setUILanguage(lang, session) {
    var preferredLang = 'en';
    lang = lang.toLowerCase();
    checkValidUserDataProfile(session);
    if (lang) {
        if (lang == 'english') {
            //हिंदी Hindi
            preferredLang = 'en';
        }
        if (lang == 'hindi') {
            //हिंदी Hindi
            preferredLang = 'hi';
        } else if (lang == 'tamil') {
            //தமிழ் Tamil
            preferredLang = 'ta';
        }
        else if (lang == 'telugu') {
            //తెలుగు Telugu
            preferredLang = 'ta';
        }
        else if (lang == 'kannada') {
            //ಕನ್ನಡ Kannada
            preferredLang = 'ka';
        }
    }
    session.userData.profile.preferredLang = preferredLang;
    session.beginDialog('/newChatUser');
}

bot.dialog('/english', [
    function (session, args) {
        setUILanguage("english", session);
    }
]);
bot.beginDialogAction('english', '/english', { matches: /^english/i });

bot.dialog('/hindi', [
    function (session, args) {
        setUILanguage("hindi", session);
    }
]);
bot.beginDialogAction('hindi', '/hindi', { matches: /^hindi/i });

bot.dialog('/tamil', [
    function (session, args) {
        setUILanguage("tamil", session);
    }
]);
bot.beginDialogAction('tamil', '/tamil', { matches: /^tamil/i });

bot.dialog('/kannada', [
    function (session, args) {
        setUILanguage("kannada", session);
    }
]);
bot.beginDialogAction('kannada', '/kannada', { matches: /^kannada/i });

bot.dialog('/telugu', [
    function (session, args) {
        setUILanguage("telugu", session);
    }
]);
bot.beginDialogAction('telugu', '/telugu', { matches: /^telugu/i });


//=========================================================
// Natural Language Recognizer
//=========================================================
//https://docs.botframework.com/en-us/node/builder/guides/understanding-natural-language/

//LUIS link: https://www.luis.ai/application/b411958a-ed38-4ccc-ab7a-51e34ea29161

// Create LUIS recognizer that points at our model and add it as the root '/' dialog for our Cortana Bot.
var model = 'https://api.projectoxford.ai/luis/v1/application?id=b411958a-ed38-4ccc-ab7a-51e34ea29161&subscription-key=4091d14e9cfa43eb9145adf250b7a4b4';
var recognizer = new builder.LuisRecognizer(model);
var luisDialog = new builder.IntentDialog({ recognizers: [recognizer] });
bot.dialog('/luis', luisDialog);


// Add intent handlers
luisDialog.matches('ChangeUILanguage', [
    function (session, args, next) {
        session.send("Detected UI Lang Change...");
        // Resolve and store any entities passed from LUIS.
        var lang = builder.EntityRecognizer.findEntity(args.entities, 'Language');
        session.endDialog();
    }]);

// Add intent handlers
luisDialog.onDefault(builder.DialogAction.send("I'm sorry I didn't understand. I don't know how to read text yet..."));

///////////////////////////////////////////////////////////////////
//////  CUSTOM MENUS //////////////////////////////////////////////
///////////////////////////////////////////////////////////////////

//from : https://github.com/Microsoft/BotBuilder/blob/master/Node/core/src/dialogs/Prompts.ts
var buttons: CardAction[] = [];
                for (var i = 0; i < session.dialogData.enumValues.length; i++) {
                    var option = session.dialogData.enumValues[i];
                    buttons.push(CardAction.imBack(session, option, option));
                }
                msg.text(text)
                    .attachments([new Keyboard(session).buttons(buttons)]);



*/
