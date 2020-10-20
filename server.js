var express = require("express");
var app = express();
var bodyParser = require("body-parser");
const { ObjectID } = require("mongodb");

app.use("/static", express.static(__dirname + "/static"));
app.set("view engine", "ejs");

app.use(bodyParser.urlencoded());
app.use(bodyParser.json());

var MongoClient = require("mongodb").MongoClient;
MongoClient.connect("mongodb://localhost:27017", {useNewUrlParser:true},
function(error,client){
    var blog =client.db("blog");
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
        res.render("admin/dashboard");
    });

    app.get("/admin/posts", function(req,res){
        res.render("admin/posts");
    });

    app.post("/do-post", function(req,res){
        blog.collection("posts").insertOne(req.body, function(error, document){
            res.send("Posted successfully");
        });
    });

    
    app.listen(3000, function(){
        console.log("Connected");
    });
});
