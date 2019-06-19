// Dependencies
const express = require('express');
const exphbs = require("express-handlebars");
const logger = require("morgan");
const mongoose = require("mongoose");
const axios = require('axios');
const cheerio = require('cheerio');

// Require all models
const db = require("./models");

// Initialize Express
const app = express();

// Set the port of our application
const PORT = process.env.PORT || 3000;

// Middleware 
app.use(logger("dev"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Set Handlebars as the default templating engine.
app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

// Connect to Mongo
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";
mongoose.connect(MONGODB_URI, { useNewUrlParser: true });

//Routes

// GET route for homepage
app.get("/", function (req, res) {
  res.render("index");
});

// GET route for scraped data from dev.to
app.get('/scrape', function (req, res) {
  axios.get("https://dev.to").then(function (response) {
    // console.log(response.data);
    const $ = cheerio.load(response.data);

    // Now, we grab every h2 within an article tag, and do the following:
    $(".single-article").each(function (i, element) {
      // Save an empty result object
      var result = {};

      // Add the title, text, and href of every link, and save them as properties of the result object
      result.title = $(this)
        .children("a").children("div").children("h3")
        .text().trim();
      result.link = "https://dev.to" + $(this)
        .children(".index-article-link")
        .attr("href");
      result.author = $(this)
        .children("h4")
        .text().trim();

      console.log(result);

      // Create Article object in the database using results
      db.Article.create(result)
        .then(function (dbArticle) {
          console.log(dbArticle);
        })
        .catch(function (err) {
          console.log(err);
        });

      res.render("index", result);
    })
  });
})

// GET route for all saved articles in the db
app.get('/articles', function (req, res) {
  db.Article.find({})
    .then(function (dbArticle) {
      res.json(dbArticle);
    })
    .catch(function (err) {
      res.json(err);
    });
})

// GET route for grabbing a specific Article by id, populate it with it's note
app.get("/saved/:id", function (req, res) {
  db.Article.findOne({ _id: req.params.id })
    .populate("note")
    .then(function (dbArticle) {
      res.json(dbArticle);
    })
    .catch(function (err) {
      res.json(err);
    });
});

// POST Route for saving/updating an Article's associated Note
app.post("/articles/:id", function (req, res) {
  db.Note.create(req.body)
    .then(function (dbNote) {
      return db.Article.findOneAndUpdate({ _id: req.params.id }, { note: dbNote._id }, { new: true });
    })
    .then(function (dbArticle) {
      res.json(dbArticle);
    })
    .catch(function (err) {
      res.json(err);
    });
});


// GET Route for getting saved article
app.get("/saved", function (req, res) {

  db.Article
    .find({ isSaved: true })
    .then(function (dbArticle) {
      res.json(dbArticle);
    })
    .catch(function (err) {
      res.json(err);
    });
});

// PUT route for deleting/updating saved article
app.put("/delete/:id", function (req, res) {
  db.Article
    .findByIdAndUpdate({ _id: req.params.id }, { $set: { isSaved: false } })
    .then(function (dbArticle) {
      res.json(dbArticle);
    })
    .catch(function (err) {
      res.json(err);
    });
});

// PUT Route for saving/updating article to be saved
app.put("/saved/:id", function (req, res) {
  db.Article
    .findByIdAndUpdate({ _id: req.params.id }, { $set: { isSaved: true } })
    .then(function (dbArticle) {
      res.json(dbArticle);
    })
    .catch(function (err) {
      res.json(err);
    });
});


//post route to create a new note in the database
app.post('/createNote/:id', function (req, res) {
  db.Note
    .create(req.body)
    .then(function (dbNote) {
      return db.Article.findOneAndUpdate({ _id: req.params.id }, { note: dbNote._id }, { new: true });//saving reference to note in corresponding article
    })
    .then(function (dbArticle) {
      res.json(dbArticle);
    })
    .catch(function (err) {
      res.json(err);
    });
});

//GET route to retrieve all notes for a particlular article
app.get('/getNotes/:id', function (req, res) {
  db.Article
    .findOne({ _id: req.params.id })
    .populate('note')
    .then(function (dbArticle) {
      res.json(dbArticle);
    })
    .catch(function (err) {
      res.json(err);
    });
});


//start the server
app.listen(PORT, function () {
  console.log("Listening on port %s", PORT);
})