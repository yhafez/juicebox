// api/users.js

//Handles all requests made to /users

/*---------------------------------------------------------------------------- Required packages ----------------------------------------------------------------------------*/


const { getAllUsers, getUserByUsername, createUser, getUserById, updateUser } = require('../db');
const { requireUser, requireActiveUser } = require('./utils');

const express = require('express');
const usersRouter = express.Router();

const jwt = require('jsonwebtoken');


/*------------------------------------------------------------------------------- End Points -------------------------------------------------------------------------------*/


//Log when a request is being made to /users
usersRouter.use((req, res, next) => {
    console.log('A request is being made to /users');

    next();
});


//Get all users
usersRouter.get('/', async (req, res) => {
    const users = await getAllUsers();

    res.send({
        users
    });
});

//Login endpoint
usersRouter.post('/login', async (req, res, next) => {
    
    //Retrieve and store username and password from API request
    const { username, password } = req.body;

    //Verify both a username and password are sent in
    if(!username || !password) {
        next({
            name: 'MissingCredentialsError',
            message: 'Please supply both a username and password'
        });
    }


    try {
        
        const user = await getUserByUsername(username);
        const { id } = user;

        //Check if user exists and, if so, if entered password matches saved password in db
        if (user && user.password == password) {

            //Create a token and return to user
            const token = jwt.sign({ username, password, id }, process.env.JWT_SECRET)

            res.send({ message: "You're logged in!", token });
        }
        else {
            //If user doesn't exist or password is incorrect, notify user
            next({
                name: 'IncorrectCredentialsError',
                message: 'Username or password is incorrect'
            });
        }
    }
    catch(err) {
        console.log(err);
        next(err);
    }

})

//Endpoint for registering new user
usersRouter.post('/register', async (req, res, next) => {

    //Retrieve and store sent in fields
    const { username, password, name, location } = req.body;


    try{
        
        //If username is already taken, notify user
        const _user = await getUserByUsername(username);
        
        if(_user){
            next({
                name: 'UserExistsError',
                message: 'A user by that username already exists'
            });
        }
        

        //If username is available, create user and return signed token with success message
        const user = await createUser({
            username,
            password,
            name,
            location,
        })

        const token = jwt.sign({
            id: user.id,
            username
        }, process.env.JWT_SECRET, {
                expiresIn: '1w'
        });

        res.send({
            message: 'Thank you for signing up',
            token
        });
    }
    catch({ name, message }) {
        next({ name, message });
    }
})

//Delete user
usersRouter.delete('/:userId', requireUser, requireActiveUser, async (req, res, next) => {
    
    try{

        //Get id of user targeted for deletion from request url and see if a user with that id exists.
        const targetUser = req.params.userId;
        const user = await getUserById(targetUser);

        //If user exists, and currently logged in user is that user, attempt to set active status of user to false/deactivate the user.
        if(user && req.user && req.user.id === +targetUser) {

            //If user has already been deleted previously, notify user
            if(user.active === false) {
                next({
                    name: 'UserAlreadyDeleted',
                    message: 'This user has already been deleted'
                })
            }
            
            //Else attempt to update user
            const updatedUser = await updateUser(targetUser, { active: false });

            //If successful, return updated user object
            res.send({ updatedUser });

        }
        //If user exists, but logged in user is not that user, return an UnauthorizedDeleteAttempt error. If user does not exist, return UserDoesNotExist error.
        else {
            next( user ? {
                name: 'UnauthorizedDeleteAttempt',
                message: 'Only the user can delete their own account'
            } : {
                name: 'UserDoesNotExist',
                message: 'The user with that id does not exist'
            })
        }
    }
    catch ({ name, message }) {
        next({ name, message });
    }

})


//Reactivate deleted user
usersRouter.patch('/:userId', requireUser, async (req, res, next) => {

    try{

        //Get id of user targeted for reactivation from request url and see if a user with that id exists.
        const targetUser = req.params.userId;
        const user = await getUserById(targetUser);

        //If user exists, and currently logged in user is that user, attempt to set active status of user to true/re-activate the user.
        if(user && req.user && req.user.id === +targetUser) {

            //If user is already active, notify user
            if(user.active === true) {
                next({
                    name: 'UserAlreadyActive',
                    message: 'This user is not currently deleted/inactive'
                })
            }
            
            //Else attempt to update user
            const updatedUser = await updateUser(targetUser, { active: true });

            //If successful, return updated user object
            res.send({ updatedUser });

        }
        //If user exists, but logged in user is not that user, return an UnauthorizedDeleteAttempt error. If user does not exist, return UserDoesNotExist error.
        else {
            next( user ? {
                name: 'UnauthorizedDeleteAttempt',
                message: 'Only the user can delete their own account'
            } : {
                name: 'UserDoesNotExist',
                message: 'The user with that id does not exist'
            })
        }
    }
    catch ({ name, message }) {
        next({ name, message });
    }
})


module.exports = usersRouter;