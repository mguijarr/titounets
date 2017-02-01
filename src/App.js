import React from "react";
import {
  Navbar,
  Nav,
  NavItem,
  NavDropdown,
  MenuItem,
  Button,
  Image
} from "react-bootstrap";
import { LinkContainer } from "react-router-bootstrap";
import auth from "./auth";
import { withRouter } from "react-router";

class MainApp extends React.Component {
  constructor(props) {
    super(props);
  
    this.signOut = this.signOut.bind(this);
  }

  signOut() {
    auth.logout();
    this.props.router.push('/login');
  }

  render() {
    return (
      <div style={{ display: "block" }}>
        <Navbar inverse={auth.admin()}>
          <Navbar.Header>
            <Navbar.Brand>
              <span style={{fontFamily: 'Love Ya Like A Sister', fontSize: '32px', marginTop: '12px'}}>{auth.etablissement()}</span>
            </Navbar.Brand>
          </Navbar.Header>
          <Nav>
            {auth.admin() ? <LinkContainer to="/parametres">
                  <NavItem eventKey={0}><img src="img/abacus.svg" style={{width: '48px', height: 'auto'}}/>Paramètres</NavItem>
                </LinkContainer> : ""}
            <LinkContainer to="/infosperso">
              <NavItem eventKey={1}>
                <img src="img/girl.svg" style={{width: '48px', height: 'auto'}}/>
                {auth.admin() ? "Familles" : "Famille"}
              </NavItem>
            </LinkContainer>
            <LinkContainer to="/gestioncontrat">
              <NavItem eventKey={3}><img src="img/abc.svg" style={{width: '48px', height: 'auto'}}/>{auth.admin() ? "Contrats" : "Contrat"}</NavItem>
            </LinkContainer>
            {auth.admin() ? <LinkContainer to="/heures">
                  <NavItem eventKey={3}><img src="img/alarm-clock.svg" style={{width: '48px', height: 'auto'}}/>Heures réalisées</NavItem>
                </LinkContainer> : ""}
          </Nav>
          <Nav pullRight>
            <div style={{ marginTop: "12px" }}>
              <Button
                 className="navbar-btn btn-danger btn-sm"
                 onClick={this.signOut}
              >Déconnecter
              </Button>
            </div>
          </Nav>
        </Navbar>
        {this.props.children}
      </div>
    );
  }
}

var App = withRouter(MainApp);

export default App;

