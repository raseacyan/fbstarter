'use strict';
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const APP_URL = "https://fbstarterbot.herokuapp.com";

//new text

// Imports dependencies and set up http server
const 
  request = require('request'),
  express = require('express'),
  body_parser = require('body-parser'),
  firebase = require("firebase-admin"),
  ejs = require("ejs"),  
  fs = require('fs'),
  multer  = require('multer'),  
  app = express(); 

let bot_q = {
  askPhone: false,
  askHotel: false,
  askRestaurent:false
}

let user_input = {};




  
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
})

const upload = multer({ storage: storage });

// parse application/x-www-form-urlencoded
app.use(body_parser.json());
app.use(body_parser.urlencoded());


app.set('view engine', 'ejs');
app.set('views', __dirname+'/views');


var firebaseConfig = {
     credential: firebase.credential.cert({
    "private_key": process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    "client_email": process.env.FIREBASE_CLIENT_EMAIL,
    "project_id": process.env.FIREBASE_PROJECT_ID,    
    }),
    databaseURL: process.env.FIREBASE_DB_URL, 
    storageBucket: process.env.FIREBASE_SB_URL
  };



firebase.initializeApp(firebaseConfig);

let db = firebase.firestore(); 
let bucket = firebase.storage().bucket();



// Sets server port and logs message on success
app.listen(process.env.PORT || 1337, () => console.log('webhook is listening'));

// Accepts POST requests at /webhook endpoint
app.post('/webhook', (req, res) => {  

  // Parse the request body from the POST
  let body = req.body;

  

  // Check the webhook event is from a Page subscription
  if (body.object === 'page') {
    body.entry.forEach(function(entry) {

      let webhook_event = entry.messaging[0];
      let sender_psid = webhook_event.sender.id; 

      if (webhook_event.message) {
        if(webhook_event.message.quick_reply){
            handleQuickReply(sender_psid, webhook_event.message.quick_reply.payload);
          }else{
            handleMessage(sender_psid, webhook_event.message);                       
          }                
      } else if (webhook_event.postback) {        
        handlePostback(sender_psid, webhook_event.postback);
      }
      
    });
    // Return a '200 OK' response to all events
    res.status(200).send('EVENT_RECEIVED');

  } else {
    // Return a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }

});


app.use('/uploads', express.static('uploads'));

/*********************************************
START Eye of Eagle
**********************************************/

app.get('/addpackage/:sender_id',function(req,res){
    const sender_id = req.params.sender_id;
    res.render('addpackage.ejs',{title:"Hi!! from WebView", sender_id:sender_id});
});


app.post('/addpackage',function(req,res){


      
      let image  = req.body.image; 
      let title = req.body.title;
      let description = req.body.description;
      let sender = req.body.sender;   

      db.collection('package').add({
            image: image,
            title: title,
            description: description
          }).then(success => {             
             ThankYouEagle(sender);    
          }).catch(error => {
            console.log(error);
      });        
});


app.get('/booktour/:tour_package/:sender_id',function(req,res){
    const tour_package = req.params.tour_package;
    const sender_id = req.params.sender_id;
    res.render('booktour.ejs',{title:"Book Tour Package", tour_package:tour_package, sender_id:sender_id});
});


app.post('/booktour',function(req,res){
      let name  = req.body.name;
      let mobile = req.body.mobile;
      let tour_package = req.body.tour_package;
      let sender = req.body.sender;   


      db.collection('Tour Package Bookings').doc(tour_package).collection('customers').add({           
            name:name,
            mobile:mobile 
          }).then(success => {             
             ThankYouEagle(sender);    
          }).catch(error => {
            console.log(error);
      });        
});

app.get('/privatetour/:sender_id',function(req,res){    
    const sender_id = req.params.sender_id;
    res.render('privatetour.ejs',{title:"Create Your Own Private Tour", sender_id:sender_id});
});


app.post('/privatetour',function(req,res){
      
      let destination= req.body.destination;
      let activities = req.body.activities;
      let guests = req.body.guests;
      let travel_mode = req.body.travel_mode;
      let travel_option = req.body.travel_option;
      let hotel = req.body.hotel;
      let restaurent= req.body.restaurent;
      let name  = req.body.name;
      let mobile = req.body.mobile;
      let sender = req.body.sender;   

      db.collection('Private Tour Bookings').add({
            destination:destination,
            activities:activities,
            guests:guests,
            travel_mode:travel_mode,
            travel_option:travel_option,
            hotel:hotel,
            restaurent:restaurent,            
            name:name,
            mobile:mobile
          }).then(success => {             
             ThankYouEagle(sender);    
          }).catch(error => {
            console.log(error);
      });        
});


/*********************************************
END Eye of Eagle
**********************************************/







//webview test
app.get('/webview/:sender_id',function(req,res){
    const sender_id = req.params.sender_id;
    res.render('webview.ejs',{title:"Hello!! from WebView", sender_id:sender_id});
});

app.post('/webview',upload.single('file'),function(req,res){
       
      let name  = req.body.name;
      let email = req.body.email;
      let img_url = APP_URL + "/" + req.file.path;
      let sender = req.body.sender;    

      bucket.upload(img_url, function(err, file, apiResponse) {
          console.log("UPLOADED TO BUCKET");
      }); 

      /*
      bucket.upload(img_url).then(data => {
      console.log('upload success');
      }).catch(err => {
          console.log('error uploading to storage', err);
      });

      */  
      
      db.collection('booking').add({
            name: name,
            email: email,
            image: img_url
          }).then(success => {   
             console.log("DATA SAVED")
             thankyouReply(sender, name, img_url);    
          }).catch(error => {
            console.log(error);
      });        
});

//Set up Get Started Button. To run one time
//eg https://fbstarterbot.herokuapp.com/setgsbutton
app.get('/setgsbutton',function(req,res){
    setupGetStartedButton(res);    
});

//Set up Persistent Menu. To run one time
//eg https://fbstarterbot.herokuapp.com/setpersistentmenu
app.get('/setpersistentmenu',function(req,res){
    setupPersistentMenu(res);    
});

//Remove Get Started and Persistent Menu. To run one time
//eg https://fbstarterbot.herokuapp.com/clear
app.get('/clear',function(req,res){    
    removePersistentMenu(res);
});

//whitelist domains
//eg https://fbstarterbot.herokuapp.com/whitelists
app.get('/whitelists',function(req,res){    
    whitelistDomains(res);
});


// Accepts GET requests at the /webhook endpoint
app.get('/webhook', (req, res) => {
  

  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;  

  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];  
    
  // Check token and mode
  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      res.status(200).send(challenge);    
    } else {      
      res.sendStatus(403);      
    }
  }
});

