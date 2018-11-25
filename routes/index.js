var express = require('express');
var router = express.Router();
var path=require('path');
var passport = require('passport');
var User=require('../models/user');
var PythonShell = require('python-shell').PythonShell;
var bodyParser = require('body-parser');
var fs = require('fs');
var multer  = require('multer');

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, '../uploadImage/');
  },
  filename: function(req, file, cb) {
    cb(null, req.user.id+".png");
  }
});

const upload = multer({
  storage: storage,
});

router.get('/health_test', function(req, res, next) {
    console.log('health test');
    res.status(200).send('200');
});

router.post('/login', passport.authenticate('login', {
    successRedirect : '/judge',
    failureRedirect : '/signin', //로그인 실패시 redirect할 url주소
    failureFlash : true
}));
router.post('/signup', passport.authenticate('signup', {
    successRedirect : '/signin',
    failureRedirect : '/signin', //가입 실패시 redirect할 url주소
    failureFlash : true
}));
router.post('/editProfile', isLoggedIn, (req,res)=>{
    User.findOneAndUpdate(
      {email:req.user.email},
      {$set:{name:req.body.name, password:new User().generateHash(req.body.password)}},
      (err,doc)=>{
        if(err){
          res.status(404).redirect('/edit');
        }
        else {
          res.status(200).redirect('/profile');
        }
      }
    );
});

//로그인 확인
function isLoggedIn(req, res, next) {

    if (req.isAuthenticated()){
        return next();
    } else {
        res.redirect('/signin');
    }
}

