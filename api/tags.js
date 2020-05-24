// api/tags.js
const { getAllTags, getPostsByTagName } = require('../db');

const express = require('express');
const tagsRouter = express.Router();

tagsRouter.use((req, res, next) => {
    console.log('A request is being made to /tags');

    next();
});

tagsRouter.get('/', async (req, res) => {
    const tags = await getAllTags();

    res.send({
        tags
    });
});

tagsRouter.get('/:tagName/posts', async (req, res, next) => {

    const tagName = req.params.tagName;

    try{
        const allPosts = await getPostsByTagName(tagName);

        const posts = allPosts.filter(post => post.active || (req.user && post.author.id === req.user.id));

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

module.exports = tagsRouter;