/**********************************************
Function to Handle when user send quick reply message
***********************************************/

function handleQuickReply(sender_psid, received_message) {
  
  switch(received_message) {        
        case "on":
            showQuickReplyOn(sender_psid);
          break;
        case "off":
            showQuickReplyOff(sender_psid);
          break;                
        default:
            defaultReply(sender_psid);
  } 
 
}

/**********************************************
Function to Handle when user send text message
***********************************************/

const handleMessage = (sender_psid, received_message) => {
  //let message;
  let response;

  if(bot_q.askHotel && received_message.text){
        user_input.hotel = received_message.text;
        bot_q.askHotel = false;
        console.log('USER ENTER HOTEL');
        askPhone(sender_psid);
      }

  else    if(bot_q.askRestaurent && received_message.text){
        user_input.restaurent = received_message.text;
        bot_q.askRestaurent = false;
        askPhone(sender_psid);
      }

  else    if(bot_q.askPhone && received_message.text){
        user_input.phone = received_message.text;
        bot_q.askPhone = false;
        console.log('USER ENTER PHONE');
        updatePrivateTour(sender_psid, user_input.phone);
      }
  
  
  else if(received_message.attachments){
    let attachment_url = received_message.attachments[0].payload.url;
    response = {
      "attachment": {
        "type": "template",
        "payload": {
          "template_type": "generic",
          "elements": [{
            "title": "Is this the right picture?",
            "subtitle": "Tap a button to answer.",
            "image_url": attachment_url,
            "buttons": [
              {
                "type": "postback",
                "title": "Yes!",
                "payload": "yes-attachment",
              },
              {
                "type": "postback",
                "title": "No!",
                "payload": "no-attachment",
              }
            ],
          }]
        }
      }
    }
    callSend(sender_psid, response);
  } else {
      let user_message = received_message.text.toLowerCase();   
      
      

      switch(user_message) {        
        case "text":
            textReply(sender_psid);
          break;
        case "quick":
            quickReply(sender_psid);
          break;
        case "button":            
            buttonReply(sender_psid);
          break;
        case "webview":
            webviewTest(sender_psid);
          break; 
        case "eagle":
            eyeofEagle(sender_psid); 
            break;
        case "admin":
            adminCreatePackage(sender_psid); 
            break; 
        case "customer":
            selectMode(sender_psid); 
            break; 
        case "tour packages":
          showTourPackages(sender_psid); 
          break;  
        case "private tour":
          privateTour(sender_psid); 
          break; 
        case "amend tour":
          amendTour(sender_psid); 
          break; 
        case "change hotel":
          askHotel(sender_psid); 
          break;
        case "change restaurent":
          askRestaurent(sender_psid); 
          break;
        case "add book":
          addBooks(sender_psid);
          break;
        case "add review":
          addReview(sender_psid);
          break;
        case "gone with the wind":
          goneWithTheWind(sender_psid)
          break;
        case "effy":
          Effy(sender_psid)
          break;
        case "hobby":
          Hobby(sender_psid)
          break;
        default:
            defaultReply(sender_psid);
        }
    }

}

