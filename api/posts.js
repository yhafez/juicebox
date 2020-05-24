// api/posts.js
const { getAllPosts, createPost, updatePost, getPostById } = require('../db');
const { requireUser } = require('./utils');

const express = require('express');
const postsRouter = express.Router();

postsRouter.use((req, res, next) => {
    console.log('A request is being made to /posts');

    next();
});

postsRouter.get('/', async (req, res) => {
    
    //Retrieve all posts, filtering out those which have been deleted/marked inactive unless they belong to the current user
    const allPosts = await getAllPosts();

    //Return all active posts and inactive posts by currently logged in user
    const posts = allPosts.filter(post => post.active || (req.user && post.author.id === req.user.id));

    res.send({
        posts
    });
});

postsRouter.post('/', requireUser, async (req, res, next) => {
    
    const { title, content, tags = '' } = req.body;
    
    const tagArr = tags.trim().split(/\s+/);
    const postData = {
        authorId: req.user.id,
        title,
        content,
    };
    
    //Only send the tags if there are some to send
    if(tagArr.length) {
        postData.tags = tagArr;
    }

    try {
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

postsRouter.patch('/:postId', requireUser, async (req, res, next) => {

    const { postId } = req.params;
    const { title, content, tags = '' } = req.body;

    const updateFields = {}

    if(tags && tags.length > 0) {
        updateFields.tags = tags.trim().split(/\s+/);
    }

    if(title) {
        updateFields.title = title;
    }

    if(content) {
        updateFields.content = content;
    }

    console.log(updateFields);

    try{
        
        const originalPost = await getPostById(postId);

        if(originalPost.author.id === req.user.id) {
            const updatedPost = await updatePost(postId, updateFields);
            res.send({ post: updatedPost })
        }
        else{
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

postsRouter.delete('/:postId', requireUser, async (req, res, next) => {

    try{
        
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

module.exports = postsRouter;