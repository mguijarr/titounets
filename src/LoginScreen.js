import React from 'react';
import { Grid, Row, Col, Alert, FormGroup, FormControl, Button } from 'react-bootstrap';
import {
  checkStatus,
  parseJSON,
} from "./utils";
import auth from "./auth";
import { withRouter } from "react-router";
import house from "./img/house.svg";

class LoginScreenComponent extends React.Component {
  constructor(props) {
    super(props);

    this.txtUsername = null;
    this.txtPassword = null;
    this.state = { etablissements: [], currentEt: "", showError: false };
    this.etChanged = this.etChanged.bind(this);
    this.signIn = this.signIn.bind(this);
    this.loggedIn = this.loggedIn.bind(this);
  }

  etChanged(et) {
    this.setState({ currentEt: et });
  }

  loggedIn(loggedIn) {
    if (loggedIn) {
      this.props.router.push("/");    
    } else {
      this.setState({showError: true});
    }
  }

  signIn() {
    auth.login(this.state.currentEt, this.txtUsername.value, this.txtPassword.value, this.loggedIn);
  }

  componentDidMount() {
    fetch("/api/etablissements", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    }).then(checkStatus).then(parseJSON).then(res => {
      this.setState({ etablissements: res, currentEt: res[0][0] });
    }); 
  }

  render() {
    return (
       <Grid>
        {(this.props.showError ? <Alert bsStyle="danger"><h4>Authentification invalide.</h4></Alert> : '')}
        <Row>
          <center>
            <img src={house} style={{ width: '320px', height: '256px', marginTop: '50px'}} />
            <h1 style={{fontFamily: 'Love Ya Like A Sister', fontSize: '96px'}}>Crèche Online</h1>
          </center>
        </Row>
        <Row>
          <Col xs={6} xsOffset={3}>
            <Row>
              <Col xs={12}>
                <FormGroup bsSize="large">
                  <FormControl componentClass="select" placeholder="Sélection de l'établissement"
                     onChange = {(e) => { this.etChanged(e.target.value); }}
                     value = {this.state.currentEt}>
                    {this.state.etablissements.map((et, i) => { return <option key={i} value={et[0]}>{et[1]}</option> })}
                  </FormControl>
                </FormGroup>
                <FormGroup bsSize="large">
                  <FormControl type="text" placeholder="Nom d'utilisateur" inputRef={(ref)=>{this.txtUsername=ref}}/>
                </FormGroup>
                <FormGroup bsSize="large">
                  <FormControl type="password" placeholder="Mot de passe" inputRef={(ref)=>{this.txtPassword=ref}}/>
                </FormGroup>
                <FormGroup bsSize="large">
                  <Button bsStyle="primary btn-block" bsSize="large" onClick={this.signIn}>Se connecter</Button>
                </FormGroup>                
              </Col>
            </Row>
          </Col>
        </Row>
      </Grid>);
  }
}

var LoginScreen = withRouter(LoginScreenComponent);

export default LoginScreen;