/*********************************************
START Eye of Eagle
**********************************************/

const eyeofEagle = (sender_psid) => { 
    let response = {
    "text": `Are you "admin" or "customer"?`,    
    };
    callSend(sender_psid, response); 
}


const amendTour = (sender_psid) => { 
    let response = {
    "text": `Do you want to change hotel or restaurent?`,    
    };
    callSend(sender_psid, response); 
}

const askHotel = (sender_psid) => {  
  bot_q.askHotel = true;  
  let response = {
    "text": `Enter name of the hotel you want to stay`,    
    };
    callSend(sender_psid, response); 
}


const askRestaurent = (sender_psid) => {
  bot_q.askRestaurent = true;
  let response = {
    "text": `Enter name of the restaurent you want to go`,    
    };
    callSend(sender_psid, response); 
}

const askPhone = (sender_psid) => {  
  bot_q.askPhone = true;
 
  let response = {
    "text": `Please enter your mobile number which you used before`,    
    };
    callSend(sender_psid, response); 
}

const updatePrivateTour = (sender_psid, phone, field) =>{
  
  let query =  db.collection('Private Tour Bookings').where('mobile', '==', phone).limit(1).get()
  .then(snapshot => {
    if (snapshot.empty) {
      console.log('No matching documents.');
      let response = {
        "text": `No users with that phone number`,    
      };
      callSend(sender_psid, response);
      return;
    } 

    const booking = snapshot.docs[0];


    
    if(user_input.hotel){
       booking.ref.update({hotel:user_input.hotel});
    }

    if(user_input.restaurent){
      booking.ref.update({restaurent:user_input.restaurent});
    }
    
    


  })
  .catch(err => {
    console.log('Error getting documents', err);
  });


  
  ThankYouEagle(sender_psid);    
}


const selectMode = (sender_psid) => { 
    let response1 = {"text": "Do you want to see our tour packages?, (type 'tour packages')"};
    let response2 = {"text": "Do you want to create your own custom private tour? (type 'private tour')"};
    let response3 = {"text": "Do you want to amend your private tour (type 'amend tour')"};   
    let response4 = {"text": "todo"};
      callSend(sender_psid, response1).then(()=>{
        return callSend(sender_psid, response2).then(()=>{
          return callSend(sender_psid, response3).then(()=>{
            return callSend(sender_psid, response4);
          });
        });
    });     
}


const showTourPackages =(sender_psid) => {  

  db.collection('package').get()
  .then((snapshot) => {
    let elementItems = [];



    snapshot.forEach((doc) => {

  
      var obj = {};
      //obj._id  = doc.id ;        
      obj.title = doc.data().title;              
      
       
      obj.image_url = doc.data().image;
      obj.buttons = [{"type":"web_url", "title":"BOOK NOW", "url":"https://fbstarterbot.herokuapp.com/booktour/" + obj.title+"/"+sender_psid, "webview_height_ratio": "full", "messenger_extensions": true}];   

      elementItems.push(obj);
     
    });

  let response = {
            "attachment": {
              "type": "template",
              "payload": {
                "template_type": "generic",
                "image_aspect_ratio": "square",
                "elements": elementItems
              }
            }
          }

    console.log("RESPONSE", response);
    console.log("SENDER",sender_psid,);
    callSend(sender_psid, response);
  })
  .catch((err) => {
    console.log('Error getting documents', err);
  });
 
}

