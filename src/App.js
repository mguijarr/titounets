import React from 'react';
import { Navbar, Nav, NavItem, NavDropdown, MenuItem, Button } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import LoginForm from './login';
//import 'bootstrap/dist/css/bootstrap.min.css!';
import auth from './auth';

export default class App extends React.Component { // eslint-disable-line react/prefer-stateless-function
  componentWillMount() {
    auth.onChange = (loggedIn) => { this.forceUpdate() };  
  }

  render() {
    return (
      <div style={{display: 'block'}}>
        <Navbar inverse={auth.admin()}>
          <Navbar.Header>
            <Navbar.Brand>
              Titounets web
            </Navbar.Brand>
          </Navbar.Header>
	  <Nav>
            <LinkContainer to="/infosperso">
              <NavItem eventKey={1}>{ auth.admin() ? "Familles" : "Données personnelles" }</NavItem>
            </LinkContainer>
           { auth.admin() ?
              (<LinkContainer to="/horaires">
                 <NavItem eventKey={2}>Horaires réalisés</NavItem>
               </LinkContainer>
              ) : 
              (<LinkContainer to="/gestioncontrat">
                 <NavItem eventKey={2}>Gestion Contrat</NavItem>
               </LinkContainer>)
           }
          </Nav>
          <Nav pullRight>
	    <LoginForm />
          </Nav>
        </Navbar>
        {this.props.children}
      </div>
    );
  }
}
