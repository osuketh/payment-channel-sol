import React from 'react'
import { render } from 'react-dom'
import { BrowserRouter, Route, Switch } from 'react-router-dom';
import App from './App'

const router = (
  <BrowserRouter>
    <Switch>
      <Route exact path="/" component={App}/>
    </Switch>
  </BrowserRouter>
);

render(
  router,
  document.querySelector('#root')
);
