import React from "react";
import ReactDOM from "react-dom";
import {
  Grid,
  Row,
  Col,
  DropdownButton,
  MenuItem,
  Form,
  FormGroup,
  FormControl,
  ControlLabel,
  Button,
  Label,
  Glyphicon,
  Overlay,
  Popover,
  Checkbox,
  Nav,
  NavItem
} from "react-bootstrap";
import auth from "./auth";
import {
  checkStatus,
  parseJSON,
  getFamilyName
} from "./utils";

export default class GestionFamilles extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);

    this.state = { busy: false, 
                   currentTab: 0,
                   families: [],
                   family: null,
                   selectedFamily: null,
                   cafTills: [] 
                 };
    this.handleTabSelect = this.handleTabSelect.bind(this);
  }

  componentDidMount() {
    const selectedFamily = auth.familyId();
    const adminView = auth.loggedIn() && auth.admin();

    this.setState({ busy: true });

    if (adminView) {
      // get CAF tills
      fetch("/api/caftills", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include"
      }).then(checkStatus).then(parseJSON).then(res => {
        res.push("MSA");
        this.setState({ cafTills: res });
      
        // get all families
        fetch("/api/families", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include"
        })
          .then(checkStatus)
          .then(parseJSON)
          .then(res => {
            this.setState({
              families: res,
              busy: false
            });
          });
      });
    }
  }

  handleTabSelect() {
  }

  render() {
    const adminView = auth.loggedIn() && auth.admin();

    if (this.state.busy) {
      return <img className="centered" src="img/spinner.gif" />;
    }

    let families = "";
    if (adminView) {
      let title = "Familles";
      if (this.state.selectedFamily) {
        const familyName = getFamilyName(this.state.selectedFamily);
        title = `${familyName} (${this.state.selectedFamily.id})`;
      }
      families = (<DropdownButton title={title} key={1}>
              {this.state.families.sort((a, b) => {
                 if (getFamilyName(a) < getFamilyName(b)) {
                    return -1;
                 } else {
                    return 1;
                 }
              }).map((f, i) => {
                  return (
                    <MenuItem eventKey={f.id} onSelect={this.familySelected}>
                      {getFamilyName(f) + " (" + f.id + ")"}
                    </MenuItem>
                  );
                })}
            </DropdownButton>);
    }

    let contents = null;
    if (this.state.currentTab == 0) {
      contents = (
        <div style={{ marginTop: "15px" }}>
          <Col lg={12}>
          </Col>
        </div>
      );
    } else if (this.state.currentTab == 1) {
      contents = (
        <div style={{ marginTop: "15px" }}>
          <Col lg={12}>
          </Col>
        </div>
      );
    } else {
      contents = (
        <div
          style={
            { marginTop: "15px", position: "relative", textAlign: "center" }
          }
        >
        </div>
      );
    }

    return (
      <Grid>
          {adminView ? <Row>
                  <span style={{ marginTop: "15px", marginBottom: "15px" }}>
                    {families}{' '}
                    <Button bsStyle="primary"><Glyphicon glyph="plus"/> Ajouter</Button>
                    {' '}
                    <Button bsStyle="danger"><Glyphicon glyph="remove"/> Supprimer</Button>
                  </span>
                </Row> : "" }
          <p>{' '}</p>
          <Row>
            <Nav
              bsStyle="tabs"
              activeKey={this.state.currentTab}
              onSelect={this.handleTabSelect}
            >
              <NavItem eventKey={0}>Données personnelles</NavItem>
              <NavItem eventKey={1}>Contrat</NavItem>
              <NavItem eventKey={2}>Factures</NavItem>
            </Nav>
          </Row>
          <Row>
            {contents}
          </Row>
      </Grid>
    );
  }
}

