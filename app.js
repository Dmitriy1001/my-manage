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
        connection.query('SELECT * FROM user;', async (error, users) => {
            if (error) console.log(error);
            else {
                const user = users.filter(user => user.name === req.session.username)[0];
                if (user.status === 'blocked') {res.redirect('logout');}

                else {
                    res.render('index', {sitename: 'MyManage', username: username, users: users});
                }
            }

        })
    }

    else res.redirect('signin')
});


app.get('/signin', (req, res) => {
    if (!req.session.signin) {
        let successMsg = req.session.successMsg || '';
        let name = req.session.name || '';
        req.session.successMsg = '';
        res.render('signin', {
            sitename: 'MyManage', error: false, name: name, successMsg: successMsg, page: 'signin'
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
            successMsg: '',
            page: 'signup'
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

app.post('/index', (req, res) => {
    if (req.session.signin) {
        const usersID = typeof (req.body.userID) === 'string' ? [req.body.userID] : req.body.userID;
        const btn = req.body.btn;
        let sql;
        let param;

        if (btn === 'delete') {
            sql = `DELETE FROM user WHERE ID IN (${usersID.map(user => user)})`;
            param = '';
            if (usersID.includes(String(req.session.userid))) {
                req.session.destroy(() => {
                });
            }
        } else {
            sql = `UPDATE user set status = ? where id in (${usersID.map(user => user)})`;
            param = btn;
        }

        connection.query(sql, param, async (error, results) => {
            if (error) console.log(error);
        })
    }
    res.redirect('/');
})


app.post('/signin', async(req, res) => {
    if (!req.session.signin) {

        const name = req.body.name;
        const password = req.body.password;

        if (name && password) {
            connection.query(`SELECT * FROM user WHERE name = ?`, [name], async (error, results) => {
                let user = results[0] || '';
                if (!user || !(await bcryptjs.compare(password, user.password))) {
                    res.render('signin', {
                        sitename: 'MyManage',
                        error: true,
                        errorMsg: 'Wrong name or password',
                        name: name,
                        successMsg: '',
                        page: 'signin'
                    });
                }

                else if (user.status === 'blocked') {
                    res.render('signin', {
                        sitename: 'MyManage',
                        error: true,
                        errorMsg: `User ${name} is blocked`,
                        name: name,
                        successMsg: '',
                        page: 'signin'
                    });
                }

                else {
                    connection.query(
                        `UPDATE user SET last_singin_date = CURRENT_TIMESTAMP() WHERE name = ?`,
                        name,
                        async (error, results) => {if (error) console.log(error);}
                    );
                    req.session.username = results[0].name;
                    req.session.userid = results[0].id;
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

        let invalidEmail = false;
        if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)) {invalidEmail = true}

        connection.query(
            'INSERT INTO user SET ?',
            {name: name, email: email, password: passwordHash},
            async (error, results) => {

                if (invalidEmail || error) {
                    let msg;
                    if (invalidEmail) {msg = 'Invalid email';}
                    else if (error && error.code === 'ER_DUP_ENTRY') {
                        msg = 'There is already a user in the database with the same username and/or email';
                    }
                    res.render('signup', {
                        sitename: 'MyManage',
                        errorMsg: msg,
                        name: name,
                        email: email,
                        page: 'signup'
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