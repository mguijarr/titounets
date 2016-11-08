import React from 'react';
import ReactDOM from 'react-dom';
import { Form, FormGroup, FormControl, ControlLabel, Button } from 'react-bootstrap';
import auth from './auth';
import { browserHistory } from 'react-router';

export default class LoginForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = { loggedIn: auth.loggedIn(), loggedInUser: null };
    this.signIn = this.signIn.bind(this);
	                                                                                  this.signOut = this.signOut.bind(this);
    this.updateLoginState = this.updateLoginState.bind(this);
  }

  updateLoginState(loggedIn) {
    this.setState({ loggedIn });
    if (!loggedIn) { browserHistory.push('/'); }
  }

  componentWillMount() {
    auth.onChange = this.updateLoginState;
  }

  signIn() {
    const username = ReactDOM.findDOMNode(this.refs.username).value;
    const password = ReactDOM.findDOMNode(this.refs.password).value;
    this.setState({ loggedInUser: username });
	                                                                                  auth.login(username, password, null);
  }

  signOut() {
    auth.logout();
  }

  render() {
    if (this.state.loggedIn) {
      return (<span style={{ padding: '15px' }}><Button className="navbar-btn btn-danger btn-sm" onClick={this.signOut}>D&eacute;connecter</Button></span>);
    } else {
      return (<form className="navbar-form" action="">
                    <FormControl type="text" ref="username" name="username" placeholder="Nom d'utilisateur" />{' '}
                    <FormControl type="password" ref="password" name="password" placeholder="Mot de passe" />{' '}
                    <Button bsStyle="info" bsSize="sm" onClick={this.signIn}>Connexion</Button>
                </form>);
    }
  }
}
