import React from "react";
import ReactDOM from "react-dom";
import { Router, hashHistory, IndexRoute, Route } from "react-router";

import auth from "./auth";
import LoginScreen from "./LoginScreen";
import App from "./App";
import Home from "./Home";
import Parametres from "./Parametres";
import GestionFamilles from "./GestionFamilles";
import Heures from "./Heures";

function requireAuth(nextState, replace) {
  if (!auth.loggedIn()) {
    replace({
      pathname: "/login",
      state: { nextPathname: nextState.location.pathname }
    });
  }
}

const render = () => {
  ReactDOM.render(
    <Router history={hashHistory}>
      <Route path="/login" component={LoginScreen}/>
      <Route path="/" component={App} onEnter={requireAuth}>
        <IndexRoute component={Home} />
        <Route path="parametres" component={Parametres} />
        <Route path="gestion" component={GestionFamilles} />
        <Route path="heures" component={Heures} />
      </Route>
    </Router>,
    document.getElementById("app")
  );
};

render();
