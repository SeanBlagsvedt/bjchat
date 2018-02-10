
//Started October 2016 by Sean
'use strict';

/*
I speak English and Tamil. 
I am Rajesh Kumar 899034544445
I want Hotel Jobs in Maduri Jobs

My name is gopalakrishna
Qualification intermediate complete
Any more fresher full time jobs call me 9573637509

Any jobs available for lawyers?


It'i diesel mechanic
10the completed
12pass

I want Hyderabad near job
Wich types jobs given?

English 1 3

///////////////// RECO TEST CASES /////////////////////
*/

var recoTestCases =
    [
        {
            query: "09886251476",
            entity: {
                "entity": "9886251476",
                "type": "mobile"
            }
       }  
    ]; 

function TestReco(session) {
    var cases = recoTestCases;
    cases.forEach(function (test) {
        runTestCase(test, session);
    }, this);
}

function runTestCase(test, session) {
//TODO finish test cases..
}