//db/seed.js

//Functions for initializing and testing database

/*----------------------------------------------------------------------------Required packages----------------------------------------------------------------------------*/


const {
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
    getPostsByTagName
} = require('./index');


/*------------------------------------------------------------------------------- Functions -------------------------------------------------------------------------------*/


//Database functions tests
async function testDB() {

    try {
        console.log('Starting to test database...')


        console.log('Calling getAllUsers')
        const users = await getAllUsers();
        console.log('getAllUsers result:', users);
        
        console.log('Calling updateUser on user users[0]')
        const updateUserResult = await updateUser(users[0].id, {
            name: 'Newname Sogood',
            location: 'Lesterville, KY',
        });
        console.log('updateUser result: ', updateUserResult);

        console.log('Calling getAllPosts');
        const posts = await getAllPosts();
        console.log('getAllPosts result: ', posts)

        console.log('Calling updatePost on posts[0]');
        const updatedPost = await updatePost(posts[0].id, {
            title: 'New Title',
            content: 'Updated content'
        });
        console.log("updatePost result: ", updatedPost);

        console.log('Calling updatePost on posts[1], only updating tags');
        const updatedPostTagResult = await updatePost(posts[1].id, {
            tags: ['#youcandoanything', '#redfish', '#bluefish']
        });
        console.log("updatePost result: ", updatedPostTagResult);

        console.log('Calling getUserById with 1');
        const albert = await getUserById(1);
        console.log(albert);

        console.log('Calling getPostsByTagName with #happy');
        const postsWithHappy = await getPostsByTagName('#happy');
        console.log('Result:', postsWithHappy);

        console.log('Finished database tests!')
    }
    catch (err) {
        console.error('Error testing database! Error: ', err);
        throw err;
    }
}


//Delete tables if they exist when re-initializing
async function dropTables() {
    try {
        console.log('dropping tables...')
        await client.query(`
            DROP TABLE IF EXISTS post_tags;
            DROP TABLE IF EXISTS tags;
            DROP TABLE IF EXISTS posts;
            DROP TABLE IF EXISTS users;
        `);
        console.log('finsihed dropping tables');
    }
    catch (err) {
        console.error('Error dropping tables! Error: ', err)
        throw err;
    }
}


//Create users, posts, tags, and post_tags tables
async function createTables() {
    try {
        await client.query(`
            CREATE TABLE users (
                id SERIAL PRIMARY KEY,
                username varchar(255) UNIQUE NOT NULL,
                password varchar(255) NOT NULL,
                name varchar(255) NOT NULL,
                location varchar(255) NOT NULL,
                active BOOLEAN DEFAULT true
            );
        `);
        await client.query(`
            CREATE TABLE posts (
                id SERIAL PRIMARY KEY,
                "authorId" INTEGER REFERENCES users(id) NOT NULL,
                title VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                active BOOLEAN DEFAULT true
            );
        `);
        await client.query(`
            CREATE TABLE  tags (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) UNIQUE NOT NULL
            );
        `);
        await client.query(`
            CREATE TABLE post_tags(
                "postId" INTEGER REFERENCES posts(id),
                "tagId" INTEGER REFERENCES tags(id),
                UNIQUE ("postId", "tagId")
            );
        `);
        
    }
    catch (err) {
        console.error('Error building tables! Error: ', err);
        throw err;
    }
}


//Populate user table with initial user data
async function createInitialUsers() {

    try{
        const albert = await createUser({username: 'albert', password: 'bertie99', name: 'Albert', location: 'Michigan'});
        const sandra = await createUser({username: 'sandra', password: '2sandy4me', name: 'Sandra', location: 'Canada'});
        const glamgal = await createUser({username: 'glamgal', password: 'soglam', name: 'Tiffany', location: 'LA Baby!'});
    }
    catch(err) {
        console.error('Error creating users! Error: ', err);
        throw err;
    }

}


//Populate posts table with initial posts
async function createInitialPosts() {
    try {
        const [albert, sandra, glamgal] = await getAllUsers();

        console.log('Starting to create posts...');
        await createPost({
            "authorId": albert.id,
            title: 'First post',
            content: 'This is my first post. I hope I love writing blogs as much as I love writing them.',
            tags: ['#happy', '#youcandoanything']
        });

        await createPost({
            "authorId": sandra.id,
            title: 'What a day',
            content: 'Today has been a whirlwind. So eventful.',
            tags: ['#happy', '#worst-day-ever']
        });

        await createPost({
            "authorId": glamgal.id,
            title: 'I AM A BOSS',
            content: 'Just got done SLAYING the haters tyvm',
            tags: ['#happy', '#youcandoanything', '#canmandoeverything']
        });
        console.log('Finished creating posts!');
    }
    catch(err) {
        console.error('Error creating initial posts! Error: ', err);
        throw err;
    }
}


//Populate tags and post_tags table with initial tags data
async function createInitialTags() {

    try{
        
        console.log('Starting to create initial tags...');

        const [happy, sad, inspo, catman] = await createTags([
            '#happy',
            '#worst-day-ever',
            '#youcandoanything',
            '#catmandoeverything'
        ]);


        const [postOne, postTwo, postThree] = await getAllPosts();

        await addTagsToPost(postOne.id, [happy, inspo]);
        await addTagsToPost(postTwo.id, [sad, inspo]);
        await addTagsToPost(postThree.id, [happy, catman, inspo]);

        console.log('Finished creating initial tags!');

    }
    catch (err) {
        console.error('Error creating initial tags! Error: ', err);
        throw err;
    }
}


//Call above functions to re-initialize database
async function rebuildDB() {
    try {
        client.connect();

        await dropTables();
        await createTables();
        await createInitialUsers();
        await createInitialPosts();
        await createInitialTags();
    }
    catch (err) {
        console.log('Error rebuilding database! Error: ', err);
        throw(err);
    }
}


rebuildDB()
    .then(testDB)
    .catch(console.error)
    .finally(() => client.end());