/* GET home page. */
router.get('/', function(req, res, next) {
    res.sendFile(path.join(__dirname,'html','/Main/main.html'));
});
router.get('/getStart', function(req, res, next) {
    res.sendFile(path.join(__dirname,'html','/Login/login.html'));
});
router.get('/signin', function(req, res, next) {
    console.log(req.flash('loginMessage')[0]);
    console.log(req.flash('signupMessage')[0]);
    res.sendFile(path.join(__dirname,'html','/Login/login.html'));
});
router.get('/judge', (req,res)=>{
    if(req.user.points=="none"){
      res.redirect('/register');
    }
    else {
      res.redirect('/Intro1');
    }
});
router.get('/register',isLoggedIn, function(req,res,next){
  res.sendFile(path.join(__dirname,'html','/Regist/regist.html'));
});
router.post('/regist', isLoggedIn, upload.single('data'),function(req,res,next){
  console.log(req.file);
  var userId=req.user.id;
  var options = {
    mode: 'text',
    pythonOptions: ['-u'],
    args: ['--model=mobilenet_thin', '--resize=432x368', '--image=../uploadImage/'+userId+'.png', '--userId='+userId]
  };
  var pyshell = new PythonShell('../../JASE-AI-side/run_to_return_image.py', options);
  pyshell.on('message', function (message) {
    console.log("Status: ok");
  });
  res.redirect(200,'/confirm');// send page to move as reponse
});
router.get('/confirm', isLoggedIn, function(req,res){
  var image = "https://nubalans.com/images/"+req.user.id+".png";
  var confirmHtml = `
  <!DOCTYPE html>
  <html lang="ko">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <link rel="stylesheet" href="stylesheets/css/confirm.css">
    <title>Document</title>
  </head>
  <body>
    <img src=${image} alt="" width="1080" height="640" id="img">
    <button type="button" name="button" id="revise" onclick="window.open('/register', '_self')">&lt;&lt; revise</button>
    <button type="button" name="button" id="confirm" onclick="window.open('/savePoints', '_self')">confirm &gt;&gt;</button>
  </body>
  </html>
  `;
  res.send(confirmHtml);
});
router.get('/savePoints', isLoggedIn,(req,res)=>{
  var options = {
    mode: 'text',
    pythonOptions: ['-u'],
    args: ['--model=mobilenet_thin', '--resize=432x368', '--image=../uploadImage/'+req.user.id+'.png']
  };
  var pyshell = new PythonShell('../../JASE-AI-side/run.py', options);
  pyshell.on('message', function (message) {
    User.findOneAndUpdate(
      {email:req.user.email},
      {$set:{points:message}},
      (err,doc)=>{
        if(err){
          res.redirect('/register');
        }
        else {
          res.redirect('/Intro1');
        }
      }
    );
  });
});
router.get('/Intro', isLoggedIn, (req,res)=>res.redirect('/Intro1'));
router.get('/Intro1', isLoggedIn, function(req, res, next) {
    res.sendFile(path.join(__dirname,'html','/Intro/Intro_1.html'));
});
router.get('/Intro2', isLoggedIn, function(req, res, next) {
    res.sendFile(path.join(__dirname,'html','/Intro/Intro_2.html'));
});
router.get('/Intro3', isLoggedIn, function(req, res, next) {
    res.sendFile(path.join(__dirname,'html','/Intro/Intro_3.html'));
});
router.get('/subMain', isLoggedIn, function(req,res,nexr){
  var name=req.user.name;
  var days= req.user.loginCount;
  var hpoint = Math.floor(getScoreAverage(req.user.scores));
  var npoint = 100 - hpoint;
  var subMain = `
  <!DOCTYPE html>
  <html lang="ko">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <link rel="stylesheet" href="/stylesheets/css/submain.css">
    <link href="https://fonts.googleapis.com/css?family=Open+Sans" rel="stylesheet">
    <title>Document</title>
  </head>
  <body>
    <img src="/images/SubMain_1.png" id="img_1">
    <img src="/images/SubMain_2.png" id="img_2">
    <img src="/images/SubMain_3.png" id="img_3">
    <img src="/images/SubMain_4.png" id="img_4">
    <img src="/images/SubMain_5.png" id="img_5">
    <div class="nav" id="home">Home</div>
    <div class="nav" id="menu" onclick="window.open('/menu', '_self')">Menu</div>
    <div class="nav" id="profile" onclick="window.open('/profile', '_self')">Profile</div>
    <div class="nav" id="intro" onclick="window.open('/Intro1', '_self')">Intro</div>
    <div id="name">${name}</div>
    <h1><div id="npoint">${npoint}</div></h1>
    <div id="ntext">points <br> you need</div>
    <h1><div id="hpoint">${hpoint}</div></h1>
    <div id="htext">points <br> you have</div>
    <h1><div id="date">${days}</div></h1>
    <div id="day">days</div>
  </body>
  </html>
  `;
  res.send(subMain);
});
router.get('/menu', isLoggedIn, function(req,res) {
  res.sendFile(path.join(__dirname,'html','/Menu/menu.html'))
});
router.get('/profile',isLoggedIn,function(req,res,next){
  var name = req.user.name;
  var id = req.user.email;
  var pw = "******";
  var profile=`
  <!DOCTYPE html>
  <html lang="ko">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <link rel="stylesheet" href="/stylesheets/css/profile.css">
    <title>Document</title>
  </head>
  <body>
    <div class="nav" id="Home" onclick="window.open('/SubMain', '_self')">Home</div>
    <div class="nav" id="Menu" onclick="window.open('/Menu', '_self')">Menu</div>
    <div class="nav" id="Profile" onclick="window.open('/Profile', '_self')">Profile</div>
    <div class="nav" id="Intro" onclick="window.open('/Intro', '_self')">Intro</div>
    <img src="/images/Profile.png" id="img">
    <div id="Title">Profile.</div>
    <div id="username">USERNAME</div>
    <div id="usernamec">${name}</div>
    <div id="id">ID</div>
    <div id="idc">${id}</div>
    <div id="pass">PASSWORD</div>
    <div id="passc">${pw}</div>
    <button type="button" name="button" id="btn" onclick="window.open('/edit','_self')">EDIT</button>
  </body>
  </html>

  `;
  res.send(profile);
});
router.get('/edit', isLoggedIn, function (req,res){
  res.sendFile(path.join(__dirname,'html','Edit/edit.html'));
});
router.post('/estimate', isLoggedIn,upload.single('data'),(req,res)=>{
  console.log(req.file);
  var options = {
    mode: 'text',
    pythonOptions: ['-u'],
    args: ['--model=mobilenet_thin', '--resize=432x368', '--image=../uploadImage/'+req.file.filename]
  };
  var pyshell = new PythonShell('../../JASE-AI-side/run.py', options);
  pyshell.on('message', function (message) {
    var users = JSON.parse(req.user.points);
    var result = JSON.parse(message);
    result = compare(users,result);
    console.log("score: "+result);
    var preScore = req.user.scores;
    preScore.push(result);
    User.findOneAndUpdate(
      {email:req.user.email},
      {$set:{scores:preScore}},
      (err,doc)=>{
      }
    );
  });
});

function compare(users, curr){
  var result=0;
  for(i in users){
    var x,y;
    if(curr[i]){
    if(users[i][0]>curr[i][0]){
      x=curr[i][0]/users[i][0];
    } else {
      x=users[i][0]/curr[i][0];
    }
    if(users[i][1]>curr[i][1]){
      y=curr[i][1]/users[i][1];
    } else {
      y=users[i][1]/curr[i][1];
    }
    result+=x*100+y*100;
    }
  }
  return result/(Object.keys(users).length*2);
}

function getScoreAverage(arr){
  var result=0, cnt=0;
  arr.forEach((e)=>{
    result+=e;
    cnt++;
  });
  return isNaN(result/(cnt-1))?0:result/(cnt-1);
}

module.exports = router;
