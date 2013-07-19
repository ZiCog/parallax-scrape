// parallax-scrape
//
// Parallax Forum Scraper
//
// Fetch a Parallax forum page and extract posts to a plain text file.
//
"use strict";

var request = require("request");
var htmlparser = require("htmlparser2");

// Get forum page's URL from program arguments.
var url = process.argv[2];

// Default the url if there wasn't one, just for testing
url = url || 'http://forums.parallax.com/showthread.php/110804-ZiCog-a-Zilog-Z80-emulator-in-1-Cog/page2';
// url = url || 'http://forums.parallax.com/showthread.php/149173-Forum-scraping?p=1195982#post1195982';

// Parser state.
var state = 'initial';

// Temporary store for tag attributes
var attributes;

// List of attachments to posts found in page
var attachments = [];


// Output function. Just write string to standard out.
function output(string) {
    process.stdout.write(string);
}

// Pretty print the post text, max 80 chars per line.
function prettyPrintPost(text, indent) {
    var words = [],
        lineLength = 0,
        word,
        indentStr = '',
        i;

    // Make a string of spaces for indenting with
    indent = indent || 0;
    for (i = 0; i < indent; i += 1) {
        indentStr += ' ';
    }

    // Replace all HTML quote entities
    text = text.replace(/&quot;/g, '"');

    // Replace stupid unicode separator line thingies
    text = text.replace(/&#9620;/g, '_');

    // Split text into words.
    words = text.trim().split(" ");

    output(indentStr);
    lineLength = indent;

    // Output the words of lines of less than maximum length
    for (i = 0; i < words.length; i += 1) {
        word = words[i];
        if (word.length > 0) {
            if ((lineLength + word.length) > 80) {
                output('\n' + indentStr);
                lineLength = indent;
            }
            output(word + ' ');
            lineLength += word.length + 1;
        }
    }
    output('\n');
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
    } else {
        output(text);
    }
}

function prettyPrintCode(text) {
    var lines,
        i;

    lines = text.split('\n');
    for (i = 0; i < lines.length; i += 1) {
        output('        ');
        output(lines[i] + '\n');
    }
}

function outputPost(text) {
    prettyPrintPost(text);
}

function outputUser(text) {
    output(text);
    output('\n--------------------------------------------------------------------------------\n');
}

function outputDate(text) {
    output('\n--------------------------------------------------------------------------------\n');
    prettyPrintDate(text);
    output(', ');
}

function outputTime(text) {
    output(text + '\n');
}

function outputCode(text) {
    prettyPrintCode(text);
}

function outputQuote(text) {
    prettyPrintPost(text, 4);
}

// Create an HTML parser
var parser = new htmlparser.Parser({

    onopentag: function (tagname, attribs) {
        switch (state) {
        case 'initial':
	        if (tagname === 'blockquote' && attribs.class === 'postcontent restore ') {
                state = 'inpost';
            }
	        if (tagname === 'span' && attribs.class === 'parauser') {
                state = 'inparauser';
            }
            if (tagname === 'span' && attribs.class === 'date') {
                state = 'indate';
            }
            if (tagname === 'div' && attribs.class === 'attachments') {
                state = 'inattachments';
            }
            break;
        case 'inpost':
            if (tagname === 'pre' && attribs.class === 'bbcode_code') {
                state = 'incode';
            }
            if (tagname === 'div' && attribs.class === 'bbcode_quote') {
                state = 'inbbcode_quote';
            }
            break;
        case 'inbbcode_quote':
            if (tagname === 'div' && attribs.class === 'quote_container') {
                state = 'inquote_container';
            }
            break;
        case 'inquote_container':
            if (tagname === 'div' && attribs.class === 'bbcode_quote_container') {
                state = 'inbbcode_quote_container';
            }
            break;
        case 'inattachments':
            if (tagname === 'a') {
                attributes = attribs;
                state = 'inattachment';
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
        case 'inpost':
            outputPost(text);
            break;
        case 'inparauser':
            outputUser(text);
            break;
        case 'indate':
            outputDate(text);
            break;
        case 'intime':
            outputTime(text);
            break;
        case 'incode':
            outputCode(text);
            break;
        case 'inquote_container':
            outputQuote(text);
            break;
        case 'inattachments':
            break;
        case 'inattachment':
            output(text.split('&lrm')[0] + '\n');
            output(attributes.href + '\n');
            break;
        }
    },

    onclosetag: function (tagname) {
        // Curent state,              tag,                next state
        var table = {
            initial:                  {tag: '',           nextState: ''                 },
            inpost:                   {tag: 'blockquote', nextState: 'initial'          },
            inparauser:               {tag: 'span',       nextState: 'initial'          },
            indate:                   {tag: 'span',       nextState: 'initial'          },
            intime:                   {tag: 'span',       nextState: 'indate'           },
            incode:                   {tag: 'pre',        nextState: 'inpost'           },
            inbbcode_quote:           {tag: 'div',        nextState: 'inpost'           },
            inquote_container:        {tag: 'div',        nextState: 'inbbcode_quote'   },
            inbbcode_quote_container: {tag: 'div',        nextState: 'inquote_container'},
            inattachments:            {tag: 'div',        nextState: 'initial'          },
            inattachment:             {tag: 'a',          nextState: 'inattachments'    }
        };

        if (tagname === table[state].tag) {
            state = table[state].nextState;
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


