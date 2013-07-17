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
//var url = 'http://forums.parallax.com/showthread.php/110804-ZiCog-a-Zilog-Z80-emulator-in-1-Cog';
var url = 'http://forums.parallax.com/showthread.php/149173-Forum-scraping?p=1195982#post1195982';


// Parser state.
var state = 'initial';

// Output function. Just write string to standard out.
function output(string) {
    process.stdout.write(string);
}

// Pretty print the post text, max 80 chars per line.
function prettyPrintPost(text) {
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
            lineLength += word.length + 1;
        }
        output(word + " ");
    }
    output("\n");
}

// Pretty print dates
function prettyPrintDate(text) {
    var monthStr,
        dateStr,
        date;

    // Get rid of junk after the actual date text.
    text = text.trim().split(',')[0];

    // Take care of relative dates
    if ((text === 'Yesterday') || (text === 'Today')) {
        date = new Date();
        if (text === 'Yesterday') {
            date.setDate(date.getDate() - 1);
        }
        monthStr = String(date.getMonth() + 1);
        if (monthStr.length === 1) {
            monthStr = '0' + monthStr;
        }
        output(monthStr + '-');
        dateStr = String(date.getDate());
        if (dateStr.length === 1) {
            dateStr = '0' + dateStr;
        }
        output(dateStr + '-');
        output(String(date.getFullYear()));
        output(', ');
    } else {
        output(text);
    }
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
            if (tagname === 'span' && attribs.class === 'date') {
                state = 'indate';
            }
            break;
        case 'indate':
            if (tagname === 'span' && attribs.class === 'time') {
                state = 'intime';
            }
            break;
        }
    },

    ontext: function (text) {
        switch (state) {
        case 'inPostText':
            prettyPrintPost(text);
            break;
        case 'inparauser':
            output(text + '\n');
            output('--------------------\n');
            break;
        case 'indate':
            output('\n--------------------\n');
            prettyPrintDate(text);
            break;
        case 'intime':
            output(text + '\n');
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
                state = 'initial';
            }
            break;
        case 'indate':
            if (tagname === 'span') {
                state = 'initial';
            }
            break;
        case 'intime':
            if (tagname === 'span') {
                state = 'indate';
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


