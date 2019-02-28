var express = require('express');
var router = express.Router();
var mongo = require('mongodb').MongoClient;
var objectId = require('mongodb').ObjectID;
var assert = require('assert');
var path = require('path');

var url = 'mongodb://localhost:27017/user_details';

router.get('/register', function(req, res, next) {
  res.sendFile(path.resolve(__dirname + '/../static_pages/registrationpage.html'));
});

router.get('/', function(req, res, next) {
  res.sendFile(path.resolve(__dirname + '/../static_pages/userlogin.html'));

});

router.get('/adminlogin', function(req, res, next) {
  res.sendFile(path.resolve(__dirname + '/../static_pages/adminlogin.html'));
});

router.get('/userlogin', function(req, res, next) {
  res.sendFile(path.resolve(__dirname + '/../static_pages/userlogin.html'));

});

// from user dashboard page we get a request to the route
router.get('/comp_page', function(req, res, next) {
  var uname = req.query.uname;  // roll number is passed here
  res.render('complaint_page', {
    title: uname
  });
});

router.get('/logout', function(req, res, next) {

  req.session.destroy(function(err) {
    // cannot access session here
    if (err) {
      console.log('Unable to kill session');
      res.status(404);
      res.send('Unable to logout!!');
    } else {
      res.redirect('/userlogin');
    }

  });


});


router.get('/user_dashboard_filter', function(req, res, next) {

  if (req.session.user) {

    mongo.connect(url, function(err, db) {
      assert.equal(null, err);
      var dep = req.query.dep;  // comes from user_dashboard ejs
      var date = req.query.date;
      var uname = req.query.uname;
      console.log(dep);
      console.log(date);
      var cursor;
      if(dep=="ALL"){
        cursor = db.collection('complaints').find({});
      } else if(date == '') {
        cursor = db.collection('complaints').find({
            dep: dep
        });  
      } else {
        cursor = db.collection('complaints').find({
            dep: dep, date: date
        }); 
      }
      
      var resultArray = [];
      cursor.forEach(function(doc, err) {
        assert.equal(null, err);
        resultArray.push(doc);
      }, function() {
        db.close();
        res.render('user_dashboard', {
          complaint: resultArray,
          title: uname  // uname refers to the roll in complaints table
        });
      });
    });

  } else {
    res.status(404);
    res.send('Dashboard Denied!!');
  }
});


router.get('/user_dashboard', function(req, res, next) {
  if (req.session.user) {

    mongo.connect(url, function(err, db) {
      assert.equal(null, err);
      var uname = req.query.uname;  // comes from user_login_check, ideally what is entered as username comes here (roll number)
      var cursor = db.collection('complaints').find({
        //roll: uname
      });
      var resultArray = [];
      cursor.forEach(function(doc, err) {
        assert.equal(null, err);
        resultArray.push(doc);
      }, function() {
        db.close();
        res.render('user_dashboard', {
          complaint: resultArray,
          title: uname  // uname refers to the roll in complaints table
        });
      });
    });

  } else {
    res.status(404);
    res.send('Dashboard Denied!!');
  }
});

router.get('/admin_dashboard', function(req, res, next) {

  if (req.session.user && req.session.admin && req.session.dep==req.query.dep) {
    console.log('in admin dashboard route');
    mongo.connect(url, function(err, db) {
      assert.equal(null, err);
      var uname = req.query.uname;
      var dept = req.query.dep;
      var cursor = db.collection('complaints').find({
        dep: dept
      });
      // if cursor is empty need to handle it by sending appropriate response page
      var resultArray = [];
      cursor.forEach(function(doc, err) {
        assert.equal(null, err);
        resultArray.push(doc);
      }, function() {
        db.close();
        res.render('admin_dashboard', {
          complaint: resultArray,
          title: uname,
          dep: dept,
          selected: "selected"
        });
      });
    });

  } else {
    res.status(404);
    res.send('Dashboard Denied!!');
  }
});

