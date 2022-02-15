const mysql = require('mysql');
const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD
});


connection.connect((error) => {
    if (error) {
        console.log(error);
        return;
    }
    console.log('Connection with db established');
});

module.exports = connection;
