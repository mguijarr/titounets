import React from 'react';
import { Navbar, Nav, NavItem, NavDropdown, MenuItem, Button } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import LoginForm from './login';
import 'bootstrap/css/bootstrap.css!';

export default class App extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div style={{display: 'block'}}>
        <Navbar>
          <Navbar.Header>
            <Navbar.Brand>
              Titounets web
            </Navbar.Brand>
          </Navbar.Header>
	  <Nav>
            <LinkContainer to="/infosperso">
              <NavItem eventKey={1}>Infos personnelles</NavItem>
            </LinkContainer>
            <LinkContainer to="/gestioncontrat">
              <NavItem eventKey={2}>Gestion Contrat</NavItem>
            </LinkContainer>
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
