parallax-scrape
===============

node.js program to Download a forum page from forums.parallax.com and extract posts as plain text.

The url  of the page to download is a commandline argument.
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

    $ node parallax-scrape http://forums.parallax.com/showthread.php/149173-Forum-scraping

TODO
----

    0) Better output format.
    1) Download all post attachments.


