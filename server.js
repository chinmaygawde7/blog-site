var express = require("express");
var app = express();
var bodyParser = require("body-parser");
const { ObjectID } = require("mongodb");

var formidable = require("formidable");
var fs = require("fs");
var session = require("express-session");

app.use(session({
    key: "admin",
    secret: "string"

}));

app.use("/static", express.static(__dirname + "/static"));
app.set("view engine", "ejs");

app.use(bodyParser.urlencoded());
app.use(bodyParser.json());

var MongoClient = require("mongodb").MongoClient;
MongoClient.connect("mongodb://localhost:27017", {useNewUrlParser:true},
function(error,client){
    var blog =client.db("blog");

    if(blog.collection("admin")){

    }else{

        blog.createCollection("admin", function(err, res){
            if(err) throw err;
            console.log("Admin collection created");
        });

    }

    
    
    
    console.log("DB connected");

    app.get("/", function(req,res){
        blog.collection("posts").find().toArray(function(error,posts){
            posts = posts.reverse();
            res.render("user/home",{posts:posts});
        });
    });

    app.get("/posts/:id", function(req,res){
        blog.collection("posts").findOne({"_id": ObjectID(req.params.id)}, function (error,post){
            res.render("user/post", {post: post});
        })
    });

    app.get("/admin/dashboard", function(req,res){
        if(req.session.admin){
            res.render("admin/dashboard");
        }
        else{
            res.redirect("admin");
        }
        
    });

    app.get("/admin", function(req,res){
        res.render("admin/login");
    });

    app.get("/admin/posts", function(req,res){
        res.render("admin/post");
    });

    app.post("/do-post", function(req,res){
        blog.collection("posts").insertOne(req.body, function(error, document){
            res.send("Posted successfully");
        });
    });

    app.post("/do-upload-image", function(req,res){
        var formData = new formidable.IncomingForm();
        formData.parse(req, function(error, fields, files){
            var oldPath = files.file.path;
            var newPath = "static/images/" + files.file.name;

            fs.rename(oldPath, newPath, function(err){
                res.send("/" + newPath);
            });
        } );

    } );

    app.post("/do-admin-login", function(req, res){
        blog.collection("admin").findOne({"email": req.body.email, "password": req.body.password}, function(error, admin){
            if(admin != ""){
                req.session.admin = admin;
            }
            res.send(admin);
        });
    });

    app.get("/do-logout", function(req,res){
        req.session.destroy();
        res.redirect("/admin");
    });

    
    app.listen(3000, function(){
        console.log("Connected");
    });
});
