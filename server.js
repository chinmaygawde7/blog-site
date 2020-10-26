var express = require("express");
var app = express();
var bodyParser = require("body-parser");
const { ObjectID, ObjectId } = require("mongodb");
var engine = require("consolidate");

var http = require("http").createServer(app);
var io = require("socket.io")(http);

var formidable = require("formidable");
var fs = require("fs");
var session = require("express-session");

app.use(session({

    key: "admin",
    secret: "string"

}));

var nodemailer = require("nodemailer");

app.use("/static", express.static(__dirname + "/static"));
app.set("view engine", "ejs");

app.use(bodyParser.urlencoded());
app.use(bodyParser.json());

var MongoClient = require("mongodb").MongoClient;
MongoClient.connect("mongodb://localhost:27017", { useNewUrlParser: true },
    function (error, client) {
        var blog = client.db("blog");

        if (blog.collection("admin")) {

        } else {

            blog.createCollection("admin", function (err, res) {
                if (err) throw err;
                console.log("Admin collection created");
            });

        }




        console.log("DB connected");

        app.get("/", function (req, res) {

            blog.collection("settings").findOne({}, function (error, settings) {

                

                blog.collection("posts").find().sort({ "_id": -1 }).limit(2).toArray(function (error, posts) {

                    res.render("user/home", {
                        posts: posts,
                        "postLimit": 2
                    });
                });

            });
        });


        app.get("/.well-known/pki-validation/29238CFCCA7F88B56A9BF17A9681D07E.txt", function(req,res){
            app.engine('txt', engine.mustache);
            app.set('view engine', 'txt');
            res.render("../.well-known/pki-validation/29238CFCCA7F88B56A9BF17A9681D07E.txt");
        });


        app.get("/posts/:id", function (req, res) {
            blog.collection("posts").findOne({ "_id": ObjectID(req.params.id) }, function (error, post) {
                res.render("user/post", { post: post });
            })
        });

        app.get("/admin/dashboard", function (req, res) {
            if (req.session.admin) {


                blog.collection("posts").find().toArray(function (error, posts) {
                    res.render("admin/dashboard", { "posts": posts });
                });

            }
            else {
                res.redirect("admin");
            }

        });

        app.get("/admin", function (req, res) {
            res.render("admin/login");
        });

        app.get("/admin/posts", function (req, res) {

            blog.collection("posts").find().toArray(function (error, posts) {
                res.render("admin/post", { "posts": posts });
            });

        });

        app.get("/posts/edit/:id", function (req, res) {
            if (req.session.admin) {
                blog.collection("posts").findOne({
                    "_id": ObjectId(req.params.id)
                },
                    function (error, post) {
                        res.render("admin/edit_post", { "post": post });
                    });
            }
            else {
                res.redirect("/admin");
            }


        });


        app.post("/admin/save_settings", function (req, res) {
            blog.collection("settings").update({}, {
                "post_limit": req.body.post_limit
            }, {
                upsert: true
            }, function (error, document) {
                res.redirect("/admin/settings");
            });
        })

        app.get("/admin/settings", function (req, res) {
            blog.collection("settings").findOne({}, function (error, settings) {

                res.render("admin/settings", {
                    "post_limit": settings.post_limit
                })
            });
        });

        app.post("/do-post", function (req, res) {
            blog.collection("posts").insertOne(req.body, function (error, document) {
                res.send({
                    text: "Posted successfully",
                    _id: document.insertedId
                });
            });
        });

        app.post("/do-edit-post", function (req, res) {
            blog.collection("posts").updateOne({
                "_id": ObjectId(req.body._id)
            }, {
                $set: {
                    "title": req.body.title,
                    "content": req.body.content,
                    "image": req.body.image,
                    "author": req.body.author
                }
            }, function (error, post) {
                res.send("Update successful");
            });
        });

        app.post("/do-upload-image", function (req, res) {
            var formData = new formidable.IncomingForm();
            formData.parse(req, function (error, fields, files) {
                var oldPath = files.file.path;
                var newPath = "static/images/" + files.file.name;

                fs.rename(oldPath, newPath, function (err) {
                    res.send("/" + newPath);
                });
            });

        });

        app.post("/do-update-image", function (req, res) {
            var formData = new formidable.IncomingForm();
            formData.parse(req, function (error, fields, files) {

                fs.unlink(fields.image.replace("/", ""), function (error) {
                    var oldPath = files.file.path;
                    var newPath = "static/images/" + files.file.name;

                    fs.rename(oldPath, newPath, function (err) {
                        res.send("/" + newPath);
                    });

                });
            });

        });

        app.post("/do-comment", function (req, res) {

            var comment_id = ObjectId();

            blog.collection("posts").update({ "_id": ObjectId(req.body.post_id) }, {
                $push: {
                    "comments": {
                        _id: comment_id,
                        username: req.body.username,
                        comment: req.body.comment,
                        email: req.body.email
                    }
                }
            }, function (error, post) {
                res.send({
                    text: "comment successful",
                    _id: post.insertedId
                });
            });
        });

        app.post("/do-reply", function (req, res) {
            var reply_id = ObjectId();

            blog.collection("posts").updateOne({
                "_id": ObjectId(req.body.post_id),
                "comments._id": ObjectId(req.body.comment_id)
            }, {
                $push: {
                    "comments.$.replies": {
                        _id: reply_id,
                        name: req.body.name,
                        reply: req.body.reply
                    }
                }
            }, function (error, document) {

                var transporter = nodemailer.createTransport({
                    "service": "gmail",
                    "auth": {
                        "user": "",
                        "pass": ""
                    }
                });

                var mailOptions = {
                    "from": "Blogger",
                    "to": req.body.comment_email,
                    "subject": "Reply on comment",
                    "text": req.body.name + " has replied on your comment. http://localhost:3000/posts/" + req.body.post_id

                };

                transporter.sendMail(mailOptions, function (error, info) {
                    res.send({
                        text: "Replied",
                        _id: reply_id
                    });
                });

            });
        });

        app.post("/do-delete", function (req, res) {
            if (req.session.admin) {
                fs.unlink(req.body.image.replace("/", ""), function (error) {
                    blog.collection("posts").deleteOne({
                        "_id": ObjectId(req.body._id)
                    }, function (error, document) {
                        res.send("Post Deleted");
                    });
                })
            } else {
                res.redirect("/admin");
            }
        })

        app.post("/do-admin-login", function (req, res) {
            blog.collection("admin").findOne({ "email": req.body.email, "password": req.body.password }, function (error, admin) {
                if (admin != "") {
                    req.session.admin = admin;
                }
                res.send(admin);
            });
        });

        app.get("/do-logout", function (req, res) {
            req.session.destroy();
            res.redirect("/admin");
        });

        io.on("connection", function (socket) {

            socket.on("delete_post", function (replyId) {
                io.emit("delete_post", replyId);
            });

            socket.on("new_post", function (formData) {
                socket.broadcast.emit("new_post", formData);
            });

            socket.on("new_comment", function (comment) {
                io.emit("new_comment", comment);
            });

            socket.on("new_reply", function (reply) {
                io.emit("new_reply", reply);
            })

        });


        http.listen(443, function () {
            console.log("Connected");
        });
    });
