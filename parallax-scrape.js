// parallax-scrape
//
// Parallax Forum Scraper
//
// Fetch a Parallax forum page and extract posts to a plain text file.
//
"use strict";

var request = require("request");
var htmlparser = require("htmlparser2");

// The forum page's URL
var url = 'http://forums.parallax.com/showthread.php/110804-ZiCog-a-Zilog-Z80-emulator-in-1-Cog';

// Parser state.
var state = 'initial';

// Output function. Just write string to standard out.
function output(string) {
    process.stdout.write(string);
}

// Pretty print text, max 80 chars per line.
function prettyPrint(text) {
    var words = [],
        lineLength = 0,
        word,
        i;

    // Replace all HTML quote entities
    text = text.replace(/&quot;/g, '"');

    // Split text into words.
    words = text.trim().split(" ");

    // Output the words of lines of less than maximum length
    for (i = 0; i < words.length; i += 1) {
        word = words[i];
        if ((lineLength + word.length) > 80) {
            output("\n");
            lineLength = 0;
        } else {
            output(word + " ");
            lineLength += word.length + 1;
        }
    }
    output("\n");
}

// Create an HTML parser
var parser = new htmlparser.Parser({

    onopentag: function (tagname, attribs) {
        switch (state) {
        case 'initial':
	        if (tagname === 'blockquote' && attribs.class === 'postcontent restore ') {
                state = 'inPostText';
            }
	        if (tagname === 'span' && attribs.class === 'parauser') {
                state = 'inparauser';
            }
            break;
        }
    },

    ontext: function (text) {
        switch (state) {
        case 'inPostText':
            prettyPrint(text);
            break;
        case 'inparauser':
            output('\n' + text + '\n');
            break;
        }
    },

    onclosetag: function (tagname) {
        switch (state) {
        case 'inPostText':
            if (tagname === 'blockquote') {
                state = 'initial';
            }
            break;
        case 'inparauser':
            if (tagname === 'span') {
                output('-----------------------\n');
                state = 'initial';
            }
            break;
        }
    }
});

output("Fetching: " + url + '\n');
request(url, function (error, response, body) {
    if (error) {
        console.log(error);
    } else {
        parser.write(body);
        parser.end();
    }
});


