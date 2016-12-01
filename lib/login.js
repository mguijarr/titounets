import React from 'react';
import ReactDOM from 'react-dom';
import { Form, FormGroup, FormControl, ControlLabel, Button } from 'react-bootstrap';
import auth from './auth';
import { withRouter } from 'react-router';

class Login extends React.Component {
  constructor(props) {
    super(props);
    this.state = { loggedIn: auth.loggedIn(), admin: false };
    this.keyUp = this.keyUp.bind(this);
    this.signIn = this.signIn.bind(this);
    this.signOut = this.signOut.bind(this);
    this.updateLoginState = this.updateLoginState.bind(this);
  }

  updateLoginState(loggedIn) {
    this.setState({ loggedIn, admin: auth.admin() });
    if (!loggedIn) { this.props.router.push('/'); }
  }

  keyUp(target) {
    console.log(target);
    if (target.keyCode === 13) { return this.signIn(); }
  }

  signIn() {
    const username = ReactDOM.findDOMNode(this.refs.username).value;
    const password = ReactDOM.findDOMNode(this.refs.password).value;
    auth.login(username, password, this.updateLoginState);
  }

  signOut() {
    auth.logout(this.updateLoginState);
  }

  render() {
    if (this.state.loggedIn) {
      return (<span style={{ padding: '15px' }}><Button className="navbar-btn btn-danger btn-sm" onClick={this.signOut}>D&eacute;connecter</Button></span>);
    } else {
      return (<form className="navbar-form" action="">
                    <FormControl type="text" ref="username" name="username" placeholder="Nom d'utilisateur" />{' '}
                    <FormControl type="password" ref="password" name="password" placeholder="Mot de passe" onKeyUp={this.keyUp}/>{' '}
                    <Button bsStyle="info" bsSize="sm" onClick={this.signIn}>Connexion</Button>
                </form>);
    }
  }
}

var LoginForm = withRouter(Login);

export default LoginForm;

