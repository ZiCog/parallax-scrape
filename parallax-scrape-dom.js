// parallax-scrape
//
// Parallax Forum Scraper
//
// Fetch a Parallax forum page and extract posts to a plain text file.
//
"use strict";

var request = require("request");
var htmlparser = require("htmlparser");
var select = require('soupselect').select;
var sys = require("sys");

// The forum page's URL
var url = 'http://forums.parallax.com/showthread.php/110804-ZiCog-a-Zilog-Z80-emulator-in-1-Cog/page2';
//var url = 'http://forums.parallax.com/showthread.php/149173-Forum-scraping?p=1195982#post1195982';


var handler = new htmlparser.DefaultHandler(function (error, dom) {
    if (error)
        console.log("Error: Parsing failed.");
    else
        console.log("Parsed OK");
}, { verbose: false, ignoreWhitespace: true }

);

var parser = new htmlparser.Parser(handler);

console.log("Fetching: " + url + '\n');
request(url, function (error, response, body) {
    if (error) {
        console.log(error);
    } else {
        parser.parseComplete(body);

        // Select all posts
        var postcontainers = select(handler.dom, '.postcontainer');
        postcontainers.forEach(function(post) {

            var parauser = select(post, 'span .parauser');
            console.log("##################");
            //sys.puts(sys.inspect(parauser[0], false, null));
            sys.puts(sys.inspect(post), false, null);
            console.log("##################");
        });
    }
});


