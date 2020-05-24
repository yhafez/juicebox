// api/posts.js

//Handles all requests made to /posts

/*---------------------------------------------------------------------------- Required packages ----------------------------------------------------------------------------*/


const { getAllPosts, createPost, updatePost, getPostById, getUserByUsername } = require('../db');
const { requireUser, requireActiveUser } = require('./utils');

const express = require('express');
const postsRouter = express.Router();


/*------------------------------------------------------------------------------- End Points -------------------------------------------------------------------------------*/


//Log when a request is being made to /posts
postsRouter.use((req, res, next) => {
    console.log('A request is being made to /posts');

    next();
});

//Get posts
postsRouter.get('/', async (req, res) => {
    
    //Retrieve all posts, filtering out those which have been deleted/marked inactive unless they belong to the current user
    const allPosts = await getAllPosts();

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
    
    res.send({
        posts
    });

})


//Create new post
postsRouter.post('/', requireUser, requireActiveUser, async (req, res, next) => {
    
    //Retrieve and store passed in fields
    const { title, content, tags = '' } = req.body;
    
    //Remove superfluous spaces from front and end
    const tagArr = tags.trim().split(/\s+/);

    //Create object with post data using saved fields and userId
    const postData = {
        authorId: req.user.id,
        title,
        content,
    };
    
    //Only send tags if there are some to send
    if(tagArr.length) {
        postData.tags = tagArr;
    }

    try {
        //Attempt to create post. If successful, return created post; else, notify user of error.
        const post = await createPost(postData);
        if(post) {
            res.send({ post });
        }
        else{
            next({
                name: 'CreatePostError',
                message: 'There was an error creating a new post'
            });
        }
    }
    catch({ name, message }) {
        next({ name, message });
    }
    
});


//Update post
postsRouter.patch('/:postId', requireUser, requireActiveUser, async (req, res, next) => {
    
    //Retrieve and store id of post being targeted for update, and fields to be updated
    const { postId } = req.params;
    const { title, content, tags = '' } = req.body;

    const updateFields = {}

    //Format tag strings properly if user is trying to update tags
    if(tags && tags.length > 0) {
        updateFields.tags = tags.trim().split(/\s+/);
    }

    //Check which fields are passed in by user, and update updateFields accordingly
    if(title) {
        updateFields.title = title;
    }

    if(content) {
        updateFields.content = content;
    }

    try{
        
        //Get original post, verify if user trying to update is the original post author, and, if so, attempt to update.
        const originalPost = await getPostById(postId);

        if(originalPost.author.id === req.user.id) {
            const updatedPost = await updatePost(postId, updateFields);
            res.send({ post: updatedPost })
        }
        else{
            //If user attempting to update is not the original post author, send UnauthorizedUserError
            next({
                name: 'UnauthorizedUserError',
                message: 'You cannot update a post that is not yours'
            });
        }
    }
    catch({ name, message }) {
        next({ name, message });
    }
    
});


//Delete post
postsRouter.delete('/:postId', requireUser, requireActiveUser, async (req, res, next) => {

    try{
        
        //Get id of post targeted for deletion from request url
        const post = await getPostById(req.params.postId);
        
        //If post exists, and logged in user is indeed the post author, change post active status to false (deactivated), and return post
        if(post && post.author.id === req.user.id) {
            const updatedPost = await updatePost(post.id, { active: false });

            res.send({ post: updatedPost });
        }
        else {
            //If post exists, but logged in user isn't the author, give an UnauthorizedUserError, else give a PostNotFoundError
            next(post ? {
                name: 'UnauthorizedUserError',
                message: 'You cannot delete a posts which is not yours'
            } : {
                name: 'PostNotFoundError',
                message: 'That post does not exist'
            });
        }

    }
    catch({ name, message }) {
        next({ name, message });
    }

})


//Export posts router
module.exports = postsRouter;