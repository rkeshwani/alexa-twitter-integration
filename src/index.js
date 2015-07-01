// Alexa SDK for JavaScript v1.0.00
// Copyright (c) 2014-2015 Amazon.com, Inc. or its affiliates. All Rights Reserved. Use is subject to license terms.

/**
 * This sample shows how to create a Lambda function for handling Alexa Skill requests that:
 *
 * - Web service: Communicate with an the Amazon associates API to get best seller information using aws-lib
 * - Dialog and Session State: Handles two models, both a one-shot ask and tell model, and a multi-turn dialog model.
 *   If the user provides an incorrect slot in a one-shot model, it will direct to the dialog model
 * - Pagination: Handles paginating a list of responses to avoid overwhelming the customer.
 *
 * Examples:
 * One-shot model
 *  User:  "Alexa, ask Savvy Consumer for top books"
 *  Alexa: "Getting the best sellers for books. The top seller for books is .... Would you like
 *          to hear more?"
 *  User:  "No"
 *
 * Dialog model:
 *  User:  "Alexa, open Savvy Consumer"
 *  Alexa: "Welcome to the Savvy Consumer. For which category do you want to hear the best sellers?"
 *  User:  "books"
 *  Alexa: "Getting the best sellers for books. The top seller for books is .... Would you like
 *          to hear more?"
 *  User:  "yes"
 *  Alexa: "Second ... Third... Fourth... Would you like to hear more?"
 *  User : "no"
 */

'use strict';
/**
 * App ID for the skill
 */
var APP_ID = undefined; //replace with "amzn1.echo-sdk-ams.app.[your-unique-value-here]"

/**
 * The key to find the current index from the session attributes
 */
var KEY_CURRENT_INDEX = "current";

/**
 * The key to find the current category from the session attributes
 */
var KEY_CURRENT_CATEGORY = "category";

/**
 * The Max number of items for Alexa to read from a request to Amazon.
 */
var MAX_ITEMS = 10;

/**
 * The number of items read for each pagination request, until we reach the MAX_ITEMS
 */
var PAGINATION_SIZE = 3;

/**
 * The AWS Access Key.
 */
var AWS_ACCESS_KEY = "Your AWS Access Key";

/**
 * The AWS Secret Key
 */
var AWS_SECRET_KEY = "Your AWS Secret Key";

/**
 * The Associates Tag
 */
var AWS_ASSOCIATES_TAG = "associates_tag";

/**
 * Helper Array that will allow a conversion from the cardinal number to the ordinal.
 */
var ARRAY_FOR_ORDINAL_SPEECH = [
    "Zero",
    "First",
    "Second",
    "Third",
    "Fourth",
    "Fifth",
    "Sixth",
    "Seventh",
    "Eighth",
    "Ninth",
    "Tenth"
];

/**
 * Mapping of the browse node ID to the category for the Amazon catalog.
 */
var BROWSE_NODE_MAP = {
    Apparel: "1036592",
    Appliances: "2619526011",
    ArtsAndCrafts: "2617942011",
    Automotive: "15690151",
    Baby: "165797011",
    Beauty: "11055981",
    Books: "1000",
    Classical: "301668",
    Collectibles: "4991426011",
    DVD: "2625374011",
    DigitalMusic: "624868011",
    Electronics: "493964",
    GiftCards: "2864120011",
    GourmetFood: "16310211",
    Grocery: "16310211",
    HealthPersonalCare: "3760931",
    HomeGarden: "1063498",
    Industrial: "16310161",
    Jewelry: "2516784011",
    KindleStore: "133141011",
    Kitchen: "284507",
    LawnAndGarden: "3238155011",
    MP3Downloads: "624868011",
    Magazines: "599872",
    Miscellaneous: "10304191",
    MobileApps: "2350150011",
    Music: "301668",
    MusicalInstruments: "11965861",
    OfficeProducts: "1084128",
    OutdoorLiving: "2972638011",
    PCHardware: "541966",
    PetSupplies: "2619534011",
    Photo: "502394",
    Shoes: "672124011",
    Software: "409488",
    SportingGoods: "3375301",
    Tools: "468240",
    Toys: "165795011",
    UnboxVideo: "2858778011",
    VHS: "2625374011",
    Video: "404276",
    VideoGames: "11846801",
    Watches: "378516011",
    Wireless: "2335753011",
    WirelessAccessories: "13900851"
};

