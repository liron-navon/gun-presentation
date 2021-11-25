import GUN from 'gun';
import 'gun/sea';

// initialize GUN
const gun = GUN('http://localhost:8080/gun');
const currentUser = gun.user().recall({ sessionStorage: true });

// get the public key from the URL
let pub = (new URL(document.location)).searchParams.get('pub');
if (pub) {
    // we can only read data from a user when given public key
    const readOnlyUser = gun.user(pub);
    // listen to changes on todos
    readOnlyUser.get('todos').on((data = {}) => {
        // we cannot pass arrays on GUN, just objects and basic types, so we can parse it
        const todos = JSON.parse(data.list) || [];
        // update the UI with the todos
        document.querySelector('#other_user').innerHTML = `
            <h1>Data from other user:</h1>
            <h5>${pub}</h5>
            ${todos.map(todo => `<div>${todo}</div><hr/>`).join('')}
        `
    })
}

// checks if the user is logged in
if (currentUser?.is) {
    onLoggedIn();
}

function onLoggedIn() {
    // log my public key for presentation purpose
    console.log('my public key', currentUser.is.pub);
    console.log(`${document.location.origin}?pub=${currentUser.is.pub}`);

    // set up the todos form for the UI
    const loginContainer = document.querySelector('#login')
    loginContainer.innerHTML = `
    <div>
       <button name="logout">Logout</button>

       <h1>My Data:</h1>

       <form name="todo">
        <input type="text" name="todo" placeholder="todo" autocomplete="on"></input>
        <button type="submit">add</button>
       </form>

       <div id="todos">
       </div>
    </div>
`;
    loginContainer.querySelector('button[name="logout"]').addEventListener('click', logout);

    // listen to form submition
    const todoForm = document.querySelector('form[name="todo"]');
    todoForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(todoForm);
        const todo = formData.get('todo');

        // get the current todos and update the node to add the new todos
        currentUser.get('todos').once((data = {}) => {
            const list = data.list ? JSON.parse(data.list) : [];
            currentUser.get('todos').put({ list: JSON.stringify([...list, todo]) }, ack => {
                console.log('updated todos', ack)
            });
        });
    });

    // listen to update on the todos of the current user
    currentUser.get('todos').on((data = {}) => {
        const todosElement = document.querySelector('#todos');
        const list = data.list ? JSON.parse(data.list) : [];
        todosElement.innerHTML = '';

        // set a listener for every todo so we can delete them and add to the UI
        list.forEach(todo => {
            const el = document.createElement('div');
            el.style.cursor = 'pointer';
            el.innerHTML = todo;
            el.addEventListener('click', () => {
                const newList = list.filter(t => t !== todo);
                currentUser
                .get('todos')
                .put({ list: JSON.stringify(newList) });
            });
            todosElement.appendChild(el);
            todosElement.appendChild(document.createElement('hr'));
        })
    });
}

// log the user out and refresh
function logout() {
    currentUser.leave();
    location.reload();
}

// setup the login form
const form = document.querySelector('form[name="login"]');
if (form) {
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const name = formData.get('name');
        const password = formData.get('password');
        // create the user
        currentUser.create(name, password, ({ pub, err }) => {
            // we skip the error if the user is already created to simplify the ux
            if (err !== 'User already created!') {
                console.error('error creating user:', err);
                alert(err);
            } else {
                // user created successfully
                console.log('user created with public key:', pub);
            }

            // Login the user
            currentUser.auth(name, password, function (ack) {
                if (ack.err) {
                    console.error('error logging in the user:', ack.err);
                } else {
                    // logged in!
                    onLoggedIn();
                }
            });
        });
    })
}
