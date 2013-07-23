parallax-scrape
===============

node.js program to Download a single or multiple forum pages from forums.parallax.com and extract posts as plain text.

The url of the page(s) and any page range to download are commandline arguments
The text of posts is reformatted to 80 column width.
Quote blocks within posts are indented for clarity.
Code blocks within posts are output as is, no reformatting.
Links to attachments to posts are extracted.
Output goes to standard output.

Install
-------

    $ git clone https://github.com/ZiCog/parallax-scrape.git
    $ cd parallax-scrape
    $ npm install request
    $ npm install htmlparser2


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
    1) Download all post attachments.