function adminCreatePackage(sender_psid){
  let response;
  response = {
      "attachment": {
        "type": "template",
        "payload": {
          "template_type": "generic",
          "elements": [{
            "title": "Create a tour package",                       
            "buttons": [              
              {
                "type": "web_url",
                "title": "create",
                "url":"https://fbstarterbot.herokuapp.com/addpackage/"+sender_psid,
                 "webview_height_ratio": "full",
                "messenger_extensions": true,          
              },
              
            ],
          }]
        }
      }
    }
  callSendAPI(sender_psid, response);
}


function privateTour(sender_psid){
  let response;
  response = {
      "attachment": {
        "type": "template",
        "payload": {
          "template_type": "generic",
          "elements": [{
            "title": "Create your private tour",                       
            "buttons": [              
              {
                "type": "web_url",
                "title": "Create",
                "url":"https://fbstarterbot.herokuapp.com/privatetour/"+sender_psid,
                 "webview_height_ratio": "full",
                "messenger_extensions": true,          
              },
              
            ],
          }]
        }
      }
    }
  callSendAPI(sender_psid, response);
}

const ThankYouEagle = (sender_psid) => { 
    let response = {
    "text": `Your data is saved`,    
    };
    callSend(sender_psid, response); 
}

/*********************************************
END Eye of Eagle
**********************************************/


const addBooks  = (sender_psid) => { 
    let book1 = {
      title:"Gone with the Wind",
      author:"Margaret Mitchell",
      description:"Gone with the Wind is a novel by American writer Margaret Mitchell, first published in 1936. The story is set in Clayton County and Atlanta, both in Georgia, during the American Civil War and Reconstruction Era",
      publisher:"Macmillan Inc.",
      year: 1936,
      genre:['Historical Fiction', 'Novel'],
      
    }

    let book2 = {
      title:"Kane and Abel",
      author:"Jeffrey Archer",
      description:"Kane and Abel is a 1979 novel by British author Jeffrey Archer. Released in the United Kingdom in 1979 and in the United States in February 1980, the book was an international success. It reached No. 1 on the New York Times best-seller list",
      publisher:"Hodder & Stoughton",
      year: 1979,
      genre:['Fiction', 'Novel'],
     
    }

    let book3 = {
      title:"Roots",
      author:"Alex Haley",
      description:"Roots: The Saga of an American Family is a 1976 novel written by Alex Haley. It tells the story of Kunta Kinte, an 18th-century African, captured as an adolescent, sold into slavery in Africa, transported to North America; following his life and the lives of his descendants in the United States down to Haley",
      publisher:"Doubleday",
      year: 1976,
      genre:['Novel', 'Biography', 'Fictional Autobiography'],
     
    }

    db.collection('Books').add(
          book1
        ).then(success => {      
           console.log('BOOK ADDED');              
        }).catch(error => {
          console.log(error);
    });

    db.collection('Books').add(
          book2
        ).then(success => {      
           console.log('BOOK ADDED');             
        }).catch(error => {
          console.log(error);
    });

    db.collection('Books').add(
          book3
        ).then(success => {      
           console.log('BOOK ADDED');          
        }).catch(error => {
          console.log(error);
    });
}


const addReview  = (sender_psid) => { 
    let review1 = {
      book:"Gone with the Wind",
      author: "Effy",
      link: "www.google.com"
    }

    let review2 = {
      book:"Gone with the Wind",
      author: "Emily",
      link: "www.google.com"
    }

    let review3 = {
      book:"Kane and Abel",
      author: "Katie",
      link: "www.google.com"
    }

    let review4 = {
      book:"Roots",
      author: "Effy",
      link: "www.google.com"
    }

    

   db.collection('Book Reviews').add(
          review1
        ).then(success => {      
           console.log('REVIEW ADDED');            
        }).catch(error => {
          console.log(error);
    });


    db.collection('Book Reviews').add(
          review2
        ).then(success => {      
           console.log('REVIEW ADDED');            
        }).catch(error => {
          console.log(error);
    });

    db.collection('Book Reviews').add(
          review3
        ).then(success => {      
           console.log('REVIEW ADDED');            
        }).catch(error => {
          console.log(error);
    });

    db.collection('Book Reviews').add(
          review4
        ).then(success => {      
           console.log('REVIEW ADDED');            
        }).catch(error => {
          console.log(error);
    });

}




