//GoogleSheetLogger
'use strict';

var GoogleSpreadsheet = require('google-spreadsheet');
var async = require('async');

// spreadsheet key is the long id in the sheets URL
var creds = require('./RichDocsCreds.json');

var doc = new GoogleSpreadsheet('1kt3tLcyDwckZLe_aDySHZrCHurpdq_XxukUDRDjJe_M');

//init the logger...
function gsLogger() {
    
}

//from https://github.com/theoephraim/node-google-spreadsheet
gsLogger.prototype.logError = function
    (functionName, session,
    errorDetails, parameters,
    botmessage, uri, responseBody, onProduction, language)
{
    var user;
    var lastMessage;
    var channel;
    var language_ = language || "";

    try {
        if (session) {
            if (session.message) {
                lastMessage = session.message.text || "No Text Sent in Last Message";
            }
            if (session.userData && session.userData.profile) {
                user = session.userData.profile || {};
                channel = user.channel || "facebook";
            }
        }
    
        var now = new Date();
        var new_row = {
            timestamp: now,
            channel: channel,
            channeluserid: user.facebookId,
            babajobuserid: user.bjUserId,
            jobseekerid: user.jobSeekerId,
            mobile: user.mobile,
            username: user.name,
            lastusermessage: lastMessage,
            functionname: functionName,
            errordetails: errorDetails,
            parameters: JSON.stringify(parameters),
            usermsg: botmessage,
            uri: uri,
            responsebody: responseBody,
            onproduction: onProduction,
            language: language_
        };


/*        
					mobile	phone	email	city	category	salary	description	type	url	questions        
        //1PMhTLnrFyK2YzrJIucfpW58kR1nu2Sxi2nKCX2MDb9E
    var now = new Date();
        var job_Rom = {
            posted: now,
            jobid: user.facebookId,
            employerid: user.bjUserId,
            employername: user.jobSeekerId,
            companyname: user.jobSeekerId,
            mobile: user.mobile,
            phone: user.name,
            email: lastMessage,
            city: functionName,
            category: errorDetails,
            title: JSON.stringify(parameters),
            salary: botmessage,
            description: uri,
            employertype: responseBody,
            url: onProduction,
            questions: ""
        };
*/
        
        
    
        async.series([
            function setAuth(step) {
                doc.useServiceAccountAuth(creds, step);
            },
            /*
            Add a single row to the sheet.
            
            worksheet_id - the index of the sheet to add to (index starts at 1)
            new_row - key-value object to add - keys must match the header row on your sheet
            callback(err) - callback called after row is added
            */
            function addErrorRow(step) {
                doc.addRow(1, new_row,
                    function (err, info) {
                        if (err) {
                            console.log('error while adding a row:', err);
                            step();
                        } else {
                            //console.log('saved new row', info);
                            step();
                        }
                    });
            }]);
    }
    catch (e) {
        console.log("ERROR IN GSLOGGER Exception:", e);
    }
};   


gsLogger.prototype.logFunnelStep = function
    (intent, session,funnelstep, entities, botmessage, onProduction)    
{
    var user;
    var lastMessage;
    var channel; 

    try {
        if (session) {
            if (session.message) {
                lastMessage = session.message.text || "No Text Sent in Last Message";
            }
            if (session.userData && session.userData.profile) {
                user = session.userData.profile || {};
                channel = user.channel || "facebook";
            }
        }
    
        //timestamp	channel	channelid	babajobuserid	seekerid	username	lastusermessage	botmessage	intent	entities	funnelstep	onProduction

        var now = new Date();
        var new_row = {
            timestamp: now,
            channel: channel,
            channeluserid: user.facebookId,
            babajobuserid: user.bjUserId,
            jobseekerid: user.jobSeekerId,
            mobile: user.mobile,
            username: user.name,
            lastusermessage: lastMessage,
            botmessage: botmessage,
            intent: intent,
            entities: JSON.stringify(entities),
            funnelstep: funnelstep,
            onproduction: onProduction
        };
    
    
        async.series([
            function setAuth(step) {
                doc.useServiceAccountAuth(creds, step);
            },
            /*
            Add a single row to the sheet.
            
            worksheet_id - the index of the sheet to add to (index starts at 1)
            new_row - key-value object to add - keys must match the header row on your sheet
            callback(err) - callback called after row is added
            */
            function addErrorRow(step) {
                doc.addRow(2, new_row,
                    function (err, info) {
                        if (err) {
                            console.log('error while adding a row:', err);
                            step();
                        } else {
                            //console.log('saved new row', info);
                            step();
                        }
                    });
            }]);
    }
    catch (e) {
        console.log("ERROR IN GSLOGGER Exception:", e);
    }
};   

gsLogger.prototype.logFeedback = function
    (session, onProduction)    
{
    var user;
    var lastMessage;
    var channel; 

    try {
        if (session) {
            if (session.message) {
                lastMessage = session.message.text || "No Text Sent in Last Message";
            }
            if (session.userData && session.userData.profile) {
                user = session.userData.profile || {};
                channel = user.channel || "facebook";
            }
        }
    
        //timestamp	channel	channelid	babajobuserid	seekerid	username	lastusermessage	botmessage	intent	entities	funnelstep	onProduction

        var now = new Date();
        var new_row = {
            timestamp: now,
            channel: channel,
            channeluserid: user.facebookId,
            babajobuserid: user.bjUserId,
            jobseekerid: user.jobSeekerId,
            mobile: user.mobile,
            username: user.name,
            lastusermessage: lastMessage,
            onproduction: onProduction
        };
    
    
        async.series([
            function setAuth(step) {
                doc.useServiceAccountAuth(creds, step);
            },
            /*
            Add a single row to the sheet.
            
            worksheet_id - the index of the sheet to add to (index starts at 1)
            new_row - key-value object to add - keys must match the header row on your sheet
            callback(err) - callback called after row is added
            */
            function addErrorRow(step) {
                doc.addRow(3, new_row,
                    function (err, info) {
                        if (err) {
                            console.log('error while adding a row:', err);
                            step();
                        } else {
                            //console.log('saved new row', info);
                            step();
                        }
                    });
            }]);
    }
    catch (e) {
        console.log("ERROR IN GSLOGGER Exception:", e);
    }
};   


/*
function sampleFuncs() {

    async.series([
        function setAuth(step) {
            //doc.useServiceAccountAuth(creds, step);
        },
        function getInfoAndWorksheets(step) {
            doc.getInfo(function (err, info) {
                console.log('Loaded doc: ' + info.title + ' by ' + info.author.email);
                sheet = info.worksheets[0];
                console.log('sheet 1: ' + sheet.title + ' ' + sheet.rowCount + 'x' + sheet.colCount);
                step();
            });
        },
        function workingWithRows(step) {
            // google provides some query options
            sheet.getRows({
                offset: 1,
                limit: 20,
                orderby: 'col2'
            }, function (err, rows) {
                console.log('Read ' + rows.length + ' rows');

                // the row is an object with keys set by the column headers
                rows[0].colname = 'new val';
                rows[0].save(); // this is async

                // deleting a row
                rows[0].del();  // this is async

                step();
            });
        }
    ]);
};    
  
  */

  module.exports = gsLogger;