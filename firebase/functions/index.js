'use strict';

// Import the Dialogflow module from the Actions on Google client library.
const {dialogflow} = require('actions-on-google');

// Import the firebase-functions package for deployment.
const functions = require('firebase-functions');

// Instantiate the Dialogflow client.
const app = dialogflow({debug: true});

// Connect to Firebase Firestore using Dialogflow's sample code
// sample at https://github.com/dialogflow/fulfillment-firestore-nodejs
const admin = require('firebase-admin');

const {WebhookClient} = require('dialogflow-fulfillment');

process.env.DEBUG = 'dialogflow:*'; // enables lib debugging statements

admin.initializeApp(functions.config().firebase);

const db = admin.firestore();

// Handle the Actions on Google intent, Default Welcome Intent
app.intent('Default Welcome Intent', (conv) => {
    
    // Get the database collection 'dialogflow' and document 'agent'
    function readFromDb(){
        
        const dialogflowAgentDoc = db.collection('dialogflow').doc('agent');
    
        // Get the value of 'entry' in the document and send it to the user
        return dialogflowAgentDoc.get()
          .then(doc => {
            if (!doc.exists) {
              console.log('No data found in the database!');
            } else {
              console.log(doc.data().entry);
              conv.ask("Welcome to Bathroom Stall! You can hear a message from the last visitor, then leave a reply. The wall says: \n\n" + doc.data().entry);
            }
            conv.ask("What's your reply?");
            return Promise.resolve('Read complete');
          }).catch(() => {
            console.log('Error reading entry from the Firestore database.');
          });        
    }
    
    return readFromDb();
});

// Handle anything after the Welcome intent by storing that user's phrase in the GCP Cloud Firestore NoSQL Db
app.intent('write to the wall', (conv) => {
    console.log(conv);
    console.log(conv.input.raw);
    var userReply = conv.input.raw;
    
    // try to use Dialogflow's sample code to rewrite userReply with an entry from the DB.
    function writeToDb(userReply){
        
        const dialogflowAgentRef = db.collection('dialogflow').doc('agent');
        
        return db.runTransaction(t => {
          t.set(dialogflowAgentRef, {entry: userReply});
          conv.ask('The wall now reads, ' + userReply);
          conv.close("Thanks for visiting! When you're ready for another exciting action, tell your Assistant, Hey Google, talk to Send Max Five Dollars.");          
          return Promise.resolve('Write complete');
        }).then(doc => {
          console.log(`Wrote "${userReply}" to the Firestore database.`);
        }).catch(err => {
          console.log(`Error writing to Firestore: ${err}`);
        //   console.log(`Failed to write "${userReply}" to the Firestore database.`);
        });        
    }
    
    return writeToDb(userReply);
    
});

// Set the DialogflowApp object to handle the HTTPS POST request.
exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app);