const goneWithTheWind  = (sender_psid) => { 
  let book = {};
  book.review = [];
  let id; 

  db.collection("Books").where("title", "==", "Gone with the Wind")
    .get()
    .then(function(querySnapshot) {
        querySnapshot.forEach(function(doc) {

            book.id = doc.id;
            book.author = doc.data().author;
            book.description = doc.data().description;
            book.genre = doc.data().genre;
            book.publisher = doc.data().publisher;            
            book.year = doc.data().year;


            db.collection("Book Reviews").where("book", "==", "Gone with the Wind")
            .get()
            .then(function(querySnapshot) {
                querySnapshot.forEach(function(doc) {
                    console.log('reivew', doc.data().link, doc.data().author);
                    book.review.push(doc.data().link);           

                });
                 console.log('BOOK', book);
            })
            .catch(function(error) {
                console.log("Error getting documents: ", error);
            });

        });
    })
    .catch(function(error) {
        console.log("Error getting documents: ", error);
    });
}

const Effy  = (sender_psid) => { 


}


const Hobby  = (sender_psid) => { 
  let books = [];
  let hobby =['Biography','Historical Fiction'];


    db.collection("Books").where("genre", "array-contains-any", hobby)
    .get()
    .then(function(querySnapshot) {
        querySnapshot.forEach(function(doc) {
            let book = {};

            book.id = doc.id;
            book.author = doc.data().author;
            book.description = doc.data().description;
            book.genre = doc.data().genre;
            book.publisher = doc.data().publisher;            
            book.year = doc.data().year;


            books.push(book);

    

        });
      console.log('Hobby', books);
    })
    .catch(function(error) {
        console.log("Error getting documents: ", error);
    });

}




/*********************************************
Function to handle when user click button
**********************************************/
const handlePostback = (sender_psid, received_postback) => {
  let payload = received_postback.payload;
  switch(payload) {        
      case "yes":
          showButtonReplyYes(sender_psid);
        break;
      case "no":
          showButtonReplyNo(sender_psid);
        break;                
      default:
          defaultReply(sender_psid);
  } 
}


function webviewTest(sender_psid){
  let response;
  response = {
      "attachment": {
        "type": "template",
        "payload": {
          "template_type": "generic",
          "elements": [{
            "title": "Click to open webview?",                       
            "buttons": [              
              {
                "type": "web_url",
                "title": "webview",
                "url":"https://fbstarterbot.herokuapp.com/webview/"+sender_psid,
                 "webview_height_ratio": "full",
                "messenger_extensions": true,          
              },
              
            ],
          }]
        }
      }
    }
  callSendAPI(sender_psid, response);
}

const textReply =(sender_psid) => {
  let response = {"text": "You sent text message"};
  callSend(sender_psid, response);
}


const quickReply =(sender_psid) => {
  let response = {
    "text": "Select your reply",
    "quick_replies":[
            {
              "content_type":"text",
              "title":"On",
              "payload":"on",              
            },{
              "content_type":"text",
              "title":"Off",
              "payload":"off",             
            }
    ]
  };
  callSend(sender_psid, response);
}

const showQuickReplyOn =(sender_psid) => {
  let response = { "text": "You sent quick reply ON" };
  callSend(sender_psid, response);
}

const showQuickReplyOff =(sender_psid) => {
  let response = { "text": "You sent quick reply OFF" };
  callSend(sender_psid, response);
}

const buttonReply =(sender_psid) => {

  let response = {
      "attachment": {
        "type": "template",
        "payload": {
          "template_type": "generic",
          "elements": [{
            "title": "Are you OK?",
            "image_url":"https://www.mindrops.com/images/nodejs-image.png",                       
            "buttons": [
                {
                  "type": "postback",
                  "title": "Yes!",
                  "payload": "yes",
                },
                {
                  "type": "postback",
                  "title": "No!",
                  "payload": "no",
                }
              ],
          }]
        }
      }
    }

  
  callSend(sender_psid, response);
}

const showButtonReplyYes =(sender_psid) => {
  let response = { "text": "You clicked YES" };
  callSend(sender_psid, response);
}

const showButtonReplyNo =(sender_psid) => {
  let response = { "text": "You clicked NO" };
  callSend(sender_psid, response);
}

