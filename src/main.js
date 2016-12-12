import React from 'react';
import ReactDOM from 'react-dom';
import { Router, hashHistory, IndexRoute, Route } from 'react-router';

import auth from './auth';
import App from './App';
import Home from './Home';
import Parametres from './Parametres';
import GestionContrat from './GestionContrat';
import InfosPerso from './InfosPerso';
import Horaires from './Horaires';

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
            <Route path='parametres' component={Parametres} onEnter={requireAuth}/>
            <Route path='infosperso' component={InfosPerso} onEnter={requireAuth}/>
            <Route path='gestioncontrat' component={GestionContrat} onEnter={requireAuth}/>
            <Route path='horaires' component={Horaires} onEnter={requireAuth}/>
          </Route>  
        </Router>,
    document.getElementById('app')
  );
};


render();
