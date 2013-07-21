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
url = url || 'http://forums.parallax.com/showthread.php/110804-ZiCog-a-Zilog-Z80-emulator-in-1-Cog';
//url = url || 'http://forums.parallax.com/showthread.php/149173-Forum-scraping?p=1195982#post1195982';

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

function saveAttribs(attribs) {
    attributes = attribs;
}

function outputAttachment(text) {
    output(text.split('&lrm')[0] + '\n');
    output(attributes.href + '\n');
}

// Create an HTML parser
var parser = new htmlparser.Parser({

    onopentag: function (tagname, attribs) {
        var i, p,

	    //  state,    tag,          class,                           action,              next state
            table = {
                initial: [
                    {tag: 'blockquote', class: 'postcontent restore ',   action: undefined,   nextState: 'inpost'},
                    {tag: 'span',       class: 'parauser',               action: undefined,   nextState:  'inparauser'},
                    {tag: 'span',       class: 'date',                   action: undefined,   nextState: 'indate'},
                    {tag: 'div',        class: 'attachments',            action: undefined,   nextState: 'inattachments'}
                ],
                inpost: [
                    {tag: 'pre',        class: 'bbcode_code',            action: undefined,   nextState: 'incode'},
                    {tag: 'div',        class: 'bbcode_quote',           action: undefined,   nextState: 'inbbcode_quote'}
                ],
                inbbcode_quote: [
                    {tag: 'div',        class: 'quote_container',        action: undefined,   nextState: 'inquote_container'}
                ],
                inquote_container: [
                    {tag: 'div',        class: 'bbcode_quote_container', action: undefined,   nextState: 'inbbcode_quote_container'}
                ],
                inattachments: [
                    {tag: 'a',          class: undefined,                action: saveAttribs, nextState: 'inattachment'}
                ],
                indate: [
                    {tag: 'span',       class: 'time',                   action: undefined,   nextState: 'intime'}
                ]
            };
        p = table[state];
        if (typeof p !== 'undefined') {
            for (i = 0; i < p.length; i += 1) {
                if ((p[i].tag === tagname) && (p[i].class === attribs.class)) {
                    if (typeof p[i].action === 'function') {
                        p[i].action(attribs);
                    }
                    state = p[i].nextState;
                    break;
                }
            }
        }
    },

    ontext: function (text) {
        var p,
            table = {
                inpost:            {action: outputPost      },
                inparauser:        {action: outputUser      },
                indate:            {action: outputDate      },
                intime:            {action: outputTime      },
                incode:            {action: outputCode      },
                inquote_container: {action: outputQuote     },
                inattachments:     {action: undefined       },
                inattachment:      {action: outputAttachment}
            };

        p = table[state];
        if (typeof p !== 'undefined') {
            if (typeof p.action === 'function') {
                p.action(text);
            }
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


