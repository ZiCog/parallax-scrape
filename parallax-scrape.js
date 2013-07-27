// parallax-scrape
//
// Parallax Forum Scraper
//
// Fetch a Parallax forum page and extract posts to a plain text file.
//
"use strict";

var request = require("request");
var htmlparser = require("htmlparser2");
var fs = require('fs');
var ent = require("ent");

// Parser state.
var state = 'initial';

// Temporary store for tag attributes
var attributes;

// List of attachments to posts found in page
var attachments = {};

// Base part of an attachment URL
var attachmentUrlBase = 'http://forums.parallax.com/attachment.php?attachmentid=';

var postLineLength = 0;

// Output function. Just write string to standard out.
function output(string) {
    process.stdout.write(string);
}

// Pretty print the post text, max 80 chars per line.
function prettyPrintPost(text) {
    var words = [],
        word,
        i;

    // Decode the HTML entities.
    text = ent.decode(text);

    // Split text into words.
    words = text.trim().split(" ");

    // Output the words of lines of less than maximum length
    for (i = 0; i < words.length; i += 1) {
        word = words[i];
        if (word.length > 0) {
            if ((postLineLength + word.length) > 80) {
                output('\n');
                postLineLength = 0;
            }
            output(word + ' ');
            postLineLength += word.length + 1;
        }
    }
}

// Pretty print quote box text, max 80 chars per line.
function prettyPrintQuote(text) {
    var words = [],
        lineLength = 0,
        word,
        indent = 8,
        indentStr = '',
        i;

    // Decode the HTML entities.
    text = ent.decode(text);

    // Make a string of spaces for indenting with
    for (i = 0; i < indent; i += 1) {
        indentStr += ' ';
    }

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

    // Decode the HTML entities.
    text = ent.decode(text);

    lines = text.split('\n');
    for (i = 0; i < lines.length; i += 1) {
        output('        ');
        output(lines[i] + '\n');
    }
}

function outputSectionBreak() {
    output('\n--------------------------------------------------------------------------------\n');
}

function outputPost(text) {
    prettyPrintPost(text);
}

function outputUser(text) {
    output(text);
    outputSectionBreak();
}

function outputDate(text) {
    output('\n');
    outputSectionBreak();
    prettyPrintDate(text);
    output(', ');
    postLineLength = 0;
}

function outputTime(text) {
    output(text + '\n');
}

function outputCode(text) {
    prettyPrintCode(text);
}

function outputQuote(text) {
    prettyPrintQuote(text);
}

function saveAttribs(tagname, attribs) {
    attributes = attribs;
}

function leavePost(tagname, attribs) {
    output('\n');
    postLineLength = 0;
}

function outputAttachment(text) {
    var id,
        name,
        attachment = {};

    id = attributes.href.match(/attachmentid=[0-9]+/)[0];
    id = id.match(/[0-9]+/)[0];
    name = text.split('&lrm')[0];

    if (attachments[name]) {
        console.log("Duplicate attachment name: ", name);
    }
    attachments[name] = id;
    output('Attachment: ' + name + ' id: ' + id  + '\n');
}

function debugOpenTag(tagname, attribs) {
    console.log("Debug:");
    console.log("Tag:    ", tagname);
    console.log("Attribs:", attribs);
}

//  state,    tag,          class,                           action,              next state
var openTagTable = {
    initial: [
        {tag: 'blockquote', class: 'postcontent',            action: undefined,   nextState: 'inpost'},
        {tag: 'a',          class: 'username',               action: undefined,   nextState: 'inusername'},
        {tag: 'span',       class: 'date',                   action: undefined,   nextState: 'indate'},
        {tag: 'div',        class: 'attachments',            action: undefined,   nextState: 'inattachments'}
    ],
    inpost: [
        {tag: 'pre',        class: 'bbcode_code',            action: leavePost,   nextState: 'incode'},
        {tag: 'div',        class: 'bbcode_quote',           action: leavePost,   nextState: 'inbbcode_quote'},
        {tag: 'br',         class: undefined,                action: leavePost,   nextState: 'inbr'},
        {tag: 'a',          class: undefined,                action: leavePost,   nextState: 'inpost'}
    ],
    inbbcode_quote: [
        {tag: 'div',        class: 'quote_container',        action: undefined,   nextState: 'inquote_container'}
    ],
    inquote_container: [
        {tag: 'div',        class: 'bbcode_quote_container', action: undefined,   nextState: 'inbbcode_quote_container'},
        {tag: 'div',        class: 'message',                action: undefined,   nextState: 'inmessage'},
        {tag: 'div',        class: 'bbcode_postedby',        action: undefined,   nextState: 'inbbcode_postedby'}
    ],
    inattachments: [
        {tag: 'a',          class: undefined,                action: saveAttribs, nextState: 'inattachment'}
    ],
    indate: [
        {tag: 'span',       class: 'time',                   action: undefined,   nextState: 'intime'}
    ]
};

var textTable = {
    inpost:                   {action: outputPost      },
    inusername:               {action: outputUser      },
    indate:                   {action: outputDate      },
    intime:                   {action: outputTime      },
    incode:                   {action: outputCode      },
    inquote_container:        {action: outputQuote     },
    inbbcode_postedby:        {action: outputQuote     },
    inmessage:                {action: outputQuote     },
    inattachment:             {action: outputAttachment}
};

