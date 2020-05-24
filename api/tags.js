// api/tags.js

//Handles all requests made to /tags

/*---------------------------------------------------------------------------- Required packages ----------------------------------------------------------------------------*/


const { getAllTags, getPostsByTagName } = require('../db');

const express = require('express');
const tagsRouter = express.Router();


/*------------------------------------------------------------------------------- End Points -------------------------------------------------------------------------------*/


//Log when a request is being made to /tags
tagsRouter.use((req, res, next) => {
    console.log('A request is being made to /tags');

    next();
});


//Get all tags
tagsRouter.get('/', async (req, res) => {
    const tags = await getAllTags();

    res.send({
        tags
    });
});


//Get posts tagged with a queried tagname
tagsRouter.get('/:tagName/posts', async (req, res, next) => {

    //Retrieve and store tagname being queried from URL
    const tagName = req.params.tagName;

    try{
        //Attempt to retrieve posts with queried tagname
        const allPosts = await getPostsByTagName(tagName);

        const posts = allPosts.filter((post) => {
        
            //Check if author of post currently being processed is active
            const userActive = post.author.active;
            
            //If user is active, return all their active posts as well as their inactive posts if they're the logged in user, skipping posts by deleted users and the posts which have been deleted by other users.
            if(userActive){
                if(post.active){
                    return true;
                }
                
                if(req.user && post.author.id === req.user.id){
                    return true;
                }
            }
        });

        //If posts tagged with queried tagname are found, return them to user
        if(posts.length){
            next({ posts });
        }
        else{
            //If no posts are returned, notify user
            next({
                name:'NoPostsMatchTag',
                message: 'No posts match the given tag'
            })
        }
    }
    catch({ name, message }) {
        next({ name, message });
    }

});


//Export tags router
module.exports = tagsRouter;