/**
 * A Mapping of alternative ways a user will say a category to how Amazon has defined the category
 */
var SPOKEN_NAME_TO_CATEGORY = {
    movies: "DVD",
    movie: "DVD",
    novels: "Books",
    novel: "Books"
};

/**
 * Twitter API Keys
 **/
var TWITTER_CONFIG = {
        "consumerKey": "JunpXLhBfQgOHJZkYTs7maoIb",
        "consumerSecret": "0Df7HilbFpgjsR83qC1Ley4HgrdlSK3a7xuWq7RzgIJtDLAwLc",
        "accessToken": "18916219-CqOZRf8zbS77PMuYEc6BXjqasq49arllrG3AzHbJM",
        "accessTokenSecret": "ZBQ3Ww4068CFhRdKDaXq7Juluby0y3Xy5hEivBlpj1noA"
        //"callBackUrl": "XXX"
    }, twitterClient = null;
/**
 * The AlexaSkill prototype and helper functions
 */
var AlexaSkill = require('./AlexaSkill');

/**
 * Use the aws-lib
 */
var aws = require("aws-lib");

/**
 * Use the Twitter library
 */
var Twitter = require("twitter-node-client");


/**
 * TwitterSkill is a child of AlexaSkill.
 * To read more about inheritance in JavaScript, see the link below.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Introduction_to_Object-Oriented_JavaScript#Inheritance
 */
var TwitterSkill = function () {
    AlexaSkill.call(this, APP_ID);
};

// Extend AlexaSkill
TwitterSkill.prototype = Object.create(AlexaSkill.prototype);
TwitterSkill.prototype.constructor = TwitterSkill;

TwitterSkill.prototype.eventHandlers.onSessionStarted = function (sessionStartedRequest, session) {
    console.log("TwitterSkill onSessionStarted requestId: " + sessionStartedRequest.requestId
        + ", sessionId: " + session.sessionId);
    twitterClient = new Twitter(TWITTER_CONFIG);
    
    // any session init logic would go here
};

TwitterSkill.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
    console.log("TwitterSkill onLaunch requestId: " + launchRequest.requestId + ", sessionId: " + session.sessionId);
    getWelcomeResponse(response);
};

TwitterSkill.prototype.eventHandlers.onSessionEnded = function (sessionEndedRequest, session) {
    console.log("TwitterSkill onSessionEnded requestId: " + sessionEndedRequest.requestId
        + ", sessionId: " + session.sessionId);

    // any session cleanup logic would go here
};

TwitterSkill.prototype.intentHandlers = {
    Trends: function (intent, session, response) {
        getTopSellers(intent, session, response);
    },

    HearMore: function (intent, session, response) {
        getNextPageOfItems(intent, session, response);
    },

    DontHearMore: function (intent, session, response) {
        response.tell("");
    },

    HelpIntent: function (intent, session, response) {
        helpTheUser(intent, session, response);
    }
};
/**
 * Returns the welcome response for when a user invokes this skill.
 */
function getWelcomeResponse(response) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    var speechOutput = "Here are the top trendng topics in your Area.";
    response.tell(speechOutput);
}
/**
 * Gets the next page of items based on information saved in the session.
 */
