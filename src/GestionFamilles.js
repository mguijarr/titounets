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
  NavItem,
  Modal
} from "react-bootstrap";
import auth from "./auth";
import {
  checkStatus,
  parseJSON,
  getFamilyName,
  getCAFData
} from "./utils";
import InfosPerso from './InfosPerso';

export default class GestionFamilles extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);

    this.state = { busy: false, 
                   currentTab: 0,
                   families: [],
                   selectedFamily: {},
                   cafTills: [],
                   showAddFamily: false,
                   showDelFamily: false 
                 };
    this.tillSelection = null;
    this.newSyncCAF = null;
    this.tabSelected = this.tabSelected.bind(this);
    this.familySelected = this.familySelected.bind(this);
    this.addFamily = this.addFamily.bind(this);
    this.doAddFamily = this.doAddFamily.bind(this);
    this.delFamily = this.delFamily.bind(this);
    this.synchroniseFamily = this.synchroniseFamily.bind(this);
    this.updateFamily = this.updateFamily.bind(this);
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

  tabSelected(key) {
    this.setState({ currentTab: key });
  }

  familySelected(id) {
    for (const f of this.state.families) {
      if (f.id === id) {
        this.setState({ selectedFamily: f });
        break;
      }
    }
  }

  doAddFamily(new_family) {
    const families = this.state.families;
    families.push(new_family);
    this.setState({
      families,
      selectedFamily: new_family,
      currentTab: 0
    });
  }

  addFamily() {
    const id = ReactDOM.findDOMNode(this.refs.newFamilyId).value;
    const syncCAF = this.newSyncCAF.checked;
    const till = ReactDOM.findDOMNode(this.tillSelection).value

    this.setState({ showAddFamily: false });

    if (syncCAF) {
      getCAFData(id, till, this.doAddFamily);
    } else {
      this.doAddFamily({
        id,
        till,
        parents: [ "", "" ],
        address: { street: [ "", "" ], zip: "", city: "" },
        phone_number: "",
        email: "",
        qf: 0,
        children: []
      });
    }
  }

  delFamily() {
    const id = this.state.selectedFamily.id;

    fetch("/api/delfamily", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username: id })
    })
      .then(checkStatus)
      .then(parseJSON)
      .then(res => {
        this.setState({ families: res, showDelFamily: false, selectedFamily: {}, currentTab: 0 });
      });
  }

  synchroniseFamily() {
    const id = this.state.selectedFamily.id;
    const till = this.state.selectedFamily.till;

    this.setState({ busy: true });

    getCAFData(id, till, data => {
      this.setState({
        busy: false,
        selectedFamily: data,
        currentTab: 0
      });
      this.forceUpdate();
    });
  }

  updateFamily(family) {
    const families = this.state.families;
    for (const i in families) {
      const f = families[i];
      if (f.id === family.id) {
        families[i] = family;
        this.setState({ families, selectedFamily: family });
        break;
      }
    }
  }

  render() {
    const adminView = auth.loggedIn() && auth.admin();

    let families = "";
    if (adminView) {
      let title = "Familles";
      if (Object.keys(this.state.selectedFamily).length > 0)  {
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
            <InfosPerso family={this.state.selectedFamily} updateFamily={this.updateFamily}/>
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
                    <Button bsStyle="primary" onClick={()=>{this.setState({ showAddFamily: true })}}><Glyphicon glyph="plus"/> Ajouter</Button>
                    {' '}
                    <Button bsStyle="primary" onClick={()=>{this.setState({ showDelFamily: true })}}><Glyphicon glyph="remove"/> Supprimer</Button>
                    {' '}
                    <Button
                          bsStyle="primary"
                          disabled={Object.keys(this.state.selectedFamily).length===0 || this.state.selectedFamily.till==="MSA"}
                          onClick={() => {
                              this.synchroniseFamily();
                            }}
                        ><Glyphicon
                          glyph="refresh"
                        /> Synchroniser CAF</Button> 
                  </span>
                </Row> : "" }
          <p>{' '}</p>
          <Row>
            <Nav
              bsStyle="tabs"
              activeKey={this.state.currentTab}
              onSelect={this.tabSelected}
            >
              <NavItem eventKey={0}>Données personnelles</NavItem>
              <NavItem eventKey={1}>Contrat</NavItem>
              <NavItem eventKey={2}>Factures</NavItem>
            </Nav>
          </Row>
          <Row>
            { this.state.busy ? <img className="centered" src="img/spinner.gif" /> : contents }
          </Row>
          <Modal show={this.state.showAddFamily} onHide={()=>{this.setState({showAddFamily: false})}}>
          <Modal.Header closeButton>
            <Modal.Title>Ajouter famille</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form horizontal>
              <FormGroup>
                <Col sm={4} componentClass={ControlLabel}>N° d'allocataire</Col>
                <Col sm={4}>
                  <FormControl ref="newFamilyId" type="text" />
                </Col>
                <Col sm={4}>
                  <Checkbox
                    inputRef={c => {
                        this.newSyncCAF = c;
                    }}
                    defaultChecked
                  >Remplissage auto</Checkbox>
                </Col>
              </FormGroup>
            </Form>
            <Form horizontal>
              <FormGroup>
                <Col sm={4} componentClass={ControlLabel}>Caisse</Col>
                <Col sm={4}>
                  <FormControl componentClass="select" ref={(select)=>{this.tillSelection=select}}>
                    {this.state.cafTills.map((till, i) => {
                      return <option value={till} key={i}>{till}</option>
                    })}
                  </FormControl>
                </Col>
              </FormGroup>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button bsStyle="primary" onClick={this.addFamily}>Ajouter</Button>
            <Button onClick={()=>{this.setState({showAddFamily: false})}}>Annuler</Button>
          </Modal.Footer>
        </Modal>
        <Modal show={this.state.showDelFamily} onHide={()=>{this.setState({showDelFamily: false})}}>
          <Modal.Header closeButton>
            <Modal.Title>Confirmation</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            Etes-vous sûr de supprimer la famille ?
          </Modal.Body>
          <Modal.Footer>
            <Button bsStyle="danger" onClick={this.delFamily}>Supprimer</Button>
            <Button onClick={()=>{this.setState({showDelFamily: false})}}>Annuler</Button>
          </Modal.Footer>
        </Modal>
      </Grid>
    );
  }
}

