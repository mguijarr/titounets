import React from "react";
import {
  Navbar,
  Nav,
  NavItem,
  NavDropdown,
  MenuItem,
  Button
} from "react-bootstrap";
import { LinkContainer } from "react-router-bootstrap";
import LoginForm from "./login";
import auth from "./auth";

export default class App extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  componentWillMount() {
    auth.onChange = loggedIn => {
      this.forceUpdate();
    };
  }

  render() {
    return (
      <div style={{ display: "block" }}>
        <Navbar inverse={auth.admin()}>
          <Navbar.Header>
            <Navbar.Brand>
              Titounets web
            </Navbar.Brand>
          </Navbar.Header>
          <Nav>
            {auth.admin() ? <LinkContainer to="/parametres">
                  <NavItem eventKey={0}>Paramètres</NavItem>
                </LinkContainer> : ""}
            <LinkContainer to="/infosperso">
              <NavItem eventKey={1}>
                {auth.admin() ? "Familles" : "Donn\xE9es personnelles"}
              </NavItem>
            </LinkContainer>
            <LinkContainer to="/gestioncontrat">
              <NavItem eventKey={2}>Gestion Contrat</NavItem>
            </LinkContainer>
            {auth.admin() ? <LinkContainer to="/heures">
                  <NavItem eventKey={3}>Heures réalisées</NavItem>
                </LinkContainer> : ""}
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