function getNextPageOfItems(intent, session, response) {
    var sessionAttributes = session.attributes;

    if (sessionAttributes[KEY_CURRENT_INDEX]) {
        var current = sessionAttributes[KEY_CURRENT_INDEX];
        var speechOutput = "";

        // Iterate through the session attributes to create the next n results for the user.
        for (var i = 0; i < PAGINATION_SIZE; i++) {
            if (sessionAttributes[current]) {
                var numberInList = current + 1;
                if (current < MAX_ITEMS - 1) {
                    speechOutput = speechOutput + ARRAY_FOR_ORDINAL_SPEECH[numberInList] + ". "
                        + sessionAttributes[current] + ". ";
                } else {
                    speechOutput = speechOutput + "And the " + ARRAY_FOR_ORDINAL_SPEECH[numberInList] + " top seller is. "
                        + sessionAttributes[current] + ". Those were the 10 top sellers in Amazon's "
                        + sessionAttributes[KEY_CURRENT_CATEGORY] + " department";
                }
                current = current + 1;
            }
        }

        // Set the new index and end the session if the newIndex is greater than the MAX_ITEMS
        sessionAttributes[KEY_CURRENT_INDEX] = current;
        var endSession = false;
        if (current < MAX_ITEMS) {
            speechOutput = speechOutput + " Would you like to hear more?";
            response.ask(speechOutput, "Would you like to hear more top sellers? Please say yes or no.");
        } else {
            response.tell(speechOutput);
        }
    } else {
        // The user attempted to get more results without ever uttering the category.
        // Reprompt the user for the proper usage.
        var speechOutput = "Welcome to the Savvy Consumer. For which category do you want to hear the best sellers?.";
        var repromptText = "Please choose a category by saying, "
            + "books, fashion, movie, kitchen";
        response.ask(speechOutput, repromptText);
    }
}

/**
 * Gets the lookup word based on the input category slot. The lookup word will be from the BROWSE_NODE_MAP and will
 * attempt to get an exact match. However, if no exact match exists then the function will check for a contains.
 * @param categorySlot the input category slot
 * @returns {string} the lookup word for the BROWSE_NODE_MAP
 */
function getLookupWord(categorySlot) {
    var lookupCategory;
    if (categorySlot && categorySlot.value) {
        // Lower case the incoming slot and remove spaces
        var category = categorySlot.value.toLowerCase().replace(/ /g, '').replace(/\./g, '').replace(/three/g, '3');
        var keys = Object.keys(BROWSE_NODE_MAP);

        //Check for spoken names
        lookupCategory = SPOKEN_NAME_TO_CATEGORY[category];

        if (!lookupCategory) {
            // Iterate through the keys in the BROWSE_NODE_MAP and look for a perfect match. The items in the
            // BROWSE_NODE_MAP must be cased properly for the API call to get the top sellers.
            keys.forEach(function (item) {
                if (item.toLowerCase() === category) {
                    lookupCategory = item;
                    return;
                }
            });
        }

        if (!lookupCategory) {
            // There was no perfect match, try to see if we can perform an indexOf.
            // This will help if the user says DVDs and the actual category is DVD.
            keys.forEach(function (item) {
                if (item.toLowerCase().indexOf(category) > -1 || category.indexOf(item.toLowerCase()) > -1) {
                    lookupCategory = item;
                    return;
                }
            })
        }
    }
    return lookupCategory;
}

/**
 * Instructs the user on how to interact with this skill.
 */
function helpTheUser(intent, session, response) {
    var speechOutput = "You can ask for the best sellers on Amazon for a given category. " +
        "For example, get best sellers for books, or you can say exit. " +
        "Now, what can I help you with?";
    var repromptText = "I'm sorry I didn't understand that. You can say things like, books, movies, music. " +
        "Or you can say exit. Now, what can I help you with?";

    response.ask(speechOutput, repromptText);
}

// Create the handler that responds to the Alexa Request.
exports.handler = function (event, context) {
    var twitterSkill = new TwitterSkill();
    twitterSkill.execute(event, context);
};
