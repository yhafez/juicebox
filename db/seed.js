//db/seed.js

const { client, getAllUsers, createUser } = require('./index');

async function testDB() {

    try {
        console.log('Starting to test database...')

        // client.connect();
        const users = await getAllUsers();
        console.log('getAllUsers:', users);

        console.log('Finished databse tests!')
    }
    catch (err) {
        console.error('Error testing database! Error: ', err);
        throw err;
    }
}

async function dropTables() {
    try {
        console.log('Starting to drop tables...')

        await client.query(`
        DROP TABLE IF EXISTS users;
        `);

        console.log('Finished dropping tables!')
    }
    catch (err) {
        console.error('Error dropping tables! Error: ', err)
        throw err;
    }
}

async function createTables() {
    try {
        console.log('Starting to build tables...')

        await client.query(`
            CREATE TABLE users (
                id SERIAL PRIMARY KEY,
                username varchar(255) UNIQUE NOT NULL,
                password varchar(255) NOT NULL
            );
        `);

        console.log('Finished building tables!')
    }
    catch (err) {
        console.error('Error building tables! Error: ', err);
        throw err;
    }
}

async function rebuildDB() {
    try {
        client.connect();

        await dropTables();
        await createTables();
        await createInitialUsers();
    }
    catch (err) {
        console.log('Error rebuilding database! Error: ', err);
        throw(err);
    }

}


async function createInitialUsers() {
    try{
        console.log('Starting to create users...');

        const albert = await createUser({username: 'albert', password: 'bertie99'});
        const sandra = await createUser({username: 'sandra', password: '2sandy4me'});
        const glamgal = await createUser({username: 'glamgal', password: 'soglam'});

        console.log('Finished creating users!')
    }
    catch(err) {
        console.error('Error creating users! Error: ', err);
        throw err;
    }
}


rebuildDB()
    .then(testDB)
    .catch(console.error)
    .finally(() => client.end());