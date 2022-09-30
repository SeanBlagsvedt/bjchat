# chat
Repo for Chat experiences ala Messenger
This repro leverages MSFT LUIS and the facebook messenger APIs to enable job seekers to see and apply for jobs on babajob.com. 

# Install
Install node.js and npm from nodejs Version 6+
git bash to your /chat directory
npm install

#Get added as a contributor on botconnector
Mail Sean your @babajob.com microsoft / hotmail ID.

#Get added as a developer on Babajob Bot Good
Mail Sean your facebook ID


# To Run Microsoft Bot on Messenger
Start the local web server
2. git bash
cd c:
cd Users/sean_/node/chat
nodemon

Start ngrok
5. Start -> cmd
cd c:\
cd c:\users\sean_\Node\chat
ngrok http 3978

#To Deploy to Babajob Test
Change config in bot directory
8 https://dev.botframework.com/bots/edit?id=babajobtest sean_blagsvedt@hotmail.com 
9. Edit Messaging Endpoint (and add /api/messages to ngrok
10 https://63130ac2.ngrok.io/api/messages

Test the messages
Start the other messenger
12. https://www.facebook.com/BabajobTest/ and click Message

#To Deploy to Babajob Pre-Production
Change config in bot directory
8 https://dev.botframework.com/bots?id=babajob sean_blagsvedt@hotmail.com 
9. Edit Messaging Endpoint (and add /api/messages to ngrok
e.g. https://63130ac2.ngrok.io/api/messages

Test the messages
Start the other messenger
12. https://www.facebook.com/BabajobSeekers/ and click Message


#To Deploy to Babajob Production
Change config in bot directory
8 https://dev.botframework.com/bots?id=babajob sean_blagsvedt@hotmail.com 
9. Edit Messaging Endpoint (and add /api/messages to ngrok
e.g. https://63130ac2.ngrok.io/api/messages

Test the messages
Start the other messenger
12. https://www.facebook.com/BabajobSeekers/ and click Message


Try out Samples
13. stop ^C in git bash

https://github.com/Microsoft/BotBuilder-Samples - for reference


WebChat control for Production: 
https://webchat.botframework.com/embed/babajob?features=webchatpreview&s=tJhouDQJ2qg.cwA.Oic.a52RiNNzpg006HahsFMvStw9iEQDqBTCKQyn7SlVlhQ
//https://webchat.botframework.com/embed/babajob?s=tJhouDQJ2qg.cwA.OAw.fogUjMaNFg-qu-Vpf0aFMdpR7poHwfnBbl4rF-xCvDk


WebChat Control for Test
https://webchat.botframework.com/embed/babajobtest?s=txWXEG-rNx4.cwA.RIs.61GC2J7BGYGIYq8F5G7HcxgBZpuHPiDEti-F8EUGlD0


#Check out secerts.MD for 
