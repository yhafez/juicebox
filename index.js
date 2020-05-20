// inside index.js
const { client } = require('./db');
client.connect();
const PORT = 3000;
const express = require('express');
const server = express();
const apiRouter = require('./api');

server.listen(PORT, () => {
    console.log('The server is up on port', PORT)
});

const bodyParser = require('body-parser');
server.use(bodyParser.json());

const morgan = require('morgan');
server.use(morgan('dev'));

server.use((req, res, next) => {
    console.log('<___Body Logger START___>');
    console.log(req.body);
    console.log("<___Body Logger End___>");

    next();
});

server.use('/api', apiRouter);



// Routes we'll be defining
// POST /api/users/register
// POST /api/users/login
// DELETE /api/users/:id

// GET /api/posts
// POST /api/posts
// PATCH /api/posts/:id
// DELETE /api/posts/:id

// GET /api/tags
// GET /api/tags/:tagName/posts