router.post('/update_status', function(req, res, next) {

  if (req.session.user && req.session.admin) {

    var data = JSON.parse(req.body.data);

    mongo.connect(url, function(err, db) {
      assert.equal(null, err);

      for (var i = 0; i < data.length; i++) {
        var complaint = data[i];
        //console.log(complaint.roll);
        db.collection('complaints').updateOne({
          "roll": complaint.roll,
          "dep": complaint.dep,
          "title": complaint.title
        }, {
          $set: {
            "status": complaint.status
          }
        }, function(err, result) {
          assert.equal(null, err);
        });

      }
      console.log('Status updated');
      db.close();
      res.status(200);
      res.send("success");
    });

  } else {
    res.status(404);
    res.send('Dashboard Denied!!');
  }

});


//---------------------CHARAN prevent repeated complaints by same user & add complaint----------------
router.post('/addComp', function(req, res, next) {

  var date = new Date();
  var d = date.getDate();
  var m = date.getMonth()+1;
  var y = date.getFullYear();
  var arr = [d, m, y];
  var new_date = arr.join("-"); // dd-m-yyyy format will be stored
  
  var item = {
    roll: req.body.uname,
    dep: req.body.dep,
    title: req.body.complaintTitle,
    details: req.body.complaint,
    status: "Initial",
    date: new_date
  };

  mongo.connect(url, function(err, db) {
  assert.equal(null, err);


  db.collection('complaints').findOne( { compTitle: item.title , uid: item.roll }, function(err, uname) {
    if (err) {
      console.log(err);
    }
    var message;
    if (uname) {
      console.log(uname);
      message = "complaint already exists";
      console.log(message);
      console.log(message);
      res.status(404);
      res.send('This complaint already exists, look for it\'s status in Dashboard');
    }
    else {

          message = "adding complaint to database";
          console.log(message);
          db.collection('complaints').insertOne(item, function(err, result) {
              assert.equal(null, err);
              console.log('complaint added');
              var string = encodeURIComponent(item.roll);
              res.redirect('/user_dashboard?uname=' + string);
              db.close();
        });
  }

  });

  });



});

//----------------CHARAN user-log in-------------------------------------------------------------------
router.post('/user_login_check', function(req, res, next) {

  var item = {
    uname: req.body.regName,
    pass: req.body.regPwd
  };



  mongo.connect(url, function(err, db) {
  assert.equal(null, err);

  db.collection('users').find({
     uid: item.uname , pass:item.pass
   }).count().then(function(cnt) {
     if (cnt==0) {
      console.log("count is...");
      console.log(cnt);
      console.log(item.uname);
      message = "Incorrect username or password";
      console.log(message);
      res.status(404);
      res.send('Please check if you typed correct Username & Password');
     } else {
       console.log("count is...");
       console.log(cnt);
       console.log("Succesful log-in");
       req.session.user = item.uname;//req.body.regName; //use ssession
       req.session.admin = false; //need not handle for now
       message = "Perfect, username or password";
       console.log(message);
      //  res.status(404);
      //  res.send('Log-in success, congrats !!');
       var string = encodeURIComponent(item.uname);
       res.redirect('/user_dashboard?uname=' + string);
       db.close();

     }

 });

});
});

//------------------CHARAN Admin-log in-----------------------------------------------------------------
router.post('/admin_login_check', function(req, res, next) {

  var item = {
    uname: req.body.regName,
    pass: req.body.regPwd,
    dept: req.body.dep
  };
  mongo.connect(url, function(err, db) {
  assert.equal(null, err);

      db.collection('users').find({
         uid: item.uname , pass:item.pass , dept:item.dept, isAdmin:"true"

       }).count().then(function(cnt) {
         if (cnt==0) {
          console.log("count is...");
          console.log(cnt);
          console.log(item.uname);
          message = "Incorrect Admin username or password";
          console.log(message);
          res.status(404);
          res.send('Please check if you typed correct Admin Username & Password');
         } else {
           console.log("Succesful Admin log-in");
           req.session.user = item.uname;//req.body.regName; //use ssession
           req.session.admin = true; //need not handle for now
           req.session.dep = item.dept;
           message = "Perfect, Admin username or password";
           console.log(message);
           var uname = encodeURIComponent(item.uname);
           var dep = encodeURIComponent(item.dept);
           res.redirect('/admin_dashboard?uname=' + uname+'&dep='+dep);
           db.close();
         }

     });

});
});

