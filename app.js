const express = require('express');
const bcryptjs = require('bcryptjs');
const dotenv = require('dotenv');
const session = require('express-session');


dotenv.config({path: './env/.env'});
const connection = require('./database/db');


// express config
const app = express();
app.use(express.urlencoded({extended: false}));
app.use(express.json());
app.use('/resources', express.static('public'));
app.use('/resources', express.static(__dirname + '/public'));
app.use(session({secret: 'secret', resave: true, saveUninitialized: true}));
app.set('view engine', 'ejs');


// routes

// request.method = get

app.get('/', (req, res) => {
    if (req.session.signin) {
        let username = req.session.username;
        connection.query('SELECT * FROM user;', async (error, results) => {
            if (error) console.log(error);
            else res.render('index', {sitename: 'MyManage', users: results, username: username});
        })
    }
    else res.redirect('/signin')
});


app.get('/signin', (req, res) => {
    if (!req.session.signin) {
        let successMsg = req.session.successMsg || '';
        let name = req.session.name || '';
        req.session.successMsg = '';
        res.render('signin', {
            sitename: 'MyManage', error: false, name: name, successMsg: successMsg
        });
    }
    else res.redirect('/')
});


app.get('/signup', (req, res) => {
    if (!req.session.signin) {
        res.render('signup', {
            sitename: 'MyManage',
            errorMsg: false,
            name: '',
            email: '',
            successMsg: ''
        });
    }
    else res.redirect('/')
});


app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('signin');
    })
});


// request.method = post

app.post('/signin', async(req, res) => {
    if (!req.session.signin) {

        const name = req.body.name;
        const password = req.body.password;
        if (name && password) {
            connection.query('SELECT * FROM user WHERE name = ?', [name], async (error, results) => {
                if (results.length === 0 || !(await bcryptjs.compare(password, results[0].password)))
                    res.render('signin', {
                        sitename: 'MyManage',
                        error: true,
                        errorMsg: 'Wrong name or password',
                        name: name,
                        successMsg: ''
                    });
                else {
                    req.session.username = results[0].name;
                    req.session.signin = true;
                    res.redirect('/');
                }
            })
        }

    }

    else res.redirect('/')
})


app.post('/signup', async (req, res) => {
    if (!req.session.signin) {
        const name = req.body.name;
        const email = req.body.email;
        const password = req.body.password;
        let passwordHash = await bcryptjs.hash(password, 8);

        let msg;
        if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)) {msg = 'Invalid email;\n'}
        else {msg = ''}

        connection.query(
            'INSERT INTO user SET ?',
            {name: name, email: email, password: passwordHash},
            async (error, results) => {
                if (error || msg) {
                    if (error.code === 'ER_DUP_ENTRY') {
                        msg += 'There is already a user in the database with the same username and/or email';
                    }
                    res.render('signup', {
                        sitename: 'MyManage',
                        errorMsg: msg,
                        name: name,
                        email: email
                    });
                }
                else {
                    req.session.successMsg = 'You have successfully registered';
                    req.session.name = name;
                    res.redirect('signin');
                }
            })
    }
});


app.listen(3000, (req, res) => {
    console.log('Server running on http://localhost:3000');
});