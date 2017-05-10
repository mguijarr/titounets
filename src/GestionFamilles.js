import React from "react";
import ReactDOM from "react-dom";
import { withRouter } from 'react-router';
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
  ButtonToolbar,
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
import Contract from "./contrat";
import {
  checkStatus,
  parseJSON,
  getFamilyName,
  getCAFData,
  AddressFields,
  TextInput,
  getAddress
} from "./utils";
import ChildData from "./child.js";
import GestionContrat from "./GestionContrat.js";
import Factures from './Factures.js';
import FacturesParents from './FacturesParents.js';
import spinner from "./img/spinner.gif";

class GestionFamilles extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);

    this.state = {
      busy: false,
      currentTab: 0,
      families: [],
      selectedFamily: {},
      cafTills: [],
      showAddFamily: false,
      showDelFamily: false,
      showAddChild: false,
      addressFields: {},
      enableSave: false,
      formValues: {}
    };

    this.tillSelection = null;
    this.newSyncCAF = null;
    this.tabSelected = this.tabSelected.bind(this);
    this.familySelected = this.familySelected.bind(this);
    this.addFamily = this.addFamily.bind(this);
    this.doAddFamily = this.doAddFamily.bind(this);
    this.delFamily = this.delFamily.bind(this);
    this.synchroniseFamily = this.synchroniseFamily.bind(this);
    this.saveData = this.saveData.bind(this);
    this.formValueChanged = this.formValueChanged.bind(this);
    this.extractFormValues = this.extractFormValues.bind(this);
    this.addressChanged = this.addressChanged.bind(this);
    this.childChanged = this.childChanged.bind(this);
    this.addChild = this.addChild.bind(this);
    this.toggleFamilyActiveState = this.toggleFamilyActiveState.bind(this);
  }

  componentDidMount() {
    this.props.router.setRouteLeaveHook(this.props.route, () => {
      if (this.state.enableSave) {
        return "Des champs ont été édités, êtes-vous sûr de changer de page sans enregistrer ?"
      }
    });

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
    } else {
      fetch("/api/family/"+auth.familyId(), {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include"
      }).then(checkStatus).then(parseJSON).then(res => {
          this.setState({
            selectedFamily: res,
            busy: false,
            ...this.extractFormValues(res)
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
        if (f.rate === null) {
          const c = new Contract(f);
          const r = c.calcRate();
          f.rate = r.rate;
        }
        this.setState({ selectedFamily: f, ...this.extractFormValues(f) });
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
      currentTab: 0,
      ...this.extractFormValues(new_family)
    }, this.saveData);
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
        parents: ["", ""],
        address: { street: ["", ""], zip: "", city: "" },
        phone_number: "",
        email: "",
        qf: 0,
        children: {}
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
        this.setState({ families: res, showDelFamily: false, selectedFamily: {}, addressFields: {}, formValues: {}, currentTab: 0 });
      });
  }

  synchroniseFamily() {
    const id = this.state.selectedFamily.id;
    const till = this.state.selectedFamily.till;

    this.setState({ busy: true });

    getCAFData(id, till, data => {
      this.setState({
        busy: false,
        enableSave: true,
        selectedFamily: data,
        currentTab: 0,
        ...this.extractFormValues(data)
      });
    });
  }

  extractFormValues(data) {
    if (Object.keys(data).length === 0) {
      return {
        addressFields: { address1: "", address2: "", zip: "", city: "", phone_number: "", email: "" },
        formValues: { parent1: "", parent2: "", qf: "", id: "" }
      }
    }

    const addressFields = {
      address1: data.address.street[0],
      address2: data.address.street[1],
      zip: data.address.zip,
      city: data.address.city,
      phone_number: data.phone_number,
      email: data.email
    };

    const formValues = {
      parent1: data.parents[0],
      parent2: data.parents[1],
      qf: data.qf,
      id: data.id
    };

    return { addressFields, formValues };
  }

  formValueChanged(key, value) {
    const formValues = this.state.formValues;
    formValues[key] = value;
    this.setState({ enableSave: true, formValues });
  }

  addressChanged(key, value) {
    const addressFields = this.state.addressFields;
    addressFields[key] = value;

    this.setState({ enableSave: true, addressFields });
  }

  childChanged(childName, key, value) {
    const family = this.state.selectedFamily;

    if (key === "deleted") {
      delete family.children[childName];
    } else {
      family.children[childName][key] = value;
    }

    this.setState({ enableSave: true, selectedFamily: family });
  }

  addChild() {
    const name = ReactDOM.findDOMNode(this.refs.newChildName).value;
    const family = this.state.selectedFamily;
    const surname = getFamilyName(family);
 
    family.children[name] = { present: "1", surname, name, birthdate: new Date().toISOString() };

    this.setState({ selectedFamily: family, showAddChild: false });
  }

  saveData() {
    let family = this.state.selectedFamily;

    const parents = [
      this.state.formValues.parent1,
      this.state.formValues.parent2
    ];
    const qf = this.state.formValues.qf;
    const id = family.id;
    const children = family.children;
    const till = family.till;

    fetch("/api/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        username: id,
        till,
        qf,
        parents,
        children,
        ...getAddress(this.state.addressFields)
      })
    })
      .then(checkStatus).then(() => {
        this.setState({ enableSave: false });

        family = Object.assign({}, family, { parents, qf, ...getAddress(this.state.addressFields) });

        const families = this.state.families;
        for (const i in families) {
          const f = families[i];
          if (f.id === family.id) {
            families[i] = family;
            this.setState({ families, selectedFamily: family });
            break;
          }
        }
      });
  }

  toggleFamilyActiveState() {
    const family = this.state.selectedFamily;
    const newActiveState = (!(family.active === '1')) ? "1" : "0";

    this.setState({ busy: true });
    
    fetch("/api/family/setactive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        username: family.id,
        active: newActiveState 
      })
    })
    .then(checkStatus).then(() => {
      family.active = newActiveState;
      this.setState({ busy: false, selectedFamily: family });
    });
  }

  render() {
    const adminView = auth.loggedIn() && auth.admin();
    const family = this.state.selectedFamily;

    let families = "";
    if (adminView) {
      let title = "Familles";
      if (Object.keys(family).length > 0) {
        const familyName = getFamilyName(family);
        title = `${familyName} (${family.id})`;
      }
      families = (<DropdownButton title={title} id='families-dropdown' key={1}>
        {this.state.families.sort((a, b) => {
          if (getFamilyName(a) < getFamilyName(b)) {
            return -1;
          } else {
            return 1;
          }
        }).map((f, i) => {
          return (
            <MenuItem key={i} eventKey={f.id} onSelect={this.familySelected}>
              {getFamilyName(f) + " (" + f.id + ")"}
            </MenuItem>
          );
        })}
      </DropdownButton>);
    }

    let contents = null;
    if (Object.keys(family).length > 0) {
    if (this.state.currentTab == 0) {
      contents = (
        <div>
          <Col lg={12}>
            <Row>
              <div style={{marginTop: '15px'}} className="pull-right">
                <ButtonToolbar>
                  {auth.admin() ? 
                  <Button
                    disabled={family.till === "MSA" || family.active==='0'}
                    onClick={this.synchroniseFamily}
                  ><Glyphicon
                        glyph="refresh"
                      /> Synchroniser CAF</Button> : ""}
                    <Button
                      bsStyle="primary"
                      disabled={!this.state.enableSave || !family.id || family.active==='0'}
                      onClick={this.saveData}
                    >
                      <Glyphicon glyph="save"/>{' '}Enregistrer
                    </Button>
                </ButtonToolbar>
              </div>
            </Row>
            <Row>
              <Form horizontal>
                <FormGroup>
                  <Col lg={2} componentClass={ControlLabel}>
                    N° d'allocataire
                  </Col>
                  <Col lg={2}>
                    <TextInput
                      readOnly={!auth.admin() || family.active==='0'}
                      valueObject={this.state.formValues}
                      valueKey="id"
                      onChange={this.formValueChanged}
                    />
                  </Col>
                  <Col lg={2} componentClass={ControlLabel}>Revenus annuels</Col>
                  <Col lg={2}>
                    <TextInput
                      readOnly={!auth.admin() || family.active==='0'}
                      valueObject={this.state.formValues}
                      valueKey="qf"
                      onChange={this.formValueChanged}
                    />
                  </Col>
                </FormGroup>
                <FormGroup>
                  <Col lg={2} componentClass={ControlLabel}>Parents</Col>
                  <Col lg={10}>
                    <TextInput
                      readOnly={family.active==='0'}
                      valueObject={this.state.formValues}
                      valueKey="parent1"
                      onChange={this.formValueChanged}
                    />
                  </Col>
                </FormGroup>
                <FormGroup>
                  <Col lg={2} componentClass={ControlLabel}>{" "}</Col>
                  <Col lg={10}>
                    <TextInput
                      readOnly={family.active==='0'}
                      valueObject={this.state.formValues}
                      valueKey="parent2"
                      onChange={this.formValueChanged}
                    />
                  </Col>
                </FormGroup>
              </Form>
            </Row>
            <AddressFields
              readOnly={family.active==='0'}
              valueChanged={this.addressChanged}
              formValues={this.state.addressFields}
            />
            <Row>
            </Row>
            <hr/>
            <h3>Enfants</h3>
            <Row>
                {Object.keys(family).length > 0 ? Object.keys(family.children).map((childName) => {
                  const c = family.children[childName];
                  if (c.present === undefined) { c.present = "1" };
                  return (
                    <ChildData
                      data={c}
                      readOnly={!auth.admin() || family.active==='0'}
                      onChange={(k, v) => {
                        this.childChanged(childName, k, v);
                      }}
                    />
                  );
                }) : ""}
            </Row>
            { auth.admin() ?
            <Row>
              <div className="pull-right" style={{marginTop: '15px'}}>
                  <Button bsStyle="primary" disabled={family.active==='0'} onClick={()=>{this.setState({ showAddChild: true })}}><Glyphicon glyph="plus"/> Ajouter enfant</Button>
              </div>
            </Row> : null }
          </Col>
        </div>
      );
    } else if (this.state.currentTab == 1) {
      contents = (
          <Col lg={12}>
            <GestionContrat family={family}/>
          </Col>
      );
    } else {
      contents = (
        <Col lg={12}>
          { auth.admin() ? <Factures family={family}/> : <FacturesParents family={family}/> }
        </Col>
      );
    }}

    return (
      <Grid>
        {adminView ? <Row>
          <Col lg={6}>
            {families}{'   '}
            { family.id ? 
            <DropdownButton noCaret bsStyle={family.active === '1' ? "success": "warning"} title={family.active === '1' ? "Famille active" : "Famille suspendue"} id="activate-family-dropdown" key={2}>
                  <MenuItem key={21} onSelect={this.toggleFamilyActiveState}>
                    {family.active === '1' ? "Suspendre" : "Activer"}
                  </MenuItem>
            </DropdownButton> : "" }
          </Col>
          <Col lg={6}>
            <span className="pull-right">
              <Button bsStyle="primary" onClick={() => { this.setState({ showAddFamily: true }) }}><Glyphicon glyph="plus" />Ajouter famille</Button>
              {'   '}
              { family.id ? 
              <Button bsStyle="danger" onClick={() => { this.setState({ showDelFamily: true }) }}><Glyphicon glyph="remove" />Supprimer</Button>
              : "" }
            </span>
          </Col>
        </Row> : ""}
        <p>{' '}</p>
        <div style={{marginTop: "30px"}}>
        <Row>
          <Nav
            bsStyle="tabs"
            activeKey={this.state.currentTab}
            onSelect={this.tabSelected}
          >
            <NavItem eventKey={0}>Données personnelles</NavItem>
            <NavItem eventKey={1} disabled={Object.keys(family).length===0}>Contrat</NavItem>
            <NavItem eventKey={2} disabled={Object.keys(family).length===0}>Factures</NavItem>
          </Nav>
        </Row>
        <Row>
          {this.state.busy ? <img className="centered" src={spinner} /> : contents }
        </Row>
        </div>
        <Modal show={this.state.showAddFamily} onHide={() => { this.setState({ showAddFamily: false }) }}>
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
                  <FormControl componentClass="select" ref={(select) => { this.tillSelection = select }}>
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
            <Button onClick={() => { this.setState({ showAddFamily: false }) }}>Annuler</Button>
          </Modal.Footer>
        </Modal>
        <Modal show={this.state.showDelFamily} onHide={() => { this.setState({ showDelFamily: false }) }}>
          <Modal.Header closeButton>
            <Modal.Title>Confirmation</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            Etes-vous sûr de supprimer la famille ?
          </Modal.Body>
          <Modal.Footer>
            <Button bsStyle="danger" onClick={this.delFamily}>Supprimer</Button>
            <Button onClick={() => { this.setState({ showDelFamily: false }) }}>Annuler</Button>
          </Modal.Footer>
        </Modal>
        <Modal show={this.state.showAddChild} onHide={() => { this.setState({ showAddChild: false }) }}>
          <Modal.Header closeButton>
            <Modal.Title>Ajouter un enfant</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form horizontal>
              <FormGroup>
                <Col sm={4} componentClass={ControlLabel}>Prénom de l'enfant:</Col>
                <Col sm={4}>
                  <FormControl ref="newChildName" type="text"/>
                </Col>
              </FormGroup>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button bsStyle="primary" onClick={this.addChild}>Ajouter enfant</Button>
            <Button onClick={() => { this.setState({ showAddChild: false }) }}>Annuler</Button>
          </Modal.Footer>
        </Modal>
      </Grid>
    );
  }
}

export default withRouter(GestionFamilles);