//-------------------CHARAN EDITED: ADDED "User exists already" feature---------------------------------
router.post('/register_check', function(req, res, next) {

  var isadmn;
  if(req.body.isAdmin == "isAdmin") {
    isadmn = "true";
  } else {
    isadmn = "false";
  }

  var item = {
    dept: req.body.dep,
    uname: req.body.regName,
    pass: req.body.regPwd,
    uid: req.body.regId,
    isAdmin: isadmn
  };

    
    mongo.connect(url, function(err, db) {
    assert.equal(null, err);
    console.log(item.dept);
    console.log(item.isAdmin);
    
    //multiple admins cannot be logged in
    if(isadmn=="true") {

            db.collection('users').findOne( {dept: item.dept, isAdmin: item.isAdmin}, function(err, uname) {
                  if (err) {
                    console.log(err);
                  }
                  var message;
                  if (uname) {
                    console.log(uname);
                    message = "an admin for the registered department already exists";
                    console.log(message);
                    res.status(404);
                    res.send('an admin for the registered department already exists');
                  }
                  else {

                    message = "user doesn't exist, so inserting..";
                    console.log(message);

                        db.collection('users').insertOne(item, function(err, result) {
                        assert.equal(null, err);
                        console.log('Item inserted');
                        db.close();
                        res.sendFile(path.resolve(__dirname + '/../static_pages/userlogin.html'));
                      });
                  }

          });

    } else {

          db.collection('users').findOne( {uid: req.body.regId }, function(err, uname) {
                  if (err) {
                    console.log(err);
                  }
                  var message;
                  if (uname) {
                    console.log(uname);
                    message = "user exists";
                    console.log(message);
                    console.log(message);
                    res.status(404);
                    res.send('User already exists, Login or Signup with a different id');
                  }
                  else {

                    message = "user doesn't exist, so inserting..";
                    console.log(message);

                        db.collection('users').insertOne(item, function(err, result) {
                        assert.equal(null, err);
                        console.log('Item inserted');
                        db.close();
                        res.sendFile(path.resolve(__dirname + '/../static_pages/userlogin.html'));
                      });
                  }

          });

    }
    

});
});
//-------------------------------------------------------------------------------------------------------
router.get('/chart', function(req, res, next) {
  var cntArr = [];
  var inCnt = 0;

  mongo.connect(url, function(err, db) {

    assert.equal(null, err);

    db.collection('complaints').distinct("dep").then(function(depArr) {

      var sz = depArr.length - 1;

      // loop through all the distinct departments found in the complaints table
      for (var i = 0; i <= sz; i++) {
            
            var dept = depArr[i];

            db.collection('complaints').find({dep: dept}).count().then(function(cnt) {

                  cntArr.push(cnt);
                  console.log(inCnt);

                  // if this is the last callback, render the charts page
                  if (inCnt == sz) {

                        console.log("Done");
                        console.log(depArr);
                        console.log(cntArr);
                        res.render('charts', {dep: depArr,count: cntArr});
                        db.close(); // not sure how this is working
                  
                  } else {

                    inCnt += 1;
                    console.log(cntArr);
                  }

                });
            
            console.log(dept);
       }

    });

  });
});

// router.post('/delete', function(req, res, next) {
//   var id = req.body.id;

//   mongo.connect(url, function(err, db) {
//     assert.equal(null, err);
//     db.collection('user-data').deleteOne({
//       "_id": objectId(id)
//     }, function(err, result) {
//       assert.equal(null, err);
//       console.log('Item deleted');
//       db.close();
//     });
//   });
// });

module.exports = router;
