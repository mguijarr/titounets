import React from 'react';
import ReactDOM from 'react-dom';
import { Router, hashHistory, IndexRoute, Route } from 'react-router';

import auth from './auth';
import App from './App';
import Home from './Home';
import GestionContrat from './GestionContrat';
import InfosPerso from './InfosPerso';

function requireAuth(nextState, replace) {
  if (!auth.loggedIn()) {
    replace({
      pathname: '/',
      state: { nextPathname: nextState.location.pathname }
    })
  }
}

const render = () => {
  ReactDOM.render(
        <Router history={hashHistory}>
          <Route path='/' component={App}>
            <IndexRoute component={Home}/>
            <Route path='infosperso' component={InfosPerso} onEnter={requireAuth}/>
            <Route path='gestioncontrat' component={GestionContrat} onEnter={requireAuth}/>
          </Route>  
        </Router>,
    document.getElementById('app')
  );
};


render();
