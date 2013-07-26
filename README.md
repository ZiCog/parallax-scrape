parallax-scrape
===============

node.js program to Download a single or multiple forum pages from forums.parallax.com and extract posts as plain text.

* The url of the page(s) and any page range to download are commandline arguments
* The text of posts is reformatted to 80 column width.
* Quote blocks within posts are indented for clarity.
* Code blocks within posts are output as is, no reformatting.
* Links to attachments to posts are extracted.
* Thread text goes to standard output.
* All attachedments are downloaded.

Install
-------

First install node.js. Linux, Mac and Windows node.js downloads are available here: http://nodejs.org/
You can get parallax-scrape from a zip file on github or fetch it as a git repo:

    $ git clone https://github.com/ZiCog/parallax-scrape.git

A few node.js modules are required:
    
    $ cd parallax-scrape
    $ npm install request
    $ npm install htmlparser2
    $ npm install ent

Run
---

Fetch individual pages by just giving the url:
 
    $ node parallax-scrape http://forums.parallax.com/showthread.php/149173-Forum-scraping/page2

Missing the page number off the end of the URL will get the first page.

Fetch multiple pages by adding a first page and last page parameters;

    $ node parallax-scrape http://forums.parallax.com/showthread.php/149173-Forum-scraping 3 9

In this case the page parameters override any "/pagex" in the URL.


TODO
----

    0) Better output format.


