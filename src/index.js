const express = require('express');
const cors = require('cors');

const { v4: uuidv4, validate } = require('uuid');
const req = require('express/lib/request');

const app = express();

app.use(cors());
app.use(express.json());

const users = [];

function checksExistsUserAccount(request, response, next) {
  const { username } = request.headers;
  const user = users.find((user) => user.username === username);

  if (!user)
    return response.status(404).json({ error: "User already exists!" })

  request.user = user;

  return next();
}

function checksCreateTodosUserAvailability(request, response, next) {
  const { user } = request;

  if (user.pro === false && user.todos.length < 10) {
    return next()
  } else if (user.pro === true) {
    return next()
  } else {
    return response.status(403).json({ error: "Todos max limit reached! Upgrade to pro" })
  }
}

function checksTodoExists(request, response, next) {
  const { username } = request.headers;
  const { id } = request.params;

  const user = users.find((user) => user.username === username);

  if (!user)
    return response.status(404).json({ error: 'User not found' });


  const idIsUuid = validate(id);

  if (!idIsUuid)
    return response.status(400).json({ error: 'Id must be a valid uuid' });

  const todo = user.todos.find((todo) => todo.id === id);

  if (!todo) return response.status(404).json({ error: 'Todo not found' });

  request.user = user;
  request.todo = todo;

  next();

}

function findUserById(request, response, next) {
  const { id } = request.params;

  const user = users.find((user) => user.id === id);

  if (!user) return response.status(404).json({ error: 'User not found' });

  request.user = user;

  next();
}

app.post('/users', (request, response) => {
  const { username, name, subscription } = request.body;
  const usernameAlreadyExists = users.find((user) => user.username === username);

  if (usernameAlreadyExists) {
    return res.status(400).json({ error: "User already exists!" })
  }

  const user = {
    id: uuidv4(),
    name,
    username,
    pro: false,
    todos: []
  };

  users.push(user)

  return response.status(201).json(user)
});

app.get('/users/:id', findUserById, (request, response) => {
  const { user } = request;

  return response.json(user);
});

app.patch('/users/:id/pro', findUserById, (request, response) => {
  const { user } = request;

  if (user.pro) {
    return response.status(400).json({ error: 'Pro plan is already activated.' });
  }

  user.pro = true;

  return response.json(user);
});

app.get('/todos', checksExistsUserAccount, (request, response) => {
  const { user } = request;

  return response.json(user.todos);
});

app.post('/todos', checksExistsUserAccount, checksCreateTodosUserAvailability, (request, response) => {
  const { user } = request;
  const { title, deadline } = request.body;

  const todo = {
    id: uuidv4(),
    title,
    done: false,
    deadline: new Date(deadline),
    created_at: new Date()
  }

  user.todos.push(todo);

  return response.status(201).json(todo)
});

app.put('/todos/:id', checksTodoExists, (request, response) => {
  const { todo } = request;
  const { title, deadline } = request.body;

  todo.title = title;
  todo.deadline = new Date(deadline);

  return response.json(todo);
});

app.patch('/todos/:id/done', checksTodoExists, (request, response) => {
  const { todo } = request;

  todo.done = true;

  return response.json(todo);
});

app.delete('/todos/:id', checksExistsUserAccount, checksTodoExists, (request, response) => {
  const { user, todo } = request;

  const todoIndex = user.todos.indexOf(todo);

  if (todoIndex === -1) {
    return response.status(404).json({ error: 'Todo not found' });
  }

  user.todos.splice(todoIndex, 1);

  return response.status(204).send();
});

module.exports = app;