//  Curent state,             tag,                next state
var closeTagTable = {
    inpost:                   {tag: 'blockquote', nextState: 'initial'          },
    inbr:                     {tag: 'br',         nextState: 'inpost'           },
    inusername:               {tag: 'a',          nextState: 'initial'          },
    indate:                   {tag: 'span',       nextState: 'initial'          },
    intime:                   {tag: 'span',       nextState: 'indate'           },
    incode:                   {tag: 'pre',        nextState: 'inpost'           },
    inbbcode_quote:           {tag: 'div',        nextState: 'inpost'           },
    inquote_container:        {tag: 'div',        nextState: 'inbbcode_quote'   },
    inbbcode_quote_container: {tag: 'div',        nextState: 'inquote_container'},
    inbbcode_postedby:        {tag: 'div',        nextState: 'inquote_container'},
    inmessage:                {tag: 'div',        nextState: 'inquote_container'},
    inattachments:            {tag: 'div',        nextState: 'initial'          },
    inattachment:             {tag: 'a',          nextState: 'inattachments'    }
};

// Create an HTML parser
var parser = new htmlparser.Parser({

    onopentag: function (tagname, attribs) {
        var i,
            entry,
            re,
            cl;

        entry = openTagTable[state];
        if (typeof entry !== 'undefined') {
            for (i = 0; i < entry.length; i += 1) {

                // Does this elements tag match an entry ?
                if (entry[i].tag === tagname) {

                    // Match any class in element (or none) with undefined class in entry
                    if (typeof (entry[i].class) === 'undefined') {
                        if (typeof entry[i].action === 'function') {
                            entry[i].action(tagname, attribs);
                        }
                        state = entry[i].nextState;
                        break;
                    }
                    // Find class in class attributes string.
                    re = new RegExp('\\b' + entry[i].class + '\\b');
                    cl = attribs.class || '';
                    if (cl.search(re) >= 0) {
                        if (typeof entry[i].action === 'function') {
                            entry[i].action(tagname, attribs);
                        }
                        state = entry[i].nextState;
                        break;
                    }
                }
            }
        }
    },

    ontext: function (text) {
        var entry;

        entry = textTable[state];
        if (typeof entry !== 'undefined') {
            if (typeof entry.action === 'function') {
                entry.action(text);
            }
        }
    },

    onclosetag: function (tagname) {
        var entry;

        entry = closeTagTable[state];
        if (typeof entry !== 'undefined') {
            if (tagname === entry.tag) {
                state = entry.nextState;
            }
        }
    }
});

function displayAttachments() {
    var attachmentUrl, name;

    outputSectionBreak();
    console.log('The following attachments were found:');
    for (name in attachments) {
        if (attachments.hasOwnProperty(name)) {
            console.log(name + " : " + attachmentUrlBase + attachments[name]);
        }
    }
}

function fetchAttachments() {
    var attachmentList = [],
        attachment,
        attachmentUrl,
        name;

    outputSectionBreak();

    // Move attachments into a list so we can iterate over them easily.
    for (name in attachments) {
        if (attachments.hasOwnProperty(name)) {
            attachment = {};
            attachment.name = name;
            attachment.id = attachments[name];
            attachmentList.push(attachment);
        }
    }
    if (attachmentList.length === 0) {
        return;
    }

    (function fetchAttachment(i) {
        attachmentUrl = attachmentUrlBase + attachmentList[i].id;
        console.log("Fetching attachment: " + attachmentList[i].name + " : " + attachmentUrl);

        var requestSettings = {
            method: 'GET',
            url: attachmentUrl,
            encoding : null
        };

        request(requestSettings, function (error, response, body) {
            if (error) {
                console.log("Error fetching attachment: " + attachmentUrl);
            } else {
                fs.writeFile(attachmentList[i].name, body, function (err) {
                    if (err) {
                        console.log(err);
                    } else {
                        if (i < attachmentList.length - 1) {
                            fetchAttachment(i + 1);
                        }
                    }
                });
            }
        });
    }(0));
}

function fetchPages(url, firstPage, lastPage) {
    var pageNumber,
        pageUrl;

    pageNumber = firstPage;
    pageUrl = url + '/page' + pageNumber;

    outputSectionBreak();
    output('\n' + "Page# " + pageNumber);

    request(pageUrl, function (error, response, body) {
        var attachmentUrl;

        if (error) {
            console.log(error);
        } else {
            parser.write(body);
            parser.end();

            if (pageNumber < lastPage) {
                fetchPages(url, pageNumber + 1, lastPage);
            } else {
                displayAttachments();
                fetchAttachments();
            }
        }
    });
}

(function main() {
    // Get forum page's URL from program arguments.
    var url = process.argv[2],
        pageNumber,
        page,
        firstPage,
        lastPage;

    // Default URL for testing.    
    url = url || 'http://forums.parallax.com/showthread.php/110804-ZiCog-a-Zilog-Z80-emulator-in-1-Cog/page2';

    // Extract page number from url
    page = url.match(/\/page[0-9]+/);
    if (page) {
        pageNumber = parseInt(page[0].match(/[0-9]+/), 10);
    } else {
        pageNumber = 1;
    }

    // Remove page number from url
    url = url.replace(/\/page[0-9]+/, '');

    // Args 3 and 4 give the range of pages to be fetched.
    if ((typeof (process.argv[3]) !== 'undefined') &&
            (typeof (process.argv[4]) !== 'undefined')) {
        firstPage = parseInt(process.argv[3], 10);
        lastPage = parseInt(process.argv[4], 10);
        fetchPages(url, firstPage, lastPage);
    } else {
        // Otherwise take the page number from the url.
        fetchPages(url, pageNumber, pageNumber);
    }
}());

