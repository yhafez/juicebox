// /index.js

//Server


/*----------------------------------------------------------------------------Required packages----------------------------------------------------------------------------*/


const { client } = require('./db');
client.connect();
const PORT = 3000;

const express = require('express');
const server = express();
const apiRouter = require('./api');

server.listen(PORT, () => {
    console.log('The server is up on port', PORT)
});


//Parse requests into usable json objects
const bodyParser = require('body-parser');
server.use(bodyParser.json());


//Logging middleware
const morgan = require('morgan');
server.use(morgan('dev'));


//Log request body sent in to endpoint
server.use((req, res, next) => {
    console.log('<___Body Logger START___>');
    console.log(req.body);
    console.log("<___Body Logger End___>");

    next();
});


//Route requests to /api to be processed by router
server.use('/api', apiRouter);