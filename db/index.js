//db/index.js

const { Client } = require('pg');
const client = new Client('postgres://localhost:5432/juicebox-dev');


async function getAllUsers() {
    try{
        const { rows } = await client.query(`
            SELECT id, username, name, location, active
            FROM users;
        `);
        return rows;
    }
    catch(err){
        throw err;
    }
}


async function createUser({ 
    username,
    password,
    name,
    location
}) {
    
    try {
        const { rows: [user] } = await client.query(`
            INSERT INTO users(username, password, name, location)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (username) DO NOTHING
            RETURNING *;
        `, [username, password, name, location])
        
        return user;
    }
    catch(err) {
        throw err;
    }
}


async function updateUser(id, fields = {}) {
    //build the set string
    const setString = Object.keys(fields).map(
        (key, index) => `"${ key }"=$${ index + 1 }`
    ).join(', ');

    //return early if this is called without fields
    if (setString.length === 0) {
        return;
    }

    try {
        const { rows: [user] } = await client.query(`
            UPDATE users
            SET ${ setString }
            WHERE id=${ id }
            RETURNING *;
        `, Object.values(fields));

        console.log(user);
        return user;
    }
    catch (err) {
        throw err;
    }
}


async function createPost({
    authorId,
    title,
    content,
    tags = []
}){
    try{
        const { rows: [post] } = await client.query(`
            INSERT INTO posts("authorId", title, content)
            VALUES ($1, $2, $3)
            RETURNING *;
        `, [authorId, title, content]);

        const tagList = await createTags(tags);

        return await addTagsToPost(post.id, tagList);
    }
    catch(err) {
        throw err;
    }
}


async function updatePost(postId, fields = {}){

    //Get passed in tags, and delete remaining tags to avoid duplication
    const { tags } = fields;
    delete fields.tags;
    
    //Format setString into a string format that can be passed into PSQL ('"field1"=$1, "field2"=$2', etc.)
    const setString = Object.keys(fields)
    .map((key, index) => `"${ key }"=$${ index + 1 }`
    ).join(', ');
    
    try{

        //If the setString contains a field to be updated, attempt to update it and return result
        if (setString.length > 0) {
            await client.query(`
            UPDATE posts
            SET ${ setString }
            WHERE id=${ postId }
            RETURNING *;
            `, Object.values(fields)
            );
        }

        //If no tags are passed in to be updated, return the updated post
        if (tags === undefined) {
            return await getPostById(postId);
        }

        //If tags are passed to be updated, create those tags, and create a string of tags that can be read by PSQL, and update post_tags database appropriately
        const tagList = await createTags(tags);
        const tagListIdString = tagList.map((tag) => `${ tag.id }`).join(', ');
        
        await client.query(`
        DELETE FROM post_tags
        WHERE "tagId"
        NOT IN ( ${ tagListIdString } )
        and "postId"=$1;
        `, [postId]);
        
        //add tags to post object and return post object
        await addTagsToPost(postId, tagList);
        
        return await getPostById(postId);
    }
    catch(err)
    {
        throw err;
    }
}


async function getAllPosts() {
    try{
        const { rows: postIds } = await client.query(`
            SELECT id
            FROM posts;
        `);

        const posts = await Promise.all(postIds.map(
            post => getPostById( post.id )
        ));

        return posts;
    }
    catch(err) {
        throw err;
    }
}


async function getPostsByUser(userId){
    try{
        const  { rows: postIds }  = await client.query(`
            SELECT * FROM posts
            WHERE "authorId"=${ userId };
        `);
        
        console.log('postIds is: ', postIds);
        const posts = await Promise.all(postIds.map(
            post => getPostById( post.id )
        ));

        return posts;
    }
    catch(err){
        throw err;
    }
}


