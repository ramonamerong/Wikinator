//Import database config
const config = require('../config.json').database;

//Connecting to database
const {Client, Pool} = require('pg');
let client = new Client(config);
client.connect(err => {
    if(err){
        console.error(err)
    } else{
        console.log('Database connected')
    }
});

//Event listener for connection errors after connecting
client.on('error', err => {
   console.error(err);
});

//Database module that gets exported when requiring
module.exports = {
    query: (text, params) => client.query(text, params),
    getClient: () => client
};
