//db/index.js

//Functions for accessing, creating, modifying, and deleting database items

/*---------------------------------------------------------------------------- Required packages ----------------------------------------------------------------------------*/


const { Client } = require('pg');
const client = new Client('postgres://localhost:5432/juicebox-dev');


/*------------------------------------------------------------------------------- Functions -------------------------------------------------------------------------------*/


//Return all users currently stored in the user table in the database
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


//Add a new user to the user table
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


//Modify stored information about a user in the user table 
async function updateUser(id, fields = {}) {

    //Format setString into a string format that can be passed into PSQL ('"field1"=$1, "field2"=$2', etc.)
    const setString = Object.keys(fields).map(
        (key, index) => `"${ key }"=$${ index + 1 }`
    ).join(', ');

    //Return early if this function is called without any fields to update
    if (setString.length === 0) {
        return;
    }

    //Use setString to update user information in database and return updated user object
    try {
        const { rows: [user] } = await client.query(`
            UPDATE users
            SET ${ setString }
            WHERE id=${ id }
            RETURNING *;
        `, Object.values(fields));

        return user;
    }
    catch (err) {
        throw err;
    }
}


//Create a new post and add a new post row in posts table
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


//Modify stored information about a post in the posts table
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


//Return all posts currently in the posts table in the database
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


//Return all the posts by the user with the specified userId
async function getPostsByUser(userId){
    try{
        const  { rows: postIds }  = await client.query(`
            SELECT * FROM posts
            WHERE "authorId"=${ userId };
        `);
        
        const posts = await Promise.all(postIds.map(
            post => getPostById( post.id )
        ));

        return posts;
    }
    catch(err){
        throw err;
    }
}


//Return the user object of the user with the specified userId
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


//Create a new tag in the tags table in the database
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


//Create a new post tag in the post_tags table in the database
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


//Add tags to post object
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


//Return the post object of the post with the specified postId
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
            SELECT id, username, name, location, active
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


//Return all posts tagged with the specified tagname
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


//Return all tags currently stored in the tags table
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


//Return user object of user with the specified username
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


//Export functions
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
  