const thankyouReply =(sender_psid, name, img_url) => {
  let response = {
      "attachment": {
        "type": "template",
        "payload": {
          "template_type": "generic",
          "elements": [{
            "title": "Thank you! " + name,
            "image_url":img_url,                       
            "buttons": [
                {
                  "type": "postback",
                  "title": "Yes!",
                  "payload": "yes",
                },
                {
                  "type": "postback",
                  "title": "No!",
                  "payload": "no",
                }
              ],
          }]
        }
      }
    }
  callSend(sender_psid, response);
}

const defaultReply = (sender_psid) => {
  let response1 = {"text": "To test text reply, type 'text'"};
  let response2 = {"text": "To test quick reply, type 'quick'"};
  let response3 = {"text": "To test button reply, type 'button'"};   
  let response4 = {"text": "To test webview, type 'webview'"};
    callSend(sender_psid, response1).then(()=>{
      return callSend(sender_psid, response2).then(()=>{
        return callSend(sender_psid, response3).then(()=>{
          return callSend(sender_psid, response4);
        });
      });
  });  
}

const callSendAPI = (sender_psid, response) => {  
  let request_body = {
    "recipient": {
      "id": sender_psid
    },
    "message": response
  }
  
  return new Promise(resolve => {
    request({
      "uri": "https://graph.facebook.com/v2.6/me/messages",
      "qs": { "access_token": PAGE_ACCESS_TOKEN },
      "method": "POST",
      "json": request_body
    }, (err, res, body) => {
      if (!err) {
        resolve('message sent!')
      } else {
        console.error("Unable to send message:" + err);
      }
    }); 
  });
}

async function callSend(sender_psid, response){
  let send = await callSendAPI(sender_psid, response);
  return 1;
}


/*************************************
FUNCTION TO SET UP GET STARTED BUTTON
**************************************/

const setupGetStartedButton = (res) => {
  let messageData = {"get_started":{"payload":"get_started"}};

  request({
      url: 'https://graph.facebook.com/v2.6/me/messenger_profile?access_token='+ PAGE_ACCESS_TOKEN,
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      form: messageData
    },
    function (error, response, body) {
      if (!error && response.statusCode == 200) {        
        res.send(body);
      } else { 
        // TODO: Handle errors
        res.send(body);
      }
  });
} 

/**********************************
FUNCTION TO SET UP PERSISTENT MENU
***********************************/

const setupPersistentMenu = (res) => {
  var messageData = { 
      "persistent_menu":[
          {
            "locale":"default",
            "composer_input_disabled":false,
            "call_to_actions":[
                {
                  "type":"postback",
                  "title":"View My Tasks",
                  "payload":"view-tasks"
                },
                {
                  "type":"postback",
                  "title":"Add New Task",
                  "payload":"add-task"
                },
                {
                  "type":"postback",
                  "title":"Cancel",
                  "payload":"cancel"
                }
          ]
      },
      {
        "locale":"default",
        "composer_input_disabled":false
      }
    ]          
  };
        
  request({
      url: 'https://graph.facebook.com/v2.6/me/messenger_profile?access_token='+ PAGE_ACCESS_TOKEN,
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      form: messageData
  },
  function (error, response, body) {
      if (!error && response.statusCode == 200) {
          res.send(body);
      } else { 
          res.send(body);
      }
  });
} 

/***********************
FUNCTION TO REMOVE MENU
************************/

const removePersistentMenu = (res) => {
  var messageData = {
          "fields": [
             "persistent_menu" ,
             "get_started"                 
          ]               
  };  
  request({
      url: 'https://graph.facebook.com/v2.6/me/messenger_profile?access_token='+ PAGE_ACCESS_TOKEN,
      method: 'DELETE',
      headers: {'Content-Type': 'application/json'},
      form: messageData
  },
  function (error, response, body) {
      if (!error && response.statusCode == 200) {          
          res.send(body);
      } else {           
          res.send(body);
      }
  });
} 


/***********************************
FUNCTION TO ADD WHITELIST DOMAIN
************************************/

const whitelistDomains = (res) => {
  var messageData = {
          "whitelisted_domains": [
             "https://fbstarterbot.herokuapp.com" , 
             "https://herokuapp.com"                           
          ]               
  };  
  request({
      url: 'https://graph.facebook.com/v2.6/me/messenger_profile?access_token='+ PAGE_ACCESS_TOKEN,
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      form: messageData
  },
  function (error, response, body) {
      if (!error && response.statusCode == 200) {          
          res.send(body);
      } else {           
          res.send(body);
      }
  });
} 