async function getUserById(userId){
    try{

        const { rows: [user] } = await client.query(`
            SELECT * FROM users
            WHERE id=${ userId };
        `)

        if(!user){
            return null;
        }
        else{
            user.password='Hidden 😛';
            const posts = await getPostsByUser(user.id);
            user.posts = posts;
            return user;
        }
    }
    catch(err){
        throw err;
    }
}


async function createTags(tagList){
    
    if (tagList.length === 0) {
        return;
    }

    const insertValues = tagList.map(
        (_, index) => `$${ index + 1 }`
     ).join('), (');
    
    const selectValues = tagList.map(
        (_, index) => `$${ index + 1 }`
    ).join(', ');

    try{

        const insertResult = await client.query(`
            INSERT INTO tags(name)
            VALUES (${ insertValues })
            ON CONFLICT (name) DO NOTHING;
            `, tagList);

        const { rows } = await client.query(`
            SELECT * FROM tags
            WHERE name
            IN (${ selectValues });
        `, tagList);
        
        return rows;

        
    }
    catch(err){
        throw err;
    }
}


async function createPostTag(postId, tagId) {

    try{
        await client.query(`
            INSERT INTO post_tags("postId", "tagId")
            VALUES ($1, $2)
            ON CONFLICT ("postId", "tagId") DO NOTHING;
        `, [postId, tagId]);
    }
    catch (err) {
        throw err;
    }

}


async function addTagsToPost(postId, tagList) {
    
    try {
        const createPostTagPromises = tagList.map(
            tag => createPostTag(postId, tag.id)
        );
        
        await Promise.all(createPostTagPromises);

        return await getPostById(postId);
    }
    catch(err) {
        throw err;
    }

}


async function getPostById(postId) {
    try{

        //Retrieve and store post associated with the passed in postId
        const { rows: [post] } = await client.query(`
            SELECT *
            FROM posts
            WHERE id=$1;
        `, [postId]);

        // If no such post exists, notify user
        if(!post) {
            throw {
                name: "PostNotFoundError",
                message: "Could not find a post with that postId"
            };
        }
        
        //Retrieve and store tags associated with the passed in postId
        const { rows: tags } = await client.query(`
            SELECT tags.*
            FROM tags
            JOIN post_tags ON tags.id=post_tags."tagId"
            WHERE post_tags."postId"=$1;
        `, [postId]);
        
        //retrieve and store author of post retrieved earlier
        const { rows: [author] } = await client.query(`
            SELECT id, username, name, location
            FROM users
            WHERE id=$1
        `, [post.authorId]);

        //Re-construct post object, replacing authorId with author, and adding tags, then return it
        post.tags = tags;
        post.author = author;

        delete post.authorId;

        return post;

    }
    catch(err) {
        throw err;
    }
}


async function getPostsByTagName(tagName) {
    try {

        const { rows: postIds } = await client.query(`
        SELECT posts.id
        FROM posts
        JOIN post_tags ON posts.id=post_tags."postId"
        JOIN tags ON tags.id=post_tags."tagId"
        WHERE tags.name=$1;
        `, [tagName]);

        return await Promise.all(postIds.map(
            post => getPostById(post.id)
        ));
    }
    catch(err) {
        throw err;
    }
}


async function getAllTags() {
    try{
        const { rows: tags } = await client.query(`
            SELECT *
            FROM tags;
        `);

        return tags;
    }
    catch(err) {
        throw err;
    }
}


async function getUserByUsername(username) {
    try{
        const { rows: [user] } = await client.query(`
            SELECT *
            FROM users
            WHERE username=$1
        `, [username]);
        return user;
    }
    catch(err) {
        throw err;
    }
}


module.exports = {
    client,
    getAllUsers,
    createUser,
    updateUser,
    createPost,
    updatePost,
    getAllPosts,
    getPostsByUser,
    getUserById,
    createTags,
    createPostTag,
    addTagsToPost,
    getPostById,
    getPostsByTagName,
    getAllTags,
    getUserByUsername
}
  